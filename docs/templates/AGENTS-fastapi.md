# Production FastAPI Agent Rules (`AGENTS-fastapi.md`)

> **To use:** copy the full content of `AGENTS-backend.md` into your project's `AGENTS.md`, then append the content of this file below it. The combined file becomes your project's `AGENTS.md`.
> Python & FastAPI specific rules. Extends the universal backend baseline — all rules in `AGENTS-backend.md` remain in force. This file adds only Python/FastAPI-specific invariants.

<!-- AI-COPY-BLOCK
NON-NEGOTIABLE FASTAPI RULES (enforce every PR, in addition to AGENTS-backend.md):
1. Type Safety: Python 3.12+ strict typing; Pydantic v2 exclusively (`BaseModel`, `ConfigDict`); no raw `dict` or `Any`; strict mode validation; absolute isolation between Pydantic schemas and ORM (SQLAlchemy) models.
2. Async Hygiene: `async def` for I/O routes (DB, HTTP) with zero blocking code; `def` for CPU/blocking I/O (runs in Starlette threadpool); use `anyio.to_thread.run_sync` or `starlette.concurrency.run_in_threadpool` for sync libraries; ASGI lifecycle via `@asynccontextmanager`.
3. Architecture & DI: App Factory pattern (`create_app()`); layered structure (routers -> services -> repositories); `Annotated[Type, Depends()]` for all infrastructure injection (e.g., `AsyncSession`); explicit OpenAPI route tagging.
4. Configuration: 100% typed settings via `pydantic-settings` `BaseSettings`; zero hardcoded secrets; `.env` for local dev only.
5. Observability: `structlog` or `loguru` for JSON logging; auto-bind `trace_id` from `contextvars`; mask PII; global exception handlers for `HTTPException` and custom `AppError`.
6. Testing & Tooling: `pytest` + `pytest-asyncio`; `httpx.AsyncClient` for integration tests; `testcontainers-python` for DB tests; `ruff` for linting/formatting; `mypy` strict / `pyright`; 70%+ coverage gate.
7. Deployment: FastAPI `BackgroundTasks` for trivial deferred work; Celery/Arq for heavy workers; Uvicorn or Gunicorn with `uvicorn-worker` (`uvicorn_worker.UvicornWorker`); graceful connection draining in lifespan.
-->

<!-- START AGENT-STANDARD: FASTAPI -->

## 1. Python Type Safety & Pydantic v2
- [ ] **Strict Typing**: All code MUST use explicit Python 3.12+ (or 3.13+) type hints. Usage of `Any`, untyped `dict`, or omitted return types is forbidden. 
- [ ] **Pydantic v2 Exclusivity**: Validate all input/output data using Pydantic v2 `BaseModel`, `ConfigDict`, and `TypeAdapter`. Leverage `@field_validator` for custom validation logic. (Ref: [Pydantic v2 Docs](https://docs.pydantic.dev/latest/))
- [ ] **Strict Validation Mode**: Pydantic models MUST enforce `strict=True` where possible to prevent implicit type coercions (e.g., silently casting strings to ints).
- [ ] **Schema vs. ORM Isolation**: API request/response schemas (Pydantic) MUST be physically and logically separated from database models (e.g., SQLAlchemy). Never leak ORM models directly to the transport layer.

## 2. Async Execution & Concurrency Hygiene
- [ ] **Explicit Route Definitions**: Use `async def` exclusively for I/O-bound endpoints (database queries, external API calls). Use standard `def` ONLY for CPU-bound or blocking I/O endpoints, as FastAPI will automatically offload them to the Starlette threadpool. (Ref: [FastAPI Concurrency Docs](https://fastapi.tiangolo.com/async/#path-operation-functions))
- [ ] **Zero Blocking I/O**: Executing synchronous, blocking operations (like `time.sleep()`, `requests.get()`, or synchronous DB calls) inside an `async def` function is strictly banned.
- [ ] **Thread Offloading**: For synchronous third-party libraries used within async paths, explicitly wrap calls using `anyio.to_thread.run_sync()` or `starlette.concurrency.run_in_threadpool` to leverage AnyIO's threadpool capacity limiting and prevent unmanaged thread exhaustion.

## 3. Layered Architecture & Dependency Injection
- [ ] **App Factory Pattern**: Initialize the FastAPI application using a `create_app()` factory function to prevent global state and enable clean testing.
- [ ] **Dependency Injection**: Use FastAPI's `Annotated[Type, Depends()]` pattern for all infrastructure and contextual injections (e.g., `Annotated[AsyncSession, Depends(get_db)]`, current user, Redis clients). Never instantiate clients globally within routers.
- [ ] **Thin Routers**: Keep API endpoints (`api/v1/routes`) strictly limited to HTTP request parsing, calling the Service layer, and returning Pydantic responses.
- [ ] **OpenAPI Organization**: All routes MUST include explicit `tags`, `summary`, and `response_model` definitions for auto-generating accurate OpenAPI 3.1 specifications.

## 4. Configuration & Environment Management
- [ ] **Strict Configuration Models**: Application configuration MUST be strictly typed using `pydantic-settings` `BaseSettings`.
- [ ] **Zero Hardcoded Secrets**: Secrets MUST NOT be hardcoded. Load everything from environment variables.
- [ ] **Environment Segregation**: Use `.env` files exclusively for local development. Production environments MUST inject settings directly via the runtime environment.

## 5. Error Handling & Structured Logging
- [ ] **Global Exception Handlers**: Register custom Starlette exception handlers for globally catching standard `HTTPException`, custom domain `AppError` variants, and unhandled `Exception` payloads, formatting them into the unified 5-key error envelope defined in the backend baseline.
- [ ] **Contextual Structured Logging**: Use `structlog` or `loguru` to emit structured JSON logs. Use `contextvars` to automatically bind a `trace_id` to every log line within a request's lifecycle.
- [ ] **PII Masking**: Logging configurations MUST employ processors/filters to automatically mask passwords, tokens, and PII from JSON outputs.

## 6. Testing, Linting & Tooling Baseline
- [ ] **Async Test Clients**: Use `pytest`, `pytest-asyncio`, and `httpx.AsyncClient` (or Starlette's `TestClient` for sync routes) to write comprehensive integration tests.
- [ ] **Containerized DB Tests**: Use `testcontainers-python` to spin up ephemeral Postgres/Redis instances for repository and integration tests instead of mocking the database layer.
- [ ] **Ultra-Fast Linting**: Use `ruff` for all code formatting and linting. Enforce strict type checking in CI using `mypy --strict` or `pyright`.
- [ ] **Coverage Gate**: CI pipelines MUST enforce a minimum test coverage threshold (e.g., `coverage.py` / `pytest-cov` >= 70%).

## 7. Background Tasks & Production Deployment
- [ ] **Lightweight Tasks**: Use FastAPI's native `BackgroundTasks` exclusively for trivial, fire-and-forget deferred work (e.g., sending an email).
- [ ] **Heavy Workers**: For heavy, retryable, or scheduled jobs, offload to dedicated task queues (e.g., Celery, Arq, or Taskiq) with their own worker processes.
- [ ] **ASGI Lifespan Handlers**: Manage application startup and graceful shutdown (e.g., database connection pooling, draining) using FastAPI's `@asynccontextmanager` `lifespan` event.
- [ ] **Production Runners**: Deploy using an ASGI server like `uvicorn` standalone or `gunicorn` with the `uvicorn-worker` package (`uvicorn_worker.UvicornWorker`), appropriately tuned for the CPU core count.

<!-- END AGENT-STANDARD: FASTAPI -->
