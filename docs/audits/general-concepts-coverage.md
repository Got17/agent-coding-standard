# General Concepts Coverage Audit

Date: 2026-08-15

## Scope

This audit checks whether the general / cross-cutting documentation section covers essential universal concepts for software architecture, code quality, git workflows, code reviews, AI coding collaboration, and architectural decision records (ADRs). It audits the full general section, including:

- `docs/general/architecture-patterns.md`
- `docs/general/clean-code.md`
- `docs/general/code-review-checklist.md`
- `docs/general/git-workflow.md`
- `templates/AGENTS-fullstack.md`
- `AGENTS.md` repository rules and cross-cutting guides

## Verdict

The general section is currently the **most complete section in the repository**, featuring four fully articulated canonical standard guides:
1. `docs/general/architecture-patterns.md` (15,512 bytes) — Modular monolith, microservices, hexagonal architecture, event-driven architecture, CQRS, and domain boundary design.
2. `docs/general/code-review-checklist.md` (20,253 bytes) — Detailed code review standards, PR size limits, security/performance/testing review dimensions, and CI quality gates.
3. `docs/general/git-workflow.md` (12,248 bytes) — Conventional Commits 1.0.0, Trunk-Based Development, atomic commits, PR rules, and tag semantic versioning.
4. `docs/general/clean-code.md` (3,051 bytes) — SOLID principles, pragmatic DRY vs AHA (Avoid Hasty Abstractions), guard clauses, intent-based comments, and docstring contract sync.

However, there is **no `docs/general/index.md` navigation entry point**, and dedicated standards for **AI Coding Agent Collaboration Rules & Context Engineering** (`docs/general/ai-agent-collaboration.md`) and **Architectural Decision Records (ADR) & Knowledge Capture** (`docs/general/documentation-adr.md`) are missing as standalone guides.

Following our evidence research, the plan is to create `docs/general/index.md` as the section navigation hub, add dedicated guides for `ai-agent-collaboration.md` and `documentation-adr.md`, and maintain all four existing comprehensive general guides.

## Coverage Matrix

| Essential Concept | Why It Is Essential | Current Coverage | Status | Recommended Doc Action | Primary Evidence / Standards |
|---|---|---|---|---|---|
| **1. Architectural Patterns & Module Boundaries** | Without clear domain boundaries and decoupling, codebases devolve into monolithic "spaghetti" where changes cause unforeseen ripple failures. | `docs/general/architecture-patterns.md` (15,512 bytes) | Covered | Keep as canonical architecture standard. | [Martin Fowler Catalog of Enterprise Application Architecture](https://martinfowler.com/tags/architecture.html); Hexagonal Architecture (Alistair Cockburn). |
| **2. Code Quality, Maintainability & SOLID Principles** | Unstructured code with high cyclomatic complexity, hasty abstractions, or deep nesting increases maintenance costs and bug density. | `docs/general/clean-code.md` (3,051 bytes) | Covered | Expand `clean-code.md` slightly with more concrete code examples for SOLID and guard clauses. | [Martin Fowler Refactoring & AHA Principle](https://martinfowler.com/books/refactoring.html); SOLID Design Principles (Robert C. Martin). |
| **3. Code Review & Quality Gates** | Unreviewed or overly large pull requests introduce undetected defects, security vulnerabilities, and architectural drift into main branches. | `docs/general/code-review-checklist.md` (20,253 bytes) | Covered | Keep as canonical code review standard. | [Google Engineering Practices Code Review Guide](https://google.github.io/eng-practices/); SmartBear Code Review Study (small PR limit < 200 LOC). |
| **4. Git Workflow, Branching & Commit Hygiene** | Messy commit messages and long-lived unmerged feature branches lead to severe merge conflicts, lost history, and broken automated releases. | `docs/general/git-workflow.md` (12,248 bytes) | Covered | Keep as canonical git workflow standard. | [Conventional Commits 1.0.0 Specification](https://www.conventionalcommits.org/); [Trunk-Based Development Specification](https://trunkbaseddevelopment.com/). |
| **5. AI Agent Instructions & Prompt Rules** | AI coding agents require precise, non-negotiable prompt blocks (`AGENTS.md`) and context rules to prevent hallucinated edits, unapproved file mutations, or breaking changes. | `templates/AGENTS-fullstack.md`; `AGENTS.md` repo rules | Partially covered in templates | Create standalone [`docs/general/ai-agent-collaboration.md`](file:///D:/Coding/projects/agent-coding-standard/docs/general/ai-agent-collaboration.md) documenting `AGENTS.md` block placement, approval workflows, context engineering, tool usage rules, and prompt hygiene. | Antigravity AI Agent Rules Specification; Anthropic / OpenAI System Prompt Best Practices. |
| **6. Architectural Decision Records (ADRs) & Knowledge Capture** | Tribal knowledge lost over time leads to repeating past architectural mistakes or reversing intentional design choices without context. | `AGENTS.md` repo rule #3; `docs/adr/` convention | Partially covered in rules | Create standalone [`docs/general/documentation-adr.md`](file:///D:/Coding/projects/agent-coding-standard/docs/general/documentation-adr.md) documenting ADR formatting (Nygard template `000X-*.md`), inline `CONTEXT.md` glossary updates, dual-format human/AI guides, and doc sync workflows. | [Michael Nygard ADR Template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions); Martin Fowler ADR Practices. |
| **7. General Navigation & Section Index** | Developers and AI agents need a single entry point mapping all cross-cutting architecture, code quality, git, code review, and AI collaboration standards. | None | Missing | Create [`docs/general/index.md`](file:///D:/Coding/projects/agent-coding-standard/docs/general/index.md) as the canonical navigation and overview page for the General section. | Repo standard documentation structure requirement. |

---

## General Section Gaps & Action Plan

### High Priority (Navigation Entry & AI Collaboration)

1. **Create [`docs/general/index.md`](file:///D:/Coding/projects/agent-coding-standard/docs/general/index.md)**
   Provide a single navigation entry point for all general/cross-cutting standards, mapping core rules to dedicated topic pages.

2. **Create [`docs/general/ai-agent-collaboration.md`](file:///D:/Coding/projects/agent-coding-standard/docs/general/ai-agent-collaboration.md)**
   Document AI coding agent interaction rules: `AGENTS.md` block placement, explicit user approval gates, tool usage constraints, context engineering, and prompt hygiene.

### Medium Priority (Documentation & ADRs)

3. **Create [`docs/general/documentation-adr.md`](file:///D:/Coding/projects/agent-coding-standard/docs/general/documentation-adr.md)**
   Document Architectural Decision Records (ADRs) using Nygard templates (`docs/adr/000X-*.md`), `CONTEXT.md` domain term updates, dual-format human/AI guides, and docstring-to-spec synchronization.

4. **Enhance [`docs/general/clean-code.md`](file:///D:/Coding/projects/agent-coding-standard/docs/general/clean-code.md)**
   Add concrete typescript/python/go examples illustrating SOLID principles, AHA vs DRY trade-offs, and guard clause flattening.

---

## Primary Evidence Log

- **Google Engineering Practices Code Review Guide**: [https://google.github.io/eng-practices/](https://google.github.io/eng-practices/) — Canonical guide for small PRs (< 200 LOC), author change descriptions, and code reviewer standards.
- **Conventional Commits 1.0.0 Specification**: [https://www.conventionalcommits.org/](https://www.conventionalcommits.org/) — Industry standard for human and machine readable commit messages (`feat`, `fix`, `BREAKING CHANGE`).
- **Trunk-Based Development Methodology**: [https://trunkbaseddevelopment.com/](https://trunkbaseddevelopment.com/) — Foundational CI practice emphasizing short-lived feature branches and frequent main integration.
- **Martin Fowler Architecture & Refactoring Catalog**: [https://martinfowler.com/](https://martinfowler.com/) — Canonical reference for modular monoliths, hexagonal architecture, CQRS, and code refactoring.
- **Michael Nygard Architectural Decision Records (ADR)**: [https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) — Standard template format for recording software architecture decisions.
