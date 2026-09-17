> Later PR13 continuation: the universal two-bank layout and 3.9m enclosure described below have been replaced. See [current topology evidence](../evidence/topology-pass/README.md). This document preserves the earlier acceptance/rejection history.

# Program-driven interior finishing pass

Status: geometry and headless runtime regression verified; exact-reference and browser visual acceptance remain open.

The canonical register remains 35 facilities, 74 floors and 444 ordered room programs. Building width/depth, support cores, 12-foot central circulation, and CF-24/25 area uncertainty are unchanged. Room area allocation is an **inferred fit-out**, not a revision to surveyed architecture: stage/data/assembly rooms receive greater bay width than support/intake/storage; all six source labels remain in order. The same geometry feeds the schematic plan and Babylon tour.

The prior equal-bay office shell repeated across every floor. The updated geometry uses use-specific bay widths; opaque confidential partitions; exposed technical ducts/cable ladders; reading-room acoustic fins; office acoustic rafts; and room-specific flooring. Office programs now select control consoles, executive/visitor areas, consultation, shared project model tables, reading carrels, laboratory benches/fume hood, perimeter service desks, or team desks from their actual function. No random seed supplies this differentiation.

Additional modeled domain equipment includes LED production volume and motion capture trusses/cameras, Faraday chamber, credential/evidence lockers and scanner, acoustic behavior booths, supported aerospace fuselage, warehouse racks/pallets, algae photobioreactors, accessible domestic sleeping/living/kitchen/shower zones, sewing/cutting machinery, and instrumented testing lanes. CF-05 source infographic was inspected directly; the LED stage platform uses the stated 40×60-foot footprint where the schematic room allows. Scene equipment uses existing shared physical material definitions and bounded indexed geometry.

Verification:
- 74 floor geometry signatures use actual position buffers, excluding IDs, labels, finish colors and metadata; no duplicated whole-floor geometry.
- 444 guided centerline arrival rays tested at visitor eye level, with no obstruction.
- Maximum measured floor geometry approximately 29.1 MiB, below existing 96 MiB gate.
- All 74 Babylon floor scenes constructed/disposed in NullEngine in the integrated regression run after the domain-equipment pass.
- Selected domain assemblies have explicit geometry-presence regression checks.

Limits: the tour still uses the canonical schematic six-room, two-bank circulation topology and a 3.9m enclosure, rather than recovering every hidden wall or double-height studio from the artwork. Shared manufactured fixtures (chairs, cabinets, service components) remain physically repeated; this pass does not claim every room is individually reconstructed, nor that unique hashes prove visual quality. Interior people, custom source-specific furniture for every program, full material/reference comparisons, browser GPU appearance, and physical Galaxy A15 performance remain acceptance work. Source artwork is conceptual and inconsistent with some floor schedules, not an as-built survey.
