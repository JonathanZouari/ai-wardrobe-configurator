document.getElementById('quotationForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  // Backend submission comes later; a valid submit goes straight to the confirmation page.
  window.location.href = 'confirmation.html';
});
