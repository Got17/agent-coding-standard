# Database, ORM & Migrations Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-DATABASE -->
## Database, ORM & Persistence Rules
- Schema mutations MUST use versioned, deterministic migration scripts checked into version control. Never apply manual schema modifications in production ("ClickOps DB"). CI pipelines MUST run migration linting and schema drift validation.
- Enforce the Expand-Migrate-Contract pattern for non-breaking, zero-downtime schema changes (adding new columns as nullable/defaulted before dropping old columns in a subsequent release).
- All queries MUST use parameterized inputs or ORM query builders. Raw string concatenation of untrusted input in SQL statements is strictly banned to prevent SQL Injection (SQLi) (OWASP A03:2021).
- Every foreign key column MUST have an explicit database index and explicit `ON DELETE` behavior (`ON DELETE RESTRICT` by default; `ON DELETE CASCADE` only for parent-owned dependent entities).
- Prevent N+1 query antipatterns by using explicit eager loading (`JOIN`, `include`, `preload`) or batching primitives (`DataLoader`).
- Configure explicit connection pool limits (`min`/`max`), server-side statement timeouts (`statement_timeout`), lock timeouts (`lock_timeout`), and idle transaction timeouts (`idle_in_transaction_session_timeout`) to prevent connection starvation and lock contention.
- Keep database transactions short and tightly scoped. External network I/O calls (HTTP requests, gRPC, third-party API calls, email dispatches) are strictly forbidden inside database transactions.
- Relational databases MUST default to `READ COMMITTED` or higher transaction isolation. High-concurrency state mutations MUST use explicit Optimistic Concurrency Control (`version` integer column) or Pessimistic Locking (`SELECT ... FOR UPDATE` with `lock_timeout`).
- Every application table MUST include 4-key audit metadata: `created_at` (timestamptz), `updated_at` (timestamptz), `created_by` (uuid/string), and `updated_by` (uuid/string).
- Soft-deleted entities MUST use `deleted_at` (timestamptz) with partial unique indexes (`WHERE deleted_at IS NULL`) to avoid unique constraint collisions on soft-deleted rows.
<!-- END AGENT-STANDARD: BACKEND-DATABASE -->
```

---

## Detailed Human Guide & Rationale

### 1. Versioned Schema Migrations & Zero-Downtime Patterns

Production schema changes must be versioned, immutable, and checked into source control. Manual DDL commands executed directly against production databases are strictly prohibited.

#### CI Migration Pipeline & Drift Detection
Automated CI pipelines MUST validate database migrations before code deployment:
1. **Checksum Verification**: Ensure applied migration files have not been modified post-commit.
2. **Backward-Compatibility Linting**: Verify migrations do not include destructive commands (e.g. `DROP COLUMN` or `ALTER TABLE ... RENAME`) in a single release.
3. **Dry-Run Validation**: Run migrations against a clean ephemeral database instance in CI.

#### The Expand-Migrate-Contract Pattern
To achieve zero-downtime deployments, database migrations and application code deployments must be decoupled so that old and new application instances can safely run concurrently against the database engine.

1. **Expand**: Add new columns, tables, or indexes without altering or deleting existing structures. New columns must be created as `NULLABLE` or carry a default value so existing application code can insert records without knowing about the new columns.
2. **Migrate**: Deploy the new application version that writes to both old and new columns, and run backfill scripts to populate new columns for historical rows.
3. **Contract**: Once all application instances run the new version and no traffic accesses the legacy columns, apply a final migration to drop old columns or constraints.

```text
Step 1: EXPAND  ---> Add `full_name` (NULLABLE) alongside `first_name`, `last_name`.
Step 2: MIGRATE ---> Deploy code writing both fields; backfill existing `full_name` data.
Step 3: CONTRACT -> Deploy code reading only `full_name`; drop `first_name`, `last_name`.
```

---

### 2. Query Safety & Injection Prevention (OWASP A03:2021)

SQL Injection (SQLi) remains a top web application vulnerability (OWASP Top 10 A03:2021). 

#### Mandatory Parameterization
Every SQL query involving user-supplied or dynamic input must use parameterized placeholders (`?`, `$1`, `:param`) or typed ORM query builders. Raw string concatenation or formatted string interpolation in SQL queries is strictly banned.

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

Database connection creation involves expensive TCP handshakes, TLS negotiation, and backend thread allocations. Applications must manage connections via an explicit connection pool bounded by hard limits and timeouts.

#### Connection Limits & Timeouts
- **Pool Sizing**: Capacity must be bounded per application instance (`min: 2, max: 10`). Total connection pool capacity across all application replicas MUST NOT exceed the database engine's `max_connections` limit.
- **Statement Timeout (`statement_timeout`)**: Configure a global server-side statement timeout (e.g. `5000ms`) to abort runaway OLTP queries automatically.
- **Lock Timeout (`lock_timeout`)**: Configure a lock acquisition timeout (e.g. `2000ms`) to prevent transactions from waiting indefinitely for row or table locks.
- **Idle Transaction Timeout (`idle_in_transaction_session_timeout`)**: Configure a session timeout (e.g. `10000ms`) to terminate connections left idle inside open transactions.

```sql
-- PostgreSQL session timeout configuration example
SET statement_timeout = '5s';
SET lock_timeout = '2s';
SET idle_in_transaction_session_timeout = '10s';
```

---

### 4. Transaction Boundaries, Isolation Levels & Concurrency Control

Database transactions (`BEGIN ... COMMIT`) ensure ACID compliance across multi-step mutations. Misplaced logic inside transactions degrades database throughput and risks deadlocks.

#### Strict Transaction Invariants
1. **Zero External Network I/O**: External HTTP calls, gRPC requests, S3 file uploads, or third-party webhooks MUST NOT occur inside a database transaction. Holding row locks during external network latency causes severe lock contention and connection pool exhaustion.
2. **Short Transaction Lifetimes**: Transactions must execute rapidly (target `< 50ms`). Perform data validation, payload parsing, and authorization checks *before* opening the transaction block.
3. **Isolation Levels**: Relational databases must default to at least `READ COMMITTED`.

#### Optimistic Concurrency Control (OCC)
For high-concurrency state mutations (e.g. account balance or inventory updates), use an explicit `version` integer column. The update fails if another transaction modified the row concurrently:

```sql
-- Optimistic Concurrency Control (OCC) pattern
UPDATE accounts 
SET balance = balance - 100, version = version + 1 
WHERE id = $1 AND version = $2;
-- If affected row count == 0, raise ConcurrentUpdateError and retry or reject
```

#### Pessimistic Locking with Timeout
When explicit row locking is necessary, use `SELECT ... FOR UPDATE` combined with a strict `lock_timeout`:

```sql
BEGIN;
SET LOCAL lock_timeout = '2s';
SELECT * FROM inventory WHERE item_id = $1 FOR UPDATE;
UPDATE inventory SET quantity = quantity - 1 WHERE item_id = $1;
COMMIT;
```

---

### 5. Foreign Keys, Indexing Strategy & N+1 Prevention

Unindexed queries and N+1 query patterns are the primary causes of database performance degradation as data volume grows.

#### Foreign Key Indexing & Explicit `ON DELETE` Policy
Every foreign key column (`tenant_id`, `user_id`, `organization_id`) MUST have an explicit database index to support fast joins and avoid full table scans.

Explicit `ON DELETE` rules MUST be declared on every foreign key constraint:
- **`ON DELETE RESTRICT`** (Default): Prevents deletion of a parent record if child records exist. Use for primary business entities and financial records.
- **`ON DELETE CASCADE`**: Automatically deletes dependent child records when the parent record is deleted. Use ONLY for tightly coupled, parent-owned child entities (e.g. order line items).
- **`ON DELETE SET NULL`**: Sets the foreign key column to `NULL` when parent is deleted. Requires column to be `NULLABLE`.

#### N+1 Query Prevention
The N+1 query antipattern occurs when code executes 1 initial query to fetch $N$ parent records, followed by $N$ separate queries inside a loop to fetch associated child records. Use explicit eager loading (`JOIN`, `joinedload`, `include`, `preload`) or batching (`DataLoader`).

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

---

### 7. Soft Delete & Data Archiving Strategy

When domain requirements mandate soft deletion (retaining records for audit compliance without displaying them to end users), implementations must prevent unique key collisions and query performance degradation.

#### Partial Unique Indexes for Soft Deletes
Standard unique constraints (`UNIQUE(email)`) break soft deletes: a user cannot re-register an email if a previously soft-deleted row contains that email. Solved using **partial unique indexes**:

```sql
-- PostgreSQL Partial Unique Index for Soft Delete
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Unique constraint applies ONLY to active (non-deleted) records
CREATE UNIQUE INDEX idx_users_email_active ON users (email) WHERE deleted_at IS NULL;
```

#### Query Scope Invariants
- Application queries MUST include explicit `WHERE deleted_at IS NULL` filters, or leverage ORM global query scopes.
- Hard Deletion / Archiving: Soft-deleted records older than regulatory retention periods (e.g. 90 days) MUST be pruned or moved to cold archive storage via automated background batch jobs.

---

## Evidence / References

- [PostgreSQL Documentation — Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html): Official PostgreSQL guide on `READ COMMITTED`, `REPEATABLE READ`, and `SERIALIZABLE` isolation levels.
- [PostgreSQL Documentation — Statement & Lock Timeouts](https://www.postgresql.org/docs/current/runtime-config-client.html): Official specs for `statement_timeout`, `lock_timeout`, and `idle_in_transaction_session_timeout`.
- [PostgreSQL Documentation — Explicit Locking (`FOR UPDATE`)](https://www.postgresql.org/docs/current/explicit-locking.html): Official spec for pessimistic row-level locking (`SELECT ... FOR UPDATE`).
- [Martin Fowler — Evolutionary Database Design & Parallel Change](https://martinfowler.com/articles/evodb.html): Authoritative guide for non-breaking, zero-downtime database migrations (Expand-Migrate-Contract pattern).
- [OWASP Top 10 2021 — A03: Injection](https://owasp.org/Top10/A03_2021-Injection/): OWASP standard for parameterized queries and SQL injection prevention.
- [ANSI/ISO/IEC 9075 SQL Standard — Referential Integrity](https://www.iso.org/standard/63555.html): Standard spec for Foreign Key constraints and `ON DELETE` cascade/restrict rules.
- [PostgreSQL Documentation — Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html): Official documentation for partial indexes (`WHERE deleted_at IS NULL`) used in soft delete patterns.
