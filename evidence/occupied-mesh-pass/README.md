# Textured occupants and Neural Block reconstruction

Base: `e4864ff8f7912efaa9ff48dd68f6fa3d8486cc58`. This pass changes production meshes, materials, exterior construction and research fittings.

## Changes

- Replace the sphere/cylinder people with three anatomically modeled, clothed MakeHuman characters: continuous skin and garment meshes, UV skin, eyes, eyebrows, hair, footwear and clothing textures. All 472 occupied seats across 279 rooms use these meshes. Source licenses, pinned generator and reproducible build instructions are in [asset provenance](../../public/assets/occupants/README.md).
- Preserve the actual chair quaternion and room-transform placement. Bodies remain non-colliding; placed geometry is owned by the floor. Immutable base meshes are decoded once per variant, and character textures are shared within each Babylon scene.
- Include people in their room's luminaires. Character materials use the glTF UV orientation, alpha-tested eye/hair pixels and the right-handed Babylon normal-map convention. Unused character materials are not created on floors without those variants. Remove the unused procedural character palette.
- Rebuild CF-02's exposed upper GPU hall, curved control display, rear roof plant tiers, splayed portal legs, raised entry stairs and cooling cascades. Remove the extra rooftop office and its orphaned console, enlarge upper rack banks relative to the hall, and attach the source's COLLECTIVE AI lettering to the entrance portal.
- Correct oversized wearable bands to 76 mm diameter and sample tubes to 17 mm diameter × 120 mm height, with twelve tubes per carousel. These are inferred research fittings, not manufacturer-certified equipment.

## Evidence

55 tests and the production build pass. All 74 floor geometries and 444 guided entry paths pass; maximum floor mesh buffers are 29,095,704 bytes (27.75 MiB), below the unchanged 96 MiB limit.

- [Character assets](character-poses.jpg), [Eon occupied research room](interior-13-L1-room-2-occupied.jpg), [Eon room view](interior-13-L1-room-2.jpg), [water-analysis room](interior-28-L1-room-3-occupied.jpg).
- [CF-02 front angle](exteriors/CF-02.jpg), [second angle](exteriors/CF-02-orbit.jpg), [full reference comparison](CF-02-comparison.jpg). Geometry and camera metadata accompany the renders.
- [Tests](tests.log), [build](build.log), [all-floor geometry/routes](budget.json), [character texture accounting](texture-budget.json), [444 room inventory](room-fittings.json).
- The first exterior budget check failed at 411,046 triangles across CF-01–12. Thin rack front plates and indicators now use single surfaces, and manifold tube subdivisions were reduced. The existing 400,000-triangle gate is unchanged. The failed run is retained in `rejected-budget-test.log`.
- Rejected renders retain the orphaned rooftop console, obscured lettering and oversized sample tubes. Earlier Eon roof and occupant-orientation rejections remain in their original evidence directories.

The character textures total 8,863,540 bytes on disk and 30 MiB as unique RGBA pixels, approximately 40 MiB with mipmaps. These figures exclude other textures, shadows, renderer allocations and transient decode buffers; they are not a physical-device memory benchmark.

## Acceptance

This is a verified implementation continuation, not closure of the three requested global visual gates. Exact matching for all 35 exteriors, individually authored furnishings for every hidden room, and whole-scene photoreal acceptance remain open. CF-02 is closer in its visible program and roof composition, but its lower facade, landscape relationship and architectural proportions still need work. The other 34 exterior massings are unchanged by this pass. Characters are now textured meshes, but poses are static and the complete room/landscape material treatment still falls short of the reference imagery.

All review images are CPU Cycles renders of production geometry and texture assets. The interior reviewer reproduces character texture UVs; Cycles lighting and AgX differ from Babylon. No browser-GPU, phone-performance, or photoreal acceptance is inferred from structural tests or these CPU renders.
