import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

WINDOW_SECONDS = 60


class RateLimiter:
    """Sliding one-minute window per client address.

    shortcut: counts live in this process's memory, so the limit is per instance and resets on
    restart; move to a shared store when the API runs on more than one instance.
    """

    def __init__(self, limit: int):
        self._limit = limit
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, request: Request) -> None:
        key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > WINDOW_SECONDS:
            hits.popleft()
        if len(hits) >= self._limit:
            raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute and try again.")
        hits.append(now)
