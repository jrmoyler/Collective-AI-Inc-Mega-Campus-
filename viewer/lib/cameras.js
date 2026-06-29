// cameras.js
// AAA camera director for the Three.js campus viewer — orbit, first-person
// walk, and an automatic cinematic tour. THREE is injected (no import) to
// avoid version conflicts with the vendored r185 build.
//
// Coordinate system: Z is UP, units = METERS. Ground = XY plane at z=0.
// camera.up is (0,0,1). Campus X ∈ [0,1097], Y ∈ [0,664].
//
// Export:
//   export function createCameraDirector(THREE, opts)
//   opts = { camera, domElement, orbitControls, scene }
//   -> director (see API block at bottom of this file)

import { WORLD, FACILITIES, buildingFootprints } from './world.js';

export function createCameraDirector(THREE, opts = {}) {
  const camera        = opts.camera;
  const domElement    = opts.domElement;
  const orbitControls = opts.orbitControls;
  const scene         = opts.scene;

  // ---------------------------------------------------------------------------
  // Config / constants
  // ---------------------------------------------------------------------------
  const MODES = ['orbit', 'walk', 'cinematic'];

  const EYE        = WORLD.eyeHeight;       // 1.7 m
  const BOUND_PAD  = 2.0;                    // keep this far off campus edges
  const COLL_PAD   = 1.5;                    // building footprint inflation (m)

  const WALK_SPEED   = 7.0;                  // m/s base ground speed
  const SPRINT_MULT  = 2.1;
  const ACCEL        = 9.0;                  // velocity lerp rate (1/s)
  const LOOK_SENS    = 0.0022;              // radians per pixel
  const PITCH_LIMIT  = THREE.MathUtils.degToRad(85);
  const HOP_VELOCITY = 3.4;                  // m/s initial hop
  const GRAVITY      = 14.0;                 // m/s^2

  const CINE_LOOP    = 78;                   // seconds for a full tour loop

  const MIN_X = BOUND_PAD,            MAX_X = WORLD.width  - BOUND_PAD;
  const MIN_Y = BOUND_PAD,            MAX_Y = WORLD.depth  - BOUND_PAD;

  // Collision footprints — precomputed ONCE (campus geometry is static).
  const FOOTPRINTS = buildingFootprints(COLL_PAD);

  function facility(id) { return FACILITIES.find(f => f.id === id); }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let mode      = 'orbit';
  let moving    = false;                    // translating this frame (for audio)
  const changeCbs = [];

  // saved orbit state so walk/cinematic can restore on exit
  const savedPos    = new THREE.Vector3();
  const savedTarget = new THREE.Vector3();
  let   savedHadControls = false;

  // --- orbit flyTo easing ---
  let fly = null; // { p0, p1, t0, t1, dur, start }

  // --- walk state ---
  let yaw = 0, pitch = 0;                    // look angles (radians)
  let pointerLocked = false;
  const playerPos = new THREE.Vector3();     // x,y on ground, z = eye height
  const velocity  = new THREE.Vector3();     // horizontal velocity (x,y)
  let   vertVel   = 0;                        // hop vertical velocity
  let   hopZ      = 0;                        // hop offset above EYE
  let   bobPhase  = 0;                        // head-bob accumulator
  const keys = Object.create(null);          // pressed key map

  // --- cinematic state ---
  let cineTime = 0;
  let pathCurve = null, lookCurve = null;

  const _fwd   = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _tmp   = new THREE.Vector3();
  const _look  = new THREE.Vector3();

  // ===========================================================================
  // Listener bookkeeping — every addEventListener is mirrored here so dispose()
  // and mode switches never leak handlers.
  // ===========================================================================
  const bound = []; // { target, type, fn, opts }
  function on(target, type, fn, o) {
    target.addEventListener(type, fn, o);
    bound.push({ target, type, fn, opts: o });
  }
  function off(target, type, fn) {
    for (let i = bound.length - 1; i >= 0; i--) {
      const b = bound[i];
      if (b.target === target && b.type === type && b.fn === fn) {
        b.target.removeEventListener(b.type, b.fn, b.opts);
        bound.splice(i, 1);
      }
    }
  }
  function offAll() {
    while (bound.length) {
      const b = bound.pop();
      b.target.removeEventListener(b.type, b.fn, b.opts);
    }
  }

  // ===========================================================================
  // Cinematic — Catmull-Rom spline tour
  // ===========================================================================
  function buildCinematicCurves() {
    const cx = WORLD.width / 2, cy = WORLD.depth / 2;

    // Landmarks the tour should showcase, in tour order.
    const hero   = facility('neural_block_data_center');
    const tower  = facility('aether_link_tower');
    const civic  = facility('civic_core');
    const hotel  = facility('grand_conference_hotel');
    const farm   = facility('gaia_synthesis_vertical_farm');

    const lm = (f, dz) => new THREE.Vector3(f.position[0], f.position[1],
                                            (f ? f.height_m : 0) + (dz || 0));

    // Camera path: high hero establishing shot → sweeping descents past the
    // landmarks → low avenue fly-bys → climb back to the hero to close the loop.
    const path = [
      new THREE.Vector3(cx - 360, cy - 520, 470),                 // high hero establishing
      new THREE.Vector3(hero.position[0] - 140, hero.position[1] - 220, 300),
      new THREE.Vector3(hero.position[0] + 60,  hero.position[1] + 30,  150), // sweep over data center
      new THREE.Vector3(tower.position[0] - 70, tower.position[1] - 110, 90), // descend past Aether Link
      new THREE.Vector3(civic.position[0],      civic.position[1] - 90,  28), // low fly-by, Civic Core plaza
      new THREE.Vector3(720, 330, 16),                            // low fly-by down avenue (st_ce / ave_mid)
      new THREE.Vector3(hotel.position[0] - 120, hotel.position[1] - 70, 60),  // sweep to Grand Conference Hotel
      new THREE.Vector3(farm.position[0] + 140,  farm.position[1] + 40, 120),  // rise past Gaia Vertical Farm
      new THREE.Vector3(cx + 380, cy + 420, 360),                 // wide climbing arc
      new THREE.Vector3(cx + 60,  cy - 560, 460),                 // back toward hero altitude
    ];

    // LookAt path: a separate curve aimed at landmark crowns / plazas so the
    // framing stays composed and the eye is always led somewhere interesting.
    const look = [
      lm(hero, -8),
      lm(hero, -6),
      lm(hero, -4),
      lm(tower, 4),
      new THREE.Vector3(civic.position[0], civic.position[1], 10),
      new THREE.Vector3(770, 360, 8),
      lm(hotel, -2),
      lm(farm, 2),
      new THREE.Vector3(cx, cy, 60),
      lm(hero, -8),
    ];

    pathCurve = new THREE.CatmullRomCurve3(path, true, 'catmullrom', 0.5);
    lookCurve = new THREE.CatmullRomCurve3(look, true, 'catmullrom', 0.5);
  }

  // Slow, dramatic ease-in-out so starts/ends of the loop glide.
  function cineEase(u) { return 0.5 - 0.5 * Math.cos(u * Math.PI * 2); }

  function updateCinematic(dt) {
    if (!pathCurve) buildCinematicCurves();
    cineTime = (cineTime + dt) % CINE_LOOP;

    const lin = cineTime / CINE_LOOP;
    // Blend the linear param with a gentle eased version for dramatic pacing
    // without ever stalling the camera entirely.
    const u = THREE.MathUtils.clamp(0.65 * lin + 0.35 * cineEase(lin), 0, 1);

    pathCurve.getPointAt(u % 1, _tmp);
    camera.position.copy(_tmp);

    // Look target leads slightly ahead of the camera along its own curve.
    lookCurve.getPointAt((u + 0.015) % 1, _look);
    camera.up.set(0, 0, 1);
    camera.lookAt(_look);
  }

  // ===========================================================================
  // Walk — first-person presence with pointer lock + collision
  // ===========================================================================
  function requestLock() {
    if (mode === 'walk' && domElement.requestPointerLock) domElement.requestPointerLock();
  }
  function onPointerLockChange() {
    pointerLocked = (document.pointerLockElement === domElement);
  }
  function onPointerLockError() { pointerLocked = false; }

  function onMouseMove(e) {
    if (!pointerLocked) return;
    yaw   -= e.movementX * LOOK_SENS;
    pitch -= e.movementY * LOOK_SENS;
    pitch  = THREE.MathUtils.clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT);
  }
  function onKeyDown(e) {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
  }
  function onKeyUp(e) { keys[e.code] = false; }

  // Resolve one axis of intended motion against building footprints.
  function blocked(x, y) {
    for (let i = 0; i < FOOTPRINTS.length; i++) {
      const r = FOOTPRINTS[i];
      if (x >= r.minX && x <= r.maxX && y >= r.minY && y <= r.maxY) return true;
    }
    return false;
  }

  function enterWalk() {
    // Seed the player from where orbit left off, projected to ground + eye.
    yaw = Math.atan2(savedTarget.y - savedPos.y, savedTarget.x - savedPos.x);
    pitch = 0;
    playerPos.set(
      THREE.MathUtils.clamp(savedPos.x, MIN_X, MAX_X),
      THREE.MathUtils.clamp(savedPos.y, MIN_Y, MAX_Y),
      EYE
    );
    // If we happen to spawn inside a building, nudge to campus center.
    if (blocked(playerPos.x, playerPos.y)) {
      playerPos.set(WORLD.width / 2, WORLD.depth / 2, EYE);
    }
    velocity.set(0, 0, 0);
    vertVel = 0; hopZ = 0; bobPhase = 0;

    on(domElement, 'click', requestLock);
    on(document, 'pointerlockchange', onPointerLockChange);
    on(document, 'pointerlockerror', onPointerLockError);
    on(document, 'mousemove', onMouseMove);
    on(window, 'keydown', onKeyDown);
    on(window, 'keyup', onKeyUp);
  }

  function exitWalk() {
    if (document.pointerLockElement === domElement && document.exitPointerLock) {
      document.exitPointerLock();
    }
    pointerLocked = false;
    for (const k in keys) keys[k] = false;
    off(domElement, 'click', requestLock);
    off(document, 'pointerlockchange', onPointerLockChange);
    off(document, 'pointerlockerror', onPointerLockError);
    off(document, 'mousemove', onMouseMove);
    off(window, 'keydown', onKeyDown);
    off(window, 'keyup', onKeyUp);
  }

  function updateWalk(dt) {
    // Facing vectors on the ground plane (Z-up).
    _fwd.set(Math.cos(yaw), Math.sin(yaw), 0);
    _right.set(Math.sin(yaw), -Math.cos(yaw), 0);

    // Desired direction from WASD / arrows.
    let ix = 0, iy = 0;
    if (keys['KeyW'] || keys['ArrowUp'])    iy += 1;
    if (keys['KeyS'] || keys['ArrowDown'])  iy -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) ix += 1;
    if (keys['KeyA'] || keys['ArrowLeft'])  ix -= 1;

    const sprint = (keys['ShiftLeft'] || keys['ShiftRight']) ? SPRINT_MULT : 1;
    const speed  = WALK_SPEED * sprint;

    _tmp.set(0, 0, 0);
    if (ix || iy) {
      _tmp.addScaledVector(_fwd, iy).addScaledVector(_right, ix);
      if (_tmp.lengthSq() > 0) _tmp.normalize().multiplyScalar(speed);
    }

    // Smooth acceleration toward target velocity.
    const a = Math.min(1, ACCEL * dt);
    velocity.x += (_tmp.x - velocity.x) * a;
    velocity.y += (_tmp.y - velocity.y) * a;

    // Hop (Space) — gentle, only from the ground.
    if ((keys['Space']) && hopZ === 0 && vertVel === 0) vertVel = HOP_VELOCITY;
    if (vertVel !== 0 || hopZ > 0) {
      vertVel -= GRAVITY * dt;
      hopZ = Math.max(0, hopZ + vertVel * dt);
      if (hopZ === 0) vertVel = 0;
    }

    // Integrate with per-axis collision resolution (slide along walls).
    const dx = velocity.x * dt;
    const dy = velocity.y * dt;
    let nx = THREE.MathUtils.clamp(playerPos.x + dx, MIN_X, MAX_X);
    if (blocked(nx, playerPos.y)) nx = playerPos.x;          // X blocked → slide on Y
    let ny = THREE.MathUtils.clamp(playerPos.y + dy, MIN_Y, MAX_Y);
    if (blocked(nx, ny)) ny = playerPos.y;                    // Y blocked → slide on X

    const movedSq = (nx - playerPos.x) ** 2 + (ny - playerPos.y) ** 2;
    playerPos.x = nx; playerPos.y = ny;

    moving = pointerLocked && movedSq > 1e-6;

    // Subtle head-bob while moving on the ground.
    let bob = 0;
    if (moving && hopZ === 0) {
      bobPhase += dt * (8.5 + sprint * 1.5);
      bob = Math.sin(bobPhase) * 0.045 * sprint;
    } else {
      bobPhase *= 0.9;
    }

    camera.position.set(playerPos.x, playerPos.y, EYE + hopZ + bob);

    // Apply look: forward from yaw/pitch.
    const cp = Math.cos(pitch);
    _look.set(
      camera.position.x + Math.cos(yaw) * cp,
      camera.position.y + Math.sin(yaw) * cp,
      camera.position.z + Math.sin(pitch)
    );
    camera.up.set(0, 0, 1);
    camera.lookAt(_look);
  }

  // ===========================================================================
  // Orbit — leave OrbitControls in charge; ease flyTo when requested
  // ===========================================================================
  function updateOrbit(dt) {
    moving = false;
    if (fly) {
      const now = performance.now();
      let t = (now - fly.start) / fly.dur;
      if (t >= 1) { t = 1; }
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
      camera.position.lerpVectors(fly.p0, fly.p1, e);
      if (orbitControls) orbitControls.target.lerpVectors(fly.t0, fly.t1, e);
      if (t >= 1) fly = null;
    }
    if (orbitControls && orbitControls.enabled) orbitControls.update();
  }

  // ===========================================================================
  // Mode machine
  // ===========================================================================
  function captureOrbitState() {
    savedPos.copy(camera.position);
    if (orbitControls) {
      savedTarget.copy(orbitControls.target);
      savedHadControls = true;
    } else {
      camera.getWorldDirection(_tmp);
      savedTarget.copy(camera.position).addScaledVector(_tmp, 50);
    }
  }

  function setMode(next) {
    if (!MODES.includes(next) || next === mode) return;
    const prev = mode;

    // tear down previous mode
    if (prev === 'walk') exitWalk();
    if (prev === 'cinematic') cineTime = cineTime; // (no listeners to remove)

    // capture a clean orbit anchor before leaving orbit
    if (prev === 'orbit') captureOrbitState();

    mode = next;

    if (next === 'orbit') {
      if (orbitControls) {
        orbitControls.enabled = true;
        // restore a sane framing from wherever we ended up
        camera.up.set(0, 0, 1);
        orbitControls.target.copy(savedTarget);
        orbitControls.update();
      }
    } else {
      // disable orbit for non-orbit modes
      if (orbitControls) orbitControls.enabled = false;
      if (next === 'walk') enterWalk();
      // cinematic builds lazily on first update
    }

    for (const cb of changeCbs) { try { cb(mode); } catch (_) {} }
  }

  // ===========================================================================
  // Public API
  // ===========================================================================
  const director = {
    MODES: MODES.slice(),

    setMode,
    getMode() { return mode; },

    update(dt, elapsed) {
      dt = Math.min(dt || 0, 0.1); // clamp huge frame gaps (tab switch)
      if (mode === 'orbit')          updateOrbit(dt);
      else if (mode === 'walk')      updateWalk(dt);
      else if (mode === 'cinematic') updateCinematic(dt);
    },

    startCinematic() { cineTime = 0; setMode('cinematic'); },
    stopCinematic()  { if (mode === 'cinematic') setMode('orbit'); },

    isWalking() { return mode === 'walk'; },
    isMoving()  { return moving; },

    onChange(cb) { if (typeof cb === 'function') changeCbs.push(cb); },

    flyTo(posArr, targetArr, durationMs) {
      if (mode !== 'orbit') setMode('orbit');
      fly = {
        p0: camera.position.clone(),
        p1: new THREE.Vector3(posArr[0], posArr[1], posArr[2]),
        t0: orbitControls ? orbitControls.target.clone() : new THREE.Vector3(),
        t1: new THREE.Vector3(targetArr[0], targetArr[1], targetArr[2]),
        dur: Math.max(1, durationMs || 1200),
        start: performance.now(),
      };
    },

    dispose() {
      if (mode === 'walk') exitWalk();
      offAll();
      changeCbs.length = 0;
      pathCurve = null; lookCurve = null;
      fly = null;
    },
  };

  // Default to orbit: make sure controls are live.
  if (orbitControls) orbitControls.enabled = true;

  return director;
}
