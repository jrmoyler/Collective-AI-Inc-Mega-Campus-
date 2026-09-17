# Realism continuation after PR 10

Authorization: fix all three regressions alongside a campus-wide material, lighting,
furniture and equipment pass, then detailed facility reconstruction in this PR.
Preserve 35 facilities, 74 floors, detailed furnishings, campus placement,
and CF-24/25 source-area uncertainty. Prior .img2threejs state and rejected exact
match claims are preserved; this is the documented direct Three.js/Babylon route.

Baseline CF-01 floor 1 (Node, not phone/browser): 7,937,340 vertices,
253,994,880 attribute bytes, 3,527 named components; 2.43 seconds construction,
450,781,184 bytes process RSS in this environment.

Changed method: size-aware bevel tessellation, cached indexed primitives, indexed
material merging and typed-array Babylon transfer. Keep large visible curved
furnishings smooth, retain every named fitting. Validate bounds, part inventory,
geometry bytes and all 74 floors; test motor alignment and rotor-only animation.
Use one base-color application per surface; add functional building services and
program-specific equipment. Compare new renders to the recovered source package.

Acceptance remains open until actual matched views and device evidence exist.

## Outcome and remaining acceptance limits

Recovered all 35 facility infographics and plan PDFs from the original package.
All 444 program labels match normalized PDF text (`source-program-check.json`).
The room layout dimensions, schedule and 12-foot central circulation are unchanged.
Specialist equipment replaces inappropriate generic office equipment where the
program explicitly calls for a clinic, kitchen, studio, utilities, fabrication,
maintenance, retail, storage, support or accessible-home demonstration.

The pure geometry optimization retained all 3,527 original CF-01 named parts and
reduced attribute+index storage to 20,025,656 bytes; construction was 0.54 seconds
in a separate Node process versus baseline 2.43 seconds. After program-specific
furnishing and pointed plant leaves, see the per-floor budget report for the
final inventory. These are Node measurements, not Galaxy A15 benchmarks.

Regression checks validate all arm endpoints against actual motor coordinates,
all four blade rotations, unchanged cyan eye/lens local orientation, and original
rounded-box normals/UVs/positions against the indexed mesh. All 74 floors fit
within the 96 MiB geometry budget and every guided arrival ray is unobstructed.

Material rendering uses one albedo application, a shared runtime/offline surface
painter, full-screen monitor UVs, subtle exterior relief and room-program color
temperatures. Mechanical/electrical ceiling and wall details are real geometry.
Prism now has vertical glazed sides, three occupied cantilevers and an oculus;
shared rectangular envelopes have visible slabs, furniture, mullions and roof plant.
Lawn UVs are metre-scaled; crown silhouettes and interior leaves are no longer
solid ellipsoids. Existing campus placements, systems and fleet populations remain.

Blender 4.4.0 was installed from the official distribution for offline geometry
review. Three.js 0.186.0 and Anime.js 4.5.0 are locked; npm's registry check showed
no newer compatible versions of the other existing dependencies at task time.
Offline images use Cycles and are NOT Babylon/Three WebGL screenshots. glTF does
not export the custom animated road/energy shaders, so their offline appearance
cannot validate those runtime effects. Render lights differ from browser lights.

PR 11 Vercel preview loads and facility selection, floor-plan opening and L12
selection work. The cloud browser reports WebGL unavailable, exercising the
labelled schematic fallback. No physical Galaxy A15 is attached. Exact visual
acceptance is still OPEN: all-35 matched GPU views, each specialist room's visible
reference match, hidden-room completion, and physical-device frame timings are
not established by these tests. The offline tower is closer in silhouette but
still differs in crown contour, planted terraces, occupied detailing and lighting;
other facility families also retain interpretation. Do not call this an exact or
100% photorealistic reconstruction.

Final geometry report: CF-01 floor 1 = 280,053 vertices / 10,779,816 bytes; largest of 74 floors = 27,227,744 bytes / 679,231 maximum vertices. Final specialist component counts differ from the pure optimization baseline because inappropriate default office layouts were replaced.
