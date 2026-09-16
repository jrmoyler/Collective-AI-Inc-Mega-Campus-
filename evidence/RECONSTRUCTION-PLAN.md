# Reference reconstruction continuation — September 16, 2026

Authorization: user requests a new PR with reference-matched exteriors and realistic furnished interiors. On clarification, user chose campus artwork for placement, individual facility images for architecture and visible interiors, realistic completion of unseen rooms.

## Preserved rejection
PR 7 has merged but its exact-reference acceptance did not pass. The legacy `.img2threejs/state.json` and assessment remain unchanged. This is a continuation of its direct Three.js / Blender / Babylon route, not a claim that the single-object generator passed.

## Diagnosis and changed method
The deployed screenshots show sub-CSS-resolution interiors, slab furniture, no material textures, almost uniform hemisphere illumination and large overlaid UI. Most exteriors are selected from aerial silhouette families even where the user's now-selected facility infographic specifies another form.

Use a shared, named, multi-part geometry kit for interior furniture and architectural finishes, with bevels, physically sized components, program-specific assemblies, separate PBR finish parameters, readable workstation displays and collision geometry. Convert the same geometry to Babylon for tours and glTF for offline inspection. Restore at least CSS pixel resolution on high-DPR devices. Furnish the six rooms individually from their program, while retaining the 74-floor schedule and clear arrival/door circulation.

Visible reference targets: CF-30 graphite/gold pilasters, glazed operations rooms, server racks, records shelving, round demonstration console; CF-01 vertical glazed tower/oculus/cantilever suites; CF-11 planted cylindrical grow towers; clinical and research curved wings; knowledge/media/public facilities occupied glazed boxes; manufacturing sheds and equipment; energy hardware; planted plazas and tree canopies.

## Evidence rules
Inspect actual geometry from multiple offline angles; never label Blender images as browser captures. Browser here reports WebGL unavailable. Browser UI tests do not satisfy desktop/mobile GPU acceptance. No physical Galaxy A15 is connected. Add an explicit device report capturing runtime frame intervals, scene/floor, resolution and renderer; never infer a phone result from viewport simulation. Keep exact likeness open where not demonstrated.
