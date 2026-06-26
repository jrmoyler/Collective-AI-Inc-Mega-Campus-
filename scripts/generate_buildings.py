#!/usr/bin/env python3
"""
Generate individual building GLB files for the Collective AI Mega Campus.
Uses trimesh for geometry generation and GLB export.

Each building is exported as a standalone GLB centered at (0,0,0) in X-Y,
base at z=0.  The master campus scene script places buildings at their
correct campus coordinates.

Usage:
    python3 scripts/generate_buildings.py                  # all 30 buildings
    python3 scripts/generate_buildings.py --building <id>  # single building

Blender equivalent (reference only — Blender is not installed):
    import bpy
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB')
"""

import sys
import json
import argparse
import traceback
from pathlib import Path

# Ensure scripts/ is on the path so we can import utils
sys.path.insert(0, str(Path(__file__).parent))

import trimesh
import numpy as np
from utils.arch_helpers import create_building, MATERIALS

REPO = Path(__file__).parent.parent
DATA = REPO / "data" / "facilities.json"
OUT  = REPO / "assets" / "glb" / "buildings"


def main():
    parser = argparse.ArgumentParser(
        description="Generate building GLBs for the Collective AI Mega Campus."
    )
    parser.add_argument(
        "--building",
        default=None,
        help="Building id to generate (default: all buildings)",
    )
    args = parser.parse_args()

    # Ensure output directory exists
    OUT.mkdir(parents=True, exist_ok=True)

    # Load facility data
    with open(DATA) as fh:
        data = json.load(fh)

    facilities = data["facilities"]

    # Filter by --building if requested
    if args.building:
        facilities = [f for f in facilities if f["id"] == args.building]
        if not facilities:
            print(f"ERROR: No building with id '{args.building}' found.", file=sys.stderr)
            sys.exit(1)

    total = len(facilities)
    succeeded = []
    failed = []

    print(f"Generating {total} building(s) → {OUT}\n")

    for facility in facilities:
        fid   = facility["id"]
        fnum  = facility["number"]
        fname = facility["name"]
        ffam  = facility.get("arch_family", "?")
        print(f"  [{fnum:2d}/{total}] {fname}  ({ffam})")

        try:
            scene = create_building(facility, MATERIALS)

            # Validate: scene must have at least one geometry
            if len(scene.geometry) == 0:
                raise ValueError("Scene contains no geometry!")

            out_path = OUT / f"{fid}.glb"
            scene.export(str(out_path))
            size_kb = out_path.stat().st_size / 1024
            print(f"           → {out_path.name}  ({size_kb:.1f} KB)")
            succeeded.append(fid)

        except Exception as exc:
            print(f"           ERROR: {exc}")
            traceback.print_exc()
            failed.append((fid, str(exc)))

    # Summary
    print(f"\n{'='*60}")
    print(f"  Done: {len(succeeded)}/{total} buildings exported successfully.")

    if failed:
        print(f"\n  FAILED ({len(failed)}):")
        for fid, err in failed:
            print(f"    - {fid}: {err}")
        sys.exit(1)
    else:
        print(f"\n  All GLBs written to: {OUT}")


if __name__ == "__main__":
    main()
