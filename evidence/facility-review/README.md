# Individual facility visual review

The comparison sheets pair isolated **actual runtime facility meshes** with their original CF-01–35 infographics. The exporter calls the same `createFacility` entry point used by the campus viewer. Each view centers its model without changing its dimensions or shape. Source reference art is shown only in the comparison sheet, never applied to model geometry.

These are 400 × 300, four-sample, denoised Blender Cycles renders for checking silhouette, assembly, distinguishing features and geometry completeness. Cycles lighting, reflections, transparency and tone mapping differ from the WebGL renderer. Aerial landscaping, activity, interiors, neighboring facilities and device performance are outside this isolated check. No numerical fidelity or photorealism score is inferred.

`geometry-manifest.json` records the exported source, finite vertex counts and bounds for all reviewed facilities. The original infographics mix perspectives and contain unresolved dimensional/program inconsistencies; mapped architecture remains a reference-guided interpretation, not an as-built reconstruction.

Reproduction:

```sh
node scripts/export_facility_review.mjs
blender --background --threads 8 --python scripts/render_facility_review.py
CAMPUS_REFERENCE_ARTWORK=/path/to/05_Artwork python scripts/build_facility_review_sheet.py
```

## Review feedback and reconstruction follow-up

The initial sheets exposed weak CF-03 central/courtyard massing, CF-07 roof clerestories, CF-15 occupied-building height, and CF-35 linked-wing hierarchy. Those findings led to another reconstruction pass and refreshed exports. CF-25's covered living atrium and CF-26's blocked clerestory were also opened in actual geometry. The 13–24 range received additional massing, terrace and neutral glazing refinements before its final rerender.

The initial contact-scale observation that occupied floors were absent was too broad. Inspection of the exported geometry and a closer CF-13 render establishes that floorplates, supporting cores, desk/chair rows and perimeter lights do exist behind glazing. The final CF-13 glTF material has alpha mode `BLEND`, opacity `0.20`, and neutral glazing color; transparency is not being silently exported as an opaque wall. `CF-13-glazing-detail.jpg` uses a lower view angle, 1200 × 900 pixels and 32 samples to check this separately from the small contact views.

The remaining distinction is between sparse architectural furnishing visible through real facades and the reference art's highly exposed, densely populated illuminated cutaways. The latter has not been reproduced exactly. Browser compositing and visibility may also differ from these Cycles results. No source-image background, billboard or missing-roof visual shortcut is used to claim reference equivalence.

The final CF-13 detail view was rerendered after its sweeping ribs were connected to collector beams on the upper pavilion and lower garden-wing roofs. Their previously unsupported upper endpoints are no longer present in the reviewed geometry. The close view still confirms visible floor slabs and furnishings behind transparent glazing.
