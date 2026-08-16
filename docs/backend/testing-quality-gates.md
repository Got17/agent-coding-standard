# Testing & Quality Gates Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-TESTING -->
## Backend Testing & Quality Gate Rules
- Enforce the Testing Pyramid ratio: high proportion (~70%) of fast, isolated unit tests for domain business logic; targeted (~20%) integration tests using Testcontainers or ephemeral databases for repositories and handlers; lightweight (~10%) E2E smoke tests for critical paths. Ratios represent target distributions, not rigid mechanical quotas.
- Enforce deterministic test execution with zero shared mutable state across test runs. Use test data factories (FactoryBoy, Fishery, Gofakeit) over static SQL seed dumps. Execute database integration tests within isolated schemas, dedicated temporary databases, or truncated transactions.
- Mandatory Negative Authorization Coverage: Every protected API resource and endpoint MUST include at least one negative authorization test asserting that a valid authenticated principal from a different user or tenant context receives `403 Forbidden` or `404 Not Found` — never resource data (BOLA/IDOR security verification). Negative authorization tests MUST run in CI pipelines.
- Automated Contract Validation in CI: Automatically validate API spec diffs (OpenAPI, Protobuf, GraphQL, AsyncAPI) in CI pipelines using automated tooling (`oasdiff`, `buf breaking`, `graphql-schema-linter`). Block pull requests introducing unauthorized breaking changes or un-versioned schema updates.
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
      - name: Validate OpenAPI Breaking Changes
        uses: oasdiff/oasdiff-action/breaking@v1
        with:
          base: 'origin/${{ github.base_ref }}:docs/openapi.json'
          revision: 'docs/openapi.json'
          fail-on: ERR
```

#### Code Coverage Gates
- **Line & Branch Coverage**: Enforce a minimum threshold of **80% line and branch coverage** on core business services (`services/`, `domain/`).
- **Focus Coverage**: Require 100% coverage on security-critical authorization middlewares and tenant isolation logic.
- **CI Blocking**: Coverage checks MUST run as required PR checks and block merging if thresholds drop.

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
	"github.com/testcontainers/testcontainers-go"
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
	t.Cleanup(func() { _ = pgContainer.Terminate(ctx) })

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
	assert.Equal(t, http.StatusForbidden, rec.Code, "Tenant B must not access Tenant A resource")
	var errResp map[string]interface{}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &errResp))
	assert.Equal(t, "PERMISSION_DENIED", errResp["code"])
	assert.NotEmpty(t, errResp["request_id"])
	assert.NotEmpty(t, errResp["timestamp"])
	assert.NotContains(t, rec.Body.String(), orderA.ID, "Response body must not leak resource data")
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
  tenantId: string;
  amountCents: number;
}

// 1. Define Test Data Factory using Fishery
const orderFactory = Factory.define<Order>(({ sequence }) => ({
  id: `ord_${sequence}`,
  tenantId: 'tenant_default',
  amountCents: 4999,
}));

// 2. Wire-level HTTP Mocking for downstream payment gateway using MSW
const mswServer = setupServer(
  http.post('https://api.stripe.com/v1/charges', () => {
    return HttpResponse.json({ id: 'ch_test_123', status: 'succeeded' });
  })
);

describe('Orders API Authorization Security', () => {
  let container: StartedPostgreSqlContainer;
  let app: any;

  beforeAll(async () => {
    mswServer.listen({ onUnhandledRequest: 'error' });
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    app = await createApp({ connectionString: container.getConnectionUri() });
  });

  afterEach(() => {
    mswServer.resetHandlers();
  });

  afterAll(async () => {
    mswServer.close();
    await container.stop();
  });

  it('enforces negative authorization (BOLA) when tenant B accesses tenant A resource', async () => {
    // Seed resource owned by Tenant A
    const orderA = orderFactory.build({ tenantId: 'tenant_A' });
    await app.db('orders').insert(orderA);

    // Act: Authenticated user from Tenant B requests Tenant A's order
    const response = await request(app)
      .get(`/api/v1/orders/${orderA.id}`)
      .set('Authorization', 'Bearer token_user_tenant_B');

    // Assert: Must receive 403 Forbidden or 404 Not Found with standard 5-key error envelope
    expect([403, 404]).toContain(response.status);
    expect(response.body.code).toBe('PERMISSION_DENIED');
    expect(response.body.request_id).toBeDefined();
    expect(response.body.timestamp).toBeDefined();
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

@pytest_asyncio.fixture
async def async_client(postgres_container) -> AsyncGenerator[AsyncClient, None]:
    # Construct async SQLAlchemy engine handling driver-prefixed connection URLs
    url = postgres_container.get_connection_url()
    db_url = (
        url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
           .replace("postgresql+psycopg://", "postgresql+asyncpg://")
           .replace("postgresql://", "postgresql+asyncpg://")
    )
    engine = create_async_engine(db_url, echo=False)
    
    # Initialize DDL schema on container database instance
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
        async with async_session_factory() as session:
            yield session

    # Override FastAPI dependency with container session generator
    app.dependency_overrides[get_db_session] = override_get_db_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        yield client

    app.dependency_overrides.clear()
    await engine.dispose()

@pytest.mark.asyncio
async def test_negative_authorization_bola_returns_403(async_client: AsyncClient):
    """
    Assert BOLA security control: User B (Tenant B) CANNOT fetch Order created by Tenant A.
    Verifies HTTP 403 Forbidden and standard flat 5-key error payload.
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
    assert payload["code"] == "PERMISSION_DENIED"
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
- [oasdiff — OpenAPI Spec Diff & Breaking Changes Detector](https://github.com/Tufin/oasdiff): Command-line tool and GitHub Action for comparing OpenAPI specifications and enforcing breaking change policies in CI pipelines.
- [OpenAPI Specification v3.1.0 & Contract Validation](https://spec.openapis.org/oas/v3.1.0): Official specification for API contract definitions and semantic versioning breaking change policies.
- [Buf Protocol Buffers Documentation — Breaking Change Detection](https://buf.build/docs/breaking/): Standard for detecting backward-incompatible API changes in Protobuf RPC declarations.
- [Test Data Factories — FactoryBoy (Python)](https://factoryboy.readthedocs.io/), [Fishery (TypeScript)](https://github.com/thoughtbot/fishery), [Gofakeit (Go)](https://github.com/brianvoe/gofakeit): Programmatic test entity generation libraries for deterministic test state isolation.
- [GraphQL Inspector & Schema Linter](https://graphql-inspector.com/): Official tooling for GraphQL schema validation, breaking change detection, and CI contract checking.
- [httpmock (Go)](https://github.com/jarcoal/httpmock): Wire-level HTTP stubbing library for Go transport testing.
- [ISO/IEC 25010:2023 — Systems and Software Engineering — Quality Requirements and Evaluation (SQuaRE)](https://www.iso.org/standard/78176.html): International standard for software product quality, test coverage, and reliability measurement.
- [RFC 9110 — HTTP Semantics (Section 15.5.4 403 Forbidden & Section 15.5.5 404 Not Found)](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.4): Primary IETF specification for HTTP status code authorization and resource masking semantics.
- [AsyncAPI CLI Diff Command](https://www.asyncapi.com/docs/tools/cli/usage#asyncapi-diff): Official AsyncAPI CLI tool reference for detecting breaking contract changes in message schemas and channels.
