// Start page: wardrobe type, overall size and starting method. Launching creates the draft
// design (or resizes the existing one) and opens the configurator.
import { applyDraftOperations, clearDraft, createDraft, loadDraft } from './state/draft.js';

// Example limits, mirrored from the backend catalog to tidy the inputs; the backend re-checks them.
const LIMITS = {
  width: { min: 1200, max: 3600, fallback: 2400 },
  height: { min: 1800, max: 2800, fallback: 2400 },
  depth: { min: 450, max: 750, fallback: 600 },
};
const TEMPLATE_FOR = { templates: 'mixed', ai: 'empty', scratch: 'empty' };

const clamp = (field, raw) => {
  const { min, max, fallback } = LIMITS[field];
  return Math.max(min, Math.min(max, parseInt(raw, 10) || fallback));
};
const input = (field) => document.getElementById(`input-${field}`);
const checkedValue = (name, fallback) => document.querySelector(`input[name="${name}"]:checked`)?.value || fallback;

function readDimensions() {
  return Object.fromEntries(Object.keys(LIMITS).map((field) => {
    const value = clamp(field, input(field).value);
    input(field).value = value;
    return [field, value];
  }));
}

function showExistingDraft(draft) {
  Object.keys(LIMITS).forEach((field) => { input(field).value = draft.dimensions_mm[field]; });
  const radio = document.getElementById(`type-${draft.wardrobe_type}`);
  if (radio) radio.checked = true;
}

const launch = document.getElementById('btn-launch-studio');
const problem = document.createElement('p');
problem.className = 'text-xs text-error';
problem.setAttribute('role', 'alert');
launch.parentElement.appendChild(problem);

async function start(event) {
  event.preventDefault();
  const type = checkedValue('typology', 'hinged');
  const dimensions = readDimensions();
  problem.textContent = '';
  try {
    if (loadDraft()) {
      await applyDraftOperations([
        { op: 'set_wardrobe_type', wardrobe_type: type },
        { op: 'set_dimensions', dimensions_mm: dimensions },
      ]);
    } else {
      await createDraft({ type, dimensions, template: TEMPLATE_FOR[checkedValue('start_pathway', 'templates')] });
    }
    location.href = launch.getAttribute('href');
  } catch (error) {
    problem.textContent = `Could not start the design: ${error.message}`;
  }
}

if (new URLSearchParams(location.search).has('new')) clearDraft();
const existing = loadDraft();
if (existing) showExistingDraft(existing);

document.querySelectorAll('button[data-field]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const field = btn.dataset.field;
    input(field).value = clamp(field, (parseInt(input(field).value, 10) || 0) + Number(btn.dataset.delta));
  });
});
document.querySelectorAll('input[type="number"]').forEach((el) => el.addEventListener('change', readDimensions));
launch.addEventListener('click', start);
