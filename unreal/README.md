# Collective AI Inc. — Mega Campus (Unreal Engine 5.4)

A data-driven first/third-person walkthrough of the 30-facility Collective AI Mega Campus.
The single source of truth for the campus layout is `viewer/lib/world.js`; this UE project
mirrors all 30 facilities into `Content/Data/Facilities.csv` and spawns them at runtime.

> **Engine version: Unreal Engine 5.4 is required.** The project uses UE5.4 module/target
> conventions (`BuildSettingsVersion.V5`, `EngineIncludeOrderVersion.Unreal5_4`), Enhanced
> Input, Lumen, and Nanite.

---

## 1. Build & run

```bash
# 1. Get UE 5.4 (Epic Games Launcher or a source build).

# 2. Generate project files:
#    Windows  — right-click CollectiveCampus.uproject -> "Generate Visual Studio project files"
#    Linux    — "$UE_ROOT/GenerateProjectFiles.sh" -project="$(pwd)/CollectiveCampus.uproject" -game -engine
#    macOS    — right-click .uproject -> "Generate Xcode project files"

# 3. Build the editor target (Development Editor):
#    From an IDE: build the "CollectiveCampusEditor" target, config Development.
#    From the command line (adjust UE_ROOT):
"$UE_ROOT/Engine/Build/BatchFiles/Linux/Build.sh" \
    CollectiveCampusEditor Linux Development \
    -project="$(pwd)/CollectiveCampus.uproject" -waitmutex
#    (Windows: Engine/Build/BatchFiles/Build.bat  CollectiveCampusEditor Win64 Development ...)

# 4. Open the project:
"$UE_ROOT/Engine/Binaries/Linux/UnrealEditor" "$(pwd)/CollectiveCampus.uproject"
```

Package a standalone build with the `CollectiveCampus` (Game) target via the editor's
**Platforms -> Package Project**, or `RunUAT BuildCookRun`.

---

## 2. First-time content setup (one-time, in-editor)

The C++ compiles and runs without content, but to see the campus you create a few assets:

1. **Import the facilities DataTable**
   - Content Browser -> `Content/Data` -> right-click -> **Import**, pick
     `Content/Data/Facilities.csv`.
   - Import type **DataTable**, Row Struct **FacilityRow** (`FFacilityRow`). Name it
     `DT_Facilities`. All 30 rows load; `Position`/`FootprintMeters` import as `FVector2D`.

2. **Create the Enhanced Input assets** (Content/Input)
   - `IA_Move`, `IA_Look` — Input Action, value type **Axis2D**.
   - `IA_Jump`, `IA_Sprint`, `IA_Interact`, `IA_ToggleView` — Input Action, **Bool**.
   - `IMC_Campus` — Input Mapping Context. Map: WASD -> `IA_Move` (with the standard
     `Negate`/`SwizzleAxis` modifiers for S and A/D), Mouse XY -> `IA_Look`, Space -> `IA_Jump`,
     Left Shift -> `IA_Sprint`, E -> `IA_Interact`, V -> `IA_ToggleView`.
   - Open the `BP_CampusPlayerCharacter` defaults (or set on the C++ class CDO) and assign
     `DefaultMappingContext = IMC_Campus` plus each `*Action` property. The controller adds the
     context on possession.

3. **HUD widget**
   - Create `WBP_CampusHUD`, a UMG Widget Blueprint whose **parent class is `UCampusHUDWidget`**.
   - Bind text blocks to `GetFacilityName / GetDistrictLabel / GetAreaText / GetHeightText /
     GetArchNotes`, and the accent panel colour to `GetDistrictColor`. Implement the
     `OnFacilitySelected` / `OnSelectionCleared` events to show/hide the panel.
   - Assign `HUDWidgetClass = WBP_CampusHUD` on `BP_CampusPlayerController` (or the C++ default).

4. **The level**
   - Create `Content/Maps/Campus` (see World Partition note below). Drop one **CampusDirector**
     actor into it and assign `FacilitiesTable = DT_Facilities`. `BuildingClass` defaults to
     `ACampusBuilding` (set a Blueprint subclass to use real meshes).
   - `DefaultEngine.ini` already points the default/editor map at `/Game/Maps/Campus`.

---

## 3. How data-driven spawning works

- `FFacilityRow` (`Source/CollectiveCampus/Public/CampusTypes.h`) is a `FTableRowBase`
  mirroring one `world.js` FACILITIES entry. **Positions are stored in METERS**, exactly as in
  `world.js`, so the CSV stays a faithful mirror.
- On `BeginPlay`, `ACampusDirector` calls `GetAllRows<FFacilityRow>` and spawns one
  `ACampusBuilding` per row.
- `ACampusBuilding::ApplyFacilityData` non-uniformly scales a placeholder cube to the
  footprint (width × depth) and height, seats its base on the ground, sizes the interaction
  sphere, positions the floating label, and tints a dynamic material with the district colour.

### Coordinate conversion (viewer meters -> UE centimetres)

`world.js` is **Z-up, metres**, position = footprint **centre** on the ground plane.
UE is **Z-up, centimetres, left-handed**. Conversion lives in one place,
`FCampusCoordinates` (`CampusTypes.h`): `UE_location_cm = meters * 100`, viewer X->UE X,
viewer Y->UE Y, Z = 0 ground. If imported art ever shows mirrored handedness, negate Y in that
single helper — nothing else changes.

---

## 4. Real meshes from the GLB assets (honest note)

`ACampusBuilding` ships with the engine **basic cube** as a blockout placeholder — the project
builds and runs immediately, but those are scaled boxes, not architecture. The real geometry
lives in `/assets/glb/buildings/*.glb` (30 files, one per facility, **named by `FacilityId`**,
e.g. `prism_gateway_hq.glb`).

To promote blockout to final art:

1. Enable the **Interchange** + **glTF** import pipeline (already listed in the `.uproject`
   Plugins). Drag the `.glb` files into the Content Browser (or use
   **Import Into Level** / the Interchange import dialog). Each imports as a `UStaticMesh`
   (optionally Nanite-enabled).
2. Either set `ACampusBuilding::BuildingMesh`'s static mesh on a per-facility Blueprint, or use
   the optional `UCampusFacilityDataAsset` path (`BuildingMesh` soft reference) and resolve the
   mesh by `FacilityId` at spawn time. Once a real mesh is assigned, **disable the cube
   auto-scale** (the placeholder scaling assumes the unit cube) so the imported model keeps its
   authored dimensions.

---

## 5. World Partition / streaming guidance

The campus footprint is ~**1097 m × 664 m** (`world.js` WORLD). At that size, author
`Content/Maps/Campus` as a **World Partition** map (*New Level -> Empty Open World*):

- The 30 buildings stream by distance via the runtime grid; enable **HLODs** so distant
  districts render as cheap proxies.
- Group facilities by `district` into **Data Layers** (e.g. toggle the manufacturing district)
  for editor sanity and runtime control.
- For a guided walkthrough you can keep everything resident (the geometry is light), but World
  Partition + Nanite + Lumen is the recommended setup and matches `DefaultEngine.ini`.

> Note: `ACampusDirector` spawns buildings at runtime rather than placing them as World
> Partition actors. For a shipping streaming build, run the director once and **convert the
> spawned actors to placed actors**, or have the director add them to a Data Layer, so World
> Partition can stream them. Runtime spawning is ideal for iteration and data round-tripping.

---

## 6. Controls

| Action          | Key / Input        | Notes                                  |
|-----------------|--------------------|----------------------------------------|
| Move            | **WASD**           | `IA_Move`, relative to look yaw        |
| Look            | **Mouse**          | `IA_Look`                              |
| Jump            | **Space**          | `IA_Jump`                              |
| Sprint          | **Left Shift**     | `IA_Sprint`, raises max walk speed     |
| Interact        | **E**              | `IA_Interact`, line-trace -> HUD panel |
| Toggle view     | **V**              | `IA_ToggleView`, first <-> third person|

---

## 7. Source layout

```
unreal/
  CollectiveCampus.uproject
  Config/        DefaultEngine.ini · DefaultInput.ini · DefaultGame.ini
  Content/Data/  Facilities.csv  (30 facilities, import as DT_Facilities)
  Source/
    CollectiveCampus.Target.cs · CollectiveCampusEditor.Target.cs
    CollectiveCampus/
      CollectiveCampus.Build.cs
      Public/  + Private/   (module + gameplay classes)
```
