# 2026-11-26: Accessibility (IS 5568 / WCAG 2.0 AA)

## Asked
The owner (in Hebrew) asked to pull all branches and develop accessibility on a new branch,
following the Kol Zchut page on making websites and apps accessible to people with disabilities.

## Source read
- Kol Zchut, "הנגשת אתרי אינטרנט ואפליקציות לאנשים עם מוגבלות" (updated 1 Nov 2026): IS 5568 Part 1,
  based on WCAG 2.0; the statement must say how the site was made accessible, how to use it, what is
  not accessible with alternatives, and how to contact the operator. The page states no conformance
  level and says nothing about toolbars.
- The gov.il guide (statement fields, coordinator) refused automated access (HTTP 403) and was not
  read. Level AA, the coordinator contact details and the update date in the statement follow common
  practice under regulation 35, not a page read this session.

## Done (branch `feature/accessibility` from `dev`, not committed yet)
- Every page: skip link to `main#main-content`, `css/a11y.css`, Material icon ligatures marked
  `aria-hidden` (screen readers used to read "arrow_forward" etc.), icon-only buttons named from their
  title, `aria-current="page"` on the current step. Public pages link to the statement in the footer.
- `css/a11y.css`: strong `:focus-visible` outline that overrides `focus:outline-none`, focus ring on
  card radios (`sr-only` inputs), `prefers-reduced-motion`, forced-colors support. Kept out of the
  generated `styles.css` so regenerating Tailwind does not drop it.
- Colour tokens darkened for 4.5:1 text contrast, in both `styles.css` and `stitch/tailwind.config.js`:
  primary/sienna `#c2652a` -> `#9a4817` (was 3.7:1, white on it 4.05:1), primary-container
  `#e08850` -> `#8a4115` (hover background under white text, was 2.7:1), outline `#9a9088` -> `#6f665e`
  (was 2.9:1). The Three.js rim light colour was left as it is.
- Start page: group "labels" that labelled nothing became headings with `role="radiogroup"`;
  dimension inputs got real labels and the allowed range as a description; the check marks on the
  option cards were static (the hinged card always looked selected) and now follow the selection.
- 3D configurator: ARIA tabs with arrow/Home/End keys; `aria-pressed` on wardrobe type, carcass
  finish and hide-doors; labels for number inputs, sliders and +/- buttons; the canvas is focusable
  (`OrbitControls.listenToKeyEvents`, arrows pan) and has `role="img"` with a description of the
  design that updates on every change; the floating dimension tags are `aria-hidden` (duplicates).
- Interior editor: bay names are buttons, so the target bay can be chosen by keyboard; focus is put
  back on the same control after every re-render (before, focus was lost after each arrow-key move);
  after Delete it falls back to the bay; keyboard instructions are visible; sr-only h1.
- Assistant panel: focus moves to Undo after Accept and to the input after Reject/Undo; the scrollable
  transcript is focusable.
- Other pages: sr-only h1 on the AI proposal page; labels for price, currency and the internal note
  on staff pages.
- `accessibility.html`: statement in Hebrew (RTL) and English: standard, what was done, keyboard use,
  known limitations with alternatives, coordinator contact, last update date.
- `frontend/tests/a11y.test.mjs`: static checks over every page (lang, title, one h1, skip link, main,
  hidden icons, img alt, named icon buttons, statement link, statement content).

## Verified
- Backend: 73 passed. Frontend: geometry + a11y, 48 passed. Node is not installed on this machine;
  the suites ran with Cursor's bundled Node (`ELECTRON_RUN_AS_NODE=1 Cursor.exe --test ...`, v24).
- E2E in headless Chrome over the DevTools protocol against the running backend, 26 checks passed:
  skip link with Tab and Enter, radio group and labels, selection mark following the choice, launch to
  the configurator, canvas description (type, then material after a change), tab keys including wrap,
  pressed states, interior bay selection with Enter, Add into the chosen bay, ArrowUp moves and keeps
  focus, Delete removes and focus falls back to the bay, statement lang/dir, no script errors.
  Screenshots were checked by eye (focus ring, colours, RTL statement).
- NOT verified: a real screen reader (NVDA/JAWS/VoiceOver), mobile, 200% zoom, the staff pages beyond
  the static checks, and an audit by a certified accessibility consultant (מורשה נגישות שירות).

## Decisions
- No accessibility toolbar/overlay: the source does not require one, and real fixes in the markup are
  what the standard measures.
- The UI stays English; the statement is bilingual because the audience is Israeli.
- Staff pages are internal, so they get the shared fixes but no statement link.

## Open
- The statement's coordinator name, phone, email and address are placeholders: the business must fill
  them in before going live.
- Free orbit/zoom and clicking a single drawer in the 3D view remain mouse/touch only (listed in the
  statement with alternatives).
- Interface language is English only; the PDF summary download has no accessible PDF yet.
- Not committed or pushed; security review and the PR into `dev` are still to do (CLAUDE.md 3 and 5).
