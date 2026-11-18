// Camera choreography for the exterior explorer. Pure math only (no Three.js), so
// framing, collision avoidance and flight arcs are unit-testable in Node.
// Coordinates: metres, +X east, +Y up, +Z south (north = negative Z).

const UP = [0, 1, 0];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = a => Math.hypot(a[0], a[1], a[2]);
const normalize = a => { const l = length(a) || 1; return scale(a, 1 / l); };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rad = deg => deg * Math.PI / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Canopy envelopes (crown radius r, full height) of trees near a point. */
export function treeObstacles(trees = [], center = [0, 0, 0], radius = 300) {
  const out = [];
  for (const t of trees) {
    if (Math.abs(t.x - center[0]) > radius || Math.abs(t.z - center[2]) > radius) continue;
    const r = Math.max(1.5, t.r || 0);
    out.push({ id: 'tree', minX: t.x - r, maxX: t.x + r, minZ: t.z - r, maxZ: t.z + r, h: t.height || 12 });
  }
  return out;
}

/** Axis-aligned building envelopes used for line-of-sight and flight clearance. */
export function obstaclesFrom(facilities, heightOf = f => f.h) {
  return facilities.map(f => ({
    id: f.id,
    minX: f.x - f.w / 2, maxX: f.x + f.w / 2,
    minZ: f.z - f.d / 2, maxZ: f.z + f.d / 2,
    h: heightOf(f),
  }));
}

export function pointInBox(p, box, margin = 0) {
  return p[0] > box.minX - margin && p[0] < box.maxX + margin &&
    p[2] > box.minZ - margin && p[2] < box.maxZ + margin &&
    p[1] < box.h + margin && p[1] > -margin;
}

/** Slab test: does segment a→b pass through the (margin-expanded) envelope? */
export function segmentHitsBox(a, b, box, margin = 0) {
  const min = [box.minX - margin, -margin, box.minZ - margin];
  const max = [box.maxX + margin, box.h + margin, box.maxZ + margin];
  const d = sub(b, a);
  let t0 = 0, t1 = 1;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (a[i] < min[i] || a[i] > max[i]) return false;
      continue;
    }
    let near = (min[i] - a[i]) / d[i], far = (max[i] - a[i]) / d[i];
    if (near > far) [near, far] = [far, near];
    t0 = Math.max(t0, near); t1 = Math.min(t1, far);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * Viewport area left free by opaque UI. Panels hugging an edge (tall on the left or
 * right, wide along the top or bottom) shrink the free frame; small floating cards
 * are ignored so they never push the building into a sliver.
 */
export function freeViewport(rects, width, height) {
  const free = { left: 0, right: 0, top: 0, bottom: 0 };
  for (const r of rects) {
    if (!r || r.width <= 0 || r.height <= 0) continue;
    const wide = r.width > width * .5, tall = r.height > height * .3;
    if (wide && r.top < height * .2) free.top = Math.max(free.top, r.bottom / height);
    else if (wide && r.top > height * .25) free.bottom = Math.max(free.bottom, (height - r.top) / height);
    else if (tall && r.left > width * .5) free.right = Math.max(free.right, (width - r.left) / width);
    else if (tall && r.right < width * .5) free.left = Math.max(free.left, r.right / width);
  }
  // Never let UI claim more than 80% of either axis.
  const cap = (a, b) => { const s = a + b; return s > .8 ? [a * .8 / s, b * .8 / s] : [a, b]; };
  [free.left, free.right] = cap(free.left, free.right);
  [free.top, free.bottom] = cap(free.top, free.bottom);
  return free;
}

/**
 * Where in normalized device coordinates the subject should sit: on the left
 * rule-of-thirds line of the free frame when it is landscape, centred when portrait.
 */
export function compositionPoint(free, aspect) {
  const fw = 1 - free.left - free.right, fh = 1 - free.top - free.bottom;
  const landscape = fw * aspect / fh > 1.15;
  const sx = free.left + fw * (landscape ? 1 / 3 : .5);
  const sy = free.top + fh * (landscape ? .46 : .5);
  return { x: sx * 2 - 1, y: 1 - sy * 2, fw, fh, landscape };
}

const DEFAULT_AZIMUTHS = [28, -28, 55, -55, 0, 90, -90, 135, -135, 180];
const DEFAULT_ELEVATIONS = [26, 34, 44, 56];

/**
 * A composed oblique of one facility: framed to fill the free part of the screen,
 * offset to a thirds line, and never looking through (or starting inside) another
 * building. Returns camera position and orbit target as [x,y,z] arrays.
 */
export function composeShot(facility, {
  height = facility.h, obstacles = [], aspect = 16 / 9, fov = 42,
  free = { left: 0, right: 0, top: 0, bottom: 0 }, fill = .46,
  azimuths = DEFAULT_AZIMUTHS, elevations = DEFAULT_ELEVATIONS, minY = 3, requireClear = false,
} = {}) {
  const tanV = Math.tan(rad(fov) / 2);
  const comp = compositionPoint(free, aspect);
  const radius = .5 * Math.hypot(facility.w, facility.d, height);
  const room = Math.min(comp.fh, comp.fw * aspect * (comp.landscape ? .67 : 1));
  const dist = Math.max(radius * 1.35 + 20, radius / (fill * tanV * Math.max(room, .15)));
  const center = [facility.x, height * .4, facility.z];
  const others = obstacles.filter(o => o.id !== facility.id);
  let fallback = null;
  for (const el of elevations) {
    for (const az of azimuths) {
      const dir = [Math.sin(rad(az)) * Math.cos(rad(el)), Math.sin(rad(el)), Math.cos(rad(az)) * Math.cos(rad(el))];
      let position = add(center, scale(dir, dist));
      const forward = normalize(sub(center, position));
      const right = normalize(cross(forward, UP));
      const camUp = cross(right, forward);
      const halfH = dist * tanV, halfW = halfH * aspect;
      // Translate camera and target together: the subject lands exactly on (x,y) NDC.
      const shift = add(scale(right, -comp.x * halfW), scale(camUp, -comp.y * halfH));
      position = add(position, shift);
      const target = add(center, shift);
      if (position[1] < minY) continue;
      const shot = { position, target, azimuth: az, elevation: el, distance: dist, clear: true };
      fallback ??= { ...shot, clear: false };
      if (others.some(o => pointInBox(position, o, 4))) continue;
      if (others.some(o => segmentHitsBox(position, center, o, 1))) continue;
      return shot;
    }
  }
  return requireClear ? null : fallback;
}

/** Longer moves take longer, within the 0.9–2.2 s band; reduced motion is instant. */
export function flightDuration(from, to, fromTarget = from, toTarget = to, { reduced = false } = {}) {
  if (reduced) return 0;
  const travel = Math.max(length(sub(to, from)), length(sub(toTarget, fromTarget)) * .6);
  return Math.round(clamp(900 + travel * .9, 900, 2200));
}

function arcPoint(from, to, lift, t) {
  const p = lerp(from, to, t);
  p[1] += lift * 4 * t * (1 - t);
  return p;
}

/**
 * Flight between two shots. The camera rises over intervening roofs on a parabolic
 * arc sized by travel distance and raised until every sampled point clears the
 * building envelopes; the look-at point leads slightly so the destination resolves
 * before the camera settles.
 */
export function planFlight({ from, to, fromTarget, toTarget, obstacles = [], samples = 24, margin = 8 }) {
  const horizontal = Math.hypot(to[0] - from[0], to[2] - from[2]);
  let lift = horizontal > 120 ? Math.min(220, horizontal * .12) : 0;
  // Endpoints that already sit beside a facade (entrance courts) keep that facade.
  const relevant = obstacles.filter(o => !pointInBox(from, o, margin) && !pointInBox(to, o, margin));
  const blocked = l => {
    for (let i = 1; i < samples; i++) {
      const p = arcPoint(from, to, l, i / samples);
      if (relevant.some(o => pointInBox(p, o, margin))) return true;
    }
    return false;
  };
  for (let i = 0; i < 40 && blocked(lift); i++) lift += 12;
  return {
    lift,
    sample(t) {
      const k = clamp(t, 0, 1);
      const lead = 1 - Math.pow(1 - k, 1.35);
      return { position: arcPoint(from, to, lift, k), target: lerp(fromTarget, toTarget, lead) };
    },
  };
}
