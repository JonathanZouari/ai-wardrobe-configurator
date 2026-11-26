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

## Follow-up the same day: first real run, Hebrew, bay numbering
- The owner added `OPENAI_API_KEY` to `backend/.env`. First real call failed with 400: the
  Responses API requires the word "json" in the input when `text.format` is `json_object`.
  Fixed by prefixing the input; the provider module now logs the upstream status only.
- The owner confirmed voice works in English in the browser, then asked for Hebrew conversation.
  Both prompts now say to answer in the customer's language (Hebrew or English); the agent's own
  fallback replies exist in both languages; the panel's transcript and input use `dir="auto"`.
  The interface itself stays English and left-to-right.
- Bug found while testing with the real model: "bay one" produced an operation on bay index 1
  (the second bay) while the spoken reply said "bay 1". The model now works with bay numbers
  from 1, as customers say them, and the agent converts to the design's 0-based index.
- Verified against the real text model (`gpt-5.6-terra`): ten typed requests in Hebrew and
  English gave correct proposals, clarifying questions, a price refusal and a refusal to break
  the size limit. Backend tests: 69 passed.
- Not verified by me: Hebrew through the voice session (needs a microphone), including how well
  GPT-Live transcribes Hebrew. The docs read do not mention language support.
- Known limit: when the rule engine rejects a Hebrew request, the reason after "לא ניתן לבצע את זה:"
  is still English, and the change list on the proposal card is English like the rest of the UI.
- `backend/.env.example` shows as deleted in the working tree (the owner appears to have renamed
  it to `.env`); left as is, not committed. Restore with `git checkout -- backend/.env.example`.
