# Structured Logging & Telemetry Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-LOGGING-OBSERVABILITY -->
## Logging, Telemetry & Observability Rules
- Output ALL application logs to `stdout`/`stderr` as structured JSON objects containing standard fields: `timestamp` (ISO-8601 UTC), `level` (`DEBUG`/`INFO`/`WARN`/`ERROR`/`FATAL`), `service`, `message`, `trace_id`, `span_id`, and `request_id`.
- Never write un-structured plain text logs or print statements (`console.log`, `fmt.Println`, `print()`) in production backend code.
- Extract or generate a correlation `request_id` and OpenTelemetry `trace_id` at service ingress middleware. Propagate distributed trace context (`traceparent` / `tracestate` headers) on all outgoing HTTP, gRPC, and asynchronous message queue requests.
- Automatically redact sensitive data (passwords, tokens, API keys, credit cards, SSNs, and user PII) prior to log output using automated logger sanitization filters (`redact` paths / `ReplaceAttr` / structlog processors).
- Expose dual HTTP health check endpoints:
  - `/healthz/liveness`: Lightweight process responsiveness probe. Returns `200 OK` if the process loop is running. MUST NOT perform database or external network I/O.
  - `/healthz/readiness`: Dependency health probe. Verifies database, cache, and message broker connectivity. Returns `200 OK` when ready to serve traffic, or `503 Service Unavailable` when backing dependencies fail.
- Instrument application metrics aligned with OpenTelemetry (OTLP) standards, covering the 4 Golden Signals: Latency (P50/P95/P99), Traffic (RPS), Errors (error rate / 5xx count), and Saturation (connection pool / memory / CPU utilization).
<!-- END AGENT-STANDARD: BACKEND-LOGGING-OBSERVABILITY -->
```

---

## Detailed Human Guide & Rationale

### 1. Structured JSON Logging Baseline

In distributed production environments, plain text logs are impossible to query, filter, or correlate efficiently across hundreds of microservice instances. All backend applications must write structured JSON logs to standard output (`stdout` for `INFO`/`WARN`/`DEBUG`, `stderr` for `ERROR`/`FATAL`), allowing log collectors (Fluentbit, Logstash, Vector) to ingest logs without fragile regex parsing.

#### Standard Schema Requirement
Every log entry MUST contain the following standardized root fields:

| Field Name | Type | Description | Example |
|---|---|---|---|
| `timestamp` | `string` | ISO-8601 UTC timestamp with millisecond precision | `"2026-08-16T08:30:00.123Z"` |
| `level` | `string` | Severity level in uppercase (`DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`) | `"INFO"` |
| `service` | `string` | Canonical name of the emitting microservice | `"order-service"` |
| `message` | `string` | Human-readable explanation of the log event | `"Order processed successfully"` |
| `trace_id` | `string` | OpenTelemetry 128-bit W3C trace ID for distributed tracing | `"4bf92f3577b34da6a3ce929d0e0e4736"` |
| `span_id` | `string` | OpenTelemetry 64-bit W3C span ID for current operation | `"00f067aa0ba902b7"` |
| `request_id` | `string` | Unique HTTP/gRPC request identifier | `"req_01h8x9p3z5k7m2n4"` |

```json
{
  "timestamp": "2026-08-16T08:30:00.123Z",
  "level": "INFO",
  "service": "order-service",
  "message": "Order completed",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "request_id": "req_01h8x9p3z5k7m2n4",
  "context": {
    "order_id": "ord_99812",
    "user_id": "usr_4412",
    "amount_cents": 4999
  }
}
```

#### Polyglot Logger Initialization
::: code-group
```typescript [TypeScript / Pino]
// ✅ CORRECT: Node.js Pino structured JSON logger setup with redaction
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'order-service' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['password', 'token', 'credit_card', 'headers.authorization', 'body.password'],
    censor: '[REDACTED]'
  }
});
```

```go [Go / log/slog]
// ✅ CORRECT: Go slog structured JSON logger with ReplaceAttr sanitization
package logger

import (
    "log/slog"
    "os"
    "strings"
)

func NewLogger() *slog.Logger {
    handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
        ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
            key := strings.ToLower(a.Key)
            if key == "password" || key == "token" || key == "authorization" || key == "secret" {
                return slog.String(a.Key, "[REDACTED]")
            }
            return a
        },
    })
    return slog.New(handler).With("service", "order-service")
}
```

```python [Python / structlog]
# ✅ CORRECT: Python structlog JSON logger setup
import structlog
import logging

def add_service_name(logger, method_name, event_dict):
    event_dict["service"] = "order-service"
    return event_dict

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        add_service_name,
        structlog.processors.JSONRenderer()
    ],
    logger_factory=structlog.PrintLoggerFactory()
)
logger = structlog.get_logger()
```
:::

---

### 2. Distributed Trace Context Propagation

To trace a single user request as it traverses multiple backend services, databases, and async queues, applications must implement **Distributed Tracing** adhering to the W3C TraceContext specification.

#### Context Propagation Rules
1. **Ingress Middleware**: Intercept incoming HTTP headers (`traceparent`, `tracestate`, `x-request-id`). If present, adopt the incoming `trace_id`; if missing, generate a new 128-bit trace ID.
2. **Context Association**: Bind the `trace_id` and `span_id` to the request execution context (e.g., Go `context.Context`, Node.js `AsyncLocalStorage`, Python `contextvars`).
3. **Egress Propagation**: Inject the active `traceparent` header into all outgoing HTTP requests, gRPC metadata, and message queue headers (Kafka/RabbitMQ).

```http
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

::: code-group
```typescript [TypeScript / AsyncLocalStorage Middleware]
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export interface RequestContext {
  requestId: string;
  traceId: string;
}

export const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export function traceMiddleware(req: any, res: any, next: any) {
  const traceparent = req.headers['traceparent'] as string;
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  
  // Extract or generate trace_id from W3C traceparent (00-traceid-spanid-flags)
  const traceId = traceparent ? traceparent.split('-')[1] : randomUUID().replace(/-/g, '');

  asyncLocalStorage.run({ requestId, traceId }, () => {
    res.setHeader('x-request-id', requestId);
    next();
  });
}
```

```python [Python / contextvars FastAPI Middleware]
import uuid
from contextvars import ContextVar
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")
trace_id_ctx: ContextVar[str] = ContextVar("trace_id", default="")

class TraceContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        traceparent = request.headers.get("traceparent")
        trace_id = traceparent.split("-")[1] if traceparent else uuid.uuid4().hex

        request_id_ctx.set(req_id)
        trace_id_ctx.set(trace_id)

        response: Response = await call_next(request)
        response.headers["x-request-id"] = req_id
        return response
```
:::

---

### 3. Automated PII & Secret Redaction

Logging sensitive user data or credentials introduces massive compliance risks (GDPR, HIPAA, PCI-DSS, NIST SP 800-92) and severe security vulnerabilities.

#### Sanitization Invariants
Log sanitizers MUST intercept and mask sensitive values automatically via logger configuration, never relying on manual inline call-site masking.

* **High-Risk Fields**: Passwords, API keys, bearer tokens, credit card numbers (PAN), Social Security Numbers (SSN), OAuth client secrets, and private keys.
* **PII Fields**: Email addresses, phone numbers, home addresses, and personal identification codes.

```typescript
// ❌ WRONG: Manual call-site masking is error-prone and misses unhandled fields
logger.info("User login attempt", { email: maskEmail(req.body.email), password: req.body.password });

// ✅ CORRECT: Automated logger middleware/redaction filters scrub sensitive keys automatically
logger.info({ email: req.body.email, password: req.body.password }, "User login attempt");
// Emits: {"level":"INFO","message":"User login attempt","email":"user@example.com","password":"[REDACTED]"}
```

---

### 4. Dual Health Check Probes

Container orchestrators (Kubernetes, Dokploy) rely on health check probes to determine container lifecycle actions (restarts, traffic routing). Backend applications MUST expose two separate health check endpoints.

#### 1. Liveness Probe (`/healthz/liveness`)
* **Purpose**: Indicates whether the application process is running and responsive.
* **Implementation**: Extremely lightweight. Checks if the HTTP server event loop or worker thread pool can respond.
* **Invariants**: MUST NOT query databases, Redis, or external APIs. A database outage should **not** cause Kubernetes to restart application containers repeatedly.

#### 2. Readiness Probe (`/healthz/readiness`)
* **Purpose**: Indicates whether the application is ready to accept user traffic.
* **Implementation**: Performs fast ping checks against critical backing services (e.g., database connection pool, Redis cache, message broker).
* **Behavior**: Returns `200 OK` when dependencies are healthy. Returns `503 Service Unavailable` if a backing dependency fails, prompting load balancers to temporarily divert traffic away from the container.

::: code-group
```go [Go Health Check Handler]
// ✅ CORRECT: Go Dual Health Probe Handlers
func RegisterHealthRoutes(mux *http.ServeMux, db *sql.DB, rdb *redis.Client) {
    // Lightweight liveness probe (NO DB/network I/O)
    mux.HandleFunc("/healthz/liveness", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status":"UP"}`))
    })

    // Dependency readiness probe
    mux.HandleFunc("/healthz/readiness", func(w http.ResponseWriter, r *http.Request) {
        ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
        defer cancel()

        if err := db.PingContext(ctx); err != nil {
            w.WriteHeader(http.StatusServiceUnavailable) // 503
            w.Write([]byte(`{"status":"DOWN","reason":"db_unreachable"}`))
            return
        }

        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status":"UP"}`))
    })
}
```

```typescript [TypeScript Express Health Routes]
// ✅ CORRECT: Node.js Express Dual Health Probes
app.get('/healthz/liveness', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.get('/healthz/readiness', async (req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'UP' });
  } catch (err) {
    res.status(503).json({ status: 'DOWN', reason: 'database_unavailable' });
  }
});
```
:::

---

### 5. OpenTelemetry & Golden Signals Baseline

Applications must emit operational metrics aligned with **OpenTelemetry (OTLP)** semantic conventions covering Google SRE's **Four Golden Signals**:

| Golden Signal | OpenTelemetry Instrument | Metric Name Example | Description |
| :--- | :--- | :--- | :--- |
| **Latency** | `Histogram` | `http.server.request.duration` | Request duration distribution in seconds (P50, P95, P99). |
| **Traffic** | `Counter` | `http.server.requests` | Total request count partitioned by method, route, and status code. |
| **Errors** | `Counter` | `http.server.errors` / 5xx count | Unhandled exception rate and 5xx HTTP response counts. |
| **Saturation** | `Gauge` | `db.client.connections.usage` | Active database pool connection ratio, CPU, and memory utilization. |

#### OTLP Telemetry Export Configuration
Applications SHOULD export metrics and traces to an OpenTelemetry Collector via standard OTLP protocols:
- **gRPC Exporter**: `http://localhost:4317`
- **HTTP Exporter**: `http://localhost:4318/v1/metrics`

---

## Evidence / References

- [W3C Trace Context Recommendation](https://www.w3.org/TR/trace-context/): Official W3C standard defining the `traceparent` and `tracestate` HTTP headers for distributed request correlation.
- [OpenTelemetry Specification & Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/): Official OpenTelemetry standard for OTLP protocol, metric instruments, and standard attribute naming.
- [Google SRE Handbook — Chapter 6: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/): Primary reference for the Four Golden Signals (Latency, Traffic, Errors, Saturation).
- [NIST SP 800-92 — Guide to Computer Security Log Management](https://csrc.nist.gov/pubs/sp/800/92/final): Government standard governing log content, correlation identifiers, and audit trail requirements.
- [Kubernetes Documentation — Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/): Official specification for container health check probe behavior and status code expectations.
- [OWASP Proactive Controls — C3: Log Security and Privacy](https://owasp.org/www-project-proactive-controls/v3/en/c3-log-security-privacy): OWASP security guidelines for automated PII masking, log sanitization, and audit integrity.
- [ISO/IEC 27001:2022 Control A.8.11 — Data Masking](https://www.iso.org/standard/27001): International security management standard for protecting sensitive data in telemetry logs.
