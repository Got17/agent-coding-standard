# Testing & Quality Gates Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-TESTING -->
## Backend Testing & Quality Gate Rules
- Enforce the Testing Pyramid ratio: high proportion (~70%) of fast, isolated unit tests for domain business logic; targeted (~20%) integration tests using Testcontainers or ephemeral databases for repositories and handlers; lightweight (~10%) E2E smoke tests for critical paths. Ratios represent target distributions, not rigid mechanical quotas.
- Enforce deterministic test execution with zero shared mutable state across test runs. Use test data factories (FactoryBoy, Fishery, Gofakeit) over static SQL seed dumps. Execute database integration tests within isolated schemas, dedicated temporary databases, or truncated transactions.
- Mandatory Negative Authorization Coverage: Every protected API resource and endpoint MUST include at least one negative authorization test asserting that a valid authenticated principal from a different user or tenant context receives `403 Forbidden` or `404 Not Found` — never resource data (BOLA/IDOR security verification). Negative authorization tests MUST run in CI pipelines.
- Automated Contract Validation in CI: Automatically validate API spec diffs (OpenAPI, Protobuf, GraphQL, AsyncAPI) in CI pipelines using automated tooling (`oasdiff`, `buf breaking`, `graphql-schema-linter`, `asyncapi diff`). Block pull requests introducing unauthorized breaking changes or un-versioned schema updates.
- Test Environment Parity & Mocking Boundaries: Mock ONLY at external system boundaries (third-party SaaS, payment gateways, external webhooks) using wire-level stubs (WireMock, MSW, httpmock). DO NOT mock internal database engines, ORM layers, caches, or message brokers in integration tests — use containerized dependencies (Testcontainers).
- Automated CI Quality Gates: Enforce minimum code coverage thresholds (minimum 80% line and branch coverage on domain business logic) and block CI merges on test failures, static analysis errors, or breaking contract diffs.
<!-- END AGENT-STANDARD: BACKEND-TESTING -->
```

---

## Detailed Human Guide & Rationale

### 1. Testing Pyramid & Test Architecture

High-reliability backend services require a balanced testing strategy that delivers rapid feedback, high confidence, and low maintenance overhead. The Testing Pyramid (Fowler) establishes the architectural balance across three primary testing tiers:

```text
       ▲
      / \        E2E Smoke Tests (~10%)
     /   \       - End-to-end critical path validation
    /-----\      - Real deployed environment or compose stack
   /       \     Integration Tests (~20%)
  /         \    - Repositories, API handlers, DB queries
 /-----------\   - Testcontainers (Real DB, Redis, RabbitMQ)
/             \  Unit Tests (~70%)
/               \ - Pure domain business logic, state machines
/-----------------\ - In-memory execution, zero I/O, sub-millisecond
```

#### Unit Tests (~70% Target)
- **Scope**: Domain business logic, state machine transitions, validation rules, pure calculation functions, and request/response mapping logic.
- **Execution Speed**: In-memory, sub-millisecond execution. Zero file system I/O, zero network I/O, and zero database connectivity.
- **Goal**: Rapid developer feedback loops during local development and instant CI execution.

#### Integration Tests (~20% Target)
- **Scope**: Data access layers (repositories, ORMs, raw SQL queries), HTTP router handlers, middleware stacks, message broker publishers/consumers, and cache abstractions.
- **Dependencies**: Real, un-mocked backing infrastructure provided via **Testcontainers** (e.g., real PostgreSQL, Redis, or Kafka instances running in ephemeral Docker containers).
- **Goal**: Verify query correctness, foreign key constraints, transaction boundaries, serialization/deserialization, and framework integration.

#### E2E Smoke Tests (~10% Target)
- **Scope**: Top-level critical business paths (e.g., authentication flow, checkout processing, payment settlement).
- **Execution**: Deployed ephemeral environment or multi-container Docker Compose setup executing HTTP requests against public API endpoints. E2E smoke tests MUST execute against isolated test tenant accounts (`tenant_e2e_<timestamp>`) or ephemeral sandboxes with automated post-test cleanup routines to prevent mutating shared data.
- **Goal**: Verify overall service composition, service-to-service connectivity, and production configuration wiring.

> 💡 **Target Ratios, Not Quotas**: The 70/20/10 ratio serves as an architectural guiding principle. Teams must prioritize testing logic where risk resides rather than chasing artificial mechanical quotas.

---

### 2. Deterministic Test State & Factories

Flaky tests and non-deterministic failures undermine CI pipeline trust and slow down delivery velocity. The primary cause of test non-determinism is shared mutable state between test runs.

#### Anti-Patterns to Prohibit
- **Static SQL Dumps & Shared Seed Scripts**: Loading a fixed `seed.sql` before running test suites creates fragile dependencies where test A relies on row ID `12` created by seed data, and test B mutates or deletes row `12`, breaking test A.
- **Global Shared Database Tables**: Multiple tests writing to the same database table simultaneously without isolation cause race conditions and non-deterministic failures in parallel test runners (`pytest-xdist`, `vitest --threads`, `go test -parallel`).
- **Hardcoded Auto-Incrementing IDs**: Asserting static IDs (`id === 1`) breaks when test ordering changes or sequence generators increment.

#### Deterministic Isolation Strategies
1. **Test Data Factories**: Use dynamic programmatic factory libraries (e.g., `FactoryBoy` for Python, `Fishery` for TypeScript, `Gofakeit` / custom struct builders for Go) to generate fresh, explicit test entities per test case.
2. **Database Isolation per Test**:
   - **Transaction Rollback Pattern**: Wrap each test execution in a database transaction (`BEGIN`) and execute `ROLLBACK` at test completion (suitable for single-threaded or single-connection integration tests).
   - **Schema-per-Worker Pattern**: For parallel execution against containerized databases, assign each worker thread/process an isolated PostgreSQL schema or dynamic database (`app_test_worker_1`, `app_test_worker_2`).
3. **Explicit Cleanup Fixtures**: Guarantee setup and teardown code runs via framework fixtures (`pytest` fixtures, `vitest` `beforeEach`/`afterEach`, Go `t.Cleanup()`).

---

### 3. Mandatory Negative Authorization Testing (BOLA/IDOR)

Broken Object Level Authorization (BOLA), also known as Insecure Direct Object Reference (IDOR), is the #1 vulnerability on the OWASP API Security Top 10 (API1:2023). BOLA occurs when an API endpoint accepts a target resource identifier (e.g., `/api/v1/orders/{order_id}`) but fails to verify that the authenticated principal possesses permission to access that specific resource.

#### Mandatory Security Invariant
> 🛡️ **Mandatory Rule**: Every protected API resource and mutation handler MUST include at least one automated negative authorization test in the CI suite. The test MUST assert that a valid, authenticated user belonging to Tenant B or User B receives `403 Forbidden` or `404 Not Found` when attempting to access or mutate a resource owned by Tenant A or User A.

```text
[Authenticated Principal: User B (Tenant B)] 
              │
              ▼
   GET /api/v1/orders/ord_tenant_A_123
              │
   ┌──────────┴──────────┐
   │ Authz Validation    │
   └──────────┬──────────┘
              │
   ┌──────────┴─────────────────────────┐
   │ DOES User B OWN ord_tenant_A_123?  │
   └──────────┬─────────────────────────┘
              ├───────────────────┐
             NO                  YES
              │                   │
              ▼                   ▼
    Assert 403 / 404         200 OK + Payload
  (MUST NOT RETURN DATA)
```

#### Authorization Test Requirements
- **Dual Authenticated Principals**: Fixtures must provision two distinct valid users/tenants (`user_a_tenant_1` and `user_b_tenant_2`).
- **Assertions**:
  - Assert HTTP status code is strictly `403 Forbidden` (or `404 Not Found` when masking resource existence to prevent resource enumeration).
  - Assert response payload conforms to the standard 5-key error JSON envelope (`code`, `message`, `details`, `timestamp`, `request_id`) with `code === "PERMISSION_DENIED"`.
  - Assert response body DOES NOT contain sensitive domain attributes.
  - Assert database state was NOT mutated for write/update/delete operations.

---

### 4. Contract Diff Validation & CI Quality Gates

In microservice architectures, un-coordinated breaking API changes between frontend, mobile, and backend services cause runtime failures in production. CI pipelines must validate API contract compatibility automatically before code merges.

#### Automated API Contract Validation
1. **OpenAPI Spec Diff**: Compute semantic diffs between the current `openapi.json`/`yaml` spec and the target branch (`main`) using `oasdiff` or `openapi-diff`. Fail CI builds if breaking changes (removed endpoints, renamed fields, mandatory new request parameters) are detected without a major version bump.
2. **Protobuf Breaking Change Detection**: For gRPC services, run `buf breaking --against '.git#branch=main'` in CI to detect backward-incompatible Protobuf modifications (tag re-numbering, field type changes, field removals).
3. **GraphQL Schema Linting**: Run `graphql-schema-linter` or `@graphql-inspector/ci` to flag breaking field removals or type changes in GraphQL schemas.
4. **AsyncAPI Spec Diff**: For event-driven services, run `asyncapi diff BASE NEW` in CI pipelines to detect backward-incompatible message payload, channel, or binding changes.

#### Static Analysis & Vulnerability Scanning Gates
CI pipelines MUST run static analysis linters (`golangci-lint`, `ruff`, `eslint`), static type checkers (`mypy --strict`, `tsc --noEmit`), and dependency vulnerability scanners (`govulncheck`, `pip-audit`, `npm audit`) on every pull request. PR merges MUST be blocked if static analysis reports errors or un-triaged vulnerabilities above medium severity.

```yaml
# Example CI Quality Gate Check (GitHub Actions Workflow snippet)
name: Contract & Quality Gates
on: [pull_request]

jobs:
  contract-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Fetch Base Branch for Contract Diff
        run: git fetch --depth=1 origin ${{ github.base_ref }}
      - name: Validate OpenAPI Breaking Changes
        uses: oasdiff/oasdiff-action/breaking@v0
        with:
          base: 'origin/${{ github.base_ref }}:api/openapi.yaml'
          revision: 'HEAD:api/openapi.yaml'
          fail-on: ERR
      - name: Static Security & Vulnerability Audit
        run: |
          npm audit --audit-level=high
```

#### Property-Based Testing & Fuzzing Gates
Services processing complex input schemas, codecs, state machines, or cryptographic calculations MUST include property-based tests (e.g. `fast-check` for TS, `Hypothesis` for Python) or native fuzzing (`go test -fuzz` for Go) in CI pipelines to discover unhandled edge-case inputs, panic conditions, and boundary violations automatically.

#### Code Coverage Gates
- **Line & Branch Coverage**: Enforce a minimum threshold of **80% line and branch coverage** on core business services (`services/`, `domain/`).
- **Exclusion Rules**: Auto-generated code (`*.pb.go`, OpenAPI clients, DB migration scripts, wire mocks) MUST be explicitly excluded from coverage calculations via configuration (`.coveragerc`, `vitest.config.ts`, `go test -coverpkg`).
- **Focus Coverage**: Require 100% coverage on security-critical authorization middlewares and tenant isolation logic.
- **CI Blocking**: Coverage checks MUST run as required PR checks and block merging if thresholds drop.

#### Flaky Test Management & Quarantine Gates
- **Retry Bounds**: Retries in CI pipelines MUST be capped at a maximum of 1 retry to detect intermittent container or timing issues without masking persistent failures.
- **Quarantine Policy**: Tests exhibiting non-deterministic behavior MUST be immediately quarantined into a dedicated quarantine suite (`@flaky` / `quarantine` tag) and assigned an issue ticket. Blanket `continue-on-error: true` overrides on test steps are strictly forbidden.

---

### 5. Test Environment Parity & Mocking Boundaries

Over-mocking is a major source of testing fragility. Mocking database queries or internal ORM models creates tests that pass in CI but fail in production due to invalid SQL syntax, type mismatches, or transaction deadlock issues.

#### Mocking Boundary Principles

| System Component | Integration Testing Boundary Strategy | Rationale / Tooling |
|---|---|---|
| **Database (PostgreSQL/MySQL)** | **NO MOCKING** (Use Real Container) | Execute queries against containerized DB via Testcontainers. Verifies real SQL syntax, indexes, foreign keys, and transactions. |
| **Cache (Redis/Memcached)** | **NO MOCKING** (Use Real Container) | Run real Redis container via Testcontainers to test TTLs, key eviction, and cache invalidation. |
| **Message Broker (RabbitMQ/Kafka)** | **NO MOCKING** (Use Real Container) | Verify actual message serialization, topic routing, and consumer acknowledgment behavior. |
| **Internal Domain Services** | **NO MOCKING** (Use Real Instances) | Test real domain objects and service dependencies. |
| **Third-Party External SaaS (Stripe, Twilio)** | **MOCK AT NETWORK LEVEL** | Use wire-level HTTP mocks (`MSW`, `WireMock`, `httptest.Server`). DO NOT mock language HTTP client classes directly. |

#### Wire-Level Downstream Stubbing
When mocking third-party external services, stub network traffic at the wire level (HTTP/gRPC layer) rather than patching internal language methods. This verifies that your application's serialization, HTTP header handling, timeout configuration, and retry policies operate correctly.

---

### 6. Polyglot Implementation Patterns

::: code-group
```go [Go / Testcontainers & Negative Auth]
// ✅ Go Integration Test using Testcontainers, Gofakeit, and Negative Auth Assertion
package integration_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/brianvoe/gofakeit/v6"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestOrderHandler_GetOrder_NegativeAuth(t *testing.T) {
	ctx := context.Background()

	// 1. Spin up ephemeral PostgreSQL Testcontainer
	pgContainer, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
	)
	require.NoError(t, err)
	t.Cleanup(func() { assert.NoError(t, pgContainer.Terminate(ctx)) })

	// 2. Setup database connection & migrate schema
	dbConnStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)
	db := setupTestDB(t, dbConnStr)

	// 3. Provision test data using factory pattern
	tenantAUser := createTestUser(t, db, "tenant_A")
	tenantBUser := createTestUser(t, db, "tenant_B")
	orderA := createTestOrder(t, db, tenantAUser.TenantID, gofakeit.Price(10, 500))

	// 4. Construct API router / handler
	app := setupTestRouter(db)

	// 5. MANDATORY NEGATIVE AUTH TEST: Tenant B requests Tenant A's Order
	req := httptest.NewRequest(http.MethodGet, "/api/v1/orders/"+orderA.ID, nil)
	req.Header.Set("Authorization", "Bearer "+tenantBUser.Token)
	rec := httptest.NewRecorder()

	app.ServeHTTP(rec, req)

	// 6. ASSERTION: Access MUST be forbidden (403 or 404) and match standard 5-key error envelope
	assert.Contains(t, []int{http.StatusForbidden, http.StatusNotFound}, rec.Code, "Tenant B must not access Tenant A resource")
	var errResp map[string]interface{}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &errResp))
	if rec.Code == http.StatusForbidden {
		assert.Equal(t, "PERMISSION_DENIED", errResp["code"])
	} else {
		assert.Equal(t, "NOT_FOUND", errResp["code"])
	}
	assert.NotEmpty(t, errResp["message"])
	assert.NotNil(t, errResp["details"])
	assert.NotEmpty(t, errResp["timestamp"])
	assert.NotEmpty(t, errResp["request_id"])
	assert.NotContains(t, rec.Body.String(), "amount_cents", "Response body must not leak domain payload attributes")
}
```

```typescript [TypeScript / Vitest & Fishery]
// ✅ TypeScript Integration Test using Vitest, Fishery, Testcontainers Node, and MSW
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Factory } from 'fishery';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import request from 'supertest';
import { createApp } from '../src/app';

interface Order {
  id: string;
  tenant_id: string;
  amount_cents: number;
}

// 1. Define Test Data Factory using Fishery
const orderFactory = Factory.define<Order>(({ sequence }) => ({
  id: `ord_${sequence}`,
  tenant_id: 'tenant_default',
  amount_cents: 4999,
}));

// 2. Wire-level HTTP Mocking for downstream payment gateway using MSW
const mswServer = setupServer(
  http.post('https://api.stripe.com/v1/charges', () => {
    return HttpResponse.json({ id: 'ch_test_123', status: 'succeeded' });
  })
);

describe('Orders API Authorization Security', () => {
  let container: StartedPostgreSqlContainer;
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    mswServer.listen({ onUnhandledRequest: 'error' });
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    app = await createApp({ connectionString: container.getConnectionUri() });
  });

  afterEach(async () => {
    mswServer.resetHandlers();
    await app.db.raw('TRUNCATE TABLE orders CASCADE;');
  });

  afterAll(async () => {
    mswServer.close();
    await container.stop();
  });

  it('enforces negative authorization (BOLA) when tenant B accesses tenant A resource', async () => {
    // Seed resource owned by Tenant A
    const orderA = orderFactory.build({ tenant_id: 'tenant_A' });
    await app.db('orders').insert(orderA);

    // Act: Authenticated user from Tenant B requests Tenant A's order
    const response = await request(app)
      .get(`/api/v1/orders/${orderA.id}`)
      .set('Authorization', 'Bearer token_user_tenant_B');

    // Assert: Must receive 403 Forbidden (PERMISSION_DENIED) or 404 Not Found (NOT_FOUND) with standard 5-key error envelope
    expect([403, 404]).toContain(response.status);
    expect(response.body.code).toBe(response.status === 403 ? 'PERMISSION_DENIED' : 'NOT_FOUND');
    expect(response.body.message).toBeDefined();
    expect(response.body.details).toBeDefined();
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.request_id).toBeDefined();
    expect(response.body.amountCents).toBeUndefined();
  });

  it('processes payment via downstream wire-level stub (MSW)', async () => {
    const response = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', 'Bearer token_user_tenant_A')
      .send({ amountCents: 4999 });

    expect(response.status).toBe(200);
    expect(response.body.chargeId).toBe('ch_test_123');
  });
});
```

```python [Python / Pytest & Testcontainers]
# ✅ Python Integration Test using Pytest, AsyncClient, Testcontainers, and AsyncSession
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from testcontainers.postgres import PostgresContainer
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import factory
from app.main import app
from app.db.session import get_db_session
from app.db.base import Base

class OrderPayloadFactory(factory.DictFactory):
    description = factory.Faker("sentence", nb_words=3)
    amount_cents = factory.Faker("random_int", min=1000, max=9999)

@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as postgres:
        yield postgres

@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def db_engine(postgres_container):
    url = postgres_container.get_connection_url()
    db_url = (
        url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
           .replace("postgresql+psycopg://", "postgresql+asyncpg://")
           .replace("postgresql://", "postgresql+asyncpg://")
    )
    engine = create_async_engine(db_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture(loop_scope="session")
async def async_client(db_engine) -> AsyncGenerator[AsyncClient, None]:
    async_session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
        async with async_session_factory() as session:
            yield session

    # Override FastAPI dependency with container session generator
    app.dependency_overrides[get_db_session] = override_get_db_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        yield client

@pytest_asyncio.fixture(autouse=True, loop_scope="session")
async def reset_dependency_overrides():
    """Ensure clean dependency overrides per test execution."""
    yield
    app.dependency_overrides.clear()

@pytest_asyncio.fixture(autouse=True, loop_scope="session")
async def cleanup_database(db_engine):
    """Guarantee zero shared state by truncating tables after each test run."""
    yield
    # Post-test cleanup: truncate domain tables on ephemeral container database
    async with db_engine.begin() as conn:
        await conn.execute(text("TRUNCATE TABLE orders CASCADE;"))

@pytest.mark.asyncio(loop_scope="session")
async def test_negative_authorization_bola_returns_403(async_client: AsyncClient):
    """
    Assert BOLA security control: User B (Tenant B) CANNOT fetch Order created by Tenant A.
    Verifies HTTP 403 Forbidden (PERMISSION_DENIED) or 404 Not Found (NOT_FOUND) and standard flat 5-key error payload.
    """
    # 1. Create order owned by Tenant A (tenant identity derived from bearer token context)
    headers_tenant_a = {"Authorization": "Bearer token_tenant_A"}
    create_res = await async_client.post(
        "/api/v1/orders",
        json=OrderPayloadFactory(),
        headers=headers_tenant_a
    )
    assert create_res.status_code == 201
    order_id = create_res.json()["id"]

    # 2. Attempt to read Tenant A order using Tenant B credentials
    headers_tenant_b = {"Authorization": "Bearer token_tenant_B"}
    authz_res = await async_client.get(
        f"/api/v1/orders/{order_id}",
        headers=headers_tenant_b
    )

    # 3. Assert Negative Authorization behavior & standard 5-key error envelope
    assert authz_res.status_code in (403, 404), "BOLA check failed: Unauthorized tenant accessed resource"
    payload = authz_res.json()
    expected_code = "PERMISSION_DENIED" if authz_res.status_code == 403 else "NOT_FOUND"
    assert payload["code"] == expected_code
    assert "message" in payload
    assert "details" in payload
    assert "timestamp" in payload
    assert "request_id" in payload
    assert "description" not in payload, "Response payload MUST NOT leak resource attributes"
```
:::

---

## Evidence / References

- [NIST SP 800-218 — Secure Software Development Framework (SSDF) v1.1](https://csrc.nist.gov/pubs/sp/800/218/final): Practice PW.8 ("Test Executable Code") detailing security dynamic testing, vulnerability triage, and automated verification requirements in CI/CD pipelines.
- [Martin Fowler — The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html): Authoritative architectural reference for unit, integration, and UI/E2E test distribution and feedback speed.
- [Martin Fowler — Eradicating Non-Deterministic Tests](https://martinfowler.com/articles/non-deterministic-tests.html): Primary principles for deterministic test state management and eliminating shared mutable state.
- [OWASP API Security Top 10 2023 — API1:2023 Broken Object Level Authorization (BOLA)](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/): Standard security requirement mandating negative object-level authorization validation on all API endpoints.
- [OWASP Application Security Verification Standard (ASVS) v4.0.3](https://owasp.org/www-project-application-security-verification-standard/): Chapter 4 (Access Control Architecture) & Chapter 14 (Automated Security Testing in CI).
- [Google SRE Book — Chapter 17: Testing for Reliability](https://sre.google/sre-book/testing-reliability/): Google operational testing standards covering test environment parity, hermetic environments, and release qualification gates.
- [Testcontainers Documentation — Containerized Integration Testing Framework](https://testcontainers.com/): Official spec and documentation for running lightweight, throwaway databases and dependencies in containers during integration testing.
- [Mock Service Worker (MSW) — API Mocking for Browser and Node](https://mswjs.io/): Wire-level API mocking library for Node.js and browser environments.
- [WireMock — Flexible HTTP Mocking Tool](https://wiremock.org/): Primary tool for stubbing external HTTP services at the network wire level.
- [oasdiff — OpenAPI Spec Diff & Breaking Changes Detector](https://github.com/oasdiff/oasdiff): Command-line tool and GitHub Action for comparing OpenAPI specifications and enforcing breaking change policies in CI pipelines.
- [OpenAPI Specification v3.1.0 & Contract Validation](https://spec.openapis.org/oas/v3.1.0): Official specification for API contract definitions and semantic versioning breaking change policies.
- [Buf Protocol Buffers Documentation — Breaking Change Detection](https://buf.build/docs/breaking/): Standard for detecting backward-incompatible API changes in Protobuf RPC declarations.
- [Test Data Factories — FactoryBoy (Python)](https://factoryboy.readthedocs.io/), [Fishery (TypeScript)](https://github.com/thoughtbot/fishery), [Gofakeit (Go)](https://github.com/brianvoe/gofakeit): Programmatic test entity generation libraries for deterministic test state isolation.
- [GraphQL Inspector & Schema Linter](https://graphql-inspector.com/): Official tooling for GraphQL schema validation, breaking change detection, and CI contract checking.
- [graphql-schema-linter](https://github.com/cjoudrey/graphql-schema-linter): CLI tool to validate GraphQL schema definitions against production rules.
- [AsyncAPI Specification v3.0.0](https://www.asyncapi.com/specifications/v3.0.0): Machine-readable spec standard for event-driven and message broker contracts.
- [httpmock (Go)](https://github.com/jarcoal/httpmock): Wire-level HTTP stubbing library for Go transport testing.
- [ISO/IEC 25010:2023 — Systems and Software Engineering — Quality Requirements and Evaluation (SQuaRE)](https://www.iso.org/standard/78176.html): International standard for software product quality, test coverage, and reliability measurement.
- [W3C Trace Context Specification (W3C Recommendation 23 November 2021)](https://www.w3.org/TR/trace-context/): Standard definition for `traceparent` and `tracestate` header propagation across distributed systems and test runs.
- [Martin Fowler — Transactional Tests](https://martinfowler.com/bliki/TransactionalTest.html): Architectural guidelines for transaction rollback and database test isolation patterns.
- [Vitest Testing Framework Documentation](https://vitest.dev/): Next-generation Vite-native unit and integration test framework for Node.js and TypeScript.
- [pytest-asyncio Documentation](https://pytest-asyncio.readthedocs.io/): Official Pytest plugin for executing asynchronous test coroutines and async fixtures.
- [Supertest HTTP Assertion Library](https://github.com/ladjs/supertest): High-level abstraction for testing HTTP endpoints in Node.js applications.
- [HTTPX — Async HTTP Client for Python](https://www.httpx.org/): Fully featured async HTTP client for Python supporting ASGI app transport testing.
- [Hypothesis — Property-Based Testing for Python](https://hypothesis.readthedocs.io/): Powerful library for property-based test generation in Python.
- [fast-check — Property-Based Testing for JavaScript & TypeScript](https://fast-check.dev/): Property-based testing framework for JS/TS environments.
- [golangci-lint Documentation](https://golangci-lint.run/): Fast Go linters runner for static code analysis.
- [Ruff Linter & Formatter Documentation](https://docs.astral.sh/ruff/): An extremely fast Python linter and code formatter written in Rust.
- [ESLint Documentation](https://eslint.org/): Pluggable JavaScript and TypeScript static code analysis tool.
- [Mypy Static Type Checker](https://mypy.readthedocs.io/): Static type checking tool for Python applications.
- [TypeScript Compiler CLI Reference](https://www.typescriptlang.org/docs/handbook/compiler-options.html): Official CLI flags (`tsc --noEmit`) for static type verification.
- [NIST SP 800-115 — Technical Guide to Information Security Testing and Assessment](https://csrc.nist.gov/pubs/sp/800/115/final): Primary NIST guide for technical security testing, penetration testing, and vulnerability assessments.
- [Pact Specification v4 — Consumer-Driven Contract Testing](https://docs.pact.io/5-minute-getting-started-guide): Specification standard for consumer-driven contract testing across distributed microservices.
- [Go Vulncheck Documentation](https://go.dev/doc/tutorial/govulncheck): Official Go vulnerability detection tool for dependencies.
- [pip-audit Vulnerability Scanner](https://pypi.org/project/pip-audit/): CLI tool for scanning Python environments and requirements for known vulnerabilities.
- [npm-audit CLI Reference](https://docs.npmjs.com/cli/v10/commands/npm-audit): Package vulnerability scanner for Node.js projects.
- [openapi-diff Tool](https://github.com/OpenAPITools/openapi-diff): Java-based CLI tool for comparing OpenAPI specifications and enforcing compatibility.
- [pytest-xdist Parallel Test Runner](https://pytest-xdist.readthedocs.io/): Pytest plugin for parallel test execution across CPU cores and isolated workers.
- [Vitest Pool Threads & Isolation](https://vitest.dev/guide/features.html#threads): Vitest worker pool threads and process isolation configuration.
- [Go Testing Flags & Parallel Execution](https://pkg.go.dev/testing#hdr-Main): Go standard library testing package documentation covering `-parallel` worker execution.
- [Go Fuzzing Documentation](https://go.dev/doc/tutorial/fuzz): Official tutorial and specification for native Go property and fuzz testing (`go test -fuzz`).
- [AsyncAPI Diff Tool](https://github.com/asyncapi/diff): Official CLI repository and documentation for AsyncAPI breaking change detection.
