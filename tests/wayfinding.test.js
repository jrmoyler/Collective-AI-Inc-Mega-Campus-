import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findDestinations,levelCode} from '../viewer/campus/wayfinding.js';

const facilities = JSON.parse(fs.readFileSync(new URL('../data/campus-program.json',import.meta.url)));
const prism = {...facilities[0],key:'CF-01',district:1};
const archive = {...facilities[2],key:'CF-03',district:1};
const districts = ['All districts','Brain & governance'];
const search = (query,district=0) => findDestinations([prism,archive],districts,query,district);

test('directory resolves room searches and named levels against the real floor schedule',()=>{
  const [gallery] = search('prism observation gallery');
  assert.equal(gallery.floor,11);
  assert.equal(gallery.program,'Observation gallery');
  assert.deepEqual(search('CF-01 L12').map(match=>match.floor),[11]);
  assert.deepEqual(search('CF-03 B2').map(match=>match.floor),[1]);
  assert.equal(levelCode(archive,1),'B2');
});

test('facility-only searches show a single arrival and honor the district filter',()=>{
  assert.equal(search('').length,2);
  assert.equal(search('PRISM')[0].program,'');
  assert.equal(search('CF-01',2).length,0);
  assert.equal(search('no such room').length,0);
});
