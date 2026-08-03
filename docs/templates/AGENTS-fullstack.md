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

---

# Detailed Human Guide & Technical Rationale

This guide expands on the checklist above with deep architectural rationale and implementation code patterns for engineering teams building high-reliability fullstack software.

## Pillar 1: Monorepo & Workspace Architecture

### Preventing Server Code and Secret Leakage
In modern fullstack applications (e.g., Next.js, Remix, SvelteKit, or monorepos containing shared packages), accidental client imports of server-side modules can expose private environment variables or bundle heavy server libraries (like ORMs or database drivers) into browser assets.

#### Recommended Monorepo Layout (`pnpm-workspaces` or `Turborepo`)
```
packages/
├── shared-schemas/   # Shared Zod / Valibot schemas (isomorphic)
├── api-client/       # Generated / typed fetch SDK for client browser
├── server/           # Server-only utilities, DB clients, secrets
└── types/            # Pure TypeScript interface contracts
apps/
├── web/              # Frontend UI / SSR app (React / Next.js)
└── api/              # Backend API microservices (FastAPI / Node / Go)
```

#### Enforcing Module Seams with `server-only`
In client-facing packages or SSR frameworks, import the `server-only` package at the top of any database client or secret configuration module. If an attempt is made to import the module into a client bundle, the build engine immediately throws a compilation error:

```typescript
// packages/server/src/db.ts
import 'server-only';
import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();
```

---

## Pillar 2: End-to-End Type Safety & API Contracts

### Single Source of Truth Validation Schemas
Avoid duplicating data shapes between server request validators and client forms. Define schemas once using Zod/Valibot in a shared package (`packages/shared-schemas`), and infer both backend DTOs and frontend form types directly from the schema.

```typescript
// packages/shared-schemas/src/user.ts
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

#### Backend Handler Consumption
```typescript
// apps/api/src/routes/users.ts
import { CreateUserSchema } from '@project/shared-schemas';

app.post('/api/v1/users', async (req, res) => {
  const parseResult = CreateUserSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request payload',
      details: parseResult.error.flatten(),
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'],
    });
  }
  // Safe, typed domain service invocation
  const user = await userService.createUser(parseResult.data);
  return res.status(201).json(user);
});
```

---

## Pillar 3: SSR / Hydration & State Synchronization

### Decoupling Async Server Data from Component State
A common antipattern in fullstack applications is fetching data during server rendering or in `useEffect`, and copying the result directly into local component `useState`. This leads to hydration mismatches, stale UI views, and race conditions upon mutation.

#### Incorrect (State Duplication Antipattern)
```tsx
// ❌ BAD: Copying server prop into local useState causes stale state after mutations
function UserProfile({ initialUser }: { initialUser: User }) {
  const [user, setUser] = useState(initialUser); // Stale state risk!
  return <div>{user.name}</div>;
}
```

#### Correct (Hydrating Async Query Cache)
```tsx
// ✅ GOOD: Hydrate initial server data directly into TanStack Query cache
function UserProfile({ userId, initialUser }: { userId: string; initialUser: User }) {
  const { data: user } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => fetchUser(userId),
    initialData: initialUser,
  });

  return <div>{user.name}</div>;
}
```

### Idempotency Keys for Non-Idempotent Mutations
Mutations such as payment submissions or order creation must be protected against duplicate execution on network retry. Generate a client-side UUID per submission attempt and pass it as a header:

```typescript
// packages/api-client/src/orders.ts
export async function createOrder(payload: CreateOrderInput): Promise<Order> {
  const idempotencyKey = crypto.randomUUID();
  return apiFetch('/api/v1/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  });
}
```

---

## Pillar 4: Fullstack Auth Session Propagation & Security

### Cookie-Based Session Hygiene
Browser storage mechanisms like `localStorage` and `sessionStorage` are vulnerable to Cross-Site Scripting (XSS) attacks. If an attacker injects malicious JavaScript via a dependency or third-party script, tokens stored in `localStorage` can be exfiltrated instantly.

#### Session Cookie Headers (Set-Cookie)
```http
Set-Cookie: session_token=secret_jwt_payload; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=86400
```

#### Anti-CSRF Double-Submit Cookie Pattern
For cross-boundary state mutations (POST/PUT/DELETE), require a non-HTTP-only CSRF token passed in a custom header (e.g. `X-CSRF-Token`) matching a cryptographically signed cookie:

```typescript
// apps/api/src/middleware/csrf.ts
export function verifyCsrfToken(req: Request, res: Response, next: NextFunction) {
  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies['csrf_token'];

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({
      code: 'CSRF_INVALID',
      message: 'CSRF token validation failed',
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'],
    });
  }
  next();
}
```

#### BOLA Prevention — Scope Queries by Authenticated Identity
```typescript
// ❌ BAD: Trusting client-supplied ID
app.get('/api/v1/orders/:orderId', async (req, res) => {
  const order = await db.order.findUnique({ where: { id: req.params.orderId } });
  return res.json(order); // Returns any user's order!
});

// ✅ GOOD: Scope by authenticated user from token context
app.get('/api/v1/orders/:orderId', authenticate, async (req, res) => {
  const order = await db.order.findFirst({
    where: { id: req.params.orderId, userId: req.user.id },
  });
  if (!order) return res.status(404).json({ code: 'NOT_FOUND' });
  return res.json(order);
});
```

---

## Pillar 5: End-to-End (E2E) Testing & QA Pipelines

### Full Flow Integration with Playwright
E2E testing validates that the frontend UI, API transport layer, domain services, database ORM, and database engine operate seamlessly together.

```typescript
// e2e/tests/user-registration.spec.ts
import { test, expect } from '@playwright/test';

test('completes full user registration flow', async ({ page }) => {
  const testEmail = `user-${Date.now()}@example.com`;

  await page.goto('/register');
  await page.getByLabel('Email').fill(testEmail);
  await page.getByLabel('Full Name').fill('Jane Doe');
  await page.getByRole('button', { name: 'Create Account' }).click();

  // Assert successful DB mutation and UI hydration
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText(testEmail)).toBeVisible();
});
```

### Auth State Reuse with `storageState`
Avoid repeating the login UI flow for every authenticated test. Save authenticated browser state once and reuse it:

```typescript
// e2e/global-setup.ts
import { chromium } from '@playwright/test';

export default async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
  await browser.close();
}
```

---

## Pillar 6: Telemetry & Distributed Trace Propagation

### Header Context Injection in HTTP Clients
To trace a request from a user button click down to database queries, the frontend fetch wrapper must generate or propagate standard W3C `traceparent` headers.

```typescript
// packages/api-client/src/fetch-wrapper.ts
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const traceId = crypto.randomUUID().replace(/-/g, '');
  const spanId = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  const traceparent = `00-${traceId}-${spanId}-01`;

  const headers = new Headers(options.headers);
  headers.set('traceparent', traceparent);
  headers.set('x-correlation-id', traceId);

  return fetch(url, { ...options, headers });
}
```

### OpenTelemetry SDK Setup (Node.js server)
```typescript
// apps/api/src/instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }),
});
sdk.start();
```

---

## Pillar 7: Build, Migration & Deployment Orchestration

### Expand-Migrate-Contract Database Strategy
When deploying fullstack updates in zero-downtime environments, schema migrations MUST run before code deployment and MUST be backward-compatible with running pods.

```
Step 1 (Expand): Add new column as nullable in DB migration -> Deploy Migration.
Step 2 (Migrate): Deploy new fullstack app code writing to both old and new columns.
Step 3 (Contract): After 100% pod rollout, backfill data and drop old column in a subsequent release.
```

### Graceful Shutdown Handler
```typescript
// apps/api/src/server.ts
process.on('SIGTERM', async () => {
  server.close(async () => {
    await db.$disconnect();
    await redis.quit();
    process.exit(0);
  });
  // Force exit if drain exceeds 30s
  setTimeout(() => process.exit(1), 30_000);
});
```

---

## Pillar 8: Code Quality, Maintainability & Documentation

### SOLID at the Fullstack Boundary
Shared packages should expose interfaces, not concrete implementations, so server and client consumers can swap implementations without changing the contract:

```typescript
// packages/types/src/repositories.ts
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
}

// apps/api/src/repositories/prisma-user.repository.ts
import 'server-only';
import { UserRepository } from '@project/types';

export class PrismaUserRepository implements UserRepository {
  async findById(id: string) { return db.user.findUnique({ where: { id } }); }
  async create(input: CreateUserInput) { return db.user.create({ data: input }); }
}
```

### Guard Clauses in Server Handlers
```typescript
// ❌ BAD: Deeply nested, hard to reason about
app.post('/api/v1/checkout', async (req, res) => {
  if (req.user) {
    if (req.body.items?.length > 0) {
      if (await cartService.isValid(req.body)) {
        // ... actual logic buried 3 levels deep
      }
    }
  }
});

// ✅ GOOD: Guard clauses, flat logic
app.post('/api/v1/checkout', authenticate, async (req, res) => {
  if (!req.body.items?.length) return res.status(400).json({ code: 'EMPTY_CART' });
  const isValid = await cartService.isValid(req.body);
  if (!isValid) return res.status(422).json({ code: 'INVALID_CART' });
  // ... actual logic at the top level
});
```
