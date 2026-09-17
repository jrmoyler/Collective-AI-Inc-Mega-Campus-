# Post-PR12 individuality pass

**Acceptance: improved, not complete.** This is a follow-up to merged main `2b16657`. It preserves all 35 facilities, 74 floor programs, 444 room programs, canonical placement, fleets, and CF-24/25 uncertainty.

## Changes driven by the supplied phone screenshot

- Daylight fog starts beyond the default aerial camera, rather than bleaching the campus from 900m. Reduced atmosphere turbidity is a code correction; hosted GPU appearance is still unverified.
- Ground extends to the distant horizon. The forest retains approximately 20m terrain sampling through a nonuniform mesh, preventing the roughly 2m tree-root error found during independent review of the initial coarse apron.
- Removed the invented 70-building background district, which repeated one stepped tower. These were outside the approved 35 facilities. The campus register is unchanged.
- Seven water basins have individually shaped, closed shorelines within their existing envelopes; their banks and vegetation exclusion use the same curve.
- Removed the shared desk-and-chair strips unconditionally installed in CF13–24. Their existing program-specific near equipment remains.
- Eon Core receives the source's dark facade pier, panel joints, physical metal roof-edge fascia and broader roof planting. The fascia winding was corrected after independent review.
- Program-driven room allocation, partitions, ceiling services, eight workplace arrangements and eleven domain equipment families replace several incorrect generic office/equipment fallbacks. See [interior implementation and limits](../../docs/interior-individuality.md).

## Actual geometry review

Blender 4.5.1 CPU Cycles, imported from the shipped Three.js geometry. These are **not browser captures**: lighting, transparency, tone mapping and interior normal maps differ from Three.js/Babylon.

- [Eon Core before](CF-13-before.jpg) / [after](CF-13.jpg), matched camera.
- [Eon research room](interior-13-room-1.jpg).
- [Eon adjacent room](interior-13-room-2.jpg).
- [Nexus production stage](interior-5-room-1.jpg).

The images were inspected. Eon has improved physical facade/roof differentiation, but remains much sparser and less sculpted than the source infographic. Its roof ribbon still crosses a simplified stepped envelope. The research interior remains sparse, and the stage's enclosure is too office-like/low for the source production hall. These are unresolved reconstruction differences, not accepted matches.

The governing images were recovered from `Collective_AI_220_Acre_Campus_Complete_Package.zip`, `05_Artwork/CF-XX_Facility_Infographic.png`; no source artwork is used as scenery.

## Verification

- Actual position-buffer hashes distinguish all 74 complete floor assemblies; labels, IDs and finish colors are excluded. This does not prove that every individual room is unique or visually correct.
- All 444 guided centerline arrivals are unobstructed at visitor eye height. Maximum floor geometry approximately 29.1MiB against the existing 96MiB gate. These are CPU geometry measurements, not GPU memory or device performance.
- All 49 integrated regression tests pass; Vite production build passes. [Tests](tests.log) / [build](build.log).
- Independent review identified and corrected inward fascia normals and coarse terrain sampling.
- Live production browser inspection: `GL_VENDOR = Disabled`, `GL_RENDERER = Disabled`, followed by `THREE.WebGLRenderer: Error creating WebGL context`. The schematic fallback displayed all 35 facility choices. A Google login cannot enable graphics in this hosted browser.

## Remaining acceptance work

1. Bespoke room/floor topology and heights: interiors retain six rooms in two banks around a common corridor, with a 3.9m enclosure. Whole-floor uniqueness is not equivalent to the requested absence of templates.
2. All-facility architecture and physical texture fidelity: most exterior massing is inherited from PR12; this pass does not claim all 35 were reconstructed again.
3. Dense reference-specific equipment, furnishings, occupants and landscape; source-specific furniture and material finish for every room.
4. Rendered desktop/mobile tour, restoration and final shader appearance on a graphics-enabled browser.
5. Physical Galaxy A15 performance and appearance.

Three architectural/rendering agents stopped on a reported usage limit. The interior agent completed its work and reviewed exterior changes; the primary agent integrated, corrected and validated the result. No Unity migration, paid generated asset, or Google account login was performed.
