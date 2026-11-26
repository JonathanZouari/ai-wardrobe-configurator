# AI Wardrobe Configurator

Design-to-quotation web app for a carpentry business. See [PRD.md](PRD.md) for the full specification.

## Layout

| Path | What |
|---|---|
| `frontend/` | Static pages in vanilla HTML, CSS and JavaScript (customer flow + `staff/`) |
| `backend/` | FastAPI application |
| `stitch/` | Raw design export from Google Stitch and the build-time design tokens |

## Branches

- `dev`: development work, will deploy to the Railway Development environment
- `main`: production, will deploy to the Railway Production environment

Railway and Supabase are not connected yet.

## Run locally

Backend (Python 3.13):

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
pytest
```

Frontend unit tests (Node 22):

```bash
node --test frontend/tests/geometry.test.mjs
```

Health check: <http://127.0.0.1:8000/api/health>. The 3D configurator page needs the backend running: it asks `POST /api/designs` for the design it renders.

Frontend: serve the folder with any static server on port 5500 (the origin the backend allows by default):

```bash
python -m http.server 5500 --directory frontend
```

## Design assistant (voice and text)

Optional. The configurator and interior pages show an assistant panel: "Start talking" opens a
GPT-Live voice session in client-delegation mode, and the text box does the same without a microphone.
Both ask the backend agent for a proposal, which is applied only after you press Accept.

To enable it, put an OpenAI API key in `backend/.env` (never commit it) and restart the backend:

```
OPENAI_API_KEY=...
```

Without a key the panel reports that the assistant is not configured and the editor works as usual.
The microphone needs `http://localhost` / `127.0.0.1` or HTTPS. See `docs/voice-agent-decision.html`
for why this architecture was chosen.

## Regenerate the stylesheet

Only needed after changing utility classes in the markup:

```bash
npx tailwindcss@3.4.17 -c stitch/tailwind.config.js -i stitch/tailwind.input.css -o frontend/css/styles.css
```
