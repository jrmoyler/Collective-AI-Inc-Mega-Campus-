#!/bin/bash
# ==============================================================================
#  Collective AI Mega Campus — Full Pipeline Runner
#  Runs all generation steps in sequence.
#
#  Usage:
#    ./scripts/run_pipeline.sh            # Run all steps
#    ./scripts/run_pipeline.sh --renders  # Render images only (skip GLB steps)
# ==============================================================================
set -e

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

# Colour helpers
RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
BLU='\033[0;34m'
NC='\033[0m'

RENDERS_ONLY=false
[[ "${1:-}" == "--renders" ]] && RENDERS_ONLY=true

echo -e "${BLU}"
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║    COLLECTIVE AI MEGA CAMPUS — PIPELINE RUNNER       ║"
echo "  ║    Northeast Columbus Growth Corridor, Ohio, USA      ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Dependency check
echo -e "${YLW}Checking Python dependencies...${NC}"
python3 -c "import numpy, matplotlib" 2>/dev/null \
    || { echo -e "${RED}ERROR: numpy/matplotlib not installed. Run: pip install numpy matplotlib${NC}"; exit 1; }
python3 -c "import trimesh" 2>/dev/null \
    && echo -e "  ${GRN}trimesh    : OK${NC}" \
    || echo -e "  ${YLW}trimesh    : NOT FOUND (GLB steps will be skipped)${NC}"
python3 -c "import numpy"    && echo -e "  ${GRN}numpy      : OK${NC}"
python3 -c "import matplotlib" && echo -e "  ${GRN}matplotlib : OK${NC}"
echo ""

# ─── Step 1: Validate facility data ────────────────────────────────────────
echo -e "${BLU}Step 1/4: Validating facility data...${NC}"
if python3 scripts/parse_dossier.py --validate --summary; then
    echo -e "${GRN}  Data validation passed.${NC}"
else
    echo -e "${RED}  Data validation failed. Check data/facilities.json.${NC}"
    exit 1
fi
echo ""

if $RENDERS_ONLY; then
    echo -e "${YLW}--renders flag set: skipping GLB generation steps.${NC}"
    echo ""
else
    # ─── Step 2: Generate individual building GLBs ──────────────────────────
    echo -e "${BLU}Step 2/4: Generating 30 individual building GLBs...${NC}"
    if python3 -c "import trimesh" 2>/dev/null; then
        python3 scripts/generate_buildings.py \
            && echo -e "${GRN}  Building GLBs generated.${NC}" \
            || echo -e "${RED}  generate_buildings.py failed.${NC}"
    else
        echo -e "${YLW}  Skipping: trimesh not installed.${NC}"
    fi
    echo ""

    # ─── Step 3: Assemble master campus scene ──────────────────────────────
    echo -e "${BLU}Step 3/4: Assembling master campus scene...${NC}"
    if python3 -c "import trimesh" 2>/dev/null; then
        python3 scripts/build_master_scene.py \
            && echo -e "${GRN}  Master scene assembled.${NC}" \
            || echo -e "${RED}  build_master_scene.py failed.${NC}"
    else
        echo -e "${YLW}  Skipping: trimesh not installed.${NC}"
    fi
    echo ""
fi

# ─── Step 4: Render campus images ──────────────────────────────────────────
echo -e "${BLU}Step 4/4: Rendering campus images (4 views)...${NC}"
python3 scripts/render_scene.py --view all
echo -e "${GRN}  Renders complete.${NC}"
echo ""

# ─── Summary ───────────────────────────────────────────────────────────────
echo -e "${BLU}══════════════════════════════════════════════════════${NC}"
echo -e "${GRN}  Pipeline Complete!${NC}"
echo -e "${BLU}══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${YLW}Outputs:${NC}"

if ! $RENDERS_ONLY && python3 -c "import trimesh" 2>/dev/null; then
    GLB_DIR="$REPO/assets/glb/buildings"
    SITE_GLB="$REPO/assets/glb/site/collective-ai-mega-campus.glb"
    echo -e "  Building GLBs  : ${GLB_DIR}/"
    [[ -d "$GLB_DIR" ]] && echo -e "                   $(ls "$GLB_DIR"/*.glb 2>/dev/null | wc -l) files"
    echo -e "  Campus GLB     : ${SITE_GLB}"
fi

RENDERS_DIR="$REPO/renders"
echo -e "  Renders        : ${RENDERS_DIR}/"
for img in hero_view.png dusk_render.png district_overview.png ground_level.png; do
    imgpath="$RENDERS_DIR/$img"
    if [[ -f "$imgpath" ]]; then
        sz=$(du -h "$imgpath" | cut -f1)
        echo -e "                   ${GRN}${img}${NC} (${sz})"
    else
        echo -e "                   ${RED}${img} MISSING${NC}"
    fi
done
echo ""
