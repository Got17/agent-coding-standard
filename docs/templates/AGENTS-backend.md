# Production Backend Agent Rules (`AGENTS-backend.md`)

> Copy this file directly into your target backend project root as `AGENTS.md` or append it to your existing project rules.
> Language-agnostic universal production baseline for backend services. Extended by framework/language-specific templates (e.g., `AGENTS-fastapi.md`, `AGENTS-go.md`, `AGENTS-nodejs.md`).

<!-- START AGENT-STANDARD: BACKEND-PRODUCTION -->

## 1. Architecture & Design Principles
- [ ] **Layered Separation**: Code MUST strictly adhere to clean layered architecture: `Transport Layer` (Handlers/Controllers) -> `Service Layer` (Domain Logic) -> `Data Layer` (Repositories/Clients).
- [ ] **Zero Transport Business Logic**: Transport handlers MUST only parse inputs, invoke domain services, and return formatted responses. Zero business rules, validation logic, or SQL queries inside transport controllers.
- [ ] **Dependency Inversion**: Higher-level domain modules MUST depend on interface abstractions, allowing storage engines or external clients to be swapped or mocked in tests seamlessly.
- [ ] **Contract-First API Design**: APIs MUST be defined using explicit OpenAPI 3.1 or Protocol Buffer schemas. Breaking API changes require a major version bump or explicit sunset headers (`Sunset`, `Deprecation`).
- [ ] **Unified Error Payload**: Error responses across all endpoints MUST conform to a standard 5-key JSON envelope (`code`, `message`, `details`, `timestamp`, `request_id`).

## 2. Security & Authentication Baseline
- [ ] **Stateless Authentication**: Authenticate API requests using short-lived OAuth 2.0 / OIDC JWTs. Signature, `iss`, `aud`, and `exp` claims MUST be verified on every protected request.
- [ ] **OWASP BOLA/IDOR Prevention**: Every database query MUST scope data access by the authenticated user/tenant ID extracted from token context. Never rely solely on client-provided route IDs.
- [ ] **Zero-Trust Boundary Input Validation**: Validate all incoming payloads against strict schemas (e.g. Zod, Pydantic, Go Validator) at the transport boundary before passing data to domain services. Payloads containing unexpected or undeclared fields MUST be rejected immediately with `400 Bad Request`.
- [ ] **Secret Hygiene**: Hardcoded secrets, API keys, or private certificates in code are strictly forbidden. Load secrets exclusively via environment variables or secret vaults.
- [ ] **Rate Limiting**: Apply distributed rate limiting on public and authenticated endpoints with standard `429 Too Many Requests` responses and `Retry-After` headers.

## 3. Data Management & Persistence
- [ ] **Zero-Downtime Migrations**: Database schema changes MUST be versioned, immutable migration scripts following the Expand-Migrate-Contract pattern. New columns MUST be added as nullable or with defaults initially.
- [ ] **100% Parameterized SQL**: All database queries MUST use parameterized inputs or ORM parameter bindings. Raw string concatenation in SQL statements is strictly forbidden.
- [ ] **Query Efficiency & N+1 Prevention**: Relational queries MUST use explicit joins, eager loading, or DataLoader patterns to prevent N+1 query execution. Foreign keys and search attributes MUST be indexed.
- [ ] **Statement Timeouts**: Database connection pools MUST configure explicit statement execution caps (e.g. `statement_timeout = 3s`) to prevent long-running or unindexed queries from locking worker threads.
- [ ] **Short Transaction Boundaries**: Database transactions MUST be managed at the Service layer and kept as short as possible. Performing external HTTP, gRPC, or async network I/O inside open DB transactions is strictly forbidden.
- [ ] **Audit Trail Metadata**: Every database table MUST include standard audit attributes: `created_at`, `updated_at`, `created_by`, `updated_by`, and optional `deleted_at` for soft deletion.

## 4. Observability & Telemetry
- [ ] **Structured JSON Logs**: All application logging MUST use structured JSON format with explicit severity levels (`DEBUG`, `INFO`, `WARN`, `ERROR`). Plain text print statements (`console.log`, `fmt.Println`) are forbidden in production.
- [ ] **Distributed Trace Propagation**: Every log entry and outgoing network call MUST capture and propagate `trace_id` / `correlation_id` context.
- [ ] **Automatic PII Redaction**: Passwords, API tokens, credit card numbers, and PII MUST be automatically masked or redacted before writing log entries.
- [ ] **Standardized Container Probes**: Expose `GET /healthz/liveness` (process status) and `GET /healthz/readiness` (backing dependency connectivity check including DB/Redis).

## 5. Resilience & Traffic Control
- [ ] **Mandatory Network Timeouts**: Every HTTP client, database pool, gRPC connection, and Redis call MUST specify explicit connection, read, and write timeouts. Default or infinite timeouts are strictly banned.
- [ ] **Smart Retries with Jitter**: Retry transient network failures (502, 503, 504) exclusively for idempotent requests using exponential backoff with randomized jitter.
- [ ] **Circuit Breakers**: Non-critical external third-party integrations MUST be wrapped in circuit breakers with fallback handlers.
- [ ] **Graceful Shutdown**: Implement `SIGTERM`/`SIGINT` signal handlers that stop accepting incoming requests, signal readiness probe failure, complete active in-flight requests within a 30s grace window, and cleanly release database connections.

## 6. Testing Strategy & QA
- [ ] **Pyramid Ratio**: Maintain a high proportion of fast unit tests (70%) for domain business logic, containerized integration tests (20%) for repositories/handlers (using Testcontainers or ephemeral DBs), and lightweight E2E smoke tests (10%).
- [ ] **Deterministic Test State**: Tests MUST NOT share mutable state across runs. Use test data factories over static SQL dumps.
- [ ] **Contract Validation in CI**: Automatically run OpenAPI / Proto schema diff validation in CI pipelines to prevent unintended breaking changes.

<!-- END AGENT-STANDARD: BACKEND-PRODUCTION -->
