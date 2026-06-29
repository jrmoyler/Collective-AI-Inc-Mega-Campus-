/**
 * buildings.js — Material enhancement layer for the Collective AI Mega Campus viewer.
 *
 * Single self-contained ES module. THREE is dependency-injected (do NOT import three).
 *
 * Walks the loaded GLB scene graph, matches every mesh to a facility by id, assigns
 * each facility an "architectural family", and upgrades materials to family-specific
 * MeshStandardMaterials (palette + metalness/roughness + emissive window glow). Also
 * gives sensible PBR to baked environment meshes (roads/water/trees/terrain/solar...).
 *
 * Returns a controller: { setDayNight(isNight), update(dt, elapsed), dispose() }.
 *
 * @param {object} THREE          - injected three namespace
 * @param {object} campusRoot     - loaded GLB scene (THREE.Object3D)
 * @param {Array}  facilities     - [{ id, number, name, district, height_m, stories, footprint_m, arch_notes }]
 * @param {object} districtColors - district id -> { hex, css }
 * @param {object} [options]
 */
export function enhanceBuildings(THREE, campusRoot, facilities, districtColors, options = {}) {
  const opts = Object.assign(
    {
      nightGlowMax: 0.85,   // peak emissiveIntensity at night for windows
      dayGlow: 0.0,         // emissiveIntensity during day
      flicker: true,        // subtle emissive pulse in update()
      envEmissive: true,    // faint emissive edges on hex/marker env meshes
    },
    options || {}
  );

  facilities = Array.isArray(facilities) ? facilities : [];
  districtColors = districtColors || {};

  // ──────────────────────────────────────────────────────────────────────────
  // PMREM environment — a procedural gradient "room" scene baked to a prefiltered
  // env map so metal/glass materials get believable reflections without an HDRI.
  // Exposed on the returned object as `.envMap`. Applied to every created material.
  // ──────────────────────────────────────────────────────────────────────────
  let pmremGen = null;
  let envMap = null;
  let envSourceTex = null; // the pre-PMREM equirect gradient (disposed if PMREM ran)

  // Procedural equirectangular sky/room gradient → canvas → texture. Bright cool
  // sky up top, warm horizon band, dark ground below, with a soft sun lobe.
  function makeEnvEquirect() {
    if (typeof document === 'undefined' || !document.createElement) return null;
    const w = 512, h = 256;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    // vertical gradient: top (zenith) -> horizon -> bottom (nadir)
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.0, '#9fc3ee');   // zenith sky
    grad.addColorStop(0.45, '#cfe2f2');  // upper haze
    grad.addColorStop(0.52, '#f2ecd8');  // horizon warm
    grad.addColorStop(0.60, '#6a7079');  // ground start
    grad.addColorStop(1.0, '#2a2e34');   // nadir
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // soft sun lobe (NW, above horizon)
    const sx = w * 0.32, sy = h * 0.30;
    const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.22);
    sun.addColorStop(0, 'rgba(255,248,225,0.95)');
    sun.addColorStop(0.4, 'rgba(255,236,196,0.35)');
    sun.addColorStop(1, 'rgba(255,236,196,0.0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function buildEnvMap() {
    envSourceTex = makeEnvEquirect();
    if (!envSourceTex) return null;
    createdTextures.push(envSourceTex);
    // If a renderer is available, prefilter with PMREM for correct roughness
    // response; otherwise fall back to the raw equirect reflection map.
    if (opts.renderer && typeof THREE.PMREMGenerator === 'function') {
      try {
        pmremGen = new THREE.PMREMGenerator(opts.renderer);
        const rt = pmremGen.fromEquirectangular(envSourceTex);
        envMap = rt.texture;
        return envMap;
      } catch (e) {
        try { if (pmremGen) pmremGen.dispose(); } catch (_) {}
        pmremGen = null;
      }
    }
    envMap = envSourceTex;
    return envMap;
  }
  buildEnvMap();

  // Apply env reflections (and a sensible intensity) to a created material.
  function applyEnv(mat, intensity) {
    if (!envMap) return;
    mat.envMap = envMap;
    mat.envMapIntensity = intensity != null ? intensity : 1.0;
    mat.needsUpdate = true;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Architectural family definitions. emissive = night window glow color.
  // dayI / nightI are the emissiveIntensity day/night targets.
  // ──────────────────────────────────────────────────────────────────────────
  const FAMILIES = {
    DATA_BUNKER: {
      color: 0x1a1f26, metalness: 0.7, roughness: 0.5,
      glow: 0x223040, dayI: 0.0, nightI: 0.18, windows: false, blend: 0.7,
    },
    CORPORATE_TOWER: {
      color: 0xcdd8e6, metalness: 0.9, roughness: 0.15,
      glow: 0x33d6ff, dayI: 0.0, nightI: 0.9, windows: true, glass: 0x9fc4e8, blend: 0.6,
    },
    CIVIC_CULTURAL: {
      color: 0xe8e0cf, metalness: 0.1, roughness: 0.8,
      glow: 0xffd9a0, dayI: 0.0, nightI: 0.6, windows: true, blend: 0.6,
    },
    LIFE_SCIENCE_FARM: {
      color: 0x2fbf5a, metalness: 0.25, roughness: 0.3,
      glow: 0x39ff7a, dayI: 0.05, nightI: 0.85, windows: true, glass: 0x2fbf5a, blend: 0.65,
    },
    LIFE_SCIENCE_LAB: {
      color: 0xf4f6f8, metalness: 0.2, roughness: 0.45,
      glow: 0xaaffcc, dayI: 0.0, nightI: 0.5, windows: true, blend: 0.6,
    },
    INDUSTRIAL: {
      color: 0x8a8f96, metalness: 0.4, roughness: 0.85,
      glow: 0xff7a33, dayI: 0.0, nightI: 0.3, windows: false, accent: 0x8a4a2a, blend: 0.6,
    },
    WELLNESS_RECREATION: {
      color: 0xeef2f5, metalness: 0.3, roughness: 0.3,
      glow: 0xcfeaff, dayI: 0.0, nightI: 0.55, windows: true, glass: 0xbfe0f0, blend: 0.55,
    },
    MIXED_USE: {
      color: 0xc87850, metalness: 0.2, roughness: 0.6,
      glow: 0xffc070, dayI: 0.0, nightI: 0.65, windows: true, blend: 0.55,
    },
    TRANSPORT: {
      color: 0xc4ccd6, metalness: 0.7, roughness: 0.3,
      glow: 0xbfe2ff, dayI: 0.0, nightI: 0.6, windows: true, glass: 0xaaccdd, blend: 0.6,
    },
    RESEARCH: {
      color: 0xb9c2cc, metalness: 0.65, roughness: 0.35,
      glow: 0x33ccff, dayI: 0.0, nightI: 0.7, windows: true, glass: 0x223038, blend: 0.6,
    },
    SECURITY: {
      color: 0x303336, metalness: 0.55, roughness: 0.6,
      glow: 0x4488aa, dayI: 0.0, nightI: 0.15, windows: false, blend: 0.7,
    },
    DEFAULT: {
      color: 0x6a7686, metalness: 0.45, roughness: 0.55,
      glow: 0x99bbee, dayI: 0.0, nightI: 0.4, windows: true, blend: 0.45, useDistrict: true,
    },
  };

  // facility id -> family key
  const ID_TO_FAMILY = {
    // DATA_BUNKER
    neural_block_data_center: 'DATA_BUNKER',
    vault_archive: 'DATA_BUNKER',
    central_utility_plant: 'DATA_BUNKER',
    emergency_operations_center: 'DATA_BUNKER',
    // CORPORATE_TOWER
    prism_gateway_hq: 'CORPORATE_TOWER',
    aether_link_tower: 'CORPORATE_TOWER',
    // CIVIC_CULTURAL
    royal_library_academy: 'CIVIC_CULTURAL',
    civic_core: 'CIVIC_CULTURAL',
    juris_guard_center: 'CIVIC_CULTURAL',
    visitor_experience_center: 'CIVIC_CULTURAL',
    // LIFE_SCIENCE (farm = green, labs = white)
    gaia_synthesis_vertical_farm: 'LIFE_SCIENCE_FARM',
    gaia_synthesis_bio_energy_center: 'LIFE_SCIENCE_FARM',
    vital_helix_bio_research_lab: 'LIFE_SCIENCE_LAB',
    // INDUSTRIAL
    animus_prime_robotics_factory: 'INDUSTRIAL',
    vector_shift_logistics_hub: 'INDUSTRIAL',
    foundry_manufacturing_district: 'INDUSTRIAL',
    construction_innovation_yard: 'INDUSTRIAL',
    // WELLNESS_RECREATION
    kinetic_edge_wellness_center: 'WELLNESS_RECREATION',
    observatory_sky_deck: 'WELLNESS_RECREATION',
    // MIXED_USE
    habitat_eco_residential_commons: 'MIXED_USE',
    grand_conference_hotel: 'MIXED_USE',
    // TRANSPORT
    nexus_transportation_hub: 'TRANSPORT',
    nomad_nexus_mobility_lab: 'TRANSPORT',
    // RESEARCH
    nexus_labs_media_studio: 'RESEARCH',
    forge_materials_lab: 'RESEARCH',
    cognara_mind_institute: 'RESEARCH',
    signal_velocity_center: 'RESEARCH',
    eon_core_systems_house: 'RESEARCH',
    // SECURITY
    sentinel_security_command: 'SECURITY',
    // (kinetic_energy_operations_center falls through to DEFAULT/district)
  };

  // Track everything we create so dispose() can clean up & setDayNight() can drive it.
  // Each entry: { mat, dayI, nightI, base, flickerPhase, isWindow }
  const tracked = [];
  const createdMaterials = []; // for disposal
  const createdTextures = [];  // for disposal
  const replacedMeshes = [];   // { mesh, originalMaterial } so dispose can restore

  let isNight = false;

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────
  const norm = (s) => (s || '').toLowerCase().replace(/[_\s]/g, '');

  function ancestorMatchesId(mesh, idNorm) {
    let node = mesh;
    let guard = 0;
    while (node && guard++ < 32) {
      if (node.name && norm(node.name).includes(idNorm)) return true;
      node = node.parent;
    }
    return false;
  }

  // Pre-normalize facility ids, longest-first so e.g. gaia_synthesis_bio_energy_center
  // wins over a shorter prefix when names are ambiguous.
  const facIndex = facilities
    .map((f) => ({ f, idNorm: norm(f.id) }))
    .sort((a, b) => b.idNorm.length - a.idNorm.length);

  function matchFacility(mesh) {
    for (const { f, idNorm } of facIndex) {
      if (idNorm && ancestorMatchesId(mesh, idNorm)) return f;
    }
    return null;
  }

  // Read a representative color from an existing material (handles arrays).
  function readMatColor(material) {
    const m = Array.isArray(material) ? material[0] : material;
    if (m && m.color && m.color.isColor) return m.color.clone();
    return new THREE.Color(0x808080);
  }

  // Classify a sub-part as "glass-ish" by its existing color luminance (very dark
  // or very bright reads as glazing/window in these baked GLBs).
  function isGlassish(col) {
    const lum = 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b;
    return lum < 0.12 || lum > 0.88;
  }

  function disposeMaterial(material) {
    const arr = Array.isArray(material) ? material : [material];
    for (const m of arr) {
      if (m && typeof m.dispose === 'function') m.dispose();
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Shared cheap CanvasTexture "window grid" emissive maps (reused everywhere).
  // We build a couple of variants (vertical-biased and horizontal-band) so
  // towers vs. research bands read differently.
  // ──────────────────────────────────────────────────────────────────────────
  function makeWindowTexture(kind) {
    if (typeof document === 'undefined' || !document.createElement) return null;
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    if (kind === 'bands') {
      // horizontal ribbon windows (research / media)
      const rows = 6;
      const gap = size / rows;
      for (let r = 0; r < rows; r++) {
        const y = r * gap + gap * 0.28;
        const h = gap * 0.42;
        // lit cells along the band
        const cells = 10;
        const cw = size / cells;
        for (let c = 0; c < cells; c++) {
          const lit = Math.random() > 0.35;
          ctx.fillStyle = lit ? '#ffffff' : '#1a1a1a';
          ctx.fillRect(c * cw + cw * 0.12, y, cw * 0.76, h);
        }
      }
    } else {
      // grid of windows (towers / general facades)
      const cols = kind === 'tower' ? 6 : 8;
      const rows = kind === 'tower' ? 12 : 8;
      const cw = size / cols;
      const rh = size / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lit = Math.random() > 0.42;
          ctx.fillStyle = lit ? '#ffffff' : '#141414';
          ctx.fillRect(c * cw + cw * 0.18, r * rh + rh * 0.18, cw * 0.64, rh * 0.64);
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    createdTextures.push(tex);
    return tex;
  }

  const windowTextures = {
    grid: null,
    tower: null,
    bands: null,
  };
  function getWindowTexture(kind) {
    const key = kind === 'tower' ? 'tower' : kind === 'bands' ? 'bands' : 'grid';
    if (windowTextures[key] === null) {
      windowTextures[key] = makeWindowTexture(key) || false;
    }
    return windowTextures[key] || null;
  }

  // Decide which window texture style a family uses.
  function windowKindForFamily(famKey) {
    if (famKey === 'CORPORATE_TOWER') return 'tower';
    if (famKey === 'RESEARCH') return 'bands';
    return 'grid';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Build a family material for a given mesh, preserving a touch of base-color hue.
  // ──────────────────────────────────────────────────────────────────────────
  function buildBuildingMaterial(mesh, fam, famKey, districtHex, repeatScale, isLargeFacade) {
    const baseCol = readMatColor(mesh.material);
    const glassish = isGlassish(baseCol);

    // Target family color (life-science labs use white, farm uses green, etc.)
    let targetHex = fam.color;
    if (fam.useDistrict && typeof districtHex === 'number') targetHex = districtHex;
    const target = new THREE.Color(targetHex);

    // Blend existing base color toward the family color (keep some hue identity).
    const blend = fam.blend != null ? fam.blend : 0.6;
    const color = baseCol.clone().lerp(target, blend);

    let metalness = fam.metalness;
    let roughness = fam.roughness;
    let emissiveHex = fam.glow;

    if (glassish) {
      // Glass-ish sub-parts: more reflective, take the family glass tint if present.
      metalness = Math.min(1, fam.metalness + 0.2);
      roughness = Math.max(0.05, fam.roughness - 0.15);
      if (fam.glass != null) color.lerp(new THREE.Color(fam.glass), 0.5);
      emissiveHex = fam.glow;
    } else if (fam.accent && baseCol.r > 0.35 && baseCol.g < 0.4 && baseCol.b < 0.35) {
      // Industrial rust accent: warm-ish existing parts keep a rust tone.
      color.lerp(new THREE.Color(fam.accent), 0.4);
    }

    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      emissive: new THREE.Color(emissiveHex),
      emissiveIntensity: isNight ? fam.nightI : fam.dayI,
    });

    // Preserve vertex colors if the source geometry used them (keeps accent detail).
    if (mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.color) {
      mat.vertexColors = true;
    }

    // Apply a cheap shared window emissiveMap to large facade meshes & glassy parts
    // so they read as lit windows at night.
    let isWindow = false;
    if (fam.windows && (isLargeFacade || glassish)) {
      const tex = getWindowTexture(windowKindForFamily(famKey));
      if (tex) {
        mat.emissiveMap = tex;
        const rs = repeatScale || 1;
        mat.emissiveMap.repeat && mat.emissiveMap.repeat.set(rs, rs);
        isWindow = true;
      }
    }

    // Env reflections: stronger on metal/glass, subtle on matte facades.
    const envI = glassish ? 1.4 : (0.4 + metalness * 0.9);
    applyEnv(mat, envI);

    createdMaterials.push(mat);
    tracked.push({
      mat,
      dayI: fam.dayI,
      nightI: fam.nightI,
      base: fam.nightI,
      flickerPhase: Math.random() * Math.PI * 2,
      isWindow: isWindow || fam.windows,
    });

    return mat;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Environment (non-building) meshes: roads / water / trees / terrain / solar etc.
  // ──────────────────────────────────────────────────────────────────────────
  const ENV_KEYWORDS = [
    'road', 'street', 'path', 'water', 'pond', 'lake', 'river',
    'tree', 'plant', 'veg', 'grass', 'terrain', 'ground', 'land', 'landscape',
    'solar', 'panel', 'pv', 'turbine', 'wind', 'hex', 'marker', 'plaza', 'pavement',
  ];

  function envCategory(nameNorm) {
    if (/water|pond|lake|river/.test(nameNorm)) return 'water';
    if (/tree|plant|veg|grass|landscape|garden|green/.test(nameNorm)) return 'foliage';
    if (/solar|panel|pv/.test(nameNorm)) return 'solar';
    if (/turbine|wind/.test(nameNorm)) return 'turbine';
    if (/hex|marker/.test(nameNorm)) return 'marker';
    if (/road|street|path|pavement|plaza|tarmac|asphalt/.test(nameNorm)) return 'road';
    if (/terrain|ground|land\b|landscape/.test(nameNorm)) return 'terrain';
    return null;
  }

  function isEnvName(nameNorm) {
    for (const k of ENV_KEYWORDS) {
      if (nameNorm.includes(k)) return true;
    }
    return false;
  }

  function buildEnvMaterial(mesh, cat) {
    const baseCol = readMatColor(mesh.material);
    let params;
    switch (cat) {
      case 'water':
        params = { color: 0x123a5c, metalness: 0.85, roughness: 0.12, emissive: 0x0a2a44, dayI: 0.05, nightI: 0.25 };
        break;
      case 'foliage':
        params = { color: baseCol.clone().lerp(new THREE.Color(0x2e7d3a), 0.6), metalness: 0.0, roughness: 0.9, emissive: 0x0a2410, dayI: 0.0, nightI: 0.08 };
        break;
      case 'solar':
        params = { color: 0x141a2a, metalness: 0.6, roughness: 0.25, emissive: 0x102040, dayI: 0.0, nightI: 0.2 };
        break;
      case 'turbine':
        params = { color: 0xe8edf2, metalness: 0.5, roughness: 0.4, emissive: 0x223344, dayI: 0.0, nightI: 0.1 };
        break;
      case 'marker':
        params = { color: 0x0c1a22, metalness: 0.5, roughness: 0.5, emissive: 0x1199cc, dayI: opts.envEmissive ? 0.15 : 0.0, nightI: opts.envEmissive ? 0.7 : 0.0 };
        break;
      case 'terrain':
        params = { color: baseCol.clone().lerp(new THREE.Color(0x2a3326), 0.5), metalness: 0.05, roughness: 0.95, emissive: 0x000000, dayI: 0.0, nightI: 0.0 };
        break;
      case 'road':
      default:
        params = { color: 0x14181d, metalness: 0.15, roughness: 0.8, emissive: 0x0a2030, dayI: 0.0, nightI: opts.envEmissive ? 0.18 : 0.0 };
        break;
    }

    const mat = new THREE.MeshStandardMaterial({
      color: params.color instanceof THREE.Color ? params.color : new THREE.Color(params.color),
      metalness: params.metalness,
      roughness: params.roughness,
      emissive: new THREE.Color(params.emissive),
      emissiveIntensity: isNight ? params.nightI : params.dayI,
    });
    if (mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.color) {
      mat.vertexColors = true;
    }

    // Reflective env on water / solar / metallic env parts only.
    if (cat === 'water') applyEnv(mat, 1.5);
    else if (cat === 'solar' || cat === 'turbine' || cat === 'marker') applyEnv(mat, 0.8);

    createdMaterials.push(mat);
    tracked.push({
      mat,
      dayI: params.dayI,
      nightI: params.nightI,
      base: params.nightI,
      flickerPhase: Math.random() * Math.PI * 2,
      isWindow: false,
    });
    return mat;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // First pass: collect, per facility, the largest mesh footprint so we can tag
  // "large facades" that deserve a window emissiveMap.
  // ──────────────────────────────────────────────────────────────────────────
  function meshFootprint(mesh) {
    try {
      if (!mesh.geometry) return 0;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox;
      if (!bb) return 0;
      const sx = (bb.max.x - bb.min.x);
      const sy = (bb.max.y - bb.min.y);
      const sz = (bb.max.z - bb.min.z);
      // facade area ~ largest two dimensions
      const dims = [Math.abs(sx), Math.abs(sy), Math.abs(sz)].sort((a, b) => b - a);
      return dims[0] * dims[1];
    } catch (e) {
      return 0;
    }
  }

  // Gather meshes once.
  const meshes = [];
  if (campusRoot && typeof campusRoot.traverse === 'function') {
    campusRoot.traverse((obj) => {
      if (obj && obj.isMesh) meshes.push(obj);
    });
  }

  // Determine per-facility max footprint for "large facade" thresholding.
  const facMaxArea = {}; // facilityId -> max footprint
  const meshFacility = new Map(); // mesh -> facility
  const meshArea = new Map();

  for (const mesh of meshes) {
    const f = matchFacility(mesh);
    if (f) {
      meshFacility.set(mesh, f);
      const a = meshFootprint(mesh);
      meshArea.set(mesh, a);
      if (!(f.id in facMaxArea) || a > facMaxArea[f.id]) facMaxArea[f.id] = a;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Second pass: enable shadows + assign materials.
  // ──────────────────────────────────────────────────────────────────────────
  let matchedCount = 0;
  let envCount = 0;

  for (const mesh of meshes) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const f = meshFacility.get(mesh);

    if (f) {
      mesh.userData.facilityId = f.id;
      mesh.userData.district = f.district;

      const famKey = ID_TO_FAMILY[f.id] || 'DEFAULT';
      const fam = FAMILIES[famKey] || FAMILIES.DEFAULT;
      const dc = districtColors[f.district];
      const districtHex = dc ? dc.hex : 0x224466;

      const maxA = facMaxArea[f.id] || 0;
      const area = meshArea.get(mesh) || 0;
      const isLargeFacade = maxA > 0 && area >= maxA * 0.45;

      // repeat scale for window grid scales loosely with footprint / stories
      const stories = f.stories || 3;
      const repeatScale = Math.max(1, Math.round(stories / 2));

      replacedMeshes.push({ mesh, originalMaterial: mesh.material });
      mesh.material = buildBuildingMaterial(mesh, fam, famKey, districtHex, repeatScale, isLargeFacade);
      matchedCount++;
      continue;
    }

    // Environment mesh?
    const nameNorm = norm(mesh.name);
    if (isEnvName(nameNorm)) {
      const cat = envCategory(nameNorm) || 'road';
      replacedMeshes.push({ mesh, originalMaterial: mesh.material });
      mesh.material = buildEnvMaterial(mesh, cat);
      envCount++;
    }
    // Unmatched, non-env meshes are left as-is (shadows already enabled).
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Roof / parapet accents — a thin emissive trim ring riding the top edge of
  // each facility's tallest mesh. Reads as illuminated parapet coping at night.
  // One shared geometry per facility (cheap), added under an accents group.
  // ──────────────────────────────────────────────────────────────────────────
  const accentGroup = new THREE.Group();
  accentGroup.name = 'roofAccents';
  const accentMeshes = [];
  const accentGeometries = [];
  function buildRoofAccents() {
    if (!campusRoot || typeof campusRoot.add !== 'function') return;
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    const ctr = new THREE.Vector3();
    // Pick, per facility, the mesh with the largest footprint (its main mass).
    const facMain = new Map(); // facId -> { mesh, area }
    for (const mesh of meshes) {
      const f = meshFacility.get(mesh);
      if (!f) continue;
      const a = meshArea.get(mesh) || 0;
      const cur = facMain.get(f.id);
      if (!cur || a > cur.area) facMain.set(f.id, { mesh, area: a, f });
    }
    for (const { mesh, f } of facMain.values()) {
      const famKey = ID_TO_FAMILY[f.id] || 'DEFAULT';
      const fam = FAMILIES[famKey] || FAMILIES.DEFAULT;
      box.setFromObject(mesh);
      if (!isFinite(box.min.x) || box.isEmpty()) continue;
      box.getSize(size);
      box.getCenter(ctr);
      // World is Z-up after the GLB's +90°X rotation; top edge is at box.max.z.
      const w = size.x, d = size.y;
      if (w < 4 || d < 4) continue;
      const trimMat = new THREE.MeshStandardMaterial({
        color: 0x14181e,
        emissive: new THREE.Color(fam.glow || 0x99bbee),
        emissiveIntensity: isNight ? 0.9 : 0.0,
        metalness: 0.6, roughness: 0.35,
      });
      applyEnv(trimMat, 0.8);
      createdMaterials.push(trimMat);
      tracked.push({ mat: trimMat, dayI: 0.0, nightI: 0.9, base: 0.9, flickerPhase: Math.random() * Math.PI * 2, isWindow: true });

      // Four thin bars forming a rectangle ring at the roofline.
      const t = 0.8; // trim thickness
      const zTop = box.max.z + 0.2;
      const ringGeo = new THREE.BoxGeometry(1, 1, 0.6);
      accentGeometries.push(ringGeo);
      const addBar = (sx, sy, px, py) => {
        const bar = new THREE.Mesh(ringGeo, trimMat);
        bar.scale.set(sx, sy, 1);
        bar.position.set(px, py, zTop);
        accentGroup.add(bar);
        accentMeshes.push(bar);
      };
      addBar(w, t, ctr.x, ctr.y + d / 2);
      addBar(w, t, ctr.x, ctr.y - d / 2);
      addBar(t, d, ctr.x + w / 2, ctr.y);
      addBar(t, d, ctr.x - w / 2, ctr.y);
    }
    if (accentMeshes.length) {
      // accents are in world space; add to scene root via campusRoot's parent if
      // possible, else campusRoot (kept axis-aligned to world).
      const host = campusRoot.parent || campusRoot;
      // Our box coordinates are world-space; place accents at world level by
      // attaching to the same parent as campusRoot (the scene).
      if (campusRoot.parent) {
        campusRoot.parent.add(accentGroup);
      } else {
        // Fallback: counter-rotate so world-space positions land correctly.
        accentGroup.rotation.x = -Math.PI / 2;
        campusRoot.add(accentGroup);
      }
    }
  }
  buildRoofAccents();

  // ──────────────────────────────────────────────────────────────────────────
  // Controller API
  // ──────────────────────────────────────────────────────────────────────────
  function setDayNight(night) {
    isNight = !!night;
    for (const e of tracked) {
      e.mat.emissiveIntensity = isNight ? e.nightI : e.dayI;
      e.base = isNight ? e.nightI : e.dayI;
      if (e.mat.emissiveMap) e.mat.needsUpdate = e.mat.needsUpdate || false;
    }
  }

  function update(dt, elapsed) {
    if (!opts.flicker) return;
    const e0 = elapsed || 0;
    // Subtle, tasteful pulse only on lit-window materials, and only meaningful at night.
    for (const e of tracked) {
      if (!e.isWindow) continue;
      const baseI = e.base;
      if (baseI <= 0.001) {
        // keep day value pinned at base
        e.mat.emissiveIntensity = baseI;
        continue;
      }
      // +/- ~6% gentle shimmer, per-material phase so they don't pulse in unison
      const pulse = 1.0 + 0.06 * Math.sin(e0 * 1.3 + e.flickerPhase);
      e.mat.emissiveIntensity = baseI * pulse;
    }
  }

  function dispose() {
    // Restore original materials (so a re-run / teardown doesn't leak our look).
    for (const r of replacedMeshes) {
      if (r.mesh) r.mesh.material = r.originalMaterial;
    }
    // Remove + free roof accents.
    if (accentGroup.parent) accentGroup.parent.remove(accentGroup);
    for (const g of accentGeometries) { if (g && g.dispose) g.dispose(); }
    for (const m of createdMaterials) disposeMaterial(m);
    for (const t of createdTextures) {
      if (t && typeof t.dispose === 'function') t.dispose();
    }
    // Free PMREM env map + generator (envSourceTex is freed via createdTextures).
    if (envMap && envMap !== envSourceTex && envMap.dispose) envMap.dispose();
    if (pmremGen && pmremGen.dispose) pmremGen.dispose();
    envMap = null; pmremGen = null; envSourceTex = null;
    tracked.length = 0;
    createdMaterials.length = 0;
    createdTextures.length = 0;
    replacedMeshes.length = 0;
    accentGeometries.length = 0;
    accentMeshes.length = 0;
  }

  // Initialize to day state.
  setDayNight(false);

  // Expose a few diagnostics on the returned object (non-enumerable-ish but handy).
  return {
    setDayNight,
    update,
    dispose,
    envMap,
    stats: { meshes: meshes.length, matched: matchedCount, environment: envCount, materials: createdMaterials.length, accents: accentMeshes.length },
  };
}
