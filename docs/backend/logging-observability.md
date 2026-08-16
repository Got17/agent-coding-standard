# Structured Logging & Telemetry Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-LOGGING-OBSERVABILITY -->
## Logging, Telemetry & Observability Rules
- Output ALL application logs to `stdout`/`stderr` as structured JSON objects containing standard fields: `timestamp` (ISO-8601 UTC), `level` (`DEBUG`/`INFO`/`WARN`/`ERROR`/`FATAL`), `service`, `message`, `trace_id`, `span_id`, and `request_id`.
- Never write un-structured plain text logs or print statements (`console.log`, `fmt.Println`, `print()`) in production backend code.
- Extract or generate a correlation `request_id` and OpenTelemetry `trace_id` at service ingress middleware. Propagate distributed trace context (`traceparent` / `tracestate` headers) on all outgoing HTTP, gRPC, and asynchronous message queue requests.
- Automatically redact sensitive data (passwords, tokens, API keys, credit cards, SSNs, and user PII) prior to log output using automated log sanitization filters.
- Expose dual HTTP health check endpoints:
  - `/healthz/liveness`: Lightweight process responsiveness probe. Returns `200 OK` if the process loop is running. MUST NOT perform database or external network I/O.
  - `/healthz/readiness`: Dependency health probe. Verifies database, cache, and message broker connectivity. Returns `200 OK` when ready to serve traffic, or `530 Service Unavailable` when backing dependencies fail.
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

---

### 2. Trace Context Propagation

To trace a single user request as it traverses multiple backend services, databases, and async queues, applications must implement **Distributed Tracing** adhering to the W3C TraceContext specification.

#### Context Propagation Rules
1. **Ingress Middleware**: Intercept incoming HTTP headers (`traceparent`, `tracestate`, `x-request-id`). If present, adopt the incoming `trace_id`; if missing, generate a new 128-bit trace ID.
2. **Context Association**: Bind the `trace_id` and `span_id` to the request execution context (e.g., Go `context.Context`, Node.js `AsyncLocalStorage`, Python `contextvars`).
3. **Egress Propagation**: Inject the active `traceparent` header into all outgoing HTTP requests, gRPC metadata, and message queue headers (Kafka/RabbitMQ).

```http
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

---

### 3. Automated PII & Secret Redaction

Logging sensitive user data or credentials introduces massive compliance risks (GDPR, HIPAA, PCI-DSS) and security vulnerabilities.

#### Sanitization Invariants
Log sanitizers MUST intercept and mask sensitive values prior to JSON serialization.

* **High-Risk Fields**: Passwords, API keys, bearer tokens, credit card numbers (PAN), Social Security Numbers (SSN), OAuth client secrets, and private keys.
* **PII Fields**: Email addresses, phone numbers, home addresses, and personal identification codes.

```typescript
// ❌ WRONG: Logging payload directly exposes raw password
logger.info("User login attempt", { email: req.body.email, password: req.body.password });

// ✅ CORRECT: Logger automatically redacts sensitive keys via middleware/sanitizer
logger.info("User login attempt", { email: maskEmail(req.body.email), password: "[REDACTED]" });
```

---

### 4. Dual Health Check Probes

Container orchestrators (Kubernetes, Docker Swarm, Dokploy) rely on health check probes to determine container lifecycle actions (restarts, traffic routing). Backend applications MUST expose two separate health check endpoints.

#### 1. Liveness Probe (`/healthz/liveness`)
* **Purpose**: Indicates whether the application process is running and responsive.
* **Implementation**: Extremely lightweight. Checks if the HTTP server event loop or worker thread pool can respond.
* **Invariants**: MUST NOT query databases, Redis, or external APIs. A database outage should **not** cause Kubernetes to restart application containers repeatedly.

#### 2. Readiness Probe (`/healthz/readiness`)
* **Purpose**: Indicates whether the application is ready to accept user traffic.
* **Implementation**: Performs fast ping checks against critical backing services (e.g., database connection pool, Redis cache, message broker).
* **Behavior**: Returns `200 OK` when dependencies are healthy. Returns `530 Service Unavailable` or `503 Service Unavailable` if a backing dependency fails, prompting load balancers to temporarily divert traffic away from the container.

---

### 5. OpenTelemetry & Golden Signals Baseline

Applications must emit operational metrics following the **Four Golden Signals** defined in Google's Site Reliability Engineering (SRE) principles:

1. **Latency**: Time taken to service a request. Track P50, P95, and P99 latency histograms for fast endpoints vs slow tails.
2. **Traffic**: Measure of demand on the system (e.g., HTTP requests per second, gRPC calls/sec, background jobs processed/min).
3. **Errors**: Rate of requests that fail (e.g., HTTP 5xx responses, unhandled exceptions, failed DB queries).
4. **Saturation**: Utilization of system resources (e.g., connection pool usage ratio, CPU/memory usage, worker thread utilization).
