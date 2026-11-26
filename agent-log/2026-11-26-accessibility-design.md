# 2026-11-26: Accessibility design

## Asked
Add accessibility to the site so it meets the conditions on the Kol Zchut page about website
accessibility in Israel. Also produce a concise HTML summary of the changes.

## Done (branch `feature/accessibility`, from `dev`; not pushed)
- Design written: `docs/superpowers/specs/2026-11-26-accessibility-design.md`. Awaiting approval.
- No product code changed.

## Verified
- Read the Kol Zchut page, the 2013 service-accessibility regulations (Nevo copy) and SI 5568
  part 1 (May 2021): level AA, WCAG 2.0 with national changes.
- Findings in the design come from reading code and computing contrast ratios. Not every page was
  read in full, and no automated scan or screen reader has been run.

## Decisions
- The owner chose compliance with the stated conditions; no accessibility widget.
- Agent's calls, open to change: statement page in Hebrew, rest of UI stays English; darker
  `primary` colour; staff pages included.

## Open
- Approval of the design, then an implementation plan.
- From the owner: contact details, whether there are 25+ employees (coordinator), any exemption.
- Node.js is not installed, so the geometry test in `CLAUDE.md` cannot run yet.
