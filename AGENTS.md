# AGENTS.md

## Cursor Cloud specific instructions

### What this project is
A Python 3D rendering pipeline for the "Collective AI Mega Campus" master plan. It
reads `data/facilities.json` and produces (1) per-building + master-scene `.glb`
assets and (2) four presentation PNG renders via a custom matplotlib/numpy
rasterizer. There is no web server, database, or long-running service — every
"run" is a one-shot CLI invocation. There is no automated test or lint suite.

### Python environment (important)
- Dependencies are installed into a virtualenv at `.venv/` (the system Python on
  this image is externally-managed/PEP 668, so a venv is required). The update
  script creates `.venv/` and installs `numpy matplotlib trimesh scipy pygltflib`.
- Run scripts with the venv interpreter directly, e.g.
  `.venv/bin/python scripts/render_scene.py --view all`.
- GOTCHA: `scripts/run_pipeline.sh` invokes bare `python3` (not the venv), so it
  fails with "numpy/matplotlib not installed" unless the venv is on PATH. Run it
  as `source .venv/bin/activate && bash scripts/run_pipeline.sh` (or `--renders`
  to skip the GLB steps).

### Commands (see README.md "Quick Start" for full reference)
- Validate data + stats: `.venv/bin/python scripts/parse_dossier.py --validate --summary`
- Generate 30 building GLBs: `.venv/bin/python scripts/generate_buildings.py`
- Assemble master scene GLB: `.venv/bin/python scripts/build_master_scene.py`
- Render 4 views (PNGs to `renders/`): `.venv/bin/python scripts/render_scene.py --view all`
- Full pipeline: `source .venv/bin/activate && bash scripts/run_pipeline.sh`

### Notes
- `trimesh`/`scipy`/`pygltflib` are only needed for the GLB steps; the pipeline
  auto-skips those steps if `trimesh` is missing. They are installed by default.
- Blender is NOT installed and is optional — only the `--blender` render path needs
  it. The default matplotlib renderer needs no Blender/GPU/display.
- `scripts/build_master_scene.py` places trees with randomization, so the output
  `assets/glb/site/collective-ai-mega-campus.glb` is non-deterministic and will
  show as modified after a run; the PNG renders are deterministic. Avoid committing
  regenerated binary outputs unless that is the intent.
