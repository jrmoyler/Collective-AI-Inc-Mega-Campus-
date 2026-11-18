// Curated guided tour across all six districts. Captions only restate the supplied
// facility programme; nothing here claims surveyed or built reality.

export const TOUR_STOPS = [
  { facility: null, view: 'aerial', district: 'Full expansion vision',
    title: 'The Living Campus',
    text: '220 acres and 35 facilities in six districts, linked by water gardens, a ring road and the mesh spire network.' },
  { facility: 22, title: 'Every visit starts here',
    text: 'Visitor arrival, screening and badge intake, with the demo theater and shuttle dispatch on the ground floor.' },
  { facility: 1, title: 'The Prism',
    text: 'Twelve floors of client reception, demo suites and briefing lounges rising to the observation gallery.' },
  { facility: 4, title: 'Royal Library & Hybrid Living Academy',
    text: 'Public collection, learner onboarding and the Knowledge Core across four floors of the knowledge district.' },
  { facility: 8, title: 'Titan Works',
    text: 'Robotics and android assembly under the sawtooth roof, with machine integration and safety test lanes.' },
  { facility: 9, title: 'Vector Hub',
    text: 'The circular freight terminal: cross-dock, dispatch, battery swap and the drone ground station.' },
  { facility: 11, title: 'Eden Spire',
    text: 'Aeroponic growing, algae panels and crop analytics stacked in the living-systems district.' },
  { facility: 18, title: 'Nomad Nexus Global Mobility Hub',
    text: 'The southern transit canopy, where the autonomous shuttle network meets visitor intake.' },
  { facility: 20, title: 'Aether Link Mesh Operations Spire',
    text: 'At 91 m the tallest point of the mesh network: operations, field-terminal sync and spectrum monitoring.' },
  { facility: 21, title: 'Central Utility Plant',
    text: 'Microgrid switchgear, battery interface, cooling and water reuse that keep the whole campus running.' },
];

/**
 * Timing-only tour state machine. The caller flies the camera for each step and
 * reports arrival; auto-advance only runs while playing and never under reduced motion.
 */
export function createTourController({ length, dwell = 6500, reduced = false, onStep = () => {}, onState = () => {},
  schedule = (fn, ms) => setTimeout(fn, ms), cancel = id => clearTimeout(id) }) {
  let index = -1, playing = false, active = false, timer = null;
  const state = () => ({ index, playing, active, reduced, length });
  const clear = () => { if (timer !== null) cancel(timer); timer = null; };
  const emit = () => onState(state());
  function go(i) {
    clear();
    index = (i + length) % length;
    active = true;
    emit();
    onStep(index);
  }
  return {
    get state() { return state(); },
    start(i = 0) { playing = !reduced; go(i); },
    next() { if (!active) return; if (index + 1 >= length && playing) { this.stop(); return; } go(index + 1); },
    prev() { if (active) go(Math.max(0, index - 1)); },
    pause() { if (!active || !playing) return; playing = false; clear(); emit(); },
    resume() { if (!active || reduced || playing) return; playing = true; emit(); this.arrived(); },
    toggle() { if (!active) this.start(); else if (playing) this.pause(); else this.resume(); },
    arrived() {
      clear();
      if (!active || !playing) return;
      timer = schedule(() => { timer = null; if (index + 1 >= length) this.stop(); else go(index + 1); }, dwell);
    },
    stop() { if (!active) return; clear(); active = false; playing = false; index = -1; emit(); },
  };
}
