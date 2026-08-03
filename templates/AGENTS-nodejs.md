# Node.js & TypeScript Agent Rules (`AGENTS-nodejs.md`)

> **To use:** copy the full content of `AGENTS-backend.md` into your project's `AGENTS.md`, then append the content of this file below it. The combined file becomes your project's `AGENTS.md`.
> Node.js & TypeScript specific rules. Extends the universal backend baseline — all rules in `AGENTS-backend.md` remain in force. This file adds only Node.js/TypeScript-specific invariants.

<!-- AI-COPY-BLOCK
NON-NEGOTIABLE NODE.JS & TYPESCRIPT RULES (enforce every PR, in addition to AGENTS-backend.md):
1. TypeScript strictness: tsconfig "strict: true", "noUncheckedIndexedAccess: true"; ban "any" type (use unknown with Zod runtime validation); ban @ts-ignore (use @ts-expect-error with mandatory explanatory comment); explicit return types on public functions; discriminated unions (type: 'success' | 'error') with exhaustive never-type checks for state machines and multi-variant responses.
2. Module & runtime: Pure ESM ("type": "module", "moduleResolution": "NodeNext"); for tsup/esbuild application builds use "Bundler" moduleResolution (not for distributed libraries); Node.js 24 LTS (Active LTS) minimum; mandatory "node:" protocol specifiers for built-ins (e.g., import fs from 'node:fs'); exact dependency versions in package.json.
3. Async & event loop: AsyncLocalStorage for request-scoped trace IDs and logger context; no unhandled promise rejections or floating promises (always await or void explicitly); unthrottled Promise.all prohibited on unbounded dynamic lists (use p-limit/allSettled); offload CPU-bound tasks to worker threads (node:worker_threads) or external background job queues.
4. Framework & router: Schema-driven request validation via Zod or TypeBox at route boundaries; Fastify preferred (or Express with explicit async error handling wrappers); strict payload parsing rejection for undeclared fields.
5. Error & logging: Custom AppError base class with isOperational flag and HTTP status; process handlers for uncaughtException and unhandledRejection triggering graceful shutdown; Pino structured JSON logging auto-bound to AsyncLocalStorage trace IDs with automatic PII redaction.
6. Testing, linting & tooling: Vitest (or node:test) for unit and integration tests; fastify.inject() preferred for Fastify API testing, supertest for Express; tsx dev-only (native type-stripping stable on Node 24 baseline); no TypeScript runtime wrappers in production (compile with tsc for type-checked output or tsup/esbuild paired with tsc --noEmit); tsc --noEmit for typecheck in CI; ESLint typescript-eslint v8+ strict mode (eslint --max-warnings 0) in CI.
-->

<!-- START AGENT-STANDARD: NODEJS-TYPESCRIPT -->

## 1. TypeScript Strictness & Type Safety

- [ ] **Strict Compiler Mode**: `tsconfig.json` MUST enable `"strict": true` and `"noUncheckedIndexedAccess": true`. Compiler flags MUST NOT disable strict flags (`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`) anywhere in the codebase.
- [ ] **Ban on `any` Type**: Usage of `any` is strictly prohibited. Use `unknown` for unchecked inputs and validate them at boundary layers using runtime schema validators (e.g. Zod, TypeBox). Generic parameter default values MUST NOT fallback to `any`.
- [ ] **Ban on `@ts-ignore`**: `@ts-ignore` directives are strictly banned. If third-party type definitions are incomplete, use `@ts-expect-error` accompanied by a mandatory inline explanatory comment citing why the bypass is necessary.
- [ ] **Explicit Return & Contract Types**: All exported service functions, API handlers, and public interface methods MUST specify explicit return type annotations. Relying on implicit return type inference for public module signatures is forbidden.
- [ ] **Discriminated Unions for State Models**: Complex state machines, domain events, and multi-variant API responses MUST be modeled using TypeScript discriminated unions (`type: 'success' | 'error'`) with exhaustive pattern matching (`never` type checks).

## 2. Module System & Node.js Runtime Baseline

- [ ] **Pure ESM Standard**: Projects MUST configure `"type": "module"` in `package.json` with `"moduleResolution": "NodeNext"` in `tsconfig.json` (`Node16` is a deprecated alias and MUST NOT be used). File imports inside source code MUST include explicit file extensions (`.js`). Exception: if building an **application** (not a distributed library) with `tsup`/`esbuild`, `"Bundler"` moduleResolution is recommended — the bundler handles extension resolution and `.js` extensions are not required in imports. For libraries distributed as ESM packages, keep `NodeNext` for maximum runtime compatibility.
- [ ] **Node.js 24 LTS Minimum**: Target Node.js 24 LTS (Active LTS) or higher. Use modern built-in APIs (`node:fetch`, `node:test`, `node:crypto`, `AsyncLocalStorage`) rather than legacy npm wrapper packages where native support exists.
- [ ] **Mandatory `node:` Specifiers**: Core Node.js module imports MUST use the explicit `node:` protocol prefix (e.g., `import fs from 'node:fs'`, `import path from 'node:path'`, `import { AsyncLocalStorage } from 'node:async_hooks'`). Unprefixed imports of core modules are banned.
- [ ] **Package Lock & Dependency Pinning**: `package-lock.json` or `pnpm-lock.yaml` MUST be committed to version control. Production dependencies MUST use exact or strict semver ranges without loose wildcard matching.

## 3. Async Execution & Event Loop Hygiene

- [ ] **Context Propagation via `AsyncLocalStorage`**: Cross-cutting request context (`trace_id`, `tenant_id`, `user_id`) MUST be stored in `AsyncLocalStorage` (ALS) at the HTTP ingress layer. Services and loggers MUST retrieve context directly from ALS rather than passing context parameters through every domain function signature.
- [ ] **No Floating Promises**: All promises MUST be explicitly handled. Every promise returned from a function MUST be `await`ed, returned, or explicitly marked as intentionally unawaited with the `void` operator (e.g., `void fireAndForgetTask()`).
- [ ] **Safe Parallel Execution**: Do NOT use unthrottled `Promise.all` on unbounded dynamic lists (e.g., processing array items from DB or network). Use `Promise.allSettled` or concurrency limiters (e.g., `p-limit`) to bound concurrent async operations.
- [ ] **Event Loop Protection**: CPU-bound operations (heavy JSON processing, encryption/hashing, image transformation) MUST NOT block the main Node.js event loop. Offload CPU-bound workloads to worker threads (`node:worker_threads`) or external background job queues.

## 4. HTTP Framework & Router Patterns

- [ ] **Schema-Driven Route Boundaries**: Transport layer handlers MUST validate incoming `req.params`, `req.query`, and `req.body` using Zod or TypeBox schemas before delegating to service layers. Unrecognized payload properties MUST be stripped or rejected with `400 Bad Request`.
- [ ] **Framework Selection & Async Safety**: Fastify is preferred for new services due to native JSON schema validation and performance. If Express is used, handlers MUST be wrapped in async error handlers (e.g., `express-async-errors` or custom wrapper) to prevent unhandled promise rejections from leaking.
- [ ] **Graceful Connection Draining**: HTTP server instances MUST listen for `SIGTERM`/`SIGINT` signals, stop accepting new connections, call `server.close()`, and drain active HTTP requests within a 30-second window before terminating.

## 5. Error Handling, Logging & Operational Safety

- [ ] **Structured Operational Error Hierarchy**: Custom errors MUST extend a central `AppError` base class containing `statusCode`, `code` (string identifier), `details`, and an `isOperational: boolean` flag distinguishing known operational failures from unhandled programmer errors.
- [ ] **Process Level Safety Handlers**: Global process event handlers (`process.on('uncaughtException')` and `process.on('unhandledRejection')`) MUST log the full error stack in structured JSON and initiate a graceful process shutdown with exit code `1`. Never swallow uncaught exceptions without crashing.
- [ ] **Pino Structured JSON Logging**: All application logs MUST use Pino configured for structured JSON output. Loggers MUST automatically inject `trace_id` from `AsyncLocalStorage` context into every log entry.
- [ ] **Automatic Log Redaction**: Loggers MUST configure explicit redaction paths for sensitive keys (`password`, `token`, `authorization`, `cookie`, `secret`, `credit_card`) to prevent PII and credentials from being written to log streams.

## 6. Testing, Linting & Tooling Baseline

- [ ] **Vitest Test Runner**: Vitest (or native `node:test`) MUST be used as the standard test runner for fast unit and integration testing. Tests MUST run under ESM mode natively without transpilation hacks.
- [ ] **API Endpoint Integration Testing**: Endpoint tests MUST exercise full HTTP request-response cycles against test databases initialized with ephemeral fixtures. Prefer `fastify.inject()` for Fastify projects (in-process, no real HTTP server required); use `supertest` for Express-based services or when testing real HTTP behavior across process boundaries.
- [ ] **TypeScript Execution Tooling**: Use `tsx` for local development and script execution (`npx tsx src/index.ts`); `tsx` is dev-only and MUST NOT run production servers. Native Node.js type-stripping: behind `--experimental-strip-types` flag from Node 22.6+; enabled by default (no flag) from Node 22.18+; fully stable from Node 23.6+ and Node 24+. For full `tsconfig` compatibility, monorepo support, and enum/decorator support, `tsx` remains recommended over native stripping. For production, compile to JavaScript with `tsc` (type-checks + emits) or `tsup`/`esbuild` (fast emit, no type-checking — must be paired with `tsc --noEmit`); never run production with `ts-node`, `tsx`, or `@swc-node/register`.
- [ ] **Typecheck Gate in CI**: CI pipelines MUST run `tsc --noEmit` as a non-optional pre-build step to verify type soundness across the entire workspace.
- [ ] **ESLint & Type-Aware Lint Gate**: Projects MUST configure ESLint with `typescript-eslint` (v8+, ESLint v9 flat config) in strict mode. Rules `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-floating-promises`, and `@typescript-eslint/explicit-function-return-type` MUST be enabled as errors. CI MUST run `eslint --max-warnings 0` as a pre-test step.

<!-- END AGENT-STANDARD: NODEJS-TYPESCRIPT -->
