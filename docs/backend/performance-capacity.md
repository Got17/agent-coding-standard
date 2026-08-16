# Performance, Capacity & Resource Bounds Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-PERFORMANCE -->
## Backend Performance & Capacity Management Rules
- Resource Limits & Constraints: All backend services MUST configure explicit memory heap limits, maximum open file descriptors, and thread pool/worker concurrency limits. Services MUST NOT allow unbounded memory growth or uncontrolled thread creation under heavy traffic.
- Connection Pool Management: Database, Redis, and HTTP client connection pools MUST enforce explicit minimum idle connections, maximum active connections, max lifetime, and acquire timeout values. Unbounded connection pool allocation is strictly prohibited.
- Enforced API Bounds & Mandatory Pagination: Every list/search endpoint MUST enforce server-side pagination with default and maximum limit bounds (e.g., default `limit=20`, max `limit=100`). Unbounded queries returning arbitrary row counts (`SELECT *` without LIMIT) are strictly banned.
- Query Complexity Guards: High-load endpoints MUST enforce query execution timeouts (statement timeouts), index usage verification, and payload size limits (e.g., max 10MB JSON request body) to protect against resource exhaustion attacks (DoS).
<!-- END AGENT-STANDARD: BACKEND-PERFORMANCE -->
```

---

## Detailed Human Guide & Rationale

*(Stub Document: Topic structure outlined below for collaborative drafting)*

### 1. CPU, Memory & Concurrency Bounds
- Process memory limits, garbage collection tuning, and event loop latency monitoring.
- Concurrency limits, worker thread sizing, and backpressure mechanisms.

### 2. Connection Pool Sizing & Lifecycle
- Mathematical sizing of database and cache connection pools based on CPU core count and IO wait patterns.
- Connection leak detection, max idle connection timeouts, and connection validation probes.

### 3. Pagination, Limit Enforcements & Query Bounds
- Cursor-based vs offset-based pagination performance implications.
- Mandatory server-enforced max page size limits and streaming large result sets.

### 4. Payload Size Limits & Denial-of-Service Defense
- Request body payload size limits, multipart upload streaming, and JSON parser allocation bounds.
- Statement timeouts and query execution cost limits.

---

## Evidence & Primary Sources

- [Google SRE Book: Addressing Overload](https://sre.google/sre-book/addressing-overload/): Core practices for resource limits, load shedding, and graceful capacity degradation.
- [OWASP API Security: Unrestricted Resource Consumption](https://owasp.org/www-project-api-security/): API4:2023 risk analysis regarding unbounded page limits and memory allocation.
- [PostgreSQL Connection Pooling Best Practices](https://wiki.postgresql.org/wiki/Number_Of_Database_Connections): Guidance on connection pool sizing calculation and overhead minimization.
