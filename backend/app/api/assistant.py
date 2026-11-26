from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.ai.agent import Proposal, propose
from app.ai.openai_provider import ProviderError, create_voice_session
from app.schemas.design import Design
from app.schemas.response import ApiResponse

router = APIRouter()

UNAVAILABLE = "The assistant is unavailable right now"


class ProposalRequest(BaseModel):
    design: Design
    conversation: str = Field(min_length=1, max_length=4000)


class VoiceSessionRequest(BaseModel):
    sdp: str = Field(min_length=1, max_length=20000)


class VoiceSession(BaseModel):
    sdp: str


def _guard(request: Request) -> None:
    """Public, paid endpoints: require configuration and throttle per client."""
    if request.app.state.agent_model is None:
        raise HTTPException(status_code=503, detail="The assistant is not configured")
    request.app.state.ai_limiter.check(request)


@router.post("/agent/proposals", response_model=ApiResponse[Proposal])
def create_proposal(body: ProposalRequest, request: Request) -> ApiResponse[Proposal]:
    """Non-mutating: returns a validated proposal. Applying it goes through /designs/operations."""
    _guard(request)
    try:
        proposal = propose(request.app.state.agent_model, body.design, body.conversation)
    except Exception as error:  # any provider failure must leave the editor usable (PRD FR-06)
        raise HTTPException(status_code=502, detail=UNAVAILABLE) from error
    return ApiResponse(success=True, data=proposal)


@router.post("/voice/session", response_model=ApiResponse[VoiceSession])
def start_voice_session(body: VoiceSessionRequest, request: Request) -> ApiResponse[VoiceSession]:
    """Exchanges the browser's WebRTC offer for an answer; the API key stays on the server."""
    _guard(request)
    settings = request.app.state.settings
    try:
        answer = create_voice_session(request.app.state.http, settings.openai_api_key, settings.live_model, body.sdp)
    except ProviderError as error:
        raise HTTPException(status_code=502, detail=UNAVAILABLE) from error
    return ApiResponse(success=True, data=VoiceSession(sdp=answer))
