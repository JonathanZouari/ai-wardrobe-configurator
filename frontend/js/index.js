const LIMITS = {
  width: { min: 1200, max: 3600, fallback: 2400 },
  height: { min: 1800, max: 2800, fallback: 2400 },
  depth: { min: 450, max: 750, fallback: 600 },
};

const clamp = (field, raw) => {
  const { min, max, fallback } = LIMITS[field];
  return Math.max(min, Math.min(max, parseInt(raw, 10) || fallback));
};

const checkedValue = (name, fallback) =>
  document.querySelector(`input[name="${name}"]:checked`)?.value || fallback;

// Normalise the inputs and hand the choices to the configurator page.
function syncSpecs() {
  const dims = Object.fromEntries(
    Object.keys(LIMITS).map((field) => {
      const input = document.getElementById(`input-${field}`);
      const value = clamp(field, input.value);
      input.value = value;
      return [field, value];
    })
  );
  try {
    sessionStorage.setItem('atelier_wardrobe_specs', JSON.stringify({
      ...dims,
      typology: checkedValue('typology', 'hinged'),
      pathway: checkedValue('start_pathway', 'templates'),
    }));
  } catch (e) {
    // Storage unavailable: the configurator falls back to its defaults.
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('button[data-field]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(`input-${btn.dataset.field}`);
      input.value = (parseInt(input.value, 10) || 0) + Number(btn.dataset.delta);
      syncSpecs();
    });
  });
  document
    .querySelectorAll('input[type="number"], input[name="typology"], input[name="start_pathway"]')
    .forEach((el) => el.addEventListener('change', syncSpecs));
  document.getElementById('btn-launch-studio')?.addEventListener('click', syncSpecs);
  syncSpecs();
});
