#!/usr/bin/env python3
"""
Parse and validate the Collective AI Mega Campus facility program.
Regenerates data/facilities.json from the authoritative source data embedded below.
The original source is: Master Development Dossier v3 for the Collective AI Mega Campus

Usage: python3 scripts/parse_dossier.py [--validate] [--summary]
"""

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).parent.parent
DATA_FILE = REPO / "data" / "facilities.json"

# ---------------------------------------------------------------------------
# Authoritative source data (extracted from Master Development Dossier v3)
# ---------------------------------------------------------------------------
SOURCE_FACILITIES = [
    {"number": 1,  "name": "Prism Gateway HQ",                           "ft": (300, 150), "m": (91.4,  45.7),  "stories": 4, "gsf": 180000,  "district": "utility_data"},
    {"number": 2,  "name": "Neural Block Data Center",                   "ft": (720, 360), "m": (219.5, 109.7), "stories": 4, "gsf": 1036800, "district": "utility_data"},
    {"number": 3,  "name": "The Vault Archive",                          "ft": (180, 120), "m": (54.9,  36.6),  "stories": 3, "gsf": 64800,   "district": "utility_data"},
    {"number": 4,  "name": "Royal Library and Academy",                  "ft": (320, 170), "m": (97.5,  51.8),  "stories": 4, "gsf": 217600,  "district": "governance_knowledge"},
    {"number": 5,  "name": "Nexus Labs Media Studio",                    "ft": (250, 160), "m": (76.2,  48.8),  "stories": 3, "gsf": 120000,  "district": "governance_knowledge"},
    {"number": 6,  "name": "Animus Prime Robotics Factory",              "ft": (500, 200), "m": (152.4, 61.0),  "stories": 3, "gsf": 300000,  "district": "manufacturing_logistics"},
    {"number": 7,  "name": "Vector Shift Logistics Hub",                 "ft": (360, 180), "m": (109.7, 54.9),  "stories": 3, "gsf": 194400,  "district": "manufacturing_logistics"},
    {"number": 8,  "name": "Gaia Synthesis Vertical Farm",               "ft": (300, 200), "m": (91.4,  61.0),  "stories": 2, "gsf": 120000,  "district": "bioenergy_farm_lifescience"},
    {"number": 9,  "name": "Vital Helix Bio-Research Lab",               "ft": (280, 180), "m": (85.3,  54.9),  "stories": 3, "gsf": 151200,  "district": "bioenergy_farm_lifescience"},
    {"number": 10, "name": "Civic Core",                                 "ft": (220, 140), "m": (67.1,  42.7),  "stories": 3, "gsf": 92400,   "district": "public_wellness"},
    {"number": 11, "name": "Kinetic Edge Wellness Center",               "ft": (320, 220), "m": (97.5,  67.1),  "stories": 2, "gsf": 140800,  "district": "public_wellness"},
    {"number": 12, "name": "Observatory and Sky Deck",                   "ft": (160, 100), "m": (48.8,  30.5),  "stories": 2, "gsf": 32000,   "district": "public_wellness"},
    {"number": 13, "name": "Forge Materials Lab",                        "ft": (300, 180), "m": (91.4,  54.9),  "stories": 2, "gsf": 108000,  "district": "public_wellness"},
    {"number": 14, "name": "Aether Link Tower",                          "ft": (120, 120), "m": (36.6,  36.6),  "stories": 4, "gsf": 57600,   "district": "public_wellness"},
    {"number": 15, "name": "Habitat Eco-Residential Commons",            "ft": (350, 230), "m": (106.7, 70.1),  "stories": 4, "gsf": 322000,  "district": "visitor_hotel_mobility_residential"},
    {"number": 16, "name": "Nexus Transportation Hub",                   "ft": (350, 180), "m": (106.7, 54.9),  "stories": 2, "gsf": 126000,  "district": "visitor_hotel_mobility_residential"},
    {"number": 17, "name": "Sentinel Security Command",                  "ft": (250, 150), "m": (76.2,  45.7),  "stories": 2, "gsf": 75000,   "district": "manufacturing_logistics"},
    {"number": 18, "name": "Foundry Manufacturing District",             "ft": (500, 300), "m": (152.4, 91.4),  "stories": 3, "gsf": 450000,  "district": "manufacturing_logistics"},
    {"number": 19, "name": "Juris Guard Center",                         "ft": (220, 110), "m": (67.1,  33.5),  "stories": 3, "gsf": 72600,   "district": "governance_knowledge"},
    {"number": 20, "name": "Cognara Mind Institute",                     "ft": (250, 130), "m": (76.2,  39.6),  "stories": 3, "gsf": 97500,   "district": "governance_knowledge"},
    {"number": 21, "name": "Signal Velocity Center",                     "ft": (200, 120), "m": (61.0,  36.6),  "stories": 3, "gsf": 72000,   "district": "governance_knowledge"},
    {"number": 22, "name": "Eon Core Systems House",                     "ft": (220, 130), "m": (67.1,  39.6),  "stories": 3, "gsf": 85800,   "district": "governance_knowledge"},
    {"number": 23, "name": "Nomad Nexus Mobility Lab",                   "ft": (220, 120), "m": (67.1,  36.6),  "stories": 3, "gsf": 79200,   "district": "manufacturing_logistics"},
    {"number": 24, "name": "Kinetic Energy Operations Center",           "ft": (200, 150), "m": (61.0,  45.7),  "stories": 2, "gsf": 60000,   "district": "bioenergy_farm_lifescience"},
    {"number": 25, "name": "Gaia Synthesis Bio-Energy Center",           "ft": (260, 200), "m": (79.2,  61.0),  "stories": 2, "gsf": 104000,  "district": "bioenergy_farm_lifescience"},
    {"number": 26, "name": "Central Utility Plant",                      "ft": (220, 150), "m": (67.1,  45.7),  "stories": 2, "gsf": 66000,   "district": "utility_data"},
    {"number": 27, "name": "Emergency Operations Center",                "ft": (200, 120), "m": (61.0,  36.6),  "stories": 2, "gsf": 48000,   "district": "utility_data"},
    {"number": 28, "name": "Construction Innovation Yard",               "ft": (400, 250), "m": (121.9, 76.2),  "stories": 1, "gsf": 100000,  "district": "manufacturing_logistics"},
    {"number": 29, "name": "Visitor and Experience Center",              "ft": (220, 120), "m": (67.1,  36.6),  "stories": 2, "gsf": 52800,   "district": "visitor_hotel_mobility_residential"},
    {"number": 30, "name": "Grand Conference Hotel and Innovation Center","ft": (420, 160), "m": (128.0, 48.8),  "stories": 4, "gsf": 268800,  "district": "visitor_hotel_mobility_residential"},
]

DISTRICT_LABELS = {
    "utility_data":                       "Utility and Data",
    "governance_knowledge":               "Governance and Knowledge",
    "public_wellness":                    "Public and Wellness",
    "manufacturing_logistics":            "Manufacturing and Logistics",
    "bioenergy_farm_lifescience":         "Bioenergy, Farm, and Life-Science",
    "visitor_hotel_mobility_residential": "Visitor, Hotel, Mobility, and Residential",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def footprint_sf(m_tuple):
    """Convert metre footprint tuple to square feet."""
    return round(m_tuple[0] * m_tuple[1] * 10.7639)


def summarise_districts(facilities):
    districts = {}
    for f in facilities:
        d = f["district"]
        if d not in districts:
            districts[d] = {"count": 0, "total_gsf": 0, "total_footprint_sf": 0}
        districts[d]["count"] += 1
        districts[d]["total_gsf"] += f["gsf"]
        districts[d]["total_footprint_sf"] += footprint_sf(f["m"])
    return districts


def print_facility_table(facilities):
    header = f"{'#':>3}  {'Building':<42} {'Footprint (m)':<18} {'Stories':>7} {'GFA (sf)':>12}"
    print(header)
    print("-" * len(header))
    for f in facilities:
        w, d = f["m"]
        fp = f"{w} x {d}"
        print(f"{f['number']:>3}  {f['name']:<42} {fp:<18} {f['stories']:>7} {f['gsf']:>12,}")
    print("-" * len(header))
    total_gsf = sum(f["gsf"] for f in facilities)
    print(f"{'':>3}  {'TOTAL (30 buildings)':<42} {'':18} {'':>7} {total_gsf:>12,}")


def print_district_summary(facilities):
    districts = summarise_districts(facilities)
    print(f"\n{'District':<45} {'Buildings':>9} {'Total GFA (sf)':>15} {'Footprint (sf)':>15}")
    print("-" * 88)
    for d_id, stats in districts.items():
        label = DISTRICT_LABELS.get(d_id, d_id)
        print(
            f"{label:<45} {stats['count']:>9} "
            f"{stats['total_gsf']:>15,} {stats['total_footprint_sf']:>15,}"
        )
    print("-" * 88)
    print(
        f"{'CAMPUS TOTAL':<45} {sum(s['count'] for s in districts.values()):>9} "
        f"{sum(s['total_gsf'] for s in districts.values()):>15,} "
        f"{sum(s['total_footprint_sf'] for s in districts.values()):>15,}"
    )


def print_campus_statistics(facilities):
    total_gsf = sum(f["gsf"] for f in facilities)
    total_fp_sf = sum(footprint_sf(f["m"]) for f in facilities)
    total_fp_m2 = sum(f["m"][0] * f["m"][1] for f in facilities)
    avg_stories = sum(f["stories"] for f in facilities) / len(facilities)
    max_bldg = max(facilities, key=lambda x: x["gsf"])
    min_bldg = min(facilities, key=lambda x: x["gsf"])

    print("\n" + "=" * 55)
    print("  COLLECTIVE AI MEGA CAMPUS — FACILITY STATISTICS")
    print("=" * 55)
    print(f"  Total buildings        : {len(facilities)}")
    print(f"  Total campus GFA       : {total_gsf:>12,} sf")
    print(f"  Total building coverage: {total_fp_sf:>12,} sf")
    print(f"  Total building coverage: {total_fp_m2:>12,.0f} m2")
    print(f"  Average stories        : {avg_stories:>12.1f}")
    print(f"  Largest building       : {max_bldg['name']} ({max_bldg['gsf']:,} sf)")
    print(f"  Smallest building      : {min_bldg['name']} ({min_bldg['gsf']:,} sf)")
    print("=" * 55)


# ---------------------------------------------------------------------------
# Validate against existing JSON
# ---------------------------------------------------------------------------

def validate_against_json(facilities_json_path, source):
    try:
        with open(facilities_json_path) as fh:
            data = json.load(fh)
    except FileNotFoundError:
        print(f"ERROR: {facilities_json_path} not found. Run without --validate to generate it.")
        return False
    except json.JSONDecodeError as exc:
        print(f"ERROR: JSON parse error in {facilities_json_path}: {exc}")
        return False

    json_facilities = data.get("facilities", [])
    if len(json_facilities) != len(source):
        print(f"MISMATCH: JSON has {len(json_facilities)} facilities, source has {len(source)}")
        return False

    errors = []
    for src in source:
        match = next((f for f in json_facilities if f["number"] == src["number"]), None)
        if match is None:
            errors.append(f"Building #{src['number']} ({src['name']}) missing from JSON")
            continue
        # Check key fields
        if match["name"] != src["name"]:
            errors.append(f"#{src['number']} name: JSON='{match['name']}' src='{src['name']}'")
        if match["stories"] != src["stories"]:
            errors.append(f"#{src['number']} stories: JSON={match['stories']} src={src['stories']}")
        if match["gross_area_sf"] != src["gsf"]:
            errors.append(f"#{src['number']} gsf: JSON={match['gross_area_sf']} src={src['gsf']}")
        json_fp = tuple(match.get("footprint_m", []))
        src_fp  = src["m"]
        if abs(json_fp[0] - src_fp[0]) > 0.2 or abs(json_fp[1] - src_fp[1]) > 0.2:
            errors.append(f"#{src['number']} footprint_m: JSON={json_fp} src={src_fp}")

    if errors:
        print(f"VALIDATION FAILED — {len(errors)} discrepancies:")
        for e in errors:
            print(f"  - {e}")
        return False

    print(f"VALIDATION PASSED — all {len(source)} facilities match source data.")
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Parse and validate the Mega Campus dossier data.")
    parser.add_argument("--validate", action="store_true",
                        help="Validate existing facilities.json against embedded source data")
    parser.add_argument("--summary",  action="store_true",
                        help="Print campus statistics and district summary table")
    args = parser.parse_args()

    # Always print the facility table
    print("\nCOLLECTIVE AI MEGA CAMPUS — FACILITY PROGRAM (30 Buildings)")
    print("=" * 89)
    print_facility_table(SOURCE_FACILITIES)

    if args.summary:
        print("\nDISTRICT SUMMARY")
        print_district_summary(SOURCE_FACILITIES)
        print_campus_statistics(SOURCE_FACILITIES)

    if args.validate:
        print(f"\nValidating against {DATA_FILE} ...")
        ok = validate_against_json(DATA_FILE, SOURCE_FACILITIES)
        sys.exit(0 if ok else 1)

    print("\nDone. (Use --validate to check existing JSON; --summary for district stats.)")


if __name__ == "__main__":
    main()
