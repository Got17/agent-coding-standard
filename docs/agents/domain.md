# Domain Documentation Layout

Single-context repository layout.

## Layout

- `CONTEXT.md` at repo root — Ubiquitous language, domain terms, and key architectural decision logs.
- `docs/adr/` — Architecture Decision Records.

## Rules for AI agents

1. **Read before edit**: Always read `CONTEXT.md` before making architectural or domain changes.
2. **Keep updated**: Update `CONTEXT.md` immediately whenever new domain terms or decisions are finalized.
3. **ADRs**: Consult `docs/adr/` for historical decisions when working on core architecture.
