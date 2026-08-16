# Clean Code & Maintainability Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: CLEAN-CODE -->
## Code Quality, Maintainability & Documentation
- Enforce all 5 SOLID principles: Single Responsibility (SRP) per module, Open/Closed (OCP) via extension points, Liskov Substitution (LSP) for behavioral subtyping, Interface Segregation (ISP) with small role-specific contracts, and Dependency Inversion (DIP) via injected abstractions.
- Apply pragmatic DRY (Don't Repeat Yourself) to consolidate business rules into single sources of truth, while adhering to YAGNI (You Aren't Gonna Need It) and the AHA principle (Avoid Hasty Abstractions). Do NOT write speculative abstractions, dead code, or unused generic parameters.
- Use guard clauses (early exit returns/throws) at the top of functions instead of deeply nested `if-else` blocks to maintain low cyclomatic complexity ($\le 3$ nesting levels).
- Enforce strict file length boundaries: target 200–300 lines of code (LOC) per file (Robert C. Martin "Newspaper Metaphor"), enforce a soft cap at 400 LOC (SmartBear/Cisco study: review defect detection drops sharply past 400 LOC), and treat 500 LOC as an absolute hard ceiling. Exclude auto-generated code (lockfiles, OpenAPI/Protobuf artifacts) and large test fixtures.
- Write self-documenting code with domain-aligned naming. Inline comments MUST explain non-obvious business rationale (*why*), never restating *what* readable code already expresses.
- Keep inline docstrings, API contracts, and external specifications (OpenAPI 3.1, Protocol Buffers, GraphQL) 100% synchronized whenever signatures or data models change.
<!-- END AGENT-STANDARD: CLEAN-CODE -->
```

---

## Detailed Human Guide & Rationale

### 1. SOLID Principles in Practice

Software maintainability relies on the five SOLID object-oriented and module design principles.

#### 1. Single Responsibility Principle (SRP)
Each module or class MUST have exactly one reason to change. Separate HTTP transport parsing, business rules execution, and database persistence into distinct layers.

#### 2. Open/Closed Principle (OCP)
Software entities should be open for extension, but closed for modification. Use strategy interfaces or event handlers to add behavior without mutating existing core code.

#### 3. Liskov Substitution Principle (LSP)
Subtypes must be completely substitutable for their base types without breaking caller invariants or throwing unexpected exceptions.

#### 4. Interface Segregation Principle (ISP)
Clients should not be forced to depend on methods they do not use. Prefer small, role-specific interfaces over large monolithic interfaces.

#### 5. Dependency Inversion Principle (DIP)
High-level business logic MUST depend upon abstractions (interfaces), not low-level concrete implementations (drivers, SDKs).

```typescript
// ❌ WRONG: Violates SRP & DIP (tight coupling to concrete database and HTTP responses)
export class OrderController {
  async processOrder(req: any, res: any) {
    const db = new PostgresDatabase(); // 🚨 Direct instantiation violates DIP
    const order = await db.query('SELECT * FROM orders WHERE id = $1', [req.body.id]);
    
    // Business logic mixed into controller (violates SRP)
    if (order.amount > 10000) {
      await sendEmailAlert(order);
    }
    res.json(order);
  }
}

// ✅ CORRECT: Adheres to SRP & DIP via constructor interface injection
export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
}

export interface NotificationService {
  sendAlert(order: Order): Promise<void>;
}

export class OrderProcessor {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly notifier: NotificationService
  ) {}

  async processOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundError('Order', orderId);
    
    if (order.amountCents > 10000_00) {
      await this.notifier.sendAlert(order);
    }
    return order;
  }
}
```

---

### 2. Pragmatic DRY, YAGNI & Avoid Hasty Abstractions (AHA)

While consolidating duplicate domain logic is critical, premature abstraction is often more damaging than minor duplication.

- **Single Source of Truth (DRY)**: Business rules and schema validation logic must live in one authoritative location.
- **You Aren't Gonna Need It (YAGNI)**: Do not write code or generic hooks for hypothetical future requirements.
- **Avoid Hasty Abstractions (AHA)**: Prefer duplicate code over the wrong abstraction (Sandi Metz). Wait until a pattern stabilizes across 3+ usage sites before extracting shared abstractions.

```typescript
// ❌ WRONG: Speculative over-abstraction for a simple string transform
export class AbstractStringTransformerFactoryProvider<T extends Record<string, any>> {
  transform<K extends keyof T>(input: T, key: K, fn: (val: T[K]) => T[K]): T {
    return { ...input, [key]: fn(input[key]) };
  }
}

// ✅ CORRECT: Direct, readable function satisfying current requirements cleanly
export function sanitizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
```

---

### 3. Guard Clauses & Low Cyclomatic Complexity

High cyclomatic complexity makes code difficult to read, test, and audit. Handle validation failures and edge cases early using **guard clauses** (early returns/throws) at the top of the function.

```typescript
// ❌ WRONG: Deeply nested conditionals increase cognitive load
function calculateDiscount(user: User | null, order: Order | null): number {
  if (user !== null) {
    if (user.isActive) {
      if (order !== null) {
        if (order.totalCents > 100_00) {
          return order.totalCents * 0.1;
        } else {
          return 0;
        }
      } else {
        throw new Error("Order required");
      }
    } else {
      return 0;
    }
  } else {
    throw new Error("User required");
  }
}

// ✅ CORRECT: Guard clauses flatten nesting levels to <= 2
function calculateDiscount(user: User | null, order: Order | null): number {
  if (!user) throw new IllegalArgumentError("User is required");
  if (!order) throw new IllegalArgumentError("Order is required");
  if (!user.isActive) return 0;
  if (order.totalCents <= 100_00) return 0;

  return order.totalCents * 0.1;
}
```

---

### 4. Intent-Based Comments & Contract Synchronization

Comments should clarify non-obvious business decisions or trade-offs, never restating what clean code already expresses.

#### Comment Rules
- **Why, Not What**: Explain *why* a workaround or specific algorithm was chosen. Do not describe *what* syntax does.
- **Contract Synchronization**: Whenever changing function parameters, return types, or domain models, immediately update inline docstrings and external spec files (OpenAPI 3.1 / Protobuf) in the exact same commit.

```typescript
// ❌ WRONG: Redundant comment restating readable code
// Increment counter by 1
count += 1;

// ✅ CORRECT: Intent-based comment explaining non-obvious business rationale
// Deduct 150ms buffer to prevent race conditions with payment gateway token expiration
const tokenExpiryWithBuffer = token.expiresAtMs - 150;
```

---

### 5. File Size & Lines of Code (LOC) Bounds

Empirical software engineering research demonstrates that large, monolithic files increase cognitive overhead, degrade code review thoroughness, and correlate directly with elevated defect density.

#### Quantitative Line Count Invariants

| Boundary Level | Lines of Code (LOC) | Rule & Operational Rationale |
| :--- | :--- | :--- |
| **Recommended Target** | **200–300 LOC** | Ideal file size range for human comprehension. Follows Uncle Bob's "Newspaper Metaphor" (high-level concept at the top, increasing detail downward). |
| **Soft Cap** | **400 LOC** | Cognitive threshold established by the Cisco Code Review Study (2,500 reviews / 3.2M LOC). Code review defect discovery drops from **70–90% down to < 30%** when files under review exceed 400 LOC. |
| **Absolute Hard Ceiling** | **500 LOC** | Files exceeding 500 LOC MUST be refactored and split into sub-modules (unless subject to explicitly documented exceptions). |

#### Documented Exceptions
The following file categories are exempt from the 500 LOC cap:
1. **Auto-Generated Artifacts**: Generated code files (e.g. `*.pb.go`, `*_openapi.yaml`, `schema.prisma`).
2. **Dependency Lockfiles**: Package lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `uv.lock`).
3. **Test Fixtures**: Static mock data bundles and large integration test datasets.

---

## Evidence / References

- [Robert C. Martin — Clean Code: A Handbook of Agile Software Craftsmanship (2008)](https://www.pearson.com/en-us/subject-catalog/p/clean-code-a-handbook-of-agile-software-craftsmanship/P200000009511): Chapter 5 ("Small Files" & "The Newspaper Metaphor") establishing the 200 LOC target and 500 LOC upper limit per source file.
- [SmartBear & Cisco Systems — Best Kept Secrets of Peer Code Review (2006)](https://smartbear.com/resources/ebooks/best-kept-secrets-of-peer-code-review/): Empirical study of 2,500 code reviews and 3.2M lines of code proving defect discovery drops sharply from 70–90% to < 30% when review size exceeds 200–400 LOC.
- [Google Engineering Practices — Small CLs Guidelines](https://google.github.io/eng-practices/review/developer/small-cls.html): Industry standard establishing small change and file bounds for review speed and defect prevention.
- [Robert C. Martin — The Principles of OOD (SOLID)](http://butunclebob.com/ArticleS.UncleBob.PrinciplesOfOod): Original papers defining the SOLID principles (SRP, OCP, LSP, ISP, DIP).
- [Barbara Liskov & Jeannette Wing (1994) — A Behavioral Notion of Subtyping](https://dl.acm.org/doi/10.1145/197320.197383): Authoritative ACM paper establishing the Liskov Substitution Principle (LSP).
- [Sandi Metz — The Wrong Abstraction (AHA Principle)](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction): Authoritative software design paper establishing "Avoid Hasty Abstractions" (AHA) and DRY bounds.
- [Andrew Hunt & David Thomas — The Pragmatic Programmer](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/): Original source establishing the Don't Repeat Yourself (DRY) and YAGNI software engineering rules.
- [Martin Fowler — Refactoring: Improving the Design of Existing Code](https://martinfowler.com/books/refactoring.html): Authoritative guide for Replace Nested Conditional with Guard Clause and cyclomatic complexity reduction.
- [Steve McConnell — Code Complete (2nd Edition)](https://www.microsoftpressstore.com/store/code-complete-9780735619678): Definitive reference for self-documenting code and intent-based commenting guidelines.
- [OpenAPI 3.1.0 Specification](https://spec.openapis.org/oas/v3.1.0): Specification for API contract definition and documentation synchronization.
