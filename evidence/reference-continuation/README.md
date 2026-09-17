# Reference and occupied-room continuation

This changes the exterior, unlike the previous topology-only continuation. It does **not** close exact-reference matching, bespoke furnishing of every hidden room, or photoreal acceptance.

## Retained changes

- Eon's independent roof ribbons are replaced by a facade perimeter with a changing section, attached metal fascia, connected weather roof, inset research pavilion, lower clinical wing, stepped planted shoulder, flush solar field, right-side waterwall/basin and anchored nameplate. The new roof is not the previously rejected loft through the occupied rooms.
- The generic floating nameboards are removed from all 35 facilities. They were positioned beyond a common bounding rectangle, detached from the individual facades. Facility names remain in the directory/selection UI. Architectural signs require an authored shell anchor; Eon's is on its graphite pier.
- Straight rods use one axial cylinder segment instead of redundant tube rings. This preserves their positions/radii and reduces geometry without raising the existing 180,000-triangle exterior limit.
- 71 named research rooms receive function-specific acquisition, metrology, sampling, network, document/credential or analytical equipment. No inherited generic bench analyzer is placed underneath the new instrument. Instrument screens show an acquisition preview rather than the campus statistics dashboard.
- Private consultation/review rooms use private workplace settings rather than the open conference-room branch.
- 472 adult-scale seated figures are attached to actual rotated seats in 279 rooms. They are static modeled occupants with separate non-colliding geometry. They are not photoreal characters or evidence of activity simulation.
- The review exporter accepts every valid floor, cameras follow each room's local axes, and close occupied views use seat anchors. The exterior exporter fixes native Canvas's `data()` method being mistaken for a texture byte array, which had produced black sign textures.

## Evidence and gates

- `tests.log`: 56 regression tests, including all 35 exteriors, all 74 floor geometries and all 444 guided entry paths.
- `build.log`: production build.
- `budget.json`: maximum floor geometry 24,556,552 bytes (23.42 MiB), below 96 MiB; zero blocked guided routes.
- `acceptance.json`: explicit per-facility open visual defects and overall unaccepted gates.
- `room-fittings.json`: actual component inventory for all 444 rooms; explicitly distinguishes shared inferred recipes from individually authored rooms. Counts are coverage evidence, not a bespoke-quality score.
- `exteriors/`: fresh actual-factory renders for every facility, geometry manifest and camera transforms. These include the common nameboard removal; other than Eon, individual massing is retained.
- `CF-13-orbit.jpg` and `CF-13-comparison.jpg`: second-angle and full-reference review of the new Eon composition.
- Interior images and camera records show the actual shipped Three.js vertex buffers and the runtime albedo painter, rendered with CPU Cycles. Babylon lighting, tangent normal maps and browser appearance differ.

The source package is the user's supplied `Collective_AI_220_Acre_Campus/05_Artwork/CF-01…35_Facility_Infographic.png`. Nothing from those images is attached to gameplay geometry. Campus placement, 35 facilities, 74 levels, 444 ordered programs, 220 acres and CF-24/25 source-area uncertainty are preserved.

## Review decision: refine further

The new Eon perimeter no longer crosses the upper labs as the rejected experiment did. The source's inset pavilion, descending front-right shoulder, signage pier, roof solar and right waterwall are now represented together. However, the upper pavilion is still too box-like; planting, local fascia curvature, glazing rhythm, water appearance and visible clinical-room density remain below the reference. This is retained as a structural correction, not an exact-match approval.

All other facility silhouettes remain approximations from the earlier reconstruction. Removing common floating signs does not close those individual shape/roof/terrace mismatches. The new room inventory also exposes the remaining shared furniture recipes; it does not turn them into bespoke designs by renaming them. Occupant anatomy/materials remain visibly procedural. The photographic character, exterior and occupied-scene thresholds are not passed.

No successful browser tour, WebGL screenshot or physical Galaxy A15 measurement is asserted. CPU rendering was used to keep implementation and geometric review moving despite the previously documented browser restrictions; these restrictions are not the reason the visible fidelity gates remain open.

## Rejection history and continuation contract

`../topology-pass/CF-13-rejected-roof.jpg` remains the rejected and reverted older loft. It is not the current exterior. The previous topology evidence is unchanged. This continuation also retains `rejected-occupant-chair-orientation.jpg` and `rejected-water-room-chair-orientation.jpg`: close renders exposed an Euler-angle bug that faced people through half-turned chair backs. The quaternion-based correction and its regression test are in the retained code. The next close view exposed local-axis rotation of tilted limbs; both `rejected-occupant-local-limb-rotation.jpg` and its water-room counterpart preserve that failure. World-axis assembly rotation now keeps cylinders connected to their endpoint joints, covered by attachment tests. These rejected poses are not the final geometry. `pre-fix-room-overview.jpg` is retained as an earlier overview, not final pose evidence.

The Image-to-Three.js multi-building direct-model continuation remains in effect. Legacy `.img2threejs/state.json` is preserved, not reset or advanced to a passed generator state. SHA-256: `9cfcd7fea68609365645636ee5c17a7be21490ce5d92a3c48cd2f754161ba5e5`; analysis SHA-256: `ab3c2f23f240e60a0906fcec54f1a5fe2f33efe4d79a02f512c7395952f2c2cc`. User authorization covers direct reconstruction and publishing to PR #13. This directory is the continuation ledger; the legacy one-object generator cannot represent the campus and second-engine interiors.
