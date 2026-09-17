# Realism continuation after PR 10

Authorization: fix all three regressions alongside a campus-wide material, lighting,
furniture and equipment pass, then detailed facility reconstruction in this PR.
Preserve 35 facilities, 74 floors, all existing named components, campus placement,
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
