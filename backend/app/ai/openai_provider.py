"""OpenAI calls, kept behind two small functions so the provider can be swapped (PRD 7.1).

The API key never leaves this module's requests; callers get plain text or an SDP answer.
"""

import httpx

OPENAI_BASE_URL = "https://api.openai.com/v1"
TIMEOUT_SECONDS = 30

VOICE_INSTRUCTIONS = """You are the voice of the design assistant in a wardrobe configurator.
Speak briefly and plainly, in English.
You cannot see or change the design yourself. Whenever the customer asks about their wardrobe or
wants to change it (size, door type, bays, shelves, hanging rails, drawers, materials, lighting),
delegate the request and wait for the result, then say the result in your own words.
A result is always a proposal: tell the customer it is shown on screen and that they need to
press Accept to apply it. Never say a change has been made.
Do not give prices, delivery times or manufacturing approval; staff review every design."""


class ProviderError(Exception):
    """The provider could not be reached or answered with an error. Carries no upstream detail."""


def _post(http: httpx.Client, api_key: str, path: str, payload: dict) -> dict:
    try:
        response = http.post(f"{OPENAI_BASE_URL}{path}", json=payload, timeout=TIMEOUT_SECONDS,
                             headers={"Authorization": f"Bearer {api_key}"})
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise ProviderError(type(error).__name__) from error


class OpenAIAgentModel:
    """Text model for the design agent, through the Responses API."""

    def __init__(self, http: httpx.Client, api_key: str, model: str):
        self._http, self._api_key, self._model = http, api_key, model

    def complete(self, instructions: str, message: str) -> str:
        data = _post(self._http, self._api_key, "/responses", {
            "model": self._model,
            "instructions": instructions,
            "input": message,
            "text": {"format": {"type": "json_object"}},
        })
        texts = [part.get("text", "") for item in data.get("output", []) if item.get("type") == "message"
                 for part in item.get("content", []) if part.get("type") == "output_text"]
        return "".join(texts)


def create_voice_session(http: httpx.Client, api_key: str, model: str, sdp_offer: str) -> str:
    """Start a GPT-Live session in client-delegation mode and return the SDP answer."""
    data = _post(http, api_key, "/live/sessions", {
        "session": {"model": model, "instructions": VOICE_INSTRUCTIONS, "delegation": {"type": "client"}},
        "transport": {"type": "webrtc", "sdp": sdp_offer},
    })
    try:
        return data["transport"]["sdp"]
    except (KeyError, TypeError) as error:
        raise ProviderError("unexpected response") from error
