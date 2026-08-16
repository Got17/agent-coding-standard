# Python & FastAPI Backend Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-PYTHON-FASTAPI -->
## Python & FastAPI Backend Rules
- Target Python 3.11+ using modern static type annotations throughout (`str | None` over `Optional[str]`, explicit return type hints). Enforce strict type checking with `mypy --strict` or `ruff`.
- Manage dependencies and virtual environments using `uv` or `Poetry` with deterministic lockfiles (`uv.lock` / `poetry.lock`). Unpinned `pip install` without lockfiles is strictly prohibited.
- Enforce strict event loop hygiene in FastAPI route handlers:
  - Use `async def` ONLY when performing non-blocking async I/O (e.g. `asyncpg`, `httpx`, async Redis).
  - Use standard `def` for synchronous, CPU-bound, or blocking I/O calls so FastAPI automatically offloads execution to an external thread pool worker thread. Never call blocking functions (e.g., `time.sleep()`, synchronous `requests`, sync DB drivers) inside `async def` routes.
- Validate all incoming request payloads and outgoing response structures using Pydantic v2 schemas. Ingress schemas MUST enforce strict boundary parsing using `model_config = ConfigDict(extra='forbid')`.
- Manage application configuration using `pydantic-settings` (`BaseSettings`). Wrap sensitive credentials in `SecretStr` to prevent accidental plain-text printing in logs.
- Enforce layered architecture: Routers (`app/api/`), Business Logic (`app/services/`), Data Access (`app/db/`), and Schemas (`app/schemas/`). Inject database sessions and dependencies via FastAPI `Depends()`.
<!-- END AGENT-STANDARD: BACKEND-PYTHON-FASTAPI -->
```

---

## Detailed Human Guide & Rationale

### 1. Modern Python Type Safety & Dependency Management

Production Python applications must eliminate implicit dynamic typing errors by combining Python 3.11+ type annotations with strict static analysis tools (`mypy`, `ruff`).

#### Type Hinting Invariants
* Use modern union syntax (`str | None` instead of `typing.Optional[str]`).
* Use built-in generic collections (`list[str]`, `dict[str, Any]` instead of `typing.List`, `typing.Dict`).
* Require explicit return types on all function signatures (`def get_user(user_id: UUID) -> UserResponse:`).

#### Dependency Management (`uv` / `Poetry`)
Dependencies must be managed using `uv` or `Poetry`. Build artifacts and deployments must install strictly from lockfiles to guarantee reproducible builds across local, CI, and container environments.

```bash
# ✅ Recommended dependency sync using uv
uv sync --frozen --no-dev
```

---

### 2. FastAPI Async Event Loop Hygiene

FastAPI is built on Starlette and `asyncio`. Misunderstanding `async def` versus `def` route handlers is the #1 cause of performance degradation in FastAPI backends.

#### Event Loop Rules
1. **`async def` Handlers**: Use `async def` ONLY when all I/O operations inside the function use non-blocking `await` primitives (e.g. `await db.execute()`, `await client.get()`). If an `async def` function invokes a synchronous blocking call (e.g. `time.sleep(5)` or synchronous `requests.get()`), it **freezes the entire asyncio event loop**, blocking all concurrent user requests.
2. **Standard `def` Handlers**: If your route handler needs to perform synchronous CPU tasks, heavy image processing, or use synchronous database drivers, declare the route with standard `def`. FastAPI automatically runs `def` handlers in a separate threadpool worker thread (`anyio` threadpool), preventing main event loop blockage.

```python
# ❌ WRONG: Calling blocking sync requests inside async def freezes event loop
@app.get("/rates")
async def get_rates():
    resp = requests.get("https://api.external.com/rates") # 🚨 Freezes entire asyncio loop!
    return resp.json()

# ✅ CORRECT: Use async HTTP client (httpx) with await inside async def
@app.get("/rates")
async def get_rates():
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://api.external.com/rates")
        return resp.json()

# ✅ CORRECT: Use standard def for synchronous/blocking functions
@app.get("/heavy-calc")
def heavy_calc():
    result = perform_sync_cpu_task() # Run in threadpool automatically by FastAPI
    return {"result": result}
```

---

### 3. Pydantic v2 & Configuration Management

FastAPI integrates natively with Pydantic for data validation, serialization, and OpenAPI spec generation.

#### Zero-Trust Ingress Validation
Request payloads must reject unexpected extra fields at application boundaries using Pydantic v2 `ConfigDict`.

```python
from pydantic import BaseModel, ConfigDict, Field

class CreateUserPayload(BaseModel):
    model_config = ConfigDict(extra="forbid") # Reject unexpected fields with 422 Unprocessable Entity
    
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    age: int = Field(gt=0, lt=150)
```

#### Settings Management (`pydantic-settings`)
Application settings and secrets must be loaded via `pydantic-settings`. Sensitive credentials must use `SecretStr` so that string conversion or print logging masks the secret value (`**********`).

```python
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    
    environment: str = "development"
    database_url: SecretStr
    api_key: SecretStr

settings = Settings()

# Extract raw secret safely when establishing connection
raw_db_url = settings.database_url.get_secret_value()
```

---

### 4. Dependency Injection & Service Layering

Keep route handlers thin by delegating business logic to service modules and injecting database sessions via FastAPI's `Depends()` framework.

```python
# app/api/v1/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db_session),
) -> UserResponse:
    user_service = UserService(db)
    return await user_service.create_user(payload)
```
