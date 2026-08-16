# Resilience, Fault Tolerance & Caching Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-RESILIENCE-CACHING -->
## Resilience, Traffic Control & Caching Rules
- All external HTTP/gRPC outbound requests MUST specify explicit connect and read timeouts (e.g., max 2-5s). Unbounded network calls are strictly banned.
- Outbound retries MUST use exponential backoff with randomized jitter to prevent thundering herd retry storms. Max retries MUST NOT exceed 2-3 attempts, and retries MUST be skipped entirely for 4xx client errors.
- Wrap external downstream dependencies in Circuit Breakers (Closed -> Open -> Half-Open). When a downstream service failure threshold is reached (e.g., 50% errors over 10s), the circuit MUST trip open immediately to fail fast without blocking caller threads.
- Enforce Bulkhead isolation (concurrency limits) per downstream dependency pool to prevent a single slow integration from consuming all application worker threads.
- Enforce ingress rate limiting (token bucket / leaky bucket algorithm) at API gateways or service boundaries. Return HTTP `429 Too Many Requests` with `Retry-After` headers when limits are breached.
- Implement graceful process shutdown handling `SIGTERM` / `SIGINT` signals: immediately fail readiness probes, drain active HTTP/gRPC in-flight requests within a 30-second window, close database connection pools, and exit cleanly with code 0.
- Caching MUST follow the Cache-Aside pattern. Every cached key MUST have an explicit Time-To-Live (TTL). Permanent keys without TTLs are strictly prohibited.
- Protect against Cache Stampedes (thundering herd on cache misses) using single-flight request coalescing or distributed locks.
- Shared/distributed caches (Redis/Memcached) MUST NOT store un-encrypted sensitive PII or session tokens without origin privacy boundaries.
<!-- END AGENT-STANDARD: BACKEND-RESILIENCE-CACHING -->
```

---

## Detailed Human Guide & Rationale

### 1. Network Timeouts & Exponential Backoff Retries

Distributed backends fail when downstream network calls hang indefinitely or when retry storms amplify minor glitches into catastrophic outages.

#### Timeouts
Every outbound network call (HTTP client, gRPC channel, external API integration) MUST configure explicit connect, read, and write timeouts.

```typescript
// ❌ WRONG: Default HTTP client without timeouts hangs indefinitely if downstream stalls
const response = await fetch("https://api.thirdparty.com/v1/rates");

// ✅ CORRECT: Explicit AbortController timeout bounds network waiting
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

try {
  const response = await fetch("https://api.thirdparty.com/v1/rates", { signal: controller.signal });
} finally {
  clearTimeout(timeoutId);
}
```

#### Exponential Backoff with Jitter
When retrying transient network failures (503 Service Unavailable, network timeout, connection reset), retries MUST add exponential backoff and randomized jitter to prevent synchronized retry storms from overwhelming recovering downstream services.

$$\text{Delay} = 2^{\text{attempt}} \times \text{base\_delay} + \text{random\_jitter}$$

* **Max Retries**: Cap retries at 2 or 3 attempts.
* **Non-Retryable Errors**: DO NOT retry 4xx HTTP client errors (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`).

---

### 2. Circuit Breakers & Bulkhead Isolation

When a downstream dependency is completely failing or severely degraded, continuing to send requests exhausts local resources and causes cascading failures.

#### Circuit Breaker State Machine
Wrap outbound clients in a Circuit Breaker that transitions through three states:

```text
       [Normal Operation]
          +----------+
          | CLOSED   | <------------+
          +----------+              |
               | (Failure Threshold) | (Success Threshold)
               v                    |
          +----------+              |
          |  OPEN    |              |
          +----------+              |
               | (Sleep Window)     |
               v                    |
          +----------+              |
          | HALF-OPEN| -------------+
          +----------+
```

1. **Closed**: Normal state. Requests pass through. If error rate exceeds threshold (e.g. > 50% over 10s), state switches to **Open**.
2. **Open**: Requests fail immediately locally without hitting the network (`ErrCircuitOpen`), allowing downstream to recover and saving local worker threads.
3. **Half-Open**: After a sleep window (e.g. 30s), a limited trial batch of requests is allowed through. If successful, state resets to **Closed**; if failed, returns to **Open**.

#### Bulkhead Concurrency Limits
Isolate thread/connection pools per downstream integration so that a slow secondary integration (e.g. PDF generation service) cannot consume all global application threads and crash unrelated primary APIs (e.g. User Login).

---

### 3. Rate Limiting & Graceful Load Shedding

Protect backend services from traffic spikes, denial-of-service attempts, and runaway client scripts by enforcing rate limits at service boundaries.

#### Rate Limiting Standards
* **Algorithms**: Use **Token Bucket** or **Leaky Bucket** algorithms via Redis/API Gateway.
* **Granularity**: Apply rate limits by authenticated Tenant ID, User ID, or Client IP address.
* **Headers**: Return standard rate-limit HTTP headers on every response:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1771234567
Retry-After: 30
```

---

### 4. Graceful Process Shutdown

When container management platforms (Kubernetes, Docker Swarm, Dokploy) terminate or update a service replica, the process receives an OS signal (`SIGTERM`). Applications must perform a graceful shutdown sequence without dropping active user requests.

#### Graceful Shutdown Sequence
1. **Signal Interception**: Trap `SIGTERM` and `SIGINT` OS signals.
2. **Fail Readiness Probe**: Immediately mark `/healthz/readiness` as failing (`503 Service Unavailable`) so load balancers stop routing *new* requests to this instance.
3. **Connection Draining Window**: Wait for a 5-10 second propagation delay, then process existing in-flight HTTP/gRPC requests within a bounded grace window (e.g., 30s).
4. **Clean Resource Teardown**: Close database connection pools, flush log buffers, disconnect background queue listeners, and exit cleanly with code `0`.

```go
// ✅ CORRECT: Go HTTP server graceful shutdown handling SIGTERM
server := &http.Server{Addr: ":8080"}
quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

<-quit // Block until SIGTERM received
log.Info("Shutting down server gracefully...")

ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

if err := server.Shutdown(ctx); err != nil {
    log.Error("Forced shutdown due to timeout", "error", err)
}
```

---

### 5. Caching Strategies & Stampede Protection

Caching reduces database load and speeds up response times, but improper cache management causes stale data bugs and thundering herd outages.

#### The Cache-Aside Pattern
All application caching MUST use the Cache-Aside (Lazy Loading) pattern:

```text
Client ---> Application ---> Check Cache (Redis)
                                |
                   +------------+------------+
                   | Cache Hit               | Cache Miss
                   v                         v
            Return Cached Data        Fetch from Database
                                             |
                                     Write to Cache (with TTL)
                                             |
                                     Return Data to Client
```

#### Mandatory Time-To-Live (TTL)
* Every key written to a shared cache MUST specify an explicit TTL (e.g., 5 minutes, 1 hour).
* Permanent keys (`TTL = -1` or infinite) are strictly banned to prevent Redis memory exhaustion.

#### Cache Stampede Protection (Single-Flight)
When a high-traffic cache key expires, hundreds of concurrent requests may simultaneously experience a cache miss and fire identical expensive database queries. Applications MUST enforce **Request Coalescing** (single-flight execution) or distributed locks so only *one* worker computes the missing value while others wait for the cached result.
