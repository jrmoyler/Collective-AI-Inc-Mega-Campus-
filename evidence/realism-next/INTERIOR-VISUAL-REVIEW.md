# Interior visual review — September 17, 2026

Two views use freshly exported runtime geometry, rendered in Blender 4.5.3 Cycles at 1440 × 960, 20 samples with denoising:

- `interior-4-room-5.jpg`: CF-04 ground-floor lecture hall. Fixed upholstered audience seats have individual wood arms, sculpted backs, pedestal anchors and a central aisle. The visible lecture-hall seating in the recovered CF-04 infographic informed this change.
- `interior-30-room-2.jpg`: CF-30 ground-floor identity operations. Workstations show task lamps, fabric mats, notebooks, pens, cup rims, keyboards, softened desk edges and caster assemblies.

The first review exposed inherited oak wall panels floating over exterior glazing. They were relocated to the solid side partitions. Presentation displays now have explicit floor-supported mounts. The final images reflect these fixes.

Albedo painting and material UV scale follow the interactive implementation. These are offline architectural geometry/material checks: Cycles lights, shadows and AgX differ from Babylon; runtime tangent-space micro-normal maps are not exported. These images do not establish browser rendering equivalence, physical-device performance or exact reference matching. Hidden rooms still use inferred furnishings, and exterior context beyond the tour glazing remains simplified.

Reproduce:

```sh
node scripts/export_interior_review.mjs 4
CAMPUS_REVIEW_OUTPUT=evidence/realism-next CAMPUS_REVIEW_VIEWS=room-5 blender --background --python scripts/render_interior_review.py -- 4
node scripts/export_interior_review.mjs 30
CAMPUS_REVIEW_OUTPUT=evidence/realism-next CAMPUS_REVIEW_VIEWS=room-2 blender --background --python scripts/render_interior_review.py -- 30
```
