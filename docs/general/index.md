# General Production Standards

> Comprehensive concept map of software architecture, clean code principles, git workflows, code reviews, AI coding agent collaboration, and architectural decision records (ADRs) for human developers and AI agents.

## General Concept Map

### 1. Architecture & Design Principles
- **[General Architecture Patterns](/general/architecture-patterns)**: Decoupled module boundaries, modular monoliths, hexagonal ports & adapters, event-driven patterns, CQRS.
- **[Clean Code Principles](/general/clean-code)**: SOLID principles, pragmatic DRY vs AHA (Avoid Hasty Abstractions), guard clauses, intent-based comments, docstring contract sync.

### 2. Workflow & Review Gates
- **[Git Workflow & Versioning](/general/git-workflow)**: Conventional Commits 1.0.0, Trunk-Based Development, atomic commits, small pull requests, semantic versioning.
- **[Code Review Checklist](/general/code-review-checklist)**: Pre-merge quality gates, PR size limits (< 200 LOC target), security/performance review checklist, automated CI enforcement.

### 3. AI Agent Collaboration & Knowledge Capture
- **[AI Coding Agent Collaboration Rules](/general/ai-agent-collaboration)**: `AGENTS.md` block placement, explicit user approval gates, context engineering, tool safety bounds, non-hallucinating edit hygiene.
- **[Architectural Decision Records (ADR) & Documentation](/general/documentation-adr)**: Nygard ADR template (`docs/adr/000X-*.md`), `CONTEXT.md` domain glossary updates, dual-format human/AI guides, doc-code sync.
