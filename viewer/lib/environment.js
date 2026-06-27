// environment.js
// Self-contained procedural Three.js campus environment.
// THREE is injected (no import) to avoid version conflicts.
//
// Coordinate system: Z is UP. Ground = XY plane at z=0.
// X = East (0..1097), Y = North (0..664). Site center (548.5, 332, 0).
//
// Export:
//   export function createEnvironment(THREE, scene, options = {})
//   -> { group, update(dt, elapsed, isNight), setDayNight(isNight), dispose() }

export function createEnvironment(THREE, scene, options = {}) {
  // ---------------------------------------------------------------------------
  // Config / constants
  // ---------------------------------------------------------------------------
  const SITE_W = 1097;      // X extent
  const SITE_H = 664;       // Y extent
  const CX = 548.5;
  const CY = 332;

  const opts = Object.assign(
    {
      treeCount: 760,
      seed: 1337,
      startNight: true,
    },
    options
  );

  // ---------------------------------------------------------------------------
  // Seeded PRNG (mulberry32)
  // ---------------------------------------------------------------------------
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(opts.seed >>> 0);
  const rrange = (a, b) => a + (b - a) * rand();

  // ---------------------------------------------------------------------------
  // Bookkeeping for dispose()
  // ---------------------------------------------------------------------------
  const disposables = []; // geometries & materials & textures
  const track = (x) => {
    disposables.push(x);
    return x;
  };

  // Material references that respond to day/night toggling
  const nightControlled = []; // { mat, prop, night, day }  prop = 'emissiveIntensity'
  function registerEmissive(mat, nightVal, dayVal) {
    nightControlled.push({ mat, night: nightVal, day: dayVal });
    return mat;
  }

  // Animation handles
  const animatedWater = []; // { tex, sx, sy }
  const algaeMats = [];     // materials whose emissiveIntensity pulses
  const turbines = [];      // { hub }

  // ---------------------------------------------------------------------------
  // Root group
  // ---------------------------------------------------------------------------
  const group = new THREE.Group();
  group.name = "campusEnvironment";

  // ===========================================================================
  // Procedural textures (CanvasTexture)
  // ===========================================================================
  function makeGroundTexture() {
    const size = 512;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    // dark blue-green base
    ctx.fillStyle = "#0a1a14";
    ctx.fillRect(0, 0, size, size);
    // subtle noise blobs
    for (let i = 0; i < 2600; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = rrange(1, 9);
      const t = rand();
      const g = 18 + Math.floor(t * 26);
      ctx.fillStyle = `rgba(${10 + Math.floor(t * 10)},${g},${14 + Math.floor(t * 14)},${0.12 + rand() * 0.18})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // faint lighter "campus pad" tone in central rectangle area
    // central rect corresponds to 0..1097 / 0..664 in a 2600x1800 plane
    // map: plane spans ~2600 in X centered at CX. Pad region fraction:
    const padX0 = ((CX - SITE_W / 2 - (CX - 1300)) / 2600) * size;
    const padX1 = ((CX + SITE_W / 2 - (CX - 1300)) / 2600) * size;
    const padY0 = ((CY - SITE_H / 2 - (CY - 900)) / 1800) * size;
    const padY1 = ((CY + SITE_H / 2 - (CY - 900)) / 1800) * size;
    ctx.fillStyle = "rgba(30,46,40,0.30)";
    ctx.fillRect(padX0, padY0, padX1 - padX0, padY1 - padY0);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);
    track(tex);
    return tex;
  }

  function makeWaterTexture() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0a3a6a";
    ctx.fillRect(0, 0, size, size);
    // ripple streaks (lighter blue) for shimmer when scrolled
    for (let i = 0; i < 900; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const w = rrange(4, 22);
      const h = rrange(1, 3);
      const a = 0.05 + rand() * 0.18;
      ctx.fillStyle = `rgba(${90 + Math.floor(rand() * 90)},${150 + Math.floor(rand() * 80)},${200 + Math.floor(rand() * 55)},${a})`;
      ctx.fillRect(x, y, w, h);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    track(tex);
    return tex;
  }

  // ===========================================================================
  // 1. GROUND TERRAIN
  // ===========================================================================
  function buildGround() {
    const groundTex = makeGroundTexture();
    const groundGeo = track(new THREE.PlaneGeometry(2600, 1800, 1, 1));
    const groundMat = track(
      new THREE.MeshStandardMaterial({
        map: groundTex,
        color: 0xffffff,
        roughness: 0.95,
        metalness: 0.0,
      })
    );
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(CX, CY, -0.2);
    ground.receiveShadow = true;
    group.add(ground);
    registerEmissive; // no-op to keep linter calm

    // Campus pad plane (developed ground over buildable area), slightly distinct tone
    const padGeo = track(new THREE.PlaneGeometry(SITE_W + 40, SITE_H + 40, 1, 1));
    const padMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x14241c,
        roughness: 0.9,
        metalness: 0.0,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(CX, CY, -0.1);
    pad.receiveShadow = true;
    group.add(pad);
  }

  // ===========================================================================
  // 2. GLOWING HEX-GRID ROADS
  // ===========================================================================
  // We collect road ribbon segments and glow stripe segments, then build them
  // as merged-ish individual meshes. To keep it simple and robust we build each
  // segment as a thin rotated box; segments are few enough hundreds -> fine.
  function buildRoads() {
    const asphaltMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x14171c,
        roughness: 0.85,
        metalness: 0.05,
      })
    );
    const glowMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x063b33,
        emissive: 0x00cfaa,
        emissiveIntensity: 0.85,
        roughness: 0.5,
        metalness: 0.0,
      })
    );
    registerEmissive(glowMat, 0.85, 0.15);

    const roadParent = new THREE.Group();
    roadParent.name = "roads";
    group.add(roadParent);

    // unit plane geometries reused via scaling on each segment (cheap, instanced-like)
    const asphaltSegments = []; // matrices
    const glowSegments = [];

    function addSegment(ax, ay, bx, by, width, list, zAdd) {
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy);
      if (len < 0.001) return;
      const ang = Math.atan2(dy, dx);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        ang
      );
      m.compose(
        new THREE.Vector3((ax + bx) / 2, (ay + by) / 2, zAdd),
        q,
        new THREE.Vector3(len, width, 1)
      );
      list.push(m);
    }

    function addRoad(ax, ay, bx, by, width) {
      addSegment(ax, ay, bx, by, width, asphaltSegments, 0.06);
      // glowing center stripe slightly narrower, slightly higher
      addSegment(ax, ay, bx, by, Math.max(0.7, width * 0.1), glowSegments, 0.12);
    }

    // Hex grid (flat-top). Generate centers, dedupe edges.
    const hexR = 110;
    const colSpacing = 220;
    const rowSpacing = 190;
    const xOffset = 110;

    const centers = [];
    let row = 0;
    for (let y = -40; y <= SITE_H + 60; y += rowSpacing) {
      const off = row % 2 === 0 ? 0 : xOffset;
      for (let x = -40 + off; x <= SITE_W + 60; x += colSpacing) {
        centers.push([x, y]);
      }
      row++;
    }

    // flat-top hex vertices angles: 0,60,...; flat-top uses 0,60,120...
    function hexVerts(cx, cy, r) {
      const v = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i); // flat-top
        v.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      return v;
    }

    const seen = new Set();
    const keyOf = (x, y) =>
      `${Math.round(x / 4)}_${Math.round(y / 4)}`;
    const edgeKey = (a, b) => {
      const ka = keyOf(a[0], a[1]);
      const kb = keyOf(b[0], b[1]);
      return ka < kb ? ka + "|" + kb : kb + "|" + ka;
    };

    const pad = 90; // allow roads slightly outside the bounds
    function inBounds(x, y) {
      return x >= -pad && x <= SITE_W + pad && y >= -pad && y <= SITE_H + pad;
    }

    for (const [cx, cy] of centers) {
      const v = hexVerts(cx, cy, hexR);
      for (let i = 0; i < 6; i++) {
        const a = v[i];
        const b = v[(i + 1) % 6];
        if (!inBounds(a[0], a[1]) && !inBounds(b[0], b[1])) continue;
        const k = edgeKey(a, b);
        if (seen.has(k)) continue;
        seen.add(k);
        addRoad(a[0], a[1], b[0], b[1], rrange(10, 14));
      }
    }

    // Main boulevards
    addRoad(-20, CY, SITE_W + 20, CY, 20); // E-W boulevard at y=332
    addRoad(548, -20, 548, SITE_H + 20, 20); // N-S spine at x~548

    // Build InstancedMesh for asphalt + glow
    const baseGeo = track(new THREE.PlaneGeometry(1, 1));

    function buildInstanced(matrices, mat, castShadow) {
      const im = new THREE.InstancedMesh(baseGeo, mat, matrices.length);
      for (let i = 0; i < matrices.length; i++) im.setMatrixAt(i, matrices[i]);
      im.instanceMatrix.needsUpdate = true;
      im.receiveShadow = true;
      im.castShadow = !!castShadow;
      roadParent.add(im);
      return im;
    }
    buildInstanced(asphaltSegments, asphaltMat, false);
    buildInstanced(glowSegments, glowMat, false);

    // Kinetic-tile accent rings at hex centers (cheap emissive rings)
    const ringGeo = track(new THREE.RingGeometry(7, 9.5, 24));
    const ringMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x041f1b,
        emissive: 0x00cfaa,
        emissiveIntensity: 0.7,
        roughness: 0.6,
        metalness: 0.0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      })
    );
    registerEmissive(ringMat, 0.7, 0.12);
    const inBoundCenters = centers.filter(
      ([x, y]) => x >= 0 && x <= SITE_W && y >= 0 && y <= SITE_H
    );
    const ringIM = new THREE.InstancedMesh(ringGeo, ringMat, inBoundCenters.length);
    const tmp = new THREE.Matrix4();
    inBoundCenters.forEach(([x, y], i) => {
      tmp.makeTranslation(x, y, 0.09);
      ringIM.setMatrixAt(i, tmp);
    });
    ringIM.instanceMatrix.needsUpdate = true;
    roadParent.add(ringIM);
  }

  // ===========================================================================
  // 3. RIVERS / WATER
  // ===========================================================================
  function makeWaterMaterial() {
    const tex = makeWaterTexture();
    const mat = track(
      new THREE.MeshStandardMaterial({
        map: tex,
        color: 0x0a3a6a,
        emissive: 0x06203f,
        emissiveIntensity: 0.9,
        metalness: 0.85,
        roughness: 0.1,
      })
    );
    registerEmissive(mat, 0.9, 0.25);
    return { mat, tex };
  }

  function buildWater() {
    const waterParent = new THREE.Group();
    waterParent.name = "water";
    group.add(waterParent);

    function addBand(cx, cy, w, h, repX, repY, sx, sy) {
      const { mat, tex } = makeWaterMaterial();
      tex.repeat.set(repX, repY);
      const geo = track(new THREE.PlaneGeometry(w, h));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cx, cy, 0.1);
      mesh.receiveShadow = true;
      waterParent.add(mesh);
      animatedWater.push({ tex, sx, sy });
    }

    // North River along y~648, full width, ~46 wide
    addBand(CX, 648, SITE_W + 120, 46, 24, 1, 0.012, 0.004);
    // East River along x~1075, full depth, ~46 wide
    addBand(1075, CY, 46, SITE_H + 120, 1, 18, 0.004, 0.013);
    // South River along y~8, full width, ~34 wide
    addBand(CX, 8, SITE_W + 120, 34, 24, 1, -0.011, 0.004);

    // Central reflecting pool disc radius ~32
    const { mat: poolMat, tex: poolTex } = makeWaterMaterial();
    poolTex.repeat.set(3, 3);
    const poolGeo = track(new THREE.CircleGeometry(32, 48));
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(548, 332, 0.1);
    pool.receiveShadow = true;
    waterParent.add(pool);
    animatedWater.push({ tex: poolTex, sx: 0.006, sy: 0.006 });
  }

  // ===========================================================================
  // 4. ALGAE PONDS (luminescent green, pulsing)
  // ===========================================================================
  function buildAlgae() {
    const algaeParent = new THREE.Group();
    algaeParent.name = "algae";
    group.add(algaeParent);

    const base = [940, 200];
    const offsets = [
      [0, 0],
      [38, 18],
      [-30, 30],
      [20, -34],
    ];
    for (let i = 0; i < offsets.length; i++) {
      const mat = track(
        new THREE.MeshStandardMaterial({
          color: 0x0c3a1c,
          emissive: 0x19c850,
          emissiveIntensity: 1.4,
          roughness: 0.35,
          metalness: 0.1,
        })
      );
      // algae pulse handled separately, but also register day/night base
      nightControlled.push({ mat, night: 1.4, day: 0.5 });
      algaeMats.push({ mat, base: 1.4, phase: rand() * Math.PI * 2 });
      const r = rrange(12, 16);
      const geo = track(new THREE.CircleGeometry(r, 36));
      const m = new THREE.Mesh(geo, mat);
      m.position.set(base[0] + offsets[i][0], base[1] + offsets[i][1], 0.15);
      m.receiveShadow = true;
      algaeParent.add(m);
    }
  }

  // ===========================================================================
  // Building centers (avoid trees on footprints)
  // ===========================================================================
  const buildingCenters = [
    [220, 585], [390, 555], [110, 548], [545, 600], [462, 530], [190, 375],
    [108, 248], [858, 572], [898, 433], [565, 370], [432, 292], [718, 448],
    [657, 292], [592, 445], [798, 212], [932, 155], [302, 503], [322, 268],
    [635, 582], [722, 568], [780, 490], [668, 487], [395, 433], [978, 358],
    [975, 232], [80, 618], [80, 512], [195, 132], [562, 82], [798, 98],
  ];

  function nearBuilding(x, y, d) {
    const d2 = d * d;
    for (let i = 0; i < buildingCenters.length; i++) {
      const dx = x - buildingCenters[i][0];
      const dy = y - buildingCenters[i][1];
      if (dx * dx + dy * dy < d2) return true;
    }
    return false;
  }
  function nearBoulevard(x, y, d) {
    // E-W at y=332, N-S at x=548
    return Math.abs(y - 332) < d || Math.abs(x - 548) < d;
  }

  // ===========================================================================
  // 5. TREES (InstancedMesh: trunk + foliage)
  // ===========================================================================
  function buildTrees() {
    const N = opts.treeCount;

    const trunkGeo = track(new THREE.CylinderGeometry(0.5, 0.8, 1, 6));
    // Cylinder is built along Y; we want it along Z (up). Pre-rotate geometry.
    trunkGeo.rotateX(Math.PI / 2);
    trunkGeo.translate(0, 0, 0.5); // base at z=0, top at z=1 (unit)

    const foliageGeo = track(new THREE.IcosahedronGeometry(1, 1));

    const trunkMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x4a3520,
        roughness: 0.9,
        metalness: 0.0,
      })
    );
    const foliageMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff, // per-instance color applied
        roughness: 0.85,
        metalness: 0.0,
        vertexColors: false,
      })
    );
    // foliage day/night: darken at night via emissive? Spec: trees darker at night.
    // We'll tint via material color through day/night handler.
    nightControlled.push({ mat: foliageMat, night: 0, day: 0, colorNight: 0x9fb89f, colorDay: 0xffffff, isColor: true });

    const trunkIM = new THREE.InstancedMesh(trunkGeo, trunkMat, N);
    const foliageIM = new THREE.InstancedMesh(foliageGeo, foliageMat, N);
    trunkIM.castShadow = true;
    trunkIM.receiveShadow = true;
    foliageIM.castShadow = true;
    foliageIM.receiveShadow = true;

    const greens = [0x2f7a32, 0x35893a, 0x3da045, 0x328338];
    const color = new THREE.Color();

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const up = new THREE.Vector3(0, 0, 1);

    // terrain bounds for placement
    const TX0 = CX - 1300, TX1 = CX + 1300;
    const TY0 = CY - 900, TY1 = CY + 900;

    let placed = 0;
    let attempts = 0;
    const maxAttempts = N * 30;

    function tryPlace(x, y) {
      if (nearBuilding(x, y, 32)) return false;
      if (nearBoulevard(x, y, 9)) return false;
      // avoid water bands
      if (Math.abs(y - 648) < 28) return false;
      if (Math.abs(x - 1075) < 28) return false;
      if (Math.abs(y - 8) < 22) return false;
      const i = placed;

      const trunkH = rrange(6, 13);
      const foliageR = rrange(4.5, 8.5) * (trunkH / 9);
      const yaw = rand() * Math.PI * 2;

      // trunk
      q.setFromAxisAngle(up, yaw);
      pos.set(x, y, 0);
      scl.set(rrange(0.8, 1.3), rrange(0.8, 1.3), trunkH);
      m.compose(pos, q, scl);
      trunkIM.setMatrixAt(i, m);

      // foliage
      pos.set(x, y, trunkH + foliageR * 0.35);
      scl.set(foliageR, foliageR, foliageR * rrange(0.9, 1.25));
      m.compose(pos, q, scl);
      foliageIM.setMatrixAt(i, m);

      color.setHex(greens[Math.floor(rand() * greens.length)]);
      // slight per-instance variation
      color.offsetHSL((rand() - 0.5) * 0.03, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.06);
      foliageIM.setColorAt(i, color);

      placed++;
      return true;
    }

    // ~65% perimeter forest buffer ring (outside site), ~35% scattered inside
    const targetPerimeter = Math.floor(N * 0.62);

    while (placed < N && attempts < maxAttempts) {
      attempts++;
      let x, y;
      if (placed < targetPerimeter) {
        // Ring around site: pick within terrain but outside site bounds (with margin)
        x = rrange(TX0 + 30, TX1 - 30);
        y = rrange(TY0 + 30, TY1 - 30);
        const insideSite =
          x > -20 && x < SITE_W + 20 && y > -20 && y < SITE_H + 20;
        if (insideSite) continue; // force outside for the buffer ring
        // bias density toward the band hugging the site
        const dx = Math.max(0, Math.max(-x, x - SITE_W));
        const dy = Math.max(0, Math.max(-y, y - SITE_H));
        const distOut = Math.hypot(dx, dy);
        if (distOut > 360 && rand() > 0.35) continue; // thin out far field
      } else {
        // scattered inside open areas
        x = rrange(10, SITE_W - 10);
        y = rrange(10, SITE_H - 10);
      }
      tryPlace(x, y);
    }

    // If we couldn't fill all, set remaining instances to zero scale (hidden)
    for (let i = placed; i < N; i++) {
      m.makeScale(0, 0, 0);
      trunkIM.setMatrixAt(i, m);
      foliageIM.setMatrixAt(i, m);
      foliageIM.setColorAt(i, color.setHex(0x000000));
    }

    trunkIM.instanceMatrix.needsUpdate = true;
    foliageIM.instanceMatrix.needsUpdate = true;
    if (foliageIM.instanceColor) foliageIM.instanceColor.needsUpdate = true;

    group.add(trunkIM);
    group.add(foliageIM);
  }

  // ===========================================================================
  // 6. SOLAR FIELDS (InstancedMesh per array)
  // ===========================================================================
  function buildSolar() {
    const panelGeo = track(new THREE.BoxGeometry(7, 4.5, 0.25));
    const panelMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x10204a,
        emissive: 0x0a1838,
        emissiveIntensity: 0.5,
        roughness: 0.25,
        metalness: 0.6,
      })
    );
    registerEmissive(panelMat, 0.5, 0.15);

    const postGeo = track(new THREE.CylinderGeometry(0.18, 0.18, 1, 5));
    postGeo.rotateX(Math.PI / 2);
    postGeo.translate(0, 0, 0.5);
    const postMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x333a44,
        roughness: 0.8,
        metalness: 0.3,
      })
    );

    const corners = [
      [60, 60],
      [1037, 60],
      [60, 604],
      [1037, 604],
    ];
    const cols = 18;
    const rows = 9;
    const spX = 9;
    const spY = 6.5;
    const tilt = (20 * Math.PI) / 180;

    const totalPanels = corners.length * cols * rows;
    const panelIM = new THREE.InstancedMesh(panelGeo, panelMat, totalPanels);
    const postIM = new THREE.InstancedMesh(postGeo, postMat, totalPanels);
    panelIM.castShadow = true;
    panelIM.receiveShadow = true;
    postIM.castShadow = true;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3(1, 1, 1);
    // tilt about X axis so panel faces up & toward south
    const tiltQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      tilt
    );

    let idx = 0;
    for (const [bx, by] of corners) {
      const ox = bx - ((cols - 1) * spX) / 2;
      const oy = by - ((rows - 1) * spY) / 2;
      for (let r = 0; r < rows; r++) {
        for (let cc = 0; cc < cols; cc++) {
          const px = ox + cc * spX;
          const py = oy + r * spY;
          // panel
          q.copy(tiltQ);
          pos.set(px, py, 1.0);
          scl.set(1, 1, 1);
          m.compose(pos, q, scl);
          panelIM.setMatrixAt(idx, m);
          // post
          q.identity();
          pos.set(px, py, 0);
          scl.set(1, 1, 0.9);
          m.compose(pos, q, scl);
          postIM.setMatrixAt(idx, m);
          idx++;
        }
      }
    }
    panelIM.instanceMatrix.needsUpdate = true;
    postIM.instanceMatrix.needsUpdate = true;
    group.add(panelIM);
    group.add(postIM);
  }

  // ===========================================================================
  // 7. WIND TURBINES
  // ===========================================================================
  function buildTurbines() {
    const whiteMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xe8edf2,
        roughness: 0.55,
        metalness: 0.1,
      })
    );
    const nacelleMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xcfd6dd,
        roughness: 0.5,
        metalness: 0.2,
      })
    );

    const poleH = 55;
    const sites = [
      [40, 648],
      [1057, 648],
      [1057, 16],
      [40, 16],
    ];

    const poleGeo = track(new THREE.CylinderGeometry(1.4, 2.2, poleH, 10));
    poleGeo.rotateX(Math.PI / 2);
    poleGeo.translate(0, 0, poleH / 2);

    const nacelleGeo = track(new THREE.BoxGeometry(3.2, 7, 3));
    const bladeGeo = track(new THREE.BoxGeometry(1.0, 28, 0.5));
    // shift blade so it extends outward from hub
    bladeGeo.translate(0, 14, 0);

    for (const [sx, sy] of sites) {
      const t = new THREE.Group();
      t.position.set(sx, sy, 0);

      const pole = new THREE.Mesh(poleGeo, whiteMat);
      pole.castShadow = true;
      pole.receiveShadow = true;
      t.add(pole);

      // nacelle at top, facing roughly outward (toward edge / away from center)
      const facing = Math.atan2(sy - CY, sx - CX); // yaw toward outside
      const nacelle = new THREE.Mesh(nacelleGeo, nacelleMat);
      nacelle.position.set(0, 0, poleH + 1.2);
      nacelle.rotation.z = facing;
      nacelle.castShadow = true;
      t.add(nacelle);

      // hub group at front of nacelle; rotor spins in a vertical plane.
      // Place hub slightly out along facing direction.
      const hubOffset = 2.4;
      const hub = new THREE.Group();
      hub.position.set(
        Math.cos(facing) * hubOffset,
        Math.sin(facing) * hubOffset,
        poleH + 1.2
      );
      // Orient hub so its local Z (spin axis) points along 'facing' (horizontal).
      // Default blades lie in hub XY plane; we want them to spin in vertical plane.
      // Rotate hub so local Z -> facing direction.
      const spinAxisQuat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(Math.cos(facing), Math.sin(facing), 0)
      );
      hub.quaternion.copy(spinAxisQuat);

      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(bladeGeo, whiteMat);
        blade.rotation.z = (b * 2 * Math.PI) / 3;
        blade.castShadow = true;
        hub.add(blade);
      }
      // small hub cap
      const capGeo = track(new THREE.SphereGeometry(1.3, 10, 8));
      const cap = new THREE.Mesh(capGeo, nacelleMat);
      hub.add(cap);

      t.add(hub);
      group.add(t);
      turbines.push({ hub, speed: rrange(0.6, 1.1) });
    }
  }

  // ===========================================================================
  // Build everything
  // ===========================================================================
  buildGround();
  buildRoads();
  buildWater();
  buildAlgae();
  buildTrees();
  buildSolar();
  buildTurbines();

  scene.add(group);

  // ===========================================================================
  // Day / Night
  // ===========================================================================
  let currentNight = opts.startNight;

  function setDayNight(isNight) {
    currentNight = !!isNight;
    for (const e of nightControlled) {
      if (e.isColor) {
        e.mat.color.setHex(currentNight ? e.colorNight : e.colorDay);
      } else {
        e.mat.emissiveIntensity = currentNight ? e.night : e.day;
      }
      e.mat.needsUpdate = true;
    }
  }
  // initialize
  setDayNight(currentNight);

  // ===========================================================================
  // Update loop
  // ===========================================================================
  function update(dt, elapsed, isNight) {
    if (typeof isNight === "boolean" && isNight !== currentNight) {
      setDayNight(isNight);
    }
    const e = typeof elapsed === "number" ? elapsed : 0;

    // water shimmer
    for (let i = 0; i < animatedWater.length; i++) {
      const w = animatedWater[i];
      w.tex.offset.x = (w.sx * e) % 1;
      w.tex.offset.y = (w.sy * e) % 1;
      w.tex.needsUpdate = true;
    }

    // algae pulse (only really "glows" at night, but pulse always)
    const pulseScale = currentNight ? 1.0 : 0.4;
    for (let i = 0; i < algaeMats.length; i++) {
      const a = algaeMats[i];
      const base = currentNight ? 1.4 : 0.5;
      a.mat.emissiveIntensity =
        base + Math.sin(e * 1.6 + a.phase) * 0.45 * pulseScale;
    }

    // turbine blades
    for (let i = 0; i < turbines.length; i++) {
      const t = turbines[i];
      t.hub.rotation.z += dt * t.speed; // spin about hub local Z (the rotor axis)
    }
  }

  // ===========================================================================
  // Dispose
  // ===========================================================================
  function dispose() {
    scene.remove(group);
    group.traverse((obj) => {
      if (obj.isInstancedMesh) {
        if (obj.geometry) obj.geometry.dispose();
        // materials disposed below via disposables list
        if (obj.dispose) obj.dispose();
      } else if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();
      }
    });
    for (const d of disposables) {
      if (d && typeof d.dispose === "function") d.dispose();
    }
    disposables.length = 0;
  }

  return { group, update, setDayNight, dispose };
}
