const tabs = document.querySelectorAll('[data-status]:is(button)');
const rows = document.querySelectorAll('tbody tr[data-status]');
const ACTIVE = ['font-semibold', 'text-sienna', 'border-sienna'];
const IDLE = ['font-medium', 'text-muted-text', 'hover:text-bark', 'border-transparent'];

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const status = tab.dataset.status;
    rows.forEach((row) => { row.hidden = status !== '' && row.dataset.status !== status; });
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-pressed', String(on));
      t.classList.add(...(on ? ACTIVE : IDLE));
      t.classList.remove(...(on ? IDLE : ACTIVE));
    });
  });
});
