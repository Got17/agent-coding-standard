# AGENTS.md - Agent Instructions for agent-coding-standard

## Repository Mission
This repository maintains production standards for high-reliability software deployments.

## Core Rules for AI Agents Working on This Repository
1. **Never edit files blindly**: Always read existing `.md` files and `CONTEXT.md` before making edits.
2. **Dual-Format Requirement**: Every standard document in `docs/` must contain an **AI Copy Block** at the top and a **Detailed Human Guide** below.
3. **Keep `CONTEXT.md` Updated**: Whenever new domain terms or architectural decisions are finalized with the user, update `CONTEXT.md` immediately using inline updates.
4. **Author Standards Collaboratively**: Do not auto-generate full arbitrary contents for standard files unless instructed by the user. Draft stubs first, then flesh out each topic together with the user.
5. **Format Rules**: Use standard Markdown, clear heading hierarchies (H1 -> H2 -> H3), clean syntax highlighting, and avoid fluff.

## Agent skills

### Issue tracker

GitHub Issues in `Got17/agent-coding-standard` via `gh`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context (`CONTEXT.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.

