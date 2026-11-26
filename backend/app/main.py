import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.ai.agent import AgentModel
from app.ai.openai_provider import OpenAIAgentModel
from app.api import assistant, designs, health
from app.core.config import Settings, get_settings
from app.core.rate_limit import RateLimiter
from app.schemas.response import ApiResponse


def create_app(settings: Settings | None = None, agent_model: AgentModel | None = None,
               http_client: httpx.Client | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="AI Wardrobe Configurator API")
    app.state.settings = settings
    app.state.http = http_client or httpx.Client()
    app.state.ai_limiter = RateLimiter(settings.ai_requests_per_minute)
    # The assistant is enabled only when a key is configured (or a model is injected, as tests do).
    if agent_model is None and settings.openai_api_key:
        agent_model = OpenAIAgentModel(app.state.http, settings.openai_api_key, settings.agent_model)
    app.state.agent_model = agent_model if settings.openai_api_key else None

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        body = ApiResponse(success=False, error=str(exc.detail))
        return JSONResponse(status_code=exc.status_code, content=body.model_dump())

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0]
        field = ".".join(str(part) for part in first["loc"] if part != "body")
        body = ApiResponse(success=False, error=f"{field}: {first['msg']}".removeprefix(": "))
        return JSONResponse(status_code=422, content=body.model_dump())

    @app.exception_handler(Exception)
    async def unexpected_error(_: Request, __: Exception) -> JSONResponse:
        # Never expose raw exception text to clients (PRD section 11).
        body = ApiResponse(success=False, error="Internal server error")
        return JSONResponse(status_code=500, content=body.model_dump())

    app.include_router(health.router, prefix="/api")
    app.include_router(designs.router, prefix="/api")
    app.include_router(assistant.router, prefix="/api")
    return app


app = create_app()
