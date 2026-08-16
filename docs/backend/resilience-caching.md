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
- Enforce ingress rate limiting (token bucket / leaky bucket algorithm) at API gateways or service boundaries. Return HTTP `429 Too Many Requests` with `Retry-After` and standard `RateLimit-*` headers when limits are breached.
- Implement graceful process shutdown handling `SIGTERM` / `SIGINT` signals: immediately set readiness probes to fail (`503 Service Unavailable`), wait for load-balancer propagation delay (5s), drain active in-flight requests within a 30s window, close DB pools, and exit cleanly with code 0.
- Caching MUST follow the Cache-Aside pattern. Every cached key MUST have an explicit Time-To-Live (TTL). Permanent keys without TTLs are strictly prohibited.
- Protect against Cache Stampedes (thundering herd on cache misses) using single-flight request coalescing (`singleflight` / in-flight promise deduplication) or distributed locks.
- Shared/distributed caches (Redis/Memcached) MUST NOT store un-encrypted sensitive PII or session tokens without origin privacy boundaries.
<!-- END AGENT-STANDARD: BACKEND-RESILIENCE-CACHING -->
```

---

## Detailed Human Guide & Rationale

### 1. Network Timeouts & Exponential Backoff Retries

Distributed backends fail when downstream network calls hang indefinitely or when retry storms amplify minor glitches into catastrophic outages.

#### Polyglot Network Timeouts
Every outbound network call (HTTP client, gRPC channel, external API integration) MUST configure explicit connect, read, and write timeouts.

::: code-group
```typescript [TypeScript / Node.js]
// ✅ CORRECT: Explicit AbortController timeout bounds network waiting
export async function fetchWithTimeout(url: string, timeoutMs: number = 3000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

```go [Go]
// ✅ CORRECT: Explicit HTTP client and context timeout bounds
client := &http.Client{
    Timeout: 3 * time.Second, // Global request deadline
}

ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
defer cancel()

req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
resp, err := client.Do(req)
```

```python [Python / httpx]
# ✅ CORRECT: Explicit async client timeouts in httpx
import httpx

async def fetch_with_timeout(url: str) -> httpx.Response:
    limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
    timeouts = httpx.Timeout(timeout=3.0, connect=1.0) # 1s connect, 3s total
    
    async with httpx.AsyncClient(limits=limits, timeout=timeouts) as client:
        return await client.get(url)
```
:::

#### Exponential Backoff with Jitter
When retrying transient network failures (`503 Service Unavailable`, network timeout, connection reset), retries MUST add exponential backoff and randomized jitter to prevent synchronized retry storms from overwhelming recovering downstream services.

$$\text{Delay} = 2^{\text{attempt}} \times \text{base\_delay} + \text{random\_jitter}$$

* **Max Retries**: Cap retries at 2 or 3 attempts.
* **Non-Retryable Errors**: DO NOT retry 4xx HTTP client errors (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`).

```typescript
// ✅ CORRECT: Jittered exponential backoff retrying only transient 5xx/network errors
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 200
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      // Do NOT retry 4xx errors or final attempt
      if (err.status && err.status >= 400 && err.status < 500) throw err;
      if (attempt === maxRetries - 1) throw err;

      const exponentialBackoff = Math.pow(2, attempt) * baseDelayMs;
      const jitter = Math.random() * baseDelayMs;
      const delay = exponentialBackoff + jitter;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unreachable retry loop state");
}
```

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
* **Algorithms**: Use **Token Bucket** or **Leaky Bucket** algorithms via Redis / API Gateway.
* **Granularity**: Apply rate limits by authenticated Tenant ID, User ID, or Client IP address.
* **Headers**: Return standardized IETF headers (`RateLimit-*`) alongside legacy `X-RateLimit-*` headers:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 30
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1771234567

{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again in 30 seconds.",
  "details": [],
  "timestamp": "2026-08-16T11:15:00.000Z",
  "request_id": "req-99a8b7c6"
}
```

---

### 4. Graceful Process Shutdown

When container management platforms (Kubernetes, Dokploy) terminate or update a service replica, the process receives an OS signal (`SIGTERM`). Applications must perform a graceful shutdown sequence without dropping active user requests.

#### Graceful Shutdown Sequence
1. **Signal Interception**: Trap `SIGTERM` and `SIGINT` OS signals.
2. **Fail Readiness Probe**: Immediately mark `/healthz/readiness` as failing (`503 Service Unavailable`) so load balancers stop routing *new* requests to this instance.
3. **Propagation Delay Window**: Sleep for a 5-second window to allow ingress proxy / endpoints controller updates to propagate across the network cluster.
4. **Connection Draining Window**: Drain existing in-flight HTTP/gRPC requests within a bounded grace window (e.g., 30s).
5. **Clean Resource Teardown**: Close database connection pools, flush log buffers, disconnect queue listeners, and exit cleanly with code `0`.

::: code-group
```go [Go Server Shutdown]
// ✅ CORRECT: Go HTTP server graceful shutdown with readiness flip & propagation delay
var isReady atomic.Bool
isReady.Store(true)

http.HandleFunc("/healthz/readiness", func(w http.ResponseWriter, r *http.Request) {
    if !isReady.Load() {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }
    w.WriteHeader(http.StatusOK)
})

server := &http.Server{Addr: ":8080"}
quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

<-quit // Block until SIGTERM received
log.Info("SIGTERM received. Starting graceful shutdown sequence...")

// Step 1: Flip readiness probe to 503
isReady.Store(false)

// Step 2: Sleep for 5s cluster endpoint propagation delay
time.Sleep(5 * time.Second)

// Step 3: Drain in-flight requests within 30s timeout
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

if err := server.Shutdown(ctx); err != nil {
    log.Error("Forced shutdown due to timeout", "error", err)
}
log.Info("Server stopped cleanly")
```

```typescript [TypeScript / Express]
// ✅ CORRECT: Node.js / Express graceful shutdown sequence
let isReady = true;

app.get('/healthz/readiness', (req, res) => {
  if (!isReady) return res.status(503).send('Shutting down');
  res.status(200).send('OK');
});

const server = app.listen(8080);

async function gracefulShutdown(signal: string) {
  console.log(`${signal} received. Starting graceful shutdown...`);
  isReady = false; // Fail readiness probe

  // Sleep 5s for ingress propagation
  await new Promise((resolve) => setTimeout(resolve, 5000));

  server.close((err) => {
    if (err) {
      console.error('Error during HTTP server drain', err);
      process.exit(1);
    }
    console.log('HTTP server drained cleanly');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```
:::

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

#### Cache Stampede Protection (Single-Flight Coalescing)
When a high-traffic cache key expires, hundreds of concurrent requests may simultaneously experience a cache miss and fire identical expensive database queries. Applications MUST enforce **Request Coalescing** (single-flight execution) so only *one* worker computes the missing value while others wait for the single cached result.

::: code-group
```go [Go singleflight]
// ✅ CORRECT: Go singleflight coalesces duplicate concurrent cache misses
import "golang.org/x/sync/singleflight"

var requestGroup singleflight.Group

func GetProduct(ctx context.Context, id string) (*Product, error) {
    cacheKey := "product:" + id
    if val, err := cache.Get(ctx, cacheKey); err == nil {
        return val, nil
    }

    // Coalesce concurrent cache miss calls for the same key into 1 DB query
    v, err, _ := requestGroup.Do(cacheKey, func() (interface{}, error) {
        product, err := db.FetchProduct(ctx, id)
        if err != nil {
            return nil, err
        }
        cache.Set(ctx, cacheKey, product, 5*time.Minute)
        return product, nil
    })

    if err != nil {
        return nil, err
    }
    return v.(*Product), nil
}
```

```typescript [TypeScript In-Flight Map]
// ✅ CORRECT: TypeScript in-flight promise deduplication for cache stampede defense
const inFlightRequests = new Map<string, Promise<any>>();

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // If a request for this key is already in flight, await the existing promise
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const promise = (async () => {
    try {
      const data = await fetcher();
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
      return data;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}
```
:::

---

## Evidence / References

- [Michael T. Nygard — Release It! Design and Deploy Production-Ready Software (2nd Edition)](https://pragprog.com/titles/mne2/release-it-second-edition/): Definitive book establishing Circuit Breaker state machines, Bulkhead thread isolation, Timeouts, and Handshake patterns.
- [Marc Brooker (2015) — AWS Builders' Library: Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/): Primary architectural reference for randomized jitter algorithms in distributed retries.
- [RFC 9110: HTTP Semantics — Section 15.5.30 (429 Too Many Requests) & Section 10.2.3 (Retry-After)](https://www.rfc-editor.org/rfc/rfc9110#section-15.5.30): Official IETF spec for rate limiting response codes and retry headers.
- [IETF Internet-Draft — RateLimit Header Fields for HTTP](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/): Standardized HTTP headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) for rate limiting transparency.
- [WHATWG Fetch Standard — AbortController Interface](https://dom.spec.whatwg.org/#interface-abortcontroller): Standard specification for canceling in-flight HTTP requests and setting timeouts in modern JavaScript environments.
- [Kubernetes Documentation — Pod Termination Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination): Official Kubernetes lifecycle guide detailing `SIGTERM`, readiness probe failure, and connection draining windows.
- [Martin Fowler — Cache-Aside Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside): Authoritative architectural guide for lazy-loading cache management.
- [Redis Documentation — EXPIRE & Eviction Policies](https://redis.io/docs/latest/develop/reference/eviction/): Official Redis spec for key Time-To-Live (TTL) and memory management under maxmemory limits.
- [Vattani et al. (2015) — Optimal Probabilistic Cache Stampede Prevention (VLDB)](https://vldb.org/pvldb/vol8/p886-vattani.pdf): Peer-reviewed research paper establishing cache stampede mechanics and request coalescing / single-flight solutions.
- [Go x/sync/singleflight Package](https://pkg.go.dev/golang.org/x/sync/singleflight): Official Go synchronization package for duplicate call suppression and cache stampede prevention.
