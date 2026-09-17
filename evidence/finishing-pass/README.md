# PR 12 finishing pass — September 17, 2026

Implementation revision: `2dd7e47717a351bf36c2fa7dcc46f2bee2ada4f2`.

The user selected integrated runtime work plus visual-first reconstruction. This pass keeps the 35 individual facilities, 74 floor programs, campus placements, infrastructure, fleets, interior equipment and CF-24/25 area caveats. Canonical data and the interior floor-layout/furnishing generators are unchanged.

**Exact-reference / photoreal acceptance is still not met.** These changes improve construction detail and produce usable device evidence tools; they do not justify a claim of little-to-no visual differences. The source comparison sheets still show substantially greater equipment, landscape and illuminated cutaway density. Hidden dimensions and rooms remain inferred.

## Visible changes and review

- Single-surface, two-sided thin glazing replaces doubled front/back tint layers. Solid glazed equipment cases retain their volume. Horizontal skylights and both vertical panel orientations have regression coverage.
- All three facility builders follow their existing wing outlines with projecting sill sections, recessed heads, soffits, warm diffuser strips and roof coping. Buried faces are omitted rather than increasing existing triangle limits.
- Deferred front room bays include glass partitions, support columns and suspended ceiling services. Existing program-specific equipment remains. High-bay halls are not subdivided by this new room kit.
- Small roof planting now uses open branches/folded leaves. Planted wings in CF-25–35 have paved separation and bounded beds. Review found shrubs intersecting the CF-35 solar panels: panels now have raised supports and taller planting is excluded around actual installed arrays.
- The initial dense trim pass exceeded Eden Spire and combined geometry budgets. It was rejected, then replaced with open construction sections and fewer hidden surfaces. Existing budget thresholds were not relaxed.

Six 640×480 before/after pairs use identical saved cameras, lighting and 16 Cycles samples:

| Facility | Matched comparison | Observed change |
|---|---|---|
| CF-01 Prism | [Before / after](CF-01-comparison.jpg) | Clearer occupied tower/suite glazing, projecting floor edges and roof profiles |
| CF-08 Titan Works | [Before / after](CF-08-comparison.jpg) | Reduced curtain-wall opacity accumulation and articulated perimeter; crane/high-bay identity retained |
| CF-13 Eon Core | [Before / after](CF-13-comparison.jpg) | Roof coping, planted edges, visible front room divisions and soffit depth |
| CF-25 Gaia Synthesis | [Before / after](CF-25-comparison.jpg) | Paved roof garden separation, clearer occupied wings and raised solar assemblies |
| CF-28 Water Observatory | [Before / after](CF-28-comparison.jpg) | Clear facade planes, detailed floor/roof edges; water/wing identity retained |
| CF-35 Care Village | [Before / after](CF-35-comparison.jpg) | Planted beds, paths, visible care frontage and resolved shrub/panel intersections |

All 35 shipped facility meshes were exported and rendered again. Review sheets: [01–12](comparison-01-12.jpg), [13–24](comparison-13-24.jpg), [25–35](comparison-25-35.jpg). Individual images and camera/geometry manifests are in `all-facilities/`. Source panels are reproduced from the earlier committed reference comparison sheets; they are not newly recovered high-resolution originals. Cycles is a geometry/material review, **not** the browser's renderer.

## Runtime and evidence fixes

The previous device recorder discarded frame intervals of 2 seconds or more. Schema 2 retains foreground stalls, reports p95/p99/max timing and draw-call peaks, separates lifecycle/view boundaries, records rendered floor coverage and embeds the build revision. Hidden time is explicitly excluded. Events record startup, floor requests, first ready interior renders, context loss/restoration, errors and capture filenames. The event/sample limits and dropped counts are explicit.

Interior context loss clears held movement and stops frame evidence until a restored, ready scene actually renders. Observer cleanup is tested. Exterior restoration submits a frame before announcing restoration; it retains the effects-to-base fallback. Shader compilation or context-restored notification alone is not counted as visual proof.

`?qa=1` enables **Device check**, available above either 3D engine or the schematic fallback. It can start/download a local report, capture the current canvas immediately after a rendered frame, and exercise the real `WEBGL_lose_context` extension. Unsupported graphics cannot produce a fake screenshot or a passed recovery. This mode sends no telemetry.

## Verification

- [44 passing regression tests](tests.txt), including all 74 Babylon floor scenes constructing/disposal, thin-pane orientation, long-stall accounting and lost/restored interior evidence.
- [Production build passes](build.txt). The deployed implementation revision reports Vercel success and its QA panel visibly identifies build `2dd7e477`.
- [17 native expanded shader programs pass](shader-check.txt), including negative interface controls and HDR framebuffer resolve/readback. [Native report](shader-native-report.json). This is software EGL/Mesa evidence only.
- Existing per-facility and combined triangle limits pass without changes. All 35 identities, finite geometry and picking IDs pass.
- [CPU fine-detail accounting](exterior-detail-budget.json): startup/aerial 0 bytes; Prism approach 3,423,780 bytes; south approach 7,897,788 bytes; distant return 0 bytes. Eager all-detail maximum 65,363,940 bytes. These figures exclude texture memory, total heap and GPU allocations and are not FPS claims.
- Live hosted-browser QA panel: start recording, download empty-render failure evidence, reject unsupported recovery test, reject capture with no active canvas. CF-35 selection and floor-plan access remain available. [Observed UI](browser-check.txt), [graphics blocker](browser-gpu-block.txt).

## Remaining acceptance gates

| Gate | Current evidence | Concrete finishing/acceptance action |
|---|---|---|
| Reference density and photorealism | All 35 revised offline renders; still below illustrated reference density | On the real renderer compare aerial, street and individual obliques; finish equipment, facade branding, roof services and landscape for each visible mismatch. Do not approve from unique signatures or test counts. |
| Browser GPU startup / appearance | Hosted browser fails before shader creation: `GL_VENDOR = Disabled`, `GL_RENDERER = Disabled` | Run the deployed QA route on a graphics-capable browser; save aerial, street, daylight and dusk frames. Inspect transparency, shadows and material response. |
| Rendered 3D tours | 74 construction/disposal checks; no hosted-browser rendered tour | Visit every programmed floor; capture its actual frame and exercise room navigation, walking, return and reopening. |
| Context recovery | Deterministic lifecycle regressions pass; real-context UI is available | Test exterior and interior loss/restoration separately; verify the returned image, continued movement, floor change and return to campus. |
| Galaxy A15 | No physical-device capture received | Use the route below on the physical phone, describe conditions, record sustained campus/tour operation and provide JSON plus screenshots. User-agent strings never close this gate. |

### Physical-device run

Open the PR preview with `?qa=1`, then **Device check**. Enter model/browser and conditions, start recording and close the panel. Test aerial/street views, select a facility, visit its floors/rooms, return, change detail and test both engines' recovery. Save views before and after recovery. Download the report when finished. Use multiple recordings if needed; missing coverage stays explicit.

Analyze a downloaded schema-2 report with:

```sh
node scripts/summarize-device-report.mjs campus-device-report.json EXPECTED_COMMIT_SHA
```

This lists missing floors, measured latency and recovery submissions. It never certifies physical hardware or reference fidelity. Start with Prism, Eden Spire, Titan Works and Care Village for contrasting workloads; complete all 35 facilities/74 floors for full tour coverage.

No merge, device-FPS result, visual-match percentage, Unity migration or generated Tripo asset is claimed.
