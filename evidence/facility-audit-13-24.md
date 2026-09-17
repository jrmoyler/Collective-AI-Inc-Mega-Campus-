# CF-13–24: individual infographic reconstruction audit

Source: each original `CF-13_Facility_Infographic.png` through `CF-24_Facility_Infographic.png` in the supplied `Collective_AI_220_Acre_Campus/05_Artwork` directory. All twelve were visually inspected in three four-image contact sheets, retaining the entire infographic and its labels. These are conceptual cutaway renderings, not measured elevations. The existing campus placement and facility data remain authoritative for runtime positions and dimensions.

Implementation: `viewer/campus/facilities-13-24.js`, exported `createFacility13to24(f)`. Returns a complete replacement local-space exterior group for IDs 13–24, or null otherwise. It does not reposition the facility, add image surfaces, change canonical floor programs, or invent a new area record.

| ID | Observed architectural identity | Modeled distinguishing features | Remaining uncertainty |
|---|---|---|---|
|13 Eon Core|Flowing rounded lower shoulders; inset upper research pavilion; planted terraces; waterfall beside glazed lobby; rooftop solar|Two-level curved glazed base; separate upper pavilion; offset terrace and pergola; water wall and basin; narrow bronze facade fins|Waterfall depth and rear servicing not measurable from artwork; roof structure inferred|
|14 Cognara Mind|Three levels; rounded forward corner; offset upper research rooms; roof garden/solar; dark perimeter bands|Rounded capsule envelope with inset upper level, terrace, five distinct glazed research booths and solar field|Booth counts approximate visible rhythm; rooms behind cutaway not surveyable|
|15 Kinetic Edge|Wide performance podium; rooftop/upper indoor sprint oval and green turf; tall glass motion-capture corner|Distinct four-lane rounded running circuit, inset green court, glazed corner motion pavilion, perimeter posts and two occupied laboratory levels|Artwork removes roof over track to reveal program; modeled open track is an interpretation, not an established enclosure specification|
|16 Civic Core|Auditorium between public-service rooms; rounded arrival edge; sweeping blue solar-glass public canopy|Stepped flanking wings, tiered auditorium seating and screen, curved-height glazed plaza canopy on slender columns|Canopy is segmented real glazing following observed curve; exact structural spans unavailable|
|17 Terra Axis|Large solar canopy yard; drone inspection roof pad; multiple small prototype homes; service demonstration lane|Three-level testing block with raised solar canopy, separate round inspection pad, four actual small prototype buildings, marked service bays|Prototype count and exact inspection-pad dimensions inferred; no greenhouse substituted for referenced yard|
|18 Nomad Nexus|Two-storey deployment building; recessed central arrival; large mobility map room; field-kit storage; dark vertical fins|Two flanking wings and rear bridge around open arrival court; large dashboard wall; stacked equipment cases with hardware; rooftop solar|Dashboard is physical generic data display, not fabricated country-specific information or pasted source imagery|
|19 Juris Guard|Stepped multi-level regulatory offices; opaque judicial spine; scales emblem; large evidence/policy screen|Four stepped research/operations volumes, tall solid spine, modeled balanced-scales emblem, policy display and ground entrance|Rear rooms and final frame dimensions inferred; signage typography delegated to existing campus labels|
|20 Aether Link|Tall asymmetrical glazed communications spire; stepped occupied rooms; external braces; circular antenna crown and needle|Low podium, three progressively narrower occupied tower stages, solid vertical spine, sloped structural braces, antenna deck, eight equipment masts and central aerial|300-foot height retained from canonical facility h; antenna arrangement approximates depicted hardware|
|21 Central Utility|Battery arrays; horizontal turbines/cogeneration; exhaust stacks; water-treatment vessels; roof fans; control room|Distinct battery hall/array, three banded horizontal turbines, two exhausts, five vertical vessels, three cooling fan housings and separate glazed command room|Engineering systems visually inferred; equipment is not a construction or operational design|
|22 Visitor/Security|Bent glass arrival front; flanking command/theatre suites; large central reception; solar roof|Rounded lower public hall, two upper wings, visible tiered theatre, command dashboard, terrace, screened visitor entrance and roof solar|Badge/security devices are schematic architectural detail; no claim of surveillance operation|
|23 Employee Commons|Multi-storey wings enclosing all-hands forum and central courtyard; dining/wellness rooms; solar/pergola rooftops|Three inhabited wings around real open courtyard, six-row forum seating, lower service wing, dining tables and contrasting roof features|Program layout is based on visible cutaway only; hidden kitchens/support rooms remain interpretation|
|24 KEOC|Rounded dark control pavilion; three levels; inset upper deck; roof solar; source explicitly marks original area/siting/ownership unrecovered|Curved two-level base, inset upper operations pavilion, terrace, solar roof and large control display|CF-24 area, original program, ownership and placement remain unrecovered. Existing provisional runtime envelope is retained; this is illustrative massing, not recovered source fact|

## Geometry verification

CPU construction instantiated all twelve variants successfully. Every mesh bounding sphere was finite. Per-facility triangle totals range from approximately 11,800 to 31,800, with no unbounded subdivision. Nominal building envelopes stay close to the canonical footprints; small facade/entrance projections are intentional. Architecture is assembled from actual slabs, frame members, glazing panels, equipment, roof structures and furniture, not source artwork attached to meshes.

Browser rendering, matched-angle reference comparison, interior/exterior program reconciliation and physical Galaxy A15 measurement remain separate acceptance gates. This implementation does not claim exact reference identity or completed photorealism.

## Matched-render correction pass

The first rendered comparison was inspected and rejected as insufficient: CF-15 was compressed into a stadium-like slab, CF-17 retained the low greenhouse placeholder height, and CF-13/14/24 were too similar. The correction changes actual geometry:

- **CF-13:** high rear pavilion, low garden shoulder, two staggered terraces and descending curved structural edge ribbons.
- **CF-14:** asymmetric stacked interview/research wings, rounded front-right volume, exposed lower terrace and small upper research booths. This replaces the generic two-tier capsule.
- **CF-15:** three occupied levels in a 25.5 m podium, an additional 8.5 m motion-capture suite, projecting recovery terrace, visible treadmill gym and diagonal structural cheeks. The previous 14 m legacy stadium envelope was visually inconsistent with the source. Height is inferred from the visible multistorey composition, not surveyed; canonical floor-program data is unchanged.
- **CF-17:** 26 m three-level research block, stepped inspection-pad wing, raised solar canopy, lower terrace and three freestanding prototype houses. The former 12 m greenhouse envelope did not represent the governing infographic. Height remains an architectural inference.
- **CF-24:** bronze curved operations facade with continuous front floor ribbons, offset inset upper pavilion, control panels and roof pergola. Unrecovered area/siting/ownership status remains unchanged.
- **All twelve:** removed broad green roof carpets in favor of stone terrace surfaces and narrow planted edge beds. Introduced local neutral architectural glazing (alpha 0.20, metalness 0.03, depthWrite false) so actual slabs and furniture remain legible instead of becoming hidden by stacked dark reflective walls. Other modules' materials are unchanged.

All twelve revised groups pass finite-geometry checks. CF-15 and CF-17 expose `userData.envelopeHeight` for label/camera integration. Updated reference comparison renders are requested; these changes are not an exact-match acceptance claim.

## Occupied-facade and equipment refinement

Each invocation of the actual `wing()` builder records its local footprint, floor elevations and floor count. The new equipment pass uses those exact records, including raised and offset research wings. It does not place furniture relative to the entire facility bounding rectangle. Small booths receive only compact workstations. Equipment stays behind the front glazing; ceiling task lights have suspension rods reaching the actual ceiling.

The following modeled equipment is added to a separate named `CF-xx-program-equipment` group carrying `userData.nearDetail = true` for distance culling:

| Facilities | Fine visible equipment |
|---|---|
|13|Clinical couches on wheeled frames, drawer cabinets, compact analyzer enclosures, sample vials and task workstations|
|14|Paired interview chairs, privacy panels, tabletop recorder fixtures and consent/research screens|
|15|Treadmills with actual rails/consoles, recovery couches and instrument cabinets|
|16–17|Maker/materials benches, glazed small fabrication enclosures, material sample trays and drawers|
|18|Deployment workstations and stacked field cases with straps and handles|
|19|Legal workstations, bound file volumes and evidence drawer cabinets|
|20,24|Triple-screen operations consoles, equipment cabinets and status indicators|
|21|SCADA cabinets with control displays, small process pipes and handwheel valves|
|22|Visitor/dispatch workstations, paired displays, badge-reader fixtures and visitor chairs|
|23|Dining settings, upholstered lounge furniture and occasional tables|

Always-visible structural refinements include bronze floor sills, head reveals, steel frame detail, four-sided terrace glazing, bronze handrails and anchored balustrade posts. No shared/global material was modified.

CPU generation checks passed for all twelve variants with finite bounds. Combined architecture plus fine detail ranges from approximately 43,000 to 100,000 triangles per facility, below the specified 180,000 limit. Matched representative CF-13 and CF-21 before/after renders have been requested for visual inspection; this entry does not presume that their appearance has passed before those images are reviewed.

### Representative image inspection completed

Inspected `evidence/facility-detail-review/CF-13-comparison.jpg` and `CF-21-comparison.jpg` after the render agent asserted matched camera transforms. CF-13 now visibly contains work displays in the upper research wing and equipment along the lower frontage; CF-21 shows the added control cabinets/process fixtures within the glazed service wings. Terrace railings and bronze floor reveals are also visible. No obvious new detached furniture or out-of-footprint equipment was observed in these two views.

The gain is modest at whole-building scale: the architectural envelopes remain visually sparse compared with the densely furnished, illuminated original cutaways. These images validate added geometry placement and visibility, not exact source fidelity, photorealism, browser rendering, or physical-device performance. Small equipment is deliberately human scale rather than oversized to dominate an aerial view.

### Lazy fine-detail construction

`createFacility13to24(f, {deferDetails:false})` preserves eager construction by default for existing export/tests. With `deferDetails:true`, the root stores `userData.createNearDetail` and contains no fine-equipment geometry until that factory is called. The factory returns the same tagged detail group; callers own adding/caching/disposal. A separate factory scope captures only the numeric facility ID and copied lightweight wing records, not the original envelope Batch, root, or constructed geometries.

Verified all twelve variants: deferred roots initially contain no fine-detail child; factories return tagged groups; after adding factory results, eager/deferred triangle totals are identical. No intended visual change.
