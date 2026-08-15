# Backend Concepts Coverage Audit

Date: 2026-08-15

## Scope

This audit checks whether the backend documentation section covers the essential universal concepts for production backend development. It audits the whole backend section, not only `docs/backend/index.md`.

Included local files:

- `docs/backend/index.md`
- `docs/backend/api-design.md`
- `docs/backend/auth-session.md`
- `docs/backend/database-orm.md`
- `docs/backend/logging-observability.md`
- `docs/backend/resilience-caching.md`
- `docs/backend/go-rest-hexagonal.md`
- `docs/backend/nodejs-typescript.md`
- `docs/backend/python-fastapi.md`
- `templates/AGENTS-backend.md`
- related cross-cutting security docs where backend concepts depend on them

## Verdict

The backend section covers the right top-level areas, but it is not yet complete as a production backend concept map. The strongest coverage is API design, auth/session, the generic backend AGENTS template, and the Go hexagonal deep dive. The weakest areas are the stub backend docs for database, logging, resilience, Node.js, and FastAPI, plus missing first-class pages for testing/quality gates, background jobs/events, configuration/runtime operations, and performance/capacity.

The current backend index is good navigation, not a concept map. It should eventually become a short orientation page that explains how the backend standards fit together and which gaps are handled by cross-cutting sections such as security and DevOps.

## Coverage Matrix

| Essential concept | Why it is essential | Current coverage | Status | Recommended doc action | Evidence |
|---|---|---|---|---|---|
| Architecture and module boundaries | Backend systems need clear separation between transport, domain/application logic, persistence, and infrastructure adapters so changes and tests stay local. | `templates/AGENTS-backend.md`; `docs/backend/go-rest-hexagonal.md`; `docs/general/architecture-patterns.md` | Partially covered | Add a universal backend architecture page or expand `docs/general/architecture-patterns.md` with backend-specific examples. | CNCF cloud native definition emphasizes loosely coupled, resilient, manageable, observable systems; NIST SSDF requires secure design practices. |
| API contracts and compatibility | APIs are integration contracts; clients and services need machine-checkable schemas, versioning, validation, and safe error semantics. | `docs/backend/api-design.md`; `templates/AGENTS-backend.md` | Covered, needs depth later | Keep as current canonical backend API page; later add examples for REST, GraphQL, gRPC, and AsyncAPI. | OpenAPI specification; OWASP API Security Top 10. |
| Authentication, session management, and authorization | Backends must verify credentials, protect sessions, and enforce object-level authorization on every protected resource. | `docs/backend/auth-session.md`; `templates/AGENTS-backend.md`; `docs/security/owasp-top-10.md` | Covered | Keep `auth-session.md` as canonical. Later sync `owasp-top-10.md` with it. | OWASP ASVS; OWASP API Security Top 10; NIST SP 800-63B. |
| Input validation and injection prevention | Untrusted input reaches APIs, database queries, commands, queues, and downstream calls; backend docs must require strict boundary validation and parameterization. | `docs/backend/api-design.md`; `templates/AGENTS-backend.md`; `docs/backend/database-orm.md` stub | Partially covered | Expand `database-orm.md` and add a cross-reference from API design to injection prevention. | OWASP Query Parameterization and SQL Injection Prevention cheat sheets; OWASP ASVS. |
| Data persistence, transactions, and migrations | Production backends depend on durable state, safe schema evolution, transaction boundaries, isolation, indexing, and audit metadata. | `docs/backend/database-orm.md` stub; `templates/AGENTS-backend.md`; `docs/backend/go-rest-hexagonal.md` | Partially covered | Review/expand `docs/backend/database-orm.md` soon. Include zero-downtime migrations, transaction boundaries, query safety, indexing, consistency models, backups interaction, and audit metadata. | Fowler/Sadalage evolutionary database design; PostgreSQL transaction isolation docs; OWASP secure database access. |
| Observability: logs, metrics, traces | Backend services need correlated telemetry to debug distributed failures and operate production systems. | `docs/backend/logging-observability.md` stub; `templates/AGENTS-backend.md`; `docs/backend/go-rest-hexagonal.md` | Partially covered | Review/expand `docs/backend/logging-observability.md`. Include structured logs, trace context, metrics, redaction, SLIs/SLOs, and alertability boundaries. | OpenTelemetry docs and specifications; Google SRE SLO guidance. |
| Reliability and resilience | Backends fail through dependency outages, overload, retry storms, slow downstreams, and process termination. Timeouts, retries, circuit breakers, bulkheads, graceful shutdown, and rate limits are core concepts. | `docs/backend/resilience-caching.md` stub; `templates/AGENTS-backend.md`; `docs/backend/go-rest-hexagonal.md` | Partially covered | Review/expand `docs/backend/resilience-caching.md`. Consider renaming or splitting caching from resilience if the file grows too broad. | Google SRE books; CNCF cloud native definition; Fowler microservices "design for failure" material. |
| Caching and data freshness | Backends often use caches for latency and load, but need cache invalidation, TTLs, consistency, stampede protection, and privacy boundaries. | `docs/backend/resilience-caching.md` stub | Missing/partial | Expand resilience-caching or create a dedicated caching standard if enough detail is needed. | Google SRE reliability framing; general backend production practice. |
| Runtime configuration and secret handling | Config and secrets must be separated from code, injected safely, and varied by deployment environment. | `docs/security/secrets-management.md`; `templates/AGENTS-backend.md`; `templates/AGENTS-devops.md` | Covered cross-section, weak backend index visibility | Add backend index note pointing to security/secrets and DevOps runtime docs. Avoid duplicating the full standard. | Twelve-Factor App config; OWASP Secrets Management; Kubernetes secrets good practices. |
| Testing and quality gates | Backend correctness depends on unit tests, integration tests against real dependencies, contract tests, negative auth tests, and CI gates. | `templates/AGENTS-backend.md`; `docs/general/code-review-checklist.md`; language-specific stubs | Missing as backend page | Create `docs/backend/testing-quality-gates.md` or `docs/general/testing-quality-gates.md` and link it from backend. | NIST SSDF; Fowler continuous integration and database migration testing; Google SRE testing for reliability. |
| Background jobs, queues, events, and idempotency | Modern backends often process asynchronous work; production safety requires outbox patterns, idempotent consumers, retries, DLQs, ordering, and trace context propagation. | `templates/AGENTS-backend.md` mentions outbox/idempotency; no backend doc | Missing | Create `docs/backend/async-jobs-events.md` or include a substantial section in resilience/data docs. | CNCF cloud native definition; Google SRE reliability guidance; outbox pattern should be sourced when drafting. |
| Performance, capacity, and resource management | Backend services must bound latency, memory, CPU, connection pools, concurrency, pagination, and expensive queries. | `templates/AGENTS-backend.md`; `docs/general/code-review-checklist.md`; `docs/backend/resilience-caching.md` stub | Missing/partial | Add performance/capacity section to resilience or create `docs/backend/performance-capacity.md`. | Google SRE SLI/SLO guidance; OpenTelemetry metrics concepts. |
| Deployment readiness and operability | Production services need health probes, graceful shutdown, startup behavior, config validation, release coordination, rollback readiness, and smoke tests. | `templates/AGENTS-backend.md`; `docs/devops/*`; `docs/backend/go-rest-hexagonal.md` | Partially covered cross-section | Add backend index cross-links to DevOps docs; include runtime readiness in resilience/logging docs. | Twelve-Factor App disposability/logs; Google SRE release/monitoring guidance; CNCF cloud native definition. |
| Secure SDLC and supply-chain controls | Backend projects need dependency hygiene, SAST/dependency scanning, reproducible builds, and vulnerability remediation workflows. | `docs/general/code-review-checklist.md`; `docs/devops/ci-cd-pipelines.md`; no backend-specific page | Missing/partial | Keep mostly cross-cutting, but backend index should mention code review and CI/CD links. | NIST SSDF; OWASP ASVS. |
| Language/framework-specific implementation standards | Teams need stack-specific details, but this repo decided distributed AGENTS templates remain role-based and generic. | `docs/backend/go-rest-hexagonal.md` strong; Node.js/FastAPI pages are stubs | Mixed | Decide whether to keep Node.js/FastAPI pages as source-backed standards like Go, or remove/replace them with project-level guidance. | Local `CONTEXT.md` template granularity decision. |

## Backend Section Gaps

### High Priority

1. Expand `docs/backend/database-orm.md`.
   This is the largest backend reliability gap because persistent data, migrations, transactions, and query safety are central to production correctness.

2. Expand `docs/backend/logging-observability.md`.
   The backend template requires structured logs, trace propagation, PII masking, health probes, and OpenTelemetry-compatible telemetry, but the linked page is still a stub.

3. Expand `docs/backend/resilience-caching.md`.
   Timeouts, retries, circuit breakers, rate limits, graceful shutdown, overload behavior, and cache safety need a canonical explanation.

4. Create a testing/quality-gates standard.
   Backend test guidance exists in templates and code review, but there is no canonical doc for unit/integration/contract/E2E smoke testing, deterministic test data, negative auth tests, and CI enforcement.

### Medium Priority

5. Create or incorporate a background jobs/events standard.
   The backend template already requires transactional outbox and idempotent consumers, but there is no doc explaining queues, retries, DLQs, ordering, outbox relay safety, and trace context propagation.

6. Add backend index cross-links to security and DevOps concepts.
   Secrets, deployment, CI/CD, containers, and monitoring are currently outside `docs/backend/` but are essential to backend production readiness.

7. Resolve Node.js and FastAPI page strategy.
   Either flesh them out as source-backed language standards, as Go already is, or demote/remove them to avoid implying equal maturity.

## Proposed Backend Concept Map

The backend section should eventually orient readers around these universal concept groups:

1. API contracts and compatibility
2. Architecture and dependency boundaries
3. Authentication, authorization, and session security
4. Input validation and secure data access
5. Database design, migrations, transactions, and auditability
6. Observability: logs, metrics, traces, events, and redaction
7. Resilience: timeouts, retries, rate limits, circuit breakers, graceful shutdown, overload
8. Caching and data freshness
9. Background work, queues, events, outbox, idempotency
10. Testing and quality gates
11. Runtime configuration, secrets, and environment parity
12. Deployment readiness and operability
13. Performance, capacity, and resource bounds
14. Language/framework implementation addenda

## Evidence

- [OWASP ASVS 5.0](https://github.com/OWASP/ASVS): application security verification requirements for web applications and services.
- [OWASP API Security Top 10 2023](https://owasp.org/www-project-api-security/): API-specific risks including BOLA, broken authentication, BOPLA, unrestricted resource consumption, and unsafe business flows.
- [NIST SP 800-218 SSDF](https://csrc.nist.gov/pubs/sp/800/218/final): secure software development practices covering design, implementation, verification, release, and vulnerability response.
- [OpenAPI Specification](https://spec.openapis.org/oas/): machine-readable API contract standard for HTTP APIs.
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/): vendor-neutral telemetry framework for traces, metrics, logs, context propagation, and collectors.
- [Google SRE: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/): production reliability framing around SLIs, SLOs, latency, availability, throughput, and error budgets.
- [The Twelve-Factor App](https://www.12factor.net/): service design methodology covering config, backing services, build/release/run separation, stateless processes, disposability, logs, and environment parity.
- [CNCF Cloud Native Definition](https://www.cncf.io/about/who-we-are/): cloud native systems should be loosely coupled, resilient, manageable, observable, and automated.
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html): primary guidance for parameterized queries and injection prevention.
- [OWASP Query Parameterization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html): language examples and rationale for parameterized database queries.
- [Evolutionary Database Design](https://www.martinfowler.com/articles/evodb.html): database migrations as version-controlled artifacts and continuous database evolution.
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/sql-set-transaction.html): primary database source for isolation level semantics.

## Notes

- This audit intentionally does not rewrite the missing pages. It identifies the concept coverage gaps so the next file reviews are sequenced by risk and leverage.
- Some evidence sources are cross-cutting rather than backend-only. That is appropriate because backend production readiness includes security, DevOps, and reliability concerns.
