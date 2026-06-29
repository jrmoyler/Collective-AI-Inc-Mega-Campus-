// population.js — brings the Collective AI Mega Campus to LIFE.
// Vehicles drive the roads, pedestrians walk the sidewalks and plazas, trees
// sway, street lamps glow at dusk and a few drones drift overhead.
//
// THREE (r185) is injected (no import) to avoid version conflicts.
//
// Coordinate system: Z is UP. Ground = XY plane at z=0. Units = meters.
// X = East (0..1097), Y = North (0..664). Shares ROADS / footprints with
// world.js so all traffic stays on the carriageway and nothing clips buildings.
//
// Everything is rendered with THREE.InstancedMesh (shared geometry + material,
// per-instance matrices) so thousands of agents animate at 60fps. The hot loop
// in update() does ZERO allocation — a single shared dummy Object3D composes
// every matrix and all paths are precomputed once at construction.
//
// Export:
//   export function createPopulation(THREE, scene, opts = {})
//   -> { update(dt, elapsed, isNight), setDayNight(isNight),
//        setQuality(level), dispose() }
//   opts may include { quality:'high' }.

import {
  WORLD, ROADS, ROAD_WIDTH, SIDEWALK_WIDTH,
  FACILITIES, buildingFootprints, isInsideBuilding,
} from './world.js';

export function createPopulation(THREE, scene, opts = {}) {
  // ===========================================================================
  // Config / quality tiers
  // ===========================================================================
  const QUALITY = {
    low:  { vehicles: 24,  peds: 110, trees: 280, lamps: 0.5, drones: 4 },
    med:  { vehicles: 40,  peds: 230, trees: 480, lamps: 0.75, drones: 8 },
    high: { vehicles: 58,  peds: 380, trees: 760, lamps: 1.0, drones: 14 },
  };
  let quality = QUALITY[opts.quality] ? opts.quality : 'high';
  let isNight = opts.startNight != null ? !!opts.startNight : true;

  const LANE_OFFSET   = ROAD_WIDTH * 0.25;                 // half a half-road
  const SIDEWALK_OFF  = ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2;
  const LAMP_SPACING  = 46;   // m between lamp posts along a road
  const TREE_SPACING  = 30;   // m between avenue trees

  // ---------------------------------------------------------------------------
  // Seeded PRNG (mulberry32) — deterministic placement, matches viewer style.
  // ---------------------------------------------------------------------------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32((opts.seed || 90210) >>> 0);
  const rr = (a, b) => a + (b - a) * rand();

  // ---------------------------------------------------------------------------
  // Bookkeeping for dispose()
  // ---------------------------------------------------------------------------
  const disposables = [];
  const track = (x) => { disposables.push(x); return x; };
  const nightControlled = []; // { mat, night, day } emissiveIntensity targets

  const dummy = new THREE.Object3D();   // shared matrix composer (no allocs)
  const rects = buildingFootprints(2);   // padded footprints for exclusion

  // ---------------------------------------------------------------------------
  // Root group
  // ---------------------------------------------------------------------------
  const group = new THREE.Group();
  group.name = 'campusPopulation';
  scene.add(group);

  // ===========================================================================
  // Path utilities — turn ROADS polylines into sampled, length-parameterised
  // lanes so vehicles and pedestrians can advance at constant speed.
  // ===========================================================================
  // A "path" = { pts:[{x,y}], cum:[lengths], total } with helper pointAt(s).
  function buildPath(points) {
    const pts = points.map(p => ({ x: p[0], y: p[1] }));
    const cum = [0];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      cum.push(total);
    }
    return { pts, cum, total };
  }

  // Offset a polyline sideways by `off` meters (left of travel = +normal).
  // Returns a new array of [x,y]. Used to derive lanes and sidewalks.
  function offsetPolyline(points, off) {
    const out = [];
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(n - 1, i + 1)];
      let dx = next[0] - prev[0];
      let dy = next[1] - prev[1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      // left normal of travel direction (dir rotated +90°): (-dy, dx)
      out.push([points[i][0] - dy * off, points[i][1] + dx * off]);
    }
    return out;
  }

  // Write position + tangent at arclength s into out {x,y,dx,dy}. No allocs.
  const _sample = { x: 0, y: 0, dx: 1, dy: 0 };
  function sampleAt(path, s) {
    const { pts, cum, total } = path;
    if (total <= 0) { _sample.x = pts[0].x; _sample.y = pts[0].y; _sample.dx = 1; _sample.dy = 0; return _sample; }
    s = ((s % total) + total) % total;
    // binary-ish linear scan (paths are short polylines)
    let i = 1;
    while (i < cum.length && cum[i] < s) i++;
    const a = pts[i - 1], b = pts[i];
    const segLen = cum[i] - cum[i - 1] || 1;
    const t = (s - cum[i - 1]) / segLen;
    _sample.x = a.x + (b.x - a.x) * t;
    _sample.y = a.y + (b.y - a.y) * t;
    let dx = b.x - a.x, dy = b.y - a.y;
    const dl = Math.hypot(dx, dy) || 1;
    _sample.dx = dx / dl; _sample.dy = dy / dl;
    return _sample;
  }

  // Build driving lanes (one each direction, lane-offset) and walking paths.
  const drivePaths = [];   // { path, dir } dir=+1 forward, -1 reversed feel
  const walkPaths  = [];   // sidewalk centerlines (both sides of every road)
  for (const road of ROADS) {
    const right = offsetPolyline(road.pts, -LANE_OFFSET);
    const left  = offsetPolyline(road.pts,  LANE_OFFSET);
    drivePaths.push({ path: buildPath(right), dir: 1 });
    drivePaths.push({ path: buildPath(left),  dir: -1 });
    walkPaths.push(buildPath(offsetPolyline(road.pts,  SIDEWALK_OFF)));
    walkPaths.push(buildPath(offsetPolyline(road.pts, -SIDEWALK_OFF)));
  }

  // ===========================================================================
  // Helper: register a night-controlled emissive material.
  // ===========================================================================
  function emissive(mat, nightVal, dayVal) {
    nightControlled.push({ mat, night: nightVal, day: dayVal });
    mat.emissiveIntensity = isNight ? nightVal : dayVal;
    return mat;
  }

  // ===========================================================================
  // VEHICLES — stylized low-poly cars/vans driving the carriageway.
  // Body is an InstancedMesh; a second thin InstancedMesh of cabin glass sits
  // on top. Night head/taillights are emissive quads instanced separately.
  // ===========================================================================
  const vehicles = [];      // { dpi, s, speed, lane, w, l, h, color }
  let vehMesh = null, cabinMesh = null, headMesh = null, tailMesh = null;
  const VEH_COLORS = [
    0xdfe6ee, 0x2b2f36, 0x9aa3ad, 0xc0392b, 0x2e6da4,
    0x3c8d6e, 0xe0a93b, 0x6c5b9e,
  ];

  function buildVehicles(count) {
    // Shared unit geometries (scaled per-instance via dummy).
    const bodyGeo = track(new THREE.BoxGeometry(1, 1, 1));
    bodyGeo.translate(0, 0, 0.5); // sit on wheels (origin at ground)
    const cabinGeo = track(new THREE.BoxGeometry(0.6, 0.82, 1));
    cabinGeo.translate(0, -0.05, 0.5);
    const lightGeo = track(new THREE.PlaneGeometry(1, 1));

    const bodyMat = track(new THREE.MeshStandardMaterial({
      roughness: 0.45, metalness: 0.55, vertexColors: false,
    }));
    // per-instance color via instanceColor
    const cabinMat = track(emissive(new THREE.MeshStandardMaterial({
      color: 0x10151c, roughness: 0.15, metalness: 0.85,
      emissive: 0x0a1830, emissiveIntensity: 0,
    }), 0.18, 0.0));
    const headMat = track(emissive(new THREE.MeshBasicMaterial({
      color: 0xfff4d6, transparent: true, opacity: 0.95,
    }), 1.0, 0.0));
    headMat.toneMapped = false;
    const tailMat = track(emissive(new THREE.MeshBasicMaterial({
      color: 0xff2a2a, transparent: true, opacity: 0.95,
    }), 1.0, 0.0));
    tailMat.toneMapped = false;

    vehMesh   = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
    cabinMesh = new THREE.InstancedMesh(cabinGeo, cabinMat, count);
    headMesh  = new THREE.InstancedMesh(lightGeo, headMat, count * 2);
    tailMesh  = new THREE.InstancedMesh(lightGeo, tailMat, count * 2);
    vehMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cabinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    headMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    tailMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    vehMesh.castShadow = true;
    vehMesh.name = 'vehicles';

    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const isVan = rand() < 0.32;
      const w = isVan ? rr(2.1, 2.4) : rr(1.7, 2.0);
      const l = isVan ? rr(5.4, 6.6) : rr(3.8, 4.8);
      const h = isVan ? rr(2.2, 2.7) : rr(1.4, 1.7);
      const dp = (i % drivePaths.length); // spread vehicles across all lanes
      const color = VEH_COLORS[(rand() * VEH_COLORS.length) | 0];
      col.setHex(color);
      vehMesh.setColorAt(i, col);
      vehicles.push({
        dpi: dp, s: rand() * drivePaths[dp].path.total,
        speed: rr(7, 16), w, l, h, color,
      });
    }
    vehMesh.instanceColor.needsUpdate = true;
    group.add(vehMesh, cabinMesh, headMesh, tailMesh);
  }

  function updateVehicles(dt, elapsed) {
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      const dp = drivePaths[v.dpi];
      v.s += v.speed * dt * dp.dir;
      const sm = sampleAt(dp.path, v.s);
      const dir = dp.dir;
      const dx = sm.dx * dir, dy = sm.dy * dir;
      const yaw = Math.atan2(dy, dx);

      // Body
      dummy.position.set(sm.x, sm.y, 0);
      dummy.rotation.set(0, 0, yaw);
      dummy.scale.set(v.l, v.w, v.h);
      dummy.updateMatrix();
      vehMesh.setMatrixAt(i, dummy.matrix);

      // Cabin (slightly raised, same yaw)
      dummy.position.set(sm.x, sm.y, v.h * 0.55);
      dummy.scale.set(v.l, v.w, v.h * 0.85);
      dummy.updateMatrix();
      cabinMesh.setMatrixAt(i, dummy.matrix);

      // Lights: two head quads at front, two tail quads at rear, facing out.
      const cz = v.h * 0.45;
      const fwdX = dx, fwdY = dy;
      const sideX = -dy, sideY = dx;
      const halfL = v.l * 0.5, halfW = v.w * 0.32;
      for (let k = 0; k < 2; k++) {
        const sgn = k === 0 ? 1 : -1;
        // headlight
        const hx = sm.x + fwdX * halfL + sideX * halfW * sgn;
        const hy = sm.y + fwdY * halfL + sideY * halfW * sgn;
        dummy.position.set(hx, hy, cz);
        dummy.rotation.set(Math.PI / 2, 0, yaw + Math.PI / 2);
        dummy.scale.set(0.5, 0.5, 0.5);
        dummy.updateMatrix();
        headMesh.setMatrixAt(i * 2 + k, dummy.matrix);
        // taillight
        const tx = sm.x - fwdX * halfL + sideX * halfW * sgn;
        const ty = sm.y - fwdY * halfL + sideY * halfW * sgn;
        dummy.position.set(tx, ty, cz);
        dummy.rotation.set(Math.PI / 2, 0, yaw + Math.PI / 2);
        dummy.scale.set(0.4, 0.4, 0.4);
        dummy.updateMatrix();
        tailMesh.setMatrixAt(i * 2 + k, dummy.matrix);
      }
    }
    vehMesh.instanceMatrix.needsUpdate = true;
    cabinMesh.instanceMatrix.needsUpdate = true;
    headMesh.instanceMatrix.needsUpdate = true;
    tailMesh.instanceMatrix.needsUpdate = true;
  }

  // ===========================================================================
  // PEDESTRIANS — capsule/box-stack people walking sidewalks & plazas.
  // Two instanced meshes (body + head) sharing per-agent transforms, with a
  // subtle vertical walk-bob and gait sway baked in the loop.
  // ===========================================================================
  const peds = [];   // { wpi, s, speed, side, h, phase, color }
  let pedBody = null, pedHead = null;
  const SKIN = [0xf1c9a5, 0xe0ac80, 0xc68642, 0x8d5524, 0xffdbac];
  const SHIRT = [0x3b6ea5, 0xb5485a, 0x4a8a64, 0xd9a441, 0x5a4e8c, 0x2f3b45, 0xcfd6dd];

  function buildPeds(count) {
    const bodyGeo = track(new THREE.CylinderGeometry(0.26, 0.32, 1.0, 6));
    // Cylinder default axis = Y; rotate so it stands along +Z, origin at feet.
    bodyGeo.rotateX(Math.PI / 2);
    bodyGeo.translate(0, 0, 0.5);
    const headGeo = track(new THREE.SphereGeometry(0.16, 8, 6));

    const bodyMat = track(new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 }));
    const headMat = track(new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.0 }));

    pedBody = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
    pedHead = new THREE.InstancedMesh(headGeo, headMat, count);
    pedBody.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    pedHead.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    pedBody.castShadow = true;
    pedBody.name = 'pedestrians';

    const col = new THREE.Color();
    let made = 0, guard = 0;
    while (made < count && guard < count * 12) {
      guard++;
      const onSidewalk = rand() < 0.78;
      let wpi = 0, s = 0, x = 0, y = 0;
      if (onSidewalk) {
        wpi = (rand() * walkPaths.length) | 0;
        const wp = walkPaths[wpi];
        s = rand() * wp.total;
        const sm = sampleAt(wp, s);
        x = sm.x; y = sm.y;
      } else {
        // plaza wanderer — pick a spot near a building entrance, not inside one
        const f = FACILITIES[(rand() * FACILITIES.length) | 0];
        const ang = rand() * Math.PI * 2;
        const rad = Math.max(f.footprint_m[0], f.footprint_m[1]) * 0.5 + rr(6, 22);
        x = f.position[0] + Math.cos(ang) * rad;
        y = f.position[1] + Math.sin(ang) * rad;
        wpi = -1;
      }
      if (x < 4 || x > WORLD.width - 4 || y < 4 || y > WORLD.depth - 4) continue;
      if (isInsideBuilding(x, y, 2, rects)) continue;

      const h = rr(1.6, 1.92);
      col.setHex(SHIRT[(rand() * SHIRT.length) | 0]);
      pedBody.setColorAt(made, col);
      col.setHex(SKIN[(rand() * SKIN.length) | 0]);
      pedHead.setColorAt(made, col);

      peds.push({
        wpi, s, speed: rr(1.1, 1.7),
        x, y, h, phase: rand() * Math.PI * 2,
        // plaza wander velocity
        vx: Math.cos(rand() * Math.PI * 2), vy: Math.sin(rand() * Math.PI * 2),
      });
      made++;
    }
    pedBody.count = made;
    pedHead.count = made;
    pedBody.instanceColor.needsUpdate = true;
    pedHead.instanceColor.needsUpdate = true;
    group.add(pedBody, pedHead);
  }

  function updatePeds(dt, elapsed) {
    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      let x, y, yaw;
      if (p.wpi >= 0) {
        p.s += p.speed * dt;
        const wp = walkPaths[p.wpi];
        const sm = sampleAt(wp, p.s);
        x = sm.x; y = sm.y;
        yaw = Math.atan2(sm.dy, sm.dx);
      } else {
        // plaza wander — drift, gently steer back toward center if near edge
        let nx = p.x + p.vx * p.speed * dt;
        let ny = p.y + p.vy * p.speed * dt;
        if (nx < 8 || nx > WORLD.width - 8) p.vx = -p.vx;
        if (ny < 8 || ny > WORLD.depth - 8) p.vy = -p.vy;
        if (isInsideBuilding(nx, ny, 2, rects)) { p.vx = -p.vx; p.vy = -p.vy; nx = p.x; ny = p.y; }
        p.x = nx; p.y = ny;
        x = nx; y = ny;
        yaw = Math.atan2(p.vy, p.vx);
      }
      const bob = Math.sin(elapsed * 7 + p.phase) * 0.04;
      const sway = Math.sin(elapsed * 7 + p.phase) * 0.06;

      dummy.position.set(x, y, bob);
      dummy.rotation.set(0, 0, yaw + sway * 0.3);
      dummy.scale.set(1, 1, p.h);
      dummy.updateMatrix();
      pedBody.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y, p.h + 0.16 + bob);
      dummy.rotation.set(0, 0, yaw);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      pedHead.setMatrixAt(i, dummy.matrix);
    }
    pedBody.instanceMatrix.needsUpdate = true;
    pedHead.instanceMatrix.needsUpdate = true;
  }

  // ===========================================================================
  // TREES — instanced trunk + foliage scattered along avenues and open ground.
  // Never inside footprints, never on the carriageway. Gentle wind sway.
  // ===========================================================================
  const trees = [];   // { x, y, scale, phase, baseQuat... } we store x,y,scale,phase
  let trunkMesh = null, foliageMesh = null;

  function onRoad(x, y) {
    // reject points within half a carriageway of any road centerline
    const limit = ROAD_WIDTH / 2 + 1.5;
    for (const road of ROADS) {
      const pts = road.pts;
      for (let i = 1; i < pts.length; i++) {
        const ax = pts[i - 1][0], ay = pts[i - 1][1];
        const bx = pts[i][0], by = pts[i][1];
        const dx = bx - ax, dy = by - ay;
        const ll = dx * dx + dy * dy || 1;
        let t = ((x - ax) * dx + (y - ay) * dy) / ll;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = ax + dx * t, py = ay + dy * t;
        if (Math.hypot(x - px, y - py) < limit) return true;
      }
    }
    return false;
  }

  function buildTrees(count) {
    const trunkGeo = track(new THREE.CylinderGeometry(0.18, 0.28, 1, 5));
    trunkGeo.rotateX(Math.PI / 2);
    trunkGeo.translate(0, 0, 0.5);
    const foliageGeo = track(new THREE.ConeGeometry(1, 1, 7));
    foliageGeo.rotateX(Math.PI / 2);
    foliageGeo.translate(0, 0, 0.5);

    const trunkMat = track(new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95, metalness: 0 }));
    const foliageMat = track(new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0 }));

    trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    foliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, count);
    foliageMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    trunkMesh.castShadow = true;
    foliageMesh.castShadow = true;
    trunkMesh.name = 'trees';

    // Candidate placement: bias along avenues, fill remainder with open ground.
    const avenueSpots = [];
    for (const road of ROADS) {
      const path = buildPath(offsetPolyline(road.pts, SIDEWALK_OFF + 3));
      const path2 = buildPath(offsetPolyline(road.pts, -(SIDEWALK_OFF + 3)));
      for (const pth of [path, path2]) {
        for (let s = TREE_SPACING * 0.5; s < pth.total; s += TREE_SPACING) {
          const sm = sampleAt(pth, s);
          avenueSpots.push([sm.x, sm.y]);
        }
      }
    }

    const col = new THREE.Color();
    let made = 0, guard = 0, ai = 0;
    while (made < count && guard < count * 20) {
      guard++;
      let x, y;
      if (ai < avenueSpots.length && rand() < 0.55) {
        const sp = avenueSpots[ai++];
        x = sp[0] + rr(-2.5, 2.5);
        y = sp[1] + rr(-2.5, 2.5);
      } else {
        x = rr(10, WORLD.width - 10);
        y = rr(10, WORLD.depth - 10);
      }
      if (isInsideBuilding(x, y, 4, rects)) continue;
      if (onRoad(x, y)) continue;

      const scale = rr(2.6, 5.4);
      const g = 0.32 + rand() * 0.28;
      col.setRGB(0.10 + rand() * 0.10, g, 0.18 + rand() * 0.12);
      foliageMesh.setColorAt(made, col);

      trees.push({ x, y, scale, phase: rand() * Math.PI * 2, lean: rr(0, 0.05) });
      made++;
    }
    trunkMesh.count = made;
    foliageMesh.count = made;

    // Trunks are static — write once.
    for (let i = 0; i < made; i++) {
      const t = trees[i];
      dummy.position.set(t.x, t.y, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(t.scale * 0.32, t.scale * 0.32, t.scale * 0.55);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);
    }
    trunkMesh.instanceMatrix.needsUpdate = true;
    foliageMesh.instanceColor.needsUpdate = true;
    group.add(trunkMesh, foliageMesh);
  }

  function updateTrees(dt, elapsed) {
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      const sway = Math.sin(elapsed * 1.1 + t.phase) * 0.04 + t.lean;
      dummy.position.set(t.x, t.y, t.scale * 0.5);
      dummy.rotation.set(sway, sway * 0.6, 0);
      dummy.scale.set(t.scale * 0.85, t.scale * 0.85, t.scale * 1.15);
      dummy.updateMatrix();
      foliageMesh.setMatrixAt(i, dummy.matrix);
    }
    foliageMesh.instanceMatrix.needsUpdate = true;
  }

  // ===========================================================================
  // STREET LAMPS — instanced posts along the roads; emissive heads glow at
  // night. A handful of cheap real PointLights add warmth near the center.
  // ===========================================================================
  const lamps = [];   // { x, y }
  let postMesh = null, headLampMesh = null;
  const realLights = [];

  function buildLamps(density) {
    const spots = [];
    for (const road of ROADS) {
      const path = buildPath(offsetPolyline(road.pts, SIDEWALK_OFF + 0.5));
      const path2 = buildPath(offsetPolyline(road.pts, -(SIDEWALK_OFF + 0.5)));
      const step = LAMP_SPACING / Math.max(0.25, density);
      for (const pth of [path, path2]) {
        for (let s = step * 0.5; s < pth.total; s += step) {
          const sm = sampleAt(pth, s);
          if (isInsideBuilding(sm.x, sm.y, 0, rects)) continue;
          spots.push([sm.x, sm.y]);
        }
      }
    }
    const count = spots.length;

    const postGeo = track(new THREE.CylinderGeometry(0.12, 0.16, 1, 5));
    postGeo.rotateX(Math.PI / 2);
    postGeo.translate(0, 0, 0.5);
    const headGeo = track(new THREE.SphereGeometry(0.45, 8, 6));

    const postMat = track(new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6, metalness: 0.7 }));
    const headMat = track(emissive(new THREE.MeshStandardMaterial({
      color: 0xffe6b0, emissive: 0xffd27a, emissiveIntensity: isNight ? 2.4 : 0.0,
      roughness: 0.3, metalness: 0.1,
    }), 2.4, 0.0));
    headMat.toneMapped = false;

    postMesh = new THREE.InstancedMesh(postGeo, postMat, count);
    headLampMesh = new THREE.InstancedMesh(headGeo, headMat, count);
    postMesh.name = 'streetLamps';

    const LAMP_H = 7.5;
    for (let i = 0; i < count; i++) {
      const [x, y] = spots[i];
      lamps.push({ x, y });
      dummy.position.set(x, y, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, LAMP_H);
      dummy.updateMatrix();
      postMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y, LAMP_H);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      headLampMesh.setMatrixAt(i, dummy.matrix);
    }
    postMesh.instanceMatrix.needsUpdate = true;
    headLampMesh.instanceMatrix.needsUpdate = true;
    group.add(postMesh, headLampMesh);

    // A few cheap real lights near campus center / civic core for warmth.
    const hubs = [[565, 370], [470, 330], [720, 330], [548, 470]];
    for (const [x, y] of hubs) {
      const pl = new THREE.PointLight(0xffd27a, isNight ? 1.4 : 0.0, 130, 1.8);
      pl.position.set(x, y, 8);
      group.add(pl);
      realLights.push(pl);
    }
  }

  // ===========================================================================
  // DRONES — small instanced quads drifting above the campus on lazy orbits.
  // ===========================================================================
  const drones = [];   // { cx, cy, r, h, speed, phase, blink }
  let droneMesh = null;

  function buildDrones(count) {
    const geo = track(new THREE.BoxGeometry(1.2, 1.2, 0.3));
    const mat = track(emissive(new THREE.MeshStandardMaterial({
      color: 0x20262e, emissive: 0x35d0ff, emissiveIntensity: isNight ? 1.6 : 0.4,
      roughness: 0.4, metalness: 0.6,
    }), 1.6, 0.4));
    mat.toneMapped = false;
    droneMesh = new THREE.InstancedMesh(geo, mat, count);
    droneMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    droneMesh.name = 'drones';
    for (let i = 0; i < count; i++) {
      drones.push({
        cx: rr(120, WORLD.width - 120),
        cy: rr(120, WORLD.depth - 120),
        r: rr(40, 160), h: rr(45, 95),
        speed: rr(0.1, 0.35) * (rand() < 0.5 ? 1 : -1),
        phase: rand() * Math.PI * 2,
      });
    }
    group.add(droneMesh);
  }

  function updateDrones(dt, elapsed) {
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      const a = elapsed * d.speed + d.phase;
      const x = d.cx + Math.cos(a) * d.r;
      const y = d.cy + Math.sin(a) * d.r;
      const z = d.h + Math.sin(elapsed * 0.8 + d.phase) * 3;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, a + Math.PI / 2);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      droneMesh.setMatrixAt(i, dummy.matrix);
    }
    droneMesh.instanceMatrix.needsUpdate = true;
  }

  // ===========================================================================
  // FLAVOR — flagpoles & planters by the Visitor & Experience Center.
  // ===========================================================================
  function buildFlavor() {
    const vc = FACILITIES.find(f => f.id === 'visitor_experience_center');
    if (!vc) return;
    const poleGeo = track(new THREE.CylinderGeometry(0.1, 0.1, 1, 6));
    poleGeo.rotateX(Math.PI / 2); poleGeo.translate(0, 0, 0.5);
    const poleMat = track(new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.8 }));
    const flagGeo = track(new THREE.PlaneGeometry(3, 1.6));
    const flagMat = track(new THREE.MeshStandardMaterial({
      color: 0x4a90d9, roughness: 0.7, metalness: 0, side: THREE.DoubleSide,
    }));
    const n = 4;
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, n);
    const flags = new THREE.InstancedMesh(flagGeo, flagMat, n);
    flags.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const baseX = vc.position[0] - 30;
    const baseY = vc.position[1] - vc.footprint_m[1] / 2 - 8;
    const POLE_H = 12;
    for (let i = 0; i < n; i++) {
      const x = baseX + i * 16, y = baseY;
      dummy.position.set(x, y, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, POLE_H);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
      flavorFlags.push({ x, y, h: POLE_H, mesh: flags, idx: i });
    }
    poles.instanceMatrix.needsUpdate = true;
    group.add(poles, flags);
  }
  const flavorFlags = [];
  function updateFlavor(dt, elapsed) {
    for (let i = 0; i < flavorFlags.length; i++) {
      const f = flavorFlags[i];
      const wave = Math.sin(elapsed * 2 + i) * 0.25;
      dummy.position.set(f.x + 1.5, f.y, f.h - 1.2);
      dummy.rotation.set(0, 0, wave);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      f.mesh.setMatrixAt(f.idx, dummy.matrix);
    }
    if (flavorFlags.length) flavorFlags[0].mesh.instanceMatrix.needsUpdate = true;
  }

  // ===========================================================================
  // Build everything for the active quality tier.
  // ===========================================================================
  function buildAll() {
    const q = QUALITY[quality];
    buildVehicles(q.vehicles);
    buildPeds(q.peds);
    buildTrees(q.trees);
    buildLamps(q.lamps);
    buildDrones(q.drones);
    buildFlavor();
    applyDayNight();
  }

  function teardownAll() {
    // Remove meshes and dispose geometries/materials, then reset arrays.
    for (const child of group.children.slice()) group.remove(child);
    for (const d of disposables) { if (d && d.dispose) d.dispose(); }
    disposables.length = 0;
    nightControlled.length = 0;
    vehicles.length = 0; peds.length = 0; trees.length = 0;
    lamps.length = 0; drones.length = 0; flavorFlags.length = 0; realLights.length = 0;
    vehMesh = cabinMesh = headMesh = tailMesh = null;
    pedBody = pedHead = trunkMesh = foliageMesh = null;
    postMesh = headLampMesh = droneMesh = null;
  }

  // ===========================================================================
  // Day / night
  // ===========================================================================
  function applyDayNight() {
    for (const nc of nightControlled) {
      nc.mat.emissiveIntensity = isNight ? nc.night : nc.day;
    }
    // Vehicle lights fully off in day for a clean look.
    for (const pl of realLights) pl.intensity = isNight ? 1.4 : 0.0;
  }

  function setDayNight(night) {
    isNight = !!night;
    applyDayNight();
  }

  function setQuality(level) {
    if (!QUALITY[level] || level === quality) return;
    quality = level;
    teardownAll();
    buildAll();
  }

  // ===========================================================================
  // Frame update — advance everything. Zero allocation in this hot path.
  // ===========================================================================
  function update(dt, elapsed, night) {
    if (night != null) isNightCached(night);
    updateVehicles(dt, elapsed);
    updatePeds(dt, elapsed);
    updateTrees(dt, elapsed);
    updateDrones(dt, elapsed);
    updateFlavor(dt, elapsed);
  }
  // toggle emissives only when the night flag actually changes
  let _lastNight = isNight;
  function isNightCached(night) {
    if (!!night !== _lastNight) { _lastNight = !!night; setDayNight(night); }
  }

  function dispose() {
    teardownAll();
    if (group.parent) group.parent.remove(group);
  }

  // ---------------------------------------------------------------------------
  buildAll();

  return { update, setDayNight, setQuality, dispose, group };
}
