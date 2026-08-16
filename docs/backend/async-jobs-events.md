# Background Jobs, Queues & Event Architecture Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-ASYNC-JOBS -->
## Backend Asynchronous Work & Event Architecture Rules
- Transactional Outbox Pattern: Backends MUST NOT publish events directly to message brokers (RabbitMQ, Kafka, AWS SQS) inside database transactions. State changes and outbound domain events MUST be written atomically to an outbox database table within the same transaction, then relayed asynchronously to the broker.
- Idempotent Message Processing: Consumers MUST enforce strict idempotency by recording processed message IDs or business idempotency keys in persistent storage before executing side effects. Duplicate message deliveries MUST NOT result in duplicate state mutations or external API calls.
- Dead-Letter Queues (DLQ) & Retry Policies: Retry policies MUST use exponential backoff with jitter and a maximum attempt threshold. Unrecoverable failures or messages exceeding retry thresholds MUST be routed to a Dead-Letter Queue (DLQ) with structured error context for manual investigation.
- Distributed Trace Context Propagation: Message publishers MUST inject W3C trace context (`traceparent`, `tracestate`) into message headers/metadata, and consumers MUST extract trace context to maintain continuous distributed tracing across asynchronous message boundaries.
- Message Ordering & Partitioning: Ordered event streams MUST partition messages using consistent partition keys (e.g., `tenant_id`, `aggregate_id`). Applications MUST NOT assume global message ordering across different aggregate instances or partitions.
<!-- END AGENT-STANDARD: BACKEND-ASYNC-JOBS -->
```

---

## Detailed Human Guide & Rationale

*(Stub Document: Topic structure outlined below for collaborative drafting)*

### 1. Transactional Outbox & Reliable Messaging
- Dual-write failure modes (DB transaction commits but broker write fails).
- Outbox table schema design, event relay worker polling vs Change Data Capture (CDC), and at-least-once delivery semantics.

### 2. Consumer Idempotency & De-duplication
- Consumer design patterns using unique message IDs and aggregate idempotency keys.
- Atomic check-and-insert idempotency storage patterns in relational and key-value stores.

### 3. Retry Strategies, Poison Pill Protection & DLQs
- Exponential backoff with full jitter formulas to prevent retry storms.
- Poison pill isolation, Dead-Letter Queue routing, alerting, and manual replay workflows.

### 4. Distributed Tracing & Telemetry across Queues
- W3C trace context header propagation across message producers, brokers, and consumers.
- Key telemetry metrics: consumer lag, queue depth, processing duration, and dead-letter count.

### 5. Message Ordering, Partitioning & Schema Evolution
- Partition key selection strategies to maintain per-aggregate event ordering.
- Backward and forward schema compatibility using schema registries (Protobuf, Avro, JSON Schema).

---

## Evidence & Primary Sources

- [Transactional Outbox Pattern (Microservices.io)](https://microservices.io/patterns/data/transactional-outbox.html): Canonical architectural pattern for atomic database updates and event publishing.
- [CloudEvents Specification v1.0.2](https://cloudevents.io/): CNCF specification for standardizing event metadata across services and systems.
- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/): Standard for propagating distributed tracing context over HTTP and message headers.
- [AWS SQS & Dead-Letter Queue Guidance](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html): Industry best practices for retry limits and message poison pill isolation.
