# Post-PR11 living-campus reconstruction

Base: `62bd8b0` (PR #11 merged). This is a reconstruction pass, **not exact-match or photorealism acceptance**. See `QA.md` for final measurements and visual findings.

## Reference contract
Recovered the original `Collective_AI_220_Acre_Campus_Complete_Package.zip`. Aggregate Variant 29 governs siting; individual CF infographics govern architecture and visible interiors. Hidden rooms remain inferred. The 35 facilities, 74 floors, 220-acre data and CF-24/25 area caveats are preserved. No reference artwork is used as scenery.

## Changes
- Analytic outdoor sky/clouds, outdoor reflections, daylight startup, restrained dusk, non-emissive foliage/glass. Mobile gets antialiasing and a bounded 1024px shadow map. Automation no longer receives a different population/scene.
- Branched instanced vegetation with folded leaves and wind, accurate planting setbacks, rolling terrain outside flat foundations, asphalt with narrow energy guides, water ripples and reed borders.
- Curved glazed facades with slabs/mullions/recessed interiors, corrected CF-12/13 terrace silhouettes, removed duplicate HQ suites and floating rooftop planters.
- Sculpted upholstery/mattresses, physical texture scale and micro-normal maps, fixed auditorium seating, task lamps and desk objects.
- 30 shuttles, eight freight vehicles, 24 articulated androids, 16 drones. Rolling tyres, arc-length route speed and restrained banking. PR11 rotor pivot/arm corrections retained. This is scripted activity, not traffic or pedestrian collision simulation.
- Blender 4.5.3 authored a 440KB furniture GLB with beveled ash slats, curved supports, fasteners, hollow planters and shielded bollards. Fine furnishings are instanced within 180m; aerial views submit none of these props. Rebuild: `blender --background --python scripts/blender_street_furniture.py`.

## Evidence boundaries
Matched Blender geometry renders use identical cameras and lighting. **They are not browser screenshots**. glTF does not preserve the custom water/foliage/road shaders, runtime sky or postprocessing. Interior offline renders omit runtime micro-normal maps and use independent lighting. Do not present these images as deployed appearance.

The first aerial review was rejected for bare ground and clustered pink planting. `pass1-*` preserves that result; final `current-*` files show the corrected placement pass. Exact acceptance remains open.

## Capability gaps
The prescribed browser-control execution tool is unavailable here. No substitute browser-control route was used. Shader source compatibility was checked against installed Three.js; actual GPU compilation, startup, tours and day/dusk still require browser verification. Physical Galaxy A15 evidence cannot be supplied by offline renders or NullEngine tests. Additional vegetation and form detail increases GPU work; no FPS improvement is claimed.

Tripo H3.1 (`tripo3d/h3.1/text-to-3d`) was discovered through connected fal, schema/pricing checked, and one natural limestone asset request submitted. HTTP 403 `balance_exhausted` blocked submission. No Tripo asset was generated; no retry or account switch was made.

Unity was not installed or substituted. The existing Three.js exterior/Babylon.js interior architecture is preserved; a Unity migration would be a separate, unverified rebuild.

Exact geometry, unseen rooms, autonomous activity and photographic material matching are not complete. Keep the PR draft until runtime visual review and physical-device checks pass.
