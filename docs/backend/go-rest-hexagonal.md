# Go REST Hexagonal Backend Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-GO-HEXAGONAL -->
## Go REST Hexagonal Architecture Rules
- Use hexagonal architecture for REST APIs. Keep `cmd/<service>/main.go` as the composition root only. Keep business rules in `internal/domain` and application use cases in `internal/app`. HTTP, SQL, queues, caches, and third-party SDKs are adapters outside the core.
- Domain and application packages MUST NOT import HTTP routers, database drivers, ORM/query libraries, Redis clients, message brokers, cloud SDKs, or logging/telemetry vendors. Adapters depend inward on ports; the core never depends outward on adapters.
- Define small interfaces in the package that consumes them, usually `internal/app/<usecase>`. Return concrete types from adapter constructors. Do not create `ports`, `interfaces`, `common`, or `utils` packages as dumping grounds.
- REST handlers decode, strictly validate, authenticate/authorize, invoke one use case, and encode responses. Use standard Go 1.22+ `net/http` (`http.NewServeMux`) or `chi` for HTTP adapters. Handlers MUST NOT contain business decisions, SQL, transaction choreography, or infrastructure retry logic.
- Pass `context.Context` as the first parameter on all request-scoped use cases, repositories, clients, and transactions. Never store context in structs. Derive bounded timeouts (`context.WithTimeout`) for outbound network and database calls.
- Always check errors. Wrap with useful operation context using `%w`; expose typed/domain sentinel errors from the core; translate them to the standard backend 5-key API error envelope (`code`, `message`, `details`, `timestamp`, `request_id`) at transport adapters (see `docs/backend/api-design.md#4-standard-5-key-error-envelope--diagnostics`).
- Use parameterized SQL or query-builder parameters only. Keep `database/sql` or driver details inside repository adapters. Relational DB transactions MUST default to `READ COMMITTED` isolation (`sql.TxOptions{Isolation: sql.LevelReadCommitted}`). Every persistent entity MUST include the 4 audit metadata fields (`created_at`, `updated_at`, `created_by`, `updated_by`). Never call non-transaction `DB` methods inside a transaction workflow.
- Scope every protected query by authenticated user/tenant from server-side auth context. Reject undeclared request fields. Use explicit write DTOs; never bind request bodies directly into persistence models.
- Use standard library `log/slog` with `slog.NewJSONHandler` for structured JSON logs, OpenTelemetry-compatible traces/metrics, and W3C `traceparent`/`tracestate` propagation. Do not use `fmt.Println` or ad hoc text logs in production paths.
- Configure HTTP server read/write/idle timeouts, database pool bounds, dual health probes (`/healthz/liveness` zero-I/O process check, `/healthz/readiness` dependency check returning 530/503 on failure), and graceful `http.Server.Shutdown` on SIGTERM/SIGINT.
- Unit-test domain and use cases with in-memory/fake adapters in co-located `*_test.go` files. Integration-test real repositories and HTTP adapters with ephemeral databases using `internal/testsupport`. Add fuzz tests for parsers, validators, and request decoding edge cases.
- Every CI run MUST execute `gofmt`/`goimports`, `go test ./...`, `go test -race ./...` for supported packages, and `govulncheck ./...`.
<!-- END AGENT-STANDARD: BACKEND-GO-HEXAGONAL -->
```

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
      member/
        entity.go
        errors.go
        entity_test.go           # Pure domain unit tests (zero mocks/DB)
    app/
      auth/
        service.go
        commands.go
        queries.go
        service_test.go          # Use case tests using in-memory fake adapters
    adapters/
      http/
        auth_handler.go
        routes.go
        errors.go
        auth_handler_test.go     # HTTP transport tests (status codes, envelopes, cookies, CSRF)
        auth_handler_fuzz_test.go# Go Fuzzing for JSON decoding & validation
      postgres/
        session_repository.go
        session_repository_test.go # Repository tests using ephemeral real Postgres
      redis/
        cache.go
        cache_test.go
      outbound/
        email_client.go
        email_client_test.go
    platform/
      config/
        config.go
        config_test.go
      logger/        # Uses Go 1.21+ log/slog JSON handler
      telemetry/     # OpenTelemetry tracer & meter provider
      server/        # net/http server configuration & graceful shutdown
    testsupport/     # Shared test infrastructure helpers & seed data fixtures
      db.go          # Ephemeral DB container pool initialization & transaction rollbacks
      fixtures.go    # Test data factories (e.g. SeedMember, SeedSession)
  migrations/
  api/
    openapi.yaml
```

This follows Go's official server guidance: keep server implementation packages in `internal/`, group binaries under `cmd/`, co-locate `*_test.go` files inside the package being tested, and place shared test database helpers and seed factories in `internal/testsupport/`. See [Organizing a Go module](https://go.dev/doc/modules/layout).

---

### 2. Hexagonal Boundaries

Hexagonal architecture lets the application be driven by users, automated tests, batch scripts, or gRPC services while being testable without its final UI, database, or cloud infrastructure. The original Ports and Adapters article emphasizes that the application core must run without UI or database dependencies, using adapters around a core application boundary. See Alistair Cockburn's [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture).

For Go REST APIs, map boundaries as follows:

- **Domain**: Entities, value objects, domain errors, pure business invariants. Zero third-party dependencies.
- **Application**: Use cases, command/query orchestration, transaction boundaries, consumer-defined ports.
- **Inbound Adapters**: HTTP handlers (`net/http` or `chi`), route registration, payload decoding.
- **Outbound Adapters**: SQL repositories, email/SMS clients, Redis cache, event publishers.
- **Composition Root**: `cmd/api/main.go`, where concrete adapters are wired into use cases via dependency injection.

The key verification question: Can domain and application tests execute without starting an HTTP server, connecting to a database, or importing cloud SDKs? If not, an adapter has leaked inward.

---

### 3. Ports And Interfaces In Go ("Consumer-Owned Interfaces")

Go interfaces must live in the package that consumes the behavior, not the package that implements it. The official Go Code Review Comments explain that implementers should return concrete types from constructors, while consumer packages define the small interface they need. See [Go Code Review Comments: Interfaces](https://go.dev/wiki/CodeReviewComments#interfaces).

#### Good (Consumer Defines Interface)

```go
package user

import "context"

// Repository is defined in internal/app/user (the consumer package)
type Repository interface {
	FindByID(ctx context.Context, id ID) (*User, error)
	Save(ctx context.Context, user *User) error
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}
```

#### Avoid (Global Interface Dumping Grounds)

```text
internal/ports/
internal/interfaces/
internal/common/
internal/utils/
```

Avoid central interface packages. Prefer domain-focused packages such as `user`, `billing`, `postgres`, `mailer`, or `telemetry`.

---

### 4. REST Adapter Rules

HTTP handlers are inbound transport adapters. Prefer standard Go 1.22+ `net/http` routing (`http.NewServeMux()`) or lightweight standard-compatible routers like `chi` (`chi.NewRouter()`).

Handlers should:
- Decode request payloads into explicit DTO structs.
- Reject undeclared fields and invalid types (`400 Bad Request`).
- Extract identity/claims from server-side request context.
- Invoke exactly one application use case.
- Map domain outputs to response DTOs.
- Translate domain errors to the standard flat 5-key API error envelope (`code`, `message`, `details`, `timestamp`, `request_id`).

Handlers MUST NOT:
- Execute raw SQL or ORM queries.
- Manage database transactions.
- Contain business, pricing, or permission decisions.
- Expose persistence model shapes directly to API clients.

```go
// Example HTTP handler using standard Go 1.22+ net/http pattern
package http

import (
	"encoding/json"
	"net/http"

	"github.com/example/user/internal/app/user"
)

type UserHandler struct {
	usecase *user.Service
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, r, http.StatusBadRequest, "INVALID_JSON", "Malformed JSON request body")
		return
	}

	output, err := h.usecase.CreateUser(r.Context(), req.ToCommand())
	if err != nil {
		mapDomainErrorToHTTP(w, r, err)
		return
	}

	writeJSON(w, http.StatusCreated, ToUserResponse(output))
}
```

---

### 5. Context Propagation And Timeouts

Go's `context` package carries deadlines, cancellation signals, and request-scoped values across API boundaries. Incoming HTTP requests construct contexts, and all downstream calls MUST accept them. See [Package context](https://go.dev/pkg/context/) and [Go Blog: Context Pattern](https://go.dev/blog/context).

Rules:
- `ctx context.Context` MUST be the first parameter on all use cases, repositories, and outbound client methods.
- Never store `context.Context` inside a struct.
- Always derive explicit timeouts using `context.WithTimeout` for outbound database queries, Redis calls, and external HTTP/gRPC RPCs.

```go
func (r *UserRepository) FindByID(ctx context.Context, id user.ID) (*user.User, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var row userRow
	err := r.db.QueryRowContext(ctx, "SELECT id, email, created_at FROM users WHERE id = $1", id).Scan(&row.ID, &row.Email, &row.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("query user %s: %w", id, err)
	}
	return row.ToDomain(), nil
}
```

---

### 6. Persistence, Isolation & Transactions

Repository adapters encapsulate data access technologies (`database/sql`, `sqlc`, `pgx`, GORM). 

Minimum Persistence Invariants:
1. **Parameterized Queries**: All SQL statements MUST use query parameters (`$1`, `?`). String formatting (`fmt.Sprintf`) in SQL construction is strictly forbidden. See [Avoiding SQL injection risk](https://go.dev/doc/database/sql-injection).
2. **Transaction Isolation**: Relational database transactions MUST explicitly specify `READ COMMITTED` or higher isolation:
   ```go
   tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
   ```
3. **Audit Metadata**: Every persistent entity table MUST contain the 4 mandatory audit columns: `created_at`, `updated_at`, `created_by`, `updated_by`. See `docs/backend/database-orm.md#6-mandatory-audit-metadata`.
4. **Short Transactions**: Keep transaction boundaries short. External network I/O (HTTP calls, email dispatches) inside open database transactions is strictly prohibited.
5. **Connection Pooling**: Configure explicit `sql.DB` connection pool bounds (`SetMaxOpenConns`, `SetMaxIdleConns`, `SetConnMaxLifetime`). See [Managing connections](https://go.dev/doc/database/manage-connections).

---

### 7. Error Handling & 5-Key Envelope Translation

Go code must check and handle errors explicitly. Use `%w` wrapping to preserve error causes without exposing internal infrastructure details to clients. See [Effective Go: Errors](https://go.dev/doc/effective_go#errors) and [Go Code Review Comments: Handle Errors](https://go.dev/wiki/CodeReviewComments#handle-errors).

At the transport adapter boundary, map domain errors to the standard flat **5-key API error envelope** (`code`, `message`, `details`, `timestamp`, `request_id`). See [API Design Standard](./api-design.md#4-standard-5-key-error-envelope--diagnostics).

```go
func mapDomainErrorToHTTP(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, user.ErrNotFound):
		writeErrorEnvelope(w, r, http.StatusNotFound, "RESOURCE_NOT_FOUND", "The requested user was not found", nil)
	case errors.Is(err, user.ErrEmailConflict):
		writeErrorEnvelope(w, r, http.StatusConflict, "RESOURCE_CONFLICT", "Email address is already registered", nil)
	default:
		// Log full un-sanitized internal error server-side
		slog.ErrorContext(r.Context(), "unhandled error in HTTP handler", "error", err)
		writeErrorEnvelope(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "An internal error occurred", nil)
	}
}
```

---

### 8. Security Baseline

1. **Mass-Assignment Defense**: Decode incoming request JSON into strict DTO structs; never bind request JSON directly into ORM entities.
2. **Object-Level Authorization (BOLA/IDOR)**: Scope every protected database query by the authenticated user ID or tenant ID derived from trusted server-side auth context (`OWASP API3:2023`).
3. **Vulnerability Scanning**: Run `govulncheck ./...` in CI to detect vulnerabilities in called code paths. See [Go Vulnerability Management](https://go.dev/doc/security/vuln/).

---

### 9. Observability & `log/slog` JSON Logging

1. **Structured Logging**: Use Go 1.21+ standard library `log/slog` initialized with `slog.NewJSONHandler(os.Stdout, ...)` in production. Ad hoc `fmt.Println` or `log.Printf` statements are prohibited.
2. **Trace Context Propagation**: Propagate W3C `traceparent` headers across inbound HTTP requests, outbound HTTP/gRPC clients, and message queue publishers using OpenTelemetry Go SDK. See [W3C Trace Context](https://www.w3.org/TR/trace-context/) and [OpenTelemetry Go](https://opentelemetry.io/docs/languages/go/).

```go
// platform/logger setup using standard log/slog
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
	Level: slog.LevelInfo,
}))
slog.SetDefault(logger)
```

---

### 10. Runtime Configuration & Health Probes

Production HTTP servers must enforce explicit runtime configuration:

1. **Server Timeouts**: Set `ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`, and `IdleTimeout` on `http.Server`.
2. **Dual Health Probes**:
   - `/healthz/liveness`: Lightweight process responsiveness probe. Returns `200 OK`. MUST NOT perform database or network I/O.
   - `/healthz/readiness`: Dependency health probe. Checks database and cache connections. Returns `200 OK` when ready, or `530 Service Unavailable` / `503` when backing dependencies fail.
3. **Graceful Shutdown**: Intercept `SIGTERM` and `SIGINT`, stop accepting new connections, and invoke `http.Server.Shutdown(ctx)` with a 30-second drain period. See [`http.Server.Shutdown`](https://go.dev/pkg/net/http/#Server.Shutdown).

```go
srv := &http.Server{
	Addr:              ":8080",
	Handler:           router,
	ReadHeaderTimeout: 3 * time.Second,
	ReadTimeout:       10 * time.Second,
	WriteTimeout:      10 * time.Second,
	IdleTimeout:       60 * time.Second,
}

// Graceful SIGTERM listener
quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit

ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
if err := srv.Shutdown(ctx); err != nil {
	slog.Error("server shutdown forced", "error", err)
}
```

---

### 11. Testing Strategy

Go hexagonal applications test at explicit architectural boundaries. Every package co-locates its unit and integration test files (`*_test.go`).

#### Level 1: Domain Unit Tests (`internal/domain/user/entity_test.go`)
Pure unit tests testing business invariants, validation rules, and domain state transitions. Zero external dependencies, zero network I/O, and zero mocks.

```go
package user_test

import (
	"testing"
	"github.com/example/user/internal/domain/user"
)

func TestNewUser_Validation(t *testing.T) {
	t.Parallel()
	u, err := user.New("invalid-email", "Alice")
	if err == nil {
		t.Fatalf("expected error for invalid email, got nil")
	}
	if u != nil {
		t.Fatalf("expected nil user on error, got %v", u)
	}
}
```

#### Level 2: Application Use Case Tests (`internal/app/user/service_test.go`)
Tests business workflows using **in-memory fake adapters** that satisfy consumer-owned interfaces. No third-party mocking libraries required.

```go
package user_test

import (
	"context"
	"testing"
	"github.com/example/user/internal/app/user"
)

type memoryRepo struct {
	users map[string]*user.User
}

func (m *memoryRepo) FindByID(ctx context.Context, id user.ID) (*user.User, error) {
	u, ok := m.users[string(id)]
	if !ok {
		return nil, user.ErrNotFound
	}
	return u, nil
}

func (m *memoryRepo) Save(ctx context.Context, u *user.User) error {
	m.users[string(u.ID)] = u
	return nil
}

func TestCreateUser_UseCase(t *testing.T) {
	t.Parallel()
	repo := &memoryRepo{users: make(map[string]*user.User)}
	svc := user.NewService(repo)

	out, err := svc.CreateUser(context.Background(), user.CreateCommand{
		Email: "alice@example.com",
		Name:  "Alice",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.ID == "" {
		t.Errorf("expected non-empty user ID")
	}
}
```

#### Level 3: HTTP Adapter Transport Tests (`internal/adapters/http/user_handler_test.go`)
Tests HTTP route routing, payload parsing, validation error responses, and standard 5-key error envelope mapping using `net/http/httptest`.

```go
package http_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	
	adapterhttp "github.com/example/user/internal/adapters/http"
)

func TestCreateUserHandler_InvalidJSON(t *testing.T) {
	t.Parallel()
	handler := adapterhttp.NewUserHandler(nil)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/users", strings.NewReader(`{invalid-json`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.CreateUser(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400 Bad Request, got %d", w.Code)
	}
}
```

#### Level 4: Repository Integration Tests (`internal/adapters/postgres/user_repository_test.go`)
Integration tests verifying real SQL queries, constraints, and transactions against ephemeral test databases (using build tags `//go:build integration`).

```go
//go:build integration

package postgres_test

import (
	"context"
	"testing"
	
	"github.com/example/user/internal/adapters/postgres"
	"github.com/example/user/internal/testsupport"
)

func TestUserRepository_SaveAndFind(t *testing.T) {
	db := testsupport.OpenDB(t) // Ephemeral Postgres database pool via internal/testsupport
	repo := postgres.NewUserRepository(db)

	ctx := context.Background()
	u := sampleUser(t)

	if err := repo.Save(ctx, u); err != nil {
		t.Fatalf("failed to save user: %v", err)
	}

	found, err := repo.FindByID(ctx, u.ID)
	if err != nil {
		t.Fatalf("failed to find user: %v", err)
	}
	if found.Email != u.Email {
		t.Errorf("got email %s, want %s", found.Email, u.Email)
	}
}
```

#### Level 5: Fuzz Testing (`internal/adapters/http/user_handler_fuzz_test.go`)
Standard Go fuzz tests covering parsers, custom decoders, and request validation boundaries against arbitrary byte sequences. See [Go Fuzzing](https://go.dev/doc/security/fuzz/).

```go
package http_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	
	adapterhttp "github.com/example/user/internal/adapters/http"
)

func FuzzDecodeCreateUser(f *testing.F) {
	handler := adapterhttp.NewUserHandler(nil)
	f.Add([]byte(`{"email":"alice@example.com","full_name":"Alice"}`))
	f.Add([]byte(`{}`))
	f.Add([]byte(`invalid payload`))

	f.Fuzz(func(t *testing.T, data []byte) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/users", strings.NewReader(string(data)))
		w := httptest.NewRecorder()
		
		// Ensure handler never panics on arbitrary input
		handler.CreateUser(w, req)
	})
}
```

---

### 12. CI Build & Quality Gates

Every Go REST backend CI pipeline MUST execute:

```bash
# Clean dependencies & formatting
go mod tidy
go fmt ./...

# Unit & integration tests with race detector
go test -v ./...
go test -race ./...

# Vulnerability scanning
govulncheck ./...
```

See [Go Data Race Detector](https://go.dev/doc/articles/race_detector) and [Go Code Review Comments: Gofmt](https://go.dev/wiki/CodeReviewComments#gofmt).

---

## Evidence / References

- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture) — primary architecture source by Alistair Cockburn (2005), defining ports, adapters, and isolated core application boundaries.
- [Organizing a Go module](https://go.dev/doc/modules/layout) — official Go layout guidance for server projects, `internal/` encapsulation, and `cmd/` composition roots.
- [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments) — official Go wiki guidance for consumer-defined interfaces, error handling, `gofmt`, and package structure.
- [Go 1.22 Routing Enhancements](https://go.dev/blog/go1.22) — official Go blog detailing method matching and wildcard pattern routing in `net/http.ServeMux`.
- [Package context](https://go.dev/pkg/context/) and [Go Blog: Context Pattern](https://go.dev/blog/context) — official Go context propagation, cancellation, and deadline documentation.
- [Avoiding SQL injection risk](https://go.dev/doc/database/sql-injection), [Managing connections](https://go.dev/doc/database/manage-connections), and [Executing transactions](https://go.dev/doc/database/execute-transactions) — official Go database docs for parameterized SQL, `sql.DB` connection pool tuning, and transaction APIs (`sql.TxOptions`).
- [Go `log/slog` Package](https://pkg.go.dev/log/slog) and [Structured Logging with slog](https://go.dev/blog/slog) — official Go 1.21+ structured JSON logging package.
- [`http.Server.Shutdown`](https://go.dev/pkg/net/http/#Server.Shutdown) — official Go HTTP server graceful shutdown API docs.
- [OWASP API Security Project](https://owasp.org/www-project-api-security/) and [OWASP API Top 10 2023 release notes](https://owasp.org/API-Security/editions/2023/en/0x04-release-notes/) — OWASP API3:2023 Broken Object Property Level Authorization & mass-assignment defense guidelines.
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) — IETF standard for HTTP method semantics, status codes, and URI structures.
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457) — IETF standard for machine-readable error responses.
- [Trace Context](https://www.w3.org/TR/trace-context/) — W3C Recommendation for `traceparent` distributed tracing header propagation.
- [OpenTelemetry Go](https://opentelemetry.io/docs/languages/go/) — official OpenTelemetry documentation for Go traces and metrics instrumentation.
- [Go Vulnerability Management](https://go.dev/doc/security/vuln/), [Go Fuzzing](https://go.dev/doc/security/fuzz/), and [Go Data Race Detector](https://go.dev/doc/articles/race_detector) — official Go security, fuzzing, and race detection tooling docs.
