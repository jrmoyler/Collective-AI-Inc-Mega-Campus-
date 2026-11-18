// Single-key shortcuts for the exterior explorer, plus the list the help overlay shows.

export const SHORTCUTS = [
  { keys: ['?'], action: 'help', label: 'Show or hide this list' },
  { keys: ['/'], action: 'search', label: 'Search facilities and rooms' },
  { keys: ['A'], action: 'aerial', label: 'Aerial view' },
  { keys: ['N'], action: 'north', label: 'North view' },
  { keys: ['G'], action: 'ground', label: 'Street view' },
  { keys: ['T'], action: 'tour', label: 'Start or pause the guided tour' },
  { keys: ['←', '→'], action: 'tour-step', label: 'Previous / next tour stop', codes: ['ArrowLeft', 'ArrowRight'] },
  { keys: ['[', ']'], action: 'cycle', label: 'Previous / next facility' },
  { keys: ['F'], action: 'focus', label: 'Frame the selected facility' },
  { keys: ['E'], action: 'enter', label: 'Explore inside the selected facility' },
  { keys: ['P'], action: 'plan', label: 'Open the floor plan' },
  { keys: ['D'], action: 'day', label: 'Daylight / dusk' },
  { keys: ['L'], action: 'labels', label: 'Facility labels' },
  { keys: ['S'], action: 'systems', label: 'Connected systems panel' },
  { keys: ['M'], action: 'sound', label: 'Ambient sound on / off' },
  { keys: ['Esc'], action: 'close', label: 'Close panel, end tour or leave an interior' },
];

const MAP = {
  '?': 'help', '/': 'search', a: 'aerial', n: 'north', g: 'ground', t: 'tour', f: 'focus', e: 'enter',
  p: 'plan', d: 'day', l: 'labels', s: 'systems', m: 'sound', '[': 'prev-facility', ']': 'next-facility',
};

function editable(target) {
  if (!target || typeof target !== 'object') return false;
  const tag = (target.tagName || '').toLowerCase();
  if (target.isContentEditable) return true;
  if (tag === 'textarea' || tag === 'select') return true;
  return tag === 'input' && !['checkbox', 'radio', 'button', 'range'].includes((target.type || '').toLowerCase());
}

/** Maps a keydown to an action name, or null when the key belongs to something else. */
export function shortcutFor(event, { touring = false } = {}) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return null;
  if (editable(event.target)) return null;
  if (touring && event.key === 'ArrowLeft') return 'tour-prev';
  if (touring && event.key === 'ArrowRight') return 'tour-next';
  return MAP[event.key?.length === 1 ? event.key.toLowerCase() : ''] ?? null;
}
