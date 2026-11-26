from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Envelope used by every endpoint so the frontend handles one response shape."""

    success: bool
    data: T | None = None
    error: str | None = None
