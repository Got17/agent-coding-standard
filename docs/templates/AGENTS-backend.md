# Production Backend Agent Rules (AGENTS.md Stub)

> Copy this file directly into your target backend project root as `AGENTS.md`.

<!-- START AGENT-STANDARD: BACKEND-PRODUCTION -->
## Core Backend Principles
- [ ] Architecture: Layered architecture (Controller -> Service -> Repository / Data Access).
- [ ] API Design: Strict REST / gRPC contract, JSON payload, explicit error codes.
- [ ] Input Validation: Validate all incoming payloads with schema validators (Zod/Pydantic/Validator) at boundary layer.
- [ ] Logging: Structured JSON logs with correlation IDs. Never print raw strings.
<!-- END AGENT-STANDARD: BACKEND-PRODUCTION -->
