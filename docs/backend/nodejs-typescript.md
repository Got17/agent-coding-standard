# Node.js & TypeScript Backend Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-NODEJS-TS -->
## Node.js & TypeScript Backend Rules
- Enforce strict TypeScript compiler flags in `tsconfig.json`: `"strict": true`, `"strictNullChecks": true`, `"noImplicitAny": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, and `"target": "ES2022"` (or higher).
- Target ES Modules (`ESM`) natively (`"type": "module"` in `package.json`). Relative imports MUST include explicit `.js` extensions (`import { foo } from './foo.js'`). Legacy CommonJS (`require`/`module.exports`) is strictly prohibited in new codebases.
- Manage dependencies deterministically using `pnpm`, `npm`, or `yarn` with lockfiles (`pnpm-lock.yaml` / `package-lock.json`). CI pipelines MUST run `pnpm install --frozen-lockfile` or `npm ci`.
- Never block the Node.js event loop with synchronous CPU-bound or I/O operations (`fs.readFileSync`, synchronous crypto hashing, or large blocking loops). Offload CPU-heavy computation to Worker Threads (`node:worker_threads`).
- Validate ALL incoming external inputs (HTTP bodies, query parameters, path variables, headers, env vars) at boundary endpoints using Zod with strict property rejection (`z.object({...}).strict()`) to prevent OWASP API3:2023 mass assignment vulnerabilities.
- Use `AsyncLocalStorage` (`node:async_hooks`) in HTTP middleware to propagate request-scoped correlation context (`request_id`, `trace_id`, authenticated `user_id`) across async call chains without manual parameter drilling.
- Custom application errors MUST extend native `Error` (`ApplicationError`) and map to the standard flat 5-key API error envelope (`code`, `message`, `details`, `timestamp`, `request_id`) at transport boundaries (see `docs/backend/api-design.md#4-standard-5-key-error-envelope--diagnostics`).
- Handle process signals (`SIGTERM`, `SIGINT`), `uncaughtException`, and `unhandledRejection` gracefully. Stop receiving new traffic, drain active HTTP connections within a 30s window, release database pools, log structured errors, and exit with `process.exit(1)`.
- CI pipelines MUST execute `tsc --noEmit`, linters, unit/integration tests with Vitest/Jest (`--run`), and lockfile integrity checks.
<!-- END AGENT-STANDARD: BACKEND-NODEJS-TS -->
```

---

## Detailed Human Guide & Rationale

### 1. TypeScript Compiler Configuration (`tsconfig.json`) & ESM Resolution

TypeScript provides compile-time type safety only when strict compiler flags are enabled. Loose configurations allow `any` types and unsafe array index access, leading to runtime `TypeError: Cannot read properties of undefined` crashes.

#### Mandatory Compiler Flags

Production Node.js backends MUST enforce the following `tsconfig.json` configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "isolatedModules": true
  }
}
```

- **`noUncheckedIndexedAccess`**: Treats array and dictionary index access as `T | undefined`, forcing developers to check for missing items before property dereferencing.
- **`exactOptionalPropertyTypes`**: Disallows assigning `undefined` to an optional property unless explicitly typed as `string | undefined`.
- **`moduleResolution: NodeNext`**: Enforces native ES Module resolution rules in Node.js.

#### Native ES Modules (`ESM`) Rules
1. `package.json` MUST contain `"type": "module"`.
2. All relative module imports in TypeScript code MUST include the compiled `.js` extension:
   ```typescript
   // ✅ CORRECT: Explicit .js extension for NodeNext ESM resolution
   import { userService } from './services/user.service.js';
   import type { User } from './types/user.types.js';

   // ❌ WRONG: Missing extension causes ERR_MODULE_NOT_FOUND at runtime in ESM
   import { userService } from './services/user.service';
   ```
3. Deterministic Builds: CI pipelines MUST enforce lockfiles (`pnpm-lock.yaml` / `package-lock.json`) via `pnpm install --frozen-lockfile` or `npm ci`.

---

### 2. Node.js Event Loop Hygiene & Graceful Process Lifecycle

Node.js executes application code on a single-threaded event loop. Blocking the main event loop starves concurrent requests and causes severe latency spikes.

#### Avoiding Event Loop Blockers
1. **No Synchronous File/Crypto Operations**: Use `node:fs/promises` instead of `fs.readFileSync`. Use async crypto (`node:crypto` `pbkdf2`/`randomBytes` promises) instead of sync methods.
2. **Offload Heavy CPU Computation**: Delegate CPU-bound tasks (image processing, PDF generation, cryptographic hashing) to Worker Threads (`node:worker_threads`) or dedicated background queue workers.

#### Graceful Process Shutdown & Exception Handling
Unhandled exceptions and promise rejections leave the application process in an unstable state and must trigger structured logging, resource cleanup, and a controlled process exit.

```typescript
import { createServer, Server } from 'node:http';
import { logger } from './logger.js';
import { dbPool } from './db.js';

const server: Server = createServer(app);

// Graceful SIGTERM / SIGINT shutdown listener
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new HTTP connections & drain active requests
  server.close(async () => {
    logger.info('HTTP server closed. Draining database connection pool...');
    try {
      await dbPool.end();
      logger.info('Database pool drained successfully.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during DB pool shutdown', { error: err });
      process.exit(1);
    }
  });

  // Force exit if connections fail to drain within 30 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timed out after 30s. Forcing exit.');
    process.exit(1);
  }, 30_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal('Unhandled Promise Rejection', {
    error: reason instanceof Error ? reason.stack : String(reason),
  });
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error: Error) => {
  logger.fatal('Uncaught Exception', { error: error.stack });
  shutdown('uncaughtException');
});
```

---

### 3. Boundary Schema Validation & Mass-Assignment Defense (Zod)

Validate all incoming request bodies, query parameters, URL path variables, headers, and environment variables at transport boundaries.

#### OWASP API3:2023 Protection (`z.object({...}).strict()`)
To prevent clients from injecting undeclared properties (e.g. `role: "admin"` or `is_verified: true`), schemas MUST enforce strict property rejection via `.strict()` or `.strip()`.

```typescript
import { z } from 'zod';

// Environment variable schema validation at application startup
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().url(),
}).strict();

export const env = envSchema.parse(process.env);

// Request Payload Schema: Strict rejection of unexpected properties
export const createProductSchema = z.object({
  name: z.string().min(2).max(100),
  price_cents: z.number().int().positive(),
  category: z.enum(['electronics', 'apparel', 'books']),
}).strict(); // Rejects undeclared keys with 400 Bad Request

export type CreateProductInput = z.infer<typeof createProductSchema>;
```

---

### 4. Request Context Propagation via `AsyncLocalStorage`

To avoid parameter-drilling `request_id` or `trace_id` through every service, repository, and helper function, use Node.js native `AsyncLocalStorage` (`node:async_hooks`).

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface RequestStore {
  requestId: string;
  traceId: string;
  userId?: string;
}

export const requestStore = new AsyncLocalStorage<RequestStore>();

// HTTP Middleware for request context & W3C traceparent propagation
export function requestContextMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
): void {
  const incomingTrace = req.headers['traceparent'];
  // Parse W3C traceparent: version-trace_id-parent_id-flags
  let traceId = randomUUID().replace(/-/g, '');
  if (typeof incomingTrace === 'string' && incomingTrace.startsWith('00-')) {
    const parts = incomingTrace.split('-');
    if (parts[1] && parts[1].length === 32) {
      traceId = parts[1];
    }
  }

  const store: RequestStore = {
    requestId: (req.headers['x-request-id'] as string) || randomUUID(),
    traceId,
  };

  requestStore.run(store, () => {
    next();
  });
}

// Access current request context anywhere in async call stack
export function getLogContext(): Record<string, string> {
  const store = requestStore.getStore();
  return {
    request_id: store?.requestId ?? 'unknown',
    trace_id: store?.traceId ?? 'unknown',
  };
}
```

---

### 5. Domain Exception Hierarchy & 5-Key API Error Envelope

Custom application errors MUST extend native JavaScript `Error` and map to the standard flat **5-key API error envelope** (`code`, `message`, `details`, `timestamp`, `request_id`). See [API Design Standard](./api-design.md#4-standard-5-key-error-envelope--diagnostics).

```typescript
// Custom Application Error Base Class
export class ApplicationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown[];

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details: unknown[] = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(entity: string, id: string) {
    super(`${entity} with id '${id}' was not found`, 404, 'RESOURCE_NOT_FOUND');
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details: unknown[] = []) {
    super(message, 400, 'VALIDATION_FAILED', details);
  }
}

// Global HTTP Error Handler Middleware
export function errorHandlerMiddleware(err: Error, req: any, res: any, next: any): void {
  const context = getLogContext();
  const timestamp = new Date().toISOString();

  if (err instanceof ApplicationError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details,
      timestamp,
      request_id: context.request_id,
    });
    return;
  }

  // Unhandled internal server error
  logger.error('Unhandled internal server error', { error: err.stack, ...context });
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred on the server.',
    details: [],
    timestamp,
    request_id: context.request_id,
  });
}
```

---

### 6. Testing & Quality Assurance Baseline

Node.js backends MUST use modern test runners (Vitest or Jest) with native ESM support. Unit tests for async services MUST ensure `AsyncLocalStorage` context isolation across concurrent test cases.

```typescript
// services/product.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ProductService } from './product.service.js';

describe('ProductService', () => {
  it('should return product when valid ID is provided', async () => {
    const mockRepo = { findById: vi.fn().mockResolvedValue({ id: 'prod_1', name: 'Widget' }) };
    const service = new ProductService(mockRepo as any);

    const result = await service.getProduct('prod_1');
    expect(result.name).toBe('Widget');
    expect(mockRepo.findById).toHaveBeenCalledWith('prod_1');
  });
});
```

---

## Evidence / References

- [TypeScript Compiler Options Reference](https://www.typescriptlang.org/tsconfig): Official TypeScript documentation for `strict`, `strictNullChecks`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `NodeNext` module resolution.
- [Node.js Event Loop & Asynchronous I/O Guide](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick): Official Node.js guide detailing event loop phases, non-blocking I/O, and thread starvation prevention.
- [Node.js `AsyncLocalStorage` API (`node:async_hooks`)](https://nodejs.org/api/async_context.html): Official Node.js documentation for execution context propagation across asynchronous call chains.
- [Node.js Worker Threads (`node:worker_threads`)](https://nodejs.org/api/worker_threads.html): Official Node.js documentation for multi-threaded parallel execution of CPU-bound tasks.
- [Node.js ECMAScript Modules (`ESM`)](https://nodejs.org/api/esm.html): Official spec for native ES Modules, `"type": "module"`, and mandatory `.js` relative path resolution.
- [Node.js Process Signals & Exception Handling](https://nodejs.org/api/process.html): Official documentation for `SIGTERM`/`SIGINT` handling, `uncaughtException`, and `unhandledRejection`.
- [Zod Schema Validation](https://zod.dev/): Official Zod documentation for schema parsing, `.strict()` property rejection, and TypeScript type inference.
- [OWASP API Security Top 10 2023 — API3:2023](https://owasp.org/www-project-api-security/): OWASP API3:2023 Broken Object Property Level Authorization & mass assignment defense guidelines.
- [W3C Trace Context Recommendation](https://www.w3.org/TR/trace-context/): Standard for `traceparent` headers and distributed request ID correlation.
- [Vitest Testing Framework](https://vitest.dev/): Native ESM-first unit and integration testing documentation for Node.js and TypeScript.
