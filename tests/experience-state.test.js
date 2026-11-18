import test from 'node:test';
import assert from 'node:assert/strict';
import {FACILITIES, DISTRICTS} from '../viewer/campus/data.js';
import {levelCode} from '../viewer/campus/wayfinding.js';
import {parseDeepLink, serializeDeepLink, parseFacility} from '../viewer/campus/experience-deeplink.js';
import {TOUR_STOPS, createTourController} from '../viewer/campus/experience-tour.js';
import {SHORTCUTS, shortcutFor} from '../viewer/campus/experience-shortcuts.js';
import {describeFacility, createAnnouncer, shouldShowOnboarding, rememberOnboarding} from '../viewer/campus/experience-announcer.js';
import {createSoundscape, SOUND_LAYERS} from '../viewer/campus/experience-sound.js';
import {frameSegments} from '../viewer/campus/experience-highlight.js';

test('deep links accept CF keys and visitor floor numbers, and round-trip', () => {
  assert.equal(parseFacility('CF-07', FACILITIES), 7);
  assert.equal(parseFacility('cf7', FACILITIES), 7);
  assert.equal(parseFacility('36', FACILITIES), null);
  assert.deepEqual(parseDeepLink('?facility=CF-07&floor=2', FACILITIES), {facility: 7, floor: null, inside: false, view: null, tour: false});
  assert.equal(parseDeepLink('?facility=CF-01&floor=12', FACILITIES).floor, 11);
  assert.equal(parseDeepLink('?facility=CF-01&floor=L12', FACILITIES).floor, 11);
  assert.equal(parseDeepLink('?facility=CF-03&floor=B2&inside=1', FACILITIES).floor, 1);
  assert.equal(parseDeepLink('?facility=CF-03&floor=B2&inside=1', FACILITIES).inside, true);
  assert.equal(parseDeepLink('?inside=1', FACILITIES).inside, false);
  assert.equal(parseDeepLink('?view=north&tour=1', FACILITIES).view, 'north');
  const query = serializeDeepLink('?debug&qa=1&facility=CF-09', FACILITIES, {facility: 1, floor: 11, inside: true});
  const params = new URLSearchParams(query);
  assert.equal(params.get('facility'), 'CF-01');
  assert.equal(params.get('floor'), '12');
  assert.equal(params.get('inside'), '1');
  assert.ok(params.has('debug') && params.get('qa') === '1');
  assert.deepEqual(parseDeepLink(query, FACILITIES), {facility: 1, floor: 11, inside: true, view: null, tour: false});
  assert.equal(serializeDeepLink('?facility=CF-01&floor=3', FACILITIES, {}), '');
  assert.equal(serializeDeepLink('', FACILITIES, {view: 'north'}), '?view=north');
});

test('guided tour visits every district with real facilities and real programme text', () => {
  const districts = new Set(TOUR_STOPS.filter(s => s.facility).map(s => FACILITIES.find(f => f.id === s.facility).district));
  assert.equal(districts.size, 6);
  for (const stop of TOUR_STOPS) {
    assert.ok(stop.title && stop.text.length > 30);
    if (stop.facility) assert.ok(FACILITIES.some(f => f.id === stop.facility));
  }
  assert.ok(!TOUR_STOPS.some(s => /\b(30|180)[- ]acres?\b|30 facilities/i.test(s.text)));
});

test('tour controller auto-advances only while playing and never with reduced motion', () => {
  const timers = [];
  const steps = [];
  const tour = createTourController({length: 3, dwell: 100, onStep: i => steps.push(i),
    schedule: (fn, ms) => timers.push({fn, ms}) - 1, cancel: id => { if (timers[id]) timers[id].fn = null; }});
  tour.start();
  assert.deepEqual(steps, [0]);
  tour.arrived();
  timers.at(-1).fn();
  assert.deepEqual(steps, [0, 1]);
  tour.arrived();
  tour.pause();
  assert.equal(timers.at(-1).fn, null, 'pausing cancels the pending advance');
  const before = timers.length;
  tour.arrived();
  assert.equal(timers.length, before, 'paused tours do not schedule');
  tour.resume();
  timers.at(-1).fn();
  tour.arrived();
  timers.at(-1).fn();
  assert.equal(tour.state.active, false, 'tour ends after the last stop');

  const reducedSteps = [];
  const reduced = createTourController({length: 3, reduced: true, onStep: i => reducedSteps.push(i), schedule: () => assert.fail('scheduled')});
  reduced.start(); reduced.arrived(); reduced.resume(); reduced.next(); reduced.prev();
  assert.deepEqual(reducedSteps, [0, 1, 0]);
  assert.equal(reduced.state.playing, false);
});

test('shortcuts ignore typing, modifiers and documented keys map to actions', () => {
  const key = (k, extra = {}) => shortcutFor({key: k, target: {tagName: 'BODY'}, ...extra});
  assert.equal(key('?'), 'help');
  assert.equal(key('A'), 'aerial');
  assert.equal(key(']'), 'next-facility');
  assert.equal(key('a', {ctrlKey: true}), null);
  assert.equal(key('a', {target: {tagName: 'INPUT', type: 'search'}}), null);
  assert.equal(key('a', {target: {tagName: 'INPUT', type: 'checkbox'}}), 'aerial');
  assert.equal(key('ArrowRight'), null);
  assert.equal(shortcutFor({key: 'ArrowRight', target: {tagName: 'BODY'}}, {touring: true}), 'tour-next');
  assert.ok(SHORTCUTS.length >= 12 && SHORTCUTS.every(s => s.keys.length && s.label));
});

test('announcements describe the programme and repeat identical messages', () => {
  const f = FACILITIES.find(item => item.id === 1);
  const text = describeFacility(f, DISTRICTS, levelCode, 11);
  assert.match(text, /CF-01 The Prism\. Brain & governance district, 12 floors\. Arrival L12: Oculus indoor lounge\./);
  const el = {textContent: ''}, queue = [];
  const announce = createAnnouncer(el, fn => queue.push(fn));
  announce('A'); announce('B');
  assert.equal(el.textContent, '');
  queue.forEach(fn => fn());
  assert.equal(el.textContent, 'B', 'only the latest message is spoken');
});

test('onboarding appears once and never over shared links or automation', () => {
  const store = new Map();
  const storage = {getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v)};
  assert.equal(shouldShowOnboarding({storage}), true);
  assert.equal(shouldShowOnboarding({storage, search: '?facility=CF-01'}), false);
  assert.equal(shouldShowOnboarding({storage, automated: true}), false);
  assert.equal(shouldShowOnboarding({storage, automated: true, search: '?welcome=1'}), true);
  rememberOnboarding(storage);
  assert.equal(shouldShowOnboarding({storage}), false);
  assert.equal(shouldShowOnboarding({storage: {getItem() { throw new Error('blocked'); }}}), false);
});

test('soundscape is off by default and degrades without Web Audio', async () => {
  const sound = createSoundscape({AudioContextClass: undefined});
  assert.equal(sound.enabled, false);
  assert.equal(sound.available, false);
  assert.equal(await sound.toggle(), false);
  sound.cue();
  assert.ok(SOUND_LAYERS.every(l => l.gain <= .05));
});

test('selection frame encloses the footprint with a margin', () => {
  const f = FACILITIES[0];
  const segments = frameSegments(f);
  assert.equal(segments.length, 12);
  const maxX = Math.max(...segments.map(([x, , sx]) => Math.abs(x) + sx / 2));
  assert.ok(maxX > f.w / 2 + 4);
});
