// The customer's draft design, shared by all pages through sessionStorage (no account, no
// cross-device persistence). The backend computes every new revision; this module only
// stores the latest one and serialises requests so edits cannot overtake each other.
import { applyOperations, createDesign } from '../api/client.js';

const KEY = 'wardrobe_draft';
const DEFAULT_REQUEST = { type: 'hinged', dimensions: { width: 2400, height: 2400, depth: 600 }, template: 'mixed' };

let queue = Promise.resolve();

export function loadDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY));
  } catch (e) {
    return null;
  }
}

function saveDraft(design) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(design));
  } catch (e) {
    // Storage unavailable: the page keeps working with the in-memory design.
  }
  return design;
}

// Puts back an earlier revision of this draft (undo of an applied proposal).
export const restoreDraft = (design) => saveDraft(design);

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch (e) {
    // Nothing stored, nothing to clear.
  }
}

export async function createDraft({ type, dimensions, template }) {
  return saveDraft(await createDesign(type, dimensions, {}, template));
}

// The stored draft, or a default one when a page is opened directly.
export async function ensureDraft() {
  return loadDraft() ?? createDraft(DEFAULT_REQUEST);
}

// Applies a batch to the current draft. Batches run one after another, each on the result of the previous.
export function applyDraftOperations(operations) {
  const run = async () => saveDraft(await applyOperations(await ensureDraft(), operations));
  const result = queue.then(run);
  queue = result.catch(() => {});
  return result;
}
