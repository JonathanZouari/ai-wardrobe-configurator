# 2026-11-26: Voice agent with GPT-Live client delegation

## Asked
After comparing the three architectures in OpenAI's voice agents guide
(`docs/voice-agent-decision.html`), the owner chose GPT-Live with client delegation and asked for
it to be built, then to run the app and try it together.

## Earlier the same day (not logged at the time)
PR #1 (phase 3) was merged into `dev`, and PR #2 brought `main` level with `dev`.

## Done (branch `feature/voice-agent`, PR into `dev`)
- `backend/app/ai/agent.py`: the design agent. Gets a design summary plus the recent conversation,
  asks a text model for `{"reply", "operations"}`, parses the operations with the same schemas as
  manual edits and dry-runs them through `apply_operations`. Returns a `Proposal` (reply, operations,
  readable changes, base revision, preview design). It cannot change a design.
- `backend/app/ai/openai_provider.py`: the only place that talks to OpenAI, over `httpx`.
  `OpenAIAgentModel` uses `POST /v1/responses`; `create_voice_session` uses `POST /v1/live/sessions`
  with `delegation: {type: "client"}` and a WebRTC SDP offer, returning the SDP answer.
- `backend/app/api/assistant.py`: `POST /api/agent/proposals` and `POST /api/voice/session`.
  Both answer 503 without `OPENAI_API_KEY`, are rate limited per client address
  (`AI_REQUESTS_PER_MINUTE`, in-memory), cap payload sizes and hide upstream errors.
- `frontend/js/ai/assistant.js`: a panel on the configurator and interior pages. "Start talking"
  opens the WebRTC session through our server; on `session.delegation.created` it sends the
  transcript to `/api/agent/proposals` and returns the reply with `session.commentary.append`.
  A text box does the same without a microphone. Proposal card with Accept / Reject, a stale
  revision check, and Undo after applying.

## Verified
- Regression: backend 66 passed (18 new, with a fake model and a mocked OpenAI transport);
  frontend geometry tests 5 passed.
- E2E in Chrome with a canned stand-in model: clarifying answer, proposal card, Reject leaves the
  design untouched, Accept applies and re-renders, Undo restores the previous revision, a stale
  proposal is refused.
- NOT verified: anything against the real OpenAI API. No key was available, so the live session
  request, the data-channel event names and the Responses call are implemented from the docs and
  have never run. The microphone path was not exercised either.

## Decisions
- One brain for voice and text: both go through `/api/agent/proposals`.
- The model's output is requested as a plain JSON object and validated by our own schemas rather
  than a provider-side strict schema, so a provider change does not touch the validation path.
- Voice asks for explicit on-screen approval; saying "yes" does not apply a change.
- Model ids come from the docs read on this date: `gpt-live-1.1` and `gpt-5.6-terra`
  (both configurable). The docs also show `gpt-live-1` in some examples.

## Open
- The docs pages read did not cover: session cancellation / interruption events for client
  delegation, voices, turn detection, language settings, Hebrew support, pricing figures.
- Voice is not in the PRD and no paid AI provider is approved there yet.
- Customer speech and typed text are sent to OpenAI; the PRD asks for a privacy notice and for
  minimising personal data sent to AI providers.
- The rate limit is per process and keyed on the peer address; behind a proxy all clients share
  one address until forwarded headers are trusted.
- Phase 4 (deterministic validation) still does not exist; today the dry run enforces only schema,
  catalog membership, bay ranges and clamping.
