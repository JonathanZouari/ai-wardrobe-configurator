# 2026-11-26 — Accessibility (IS 5568 / WCAG 2.0 AA)

## Asked
Make the site accessible according to the Israeli standard as described on Kol Zchut
("הנגשת אתרי אינטרנט ואפליקציות לאנשים עם מוגבלות"), within about 10 minutes of remaining time.

## Done (branch `feature/accessibility`, PR into `dev`)
- Decision: real code fixes to IS 5568 part 1 (WCAG 2.0, level AA, the level the 2013 service
  regulations require), no accessibility toolbar plugin. Kol Zchut does not require a plugin.
- All pages: skip link, `id="main"`, visible `:focus-visible` outline, focus ring on picture-card
  radios, `prefers-reduced-motion`, Material Symbols icon names hidden from screen readers
  (`aria-hidden`), decorative SVGs hidden, footer link to the accessibility statement.
- Contrast: tokens darkened in `stitch/tailwind.config.js` and, by direct edit (no Node on this
  machine), in `frontend/css/styles.css`: primary `#c2652a`→`#9a4a19`, hover `#aa5420`→`#7f3d14`,
  primary-container `#e08850`→`#8a4518`, secondary/subtle/outline greys → `#605850`.
  The a11y CSS block is appended to both `styles.css` and `stitch/tailwind.input.css`, so a rebuild keeps it.
- Start page: group titles are headings, radio groups named, dimension labels tied to inputs with
  limits as descriptions; a status line announces stepper values and corrected out-of-range values.
- Configurator: ARIA tabs with arrow/Home/End keys; `aria-pressed` on type, door, interior and
  finish toggles; labelled steppers and sliders; the 3D view is focusable with a text alternative
  describing the design, and arrow keys orbit / +- zoom; the status line moved out of the `role=img` element.
- Interior editor: focus is restored after every re-render; bay labels are buttons (bay selection
  without a mouse); add/move/remove/bay changes are announced; key help for component buttons.
- Assistant: focus moves to Undo / the input when the focused button disappears; replies to typed
  requests are announced through the status line.
- Staff pages: unlabeled currency select and pagination buttons named; contrast fixed.
- New `frontend/accessibility.html`: Hebrew statement with the four items Kol Zchut lists
  (how it was made accessible, how to operate it, what is not accessible + alternatives, contact).

## Verified
- axe-core (WCAG 2.0 A+AA rules) in Chrome over all 12 pages: 101 failing nodes before, 0 after.
  Script and venv were in the session scratchpad, not committed.
- Keyboard flow in Chrome (Playwright): first Tab hits the skip link; out-of-range width is
  announced; 3D view label describes the design; ArrowRight moves tabs; door toggle reports pressed;
  interior Add → focus on the new shelf, ArrowUp moves it and keeps focus, Delete removes it and
  focus lands on the bay button; each step announced. No page errors.
- Backend `pytest`: 73 passed.

## Not done / open
- `node --test frontend/tests/geometry.test.mjs` NOT run: Node is not installed on this machine.
- `security-review` skill NOT run (time limit). Changes are frontend markup/ARIA/CSS only, using
  `textContent`/`setAttribute`; no new HTML sinks.
- Statement placeholders must be filled by the owner: coordinator name, phone, email, address.
- Not tested with a real screen reader (NVDA/JAWS/VoiceOver), nor 200% zoom on every page.
- Statement page uses a few Tailwind classes not in the compiled CSS (no rebuild possible); it is
  readable but plainly styled until `styles.css` is regenerated.
- UI language is English (PRD open decision); Hebrew UI/RTL would need its own pass.
- Handles in the configurator are still non-functional; marked `aria-disabled`.
