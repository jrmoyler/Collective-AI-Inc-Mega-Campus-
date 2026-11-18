// Visitor-experience orchestration: guided tour, deep links, shortcuts, onboarding,
// hover and selection affordances, live announcements and the optional soundscape.
// main.js passes a small API of getters so this module never owns renderer state.
import * as T from 'three';
import {FACILITIES, DISTRICTS} from './data.js';
import {levelCode} from './wayfinding.js';
import {applyDepthConvention} from './geometry.js';
import {obstaclesFrom, composeShot, freeViewport} from './experience-camera.js';
import {parseDeepLink, serializeDeepLink} from './experience-deeplink.js';
import {TOUR_STOPS, createTourController} from './experience-tour.js';
import {SHORTCUTS, shortcutFor} from './experience-shortcuts.js';
import {createAnnouncer, shouldShowOnboarding, rememberOnboarding, describeFacility} from './experience-announcer.js';
import {createSoundscape} from './experience-sound.js';
import {createSelectionFrame} from './experience-highlight.js';
import {renderShortcutHelp, createTourCaption, createHoverLabel, bindSheetDrag} from './experience-ui.js';

/** Shared with main.js select()/moveCamera()/focus(); populated by bindExperience. */
export const xp = { tour: null, announce: () => {}, sound: null, view: null, urlReady: false };

const $ = s => document.querySelector(s);
const OVERVIEW = { position: [-560, 560, 860], target: [0, 10, -40] };
export const TOUR_DWELL = 6500;

/** Rectangles of opaque UI currently covering the scene. */
export function uiRects() {
  return ['header', '#detail', '#directory', '#toolbar', '#tour-caption', '#layers', '#welcome']
    .map(s => $(s)).filter(el => el && !el.hidden && el.offsetParent !== null)
    .map(el => el.getBoundingClientRect());
}

/** Composed oblique of the selected facility given what the UI currently covers. */
export function shotFor(api, f, overrides = {}) {
  return composeShot(f, {
    height: api.facilityHeight(f), obstacles: obstaclesFrom(FACILITIES, api.facilityHeight),
    aspect: innerWidth / innerHeight, fov: api.camera?.fov ?? 42,
    free: freeViewport(uiRects(), innerWidth, innerHeight), ...overrides,
  });
}

export const GROUND_SHOT = { elevations: [-3, -1, 3, 7], azimuths: [0, 22, -22, 45, -45, 90, -90, 180], fill: .82, minY: 2.5 };

export function showSelection(api, f) {
  const scene = api?.scene;
  if (!scene) return;
  xp.frame ??= createSelectionFrame();
  if (xp.frame.object.parent !== scene) { scene.add(xp.frame.object); applyDepthConvention(xp.frame.object, api.reversedDepth); }
  if (f) xp.frame.show(f); else xp.frame.hide();
  api.invalidate();
}

export function syncUrl(api = xp.api) {
  if (!api || !xp.urlReady || typeof history === 'undefined') return;
  const inside = $('#interior') ? !$('#interior').hidden : false;
  const open = inside || ($('#detail') ? !$('#detail').hidden : false);
  const next = serializeDeepLink(location.search, FACILITIES, {
    facility: open ? api.selected?.id : null, floor: api.arrivalFloor, inside, view: xp.view,
  });
  if (next !== location.search) history.replaceState(history.state, '', location.pathname + next + location.hash);
}

export function bindExperience(api) {
  xp.api = api;
  const announce = xp.announce = createAnnouncer($('#announcer'));
  const sound = xp.sound = createSoundscape();
  const hover = createHoverLabel($('#hover-label'));
  let arrivedIndex = -1;

  // ---- Guided tour ------------------------------------------------------------
  const caption = createTourCaption($('#tour-caption'), {
    onPrev: () => tour.prev(), onNext: () => tour.next(), onToggle: () => tour.toggle(), onEnd: () => tour.stop(),
  });
  const renderCaption = state => {
    const stop = TOUR_STOPS[state.index];
    const f = FACILITIES.find(item => item.id === stop.facility);
    caption.render(stop, state, {
      district: (f ? DISTRICTS[f.district] : stop.district).toUpperCase(), dwell: TOUR_DWELL, arrived: arrivedIndex === state.index,
    });
  };
  const tour = xp.tour = createTourController({
    length: TOUR_STOPS.length, dwell: TOUR_DWELL, reduced: api.reduced,
    onStep(index) {
      const stop = TOUR_STOPS[index];
      arrivedIndex = -1;
      document.body.classList.add('touring', 'exploring');
      dismissWelcome();
      const arrived = () => { if (tour.state.index !== index) return; arrivedIndex = index; renderCaption(tour.state); tour.arrived(); };
      if (stop.facility) {
        if (innerWidth <= 760) for (const id of ['#detail', '#directory']) if ($(id)) $(id).hidden = true;
        api.select(stop.facility, 0, { fromTour: true, sheet: innerWidth > 760 });
        const shot = shotFor(api, api.selected);
        if (shot && api.graphicsReady) api.moveCamera(shot.position, shot.target, 'tour', { onComplete: arrived });
        else arrived();
      } else {
        if ($('#detail')) $('#detail').hidden = true;
        document.body.classList.remove('sheet-open');
        showSelection(api, null);
        if (api.graphicsReady) api.moveCamera(OVERVIEW.position, OVERVIEW.target, 'tour', { onComplete: arrived });
        else arrived();
      }
      renderCaption(tour.state);
      announce(`Tour stop ${index + 1} of ${TOUR_STOPS.length}: ${stop.title}. ${stop.text}`);
      sound.cue(523);
    },
    onState(state) {
      $('#tour')?.setAttribute('aria-pressed', String(state.active));
      $('#tour')?.classList.toggle('active', state.active);
      if (state.active) { renderCaption(state); return; }
      caption.hide();
      document.body.classList.remove('touring');
      if (xp.view === 'tour') api.setView(null);
      announce('Guided tour ended.');
    },
  });
  if ($('#tour')) $('#tour').onclick = () => { if (tour.state.active) tour.stop(); else startTour(); };
  function startTour(index = 0) {
    if (api.busy) return;
    tour.start(index);
    $('#tour-caption [data-tour=next]')?.focus({ preventScroll: true });
  }
  // Any direct manipulation of the scene hands control back to the visitor.
  for (const type of ['pointerdown', 'wheel']) $('#app')?.addEventListener(type, () => tour.pause(), { passive: true });

  // ---- Onboarding --------------------------------------------------------------
  function dismissWelcome(remember = true) {
    if (!$('#welcome') || $('#welcome').hidden) return;
    $('#welcome').hidden = true;
    if (remember) rememberOnboarding(globalThis.localStorage);
  }
  xp.dismissWelcome = dismissWelcome;
  if ($('#welcome-tour')) $('#welcome-tour').onclick = () => { dismissWelcome(); startTour(); };
  if ($('#welcome-dismiss')) $('#welcome-dismiss').onclick = () => { dismissWelcome(); $('#directory-toggle')?.focus(); };

  // ---- Shortcuts and help ------------------------------------------------------
  renderShortcutHelp($('#shortcut-list'), SHORTCUTS);
  const help = $('#shortcut-help');
  const openHelp = () => { if (help && !help.open) help.showModal(); };
  if ($('#shortcuts-open')) $('#shortcuts-open').onclick = openHelp;
  if ($('#shortcut-close')) $('#shortcut-close').onclick = () => help.close();
  help?.addEventListener('click', e => { if (e.target === help) help.close(); });
  const cycle = step => {
    const ids = FACILITIES.map(f => f.id);
    const at = ids.indexOf(api.selected?.id);
    const next = at < 0 ? (step > 0 ? 0 : ids.length - 1) : (at + step + ids.length) % ids.length;
    api.select(ids[next]);
    if (api.graphicsReady) api.focus();
  };
  const click = id => { const el = $('#' + id); if (el && !el.disabled && !el.closest('[hidden]')) el.click(); return el; };
  const actions = {
    help: () => help?.open ? help.close() : openHelp(),
    search: () => { if ($('#directory')?.hidden) click('directory-toggle'); else $('#search')?.focus(); },
    aerial: () => { click('aerial'); announce('Aerial view'); },
    north: () => { click('north'); announce('North view'); },
    ground: () => { click('ground'); announce('Street view'); },
    tour: () => { if (!tour.state.active) startTour(); else tour.toggle(); if (tour.state.active) announce(tour.state.playing ? 'Tour playing' : 'Tour paused'); },
    'tour-prev': () => tour.prev(), 'tour-next': () => tour.next(),
    'prev-facility': () => cycle(-1), 'next-facility': () => cycle(1),
    focus: () => api.selected && api.focus(),
    enter: () => api.selected && click('enter'),
    plan: () => api.selected && click('view-plan'),
    day: () => { click('day'); announce($('#day')?.getAttribute('aria-pressed') === 'true' ? 'Daylight' : 'Dusk'); },
    labels: () => { click('labels'); announce($('#labels')?.getAttribute('aria-pressed') === 'true' ? 'Labels shown' : 'Labels hidden'); },
    systems: () => click('layers-toggle'),
    sound: () => click('sound'),
  };
  window.addEventListener('keydown', e => {
    if (api.busy || $('#plan-dialog')?.open || $('#visitor-atlas')?.open) return;
    if (help?.open) { if (e.key === '?') { e.preventDefault(); help.close(); } return; }
    const action = shortcutFor(e, { touring: tour.state.active });
    if (!action || !actions[action]) return;
    e.preventDefault();
    actions[action]();
  });

  // ---- Sound ---------------------------------------------------------------------
  const soundButton = $('#sound');
  if (soundButton) {
    if (!sound.available) { soundButton.disabled = true; soundButton.title = 'Audio is unavailable in this browser'; }
    soundButton.onclick = async () => {
      const on = await sound.toggle();
      soundButton.setAttribute('aria-pressed', String(on));
      soundButton.textContent = on ? 'Sound on' : 'Sound';
      announce(on ? 'Ambient sound on' : 'Ambient sound off');
    };
  }

  // ---- Hover affordance (fine pointers only) -------------------------------------
  if ($('#app') && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const ray = new T.Raycaster(), pointer = new T.Vector2();
    let queued = null, frame = 0, last = 0;
    const clear = () => { hover.hide(); document.body.classList.remove('hovering-facility'); };
    const probe = () => {
      frame = 0;
      const e = queued;
      if (!e || !api.graphicsReady || api.busy || !api.camera) { clear(); return; }
      const now = performance.now();
      if (now - last < 60) { frame = requestAnimationFrame(probe); return; }
      last = now;
      pointer.set(e.clientX / innerWidth * 2 - 1, 1 - e.clientY / innerHeight * 2);
      ray.setFromCamera(pointer, api.camera);
      let object = ray.intersectObjects(api.buildings, true)[0]?.object;
      while (object && object.userData.facility === undefined) object = object.parent;
      const f = FACILITIES.find(item => item.id === object?.userData.facility);
      if (!f) { clear(); return; }
      hover.show(f.key, f.name, e.clientX, e.clientY);
      document.body.classList.add('hovering-facility');
    };
    $('#app').addEventListener('pointermove', e => {
      if (e.buttons) { clear(); return; }
      queued = e;
      if (!frame) frame = requestAnimationFrame(probe);
    });
    $('#app').addEventListener('pointerleave', () => { queued = null; clear(); });
  }

  // ---- Mobile sheets ---------------------------------------------------------------
  bindSheetDrag($('#directory'), () => $('#directory-close')?.click());
  bindSheetDrag($('#detail'), () => $('#detail-close')?.click());

  // ---- Deep links and state observers ----------------------------------------------
  const watch = (el, fn) => el && new MutationObserver(fn).observe(el, { attributes: true, attributeFilter: ['hidden'] });
  watch($('#detail'), () => {
    if ($('#detail').hidden && $('#interior')?.hidden !== false && !tour.state.active) showSelection(api, null);
    syncUrl(api);
  });
  watch($('#interior'), () => {
    if (!$('#interior').hidden) { tour.pause(); hover.hide(); dismissWelcome(false); }
    syncUrl(api);
  });
  const link = parseDeepLink(location.search, FACILITIES);
  if (link.facility) api.select(link.facility, link.floor ?? 0);
  xp.urlReady = true;
  const ready = () => {
    if (link.facility) {
      api.select(link.facility, link.floor ?? 0);
      if (api.graphicsReady) { api.focus(); if (link.inside) setTimeout(() => click('enter'), 50); }
    } else if (link.view && api.graphicsReady) click(link.view);
    if (link.tour && api.graphicsReady) startTour();
    else if (!link.facility && api.graphicsReady && shouldShowOnboarding({ storage: globalThis.localStorage, search: location.search, automated: navigator.webdriver })) {
      $('#welcome').hidden = false;
      $('#welcome-title')?.focus({ preventScroll: true });
    }
  };
  if (document.body.classList.contains('campus-ready')) ready();
  else {
    const observer = new MutationObserver(() => {
      if (!document.body.classList.contains('campus-ready')) return;
      observer.disconnect(); ready();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  return { describe: (f, floor) => describeFacility(f, DISTRICTS, levelCode, floor) };
}
