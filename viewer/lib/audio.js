// audio.js — procedural ambient soundscape for the Three.js campus viewer.
// Everything is synthesized live with the Web Audio API: filtered-noise wind,
// a detuned city drone, daytime bird chirps, nighttime cricket shimmer, walk-
// mode footsteps, and a cinematic swell. No audio assets, no CDN.
//
// Signal chain:  [layer nodes] -> master gain -> convolver reverb -> destination
//
// Browser autoplay policy: the AudioContext is NOT created until start() is
// called from a user gesture. update() is a no-op until then. All nodes are
// guarded; dispose() tears everything down cleanly.

export function createAudio(opts = {}) {
  const mountButton   = opts.mountButton   !== false;        // default true
  const initialVolume = opts.initialVolume != null ? opts.initialVolume : 0.6;

  // ─── Internal state ─────────────────────────────────────────────────────────
  let ctx = null;                 // AudioContext (created on start)
  let started = false;
  let muted = false;
  let masterVolume = clamp01(initialVolume);
  let isNight = true;

  // Graph nodes (all null until start())
  let masterGain = null;          // pre-reverb master
  let reverb = null;              // convolver
  let reverbWet = null, dryGain = null, outGain = null;

  let noiseBuffer = null;         // shared white-noise buffer (reused)

  // Layer handles
  let wind = null;                // { src, filter, gain, lfo, lfoGain }
  let cityHum = null;             // { oscs:[], filter, gain }
  let nightDrone = null;          // { osc, sub, filter, gain }
  let crickets = null;            // { src, filter, gain, lfo, lfoGain }
  let birdsGain = null;           // day chirps bus gain
  let cinematicSwell = null;      // { osc, gain }

  // Scheduling timers
  let birdTimer = 0;              // seconds until next bird chirp
  let footTimer = 0;              // seconds until next footstep
  let footPhase = 0;              // alternate L/R panning

  // UI
  let btn = null;
  let btnClick = null;

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function clamp01(v) { v = +v; return v < 0 ? 0 : v > 1 ? 1 : (v || 0); }

  function now() { return ctx ? ctx.currentTime : 0; }

  // Smooth gain ramp — never sets value directly, so it never clicks.
  function ramp(param, target, time = 0.6) {
    if (!ctx || !param) return;
    const t = now();
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(target, t + time);
  }

  // Build (once) a reusable mono white-noise buffer (~2s, looped).
  function makeNoiseBuffer() {
    const len = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // Synthesize a small, smooth impulse response for the convolver reverb.
  function makeImpulse(seconds = 1.6, decay = 3.0) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return buf;
  }

  function loopingNoise() {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    src.start();
    return src;
  }

  // ─── Graph construction ──────────────────────────────────────────────────────
  function buildGraph() {
    noiseBuffer = makeNoiseBuffer();

    // Output bus: master -> (dry + reverb wet) -> destination
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : masterVolume;

    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(1.6, 3.0);

    reverbWet = ctx.createGain(); reverbWet.gain.value = 0.32;
    dryGain   = ctx.createGain(); dryGain.gain.value   = 0.85;
    outGain   = ctx.createGain(); outGain.gain.value   = 1.0;

    masterGain.connect(dryGain);
    masterGain.connect(reverb);
    reverb.connect(reverbWet);
    dryGain.connect(outGain);
    reverbWet.connect(outGain);
    outGain.connect(ctx.destination);

    buildWind();
    buildCityHum();
    buildNightDrone();
    buildCrickets();
    buildBirds();
    buildCinematic();

    applyDayNightMix(0.01); // set initial day/night balance
  }

  // Soft wind / air pad: looped noise -> lowpass, slowly LFO-modulated cutoff.
  function buildWind() {
    const src = loopingNoise();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    filter.Q.value = 0.6;

    const gain = ctx.createGain();
    gain.gain.value = 0.0;

    // LFO modulating cutoff for a breathing quality.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    src.connect(filter).connect(gain).connect(masterGain);
    ramp(gain.gain, 0.16, 4.0);
    wind = { src, filter, gain, lfo, lfoGain };
  }

  // Distant city hum: a couple of detuned low oscillators -> lowpass, very quiet.
  function buildCityHum() {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.value = 0.0;

    const oscs = [];
    [55, 55.4, 82.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      o.connect(filter);
      o.start();
      oscs.push(o);
    });

    filter.connect(gain).connect(masterGain);
    ramp(gain.gain, 0.05, 5.0);
    cityHum = { oscs, filter, gain };
  }

  // Nighttime deeper, calmer drone (separate, fades in at night).
  function buildNightDrone() {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 140;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = 0.0; // mixed by applyDayNightMix

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 48;
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 36.7; // gentle beating against osc
    osc.connect(filter); sub.connect(filter);
    osc.start(); sub.start();

    filter.connect(gain).connect(masterGain);
    nightDrone = { osc, sub, filter, gain };
  }

  // Nighttime crickets/insect shimmer: band-passed noise pulsed by an LFO.
  function buildCrickets() {
    const src = loopingNoise();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 6200;
    filter.Q.value = 9;

    const gain = ctx.createGain();
    gain.gain.value = 0.0; // mixed by applyDayNightMix (peak target)

    // Tremolo LFO gives the rhythmic chirp shimmer.
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 11;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.5;
    const lfoBias = ctx.createGain(); // not used as bias; gain rides on top
    lfo.connect(lfoGain).connect(gain.gain);
    lfo.start();

    src.connect(filter).connect(gain).connect(masterGain);
    crickets = { src, filter, gain, lfo, lfoGain, lfoBias, peak: 0.0 };
  }

  // Daytime birds: a shared bus; individual chirps are spawned on a timer.
  function buildBirds() {
    birdsGain = ctx.createGain();
    birdsGain.gain.value = 0.0; // mixed by applyDayNightMix
    birdsGain.connect(masterGain);
  }

  // Cinematic low-frequency swell (tasteful, off by default).
  function buildCinematic() {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 42;
    const gain = ctx.createGain();
    gain.gain.value = 0.0;
    osc.connect(gain).connect(masterGain);
    osc.start();
    cinematicSwell = { osc, gain };
  }

  // ─── Event synthesis (sparse, scheduled) ─────────────────────────────────────

  // One bird chirp: short FM-ish sine blip with a fast pitch sweep + envelope.
  function spawnBird() {
    if (!ctx || !birdsGain) return;
    const t = now();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const base = 1800 + Math.random() * 1600;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * (1.4 + Math.random() * 0.5), t + 0.06);
    osc.frequency.exponentialRampToValueAtTime(base * 0.8, t + 0.14);

    // FM sparkle
    const mod = ctx.createOscillator();
    mod.frequency.value = 120 + Math.random() * 80;
    const modGain = ctx.createGain();
    modGain.gain.value = 300;
    mod.connect(modGain).connect(osc.frequency);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.12, t + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) pan.pan.value = (Math.random() * 2 - 1) * 0.7;

    osc.connect(env);
    if (pan) env.connect(pan).connect(birdsGain); else env.connect(birdsGain);
    osc.start(t); mod.start(t);
    const stop = t + 0.2;
    osc.stop(stop); mod.stop(stop);
    osc.onended = () => { try { osc.disconnect(); mod.disconnect(); modGain.disconnect(); env.disconnect(); if (pan) pan.disconnect(); } catch (e) {} };

    // Often chirp twice in quick succession.
    if (Math.random() < 0.5) setTimeout(() => { if (started && !muted) spawnBird(); }, 180 + Math.random() * 140);
  }

  // One footstep: short filtered noise burst with a snappy envelope, panned.
  function spawnFootstep() {
    if (!ctx || !masterGain) return;
    const t = now();
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = false;
    // randomize the read offset for variation
    src.playbackRate.value = 0.9 + Math.random() * 0.2;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900 + Math.random() * 300;
    filter.Q.value = 1.2;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.22, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) pan.pan.value = footPhase ? 0.25 : -0.25;
    footPhase ^= 1;

    src.connect(filter).connect(env);
    if (pan) env.connect(pan).connect(masterGain); else env.connect(masterGain);
    src.start(t);
    src.stop(t + 0.18);
    src.onended = () => { try { src.disconnect(); filter.disconnect(); env.disconnect(); if (pan) pan.disconnect(); } catch (e) {} };
  }

  // ─── Day / night mixing ──────────────────────────────────────────────────────
  function applyDayNightMix(time = 2.5) {
    if (!ctx) return;
    const dayT   = isNight ? 0 : 1;
    const nightT = isNight ? 1 : 0;
    if (birdsGain)        ramp(birdsGain.gain, 0.0 + dayT * 0.9, time);       // bus level; per-chirp env is small
    if (nightDrone)       ramp(nightDrone.gain.gain, nightT * 0.07, time);
    if (crickets) {
      crickets.peak = nightT * 0.05;
      ramp(crickets.lfoGain.gain, crickets.peak, time);
    }
    // Wind/city slightly warmer by day, quieter and calmer by night.
    if (wind)    ramp(wind.gain.gain, isNight ? 0.13 : 0.18, time);
    if (cityHum) ramp(cityHum.gain.gain, isNight ? 0.04 : 0.06, time);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  // Resume/create the AudioContext on a user gesture. Safe to call repeatedly.
  function start() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        buildGraph();
        started = true;
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {
      console.warn('Audio start failed:', e);
    }
  }

  // Per-frame update. No-op until started.
  function update(dt, state) {
    if (!started || !ctx) return;
    dt = Math.min(Math.max(+dt || 0, 0), 0.1);
    state = state || {};
    const mode = state.mode || 'orbit';
    const moving = !!state.moving;
    const speed = Math.max(0, +state.speed || 1);

    // Birds: sparse random chirps, only effectively audible by day (bus level).
    if (!isNight) {
      birdTimer -= dt;
      if (birdTimer <= 0) {
        if (!muted) spawnBird();
        birdTimer = 2.5 + Math.random() * 6.0; // sparse
      }
    }

    // Footsteps: only in walk mode while moving; cadence scales with speed.
    if (mode === 'walk' && moving) {
      footTimer -= dt;
      if (footTimer <= 0) {
        if (!muted) spawnFootstep();
        const cadence = 0.62 / (0.6 + speed * 0.5); // faster speed -> shorter gap
        footTimer = Math.max(0.18, cadence);
      }
    } else {
      footTimer = 0; // reset so the next step lands promptly
    }

    // Cinematic swell: gentle drama in/out depending on mode.
    if (cinematicSwell) {
      const target = mode === 'cinematic' ? 0.05 : 0.0;
      // Cheap per-frame ramp toward target (avoids constant scheduling).
      const g = cinematicSwell.gain.gain;
      g.value += (target - g.value) * Math.min(1, dt * 0.6);
    }
  }

  function setDayNight(night) {
    isNight = !!night;
    if (started) applyDayNightMix(2.5);
  }

  function toggleMute() {
    muted = !muted;
    if (masterGain) ramp(masterGain.gain, muted ? 0 : masterVolume, 0.4);
    updateButton();
    return muted;
  }

  function isMuted() { return muted; }

  function setMasterVolume(v) {
    masterVolume = clamp01(v);
    if (masterGain && !muted) ramp(masterGain.gain, masterVolume, 0.3);
  }

  function dispose() {
    // Stop oscillators / sources, close context, remove UI + listeners.
    try {
      const stopNode = (n) => { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} };
      if (wind)          { stopNode(wind.src); stopNode(wind.lfo); }
      if (cityHum)       { cityHum.oscs.forEach(stopNode); }
      if (nightDrone)    { stopNode(nightDrone.osc); stopNode(nightDrone.sub); }
      if (crickets)      { stopNode(crickets.src); stopNode(crickets.lfo); }
      if (cinematicSwell){ stopNode(cinematicSwell.osc); }
      if (ctx && ctx.state !== 'closed') ctx.close();
    } catch (e) {
      console.warn('Audio dispose error:', e);
    }
    ctx = null; started = false;
    wind = cityHum = nightDrone = crickets = cinematicSwell = null;
    masterGain = reverb = reverbWet = dryGain = outGain = birdsGain = null;
    noiseBuffer = null;

    if (btn) {
      if (btnClick) btn.removeEventListener('click', btnClick);
      if (btn.parentNode) btn.parentNode.removeChild(btn);
      btn = null; btnClick = null;
    }
  }

  // ─── Mute/unmute button (inline-styled, no CSS file) ─────────────────────────
  function updateButton() {
    if (!btn) return;
    btn.textContent = muted ? '🔇' : '🔊';
    btn.title = muted ? 'Unmute ambient audio' : 'Mute ambient audio';
    btn.style.opacity = muted ? '0.55' : '0.9';
  }

  function mountUI() {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Toggle ambient audio');
    Object.assign(btn.style, {
      position: 'fixed',
      right: '20px',
      bottom: '176px',   // sits just above the campus minimap (which occupies the bottom-right)
      width: '46px',
      height: '46px',
      borderRadius: '50%',
      border: '1px solid rgba(0,207,255,0.35)',
      background: 'rgba(6,16,28,0.6)',
      color: '#cfe9ff',
      fontSize: '20px',
      lineHeight: '44px',
      textAlign: 'center',
      cursor: 'pointer',
      zIndex: '99999',
      padding: '0',
      backdropFilter: 'blur(4px)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
      userSelect: 'none',
    });
    updateButton();

    btnClick = () => { start(); toggleMute(); };
    btn.addEventListener('click', btnClick);
    document.body.appendChild(btn);
  }

  if (mountButton && typeof document !== 'undefined') mountUI();

  return {
    start,
    update,
    setDayNight,
    toggleMute,
    isMuted,
    setMasterVolume,
    dispose,
  };
}
