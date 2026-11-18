// Screen-reader announcements and first-run onboarding decisions.

/** Spoken summary of a facility selection, from the supplied programme only. */
export function describeFacility(f, districts, levelCode, floor = 0) {
  const floors = `${f.levels} ${f.levels === 1 ? 'floor' : 'floors'}`;
  const level = f.levels > 1 ? ` Arrival ${levelCode(f, floor)}: ${f.program[floor].split(';')[0]}.` : '';
  return `${f.key} ${f.name}. ${districts[f.district]} district, ${floors}.${level}`;
}

/**
 * Polite live region. Clearing first and writing on the next task makes repeated
 * identical messages (e.g. selecting the same facility twice) announce again.
 */
export function createAnnouncer(el, defer = fn => setTimeout(fn, 60)) {
  let pending = 0;
  return text => {
    if (!el) return;
    const request = ++pending;
    el.textContent = '';
    defer(() => { if (request === pending) el.textContent = text; });
  };
}

export const ONBOARDING_KEY = 'campus-welcome-v1';

/** Show the welcome card once, never over a shared link or automated review. */
export function shouldShowOnboarding({ storage, search = '', automated = false } = {}) {
  const params = new URLSearchParams(search);
  if (params.has('welcome')) return true;
  if (automated || params.has('facility') || params.has('debug') || params.get('qa') === '1') return false;
  try { return storage?.getItem(ONBOARDING_KEY) !== 'seen'; } catch { return false; }
}

export function rememberOnboarding(storage) {
  try { storage?.setItem(ONBOARDING_KEY, 'seen'); } catch { /* private mode */ }
}
