const panel = document.getElementById('diff-panel');
const toggleBtn = document.getElementById('toggle-diff-btn');

toggleBtn.addEventListener('click', () => {
  panel.hidden = !panel.hidden;
  toggleBtn.setAttribute('aria-pressed', String(!panel.hidden));
});

document.querySelectorAll('[data-close-diff]').forEach((btn) => {
  btn.addEventListener('click', () => {
    panel.hidden = true;
    toggleBtn.setAttribute('aria-pressed', 'false');
  });
});
