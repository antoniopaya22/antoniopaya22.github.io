---
title: "Event-driven architecture"
short: "Events and pub/sub"
summary: "A service publishes business facts ('order created') and several consumers react without the producer knowing about them, with a guarantee that no event is lost between the database and the bus."
description: "Transactional outbox, event bus and idempotent consumers with versioned schemas: a reference architecture on AWS, Azure, GCP and on-premises."
order: 6
requirements:
  - "An event is published if and only if the business transaction commits."
  - "Every consumer receives every event at least once and tolerates duplicates."
  - "Adding a consumer does not require changing the producer."
  - "Ordering is guaranteed where it matters (per order), not globally."
  - "Event schemas are versioned and changes are backward compatible."
  - "A consumer that was down catches up by reprocessing, with no manual work."
platforms:
  onprem:
    summary: "Debezium reads the PostgreSQL outbox and publishes to Apache Kafka; consumers are workers on Kubernetes and Kafka Connect loads events into ClickHouse."
    notes:
      - "Debezium reads the PostgreSQL WAL and its Outbox Event Router transform publishes each outbox row to the right topic, with no polling."
      - "The message key (the order ID) fixes the partition and therefore the per-entity order."
      - "For schemas, Apicurio Registry and Karapace are open source; Confluent Schema Registry ships under a community licence that is not OSI-approved."
      - "The ClickHouse connector for Kafka Connect saves you from writing and running your own analytics consumer."
      - "Kafka (on KRaft) is the piece that demands the most expertise: replicas, retention, partitions and disks are all your call."
  aws:
    summary: "A relay publishes the Aurora outbox to EventBridge; rules route to billing and notification Lambdas (which sends through SES) and to Data Firehose, which lands events in S3 to query with Athena."
    notes:
      - "There is no native CDC from Aurora to EventBridge: the relay is your own process (an ECS service that reads the outbox and calls `PutEvents`) or Debezium into Kinesis and on to the bus with EventBridge Pipes."
      - "EventBridge does not guarantee ordering. If per-entity order matters, use SNS FIFO with SQS FIFO, or Amazon MSK."
      - "Configure retries and a DLQ on each target, or put an SQS queue between the rule and the Lambda, so events survive a failing consumer."
      - "The EventBridge schema registry discovers and versions schemas, and archive and replay lets you reprocess past events."
      - "You pay per event published, per volume in Firehose and per data scanned in Athena: convert to Parquet and partition by date."
  azure:
    summary: "A relay publishes the outbox to a Service Bus topic; each consumer has its own subscription processed by Azure Functions, notifications go out through Communication Services and analytics lands in Microsoft Fabric."
    notes:
      - "Each subscription is an independent copy with its own DLQ; SQL or correlation filters stop a consumer from receiving what isn't meant for it."
      - "For per-order ordering, enable sessions and use the order ID as `SessionId`; duplicate detection drops relay resends within a time window."
      - "Service Bus has no schema registry: Azure Schema Registry is part of Event Hubs. If you don't adopt it, version contracts in a shared repository."
      - "For high-volume analytics, Event Hubs with Fabric Eventstream is a more natural fit than a Function; the Function is fine at moderate volume."
      - "Topics require the Standard or Premium tier; Fabric bills by capacity, so size it carefully or pause it when idle."
  gcp:
    summary: "A relay publishes the outbox to a Pub/Sub topic; Cloud Run functions handle billing and notifications (via SendGrid from Marketplace) and a BigQuery subscription writes straight into the warehouse."
    notes:
      - "Debezium Server has a Pub/Sub sink, so the relay can be CDC on Cloud SQL with logical decoding instead of polling."
      - "Ordering keys give per-entity order and must also be enabled on the subscription; without them there is no ordering."
      - "Pub/Sub schemas (Avro or Protocol Buffers) support revisions and validate messages on publish."
      - "The BigQuery subscription removes the analytics consumer: Pub/Sub writes into the table using the topic schema or metadata columns."
      - "Google Cloud has no first-party transactional email service; SendGrid or another provider comes through Marketplace and is billed separately."
tiers:
  - name: "Polled outbox and managed bus"
    when: "A monolith or a few services, moderate volume and a team that wants to decouple without running a distributed log."
    cost: 1
    ops: 1
    onprem: "One host with Docker Compose: PostgreSQL, a relay that polls the outbox with `FOR UPDATE SKIP LOCKED`, single-node Kafka in KRaft mode and the consumers as containers."
    aws: "A small relay on ECS that reads the outbox and calls `PutEvents`, an EventBridge bus with rules to Lambda, and Data Firehose to S3."
    azure: "A relay on Container Apps publishing to a Service Bus Standard topic, with one subscription per consumer handled by Azure Functions."
    gcp: "A relay on Cloud Run publishing to Pub/Sub, Cloud Run functions for the consumers and a BigQuery subscription for analytics."
    tradeoffs: "Polling adds latency and load on the table; without a schema registry, contracts depend on team discipline; single-node Kafka has no replicas."
  - name: "CDC and versioned contracts"
    when: "Several teams publish and consume, latency matters and a schema change must not break anyone."
    cost: 2
    ops: 2
    onprem: "Debezium on the WAL publishes to a three-broker Kafka managed with Strimzi, Apicurio Registry validates schemas and Kafka Connect loads into ClickHouse."
    aws: "Debezium into Kinesis and EventBridge Pipes on to the bus, EventBridge schema registry and archive, and an SQS queue with a DLQ in front of each Lambda."
    azure: "Service Bus with sessions for per-order ordering and duplicate detection; Event Hubs with Schema Registry and Fabric Eventstream for analytics."
    gcp: "Debezium Server on Cloud SQL publishes to Pub/Sub with schemas and ordering keys; a BigQuery subscription and dead-lettering on every consumer."
    tradeoffs: "CDC is one more critical component: the logical replication slot, its permissions and its behaviour on failover become your responsibility."
  - name: "Large-scale event log"
    when: "Dozens of consumers, replaying history as a requirement and volumes that call for partitioning."
    cost: 4
    ops: 3
    onprem: "Kafka across several racks or rooms with spread replicas, tiered storage to object storage, a dedicated Kafka Connect cluster and Flink for streaming."
    aws: "Amazon MSK with MSK Connect running Debezium, consumers on ECS or Lambda and Firehose writing Iceberg or Parquet tables to S3."
    azure: "Event Hubs Premium or Dedicated with the Kafka endpoint, Schema Registry and Fabric as the analytics store."
    gcp: "Managed Service for Apache Kafka, or Pub/Sub if you don't need the Kafka protocol, with BigQuery as the warehouse."
    tradeoffs: "High fixed cost and specialists: partitions, retention, rebalances and disk capacity have to be planned and reviewed."
extensions:
  - name: "Schema registry"
    when: "As soon as more than one team consumes the same events."
    cost: "low"
    onprem: "Apicurio Registry"
    aws: "EventBridge schema registry"
    azure: "Schema Registry (Event Hubs)"
    gcp: "Pub/Sub schemas"
  - name: "Archive and replay"
    when: "To bootstrap a new consumer or fix one that processed events wrongly for days."
    cost: "medium"
    onprem: "Kafka retention + tiered storage"
    aws: "EventBridge archive and replay"
    azure: "Event Hubs retention and Capture"
    gcp: "Pub/Sub retention and seek"
  - name: "Per-entity ordering"
    when: "When events for the same order must be processed in the order they happened."
    cost: "low"
    onprem: "Kafka partition key"
    aws: "SNS FIFO + SQS FIFO"
    azure: "Service Bus sessions"
    gcp: "Pub/Sub ordering keys"
  - name: "CDC relay"
    when: "When polling the outbox adds too much latency or load on the database."
    cost: "medium"
    onprem: "Debezium (Kafka Connect)"
    aws: "Debezium, Kinesis and EventBridge Pipes"
    azure: "Debezium Server to Event Hubs"
    gcp: "Debezium Server to Pub/Sub"
  - name: "Stream processing"
    when: "Time-windowed aggregates, fraud detection or enrichment before the warehouse."
    cost: "high"
    onprem: "Apache Flink"
    aws: "Managed Service for Apache Flink"
    azure: "Azure Stream Analytics"
    gcp: "Dataflow"
  - name: "Outbound webhooks"
    when: "When external partners want to receive events on their own HTTP endpoint."
    cost: "low"
    onprem: "Worker with a retry queue"
    aws: "EventBridge API destinations"
    azure: "Event Grid (webhooks)"
    gcp: "Cloud Tasks + Cloud Run"
savings:
  - "Filter at the bus, not in the consumer: EventBridge rules, Service Bus subscription filters and Pub/Sub subscription filters avoid invocations (and bills) for events the consumer would discard anyway."
  - "Use code-free consumers where they exist: the BigQuery subscription, Data Firehose or Kafka Connect save you paying for and running a function per analytics event."
  - "Convert to Parquet and partition by date in Firehose: Athena charges by data scanned, and a query over unpartitioned JSON reads the whole history."
  - "Pause Fabric capacity when it isn't in use and size it to the real load; it is a fixed hourly cost even when no events arrive."
  - "Set log retention to what you actually replay and move older data to tiered storage instead of buying broker disks."
  - "Batch in consumers: batch size and window on the SQS-to-Lambda mapping (on `arm64`) or on the Functions trigger cut invocations without changing the logic."
---

## When you need it

When the same business fact matters to several systems and you don't want the producer calling each of them. When an order is created you need to bill it, notify the customer and feed analytics; if the orders service makes those three calls, any failure or slowness in one of them breaks the sale, and every new interested party means changing its code. With events, the producer publishes a fact and moves on.

You don't need it if there is only one consumer and there always will be: that's a job queue. And it doesn't replace a synchronous call when the user needs the answer to carry on.

## Scenarios

### A monolith that starts to grow

The first step isn't Kafka. The outbox in the same database, a relay that polls it every second and a managed bus (EventBridge, Service Bus or Pub/Sub) are enough to take billing and notifications off the critical path. When polling starts to show in database load or latency, swap the relay for CDC without touching producers or consumers.

### A regulated company that needs an audit trail

Events become evidence: long retention, an immutable archive and replay to reconstruct what happened. The conflict comes with GDPR: an immutable log full of personal data can't be "erased". Publish identifiers and only what's essential, keep personal data in the owning service and, if it must travel, encrypt each data subject with their own key so you can destroy it.

### Campaign peaks

On Black Friday the producer keeps writing at its own pace and the bus absorbs the difference; what grows is each consumer's lag. Scale consumers on lag (KEDA with the Kafka scaler, Lambda concurrency or Functions instances) and put a ceiling on it so you don't knock over the billing database. The customer notification can be minutes late; the invoice, hours.

### Portability across clouds or with on-premises

If the same product is installed at customer sites and in the cloud, the Kafka protocol is the common denominator: Amazon MSK, the Event Hubs Kafka endpoint and Managed Service for Apache Kafka all speak it. In exchange you give up EventBridge rule-based routing or Service Bus filters, and filtering moves back into the consumer.

## How it fits together

The orders service writes the order and, in the same transaction, a row in the outbox table holding the serialised event: event ID, type, schema version, the order ID as key and the payload. If the transaction rolls back, the event never existed. A relay (CDC on the database log, or a process that reads the table) publishes those rows to the bus and marks them as sent. If the relay crashes between publishing and marking, it publishes again when it comes back: at-least-once delivery.

The bus hands a copy to each subscriber. Billing records the charge; notifications sends the email; analytics loads the event into the warehouse. Every consumer stores the IDs of events it has already processed (in the same transaction as its side effect) or performs idempotent operations, because it will see duplicates. What keeps failing goes to the consumer's DLQ, not the bus's, so one broken consumer doesn't affect the rest.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** PostgreSQL with `wal_level=logical`, Kafka in KRaft mode, Kafka Connect with the Debezium and ClickHouse connectors, Apicurio Registry, ClickHouse, the consumers and Postfix as an SMTP relay to your mail provider. Volumes for PostgreSQL, Kafka and ClickHouse. Back up PostgreSQL and ClickHouse; Kafka isn't a backup, it's retention. Good for development, demos and small customers; one broker tolerates no failure.

**Kubernetes on-premises.** Strimzi manages Kafka, Kafka Connect and each connector as Kubernetes resources; Debezium is just another `KafkaConnector`. CloudNativePG or Patroni for PostgreSQL, checking that the logical replication slot survives a failover (PostgreSQL 17 failover slots or Patroni permanent slots). KEDA scales consumers on consumer-group lag and the Altinity operator runs ClickHouse.

**Cloud without Kubernetes.** This is the design in the diagram: the relay as an always-on service on ECS, Container Apps or Cloud Run; consumers on Lambda, Azure Functions or Cloud Run functions; and code-free consumers (Firehose, BigQuery subscription) where they exist.

**Managed Kubernetes.** EKS, AKS or GKE make sense for long-running consumers with a lot of local state, or if you want to run Kafka with Strimzi in the cloud. Most of the time a managed bus with consumers in the cluster is the better deal.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | One host | Medium | Manual | Development, small customer |
| Kubernetes + Strimzi | Cluster and Kafka disks | High | Partitions and KEDA | On-premises with replay |
| Managed bus + functions | Near zero | Low | Automatic, per event | Default choice in the cloud |
| EKS, AKS, GKE + managed bus | Control plane and nodes | Medium | HPA or KEDA | Long-running or stateful consumers |

## Key decisions

- **Outbox or dual write.** Writing to the database and then publishing to the bus looks equivalent, but if the process dies in between, the database and the rest of the system diverge. The outbox fixes that with a single transaction.
- **CDC or polling.** CDC has low latency and puts no load on the table, but adds a component to run; polling is simple and good enough at moderate volume.
- **Log or routing bus.** Kafka or Pub/Sub let you reread history; EventBridge or Service Bus route and filter better but replay is more limited.
- **Thin or fat events.** An event carrying only IDs forces consumers to call back the producer; one with the full state decouples them but fixes a larger contract. Publish what consumers need, versioned.
- **Order by key, not globally.** Global ordering kills parallelism. Order per entity (the order ID) and design consumers to cope with out-of-order events across entities.

## Common pitfalls

- Publishing the event before the transaction commits: events arrive for orders that don't exist.
- Events carrying the full entity state with no schema version, which break consumers as soon as a required field is added.
- Non-idempotent consumers that charge the customer twice.
- Using events to ask for things ('send this email') instead of stating facts; that's a queue.
- An abandoned logical replication slot: PostgreSQL keeps WAL for it until the primary's disk fills up.
- Not watching per-subscription lag until a consumer is days behind.
