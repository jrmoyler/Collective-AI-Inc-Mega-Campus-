# CF-01–12 individual reference reconstruction

Source: original `05_Artwork/CF-XX_Facility_Infographic.png` files from the recovered 220-acre campus package. All twelve architectural views were inspected in three labelled contact sheets. Geometry lives in `viewer/campus/facilities-01-12.js`; original reference artwork is never rendered as scenery.

The atlas contains cutaway presentation illustrations, not complete construction drawings. Exterior footprints/placement remain the established campus envelopes. Hidden facades, material engineering, exact dimensions and joinery are inferred. Visible cutaway machinery is represented behind real glazed walls instead of leaving weather-exposed rooms. This is an individual reconstruction pass, **not evidence of pixel identity or photoreal acceptance**.

| Facility | Observed reference details | Implemented shell and physical details | Remaining uncertainty |
|---|---|---|---|
| CF-01 The Prism | Tall vertical glazed tower, sloped crown, circular roof oculus, three projecting suites, opaque lower branding pier | Twelve-bay-height curtain tower, asymmetric crown glass, circular glazed oculus/rail, exactly three furnished and braced projecting suites, podium and double doors | Sloped crown dimensions, oculus intersection and concealed core require camera comparison; facade logo remains common project signage |
| CF-02 Neural Block | Angular dark structural buttresses, stepped data-center levels, rooftop mission control, exposed rack halls/liquid cooling, water at plinth | Recessed glazed levels, two asymmetric buttress footprints, roof command pavilion, rack aisles, cooling risers and paired cascades | Reference cutaway obscures weather enclosure and actual rear servicing configuration |
| CF-03 The Vault | Small secure surface pavilion over extensive underground radial secure rooms | Two separately rounded glazed surface wings, raised central stone-framed entrance, rear cylindrical core collar, bronze facade fins, roof rails/planting and double-airlock approach | Underground cutaway belongs to interior/basement system; not falsely raised into a monumental surface bunker |
| CF-04 Royal Library / Hybrid Living Academy | Two glazed study/lecture wings around tall amber cylindrical knowledge core, lower entry volume, rooftop planting | Four-level wings, circular glazed atrium and amber core, stepped lecture benches, study tables, entry pavilion and photovoltaic gardens | Internal amber-core engineering and obscured library stacks inferred |
| CF-05 Nexus production complex | Two tall sound stages, large LED volume, gantries, lower editing and podcast/lounge spaces, rooftop solar | Split-height studio masses over glazed podium, LED surface behind glazing, repeated physical lighting gantries, lower furnished editing wing | Actual media playing on LED volume and studio equipment are illustrative, not copied into a billboard |
| CF-06 Signal Velocity | Three stepped levels, upper command theater, terrace planting, lower creator/conversion spaces | Receding three-tier building, glass terrace rails, desks on intermediate levels, rear command display, planted roof with solar | Screenshot reference is a cutaway; exact partition widths and unseen elevations unknown |
| CF-07 Binary Loom | Wide manufacturing volume, bronze vertical facade ribs, stepped upper print/electronics rooms, glazed prototype gallery | Ribbed industrial shell, stepped upper print wing, six shallow glazed roof monitors with pitched PV panels, HVAC louver cabinets, manufacturing equipment and lower glazed gallery | Equipment identity is inferred; no claim machines reproduce specific commercial products |
| CF-08 Animus Prime Titan Works | Tall high-bay works, repeating northlight roof folds, yellow bridge cranes, tall glazed industrial faces, robot production rows | Four folded northlight roof bays, full-height curtain hall, yellow crane runway/bridges/drop hooks, column grid, machinery rows, opaque brand pier | Detailed robots and gantry mechanisms need asset-level reconstruction; skylight alignment remains a visual-review gate |
| CF-09 Vector Hub | Rounded horseshoe upper logistics deck, many roof landing ports, central tower, docking bays beneath | Rounded lower hub, three-wing horseshoe rooftop volumes, twenty compact autonomous-drone roof ports, glazed central control tower, five docking openings | Twenty ports follow the explicit atlas count; hidden individual positions are inferred across the horseshoe wings rather than claimed surveyed |
| CF-10 Materials inventory warehouse | Large metal-clad warehouse, tall racked materials zone, row of receiving doors, smaller glazed entrance | Three opaque clad sides, large interior rack field, four receiving doors with joints/canopies/protective bollards, lower glazed reception and solar roof | Storage products and rear loading circulation are inferred |
| CF-11 Eden Spire | Tall glazed grow cylinders, pink grow-light ribbons, sinuous stacked observation decks, living facade | Two unequal grow cylinders with many crop/LED rings, observation terrace set-backs, planted rail edges, living facade, tanks on public science deck | Exact planting species and hydroponic internals inferred; dense vegetation needs visual and mobile performance assessment |
| CF-12 Vitality Center | Pale sinuous wings surrounding open planted court, three occupied levels, clinical equipment, DNA sculpture, roof gardens | Three-level rounded pale wings, upper glazed link, planted center, dimensional double-helix sculpture, clinical machinery, roof rails/solar/planting | Single image gives no surveyed room alignment; internal clinical fittings are inferred and must not imply certification |

## CPU verification

The dedicated test verifies all twelve finite merged assemblies, nonzero geometry, local coordinates, inherited facility picking IDs, distinct topology signatures, and bounded per-facility and combined triangle counts. No GPU rendering, shader compile, image comparison, or physical Galaxy A15 claim follows from those checks.

## Render-review correction

After inspecting `comparison-01-12.jpg` and re-opening both originals, CF-03 was split into curved side wings with a higher central secure entrance and recessed circular core collar. The prominent cylindrical vault shown below the cutaway ground line remains subterranean; it is not falsely raised to the surface. CF-07 received six shallow roof monitors, vertical glazed clerestories, pitched solar panels and louvered HVAC housings. These address the generic roofline in the first render; they do not constitute pixel-match acceptance.

## Occupied facade pass

All twelve shells now contain a separately merged `nearDetail` group. The campus controller can hide those fine parts at aerial distances without removing facade structures or distinctive rooflines. Added details follow individual source programs rather than repeating an office kit across every building:

- CF-01: six-seat cantilever conference tables, wall displays, alternating-level tower workstations; continuous projecting mullion reveals.
- CF-02: rack manifolds and cooling pipe runs, rooftop control displays and meeting table; buttress construction joints.
- CF-03: biometric lane gates, reception workstations and security displays inside the actual surface wings.
- CF-04: multilevel bookshelves with separate books/shelves and lecture seating; exposed amber-core vertical ribs.
- CF-05: physical camera tripods, camera bodies, podcast microphones and acoustic wall baffles; soundstage structural frames.
- CF-06: campaign review tables and multi-panel analytics walls on each distinct occupied tier.
- CF-07: enclosed 3D printers with build plates, gantries, heads and objects; ground-level prototype stations; deep bronze front facade fins.
- CF-08: six articulated industrial robot cells, grippers and safety cages positioned near visible perimeter bays, outside existing machine footprints; crane-hall roof bracing.
- CF-09: battery-swap cabinets in front docking bays and a staffed-scale tower workstation.
- CF-10: receiving roller conveyors, supported legs and pallet platforms behind dock openings.
- CF-11: irrigation manifolds, individual hydroponic pots and crop-analytics desks; living-wall attachment bands.
- CF-12: examination beds, service rails, bedside displays and clinical desks inside the three occupied levels; pale facade band reveals.

A locally cloned neutral architectural glazing material uses opacity .20, metalness .02 and roughness .11. Global campus materials remain unchanged. This avoids tinted, reflection-heavy glazing obscuring the actual floor and equipment geometry. Each facility remains below the dedicated CPU test's 160,000-triangle bound, including near details; combined shells and details remain below 400,000 triangles.

Matched CF-01 and CF-08 close-oblique renders are required for this pass. Blender evidence remains a geometry/material review, not browser-render or mobile-performance validation.

### Matched render inspection

Inspected the saved CF-01 and CF-08 before/after close-oblique pairs in `evidence/facility-detail-review/`. CF-01 now visibly exposes occupied tower desks, suite tables/chairs and display surfaces; warm projecting mullion lines improve facade depth. CF-08 now visibly exposes robotic cells and safety cages, with continuous crane-hall bracing. No obvious placement collision appeared in these views. The industrial machinery remains small against the canonical tall building envelope, and both results remain substantially less visually rich than the atlas. The pass improves occupied geometry but does **not** close exact-reference or photorealism gates.
