# Validation record — PR 7

## Completed checks
- Production Vite build succeeds. Vercel confirmed the initial PR deployment READY; the corrected head is checked separately in PR status.
- Six Node tests cover the reconciled 35-facility register, 74 floors / 444 room zones, interior envelopes, exterior site bounds, Blender GLB structure, construction of every exterior assembly and construction/disposal of all 74 Babylon floor scenes using NullEngine.
- Full exterior scene export validates finite vertex positions. See geometry-check.json for actual counts. This catches scene-construction faults beyond bundler checks.
- Blender 4.5.3 created the physical synergy node; the viewer loads its local GLB beside every mesh spire.
- Offline Blender renders of the Three.js geometry are included from south and north. These are geometry review evidence only. Export removes canvas textures and does not reproduce WebGL lighting, shader water, UI, or the separately loaded synergy GLB.

## Fixes found during validation
- Mixed indexed/non-indexed Prism geometry caused BufferGeometryUtils merging to fail. The shared batch builder now normalizes indices and UV attributes; the exterior-construction regression test covers every facility.
- The first sawtooth roof used an incorrectly oriented cylinder extrusion. Replaced it with indexed triangular prism bays.
- Interior module imports originally pulled a 6 MB Babylon barrel. Specific modules reduce the interior bundle to about 895 KB before gzip, loaded only on entry.
- Corrected narrow-room doorway placement to use the floor-plan bay width.
- Ground agents on open paths now reverse instead of teleporting from the endpoint back to the start.
- Guided movement determines the current room from the camera position before returning through its doorway.

## Reference acceptance remains OPEN
The visible geometry is a procedural reconstruction, not an identical reproduction. The exterior arrangement broadly follows the full campus artwork. Detailed materials, landscape morphology, individual facility facades and cutaway architectural details still differ. Interior room names and schematic bay proportions come from the supplied schedule; furniture and hidden spaces are interpretations. The campus artwork, individual cutaways, and CAD also depict inconsistent exterior forms and placements.

No exact-match score or browser visual pass is claimed. Offline geometry reviews do not certify actual Three.js rendering, Babylon browser controls, mobile interaction or performance.

## Browser access blocker
Local preview attempts at 127.0.0.1:5173 and localhost:8080 were blocked by the provided browser. The Vercel preview redirected toward Vercel sign-in; automatic approval review rejected browser access to the Vercel origin because separate authenticated dashboard/account access had not been approved. No alternate browser, protection bypass or share token was used to circumvent that rejection.

Remaining checks after authorized preview access: startup/loading failure, scene render, facility selection from model and directory, all floor selectors, guided stops, WASD/touch collision behavior, exit/re-entry, layer toggles, desktop and mobile screenshot comparison, and physical Galaxy A15 frame-time/memory testing. Keep the PR draft until those checks and visual acceptance are satisfied.
