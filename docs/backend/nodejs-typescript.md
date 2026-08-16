# Node.js & TypeScript Backend Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-NODEJS-TS -->
## Node.js & TypeScript Backend Rules
- Enforce strict TypeScript compiler flags in `tsconfig.json`: `"strict": true`, `"strictNullChecks": true`, `"noImplicitAny": true`, `"noUncheckedIndexedAccess": true`, and `"target": "ES2022"` (or higher).
- Target ES Modules (`ESM`) natively (`"module": "NodeNext"` / `"moduleResolution": "NodeNext"`). Avoid legacy CommonJS (`require`/`module.exports`) in new codebases.
- Never block the Node.js event loop with synchronous CPU-bound operations (`fs.readFileSync`, synchronous crypto hashing, or large array loops on the main thread). Use Worker Threads or offload heavy computation.
- Validate ALL external inputs (HTTP body, query parameters, path variables, environment variables) at application boundaries using schema validation libraries (e.g. Zod or Valibot).
- Use `AsyncLocalStorage` (`node:async_hooks`) in HTTP middleware to propagate request-scoped context (`request_id`, `trace_id`, authenticated `user_id`) across async call stacks without manual parameter drilling.
- Handle process-level unhandled rejections (`process.on('unhandledRejection')`) and uncaught exceptions (`process.on('uncaughtException')`) by logging structured JSON errors and performing graceful process exits (`process.exit(1)`).
- Custom application errors MUST extend the native `Error` class and define explicit error codes, HTTP status codes, and user-safe error messages.
<!-- END AGENT-STANDARD: BACKEND-NODEJS-TS -->
```

---

## Detailed Human Guide & Rationale

### 1. TypeScript Compiler Configuration (`tsconfig.json`)

TypeScript provides compile-time safety only when strict type-checking flags are enabled. Loose TypeScript configurations introduce runtime `TypeError: Cannot read properties of undefined` crashes.

#### Mandatory Compiler Flags
Production Node.js backends MUST enforce these non-negotiable compiler flags:

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
    "skipLibCheck": true
  }
}
```

* **`noUncheckedIndexedAccess`**: Treats array and dictionary index access as `T | undefined`, forcing developers to handle missing array items safely before dereferencing.
* **`strictNullChecks`**: Prevents `null` or `undefined` from being assigned to non-nullable types.

---

### 2. Node.js Event Loop Hygiene & Process Lifecycle

Node.js executes application code on a single-threaded event loop. Blocking the main event loop starves all concurrent requests, causing severe latency spikes.

#### Avoiding Event Loop Blockers
1. **No Synchronous File/Crypto Operations**: Use `node:fs/promises` instead of `fs.readFileSync`. Use async crypto (`node:crypto` `pbkdf2`/`randomBytes` callbacks or promises) instead of sync methods.
2. **Offload Heavy CPU Computation**: If a task requires heavy CPU operations (image processing, PDF parsing, large matrix math), delegate the execution to Node.js `WorkerThreads` (`node:worker_threads`) or a dedicated background task worker pool.

#### Process Exception Handling
Unhandled promise rejections and uncaught exceptions leave the process in an indeterminate state and must trigger a controlled process exit.

```typescript
// ✅ CORRECT: Log structured error and perform controlled shutdown
process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal('Unhandled Promise Rejection', {
    error: reason instanceof Error ? reason.stack : String(reason),
  });
  // Perform graceful connection cleanup before exit
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  logger.fatal('Uncaught Exception', { error: error.stack });
  process.exit(1);
});
```

---

### 3. Boundary Schema Validation (Zod)

Never trust external input. Validate all incoming HTTP request bodies, query strings, URL parameters, and environment variables at the edge boundary using type-safe schemas.

```typescript
import { z } from 'zod';

// Environment Variable Schema Validation on startup
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);

// Request Payload Schema Validation
export const createProductSchema = z.object({
  name: z.string().min(2).max(100),
  price_cents: z.number().int().positive(),
  category: z.enum(['electronics', 'apparel', 'books']),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
```

---

### 4. Request Context Propagation via `AsyncLocalStorage`

Instead of manually passing `request_id`, `trace_id`, or `user_id` as arguments through every internal function and database repository layer, use Node.js native `AsyncLocalStorage`.

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestStore {
  requestId: string;
  traceId: string;
  userId?: string;
}

export const requestStore = new AsyncLocalStorage<RequestStore>();

// Express / Fastify Middleware
export function requestContextMiddleware(req: any, res: any, next: () => void) {
  const store: RequestStore = {
    requestId: (req.headers['x-request-id'] as string) || crypto.randomUUID(),
    traceId: (req.headers['traceparent'] as string) || crypto.randomUUID(),
  };

  requestStore.run(store, () => {
    next();
  });
}

// Deep inside a service or logger helper:
export function getLogContext() {
  const store = requestStore.getStore();
  return {
    request_id: store?.requestId ?? 'unknown',
    trace_id: store?.traceId ?? 'unknown',
  };
}
```

---

### 5. Domain Exception Hierarchy

Custom application errors must extend the native JavaScript `Error` class and define structured attributes for HTTP status code mapping and machine-readable error codes.

```typescript
export class ApplicationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(entity: string, id: string) {
    super(`${entity} with id '${id}' was not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
```
