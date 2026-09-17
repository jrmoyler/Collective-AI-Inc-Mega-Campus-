# Matched occupied-facade detail review

Six isolated runtime facilities (CF-01, 08, 13, 21, 27 and 34) are reviewed before and after the occupied-floor detail pass. BEFORE GLBs were snapshotted before this pass. Each AFTER view explicitly reuses the saved BEFORE camera location, rotation, orthographic scale and 900 × 650 resolution. Lighting, exposure, 16-sample Cycles rendering and denoising are unchanged.

These images test whether the added furnishings and equipment are visible and coherently assembled behind the actual facade, not just whether additional objects exist in code. Close-distance detail groups are included in the exported geometry. Blender does not exercise the browser camera-distance switching, transparency sorting or phone performance; separate runtime checks are still needed. No source image is used as a building surface and no numerical exact-match score is assigned.

`cameras-before.json` and `cameras-after.json` record identical view parameters. The comparison composer asserts their equality before generating each pair.

## Visible findings

The matched views show a real but modest increase in occupied detail at whole-building scale:

- CF-01: conference-suite tables, seating and wall displays, plus tower office rows, become visible through clearer glazing.
- CF-08: articulated industrial cells and safety enclosures populate previously sparse perimeter bays.
- CF-13: clinical/laboratory workstations and displays occupy the front floor bands; terrace handrails are now explicit.
- CF-21: controls, cabinets and process fittings are visible in the utility wings.
- CF-27: laboratory/process benches and external pipe/roof equipment clarify its industrial use; graphite signwall cladding breaks the uninterrupted glazed facade.
- CF-34: control-room detail and exterior transformer equipment strengthen its energy-building identity, with graphite facade cladding.

No obvious newly floating furniture, out-of-footprint equipment or clipping was observed in these six views. This does not establish that every room or all unseen viewpoints are correct. Envelopes remain much sparser than the source illustrations, and this pass does not satisfy an exact photorealistic-reference acceptance gate.

The CF-34 comparison was rendered again after its demonstration transformer row was moved from behind the lower facade onto the actual entrance apron. The final image visibly shows three cabinets and the service gantry outside the glass. This corrected a visibility issue found during review; no additional geometry was invented by the renderer.
