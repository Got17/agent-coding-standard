# Domain Context & Glossary

## Glossary

- **Standard**: A documented set of production-grade architectural rules, coding practices, and deployment guidelines for software projects.
- **Agent Rule / Prompt**: Machine-readable guidelines and context files designed to be consumed by AI coding agents (e.g., Antigravity, Claude Code, Codex).
- **Agent Template (AGENTS.md)**: A copy-pasteable, self-contained rule block designed to be copied directly into target projects' `AGENTS.md` file so an AI agent immediately adheres to the team's standards.
- **Documentation Site**: Web portal generated from Markdown files serving human developers.

## Architectural Decisions Log

- **Doc Engine**: Markdown-based files rendered into a static site (VitePress/Starlight) while maintaining raw machine-readable structures for AI agents.
- **Primary Audience**: Human developers and AI coding agents.
- **Distribution Model**: Dual format per standard — Human-readable documentation + Portable `AGENTS.md` prompt blocks for instant project copying.
- **Repository Structure**: Option A — Separated `docs/` (for static site & human reading) and `templates/` (for copy-pasteable `AGENTS.md` files).
- **Doc Engine**: VitePress configured in `docs/.vitepress/config.mjs` and synced at root (`.vitepress/config.mjs`) serving `docs/`.
- **AGENTS Templates Web Routes**: Standardized in `docs/templates/` with web links updated in `docs/templates-index.md`.
- **AGENTS-backend Scope**: Language-agnostic universal production baseline for backend services, extended by framework/language-specific templates.
- **AGENTS-backend Pillars**: Strictly universal invariants across 6 pillars: (1) Architecture & Layering, (2) Security & Auth Baseline, (3) Data & Persistence, (4) Observability & Telemetry, (5) Resilience & Traffic Control, (6) Testing & QA.
- **AGENTS-backend API Invariants**: Unified 5-key error JSON envelope (`code`, `message`, `details`, `timestamp`, `request_id`) and Zero-Trust boundary input validation (rejecting unexpected fields with 400 Bad Request).
- **AGENTS-backend Database Safety**: Strict Expand-Migrate-Contract zero-downtime migrations, parameterized SQL only, N+1 query ban with statement timeouts, zero network I/O inside DB transactions, and mandatory 4-key audit metadata (`created_at`, `updated_at`, `created_by`, `updated_by`).
- **AGENTS-backend Operations & Testing**: Structured JSON logging with trace/correlation ID context, automatic PII masking, dual health probes (`/healthz/liveness`, `/healthz/readiness`), explicit network timeouts, graceful SIGTERM shutdown with 30s drain, containerized integration tests, and CI contract diff checks.
- **AGENTS-backend Code Quality & Documentation**: Mandatory 7th pillar adding SOLID, pragmatic DRY, YAGNI/KISS simplicity, guard clauses (early exits), intent-based comments (why not what), and docstring/contract synchronization.
- **AGENTS-frontend Scope**: Universal production baseline for frontend web applications, extended by framework/meta-framework templates (e.g., AGENTS-nextjs.md).
- **AGENTS-frontend Pillars**: 7 core pillars: (1) Component Architecture & Layering, (2) State Management & Data Fetching, (3) Web Performance & Core Web Vitals, (4) Security & Auth Baseline, (5) Accessibility (a11y) & UX Invariants, (6) Testing Strategy & QA, (7) Code Quality, CSS Maintainability & Design Tokens.
- **AGENTS-frontend Pillar 1 (Component Architecture)**: Strict pure presentation vs container/hook logic separation, immutable typed props contracts (`type`/`interface`), ~150-line / max 3 state limit per component, and named exports baseline.
- **AGENTS-frontend Pillar 2 (State & Data Fetching)**: Decouple server state (async cache) from client UI state, zero state duplication into local component state, explicit mutation invalidation keys/optimistic rollbacks, and retry caps with localized error boundaries.
- **AGENTS-frontend Pillar 3 (Performance & Web Vitals)**: Strict Core Web Vitals SLA (LCP < 2.5s, INP < 200ms, CLS < 0.1), dynamic import code-splitting for heavy components, zero CLS via explicit image dimensions/aspect ratios, path-level tree-shakeable imports, and font-display swap.
- **AGENTS-frontend Pillar 4 (Security & Auth Baseline)**: DOMPurify-sanitized HTML injection only, no tokens/PII in localStorage (httpOnly SameSite cookies required), same-origin whitelist on redirects, and CSP/X-Frame-Options/HSTS headers enforced.
- **AGENTS-frontend Pillar 5 (Accessibility & UX)**: WCAG 2.1 AA minimum (4.5:1 contrast), full keyboard navigation via WAI-ARIA patterns, no outline:none without accessible replacement, semantic HTML over div+ARIA, and aria-live announcements for async feedback states.
- **AGENTS-frontend Pillar 6 (Testing & QA)**: 60% unit (hooks/logic), 30% component tests via Testing Library (getByRole over getByTestId), 10% E2E smoke; MSW for network interception, fake timers for async, and mandatory CRUD + auth + error boundary E2E coverage.
- **AGENTS-frontend Pillar 7 (Code Quality & CSS Architecture)**: Design token baseline (CSS variables for colors/spacing), scoped CSS co-location, early-return guard clauses (no nested ternary JSX), pragmatic DRY/YAGNI, and intent-based comments.
- **Deployment Standard**: Production Dokploy PaaS deployment using Dokploy Native Static Provider (`npm run docs:build` publishing `docs/.vitepress/dist`), removing container/Nginx overhead.
- **AGENTS-frontend Additional Rules (post-review)**: Three rules added post-review: (1) Error Boundary Telemetry — boundary errors MUST be sent to observability service (Sentry/Datadog), not swallowed; (2) URL as Authoritative State — shareable UI state SHOULD live in URL search params, not useState/global store; (3) Visual Regression Testing — SHOULD run Chromatic/Percy/Playwright snapshots on design-token and shared component PRs.
- **AGENTS-nextjs Scope**: Next.js App Router (v13+) specific rules layered on top of AGENTS-frontend.md. Covers 6 pillars: (1) RSC Hygiene, (2) Routing & URL Patterns, (3) Rendering Strategy & Data Fetching, (4) Server Actions & Route Handlers, (5) Security Headers & Middleware, (6) Testing (Next.js additions).
- **AGENTS-nextjs Pillar 1 (RSC Hygiene)**: Server Components by default; 'use client' pushed to leaves only; no async fetching in Client Components; server-only package for secret isolation.
- **AGENTS-nextjs Pillar 2 (Routing & URL)**: App Router file conventions; useRouter() only for navigation; searchParams validated via Zod/nuqs; generateStaticParams for bounded dynamic routes.
- **AGENTS-nextjs Pillar 3 (Rendering & Caching)**: SSG/ISR preferred over SSR; explicit fetch() cache options (no implicit defaults); revalidatePath/revalidateTag on mutations; Suspense streaming for slow data.
- **AGENTS-nextjs Pillar 4 (Server Actions & Route Handlers)**: Zod validation on all inputs; service layer delegation (no direct DB in actions); Route Handlers return unified error envelope; no mutations in GET handlers.
- **AGENTS-nextjs Pillar 5 (Security)**: Security headers via next.config.js (CSP, X-Frame-Options, HSTS, Permissions-Policy); Edge middleware guards for protected routes; no secrets in NEXT_PUBLIC_ env vars.
- **AGENTS-nextjs Pillar 6 (Testing)**: next/jest transformer required; Server Components tested via Playwright or renderToString; Route Handlers tested via full HTTP cycle; Next.js internals mocked only with documented justification.



