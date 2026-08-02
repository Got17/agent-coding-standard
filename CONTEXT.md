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



