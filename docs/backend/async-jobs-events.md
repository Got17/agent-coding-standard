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

### 1. Transactional Outbox & Reliable Messaging

Publishing events directly to a message broker during a database transaction creates a dual-write failure mode: if the transaction commits but the broker publish fails (or vice versa), the system is left in an inconsistent state. The **Transactional Outbox Pattern** solves this by writing the event payload to an `outbox` table within the exact same database transaction that modifies the business entity. A separate background worker or Change Data Capture (CDC) process then polls the outbox and publishes the messages to the broker, ensuring at-least-once delivery.

```text
[ Business Service ]
       │
       │ (1) Begin Tx
       ├──▶ [ Update Business Table ]
       ├──▶ [ Insert Outbox Table   ]
       │ (2) Commit Tx
       ▼
[ Outbox Relay / CDC Worker ] ──(3) Poll/Stream──▶ [ Message Broker ]
```

#### Outbox Table Schema
The outbox table captures pending domain events atomically alongside business writes. A background relay worker or CDC connector reads from this table and publishes to the broker.

```sql
-- Outbox table schema (PostgreSQL)
CREATE TABLE outbox_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,      -- e.g. 'Order', 'User'
    aggregate_id   VARCHAR(100) NOT NULL,      -- Business entity ID
    event_type     VARCHAR(100) NOT NULL,      -- e.g. 'OrderCreated'
    payload        JSONB        NOT NULL,      -- Serialized event body
    trace_metadata JSONB        NULL,          -- W3C traceparent/tracestate for relay
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    published_at   TIMESTAMPTZ  NULL           -- NULL = not yet relayed
);

CREATE INDEX idx_outbox_unpublished ON outbox_events (created_at)
    WHERE published_at IS NULL;
```

#### CDC vs Polling Relay Tradeoffs

| Approach | Mechanism | Latency | Complexity | When to Use |
|----------|-----------|---------|------------|-------------|
| **Polling Relay** | Background worker queries `WHERE published_at IS NULL` on an interval | 1–5s typical | Low — simple `SELECT` + `UPDATE` loop | Moderate event volume, simpler ops |
| **CDC (Debezium)** | Streams database transaction log (WAL/binlog) to Kafka topics | Sub-second | Higher — requires Kafka Connect infrastructure | High throughput, strict ordering needs |

#### Polyglot Transactional Outbox
When updating an entity, insert a corresponding event record in the same transaction.

::: code-group
```typescript [TypeScript / Node.js (Prisma)]
// ✅ CORRECT: Atomic outbox insert with trace context in the same transaction
import { propagation, context } from '@opentelemetry/api';

export async function createUserWithOutbox(prisma: PrismaClient, userDto: any) {
  // Capture trace context from the active HTTP request span
  const traceHeaders: Record<string, string> = {};
  propagation.inject(context.active(), traceHeaders);

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: userDto });
    
    await tx.outboxEvent.create({
      data: {
        eventType: 'UserCreated',
        aggregateId: user.id,
        payload: JSON.stringify(user),
        traceMetadata: JSON.stringify(traceHeaders),
        createdAt: new Date()
      }
    });
    
    return user;
  });
}
```

```go [Go (GORM)]
// ✅ CORRECT: GORM transaction inserting both user and event with trace context
import "go.opentelemetry.io/otel/propagation"

func CreateUserWithOutbox(ctx context.Context, db *gorm.DB, user *User) error {
	// Serialize active trace context for relay worker
	carrier := propagation.MapCarrier{}
	otel.GetTextMapPropagator().Inject(ctx, carrier)

	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(user).Error; err != nil {
			return err
		}

		event := OutboxEvent{
			EventType:     "UserCreated",
			AggregateID:   user.ID,
			Payload:       toJSON(user),
			TraceMetadata: toJSON(carrier),
			CreatedAt:     time.Now(),
		}
		
		if err := tx.Create(&event).Error; err != nil {
			return err
		}
		return nil
	})
}
```

```python [Python (SQLAlchemy)]
# ✅ CORRECT: SQLAlchemy session updating aggregate and outbox with trace context
from opentelemetry import propagate

def create_user_with_outbox(session: Session, user_data: dict):
    # Capture active trace context for relay worker
    trace_headers: dict = {}
    propagate.inject(trace_headers)

    user = User(**user_data)
    session.add(user)
    session.flush() # get user.id

    event = OutboxEvent(
        event_type="UserCreated",
        aggregate_id=user.id,
        payload=json.dumps(user_data),
        trace_metadata=json.dumps(trace_headers),
        created_at=datetime.now(timezone.utc)
    )
    session.add(event)
    session.commit()
    return user
```
:::

---

### 2. Consumer Idempotency & De-duplication

Message brokers typically guarantee *at-least-once* delivery. This means consumers will occasionally receive duplicate messages due to network retries, broker failovers, or unacknowledged deliveries. Consumers must implement the **Idempotent Receiver** pattern: processing the same message twice must have the same effect as processing it once. This is typically achieved by recording the message ID or a deterministic business idempotency key in the database before or during processing.

#### Polyglot Idempotent Consumers
Use atomic unique constraint violations (not read-then-write checks) to prevent duplicate processing under concurrent delivery. A `SELECT` followed by `INSERT` is vulnerable to race conditions under `READ COMMITTED` isolation — two concurrent consumers can both pass the `SELECT` check before either inserts.

::: code-group
```typescript [TypeScript / PostgreSQL]
// ✅ CORRECT: Atomic upsert — unique constraint prevents race conditions
async function processMessage(tx: Prisma.TransactionClient, msg: Message) {
  // Atomic insert-or-skip using unique constraint on msg.id
  const result = await tx.$executeRaw`
    INSERT INTO processed_messages (id, processed_at)
    VALUES (${msg.id}, NOW())
    ON CONFLICT (id) DO NOTHING
  `;
  
  if (result === 0) {
    console.log(`Message ${msg.id} already processed. Skipping.`);
    return;
  }
  
  await executeBusinessLogic(tx, msg);
}
```

```go [Go (PostgreSQL)]
// ✅ CORRECT: Atomic INSERT ... ON CONFLICT prevents race conditions
func ProcessMessageIdempotent(db *gorm.DB, msgID string, handler func(tx *gorm.DB) error) error {
    return db.Transaction(func(tx *gorm.DB) error {
        // Atomic upsert: unique constraint on id prevents duplicates
        result := tx.Exec(
            "INSERT INTO processed_messages (id, processed_at) VALUES (?, NOW()) ON CONFLICT (id) DO NOTHING",
            msgID,
        )
        if result.RowsAffected == 0 {
            log.Printf("Message %s already processed", msgID)
            return nil
        }
        
        return handler(tx)
    })
}
```

```python [Python (SQLAlchemy / PostgreSQL)]
# ✅ CORRECT: Atomic ON CONFLICT DO NOTHING — no rollback needed
from sqlalchemy.dialects.postgresql import insert as pg_insert

def process_message(session: Session, msg_id: str, data: dict):
    stmt = pg_insert(ProcessedMessage).values(id=msg_id, processed_at=datetime.now(timezone.utc))
    stmt = stmt.on_conflict_do_nothing(index_elements=["id"])
    result = session.execute(stmt)

    if result.rowcount == 0:
        logger.info(f"Duplicate message {msg_id}")
        return

    execute_business_logic(session, data)
    session.commit()
```
:::

---

### 3. Retry Strategies, Poison Pill Protection & DLQs

When message processing fails, immediate back-to-back retries can overwhelm degraded downstream services (retry storms). Background jobs and queue consumers must use **Exponential Backoff with Jitter** for transient failures. 

$$\text{Delay} = \text{random}(0, 2^{\text{attempt}} \times \text{base\_delay})$$

However, non-transient errors (like malformed JSON, known as a "Poison Pill") should never be retried. When the maximum retry threshold is reached, or a non-retryable error occurs, the message must be routed to a **Dead-Letter Queue (DLQ)** along with its error context (stack trace, attempt count, timestamp) to enable manual inspection and replay.

#### Polyglot Retry and DLQ Logic
Detect non-retryable errors immediately, and route terminal failures to a DLQ.

::: code-group
```typescript [TypeScript / AWS SQS]
// ✅ CORRECT: Returning success for non-retryable to let DLQ mapping handle it, or explicitly moving
async function handleSqsEvent(record: SQSRecord) {
  try {
    const payload = JSON.parse(record.body); // May throw SyntaxError (Poison Pill)
    await processJob(payload);
  } catch (err) {
    if (err instanceof SyntaxError || err.isTerminal) {
      // Send to DLQ immediately or ack to prevent retries
      await routeToDLQ(record, err);
      return; 
    }
    throw err; // Let consumer framework apply exponential backoff
  }
}
```

```go [Go (RabbitMQ)]
// ✅ CORRECT: Nack with requeue=false sends to DLX/DLQ
func consume(msg amqp.Delivery) {
    err := processMsg(msg.Body)
    if err != nil {
        if isTerminalError(err) {
            // Nack without requeue triggers Dead-Letter Exchange (DLX) routing
            msg.Nack(false, false)
            return
        }
        // Transient error - framework/consumer handles requeue + delay
        msg.Nack(false, true)
        return
    }
    msg.Ack(false)
}
```

```python [Python (Celery)]
# ✅ CORRECT: Celery retry with exponential backoff and jitter
@app.task(bind=True, autoretry_for=(TransientError,), retry_backoff=True, retry_backoff_max=600, retry_jitter=True, max_retries=5)
def process_job(self, data):
    try:
        execute_task(data)
    except TerminalError as e:
        # Route to DLQ or mark as permanently failed
        send_to_dlq(data, str(e))
        # Do not raise to avoid retries
```
:::

---

### 4. Distributed Tracing & Telemetry across Queues

Asynchronous boundaries break traditional HTTP request-scoped tracing. To maintain end-to-end visibility across producer, broker, and consumer, applications must propagate **W3C Trace Context** (`traceparent` and `tracestate`) by injecting these identifiers into the message broker's header or metadata attributes. Consumers must extract this context and start a new child span linked to the producer's trace.

#### Polyglot Trace Context Propagation
When using the Transactional Outbox pattern, the relay worker runs in a separate process from the original HTTP request. Inject trace context from the **outbox `trace_metadata` column** (persisted during the original transaction — see Section 1), not from `context.active()` which will be empty in the relay worker.

::: code-group
```typescript [TypeScript / Outbox Relay Worker]
// ✅ CORRECT: Relay worker extracts trace context from outbox row, not context.active()
import { propagation, context, ROOT_CONTEXT } from '@opentelemetry/api';

async function relayOutboxEvent(event: OutboxEvent) {
  // Restore trace context from the outbox row's persisted headers
  const savedHeaders = JSON.parse(event.traceMetadata);
  const restoredCtx = propagation.extract(ROOT_CONTEXT, savedHeaders);

  // Publish with the original request's trace context
  const brokerHeaders: Record<string, string> = {};
  propagation.inject(restoredCtx, brokerHeaders);

  await broker.publish(event.eventType, {
    payload: event.payload,
    headers: brokerHeaders
  });
}
```

```go [Go (Outbox Relay Worker)]
// ✅ CORRECT: Relay worker extracts saved trace context from outbox row
import "go.opentelemetry.io/otel/propagation"

func RelayOutboxEvent(event OutboxEvent) error {
    // Restore trace context from persisted outbox metadata (JSON)
    var headers map[string]string
    if err := json.Unmarshal([]byte(event.TraceMetadata), &headers); err != nil {
        return fmt.Errorf("unmarshal trace metadata: %w", err)
    }
    savedCarrier := propagation.MapCarrier(headers)
    ctx := otel.GetTextMapPropagator().Extract(context.Background(), savedCarrier)

    // Inject restored context into broker message headers
    brokerHeaders := propagation.MapCarrier{}
    otel.GetTextMapPropagator().Inject(ctx, brokerHeaders)

    return broker.Publish(event.EventType, event.Payload, brokerHeaders)
}
```

```python [Python (Outbox Relay Worker)]
# ✅ CORRECT: Relay worker restores trace context from outbox metadata
from opentelemetry import propagate
from opentelemetry.context import Context

def relay_outbox_event(event: OutboxEvent):
    saved_headers = json.loads(event.trace_metadata)
    restored_ctx = propagate.extract(carrier=saved_headers)

    broker_headers: dict = {}
    propagate.inject(broker_headers, context=restored_ctx)

    broker.publish(event.event_type, payload=event.payload, headers=broker_headers)
```
:::

##### Consumer-Side Extraction
Consumers extract the propagated trace context from broker message headers and start a child span:

::: code-group
```typescript [TypeScript / Consumer]
// ✅ CORRECT: Consumer extracts trace context from message headers
import { propagation, context, ROOT_CONTEXT, trace } from '@opentelemetry/api';

async function handleMessage(msg: BrokerMessage) {
  const parentCtx = propagation.extract(ROOT_CONTEXT, msg.headers);
  const tracer = trace.getTracer('consumer');
  const span = tracer.startSpan('process_message', {}, parentCtx);

  try {
    await processBusinessLogic(msg.payload);
  } finally {
    span.end();
  }
}
```

```go [Go (Consumer)]
// ✅ CORRECT: Extracting trace context in consumer
import "go.opentelemetry.io/otel/propagation"

func ConsumeMessage(ctx context.Context, headers map[string]string) {
    carrier := propagation.MapCarrier(headers)
    ctx = otel.GetTextMapPropagator().Extract(ctx, carrier)

    ctx, span := otel.Tracer("consumer").Start(ctx, "process_message")
    defer span.End()

    // business logic with ctx...
}
```

```python [Python (Consumer)]
# ✅ CORRECT: Consumer extracts trace context from broker headers
from opentelemetry import propagate, trace

def handle_message(msg):
    restored_ctx = propagate.extract(carrier=msg.headers)
    tracer = trace.get_tracer("consumer")
    with tracer.start_as_current_span("process_message", context=restored_ctx):
        process_business_logic(msg.payload)
```
:::

#### Operational Metrics & Alerting
Beyond tracing, production async systems require monitoring that maps to the SRE Golden Signals. Alert on the following metrics:

| Metric | Description | Alert Threshold (Example) |
|--------|-------------|---------------------------|
| **Consumer Lag** | Offset gap between latest produced message and latest consumed message per partition | > 10,000 messages for > 5 min |
| **Queue Depth** | Total number of messages waiting to be processed | > 50,000 messages sustained |
| **Message Processing Duration** | p95/p99 time from dequeue to acknowledgment | p99 > 30s |
| **DLQ Depth** | Number of messages in the Dead-Letter Queue | > 0 (immediate alert) |
| **Consumer Group Rebalance Rate** | Frequency of Kafka consumer group rebalances | > 2 rebalances / hour |

Consumer group **rebalancing** (Kafka) temporarily pauses consumption while partitions are redistributed among consumer instances. Frequent rebalances — caused by long processing times exceeding `max.poll.interval.ms`, unstable consumer instances, or aggressive scaling — degrade throughput and increase end-to-end latency. Configure `session.timeout.ms`, `heartbeat.interval.ms`, and `max.poll.records` to minimize unnecessary rebalances.

---

### 5. Message Ordering, Partitioning & Schema Evolution

Global message ordering across an entire queue is fundamentally unscalable and limits throughput to a single consumer. Instead, ordered event streams (like Apache Kafka or AWS Kinesis) use **Partitioning**. Messages that require sequential processing must share a consistent partition key (e.g., `tenant_id` or `aggregate_id`). This guarantees strict ordering per aggregate while allowing global parallel processing across different partitions.

Furthermore, as domain logic changes, event structures evolve. Systems must employ backward and forward compatibility for event payloads, often enforced by Schema Registries (e.g., Avro, Protobuf, or JSON Schema) to ensure older consumers can read newer events, and vice versa.

#### At-Least-Once vs Exactly-Once Delivery
Most message brokers guarantee **at-least-once** delivery: the broker will redeliver a message until the consumer acknowledges it, meaning duplicates are possible. **Exactly-once** semantics (available in Apache Kafka via idempotent producers + transactional consumers) eliminate duplicates at the broker level but add complexity and latency. In practice, design consumers to be idempotent (Section 2) regardless of broker guarantees — this provides correctness even during broker upgrades, failovers, or cross-system message forwarding where exactly-once guarantees do not apply.

#### Polyglot Partitioning & Ordering
Ensure messages for the same aggregate use a deterministic partition/routing key.

::: code-group
```typescript [TypeScript / KafkaJS]
// ✅ CORRECT: Explicit partition key (key) for aggregate ordering
await producer.send({
  topic: 'orders-events',
  messages: [
    { 
      key: orderId, // Guarantees all events for this order go to the same partition
      value: JSON.stringify(orderEvent) 
    }
  ],
});
```

```go [Go (AWS Kinesis)]
// ✅ CORRECT: PartitionKey assignment in Kinesis
input := &kinesis.PutRecordInput{
    Data:         payload,
    PartitionKey: aws.String(aggregateID), // Orders shards by aggregate
    StreamName:   aws.String("domain-events"),
}
_, err := kinesisClient.PutRecord(input)
```

```python [Python (Confluent Kafka)]
# ✅ CORRECT: Providing key for ordering + Schema Registry compatibility
producer.produce(
    topic='user-updates',
    key=user_id, # Partition key
    value=avro_serializer(user_event, SerializationContext('user-updates-value', MessageField.VALUE)),
    on_delivery=delivery_report
)
```
:::

#### Event Metadata Standardization (CloudEvents)
Event payloads published across services SHOULD conform to the **CNCF CloudEvents** specification. CloudEvents defines a minimal set of required attributes (`id`, `source`, `type`, `specversion`) that standardize event metadata across heterogeneous systems, eliminating per-team ad-hoc envelope formats.

#### Event-Driven API Contracts (AsyncAPI)
Just as REST APIs use OpenAPI 3.1 for contract documentation, event-driven interfaces SHOULD be documented using the **AsyncAPI** specification. AsyncAPI defines channels, message schemas, bindings (Kafka, AMQP, SQS), and security schemes, enabling machine-readable contracts for async APIs and automated code generation.

#### Distributed Transactions: Saga Pattern
When a business operation spans multiple services (e.g., Order → Payment → Inventory), a single database transaction is not possible. The **Saga Pattern** decomposes the operation into a sequence of local transactions, each publishing a domain event that triggers the next step. If any step fails, compensating transactions undo the preceding steps. Sagas can be orchestrated (central coordinator) or choreographed (event-driven chain).

---

## Evidence / References

- [Transactional Outbox Pattern (Microservices.io)](https://microservices.io/patterns/data/transactional-outbox.html): Canonical architectural pattern for atomic database updates and event publishing.
- [Debezium Architecture](https://debezium.io/documentation/reference/stable/architecture.html): Official architecture documentation for Change Data Capture (CDC) processes reading database transaction logs.
- [Idempotent Receiver (Enterprise Integration Patterns)](https://www.enterpriseintegrationpatterns.com/patterns/messaging/IdempotentReceiver.html): Canonical pattern for safely handling duplicate message deliveries.
- [Exponential Backoff and Jitter (AWS Architecture Blog)](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/): Marc Brooker's 2015 foundational article on preventing retry storms using full jitter.
- [AWS SQS Dead-Letter Queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html): Industry best practices for retry limits and message poison pill isolation.
- [RabbitMQ Dead Letter Exchanges (DLX)](https://www.rabbitmq.com/dlx.html): Official documentation on routing rejected or expired messages to a dead-letter queue.
- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/): Standard for propagating distributed tracing context over HTTP and message headers (`traceparent`, `tracestate`).
- [OpenTelemetry Specification — Context Propagation](https://opentelemetry.io/docs/specs/otel/context/api-propagators/): Official OpenTelemetry API spec for injecting and extracting trace context across process boundaries.
- [CloudEvents Specification v1.0.2](https://cloudevents.io/): CNCF specification for standardizing event metadata across services and systems.
- [AsyncAPI Specification](https://www.asyncapi.com/docs/concepts/asyncapi-document): Official standard for defining event-driven APIs and message contracts.
- [Apache Kafka Introduction & Partitioning](https://kafka.apache.org/documentation/#intro_concepts_and_terms): Official documentation explaining topics, partitions, and ordering guarantees.
- [Apache Kafka — Exactly-Once Semantics](https://kafka.apache.org/documentation/#semantics): Official documentation on idempotent producers and transactional consumers for exactly-once delivery.
- [Schema Evolution and Compatibility (Confluent)](https://docs.confluent.io/platform/current/schema-registry/avro.html): Guidelines for maintaining backward and forward schema compatibility in event streams.
- [Saga Pattern (Microservices.io)](https://microservices.io/patterns/data/saga.html): Pattern for managing distributed transactions across microservices without synchronous locks.
- [Gregor Hohpe & Bobby Woolf — Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/): Foundational reference for messaging patterns including channels, routers, aggregators, and idempotent receivers.
- [Google SRE Book — The Four Golden Signals](https://sre.google/sre-book/monitoring-distributed-systems/#xref_monitoring_golden-signals): Canonical definition of Latency, Traffic, Errors, and Saturation metrics for monitoring distributed systems.
- [Apache Kafka Consumer Configuration](https://kafka.apache.org/documentation/#consumerconfigs): Official documentation for consumer group tuning parameters (`session.timeout.ms`, `max.poll.interval.ms`, `heartbeat.interval.ms`).
