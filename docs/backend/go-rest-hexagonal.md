# Go REST Hexagonal Backend Standard

> Copy this block into a Go REST API project's `AGENTS.md` when the service uses hexagonal architecture.

<!-- AI-COPY-BLOCK
NON-NEGOTIABLE GO BACKEND RULES (enforce every PR):
1. Architecture: Use hexagonal architecture for REST APIs. Keep `cmd/<service>/main.go` as the composition root only. Keep business rules in `internal/domain` and application use cases in `internal/app`. HTTP, SQL, queues, caches, and third-party SDKs are adapters outside the core.
2. Dependency direction: Domain and application packages MUST NOT import HTTP routers, database drivers, ORM/query libraries, Redis clients, message brokers, cloud SDKs, or logging/telemetry vendors. Adapters depend inward on ports; the core never depends outward on adapters.
3. Ports: Define small interfaces in the package that consumes them, usually `internal/app/<usecase>`. Return concrete types from adapter constructors. Do not create `ports`, `interfaces`, `common`, or `utils` packages as dumping grounds.
4. REST handlers: Handlers decode, strictly validate, authenticate/authorize, invoke one use case, and encode responses. They MUST NOT contain business decisions, SQL, transaction choreography, or infrastructure retry logic.
5. Context and cancellation: Pass `context.Context` as the first parameter on all request-scoped use cases, repositories, clients, and transactions. Never store context in structs. Derive bounded timeouts for outbound network and database calls.
6. Errors: Always check errors. Wrap with useful operation context using `%w`; expose typed/domain sentinel errors from the core; translate them to the standard backend 5-key API error envelope at the HTTP adapter boundary.
7. Data access: Use parameterized SQL or query-builder parameters only. Keep `database/sql` or driver details inside repository adapters. Use `BeginTx`/`Tx` APIs for transactions and never call non-transaction `DB` methods from inside a transaction workflow.
8. Security: Scope every protected query by authenticated user/tenant from server-side auth context. Reject undeclared request fields. Use explicit write DTOs; never bind request bodies directly into persistence models.
9. Observability: Use structured JSON logs, OpenTelemetry-compatible traces/metrics, and W3C `traceparent`/`tracestate` propagation. Do not use `fmt.Println` or ad hoc text logs in production paths.
10. Runtime: Configure HTTP server read/write/idle timeouts, database pool bounds, health probes, and graceful `http.Server.Shutdown` on SIGTERM/SIGINT.
11. Testing: Unit-test domain and use cases with in-memory/fake adapters. Integration-test real repositories and HTTP adapters with ephemeral databases. Add fuzz tests for parsers, validators, and request decoding edge cases.
12. Tooling: Every CI run MUST execute `gofmt`/`goimports`, `go test ./...`, `go test -race ./...` for supported packages, and `govulncheck ./...`.
-->

<!-- START AGENT-STANDARD: BACKEND-GO -->

## Go REST Hexagonal Architecture Rules
- [ ] `cmd/<service>/main.go` is the only composition root. It loads config, creates adapters, injects dependencies, starts the HTTP server, and owns shutdown.
- [ ] Core packages (`internal/domain`, `internal/app`) are framework-agnostic and infrastructure-free.
- [ ] HTTP handlers, SQL repositories, external API clients, cache clients, message publishers, and telemetry exporters are adapters.
- [ ] Interfaces are defined by the consumer package, not by the implementation package.
- [ ] Handler methods contain no business decisions and no database queries.
- [ ] Every request-scoped public method accepts `context.Context` first.
- [ ] All SQL is parameterized. Never build SQL with `fmt.Sprintf` and untrusted values.
- [ ] Domain/application errors are translated to the backend standard 5-key API error envelope only at the transport adapter.
- [ ] Production services expose liveness/readiness probes, structured logs, OpenTelemetry traces/metrics, and graceful shutdown.
- [ ] CI runs formatting, tests, race detection where supported, and vulnerability checks.

<!-- END AGENT-STANDARD: BACKEND-GO -->

---

## Detailed Human Guide & Rationale

### 1. Recommended Project Layout

Use this layout for a production Go REST API service:

```text
project-root/
  go.mod
  cmd/
    api/
      main.go
  internal/
    domain/
      user/
        entity.go
        errors.go
    app/
      user/
        service.go
        commands.go
        queries.go
    adapters/
      http/
        user_handler.go
        routes.go
        errors.go
      postgres/
        user_repository.go
      redis/
        cache.go
      outbound/
        email_client.go
    platform/
      config/
      logger/
      telemetry/
      server/
  migrations/
  api/
    openapi.yaml
```

This follows Go's official server guidance: keep server implementation packages in `internal/`, group binaries under `cmd/`, and split shareable packages into separate modules only when they truly need external reuse. See [Organizing a Go module](https://go.dev/doc/modules/layout).

### 2. Hexagonal Boundaries

Hexagonal architecture exists to let the application be driven by users, automated tests, batch scripts, or other programs while being testable without its final UI, database, or infrastructure. The original Ports and Adapters article emphasizes that the application should be able to run without either UI or database dependencies, using adapters around a core application boundary. See Alistair Cockburn's [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture).

For Go REST APIs, map the idea this way:

- **Domain**: Entities, value objects, invariants, domain errors, pure rules.
- **Application**: Use cases, command/query orchestration, transaction boundaries, consumed ports.
- **Inbound adapters**: HTTP handlers, middleware, route binding.
- **Outbound adapters**: SQL repositories, email/SMS clients, cache clients, event publishers.
- **Composition root**: `cmd/api/main.go`, where concrete adapters are wired into use cases.

The key review question is simple: can domain and application tests run without starting HTTP, connecting to a real database, or loading cloud SDKs? If not, an adapter has leaked inward.

### 3. Ports And Interfaces In Go

Go interfaces should normally live in the package that consumes the behavior, not the package that implements it. The Go Code Review Comments explain that implementers should usually return concrete types, while consumers define the small interface they need. See [Go Code Review Comments: Interfaces](https://go.dev/wiki/CodeReviewComments#interfaces).

Good:

```go
package user

type Repository interface {
	FindByID(ctx context.Context, id ID) (*User, error)
	Save(ctx context.Context, user *User) error
}

type Service struct {
	repo Repository
}
```

Avoid:

```text
internal/ports/
internal/interfaces/
internal/common/
internal/utils/
```

Those packages usually hide weak boundaries. Prefer domain names such as `user`, `billing`, `tenant`, `postgres`, `mailer`, or `telemetry`.

### 4. REST Adapter Rules

HTTP handlers are inbound adapters. They should:

- Decode request payloads.
- Reject unknown fields and invalid types.
- Authenticate and authorize using server-side identity context.
- Call exactly one application use case.
- Map successful output to response DTOs.
- Map typed application/domain errors to the standard backend API error envelope.

Handlers should not:

- Run SQL.
- Open transactions.
- Contain pricing, permission, workflow, or state-transition decisions.
- Know persistence table shape.
- Return raw Go error strings to clients.

Keep OpenAPI as the public contract in `api/openapi.yaml`, and keep DTOs aligned with it.

### 5. Context Propagation And Timeouts

Go's `context` package carries deadlines, cancellation signals, and request-scoped values across API boundaries. Official docs state that incoming server requests should create contexts and outgoing calls should accept them. See [Package context](https://go.dev/pkg/context/) and the Go blog's [Context pattern](https://go.dev/blog/context).

Rules:

- `context.Context` is the first parameter on use cases, repositories, and outbound clients.
- Never store `context.Context` in a struct.
- Do not pass `nil` context.
- Use `context.WithTimeout` for database queries, HTTP clients, Redis calls, and external RPCs.
- Use context values sparingly for request metadata such as trace IDs and auth identity, not optional function parameters.

### 6. Persistence And Transactions

Repository adapters may use `database/sql`, `sqlc`, `pgx`, GORM, Ent, or another project-approved data tool, but the dependency must stay outside the domain/application core.

Minimum rules:

- Use parameterized SQL or query-builder parameters for all untrusted values. Go's SQL injection guide explicitly warns against constructing SQL with formatted strings. See [Avoiding SQL injection risk](https://go.dev/doc/database/sql-injection).
- Keep `sql.DB` pool configuration explicit for production. The official database docs describe `sql.DB` as a concurrent connection pool and expose max open, max idle, idle lifetime, and max lifetime settings. See [Managing connections](https://go.dev/doc/database/manage-connections).
- Use `DB.BeginTx` and `sql.Tx` methods for transaction workflows. Do not mix transaction SQL statements with `database/sql` transaction APIs, and do not call non-transaction `DB` methods from inside a transaction path. See [Executing transactions](https://go.dev/doc/database/execute-transactions).
- Keep transaction scopes short. Never perform external network I/O inside an open transaction.
- Map persistence rows to domain entities at the repository boundary; do not let ORM models become domain models.

### 7. Error Handling

Go code must handle errors explicitly. Effective Go describes returning rich error values alongside normal results, and Go Code Review Comments says not to discard returned errors. See [Effective Go: Errors](https://go.dev/doc/effective_go#errors) and [Go Code Review Comments: Handle Errors](https://go.dev/wiki/CodeReviewComments#handle-errors).

Production rules:

- Use `fmt.Errorf("load user %s: %w", id, err)` to preserve causes.
- Keep domain errors stable and testable, for example `ErrUserNotFound` or typed errors.
- Translate errors at adapter boundaries:
  - domain validation -> `400`
  - unauthenticated -> `401`
  - unauthorized -> `403` or `404`
  - conflict -> `409`
  - canceled/timeouts -> `499`/`504` depending on gateway policy
  - unknown internal -> sanitized `500`
- Never expose SQL driver messages, stack traces, secrets, or raw infrastructure errors to API clients.

### 8. Security Baseline

Apply the universal backend standard plus Go-specific enforcement:

- Strict JSON decoding with unknown-field rejection for write endpoints.
- Explicit request DTOs. Do not bind request JSON directly to persistence structs.
- Object-level authorization on every protected resource. OWASP API Security identifies Broken Object Level Authorization as the top API risk in the 2023 list; scope protected queries by authenticated user or tenant, not client-provided IDs alone. See [OWASP API Security Project](https://owasp.org/www-project-api-security/).
- Property-level authorization for write DTOs. OWASP's 2023 release notes combine excessive data exposure and mass assignment under object property authorization concerns. See [OWASP API Top 10 2023 release notes](https://owasp.org/API-Security/editions/2023/en/0x04-release-notes/).
- Run `govulncheck ./...` in CI. Go's vulnerability management docs describe `govulncheck` as a low-noise tool that reports vulnerabilities affecting called code paths. See [Go Vulnerability Management](https://go.dev/doc/security/vuln/).

### 9. Observability

Use structured logs and OpenTelemetry-compatible instrumentation:

- Log JSON records with severity, timestamp, service name, environment, request ID, trace ID, route, status, latency, and error code.
- Redact credentials, tokens, and PII before logging.
- Propagate W3C `traceparent` and `tracestate` headers on inbound and outbound HTTP calls. The W3C Trace Context recommendation standardizes these headers for distributed tracing interoperability. See [Trace Context](https://www.w3.org/TR/trace-context/).
- Use OpenTelemetry Go SDK/instrumentation for traces and metrics. The OpenTelemetry Go docs list traces and metrics as stable and logs as beta as of the January 27, 2026 page update. See [OpenTelemetry Go](https://opentelemetry.io/docs/languages/go/).

### 10. Runtime And Shutdown

Production Go HTTP servers must set explicit runtime behavior:

- Configure `http.Server` `ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`, and `IdleTimeout`.
- Use bounded database pool settings.
- Expose `GET /healthz/liveness` for process health.
- Expose `GET /healthz/readiness` for dependency readiness with sub-second checks.
- Handle `SIGTERM` and `SIGINT`, stop accepting new traffic, and call `http.Server.Shutdown(ctx)` with a bounded context.

The official `net/http` docs state that `Shutdown` closes listeners, closes idle connections, and waits for active connections to become idle until the provided context expires. See [`http.Server.Shutdown`](https://go.dev/pkg/net/http/#Server.Shutdown).

### 11. Testing Strategy

Test at the architecture boundary:

- Domain tests should be pure unit tests.
- Application use case tests should use fake or in-memory adapters.
- Repository tests should run against ephemeral real databases.
- HTTP adapter tests should assert routing, validation, auth decisions, response shape, and error mapping.
- Authorization tests must cover cross-user or cross-tenant access denial for every protected resource.
- Fuzz tests should cover parsers, validators, custom unmarshalling, and request decoding edge cases. Go supports fuzzing in the standard toolchain and recommends fast, deterministic fuzz targets without persistent global state. See [Go Fuzzing](https://go.dev/doc/security/fuzz/).

### 12. CI Gate

Minimum Go REST backend CI:

```bash
go mod tidy
go fmt ./...
go test ./...
go test -race ./...
govulncheck ./...
```

Prefer `goimports` in developer tooling for import organization. The Go Code Review Comments note that `gofmt` fixes most mechanical style issues and `goimports` adds/removes import lines as needed. See [Go Code Review Comments: Gofmt](https://go.dev/wiki/CodeReviewComments#gofmt).

## Evidence

- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture) — primary architecture source, 2005, defines ports/adapters and testable application isolation.
- [Organizing a Go module](https://go.dev/doc/modules/layout) — official Go documentation, current Go project layout guidance for server projects, `internal/`, and `cmd/`.
- [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments) — official Go wiki, practical review guidance for interfaces, package names, context, errors, and formatting.
- [Package context](https://go.dev/pkg/context/) — official Go package docs, authoritative context propagation and cancellation behavior.
- [Avoiding SQL injection risk](https://go.dev/doc/database/sql-injection), [Managing connections](https://go.dev/doc/database/manage-connections), and [Executing transactions](https://go.dev/doc/database/execute-transactions) — official Go database docs for parameterized SQL, connection pools, and transaction APIs.
- [`http.Server.Shutdown`](https://go.dev/pkg/net/http/#Server.Shutdown) — official Go HTTP server shutdown behavior.
- [OWASP API Security Project](https://owasp.org/www-project-api-security/) and [OWASP API Top 10 2023 release notes](https://owasp.org/API-Security/editions/2023/en/0x04-release-notes/) — authoritative API security risk framing for BOLA and property-level authorization.
- [Trace Context](https://www.w3.org/TR/trace-context/) — W3C Recommendation for `traceparent` and `tracestate` propagation.
- [OpenTelemetry Go](https://opentelemetry.io/docs/languages/go/) — official OpenTelemetry language docs for Go telemetry status and implementation.
- [Go Vulnerability Management](https://go.dev/doc/security/vuln/) and [Go Fuzzing](https://go.dev/doc/security/fuzz/) — official Go security tooling guidance.

## Notes

This standard intentionally keeps Go project structure modest. It avoids framework-specific router rules and avoids forcing a universal package taxonomy across all domains. The important invariant is dependency direction: domain and application logic stay independent from transport, persistence, and infrastructure.
