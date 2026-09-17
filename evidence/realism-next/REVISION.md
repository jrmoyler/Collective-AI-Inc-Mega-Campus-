# PR12 reference and browser recovery revision

The exterior factory now requires an individual reference reconstruction for every CF-01–35 record. No generic family building or additive legacy signature is selected. All 35 source infographics were inspected, with observations and unresolved details recorded in the three facility-audit documents. All35 actual-runtime geometry exports are compared against their sources in `../facility-review/`.

The first render review rejected mismatched CF03/07/15/35 forms. Subsequent changes also differentiated CF13/14/24, corrected Terra Axis height, opened Gaia's atrium and Orbital Foundry's roof, and replaced broad roof carpets with paved terraces and planted edges. Comparisons establish architectural progress, **not exact equivalence or photoreal acceptance**. Hidden elevations, dimensions, cutaway interpretations, and CF24/25 allowances remain uncertain.

## Rendering and interaction fixes

- Road shader no longer uses undefined reversed smoothstep edges.
- Water wave slope is transformed from world into view space before lighting, fixing camera-dependent normals.
- Eight actual expanded shader variants compile and link under native EGL/Mesa; a deliberately broken varying fails the gate.
- Desktop postprocessing has an antialiased half-float render target. Failure disposes effects and retries base rendering.
- Startup waits for shader compilation and a first frame under the loading overlay. No repeating exception loop continues after disposal.
- PMREM failures restore render-target, tone-mapping, clear and XR state.
- Context recovery rejects stale completions and restores the tour control.
- Canceling lazy tour loading invalidates its request. Interior initialization/render failures release scenes, engines and handlers; blur clears movement inertia.
- Actual geometry bounds position labels and focus cameras after reference height corrections.

## Validation boundaries

Production build and all 31 regression tests pass; logs accompany this revision. All74 floor scenes construct/dispose under Babylon NullEngine; this is CPU lifecycle evidence. Fault injections reproduce three failures in the old interior and pass in the corrected implementation.

Browser control is available in this session. The deployed preview was opened and its fallback map, facility selection, directory search, floor selection and plan close controls exercised. Its browser reports `GL_VENDOR = Disabled, GL_RENDERER = Disabled` before any campus shader can compile. This prevents browser GPU startup, interactive3D tours, appearance, frame-rate and context-restoration validation. No alternate browser was launched to disguise that limitation. Native compiler and Blender evidence are separately labeled.

Exact-reference/photoreal acceptance remains **not met**. The PR stays open; this revision does not merge or certify it.
