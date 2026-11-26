# 2026-11-26: Phase 3, editor and catalog (plus state of the project so far)

## Asked
Continue to PRD phase 3 (editor and catalog). Mid-task the owner added the working rules now in
`CLAUDE.md` (feature branch from `dev`, regression + e2e, security review, this log, PR-only).

## State before this action
- `main` (`e366762`): PRD, raw Stitch export in `stitch/`, 11 static pages in `frontend/`.
- `dev` (`2308270`): FastAPI skeleton (`/api/health`), canonical design model, stateless
  `POST /api/designs`, 3D configurator rendering every mesh from the design.
- Phases 1 and 2 were committed straight to `dev`, before the branch and PR rules existed.
- Railway and Supabase are deliberately not connected (owner's decision; later stage).

## Done (branch `feature/phase-3-editor`, PR into `dev`)
- Backend: `GET /api/catalog`; templates `empty` / `hanging` / `mixed`; typed operations
  (`add_component`, `move_component`, `remove_component`, `set_dimensions`, `set_wardrobe_type`,
  `set_bays`, `set_material`, `set_accessory`, `apply_template`) via `POST /api/designs/operations`.
  A batch is atomic and yields one new revision. `Design.layout` exposes bays and interior height.
- Design: structural parts (carcass, partitions, doors) are always regenerated from a small spec;
  interior items keep their id, bay and height and are re-fitted on resize or type change.
- Frontend: `js/state/draft.js` holds the draft in `sessionStorage` and serialises requests;
  start page creates or resizes the draft; configurator edits through operations;
  `interior.html` is a working editor (drag and drop, Add buttons, arrow keys, properties panel,
  bay count, LED accessory).

## Verified
- Regression: backend `pytest` 47 passed; frontend geometry tests 5 passed.
- E2E in Chrome against the running backend: start page (3000 mm, sliding, start empty) created
  the draft and opened the configurator; in the interior editor add, arrow-key move, move to
  another bay, duplicate, drop from catalog, bays + / -, backend rejection message
  ("This width allows 3 to 9 bays"), LED toggle and remove all changed the stored draft as expected.
- Not exercised: real mouse dragging (the drop was dispatched from script), the 3D view after
  interior edits, and the review / AI proposal pages, which are still static mock-ups.

## Decisions
- Stateless API: the client sends the draft back with each batch. Server-side sessions, revision
  conflict checks and persistence wait for the database.
- All catalog values and construction constants are development examples
  (`backend/app/catalog/example_v1.py`); the carpentry business has supplied none yet.
- Door count follows bay count (2 hinged doors per bay; sliding panels = max(2, bays)).
- The CSS is compiled once from utility classes (`stitch/tailwind.config.js`); regenerate after
  adding classes.

## Open
- Phase 4: deterministic validation (collisions, spacing, compatibility). Today only bounds are
  enforced by clamping, and the editor says "Rule checking is not connected yet".
- Header chips on customer pages still read "Rules: passed (example)".
- Bay cards in the configurator side panel are still static text.
- No automated browser test suite; e2e is a scripted manual run.
- Stitch project `1009266073155508731` still shows the pre-clean-up screens 02 to 09.
