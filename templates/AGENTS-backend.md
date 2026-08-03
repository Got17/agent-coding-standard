# Production Backend Agent Rules (`AGENTS-backend.md`)

> Copy this file directly into your target backend project root as `AGENTS.md` or append it to your existing project rules.
> Language-agnostic universal production baseline for backend services. Framework or language-specific rules should be appended directly inside the project-level AGENTS.md file.

<!-- AI-COPY-BLOCK
NON-NEGOTIABLE BACKEND RULES (enforce every PR):
1. Architecture: Transport → Service → Data layering only; zero business logic in handlers; DI via interfaces; OpenAPI 3.1/Protobuf contract-first; unified 5-key error envelope (code, message, details, timestamp, request_id).
2. Security: Short-lived JWT (iss/aud/exp verified); BOLA — scope every query by token user/tenant ID; BOPLA — explicit write allowlists, no mass assignment to ORM models; strict schema validation (reject undeclared fields → 400); secrets via env/vault only; distributed rate limiting (429 + Retry-After).
3. Data: Expand-Migrate-Contract zero-downtime migrations; 100% parameterized SQL; no N+1 (joins/eager load/DataLoader); statement_timeout caps; short TX at service layer (no network I/O inside TX); transactional outbox & consumer idempotency; READ COMMITTED isolation minimum; 4-key audit metadata (created_at, updated_at, created_by, updated_by).
4. Observability: Structured JSON logs (DEBUG/INFO/WARN/ERROR); W3C traceparent/tracestate + trace_id/correlation_id on every log + outgoing call; auto PII redaction; /healthz/liveness + /healthz/readiness probes; OpenTelemetry SDK for traces and metrics.
5. Resilience: Explicit connect/read/write timeouts everywhere; exponential backoff + jitter retries for idempotent requests or idempotency-key POSTs only (429/502/503/504 respecting Retry-After); circuit breakers on non-critical deps; SIGTERM → stop ingress → drain 30s → release connections; preStop sleep for K8s load balancer deregistration.
6. Testing: 70% unit / 20% containerized integration (Testcontainers) / 10% E2E smoke; no shared mutable state; OpenAPI/Proto diff in CI; negative authorization test per protected resource (403/404, not data).
7. Code quality: SRP + DIP; pragmatic DRY/YAGNI (no speculative abstractions); guard clauses over nesting; intent comments (why); docstrings in sync with OpenAPI/Protobuf.
-->

<!-- START AGENT-STANDARD: BACKEND-PRODUCTION -->

## 1. Architecture & Design Principles
- [ ] **Layered Separation**: Code MUST strictly adhere to clean layered architecture: `Transport Layer` (Handlers/Controllers) -> `Service Layer` (Domain Logic) -> `Data Layer` (Repositories/Clients).
- [ ] **Zero Transport Business Logic**: Transport handlers MUST only parse and validate input payload schemas, invoke domain services, and return formatted responses. Zero domain business rules or SQL queries inside transport controllers.
- [ ] **Dependency Inversion**: Higher-level domain modules MUST depend on interface abstractions, allowing storage engines or external clients to be swapped or mocked in tests seamlessly.
- [ ] **Contract-First API Design**: APIs MUST be defined using explicit OpenAPI 3.1 or Protocol Buffer schemas. Breaking API changes require a major version bump or explicit sunset headers (`Sunset`, `Deprecation`).
- [ ] **Unified Error Payload**: Error responses across all endpoints MUST conform to a standard 5-key JSON envelope (`code`, `message`, `details`, `timestamp`, `request_id`).

## 2. Security & Authentication Baseline
- [ ] **Stateless Authentication**: Authenticate API requests using short-lived OAuth 2.0 / OIDC JWTs received via `Authorization: Bearer` headers or secure `httpOnly`, `Secure`, `SameSite` cookies for web clients. Signature, `iss`, `aud`, and `exp` claims MUST be verified on every protected request. Requests with missing, expired, or invalid tokens MUST be rejected immediately with `401 Unauthorized`.
- [ ] **OWASP BOLA/IDOR Prevention**: Every database query MUST scope data access by the authenticated user/tenant ID extracted from token context. Never rely solely on client-provided route IDs.
- [ ] **Zero-Trust Boundary Input Validation**: Validate all incoming payloads against strict schemas (e.g. Zod, Pydantic, Go Validator) at the transport boundary before passing data to domain services. Payloads containing unexpected or undeclared fields MUST be rejected immediately with `400 Bad Request`.
- [ ] **Secret Hygiene**: Hardcoded secrets, API keys, or private certificates in code are strictly forbidden. Load secrets exclusively via environment variables or secret vaults.
- [ ] **Rate Limiting**: Apply distributed rate limiting on public and authenticated endpoints with standard `429 Too Many Requests` responses and `Retry-After` headers.
- [ ] **Mass Assignment Prevention (BOPLA)**: API input schemas MUST use explicit allowlists of writable fields. Binding request payloads directly to ORM model objects (mass assignment) is strictly forbidden. Read-only fields (e.g. `id`, `role`, `created_at`) MUST be excluded from write schemas to prevent Broken Object Property Level Authorization (OWASP API3:2023).

## 3. Data Management & Persistence
- [ ] **Zero-Downtime Migrations**: Database schema changes MUST be versioned, immutable migration scripts following the Expand-Migrate-Contract pattern. New columns MUST be added as nullable or with defaults initially.
- [ ] **100% Parameterized SQL**: All database queries MUST use parameterized inputs or ORM parameter bindings. Raw string concatenation in SQL statements is strictly forbidden.
- [ ] **Query Efficiency & N+1 Prevention**: Relational queries MUST use explicit joins, eager loading, or DataLoader patterns to prevent N+1 query execution. Foreign keys and search attributes MUST be indexed.
- [ ] **Statement Timeouts**: Database connection pools MUST configure explicit statement execution caps (e.g. PostgreSQL `statement_timeout = 3s` or MySQL `max_execution_time`) to prevent long-running or unindexed queries from locking worker threads.
- [ ] **Short Transaction Boundaries**: Database transactions MUST be managed at the Service layer and kept as short as possible. Performing external HTTP, gRPC, or async network I/O inside open DB transactions is strictly forbidden.
- [ ] **Transaction Isolation Level**: Transactions MUST use at minimum `READ COMMITTED` isolation. `SERIALIZABLE` isolation MUST be used only for operations that require strict consistency guarantees. Default engine isolation levels MUST be explicitly confirmed and not assumed.
- [ ] **Audit Trail Metadata**: Every mutable domain entity table MUST include mandatory audit attributes (`created_at`, `updated_at`, `created_by`, `updated_by`, allowing null or system actor IDs for non-user actions). Append-only tables (e.g. outbox, event logs) and junction tables MAY omit update tracking fields.
- [ ] **Transactional Outbox & Event Idempotency**: Asynchronous event publishing MUST use the Transactional Outbox pattern to avoid network I/O inside database transactions. Message consumers MUST enforce idempotency/deduplication using unique message keys.

## 4. Observability & Telemetry
- [ ] **Structured JSON Logs**: All application logging MUST use structured JSON format with explicit severity levels (`DEBUG`, `INFO`, `WARN`, `ERROR`). Plain text print statements (`console.log`, `fmt.Println`) are forbidden in production.
- [ ] **Distributed Trace Propagation**: Every log entry and outgoing network call MUST capture and propagate W3C `traceparent` / `tracestate` headers and include `trace_id` / `correlation_id` context in log records.
- [ ] **Automatic PII Redaction**: Passwords, API tokens, credit card numbers, and PII MUST be automatically masked or redacted before writing log entries.
- [ ] **Standardized Container Probes**: Expose `GET /healthz/liveness` (process status only) and `GET /healthz/readiness` (lightweight backing dependency connectivity check including DB/Redis with explicit sub-second query timeout, ensuring internal timeouts are calibrated below Kubernetes probe `timeoutSeconds`).
- [ ] **OpenTelemetry Instrumentation**: Distributed tracing and metrics MUST be instrumented using the OpenTelemetry SDK or an OTel-compatible library. Vendor-specific proprietary APM agents that lock telemetry to a single provider are prohibited in the service layer — use OTel exporters for vendor routing instead.

## 5. Resilience & Traffic Control
- [ ] **Mandatory Network Timeouts**: Every HTTP client, database pool, gRPC connection, and Redis call MUST specify explicit connection, read, and write timeouts. Default or infinite timeouts are strictly banned.
- [ ] **Smart Retries with Jitter**: Retry transient network failures (502, 503, 504) and rate limits (429, honoring the duration specified in the `Retry-After` header) exclusively for idempotent requests or non-idempotent requests carrying a client-supplied idempotency key, using exponential backoff with randomized jitter.
- [ ] **Circuit Breakers**: Non-critical external third-party integrations MUST be wrapped in circuit breakers with fallback handlers.
- [ ] **Graceful Shutdown**: Implement `SIGTERM`/`SIGINT` signal handlers that stop accepting incoming requests, signal readiness probe failure, complete active in-flight requests within a 30s grace window, and cleanly release database connections.
- [ ] **Kubernetes Drain Coordination**: In container-orchestrated environments, services MUST include a `preStop` lifecycle hook (e.g. `sleep 5`) to allow load balancer deregistration to propagate before SIGTERM is delivered. `terminationGracePeriodSeconds` MUST be set greater than the sum of the `preStop` delay and the application's max drain window (e.g. `5s preStop + 30s drain = 40s+ terminationGracePeriodSeconds`) to prevent forceful pod termination mid-request.

## 6. Testing Strategy & QA
- [ ] **Pyramid Ratio**: Maintain a high proportion of fast unit tests (70%) for domain business logic, containerized integration tests (20%) for repositories/handlers (using Testcontainers or ephemeral DBs), and lightweight E2E smoke tests (10%).
- [ ] **Deterministic Test State**: Tests MUST NOT share mutable state across runs. Use test data factories over static SQL dumps.
- [ ] **Authorization Test Coverage**: Every protected API resource MUST have at least one negative authorization test asserting that a valid but unauthorized principal (different user/tenant) receives `403 Forbidden` or `404 Not Found` — never the resource data. These tests MUST run in CI alongside unit tests.
- [ ] **Contract Validation in CI**: Automatically run OpenAPI / Proto schema diff validation in CI pipelines to prevent unintended breaking changes.

## 7. Code Quality, Maintainability & Documentation
- [ ] **SOLID Alignment**: Enforce Single Responsibility (SRP) per module and Dependency Inversion (DIP) via injected interface abstractions. Maintain high cohesion and low coupling.
- [ ] **Pragmatic DRY & YAGNI**: Consolidate duplicated business rules in a single source of truth, but avoid hasty/speculative abstractions (AHA principle). Do NOT write unused generic parameters, dead code, or speculative plugin hooks.
- [ ] **Guard Clauses Over Deep Nesting**: Prefer early returns/exit guard clauses over deeply nested `if-else` branches to keep cyclomatic complexity low and readability high.
- [ ] **Self-Documenting Code & Intent Comments**: Write descriptive, domain-aligned variable and function names. Comments MUST explain non-obvious business rationale (*why*), never repeating *what* readable code already expresses.
- [ ] **Docstrings & Contract Sync**: Keep inline API docstrings, module documentation, and external spec files (OpenAPI/Protobuf) 100% in sync whenever signatures or data models change.

<!-- END AGENT-STANDARD: BACKEND-PRODUCTION -->
