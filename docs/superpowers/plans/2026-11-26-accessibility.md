# Accessibility (SI 5568) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring all pages to WCAG 2.0 A/AA as adopted by SI 5568, and publish an accessibility statement.

**Architecture:** Fix the existing static pages in place. Shared rules live in the Tailwind input file and one small script (`frontend/js/a11y.js`); page behaviour is fixed in each page script.

**Tech Stack:** Vanilla HTML/CSS/JS, Tailwind 3.4.17 (build only), pytest; Playwright + axe-core as local verification tools outside the repo.

**Spec:** `docs/superpowers/specs/2026-11-26-accessibility-design.md`

## Global Constraints

- No new runtime dependency on the site.
- UI stays English; `accessibility.html` is Hebrew with `lang="he" dir="rtl"`.
- `primary` becomes `#9e4d1c`.
- No accessibility widget.
- No claim of full compliance in the statement; unknown business details read "להשלמה".
- No push.

## Review Focus

- Interior editor re-render after add / move / remove: focus stays on a sensible control, never `body`.
- Keyboard user on the 3D page: every drawer and door can be opened without a pointer.
- 640px-wide viewport (200% zoom): navigation reachable, no clipped controls.
- Backend down: the error message is announced and the page stays operable.
- Hidden panels and tabs: nothing hidden is reachable by Tab.

---

### Task 1: Checks and baseline

**Files:** Create `backend/tests/test_frontend_accessibility.py`; scratchpad `axe_scan.py` (not committed).

- [ ] Write static tests over every `frontend/**/*.html`: `test_language_and_title`, `test_skip_link_targets_main`, `test_single_h1_and_no_skipped_levels`, `test_form_controls_have_names`, `test_icons_are_hidden`, `test_footer_links_to_statement`, `test_images_have_alt`.
- [ ] Run `cd backend && .venv/Scripts/python -m pytest -q`; expect the new tests to FAIL.
- [ ] Scan every page with axe-core (tags `wcag2a`, `wcag2aa`) in headless Edge; save the baseline.

### Task 2: Shared base and colours

**Files:** All HTML pages; `stitch/tailwind.config.js`, `stitch/tailwind.input.css`, `frontend/css/styles.css`.

- [ ] Each page: first element in `body` is `<a class="skip-link" href="#main">`; `<main id="main" tabindex="-1">`; icon spans get `aria-hidden="true"`; `aria-current="page"` on the active step; `nav` has `aria-label`; footer link `Accessibility statement / הצהרת נגישות`.
- [ ] One `:focus-visible` outline rule, `.skip-link` rule, `prefers-reduced-motion` rule; remove focus suppression.
- [ ] `primary` → `#9e4d1c`; raise low-contrast text classes to `on-surface-variant`.
- [ ] Navigation visible at every width; remove fixed-height clipping below `xl`.
- [ ] Rebuild CSS with the command in README.
- [ ] Commit.

### Task 3: Start page and 3D configurator

**Files:** `index.html`, `js/index.js`, `configurator.html`, `js/configurator.js`.

**Interfaces:** Produces `describeDesign(design, catalogLabels?) -> string` in `js/three/describe.js`; test `frontend/tests/describe.test.mjs` asserts the string contains type, `2400 × 2400 × 600 mm`, bay count and each bay's components.

- [ ] Write the failing `describe.test.mjs`, then implement.
- [ ] Fieldsets/legends and linked labels; visible focus on radio cards.
- [ ] Tabs per ARIA tabs pattern (arrow keys, `aria-selected`); toggles use `aria-pressed`.
- [ ] Canvas: text description (`aria-live="polite"`), buttons for rotate left/right, zoom in/out, and one open/close button per drawer.
- [ ] Controls with no behaviour (handle buttons, bay preview cards) are not focusable.
- [ ] Reduced motion makes camera and door movement immediate.
- [ ] Commit.

### Task 4: Interior editor and assistant

**Files:** `interior.html`, `js/interior.js`, `js/ai/assistant.js`.

- [ ] Add `h1`; each re-render restores focus by a stable `data-focus-key`; after remove, focus the bay's button.
- [ ] Bay selection is a real button; keyboard instructions visible; every operation result announced in `#editor-status`.
- [ ] Assistant: collapsible with `aria-expanded`, full scrollable transcript with `role="log"`, focus moves to the proposal card and back to the input.
- [ ] Commit.

### Task 5: Remaining pages and statement

**Files:** `ai-proposal.html`, `review.html`, `confirmation.html`, `staff/*.html` and scripts; create `frontend/accessibility.html`.

- [ ] Labels, headings, table headers with `scope`, error text linked by `aria-describedby`, live regions, `autocomplete` on contact fields, SVG preview gets a name.
- [ ] Write the statement with the sections in spec item 8.
- [ ] Static tests all PASS; commit.

### Task 6: Verify and report

- [ ] axe scan on all pages and dynamic states: zero violations, or each one documented.
- [ ] Keyboard run of the customer flow in the browser; 640px check; backend-down check.
- [ ] `pytest -q` and `node --test frontend/tests/*.test.mjs` (Node from the Playwright driver).
- [ ] Run the `security-review` skill on the branch.
- [ ] Write `docs/accessibility-changes.html` and the agent log; commit.
