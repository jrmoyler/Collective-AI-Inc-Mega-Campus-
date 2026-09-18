# Floor topology and enclosure continuation — PR 13

**The universal two-bank office shell is replaced. Full exact-reference acceptance is still not established.** All 35 facilities, 74 floors, 444 ordered room programs, source footprints and CF-24/25 area uncertainty remain.

## Shipped changes

- An explicit per-floor split expression defines room adjacency and branching passages. Room dimensions follow program demand with minimum clear spans. This is a proposed fit-out of unseen partitions, not recovered survey data.
- All 74 enclosure signatures differ before furnishing or material selection. There is no longer a single central-corridor, three-rooms-per-side layout applied to the entire campus. Rectangular room construction and manufactured fixtures are still shared components; uniqueness does not establish exact source agreement.
- Entrances can face any of four directions. The same room/circulation data feeds the SVG plan, Three.js export, Babylon geometry, labels, lighting and guided movement. Free-walking corridor visits project onto the current branch rather than taking a diagonal through intervening rooms.
- Room clear heights are 3.2, 3.6, 4.2, 4.8, 6 or 9 metres according to function. Doors, controls, seating and desks retain human dimensions; ceilings and services move independently.
- Nexus's LED volume accommodates the stated 40 × 60 ft stage without clamping it to an office bay. Its enclosure and soundstage are 9m; motion capture is 6m. The curved LED wall uses aligned panels with a neutral calibration surface instead of repeated office analytics. Production rear walls are enclosed.
- Closed passage ends and service-strip boundaries so free walking cannot leave the floor through an open circulation edge. Internal support-strip partitions no longer masquerade as exterior windows.
- High-bay Babylon fixtures compensate for their mounting height; furniture and controls keep their original human scale.
- Fixed a material error where a nominal brass edge covered nearly the whole side partition. Brass is now a pair of 25mm vertical reveals.

## Review artifacts

- Complete floor-plan sheets: [1–20](plans-1-20.jpg), [21–40](plans-21-40.jpg), [41–60](plans-41-60.jpg), [61–74](plans-61-74.jpg). Individual plan images and [all room routes/dimensions](floor-manifest.json) accompany these.
- Shipped geometry CPU Cycles renders: [Nexus LED room](interior-5-room-1.jpg), [Eon research intake](interior-13-room-1.jpg). They were visually inspected. Albedo comes from the runtime painter; Cycles lighting, tone mapping and transparency differ from Babylon. These are not browser images.
- [Geometry budget and all entry route checks](budget.json), [regressions](tests.log), [production build](build.log).

## Rejected exterior experiment

[Rejected Eon roof](CF-13-rejected-roof.jpg) shows an attempted continuous loft between the descending fascia curves. Inspection revealed an inappropriate ramp-like roof intersecting the inherited envelope. That change was reverted before commit. The shipped exterior is unchanged by this continuation. `cameras.json` and `geometry-manifest.json` belong to that rejected experiment only.

## Source and remaining acceptance

All 35 CF infographics were inspected from `Collective_AI_220_Acre_Campus_Complete_Package.zip/Collective_AI_220_Acre_Campus/05_Artwork`. Source cutaways are not consistent, measured interior surveys; the new wall coordinates and heights are inferred.

This pass does **not** close all requested reference mismatches. Eon's exterior silhouette, other inherited facade/roof differences, source-specific furnishings for every hidden room, and occupied-scene photorealism remain open. The two rendered interior samples cannot establish the appearance of all 444 rooms. Shared rectangular partitions and furniture families remain. Browser tour/shader appearance, recovery under a real GPU, and physical Galaxy A15 performance require their own evidence.

The hosted browser could not open the local preview (`ERR_BLOCKED_BY_CLIENT`). Offline geometry validation and CPU rendering proceeded independently. The hosted PR preview redirected to Vercel sign-in, so no updated browser tour is claimed. No account sign-in or graphics security setting was changed.
