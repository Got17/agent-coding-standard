# Database, ORM & Migrations Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-DATABASE -->
## Database, ORM & Persistence Rules
- Schema mutations MUST use versioned, deterministic migration scripts. Never apply manual schema modifications in production ("ClickOps DB").
- Enforce the Expand-Migrate-Contract pattern for non-breaking, zero-downtime schema changes (adding new columns as nullable/defaulted before dropping old columns in a subsequent release).
- All queries MUST use parameterized inputs or ORM query builders. Raw string concatenation of untrusted input in SQL statements is strictly banned to prevent SQL Injection (SQLi).
- Every foreign key column MUST have an explicit database index. Enforce explicit `ON DELETE` cascading or restriction behavior on foreign keys.
- Prevent N+1 query antipatterns by using explicit eager loading (`JOIN`, `include`, `preload`) or batching primitives (`DataLoader`).
- Configure explicit connection pool limits and server-side statement timeouts (e.g., max 5s for OLTP queries) to prevent connection pool starvation.
- Keep database transactions short and tightly scoped. External network I/O calls (HTTP requests, gRPC, third-party API calls, email dispatches) are strictly forbidden inside database transactions.
- Relational databases MUST default to `READ COMMITTED` or higher transaction isolation. High-concurrency state mutations MUST use explicit optimistic concurrency control (version/timestamp column) or pessimistic locking (`SELECT ... FOR UPDATE`) with timeouts.
- Every application table MUST include 4-key audit metadata: `created_at` (timestamptz), `updated_at` (timestamptz), `created_by` (uuid/string), and `updated_by` (uuid/string).
<!-- END AGENT-STANDARD: BACKEND-DATABASE -->
```

---

## Detailed Human Guide & Rationale

### 1. Versioned Schema Migrations & Zero-Downtime Patterns

Production schema changes must be versioned, immutable, and checked into version control. Manual DDL commands executed directly against production databases are prohibited.

#### The Expand-Migrate-Contract Pattern
To achieve zero-downtime deployments, database migrations and application code deployments must be decoupled so that old and new application instances can safely run concurrently against the database.

1. **Expand**: Add new columns, tables, or indexes without altering or deleting existing structures. New columns must be created as `NULLABLE` or carry a default value so existing application code can insert records without knowing about the new columns.
2. **Migrate**: Deploy the new application version that writes to both old and new columns, and run backfill scripts to populate new columns for historical rows.
3. **Contract**: Once all application instances run the new version and no traffic accesses the legacy columns, apply a final migration to drop old columns or constraints.

```text
Step 1: EXPAND  ---> Add `full_name` (NULLABLE) alongside `first_name`, `last_name`.
Step 2: MIGRATE ---> Deploy code writing both fields; backfill existing `full_name` data.
Step 3: CONTRACT -> Deploy code reading only `full_name`; drop `first_name`, `last_name`.
```

---

### 2. Query Safety & Injection Prevention

SQL Injection (SQLi) remains a top web application vulnerability (OWASP Top 10 A03:2021). 

#### Mandatory Parameterization
Every SQL query involving user-supplied or dynamic input must use parameterized placeholders (`?`, `$1`, `:param`) or typed ORM methods.

```typescript
// ❌ WRONG: Raw string interpolation allows SQL injection
const user = await db.query(`SELECT * FROM users WHERE email = '${req.body.email}'`);

// ✅ CORRECT: Parameterized query enforces input binding
const user = await db.query('SELECT * FROM users WHERE email = $1', [req.body.email]);

// ✅ CORRECT: ORM query builder handles parameterization safely
const user = await prisma.user.findUnique({ where: { email: req.body.email } });
```

---

### 3. Connection Pooling & Resource Bounds

Database connection creation involves expensive TCP handshakes, TLS negotiation, and process/thread allocations. Applications must manage connections via an explicit connection pool.

#### Connection Limits & Timeouts
* **Pool Sizing**: Bounded pool capacity must be explicitly configured per instance (e.g., `min: 2, max: 10`). Total connection pool size across all application replicas must not exceed the database engine's `max_connections` limit.
* **Statement Timeouts**: Configure a global server-side `statement_timeout` (e.g., `5000ms`) to abort slow or runaway queries automatically, avoiding long-held locks.
* **Connection Lifecycle**: Set `idle_timeout` and `max_lifetime` parameters to recycle stale or dropped network connections cleanly.

---

### 4. Transaction Boundaries & Isolation Levels

Database transactions (`BEGIN ... COMMIT`) ensure ACID compliance across multi-step mutations. However, misplaced logic inside transactions degrades database performance and risks deadlocks.

#### Strict Transaction Invariants
1. **Zero External Network I/O**: External HTTP calls, gRPC requests, S3 file uploads, or third-party webhooks MUST NOT occur inside a database transaction. If an external API call hangs or fails, the open transaction holds database row locks and exhausts connection pool slots.
2. **Short Transaction Lifetimes**: Transactions must execute rapidly (target `< 50ms`). Perform data validation, payload parsing, and authorization checks *before* opening the transaction block.
3. **Isolation Levels**: Relational databases must default to at least `READ COMMITTED`. For concurrent financial or inventory updates, use **Optimistic Concurrency Control** (version/timestamp column) or **Pessimistic Locking** (`SELECT ... FOR UPDATE` with lock timeouts).

```go
// ❌ WRONG: External HTTP request inside a database transaction
tx, _ := db.Begin()
tx.Exec("UPDATE accounts SET balance = balance - 100 WHERE id = $1", accountID)
resp, err := paymentGateway.Charge(ctx, payload) // 🚨 Dangerous! External network I/O holding DB lock
if err == nil {
    tx.Commit()
}

// ✅ CORRECT: External HTTP request executed BEFORE transaction
resp, err := paymentGateway.Charge(ctx, payload)
if err != nil {
    return err
}
tx, _ := db.Begin()
tx.Exec("UPDATE accounts SET balance = balance - 100 WHERE id = $1", accountID)
tx.Commit()
```

---

### 5. Indexing Strategy & N+1 Prevention

Unindexed queries and N+1 query patterns are the primary causes of database performance degradation as data volume grows.

#### Foreign Key Indexing
Every foreign key column (`tenant_id`, `user_id`, `organization_id`) MUST have an explicit index to support efficient `JOIN` operations and prevent full table scans during cascade deletes.

#### N+1 Query Prevention
The N+1 query antipattern occurs when code executes 1 initial query to fetch $N$ parent records, followed by $N$ separate queries inside a loop to fetch associated child records.

```python
# ❌ WRONG: N+1 query pattern (1 query for users + N queries for orders)
users = db.query("SELECT * FROM users")
for user in users:
    orders = db.query("SELECT * FROM orders WHERE user_id = %s", user.id)

# ✅ CORRECT: Eager loading joins or batches child records in 1 or 2 queries
users = db.query("SELECT * FROM users JOIN orders ON users.id = orders.user_id")
# OR via ORM eager loading
users = User.query.options(joinedload(User.orders)).all()
```

---

### 6. Mandatory Audit Metadata

Every persistent entity table in application databases must contain 4 standardized audit metadata columns for operational traceability and compliance:

| Column Name | Data Type | Constraint | Description |
|---|---|---|---|
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, Default `NOW()` | Immutable timestamp when record was created. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, Default `NOW()` | Timestamp updated automatically on every mutation. |
| `created_by` | `UUID` / `VARCHAR` | `NOT NULL` | User ID, service account, or system actor that created the record. |
| `updated_by` | `UUID` / `VARCHAR` | `NOT NULL` | User ID, service account, or system actor that last updated the record. |
