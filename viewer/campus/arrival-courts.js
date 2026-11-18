import {Batch} from './geometry.js';
import {circuits} from './circuits.js';

// Open-sided loggias occupy the left edge of each featured arrival apron.
// Slatted roofs and ribs leave the accessible centre approach unobstructed.
export function createArrivalCourts(facilities) {
  const batch = new Batch();
  for (const [route, circuit] of circuits.entries()) {
    for (const [index, [id]] of circuit.stops.entries()) {
      const f = facilities.find(facility => facility.id === id);
      const x = f.x - f.w * .23, z = f.z + f.d / 2 + 4.2;
      const span = Math.min(11, f.w * .22), height = 4.6 + route * .3;
      for (const side of [-1, 1]) {
        const end = x + side * span / 2;
        for (const depth of [-1.7, 1.7]) {
          batch.box('stone', end, .49, z + depth, .56, .60, .56);
          batch.box('dark', end, height/2 + .4, z + depth, .19, height - .62, .19);
        }
        batch.box('gold', end, height, z, .25, .25, 3.9);
      }
      for (const depth of [-1.7, 1.7]) {
        batch.box('dark', x, height, z + depth, span, .29, .21);
        batch.box('warm', x, height - .16, z + depth, span - .3, .05, .10);
      }
      // Three roof profiles identify the circuits at street level.
      for (let rib = 0; rib <= 16; rib++) {
        const t = rib / 16;
        const rise = [Math.sin(t*Math.PI)*.8, (rib%4)*.15, Math.sin(t*Math.PI*2)*.36][route];
        batch.box('steel', x + (t-.5)*span, height+.24+rise/2, z, .13, .32+Math.abs(rise), 4.15);
      }
      // Brass bands on the approach pier indicate the stop number.
      for (let band = 0; band <= index; band++)
        batch.box('gold', x+span/2, 2.1+band*.18, z+1.7, .23, .07, .23);
    }
  }
  return batch.finish('Visitor circuit arrival courts');
}
