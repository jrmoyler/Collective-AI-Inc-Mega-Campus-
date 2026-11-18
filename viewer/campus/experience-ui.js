// DOM glue for the visitor experience: help overlay, tour caption, hover label and
// draggable mobile sheets. Everything uses the opaque panel system in style.css.

export function renderShortcutHelp(list, shortcuts) {
  if (!list) return;
  list.replaceChildren(...shortcuts.map(({ keys, label }) => {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    for (const key of keys) { const kbd = document.createElement('kbd'); kbd.textContent = key; dt.append(kbd); }
    dd.textContent = label;
    row.append(dt, dd);
    return row;
  }));
}

export function createTourCaption(root, { onPrev, onNext, onToggle, onEnd }) {
  const q = s => root?.querySelector(s);
  if (!root) return { render() {}, hide() {} };
  q('[data-tour=prev]').onclick = onPrev;
  q('[data-tour=next]').onclick = onNext;
  q('[data-tour=play]').onclick = onToggle;
  q('[data-tour=end]').onclick = onEnd;
  const progress = q('.tour-progress');
  return {
    render(stop, { index, length, playing, reduced }, { district = '', dwell = 6500, arrived = false } = {}) {
      root.hidden = false;
      q('[data-tour=count]').textContent = `${String(index + 1).padStart(2, '0')} / ${String(length).padStart(2, '0')}`;
      q('[data-tour=district]').textContent = district;
      q('[data-tour=title]').textContent = stop.title;
      q('[data-tour=text]').textContent = stop.text;
      const play = q('[data-tour=play]');
      play.hidden = reduced;
      play.textContent = playing ? 'Pause' : 'Play';
      play.setAttribute('aria-pressed', String(!playing));
      q('[data-tour=prev]').disabled = index === 0;
      q('[data-tour=next]').textContent = index + 1 >= length ? 'Finish' : 'Next';
      root.dataset.playing = String(playing);
      // Restart the dwell bar only once the camera has arrived.
      progress.classList.remove('running');
      progress.style.setProperty('--dwell', `${dwell}ms`);
      if (playing && arrived && !reduced) { void progress.offsetWidth; progress.classList.add('running'); }
    },
    hide() { root.hidden = true; progress.classList.remove('running'); },
  };
}

export function createHoverLabel(el) {
  let current = null;
  return {
    show(key, name, x, y) {
      if (!el) return;
      if (current !== key) {
        const tag = document.createElement('b'); tag.textContent = key;
        el.replaceChildren(tag, name); current = key;
      }
      el.hidden = false;
      const w = el.offsetWidth, h = el.offsetHeight;
      el.style.left = `${Math.min(innerWidth - w - 8, x + 14)}px`;
      el.style.top = `${Math.max(70, y - h - 10)}px`;
    },
    hide() { if (el) el.hidden = true; current = null; },
  };
}

/**
 * Bottom sheets (≤760px) can be dragged down by their heading to dismiss, the way
 * native sheets behave. Buttons inside the heading keep working normally.
 */
export function bindSheetDrag(panel, close, { narrow = () => innerWidth < 761, threshold = 72 } = {}) {
  const handle = panel?.querySelector('.panel-heading');
  if (!handle) return;
  let start = null, dy = 0;
  handle.addEventListener('pointerdown', event => {
    if (!narrow() || event.target.closest('button')) return;
    start = event.clientY; dy = 0;
    handle.setPointerCapture?.(event.pointerId);
    panel.classList.add('dragging');
  });
  handle.addEventListener('pointermove', event => {
    if (start === null) return;
    dy = Math.max(0, event.clientY - start);
    panel.style.transform = `translateY(${dy}px)`;
  });
  const end = () => {
    if (start === null) return;
    start = null;
    panel.classList.remove('dragging');
    panel.style.transform = '';
    if (dy > threshold) close();
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}
