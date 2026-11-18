import test from 'node:test';
import assert from 'node:assert/strict';
import {FACILITIES, floorLayout} from '../viewer/campus/data.js';
import {routeToRoom} from '../viewer/campus/floor-topology.js';

test('visits between neighbouring rooms take the connecting passage directly', () => {
 let pairs = 0;
 for (const facility of FACILITIES) for (let floor = 0; floor < facility.levels; floor++) {
  const layout = floorLayout(facility, floor);
  for (const source of layout.rooms) for (const [index, target] of layout.rooms.entries()) {
   if (source === target || source.parent !== target.parent) continue;
   const points = [source.arrival, ...routeToRoom(layout, source.arrival, index)];
   let distance = 0;
   for (let i = 1; i < points.length; i++)
    distance += Math.hypot(points[i][0]-points[i-1][0], points[i][1]-points[i-1][1]);
   const direct = Math.hypot(source.arrival[0]-source.approach[0], source.arrival[1]-source.approach[1]) +
    Math.hypot(source.approach[0]-target.approach[0], source.approach[1]-target.approach[1]) +
    Math.hypot(target.arrival[0]-target.approach[0], target.arrival[1]-target.approach[1]);
   assert.ok(Math.abs(distance-direct) < 1e-6, facility.key);
   pairs++;
  }
 }
 assert.ok(pairs >= 148);
});
