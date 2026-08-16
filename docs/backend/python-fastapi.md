# Python & FastAPI Backend Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-PYTHON-FASTAPI -->
## Python & FastAPI Backend Rules
- Target Python 3.11+ using modern static type annotations throughout (`str | None` over `Optional[str]`, explicit return type hints). Enforce strict type checking with `mypy --strict` or `ruff`.
- Manage dependencies and virtual environments using `uv` or `Poetry` with deterministic lockfiles (`uv.lock` / `poetry.lock`). Unpinned `pip install` without lockfiles is strictly prohibited (`uv sync --frozen --no-dev`).
- Enforce strict event loop hygiene in FastAPI route handlers:
  - Use `async def` ONLY when performing non-blocking async I/O (e.g. `asyncpg`, `httpx.AsyncClient`, async Redis). Never instantiate temporary HTTP client connection pools inside handlers; use shared clients.
  - Use standard `def` for synchronous, CPU-bound, or blocking I/O calls so FastAPI automatically offloads execution to an external worker threadpool (`anyio`). Never call blocking functions (`time.sleep()`, synchronous `requests`, sync DB drivers) inside `async def` routes.
- Validate all incoming request payloads and outgoing response structures using Pydantic v2 schemas. Ingress schemas MUST enforce strict boundary parsing using `model_config = ConfigDict(extra='forbid')` to prevent OWASP API3:2023 mass assignment vulnerabilities.
- Manage application configuration using `pydantic-settings` (`BaseSettings`). Wrap sensitive credentials in `SecretStr` to prevent accidental plain-text printing in logs.
- Enforce layered architecture: Routers (`app/api/`), Business Logic (`app/services/`), Data Access (`app/db/`), Schemas (`app/schemas/`), and Core (`app/core/`). Inject database sessions and services via FastAPI `Depends()`.
- Use `@asynccontextmanager` `lifespan(app: FastAPI)` context manager for application startup and shutdown lifecycle (initializing and cleanly disposing database connection pools and HTTP clients).
- Use Starlette middleware with `contextvars` to manage request correlation context (`request_id`, W3C `traceparent` / `trace_id`).
- Register custom exception handlers (`HTTPException`, `RequestValidationError`) to map all errors to the standard flat 5-key API error envelope (`code`, `message`, `details`, `timestamp`, `request_id`) (see `docs/backend/api-design.md#4-standard-5-key-error-envelope--diagnostics`).
- Test application endpoints asynchronously using `pytest`, `pytest-asyncio`, and `httpx.AsyncClient`, overriding database dependencies via `app.dependency_overrides`.
<!-- END AGENT-STANDARD: BACKEND-PYTHON-FASTAPI -->
```

---

## Detailed Human Guide & Rationale

### 1. Recommended Project Layout

Production FastAPI backends must maintain clean separation of concerns using a layered package layout:

```text
project-root/
  pyproject.toml
  uv.lock / poetry.lock
  app/
    main.py              # Application entry point & FastAPI factory
    core/
      config.py          # pydantic-settings configuration & SecretStr
      middleware.py      # Starlette request_id & traceparent middleware
      exceptions.py      # Custom exceptions & 5-key error handlers
      logging.py         # Structured JSON logging setup
    api/
      v1/
        router.py        # API v1 router aggregation
        users.py         # User route handlers
    services/
      user_service.py    # Business logic & domain workflows
    db/
      session.py         # AsyncEngine & async_sessionmaker setup
      models/            # SQLAlchemy / SQLModel database entities
    schemas/
      user.py            # Pydantic v2 validation DTOs (extra='forbid')
  tests/
    conftest.py          # Pytest fixtures & async DB overrides
    test_users.py        # Async HTTP client integration tests
```

---

### 2. Modern Python Type Safety & Dependency Management

Production Python applications must eliminate dynamic typing bugs by combining Python 3.11+ static type annotations with strict linter checking (`mypy --strict`, `ruff`).

#### Type Hinting Invariants
- Use modern union syntax (`str | None` instead of `typing.Optional[str]`).
- Use built-in generic collections (`list[str]`, `dict[str, Any]` instead of `typing.List`, `typing.Dict`).
- Require explicit return types on all function signatures (`def get_user(user_id: UUID) -> UserResponse:`).

#### Dependency Management (`uv` / `Poetry`)
Dependencies must be managed using `uv` or `Poetry`. Builds and container deployments MUST install strictly from lockfiles to guarantee reproducible environments across local, CI, and production.

```bash
# ✅ Recommended deterministic dependency sync using uv
uv sync --frozen --no-dev
```

---

### 3. FastAPI Async Event Loop Hygiene & Lifespan Management

FastAPI is built on Starlette and `asyncio`. Misunderstanding `async def` versus `def` route handlers is the #1 cause of performance degradation in Python backends.

#### Event Loop Rules
1. **`async def` Handlers**: Use `async def` ONLY when all I/O operations inside the function use non-blocking `await` primitives (e.g. `await db.execute()`, `await client.get()`). Calling a synchronous blocking function (e.g. `time.sleep()` or synchronous `requests.get()`) inside `async def` **freezes the entire asyncio event loop**, blocking all concurrent requests across the process.
2. **Standard `def` Handlers**: If a route handler performs synchronous CPU tasks or uses synchronous database drivers, declare the route with standard `def`. FastAPI automatically offloads execution to an external worker threadpool (`anyio` threadpool), preventing main event loop blockage.
3. **Shared HTTP Clients**: NEVER instantiate `httpx.AsyncClient()` inside route handlers via `async with`. Opening and closing HTTP client connection pools per request causes high latency and socket exhaustion. Store shared client instances on `app.state` during application startup.

#### Lifespan Context Manager (`@asynccontextmanager`)
Use the modern FastAPI `lifespan` handler to manage resource initialization and graceful teardown:

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
import httpx
from app.db.session import engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize shared HTTP client and DB pool
    app.state.http_client = httpx.AsyncClient(timeout=10.0)
    yield
    # Shutdown: Cleanly close HTTP client and DB pool connections
    await app.state.http_client.aclose()
    await engine.dispose()

app = FastAPI(title="Production Service", lifespan=lifespan)
```

---

### 4. Pydantic v2 & Configuration Management

FastAPI integrates natively with Pydantic v2 for data validation, serialization, and OpenAPI spec generation.

#### Zero-Trust Ingress Validation (`extra = 'forbid'`)
Request payload schemas must reject unexpected extra fields at application boundaries using Pydantic v2 `ConfigDict` to mitigate OWASP API3:2023 mass-assignment vulnerabilities.

```python
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class CreateUserPayload(BaseModel):
    model_config = ConfigDict(extra="forbid") # Rejects undeclared fields with 400/422 Bad Request
    
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    age: int = Field(gt=0, lt=150)
```

#### Settings Management (`pydantic-settings`)
Application settings and secrets must be loaded via `pydantic-settings`. Sensitive credentials MUST use `SecretStr` so string conversion or print logging masks the secret (`**********`).

```python
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    
    environment: str = "development"
    database_url: SecretStr
    api_key: SecretStr

settings = Settings()

# Extract raw secret safely when establishing database connection
raw_db_url = settings.database_url.get_secret_value()
```

---

### 5. Request Context Propagation via `contextvars`

To propagate `request_id` and W3C `traceparent` correlation tokens across async call chains without parameter drilling, use Python's native `contextvars` in Starlette middleware.

```python
# app/core/middleware.py
import contextvars
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="unknown")
trace_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("trace_id", default="unknown")

class ContextPropagationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        traceparent = request.headers.get("traceparent", "")
        
        trace_id = str(uuid.uuid4()).replace("-", "")
        if traceparent.startswith("00-") and len(traceparent.split("-")) >= 4:
            trace_id = traceparent.split("-")[1]

        request_id_ctx.set(req_id)
        trace_id_ctx.set(trace_id)

        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response
```

---

### 6. Standard 5-Key API Error Envelope & Exception Handling

All application exceptions (`HTTPException`, `RequestValidationError`, custom exceptions) MUST be formatted into the standard flat **5-key API error envelope** (`code`, `message`, `details`, `timestamp`, `request_id`). See [`docs/backend/api-design.md#4-standard-5-key-error-envelope--diagnostics`](file:///D:/Coding/projects/agent-coding-standard/docs/backend/api-design.md#4-standard-5-key-error-envelope--diagnostics).

```python
# app/core/exceptions.py
from datetime import datetime, timezone
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.middleware import request_id_ctx

def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code_map = {
            400: "VALIDATION_FAILED",
            401: "UNAUTHENTICATED",
            403: "PERMISSION_DENIED",
            404: "RESOURCE_NOT_FOUND",
            409: "RESOURCE_CONFLICT",
        }
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": code_map.get(exc.status_code, "HTTP_ERROR"),
                "message": str(exc.detail),
                "details": [],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "request_id": request_id_ctx.get(),
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {"field": ".".join(str(loc) for loc in err["loc"]), "issue": err["msg"]}
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "code": "VALIDATION_FAILED",
                "message": "Request validation failed.",
                "details": details,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "request_id": request_id_ctx.get(),
            },
        )
```

---

### 7. Dependency Injection & Service Layering

Keep route handlers thin by delegating business logic to service modules and injecting database sessions via FastAPI `Depends()`.

```python
# app/api/v1/users.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.user import UserCreatePayload, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreatePayload,
    db: AsyncSession = Depends(get_db_session),
) -> UserResponse:
    user_service = UserService(db)
    return await user_service.create_user(payload)
```

---

### 8. Testing Strategy with Pytest & `AsyncClient`

Test FastAPI applications asynchronously using `pytest`, `pytest-asyncio`, and `httpx.AsyncClient`, overriding database session dependencies via `app.dependency_overrides`.

```python
# tests/conftest.py
import pytest
from collections.abc import AsyncGenerator
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.db.session import get_db_session

@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

# tests/test_users.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_user_invalid_payload(async_client: AsyncClient):
    response = await async_client.post("/api/v1/users", json={"username": "a"}) # Invalid short username
    assert response.status_code == 400
    data = response.json()
    assert data["code"] == "VALIDATION_FAILED"
    assert "request_id" in data
```

---

## Evidence / References

- [FastAPI Official Documentation](https://fastapi.tiangolo.com/): Official guide for routing, dependency injection (`Depends`), and Pydantic integration.
- [FastAPI Concurrency and Async/Await](https://fastapi.tiangolo.com/async/): Official technical explanation of `async def` non-blocking I/O vs standard `def` threadpool worker offloading.
- [FastAPI Lifespan Events](https://fastapi.tiangolo.com/advanced/events/): Official documentation for `@asynccontextmanager` lifespan application startup and shutdown lifecycle management.
- [FastAPI Handling Errors](https://fastapi.tiangolo.com/tutorial/handling-errors/): Official guide for overriding `HTTPException` and `RequestValidationError` handlers.
- [Python `contextvars` Module](https://docs.python.org/3/library/contextvars.html): Standard library context variables documentation for request-scoped correlation tokens across async tasks.
- [Pydantic v2 Documentation](https://docs.pydantic.dev/latest/): Official spec for `BaseModel`, `ConfigDict(extra='forbid')`, and `pydantic-settings` `SecretStr`.
- [Starlette Middleware Guide](https://www.starlette.io/middleware/): Official documentation for Starlette HTTP middleware and request lifecycle handling.
- [HTTPX Async Documentation](https://www.httpx.org/async/): Official guide for asynchronous HTTP client connection pool management and `ASGITransport` testing.
- [OWASP API Security Top 10 2023 — API3:2023](https://owasp.org/www-project-api-security/): OWASP API3:2023 Broken Object Property Level Authorization & mass assignment defense guidelines.
- [W3C Trace Context Recommendation](https://www.w3.org/TR/trace-context/): Standard for `traceparent` headers and distributed request ID tracking.
- [Pytest-Asyncio Documentation](https://pytest-asyncio.readthedocs.io/): Official guide for writing asynchronous tests in Python.
