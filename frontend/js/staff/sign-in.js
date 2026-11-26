const form = document.getElementById('signInForm');
const errorBox = document.getElementById('signInError');
const passwordInput = document.getElementById('password');
const toggleBtn = document.getElementById('togglePassword');

// Example only: no authentication exists yet, so any non-empty pair continues to the request list.
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const missing = !form.elements.email.value.trim() || !passwordInput.value;
  errorBox.hidden = !missing;
  if (!missing) window.location.href = 'requests.html';
});

toggleBtn.addEventListener('click', () => {
  const show = passwordInput.type === 'password';
  passwordInput.type = show ? 'text' : 'password';
  document.getElementById('eyeIcon').classList.toggle('hidden', show);
  document.getElementById('eyeSlashIcon').classList.toggle('hidden', !show);
});
