const status = document.getElementById('quotation-status');

document.getElementById('save-draft-btn').addEventListener('click', () => {
  status.textContent = 'Draft saved (example, not persisted).';
});

document.getElementById('quotation-form').addEventListener('submit', (event) => {
  event.preventDefault();
  status.textContent = 'Sending is not available: delivery channel not configured.';
});
