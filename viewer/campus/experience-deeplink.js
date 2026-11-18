// Shareable explorer state: ?facility=CF-07&floor=2&inside=1&view=north
// Floors are the visitor-facing level number (L02 / B2 = 2), not a zero index.
// Unrelated parameters (debug, qa, legacyDepth …) are always preserved.

const VIEWS = ['aerial', 'north', 'ground'];
const OWN = ['facility', 'floor', 'inside', 'view', 'tour'];

export function parseFacility(value, facilities) {
  if (!value) return null;
  const match = String(value).trim().match(/^(?:cf-?)?0*(\d{1,2})$/i);
  if (!match) return null;
  const id = Number(match[1]);
  return facilities.some(f => f.id === id) ? id : null;
}

export function parseDeepLink(search, facilities) {
  const params = new URLSearchParams(search);
  const facility = parseFacility(params.get('facility'), facilities);
  const f = facilities.find(item => item.id === facility);
  let floor = null;
  const rawFloor = params.get('floor');
  if (f && rawFloor) {
    const level = rawFloor.trim().match(/^[lb]?0*(\d{1,2})$/i);
    const index = level ? Number(level[1]) - 1 : -1;
    if (index >= 0 && index < f.levels) floor = index;
  }
  const view = VIEWS.includes(params.get('view')) ? params.get('view') : null;
  const truthy = key => ['1', 'true', 'yes'].includes((params.get(key) || '').toLowerCase());
  return { facility, floor, inside: !!f && truthy('inside'), view, tour: truthy('tour') };
}

/** Returns the new query string (with leading "?" or empty) for the given state. */
export function serializeDeepLink(search, facilities, { facility = null, floor = null, inside = false, view = null } = {}) {
  const params = new URLSearchParams(search);
  for (const key of OWN) params.delete(key);
  const f = facilities.find(item => item.id === facility);
  if (f) {
    params.set('facility', f.key || `CF-${String(f.id).padStart(2, '0')}`);
    if (Number.isInteger(floor) && floor > 0 && floor < f.levels) params.set('floor', String(floor + 1));
    if (inside) params.set('inside', '1');
  } else if (VIEWS.includes(view) && view !== 'aerial') {
    params.set('view', view);
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}
