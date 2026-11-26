# 2026-11-26 — Accessibility (menu, statement, WCAG AA fixes)

## Asked
Add accessibility "like every site and app has", following the Kol Zchut page on making websites
and apps accessible to people with disabilities (Israeli Standard 5568 / WCAG 2.0). Then open a PR
and merge into `dev`.

## Done
- Branch `feature/accessibility` from `dev`. Commit `6f99b4e` (feature) plus this log.
- `frontend/js/a11y.js` (ES module, loaded on all 12 pages): accessibility menu bottom-right
  (text size 100–160%, high contrast, grayscale, highlight links, readable font, text spacing,
  stop animations, large cursor, reset, link to the statement). Keyboard operable, Escape closes
  and returns focus, changes announced in a live region. Settings in localStorage
  `a11y-settings`, parsed strictly (known keys only, scale clamped).
- Skip-to-content link injected on every page; global `:focus-visible` outline;
  `prefers-reduced-motion` respected (`frontend/css/a11y.css`).
- `frontend/accessibility.html`: statement in Hebrew (RTL) with an English section. Linked from
  the menu and from the footers of the 6 customer pages (staff pages reach it via the menu).
- Fixed existing axe WCAG 2 A/AA violations: primary colour `#c2652a` → `#9b4c1c` (styles.css and
  two staff pages; the 3D rim light in configurator.js left as is), `text-secondary`,
  `text-subtle-text`, `text-outline` → rgb(100 93 88); aria-labels on size inputs/sliders,
  currency select, pagination buttons; a few low-contrast opacity classes removed.

## Verified
- Backend: `pytest -q` → 73 passed.
- `node --test` could not run: Node.js is not installed on this machine. The same assertions as
  `frontend/tests/a11y.test.mjs` were run inside the browser instead and passed. Still run the
  node suite (geometry + a11y) on a machine with Node.
- End to end: headless Edge driven over CDP (script kept outside the repo) against the running
  servers, all 12 pages: menu + skip link + statement link present, no JS errors, first Tab →
  skip link, Enter → main, menu opens from keyboard with focus inside, Escape returns focus,
  A+ ×2 → 120%, contrast/links applied and persisted to another page, reset, tampered storage
  ignored, all 7 toggles, fixed header intact under grayscale. 51/51 passed. axe-core 4.10
  (WCAG 2 A/AA rules) → 0 violations on all 12 pages.
- Security review skill: no findings.

## Decisions
- Kol Zchut does not list the statement's required fields; the statement covers what the page
  names (what was made accessible, how to use it, what is not accessible and alternatives,
  how to contact). Claims were trimmed to what was verified: no "full keyboard navigation"
  claim, and the review page is not claimed to show the design (it is still static mockup).
- Menu labels in English to match the English UI; the statement is Hebrew-first.
- Primary colour darkened rather than kept, because 4.05:1 fails AA for text.

## Open
- Statement contact details (coordinator name, phone, email) are `[to be filled in]` placeholders.
- Interior editor and 3D drag actions not tested with keyboard-only and screen readers.
- axe covers automated checks only; a manual screen-reader pass (NVDA) has not been done.
