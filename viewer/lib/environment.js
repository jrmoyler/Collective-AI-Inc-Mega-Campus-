// environment.js
// Self-contained procedural Three.js campus environment.
// THREE is injected (no import) to avoid version conflicts.
//
// Coordinate system: Z is UP. Ground = XY plane at z=0.
// X = East (0..1097), Y = North (0..664). Site center (548.5, 332, 0).
//
// AAA upgrade: believable campus ground — a textured asphalt road network
// painted EXACTLY along world.js ROADS (lane lines, crosswalks, curbs +
// sidewalks), grass / park beds that avoid building footprints, civic plazas,
// a shimmering reflecting-pool water feature, height-blended ground material,
// and a large subtle ground-fog atmosphere. Trees / solar / turbines retained
// and upgraded. Everything that should move animates in update().
//
// Export:
//   export function createEnvironment(THREE, scene, options = {})
//   -> { group, update(dt, elapsed, isNight), setDayNight(isNight), dispose() }

import {
  WORLD,
  ROADS,
  ROAD_WIDTH,
  SIDEWALK_WIDTH,
  FACILITIES,
  buildingFootprints,
} from './world.js';

export function createEnvironment(THREE, scene, options = {}) {
  // ---------------------------------------------------------------------------
  // Config / constants
  // ---------------------------------------------------------------------------
  const SITE_W = WORLD.width;   // X extent (1097)
  const SITE_H = WORLD.depth;   // Y extent (664)
  const CX = SITE_W / 2;
  const CY = SITE_H / 2;

  const opts = Object.assign(
    {
      treeCount: 820,
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
  const nightControlled = []; // { mat, night, day } or { mat, isColor, colorNight, colorDay }
  function registerEmissive(mat, nightVal, dayVal) {
    nightControlled.push({ mat, night: nightVal, day: dayVal });
    return mat;
  }

  // Animation handles
  const animatedWater = []; // { tex?, mat?, sx, sy }
  const lampMats = [];      // sidewalk/path lamp glow materials

  // Footprint rects (padded) for keeping detail off buildings.
  const footprints = buildingFootprints(3);
  function insideFootprint(x, y, pad = 0) {
    for (let i = 0; i < footprints.length; i++) {
      const r = footprints[i];
      if (x >= r.minX - pad && x <= r.maxX + pad && y >= r.minY - pad && y <= r.maxY + pad) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Road sampling helpers (distance to nearest road centerline)
  // ---------------------------------------------------------------------------
  function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    if (l2 < 1e-6) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function distToRoads(px, py) {
    let min = Infinity;
    for (const road of ROADS) {
      const p = road.pts;
      for (let i = 0; i < p.length - 1; i++) {
        const d = distToSegment(px, py, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]);
        if (d < min) min = d;
      }
    }
    return min;
  }

  // ---------------------------------------------------------------------------
  // Root group
  // ---------------------------------------------------------------------------
  const group = new THREE.Group();
  group.name = "campusEnvironment";

  // ===========================================================================
  // Procedural textures (CanvasTexture)
  // ===========================================================================
  function makeGroundTexture() {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    // mottled soil/turf base (warm dark earth)
    const base = ctx.createLinearGradient(0, 0, size, size);
    base.addColorStop(0, "#1b2a1c");
    base.addColorStop(0.5, "#16241a");
    base.addColorStop(1, "#1c2c1e");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    // grain blobs
    for (let i = 0; i < 5200; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = rrange(1, 7);
      const t = rand();
      const g = 30 + Math.floor(t * 40);
      ctx.fillStyle = `rgba(${18 + Math.floor(t * 16)},${g},${20 + Math.floor(t * 18)},${0.06 + rand() * 0.14})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 5);
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    track(tex);
    return tex;
  }

  function makeGrassTexture() {
    const size = 512;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#1f4d24";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4200; i++) {
      const x = rand() * size, y = rand() * size;
      const g = 70 + Math.floor(rand() * 90);
      ctx.strokeStyle = `rgba(${20 + Math.floor(rand() * 30)},${g},${30 + Math.floor(rand() * 30)},${0.10 + rand() * 0.22})`;
      ctx.lineWidth = 0.6 + rand() * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 3, y - rrange(2, 6));
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(40, 24);
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    track(tex);
    return tex;
  }

  function makeAsphaltTexture() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#22262c";
    ctx.fillRect(0, 0, size, size);
    // aggregate speckle
    for (let i = 0; i < 6000; i++) {
      const x = rand() * size, y = rand() * size;
      const v = 18 + Math.floor(rand() * 60);
      ctx.fillStyle = `rgba(${v},${v + 2},${v + 6},${0.10 + rand() * 0.22})`;
      ctx.fillRect(x, y, 1 + rand() * 1.5, 1 + rand() * 1.5);
    }
    // faint seams
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = "rgba(10,10,12,0.4)";
      ctx.lineWidth = 1;
      const y = rand() * size;
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    track(tex);
    return tex;
  }

  function makeConcreteTexture() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#5a5f66";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2600; i++) {
      const x = rand() * size, y = rand() * size;
      const v = 70 + Math.floor(rand() * 50);
      ctx.fillStyle = `rgba(${v},${v},${v + 4},${0.05 + rand() * 0.12})`;
      ctx.fillRect(x, y, 2, 2);
    }
    // expansion joints grid
    ctx.strokeStyle = "rgba(40,42,46,0.5)";
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) {
      const p = (i / 4) * size;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    track(tex);
    return tex;
  }

  function makeWaterNormalTexture() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0a3a6a";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1100; i++) {
      const x = rand() * size, y = rand() * size;
      const w = rrange(6, 26), h = rrange(1, 3);
      const a = 0.05 + rand() * 0.18;
      ctx.fillStyle = `rgba(${110 + Math.floor(rand() * 90)},${170 + Math.floor(rand() * 70)},${210 + Math.floor(rand() * 45)},${a})`;
      ctx.fillRect(x, y, w, h);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    track(tex);
    return tex;
  }

  // ===========================================================================
  // 1. GROUND — large base plane + developed campus turf, height-blended tone
  // ===========================================================================
  function buildGround() {
    // Far ground (extends well past site for horizon).
    const groundTex = makeGroundTexture();
    const groundGeo = track(new THREE.PlaneGeometry(3200, 2200, 1, 1));
    const groundMat = track(
      new THREE.MeshStandardMaterial({
        map: groundTex,
        color: 0x9fb89f,
        roughness: 0.98,
        metalness: 0.0,
      })
    );
    // subtle emissive lift at night so it isn't pitch black
    groundMat.emissive = new THREE.Color(0x0a140d);
    registerEmissive(groundMat, 0.6, 0.0);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(CX, CY, -0.25);
    ground.receiveShadow = true;
    group.add(ground);

    // Developed campus turf over the buildable area (richer green grass).
    const grassTex = makeGrassTexture();
    const padGeo = track(new THREE.PlaneGeometry(SITE_W + 60, SITE_H + 60, 1, 1));
    const padMat = track(
      new THREE.MeshStandardMaterial({
        map: grassTex,
        color: 0xa9c79f,
        roughness: 0.95,
        metalness: 0.0,
        emissive: new THREE.Color(0x0c1c10),
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    registerEmissive(padMat, 0.5, 0.0);
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(CX, CY, -0.12);
    pad.receiveShadow = true;
    group.add(pad);
  }

  // ===========================================================================
  // 2. ROAD NETWORK — asphalt + lane lines + crosswalks + sidewalks + curbs,
  //    painted along world.js ROADS so vehicles match the paint.
  // ===========================================================================
  // Instanced quad helper: we accumulate matrices and build one InstancedMesh
  // per material so the whole network is a handful of draw calls.
  function quadMatrix(ax, ay, bx, by, width, z) {
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 1e-4) return null;
    const ang = Math.atan2(dy, dx);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang);
    m.compose(
      new THREE.Vector3((ax + bx) / 2, (ay + by) / 2, z),
      q,
      new THREE.Vector3(len, width, 1)
    );
    return m;
  }

  function buildInstanced(geo, mat, matrices, opts2 = {}) {
    if (!matrices.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, matrices.length);
    for (let i = 0; i < matrices.length; i++) im.setMatrixAt(i, matrices[i]);
    im.instanceMatrix.needsUpdate = true;
    im.receiveShadow = opts2.receiveShadow !== false;
    im.castShadow = !!opts2.castShadow;
    group.add(im);
    return im;
  }

  function buildRoads() {
    const unitQuad = track(new THREE.PlaneGeometry(1, 1));

    // --- Materials ---
    const sidewalkMat = track(new THREE.MeshStandardMaterial({
      map: makeConcreteTexture(), color: 0x8a9099, roughness: 0.92, metalness: 0.02,
      emissive: new THREE.Color(0x10141a),
    }));
    registerEmissive(sidewalkMat, 0.35, 0.0);

    const asphaltMat = track(new THREE.MeshStandardMaterial({
      map: makeAsphaltTexture(), color: 0x2a2f36, roughness: 0.88, metalness: 0.04,
      emissive: new THREE.Color(0x06080c),
    }));
    registerEmissive(asphaltMat, 0.25, 0.0);

    const curbMat = track(new THREE.MeshStandardMaterial({
      color: 0xb8bcc2, roughness: 0.8, metalness: 0.05,
    }));

    const laneMat = track(new THREE.MeshStandardMaterial({
      color: 0xf2e9c8, roughness: 0.6, metalness: 0.0,
      emissive: new THREE.Color(0xb8a85a),
    }));
    registerEmissive(laneMat, 0.5, 0.08);

    const crossMat = track(new THREE.MeshStandardMaterial({
      color: 0xeef0f2, roughness: 0.6, metalness: 0.0,
      emissive: new THREE.Color(0x8a909a),
    }));
    registerEmissive(crossMat, 0.4, 0.06);

    // Matrix buckets (z ordering: sidewalk < asphalt < curb < lane < crosswalk)
    const sidewalkM = [], asphaltM = [], curbM = [], laneM = [], crossM = [];

    const halfRoad = ROAD_WIDTH / 2;
    const swW = SIDEWALK_WIDTH;

    for (const road of ROADS) {
      const p = road.pts;
      for (let i = 0; i < p.length - 1; i++) {
        const ax = p[i][0], ay = p[i][1], bx = p[i + 1][0], by = p[i + 1][1];
        const dx = bx - ax, dy = by - ay;
        const len = Math.hypot(dx, dy);
        if (len < 1e-3) continue;
        const nx = -dy / len, ny = dx / len; // unit normal

        // Sidewalk slab (road + both sidewalks wide), lowest.
        let m = quadMatrix(ax, ay, bx, by, ROAD_WIDTH + swW * 2 + 1.2, 0.02);
        if (m) sidewalkM.push(m);
        // Asphalt carriageway.
        m = quadMatrix(ax, ay, bx, by, ROAD_WIDTH, 0.05);
        if (m) asphaltM.push(m);
        // Curbs (thin strips at carriageway edges).
        const cox = nx * (halfRoad + 0.25), coy = ny * (halfRoad + 0.25);
        m = quadMatrix(ax + cox, ay + coy, bx + cox, by + coy, 0.6, 0.06);
        if (m) curbM.push(m);
        m = quadMatrix(ax - cox, ay - coy, bx - cox, by - coy, 0.6, 0.06);
        if (m) curbM.push(m);

        // Dashed centre lane line.
        const dash = 4, gap = 4;
        const ux = dx / len, uy = dy / len;
        let s = 2;
        while (s + dash < len) {
          const sx = ax + ux * s, sy = ay + uy * s;
          const ex = ax + ux * (s + dash), ey = ay + uy * (s + dash);
          const lm = quadMatrix(sx, sy, ex, ey, 0.45, 0.07);
          if (lm) laneM.push(lm);
          s += dash + gap;
        }

        // Solid edge lines.
        const eox = nx * (halfRoad - 1.0), eoy = ny * (halfRoad - 1.0);
        let em = quadMatrix(ax + eox, ay + eoy, bx + eox, by + eoy, 0.3, 0.07);
        if (em) laneM.push(em);
        em = quadMatrix(ax - eox, ay - eoy, bx - eox, by - eoy, 0.3, 0.07);
        if (em) laneM.push(em);
      }
    }

    // Crosswalks at avenue/street intersections (zebra stripes).
    const avenues = ROADS.filter(r => /^ave|ring/.test(r.name));
    const streets = ROADS.filter(r => /^st_/.test(r.name));
    // Collect simple intersection points: where a horizontal avenue crosses a
    // vertical street. Use straight avenues only (skip the ring perimeter loops).
    const hLines = [180, 330, 470];        // avenue Ys
    const vLines = [150, 470, 720, 975];   // street Xs
    function addCrosswalk(cx, cy, horizontal) {
      // stripes perpendicular to travel: place 6 stripes across the road
      const count = 6;
      const span = ROAD_WIDTH - 2;
      for (let k = 0; k < count; k++) {
        const off = (k / (count - 1) - 0.5) * span;
        let sm;
        if (horizontal) {
          // road runs along X -> stripes run along Y, offset along X
          sm = quadMatrix(cx + off, cy - (halfRoad - 1), cx + off, cy + (halfRoad - 1), 0.7, 0.08);
        } else {
          sm = quadMatrix(cx - (halfRoad - 1), cy + off, cx + (halfRoad - 1), cy + off, 0.7, 0.08);
        }
        if (sm) crossM.push(sm);
      }
    }
    for (const vx of vLines) {
      for (const hy of hLines) {
        // Two crosswalks per intersection (one on each crossing road), pulled back.
        addCrosswalk(vx, hy - (halfRoad + 3), false); // across the street, south side
        addCrosswalk(vx - (halfRoad + 3), hy, true);  // across the avenue, west side
      }
    }

    buildInstanced(unitQuad, sidewalkMat, sidewalkM);
    buildInstanced(unitQuad, asphaltMat, asphaltM);
    buildInstanced(unitQuad, curbMat, curbM, { receiveShadow: true });
    buildInstanced(unitQuad, laneMat, laneM, { receiveShadow: false });
    buildInstanced(unitQuad, crossMat, crossM, { receiveShadow: false });

    // Street lamps along avenues (glow at night).
    buildStreetLamps();
  }

  // ===========================================================================
  // 2b. STREET LAMPS — instanced poles + emissive lamp heads
  // ===========================================================================
  function buildStreetLamps() {
    const poleGeo = track(new THREE.CylinderGeometry(0.18, 0.22, 1, 6));
    poleGeo.rotateX(Math.PI / 2);
    poleGeo.translate(0, 0, 0.5);
    const poleMat = track(new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.6, metalness: 0.5 }));
    const headGeo = track(new THREE.SphereGeometry(0.7, 10, 8));
    const headMat = track(new THREE.MeshStandardMaterial({
      color: 0x2a2a22, emissive: new THREE.Color(0xffd27a), emissiveIntensity: 1.6, roughness: 0.4, metalness: 0.1,
    }));
    nightControlled.push({ mat: headMat, night: 1.8, day: 0.0 });
    lampMats.push(headMat);

    const lampPos = [];
    const poleH = 9;
    const offset = ROAD_WIDTH / 2 + SIDEWALK_WIDTH - 0.5;
    const placeAlong = (axis, fixed, from, to, step, normalSign) => {
      for (let s = from; s <= to; s += step) {
        if (axis === 'x') lampPos.push([s, fixed + normalSign * offset]);
        else lampPos.push([fixed + normalSign * offset, s]);
      }
    };
    placeAlong('x', 180, 90, 1010, 70, 1);
    placeAlong('x', 330, 90, 1010, 70, -1);
    placeAlong('x', 470, 90, 1010, 70, 1);
    placeAlong('y', 470, 90, 580, 70, 1);
    placeAlong('y', 720, 90, 580, 70, -1);

    // filter lamps that would sit inside buildings
    const lamps = lampPos.filter(([x, y]) => !insideFootprint(x, y, 2) &&
      x > 5 && x < SITE_W - 5 && y > 5 && y < SITE_H - 5);

    const poleIM = new THREE.InstancedMesh(poleGeo, poleMat, lamps.length);
    const headIM = new THREE.InstancedMesh(headGeo, headMat, lamps.length);
    poleIM.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    lamps.forEach(([x, y], i) => {
      pos.set(x, y, 0); scl.set(1, 1, poleH); q.identity();
      m.compose(pos, q, scl); poleIM.setMatrixAt(i, m);
      pos.set(x, y, poleH); scl.set(1, 1, 1);
      m.compose(pos, q, scl); headIM.setMatrixAt(i, m);
    });
    poleIM.instanceMatrix.needsUpdate = true;
    headIM.instanceMatrix.needsUpdate = true;
    group.add(poleIM);
    group.add(headIM);
  }

  // ===========================================================================
  // 3. PLAZAS / COURTYARDS near civic buildings (paved discs + ring trim)
  // ===========================================================================
  function buildPlazas() {
    const plazaMat = track(new THREE.MeshStandardMaterial({
      map: makeConcreteTexture(), color: 0x9aa0a8, roughness: 0.85, metalness: 0.05,
      emissive: new THREE.Color(0x10141a),
    }));
    registerEmissive(plazaMat, 0.3, 0.0);
    const trimMat = track(new THREE.MeshStandardMaterial({
      color: 0x2a3140, emissive: new THREE.Color(0x33cfd6), emissiveIntensity: 0.6,
      roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide, transparent: true, opacity: 0.85,
    }));
    registerEmissive(trimMat, 0.7, 0.12);

    // civic / public facilities that deserve a plaza
    const plazaIds = new Set([
      'civic_core', 'royal_library_academy', 'visitor_experience_center',
      'kinetic_energy_operations_center', 'aether_link_tower', 'nexus_transportation_hub',
    ]);
    for (const f of FACILITIES) {
      if (!plazaIds.has(f.id)) continue;
      const [x, y] = f.position;
      const r = Math.max(f.footprint_m[0], f.footprint_m[1]) * 0.62;
      const geo = track(new THREE.CircleGeometry(r, 56));
      const mesh = new THREE.Mesh(geo, plazaMat);
      mesh.position.set(x, y, 0.04);
      mesh.receiveShadow = true;
      group.add(mesh);
      // glowing ring trim
      const ringGeo = track(new THREE.RingGeometry(r - 1.4, r, 56));
      const ring = new THREE.Mesh(ringGeo, trimMat);
      ring.position.set(x, y, 0.05);
      group.add(ring);
    }
  }

  // ===========================================================================
  // 4. PARK BEDS — grass/garden patches in open areas away from roads/buildings
  // ===========================================================================
  function buildParks() {
    const parkMat = track(new THREE.MeshStandardMaterial({
      map: makeGrassTexture(), color: 0x8fd07a, roughness: 0.95, metalness: 0.0,
      emissive: new THREE.Color(0x0a1c0e), polygonOffset: true,
      polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    registerEmissive(parkMat, 0.4, 0.0);

    const matrices = [];
    const tmp = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    let attempts = 0, placed = 0;
    const want = 46;
    while (placed < want && attempts < want * 60) {
      attempts++;
      const x = rrange(40, SITE_W - 40);
      const y = rrange(40, SITE_H - 40);
      if (insideFootprint(x, y, 10)) continue;
      if (distToRoads(x, y) < ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 4) continue;
      const w = rrange(18, 46), h = rrange(14, 38);
      const ang = rand() * Math.PI;
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang);
      pos.set(x, y, 0.015);
      scl.set(w, h, 1);
      tmp.compose(pos, q, scl);
      matrices.push(tmp.clone());
      placed++;
    }
    const geo = track(new THREE.PlaneGeometry(1, 1));
    buildInstanced(geo, parkMat, matrices);
  }

  // ===========================================================================
  // 5. WATER FEATURE — reflecting pools / bands with animated shimmer
  // ===========================================================================
  function makeWaterMaterial() {
    const tex = makeWaterNormalTexture();
    const mat = track(new THREE.MeshStandardMaterial({
      map: tex, color: 0x0e4b86, emissive: new THREE.Color(0x06203f), emissiveIntensity: 0.7,
      metalness: 0.9, roughness: 0.08,
    }));
    registerEmissive(mat, 0.7, 0.25);
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
      mesh.position.set(cx, cy, 0.08);
      mesh.receiveShadow = true;
      waterParent.add(mesh);
      animatedWater.push({ tex, sx, sy });
    }

    // Perimeter water (outside the ring road) — north & east channels.
    addBand(CX, SITE_H + 22, SITE_W + 160, 40, 28, 1, 0.012, 0.004);
    addBand(SITE_W + 24, CY, 40, SITE_H + 160, 1, 22, 0.004, 0.013);

    // Central civic reflecting pool at site centre.
    const { mat: poolMat, tex: poolTex } = makeWaterMaterial();
    poolTex.repeat.set(4, 4);
    const poolGeo = track(new THREE.CircleGeometry(26, 56));
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(CX, CY, 0.06);
    pool.receiveShadow = true;
    waterParent.add(pool);
    animatedWater.push({ tex: poolTex, sx: 0.006, sy: 0.006 });
    // pool rim
    const rimMat = track(new THREE.MeshStandardMaterial({ color: 0x8a9099, roughness: 0.8, metalness: 0.05 }));
    const rimGeo = track(new THREE.RingGeometry(26, 28, 56));
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(CX, CY, 0.05);
    waterParent.add(rim);
  }

  // ===========================================================================
  // 6. ALGAE PONDS (luminescent green, pulsing) — keeps story detail
  // ===========================================================================
  const algaeMats = [];
  function buildAlgae() {
    const algaeParent = new THREE.Group();
    algaeParent.name = "algae";
    group.add(algaeParent);
    const base = [975, 232]; // gaia_synthesis_bio_energy_center vicinity
    const offsets = [[20, 28], [54, 14], [10, -26], [40, -34]];
    for (let i = 0; i < offsets.length; i++) {
      const mat = track(new THREE.MeshStandardMaterial({
        color: 0x0c3a1c, emissive: new THREE.Color(0x19c850), emissiveIntensity: 1.4,
        roughness: 0.35, metalness: 0.1,
      }));
      nightControlled.push({ mat, night: 1.4, day: 0.5 });
      algaeMats.push({ mat, base: 1.4, phase: rand() * Math.PI * 2 });
      const r = rrange(9, 13);
      const geo = track(new THREE.CircleGeometry(r, 32));
      const m = new THREE.Mesh(geo, mat);
      const px = base[0] + offsets[i][0], py = base[1] + offsets[i][1];
      m.position.set(px, py, 0.07);
      m.receiveShadow = true;
      algaeParent.add(m);
    }
  }

  // ===========================================================================
  // 7. GROUND FOG — large soft additive plane hugging the ground
  // ===========================================================================
  let fogMat = null;
  function buildGroundFog() {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(180,210,235,0.5)");
    g.addColorStop(0.5, "rgba(150,185,215,0.22)");
    g.addColorStop(1, "rgba(120,160,200,0.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = track(new THREE.CanvasTexture(c));
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    fogMat = track(new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0.35, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    }));
    const geo = track(new THREE.PlaneGeometry(2600, 1800));
    const mesh = new THREE.Mesh(geo, fogMat);
    mesh.position.set(CX, CY, 3.5);
    mesh.renderOrder = 5;
    group.add(mesh);
  }

  // ===========================================================================
  // Tree placement helpers
  // ===========================================================================
  function nearBuilding(x, y, d) {
    return insideFootprint(x, y, d);
  }
  function nearRoad(x, y, d) {
    return distToRoads(x, y) < d;
  }

  // ===========================================================================
  // 8. TREES (InstancedMesh: trunk + foliage)
  // ===========================================================================
  function buildTrees() {
    const N = opts.treeCount;
    const trunkGeo = track(new THREE.CylinderGeometry(0.5, 0.8, 1, 6));
    trunkGeo.rotateX(Math.PI / 2);
    trunkGeo.translate(0, 0, 0.5);
    const foliageGeo = track(new THREE.IcosahedronGeometry(1, 1));

    const trunkMat = track(new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9, metalness: 0.0 }));
    const foliageMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.0 }));
    nightControlled.push({ mat: foliageMat, isColor: true, colorNight: 0x9fb89f, colorDay: 0xffffff });

    const trunkIM = new THREE.InstancedMesh(trunkGeo, trunkMat, N);
    const foliageIM = new THREE.InstancedMesh(foliageGeo, foliageMat, N);
    trunkIM.castShadow = true; trunkIM.receiveShadow = true;
    foliageIM.castShadow = true; foliageIM.receiveShadow = true;

    const greens = [0x2f7a32, 0x35893a, 0x3da045, 0x328338, 0x4a9c4e];
    const color = new THREE.Color();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const up = new THREE.Vector3(0, 0, 1);

    const TX0 = CX - 1400, TX1 = CX + 1400;
    const TY0 = CY - 1000, TY1 = CY + 1000;

    let placed = 0, attempts = 0;
    const maxAttempts = N * 30;

    function tryPlace(x, y) {
      if (nearBuilding(x, y, 6)) return false;
      if (nearRoad(x, y, ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 2.5)) return false;
      // avoid perimeter water
      if (y > SITE_H + 4 && y < SITE_H + 42) return false;
      if (x > SITE_W + 4 && x < SITE_W + 42) return false;
      const i = placed;
      const trunkH = rrange(6, 13);
      const foliageR = rrange(4.5, 8.5) * (trunkH / 9);
      const yaw = rand() * Math.PI * 2;

      q.setFromAxisAngle(up, yaw);
      pos.set(x, y, 0);
      scl.set(rrange(0.8, 1.3), rrange(0.8, 1.3), trunkH);
      m.compose(pos, q, scl);
      trunkIM.setMatrixAt(i, m);

      pos.set(x, y, trunkH + foliageR * 0.35);
      scl.set(foliageR, foliageR, foliageR * rrange(0.9, 1.25));
      m.compose(pos, q, scl);
      foliageIM.setMatrixAt(i, m);

      color.setHex(greens[Math.floor(rand() * greens.length)]);
      color.offsetHSL((rand() - 0.5) * 0.03, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.06);
      foliageIM.setColorAt(i, color);
      placed++;
      return true;
    }

    const targetPerimeter = Math.floor(N * 0.55);
    while (placed < N && attempts < maxAttempts) {
      attempts++;
      let x, y;
      if (placed < targetPerimeter) {
        x = rrange(TX0 + 30, TX1 - 30);
        y = rrange(TY0 + 30, TY1 - 30);
        const insideSite = x > -20 && x < SITE_W + 20 && y > -20 && y < SITE_H + 20;
        if (insideSite) continue;
        const dx = Math.max(0, Math.max(-x, x - SITE_W));
        const dy = Math.max(0, Math.max(-y, y - SITE_H));
        if (Math.hypot(dx, dy) > 420 && rand() > 0.32) continue;
      } else {
        x = rrange(10, SITE_W - 10);
        y = rrange(10, SITE_H - 10);
      }
      tryPlace(x, y);
    }
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
  // 9. SOLAR FIELDS (InstancedMesh per array) — at open corners
  // ===========================================================================
  function buildSolar() {
    const panelGeo = track(new THREE.BoxGeometry(7, 4.5, 0.25));
    const panelMat = track(new THREE.MeshStandardMaterial({
      color: 0x10204a, emissive: new THREE.Color(0x0a1838), emissiveIntensity: 0.5,
      roughness: 0.2, metalness: 0.7,
    }));
    registerEmissive(panelMat, 0.5, 0.15);
    const postGeo = track(new THREE.CylinderGeometry(0.18, 0.18, 1, 5));
    postGeo.rotateX(Math.PI / 2);
    postGeo.translate(0, 0, 0.5);
    const postMat = track(new THREE.MeshStandardMaterial({ color: 0x333a44, roughness: 0.8, metalness: 0.3 }));

    // corners well clear of ring road and buildings
    const corners = [[90, 100], [1007, 100], [90, 564], [1007, 564]];
    const cols = 14, rows = 7, spX = 9, spY = 6.5;
    const tilt = (20 * Math.PI) / 180;
    const total = corners.length * cols * rows;
    const panelIM = new THREE.InstancedMesh(panelGeo, panelMat, total);
    const postIM = new THREE.InstancedMesh(postGeo, postMat, total);
    panelIM.castShadow = true; panelIM.receiveShadow = true; postIM.castShadow = true;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3(1, 1, 1);
    const tiltQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt);
    let idx = 0;
    for (const [bx, by] of corners) {
      const ox = bx - ((cols - 1) * spX) / 2;
      const oy = by - ((rows - 1) * spY) / 2;
      for (let r = 0; r < rows; r++) {
        for (let cc = 0; cc < cols; cc++) {
          const px = ox + cc * spX, py = oy + r * spY;
          q.copy(tiltQ); pos.set(px, py, 1.0); scl.set(1, 1, 1);
          m.compose(pos, q, scl); panelIM.setMatrixAt(idx, m);
          q.identity(); pos.set(px, py, 0); scl.set(1, 1, 0.9);
          m.compose(pos, q, scl); postIM.setMatrixAt(idx, m);
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
  // 10. WIND TURBINES
  // ===========================================================================
  const turbines = [];
  function buildTurbines() {
    const whiteMat = track(new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.5, metalness: 0.15 }));
    const nacelleMat = track(new THREE.MeshStandardMaterial({ color: 0xcfd6dd, roughness: 0.5, metalness: 0.2 }));
    const poleH = 55;
    const sites = [[40, SITE_H + 30], [SITE_W + 30, SITE_H + 30], [SITE_W + 30, -22], [40, -22]];
    const poleGeo = track(new THREE.CylinderGeometry(1.4, 2.2, poleH, 10));
    poleGeo.rotateX(Math.PI / 2);
    poleGeo.translate(0, 0, poleH / 2);
    const nacelleGeo = track(new THREE.BoxGeometry(3.2, 7, 3));
    const bladeGeo = track(new THREE.BoxGeometry(1.0, 28, 0.5));
    bladeGeo.translate(0, 14, 0);
    const capGeo = track(new THREE.SphereGeometry(1.3, 10, 8));

    for (const [sx, sy] of sites) {
      const t = new THREE.Group();
      t.position.set(sx, sy, 0);
      const pole = new THREE.Mesh(poleGeo, whiteMat);
      pole.castShadow = true; pole.receiveShadow = true;
      t.add(pole);
      const facing = Math.atan2(sy - CY, sx - CX);
      const nacelle = new THREE.Mesh(nacelleGeo, nacelleMat);
      nacelle.position.set(0, 0, poleH + 1.2);
      nacelle.rotation.z = facing;
      nacelle.castShadow = true;
      t.add(nacelle);
      const hubOffset = 2.4;
      const hub = new THREE.Group();
      hub.position.set(Math.cos(facing) * hubOffset, Math.sin(facing) * hubOffset, poleH + 1.2);
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
      hub.add(new THREE.Mesh(capGeo, nacelleMat));
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
  buildPlazas();
  buildParks();
  buildWater();
  buildAlgae();
  buildTrees();
  buildSolar();
  buildTurbines();
  buildGroundFog();

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
    if (fogMat) fogMat.opacity = currentNight ? 0.22 : 0.38;
  }
  setDayNight(currentNight);

  // ===========================================================================
  // Update loop
  // ===========================================================================
  function update(dt, elapsed, isNight) {
    if (typeof isNight === "boolean" && isNight !== currentNight) {
      setDayNight(isNight);
    }
    const e = typeof elapsed === "number" ? elapsed : 0;

    // water shimmer (scroll the ripple texture)
    for (let i = 0; i < animatedWater.length; i++) {
      const w = animatedWater[i];
      w.tex.offset.x = (w.sx * e) % 1;
      w.tex.offset.y = (w.sy * e) % 1;
      w.tex.needsUpdate = true;
    }

    // algae pulse
    const pulseScale = currentNight ? 1.0 : 0.4;
    for (let i = 0; i < algaeMats.length; i++) {
      const a = algaeMats[i];
      const base = currentNight ? 1.4 : 0.5;
      a.mat.emissiveIntensity = base + Math.sin(e * 1.6 + a.phase) * 0.45 * pulseScale;
    }

    // subtle lamp glow flicker at night
    if (currentNight) {
      for (let i = 0; i < lampMats.length; i++) {
        lampMats[i].emissiveIntensity = 1.7 + Math.sin(e * 3.0 + i) * 0.12;
      }
    }

    // turbine blades
    for (let i = 0; i < turbines.length; i++) {
      turbines[i].hub.rotation.z += dt * turbines[i].speed;
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
