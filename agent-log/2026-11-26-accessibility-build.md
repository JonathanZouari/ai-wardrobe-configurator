# 2026-11-26: Accessibility build (SI 5568)

## Asked
Make the site meet the accessibility conditions (see the design), with a concise HTML summary.

## Done (branch `feature/accessibility`, from `dev`; committed locally, not pushed, no PR)
- All 11 pages fixed, `frontend/accessibility.html` added, summary in `docs/accessibility-changes.html`.
- `frontend/js/three/describe.js`: text alternative for the 3D view; keyboard buttons for drawers,
  rotate, zoom and pan.
- New tests: `backend/tests/test_frontend_accessibility.py`, `frontend/tests/describe.test.mjs`.

## Verified
- pytest 231 passed; node tests 8 of 8 passed.
- axe-core 4.10.2 (wcag2a, wcag2aa), 12 pages at 1440 and 640 px: 0 violations (baseline 220 nodes).
- Playwright keyboard / zoom / backend-down script: 56 of 56 in one run. After restarting the backend
  on this branch's code, 55 of 56: the failure was the local static server resetting stylesheet requests.
- Security review by the author, inline: only textContent DOM writes, no new external resources,
  no findings.
- Tools lived outside the repo (session scratchpad): Playwright for Python driving Edge, its bundled
  Node, and the Tailwind 3.4.17 standalone binary (rebuild matched the committed CSS before edits).

## Decisions
- `radiogroup` roles instead of fieldset/legend, to keep the layout. No `a11y.js` was needed.
- Primary colour #9e4d1c; headers stick only from 1280 px wide.
- One final commit for the build instead of one per task.
- No subagent review; the diff was reviewed only by its author.

## Open
- Screen reader test and an accessibility authorized person's review.
- Statement placeholders (business contact, coordinator) and the exemption question.
- Voice session and assistant proposals not exercised.
- `python -m http.server` sometimes reset the stylesheet request during automated runs.
- Push and PR into `dev` need the owner's go-ahead.
