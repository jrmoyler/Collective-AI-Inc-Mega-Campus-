// Optional ambient soundscape, synthesized locally with Web Audio (no downloads).
// Off by default; the AudioContext is only created from an explicit user toggle.

export const SOUND_LAYERS = [
  // Wind through planting: filtered noise with a slow swell.
  { kind: 'noise', filter: 'lowpass', frequency: 520, q: .4, gain: .05, lfo: .06, depth: .025 },
  // Distant water: band-limited noise, quieter and brighter.
  { kind: 'noise', filter: 'bandpass', frequency: 1800, q: .7, gain: .012, lfo: .17, depth: .006 },
  // Low campus hum: an open fifth well under the wind.
  { kind: 'tone', frequency: 110, gain: .012, lfo: .03, depth: .006 },
  { kind: 'tone', frequency: 164.8, gain: .007, lfo: .045, depth: .004 },
];

export function createSoundscape({ AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext, layers = SOUND_LAYERS } = {}) {
  let context = null, master = null, enabled = false;
  function build() {
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    const length = context.sampleRate * 4;
    const noise = context.createBuffer(1, length, context.sampleRate);
    const data = noise.getChannelData(0);
    // Brown-ish noise: integrated white noise reads as air rather than hiss.
    let last = 0;
    for (let i = 0; i < length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; data[i] = last * 3.5; }
    for (const layer of layers) {
      let source;
      if (layer.kind === 'noise') {
        source = context.createBufferSource(); source.buffer = noise; source.loop = true;
      } else {
        source = context.createOscillator(); source.type = 'sine'; source.frequency.value = layer.frequency;
      }
      const gain = context.createGain(); gain.gain.value = layer.gain;
      const lfo = context.createOscillator(); lfo.frequency.value = layer.lfo;
      const depth = context.createGain(); depth.gain.value = layer.depth;
      lfo.connect(depth).connect(gain.gain);
      if (layer.kind === 'noise') {
        const filter = context.createBiquadFilter(); filter.type = layer.filter;
        filter.frequency.value = layer.frequency; filter.Q.value = layer.q;
        source.connect(filter).connect(gain);
      } else source.connect(gain);
      gain.connect(master);
      source.start(); lfo.start();
    }
  }
  function ramp(value, seconds) {
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(value, now + seconds);
  }
  return {
    get available() { return typeof AudioContextClass === 'function'; },
    get enabled() { return enabled; },
    async set(on) {
      if (!this.available) return false;
      if (on && !context) build();
      if (!context) return false;
      enabled = !!on;
      if (enabled) { await context.resume?.(); ramp(.9, 1.6); }
      else { ramp(0, .4); }
      return enabled;
    },
    toggle() { return this.set(!enabled); },
    /** A short, quiet two-note cue for selections and tour stops; silent when off. */
    cue(pitch = 660) {
      if (!enabled || !context) return;
      const now = context.currentTime;
      for (const [offset, freq] of [[0, pitch], [.09, pitch * 1.5]]) {
        const osc = context.createOscillator(), gain = context.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(.035, now + offset + .02);
        gain.gain.exponentialRampToValueAtTime(.0001, now + offset + .5);
        osc.connect(gain).connect(master);
        osc.start(now + offset); osc.stop(now + offset + .55);
      }
    },
  };
}
