# Clean Code & Maintainability Standard

> 💡 **Copyable AI Prompt Block (`AGENTS.md`)**
```markdown
<!-- START AGENT-STANDARD: CLEAN-CODE -->
## Code Quality, Maintainability & Documentation
- [ ] **SOLID Alignment**: Enforce Single Responsibility (SRP) per module and Dependency Inversion (DIP) via injected interface abstractions. Maintain high cohesion and low coupling.
- [ ] **Pragmatic DRY & YAGNI**: Consolidate duplicated business rules in a single source of truth, but avoid hasty/speculative abstractions (AHA principle). Do NOT write unused generic parameters, dead code, or speculative plugin hooks.
- [ ] **Guard Clauses Over Deep Nesting**: Prefer early returns/exit guard clauses over deeply nested `if-else` branches to keep cyclomatic complexity low and readability high.
- [ ] **Self-Documenting Code & Intent Comments**: Write descriptive, domain-aligned variable and function names. Comments MUST explain non-obvious business rationale (*why*), never repeating *what* readable code already expresses.
- [ ] **Docstrings & Contract Sync**: Keep inline API docstrings, module documentation, and external spec files (OpenAPI/Protobuf) 100% in sync whenever signatures or data models change.
<!-- END AGENT-STANDARD: CLEAN-CODE -->
```

---

## Detailed Human Guide & Rationale

### 1. SOLID Principles in Practice

* **Single Responsibility Principle (SRP)**: Each class or module must have exactly one reason to change. Transport handlers handle HTTP parsing, domain services handle business rules, and repositories handle SQL queries.
* **Open/Closed Principle (OCP)**: Software entities should be open for extension, but closed for modification. Extend capabilities via interfaces and strategy patterns rather than mutating core callers.
* **Dependency Inversion Principle (DIP)**: Depend upon abstractions (interfaces), not concrete implementations. This enables fast unit testing with mocks and decouples business logic from backing storage engines.

### 2. Pragmatic DRY (Don't Repeat Yourself) & AHA (Avoid Hasty Abstractions)

* **Single Source of Truth**: Business logic and validation schemas must exist in one place.
* **Avoid Hasty Abstractions**: Do not prematurely abstract code that is only written once or twice. Prefer small, readable functions over complex generic abstractions created before patterns stabilize.

### 3. Guard Clauses & Low Cyclomatic Complexity

* **Guard Clauses**: Handle edge cases and validation failures early with return/throw statements at the top of functions.
* **Flatten Nesting**: Keep nesting levels $\le 3$. Avoid deeply nested `if-else` cascades that increase cognitive load and bug potential.

### 4. Intent-Based Comments & Documentation Sync

* **Why, Not What**: Code explains *what* is happening; comments explain *why* a trade-off, business rule, or workaround was chosen.
* **Documentation Sync**: When changing a function parameter or data contract, immediately update all associated inline docstrings, README files, and OpenAPI/Protobuf specifications in the same commit.
