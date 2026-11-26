# Working rules for this repository

Product spec: [PRD.md](PRD.md). Run instructions: [README.md](README.md).

## 1. Branching

- Every new piece of work starts on its own branch created from `dev`
  (`git checkout dev && git pull && git checkout -b feature/<short-name>`).
- Develop only on that branch. Never commit directly to `main`, and do not develop on `dev` itself.

## 2. Tests after writing code

When the code for a task is written, before anything is pushed, run both:

- **Regression:** the full existing suites, not only the new tests.
  - `cd backend && .venv/Scripts/python -m pytest -q`
  - `node --test frontend/tests/geometry.test.mjs`
- **End to end:** exercise the affected user flow in a real browser against the running backend
  (`uvicorn app.main:app --port 8000` in `backend/`, and
  `python -m http.server 5500 --directory frontend`). Record what was exercised and the result.

Report failures as failures. Do not push with a failing suite.

## 3. Security review

After the tests pass, run the `security-review` skill on the branch's changes and fix what it finds
before opening the pull request.

## 4. Agent log (secondary memory)

At the end of every action, add an entry under [`agent-log/`](agent-log/) so a later session can
pick up without the conversation. One file per action, named `YYYY-MM-DD-<short-name>.md`, containing:
what was asked, what was done (branch, commits, PR), what was verified and how, decisions and their
reasons, and what is left open. Read the latest entries at the start of a session.

## 5. Pull requests

Changes reach GitHub branches only through a pull request: push the feature branch, open a PR into
`dev`, and merge there. `dev` reaches `main` through a PR as well. Never push straight to `dev` or `main`.
