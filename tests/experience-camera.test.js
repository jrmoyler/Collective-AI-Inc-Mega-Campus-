import test from 'node:test';
import assert from 'node:assert/strict';
import {FACILITIES} from '../viewer/campus/data.js';
import {obstaclesFrom, pointInBox, segmentHitsBox, freeViewport, compositionPoint, composeShot, flightDuration, planFlight} from '../viewer/campus/experience-camera.js';

const obstacles = obstaclesFrom(FACILITIES);
const tan21 = Math.tan(21 * Math.PI / 180);

function ndc(shot, point, aspect) {
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const norm = a => { const l = Math.hypot(...a); return a.map(v => v / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const f = norm(sub(shot.target, shot.position)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  const rel = sub(point, shot.position), depth = dot(rel, f);
  return [dot(rel, r) / (depth * tan21 * aspect), dot(rel, u) / (depth * tan21)];
}

test('segment and point tests respect envelope height and margins', () => {
  const box = {minX: 0, maxX: 10, minZ: 0, maxZ: 10, h: 20};
  assert.ok(segmentHitsBox([-5, 5, 5], [15, 5, 5], box));
  assert.ok(!segmentHitsBox([-5, 25, 5], [15, 25, 5], box));
  assert.ok(segmentHitsBox([-5, 22, 5], [15, 22, 5], box, 3));
  assert.ok(pointInBox([5, 1, 5], box) && !pointInBox([5, 21, 5], box));
});

test('free viewport ignores floating cards and caps edge panels', () => {
  const free = freeViewport([
    {left: 0, right: 1440, top: 0, bottom: 70, width: 1440, height: 70},          // header
    {left: 1116, right: 1416, top: 85, bottom: 760, width: 300, height: 675},     // detail panel
    {left: 24, right: 414, top: 600, bottom: 790, width: 390, height: 190},       // tour caption
  ], 1440, 900);
  assert.ok(Math.abs(free.right - 324 / 1440) < 1e-9);
  assert.ok(Math.abs(free.top - 70 / 900) < 1e-9);
  assert.equal(free.left, 0);
  assert.equal(free.bottom, 0);
  const crowded = freeViewport([{left: 0, right: 360, top: 100, bottom: 800, width: 360, height: 700}], 360, 800);
  assert.ok(crowded.top + crowded.bottom <= .8 + 1e-9);
});

test('composed shots place the facility on the free-frame thirds line without occlusion', () => {
  const aspect = 1440 / 900;
  const free = {left: 0, right: .225, top: .08, bottom: 0};
  const point = compositionPoint(free, aspect);
  assert.ok(point.landscape && point.x < -.2);
  for (const f of FACILITIES) {
    const shot = composeShot(f, {obstacles, aspect, free});
    assert.ok(shot, f.key);
    assert.ok([...shot.position, ...shot.target].every(Number.isFinite), f.key);
    assert.ok(shot.position[1] >= 3, f.key);
    const [x, y] = ndc(shot, [f.x, f.h * .4, f.z], aspect);
    assert.ok(Math.abs(x - point.x) < .02 && Math.abs(y - point.y) < .02, `${f.key} at ${x},${y}`);
    if (shot.clear) {
      assert.ok(!obstacles.some(o => o.id !== f.id && pointInBox(shot.position, o, 4)), f.key);
      assert.ok(!obstacles.some(o => o.id !== f.id && segmentHitsBox(shot.position, [f.x, f.h * .4, f.z], o, 1)), f.key);
    }
  }
  assert.ok(FACILITIES.filter(f => composeShot(f, {obstacles, aspect, free}).clear).length >= 33);
});

test('portrait phone framing centres the subject above a bottom sheet', () => {
  const free = {left: 0, right: 0, top: .08, bottom: .62};
  const f = FACILITIES.find(item => item.id === 7);
  const shot = composeShot(f, {obstacles, aspect: 360 / 780, free});
  const [x, y] = ndc(shot, [f.x, f.h * .4, f.z], 360 / 780);
  const point = compositionPoint(free, 360 / 780);
  assert.ok(y > .3, 'subject sits in the strip above the sheet');
  assert.ok(Math.abs(x - point.x) < .02 && Math.abs(y - point.y) < .02, `${x},${y}`);
  const tall = compositionPoint({left: 0, right: 0, top: .08, bottom: .2}, 360 / 780);
  assert.equal(tall.x, 0, 'portrait free frames centre the subject');
});

test('flights arc over roofs, honour reduced motion and lead with the target', () => {
  const from = [-500, 12, 300], to = [500, 12, -300];
  const path = planFlight({from, to, fromTarget: [-480, 5, 280], toTarget: [480, 5, -280], obstacles});
  for (let i = 1; i < 24; i++) {
    const {position} = path.sample(i / 24);
    assert.ok(!obstacles.some(o => pointInBox(position, o, 8)), `sample ${i}`);
  }
  assert.deepEqual(path.sample(0).position, from);
  assert.deepEqual(path.sample(1).position, to);
  const mid = path.sample(.5);
  assert.ok(mid.target[0] > 0, 'look-at leads the camera');
  assert.equal(flightDuration(from, to, from, to, {reduced: true}), 0);
  const d = flightDuration(from, to);
  assert.ok(d >= 900 && d <= 2200);
  assert.ok(flightDuration([0, 0, 0], [1, 0, 0]) <= 901);
});
