# Backend Production Standards

> Comprehensive concept map of backend architecture, security, database, resilience, and operational standards for human developers and AI coding agents.

## Backend Concept Map

### 1. Core Architecture & API Contracts
- **[API Design (REST / gRPC / GraphQL)](/backend/api-design)**: HTTP semantics, OpenAPI 3.1 contracts, 5-key error envelopes, breaking change deprecation lifecycle.
- **[General Architecture Patterns](/general/architecture-patterns)**: Layered and hexagonal boundaries, dependency inversion, port-adapter separation.

### 2. Language & Stack Standards
- **[Go REST Hexagonal Standard](/backend/go-rest-hexagonal)**: Go REST layout, consumer-owned ports/adapters, `slog` JSON telemetry, health probes.
- **[Node.js & TypeScript Standard](/backend/nodejs-typescript)**: Strict type checking, async loop hygiene, error propagation.
- **[Python & FastAPI Standard](/backend/python-fastapi)**: Pydantic v2 validation, lifespan context managers, `pytest-asyncio` testing patterns.

### 3. Data Persistence, Auth & Security
- **[Database, ORM & Migrations](/backend/database-orm)**: Expand-Migrate-Contract zero-downtime pattern, SQLi prevention, N+1 query ban, statement/lock timeouts.
- **[Auth & Session Management](/backend/auth-session)**: Secure browser cookies vs tokens, CSRF protection, MFA, deny-by-default authorization.
- **[Secrets Management & Keys](/security/secrets-management)** *(Security)*: Environment variable hygiene, secret vault injection, key rotation workflows.

### 4. Reliability, Telemetry & Performance
- **[Resilience & Caching](/backend/resilience-caching)**: Timeouts, retries with jitter, circuit breakers, rate limits, graceful SIGTERM shutdown, Cache-Aside pattern.
- **[Structured Logging & Telemetry](/backend/logging-observability)**: Structured JSON logging, W3C trace context propagation, PII masking, dual health probes.
- **[Performance, Capacity & Resource Bounds](/backend/performance-capacity)**: Memory/CPU bounds, connection pool sizing, mandatory API pagination, query execution guards.

### 5. Quality, Async Processing & Operations
- **[Testing & Quality Gates](/backend/testing-quality-gates)**: Testing pyramid, Testcontainers integration, negative authorization tests, automated CI contract diff gates.
- **[Background Jobs, Queues & Events](/backend/async-jobs-events)**: Transactional outbox pattern, idempotent message processing, Dead-Letter Queues (DLQ), trace context over queues.
- **[Docker & Container Security](/devops/docker-container)** *(DevOps)*: Multi-stage non-root containers, container security scanning, image pinning.
- **[CI/CD Pipeline Architecture](/devops/ci-cd-pipelines)** *(DevOps)*: Automated test runs, security scanners, container deployment pipelines.

