# Production Fullstack Agent Rules (`AGENTS-fullstack.md`)

> Copy this file directly into your target fullstack project root as `AGENTS.md` or append it to your existing project rules.
> Universal production baseline bridging frontend and backend layers for fullstack applications. Integrates with `AGENTS-backend.md` and `AGENTS-frontend.md`.

<!-- AI-COPY-BLOCK
NON-NEGOTIABLE FULLSTACK RULES (enforce every PR):
1. Workspace Layout: Strict package/module isolation (@project/types, @project/shared-schemas, @project/api-client, @project/server); use `server-only` guards or package export maps to prevent server code/secrets from leaking into client bundles.
2. E2E Type Safety: Single source of truth validation schemas (Zod/Valibot or OpenAPI 3.1) shared between backend handlers and frontend forms/SDKs; zero-type-drift contract validation enforced in CI.
3. State & Hydration: Shareable UI state MUST live in URL search params; server data hydrated directly into async caches (TanStack Query/SWR) without duplicating into component `useState`; mandatory mutation invalidation keys or optimistic rollbacks.
4. Security & Auth: `httpOnly`, `Secure`, `SameSite` cookies for session transport (JWT in `localStorage` strictly banned); anti-CSRF protection on all non-GET mutations; strict CORS origin whitelisting for decoupled setups; client env vars MUST use framework prefixes (NEXT_PUBLIC_, VITE_) and MUST NOT contain secrets.
5. Testing & QA: E2E Playwright/Cypress suites exercising full UI -> API -> Database flows against isolated ephemeral test databases with deterministic seeding; Playwright `storageState` for auth context reuse; zero shared mutable test state.
6. Telemetry & Observability: Propagate W3C `traceparent` / correlation ID headers from browser fetch calls through server handlers to structured logs; forward client error boundary exceptions to centralized telemetry (Sentry/Datadog); dual health probes (/healthz/liveness + /healthz/readiness).
7. Deployment Orchestration: Run Expand-Migrate-Contract DB migrations BEFORE deploying updated code; immutable static asset hashing; pre-flight smoke test gates in CI/CD before zero-downtime cutover.
8. Code Quality: SOLID alignment (SRP per module, DIP via injected interfaces); pragmatic DRY/YAGNI (no speculative abstractions); guard clauses over nesting; intent comments (why, not what); docstrings in sync with shared contracts.
-->

<!-- START AGENT-STANDARD: FULLSTACK-PRODUCTION -->

## 1. Monorepo & Workspace Architecture
- [ ] **Strict Module Isolation**: Codebases MUST enforce strict boundaries between client, server, and shared modules (e.g., using monorepo packages like `@project/shared-schemas`, `@project/api-client`, `@project/server`, `@project/types`).
- [ ] **Build-Time Secret Leak Prevention**: Server-side packages and private environment variables MUST be guarded using `server-only` imports or explicit package export map restrictions. Importing server secrets or Node.js native modules into client browser bundles is strictly forbidden and MUST fail the build.
- [ ] **Shared Schema Package**: Validation schemas (Zod, Valibot, TypeBox) MUST reside in a shared module (e.g. `@project/shared-schemas`) accessible to both backend validation middleware and frontend form libraries to eliminate duplicated logic and type drift.
- [ ] **Client Environment Variable Hygiene**: Browser-accessible environment variables MUST use mandatory framework prefixes (e.g., `NEXT_PUBLIC_`, `VITE_`) and MUST NEVER contain database connection strings, private API keys, or secret tokens.

## 2. End-to-End Type Safety & API Contracts
- [ ] **Single Source of Truth Contracts**: API interfaces and payload types MUST be derived automatically from shared validation schemas or formal specs (e.g. tRPC routers, OpenAPI 3.1 specs, or GraphQL Codegen). Hand-crafted asynchronous payload types on client fetchers are strictly forbidden.
- [ ] **Zero-Type-Drift CI Gate**: CI pipelines MUST run automated type-checking and contract validation suites (e.g. `openapi-diff` or `tsc --noEmit` across shared packages) to ensure frontend clients remain 100% in sync with backend endpoint signatures on every commit.
- [ ] **Boundary Input Validation**: Backend endpoint handlers MUST parse all incoming payloads using shared contract schemas and reject undeclared or invalid properties with `400 Bad Request` before passing control to business logic.
- [ ] **Mass Assignment Prevention**: API write schemas MUST use explicit allowlists of writable fields. Binding request payloads directly to ORM models (mass assignment) is strictly forbidden — read-only fields (`id`, `role`, `created_at`) MUST be excluded from input schemas.

## 3. SSR / Hydration & State Synchronization
- [ ] **Decoupled Server & Client State**: Server-rendered data MUST be hydrated directly into async query caches (e.g. TanStack Query, SWR) or framework loaders. Copying server-fetched data into local component `useState` is strictly forbidden.
- [ ] **URL as Authoritative UI State**: All shareable, bookmarkable UI state (filters, sorting, active pagination, search queries) MUST reside in URL search parameters rather than client-side global stores or component state.
- [ ] **Synchronized Cache Invalidation**: Every server mutation (POST, PUT, PATCH, DELETE or Server Action) MUST execute explicit query key invalidation or supply an optimistic update with rollback logic to keep client views consistent with backend state.
- [ ] **Idempotency on Cross-Boundary Mutations**: Non-idempotent cross-boundary mutations (e.g. payment submissions, order creation) MUST carry a client-generated idempotency key to allow safe server-side deduplication on retries.

## 4. Fullstack Auth Session Propagation & Security Baseline
- [ ] **Secure Cookie Session Transport**: Authentication sessions across fullstack boundaries MUST rely on `httpOnly`, `Secure`, `SameSite=Lax/Strict` cookies. Storing session tokens or JWTs in browser `localStorage` or `sessionStorage` is strictly forbidden.
- [ ] **Anti-CSRF Protection**: State-changing cross-boundary mutations MUST enforce anti-CSRF protection via double-submit cookie patterns or anti-CSRF header verification tokens.
- [ ] **Strict CORS Origin Whitelisting**: Decoupled fullstack setups (where frontend SPA/SSR origin differs from backend API origin) MUST configure explicit CORS whitelists matching trusted application origins only. Wildcard `Access-Control-Allow-Origin: *` is strictly banned in production.
- [ ] **BOLA/IDOR Prevention on Fullstack Boundaries**: Every server-side data query triggered by client input MUST scope data access by the authenticated user/tenant ID from token context. Never rely solely on client-supplied resource IDs.

## 5. End-to-End (E2E) Testing & QA Pipelines
- [ ] **Full Flow E2E Coverage**: Critical user journeys (authentication, onboarding, primary CRUD operations, checkout/payment) MUST be covered by Playwright or Cypress E2E tests that exercise the real fullstack pipeline (UI -> API -> DB).
- [ ] **Deterministic Ephemeral Test Data**: E2E test suites MUST run against isolated ephemeral database instances seeded deterministically before execution. Shared mutable state or static database dumps across concurrent test runs are strictly forbidden.
- [ ] **Auth State Reuse**: E2E tests MUST utilize pre-authenticated browser contexts (e.g. Playwright `storageState`) to bypass repeated UI login steps and accelerate test execution.
- [ ] **Contract Validation in CI**: Automatically run OpenAPI / shared schema diff validation in CI pipelines to prevent unintended breaking changes to the API contract between frontend and backend.

## 6. Fullstack Telemetry & Distributed Trace Propagation
- [ ] **W3C Trace Context Propagation**: Frontend fetch clients MUST automatically inject `traceparent` and correlation ID headers into outgoing API requests. Backend handlers MUST extract and propagate these trace headers down into structured server logs and database traces.
- [ ] **Client Error Boundary Telemetry**: Uncaught JavaScript errors and React Error Boundary exceptions MUST be captured and forwarded to the centralized observability platform (e.g., Sentry, Datadog) tagged with the active user session ID and `trace_id`. Silent swallowing or `console.error`-only logging is strictly forbidden in production.
- [ ] **Unified Health & Readiness Probes**: Fullstack application deployments MUST expose health check endpoints validating both HTTP server liveness (`/healthz/liveness`) and upstream service/database connectivity (`/healthz/readiness`).
- [ ] **OpenTelemetry Instrumentation**: Distributed tracing and metrics MUST be instrumented using the OpenTelemetry SDK or an OTel-compatible library across the server layer and any BFF adapter. Vendor-specific proprietary agents that lock telemetry to a single provider are prohibited.

## 7. Build, Migration & Deployment Orchestration
- [ ] **Pre-Deployment Database Migrations**: Database schema updates MUST be executed using the Expand-Migrate-Contract pattern BEFORE rolling out new application code to ensure older active application pods continue functioning cleanly during rollout.
- [ ] **Immutable Static Asset Hashing**: All static assets (JS bundles, CSS, media) MUST be compiled with content-hashed filenames and served with long-term immutable caching headers (`Cache-Control: max-age=31536000, immutable`).
- [ ] **CI/CD Deployment Gates**: Production deployment pipelines MUST execute linting, type-checking, unit/integration tests, and E2E smoke tests in automated gates prior to zero-downtime traffic cutover.
- [ ] **Graceful Shutdown & Drain**: Fullstack server processes MUST handle `SIGTERM`/`SIGINT` by stopping new request intake, completing in-flight requests within a 30s grace window, and cleanly releasing database and cache connections before exit.

## 8. Code Quality, Maintainability & Documentation
- [ ] **SOLID Alignment**: Enforce Single Responsibility (SRP) per shared module and Dependency Inversion (DIP) via injected interface abstractions across server and shared packages. Maintain high cohesion and low coupling across the fullstack boundary.
- [ ] **Pragmatic DRY & YAGNI**: Consolidate duplicated business rules in a single source of truth shared module, but avoid hasty/speculative abstractions (AHA principle). Do NOT write unused generic parameters, dead code, or speculative plugin hooks.
- [ ] **Guard Clauses Over Deep Nesting**: Prefer early returns/exit guard clauses over deeply nested `if-else` branches in both server handlers and UI component render logic to keep cyclomatic complexity low and readability high.
- [ ] **Intent-Based Comments**: Comments MUST explain non-obvious business rationale (*why*), never repeating *what* readable code already expresses. Naming MUST be domain-aligned (`useCartItemDiscountCalculator` over `useCalc`; `UserRepository` over `UserHelper`).
- [ ] **Contract & Docstring Sync**: Keep inline API docstrings, shared type definitions, and external spec files (OpenAPI/Protobuf/GraphQL schemas) 100% in sync whenever shared schemas or data models change.

<!-- END AGENT-STANDARD: FULLSTACK-PRODUCTION -->
