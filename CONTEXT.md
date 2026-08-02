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



