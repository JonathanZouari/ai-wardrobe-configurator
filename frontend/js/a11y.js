// Accessibility menu and baseline helpers (Israeli Standard 5568 / WCAG 2.0 AA).
// Loaded on every page as a module. Settings persist in localStorage on this device only.

export const STORAGE_KEY = 'a11y-settings';
export const SCALE_MIN = 100;
export const SCALE_MAX = 160;
export const SCALE_STEP = 10;

export const TOGGLES = [
  { key: 'contrast', label: 'High contrast' },
  { key: 'grayscale', label: 'Grayscale' },
  { key: 'links', label: 'Highlight links' },
  { key: 'font', label: 'Readable font' },
  { key: 'spacing', label: 'Text spacing' },
  { key: 'motion', label: 'Stop animations' },
  { key: 'cursor', label: 'Large cursor' },
];

export function defaultSettings() {
  const s = { scale: SCALE_MIN };
  for (const t of TOGGLES) s[t.key] = false;
  return s;
}

export function clampScale(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return SCALE_MIN;
  const stepped = Math.round(n / SCALE_STEP) * SCALE_STEP;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, stepped));
}

// Accepts whatever was stored (possibly tampered or from an older version) and returns
// a clean settings object containing only known keys with the right types.
export function parseSettings(raw) {
  const s = defaultSettings();
  let data;
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return s;
  }
  if (!data || typeof data !== 'object') return s;
  s.scale = clampScale(data.scale ?? SCALE_MIN);
  for (const t of TOGGLES) s[t.key] = data[t.key] === true;
  return s;
}

function statementHref() {
  const script = document.querySelector('script[src$="js/a11y.js"]');
  return script ? new URL('../accessibility.html', script.src).href : 'accessibility.html';
}

function apply(settings) {
  const root = document.documentElement;
  for (const t of TOGGLES) root.classList.toggle(`a11y-${t.key}`, settings[t.key]);
  root.style.fontSize = settings.scale === SCALE_MIN ? '' : `${settings.scale}%`;
}

function load() {
  try {
    return parseSettings(localStorage.getItem(STORAGE_KEY));
  } catch {
    return defaultSettings();
  }
}

function save(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private mode): settings last for this page only.
  }
}

function addSkipLink() {
  const main = document.querySelector('main');
  if (!main) return;
  if (!main.id) main.id = 'main-content';
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  const link = document.createElement('a');
  link.className = 'a11y-skip';
  link.href = `#${main.id}`;
  link.textContent = 'Skip to main content';
  document.body.prepend(link);
}

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildMenu(settings) {
  const wrap = el('div', { id: 'a11y-root' });

  const trigger = el('button', {
    type: 'button',
    class: 'a11y-trigger',
    'aria-expanded': 'false',
    'aria-controls': 'a11y-panel',
    'aria-label': 'Accessibility menu',
    title: 'Accessibility menu',
  });
  trigger.innerHTML =
    '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="4" r="2" fill="currentColor"/>' +
    '<path fill="currentColor" d="M20 8.5c-2.6.6-5.3.9-8 .9s-5.4-.3-8-.9l-.4 1.6c2 .5 4.1.8 6.2.9V14l-2.1 7.3 1.6.5L11.4 15h1.2l2.1 6.8 1.6-.5L14.2 14v-3c2.1-.1 4.2-.4 6.2-.9z"/></svg>';

  const panel = el('div', {
    id: 'a11y-panel',
    class: 'a11y-panel',
    role: 'dialog',
    'aria-modal': 'false',
    'aria-labelledby': 'a11y-title',
    hidden: '',
  });
  panel.append(el('h2', { id: 'a11y-title', class: 'a11y-title' }, 'Accessibility'));

  const status = el('p', { class: 'a11y-sr', 'aria-live': 'polite' });

  const sizeRow = el('div', { class: 'a11y-size', role: 'group', 'aria-label': 'Text size' });
  const dec = el('button', { type: 'button', class: 'a11y-btn', 'aria-label': 'Decrease text size' }, 'A−');
  const sizeValue = el('span', { class: 'a11y-size-value' });
  const inc = el('button', { type: 'button', class: 'a11y-btn', 'aria-label': 'Increase text size' }, 'A+');
  sizeRow.append(dec, sizeValue, inc);
  panel.append(el('p', { class: 'a11y-label' }, 'Text size'), sizeRow);

  const list = el('div', { class: 'a11y-list' });
  const toggleButtons = {};
  for (const t of TOGGLES) {
    const b = el('button', { type: 'button', class: 'a11y-btn a11y-toggle', 'aria-pressed': 'false' }, t.label);
    b.addEventListener('click', () => {
      settings[t.key] = !settings[t.key];
      update(`${t.label} ${settings[t.key] ? 'on' : 'off'}`);
    });
    toggleButtons[t.key] = b;
    list.append(b);
  }
  panel.append(list);

  const reset = el('button', { type: 'button', class: 'a11y-btn a11y-reset' }, 'Reset all settings');
  const statement = el('a', { class: 'a11y-statement', href: statementHref() }, 'Accessibility statement');
  panel.append(reset, statement, status);

  function update(message) {
    apply(settings);
    save(settings);
    sizeValue.textContent = `${settings.scale}%`;
    dec.disabled = settings.scale <= SCALE_MIN;
    inc.disabled = settings.scale >= SCALE_MAX;
    for (const t of TOGGLES) toggleButtons[t.key].setAttribute('aria-pressed', String(settings[t.key]));
    if (message) status.textContent = message;
  }

  dec.addEventListener('click', () => {
    settings.scale = clampScale(settings.scale - SCALE_STEP);
    update(`Text size ${settings.scale}%`);
  });
  inc.addEventListener('click', () => {
    settings.scale = clampScale(settings.scale + SCALE_STEP);
    update(`Text size ${settings.scale}%`);
  });
  reset.addEventListener('click', () => {
    Object.assign(settings, defaultSettings());
    update('All accessibility settings reset');
  });

  function open() {
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    panel.querySelector('button:not(:disabled)').focus();
  }
  function close(returnFocus) {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger.focus();
  }
  trigger.addEventListener('click', () => (panel.hidden ? open() : close(false)));
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      e.preventDefault();
      close(true);
    }
  });
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !wrap.contains(e.target)) close(false);
  });

  wrap.append(trigger, panel);
  document.body.append(wrap);
  update();
}

function init() {
  const settings = load();
  apply(settings);
  addSkipLink();
  buildMenu(settings);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
