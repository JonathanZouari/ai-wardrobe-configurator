import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.ai.agent import propose
from app.core.config import Settings
from app.domain.design_factory import build_design
from app.main import create_app
from app.schemas.design import Dimensions

DESIGN = build_design("hinged", Dimensions(width=2400, height=2400, depth=600), template="empty")
KEYED = Settings(environment="test", openai_api_key="test-key")


class FakeModel:
    """Stands in for the language model: returns a canned answer and records what it was asked."""

    def __init__(self, answer):
        self.answer = answer
        self.calls = []

    def complete(self, instructions: str, message: str) -> str:
        self.calls.append((instructions, message))
        return self.answer if isinstance(self.answer, str) else json.dumps(self.answer)


def test_valid_operations_become_a_validated_proposal_without_touching_the_design():
    model = FakeModel({"reply": "I can add a shelf in bay two.", "operations": [
        {"op": "add_component", "type": "shelf", "bay": 1, "y_mm": 900}]})

    proposal = propose(model, DESIGN, "Customer: add a shelf in the second bay")

    assert proposal.reply == "I can add a shelf in bay two."
    assert proposal.base_revision == DESIGN.revision
    assert proposal.changes == ["Add shelf in bay 2, 900 mm from the base"]
    assert [op.op for op in proposal.operations] == ["add_component"]
    assert proposal.preview.revision == DESIGN.revision + 1
    assert DESIGN.revision == 1 and not [c for c in DESIGN.components if c.type == "shelf"]


def test_the_model_sees_the_current_design_and_the_request():
    model = FakeModel({"reply": "ok", "operations": []})

    propose(model, DESIGN, "Customer: what do I have?")

    instructions, message = model.calls[0]
    assert "add_component" in instructions and "Never invent" in instructions
    assert '"bays": 3' in message and "what do I have?" in message


def test_a_clarifying_answer_has_no_operations_and_no_preview():
    proposal = propose(FakeModel({"reply": "Which bay do you mean?", "operations": []}), DESIGN, "Customer: add a drawer")

    assert (proposal.reply, proposal.operations, proposal.preview) == ("Which bay do you mean?", [], None)


@pytest.mark.parametrize(
    "answer",
    [
        "this is not json",
        {"reply": "sure", "operations": [{"op": "delete_everything"}]},  # not a supported operation
        {"reply": "sure", "operations": [{"op": "add_component", "type": "jacuzzi", "bay": 0, "y_mm": 0}]},
        {"reply": "sure", "operations": "add a shelf"},
        {"operations": []},
    ],
)
def test_malformed_model_output_never_yields_operations(answer):
    proposal = propose(FakeModel(answer), DESIGN, "Customer: do something")

    assert proposal.operations == [] and proposal.preview is None
    assert proposal.reply == "I could not turn that into a change to the design. Please try saying it another way."


def test_operations_the_rules_reject_are_explained_and_dropped():
    model = FakeModel({"reply": "Adding it to bay nine.", "operations": [
        {"op": "add_component", "type": "shelf", "bay": 8, "y_mm": 100}]})

    proposal = propose(model, DESIGN, "Customer: add a shelf in bay nine")

    assert proposal.operations == [] and proposal.preview is None
    assert proposal.reply == "I cannot do that: Bay 9 does not exist; this wardrobe has 3 bays"


def test_reply_is_capped_so_it_fits_the_voice_channel():
    proposal = propose(FakeModel({"reply": "word " * 2000, "operations": []}), DESIGN, "Customer: talk")

    assert len(proposal.reply) <= 600


# ---------- endpoints ----------
def app_client(settings=KEYED, model=None, transport=None):
    http = httpx.Client(transport=transport) if transport else None
    return TestClient(create_app(settings, agent_model=model, http_client=http))


def body(conversation="Customer: add a shelf"):
    return {"design": DESIGN.model_dump(), "conversation": conversation}


def test_propose_endpoint_returns_the_proposal():
    model = FakeModel({"reply": "Adding a rail.", "operations": [{"op": "add_component", "type": "rail", "bay": 0, "y_mm": 1500}]})

    response = app_client(model=model).post("/api/agent/proposals", json=body())

    data = response.json()["data"]
    assert response.status_code == 200
    assert data["changes"] == ["Add hanging rail in bay 1, 1500 mm from the base"]
    assert data["preview"]["revision"] == 2


def test_ai_endpoints_are_unavailable_without_a_key():
    client = app_client(settings=Settings(environment="test", openai_api_key=None))

    assert client.post("/api/agent/proposals", json=body()).status_code == 503
    assert client.post("/api/voice/session", json={"sdp": "v=0"}).status_code == 503


def test_provider_failure_is_reported_without_details():
    class Broken:
        def complete(self, instructions, message):
            raise RuntimeError("secret upstream detail")

    response = app_client(model=Broken()).post("/api/agent/proposals", json=body())

    assert response.status_code == 502
    assert response.json() == {"success": False, "data": None, "error": "The assistant is unavailable right now"}


def test_oversized_conversation_is_rejected():
    assert app_client(model=FakeModel({})).post("/api/agent/proposals", json=body("x" * 5000)).status_code == 422


def test_voice_session_forwards_the_offer_and_keeps_the_key_on_the_server():
    seen = {}

    def upstream(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers["authorization"]
        seen["body"] = json.loads(request.content)
        return httpx.Response(201, json={"session": {"id": "live_123"}, "transport": {"type": "webrtc", "sdp": "v=0 answer"}})

    response = app_client(transport=httpx.MockTransport(upstream)).post("/api/voice/session", json={"sdp": "v=0 offer"})

    assert response.status_code == 200
    assert response.json()["data"] == {"sdp": "v=0 answer"}
    assert "test-key" not in response.text
    assert seen["url"] == "https://api.openai.com/v1/live/sessions"
    assert seen["auth"] == "Bearer test-key"
    assert seen["body"]["transport"] == {"type": "webrtc", "sdp": "v=0 offer"}
    assert seen["body"]["session"]["delegation"] == {"type": "client"}
    assert seen["body"]["session"]["model"] == KEYED.live_model


def test_voice_session_hides_upstream_errors():
    transport = httpx.MockTransport(lambda request: httpx.Response(401, json={"error": {"message": "bad key sk-secret"}}))

    response = app_client(transport=transport).post("/api/voice/session", json={"sdp": "v=0 offer"})

    assert response.status_code == 502
    assert "sk-secret" not in response.text


def test_voice_session_rejects_an_oversized_offer():
    assert app_client().post("/api/voice/session", json={"sdp": "x" * 30000}).status_code == 422


def test_ai_endpoints_are_rate_limited_per_client():
    settings = Settings(environment="test", openai_api_key="test-key", ai_requests_per_minute=2)
    client = app_client(settings=settings, model=FakeModel({"reply": "ok", "operations": []}))

    statuses = [client.post("/api/agent/proposals", json=body()).status_code for _ in range(3)]

    assert statuses == [200, 200, 429]
