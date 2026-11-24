---
title: "Real-time analytics on streams"
short: "Streaming analytics"
summary: "Fraud detection, clickstream or sensors: events land in a stream, are aggregated in stateful windows, trigger actions within seconds and end up in a real-time OLAP store and in the lake."
description: "Stream, stateful processing (windows, watermarks, exactly-once), real-time OLAP and lake archive: architecture on AWS, Azure, GCP and on-premises."
order: 28
requirements:
  - "Every event carries its own timestamp and windows are computed on event time, not arrival time."
  - "Producers publish against a registered schema; an invalid event does not break processing."
  - "Processing checkpoints its state and recovers without duplicating results."
  - "Critical actions (blocking a payment, raising an alert) fire within seconds and are idempotent."
  - "Every raw event is archived in the lake for reprocessing and audit."
  - "An input spike is absorbed by the stream without data loss even if processing falls behind."
platforms:
  onprem:
    summary: "Apache Kafka with Apicurio Registry, Apache Flink for windows and state, ClickHouse as OLAP, Grafana for dashboards and Ceph RGW as the archive."
    notes:
      - "Kafka 4.x runs only in KRaft mode, without ZooKeeper; on Kubernetes, Strimzi manages brokers, topics and users as resources."
      - "Apicurio Registry exposes an API compatible with Confluent Schema Registry, so the usual Kafka serialisers work unchanged."
      - "Flink needs durable external storage for checkpoints and savepoints (Ceph RGW over S3); without it, restarting a job means starting from scratch."
      - "ClickHouse can read straight from Kafka with its Kafka table engine and materialised views, which is handy for simple aggregates without Flink."
      - "The cost is capacity: brokers with fast disks and three replicas per partition, plus Flink TaskManagers sized for peak state."
  aws:
    summary: "Kinesis Data Streams with Glue Schema Registry, Amazon Managed Service for Apache Flink, Lambda for actions, Redshift streaming ingestion, S3 as the archive and Managed Grafana."
    notes:
      - "Kinesis has three modes: On-demand Standard (pay per GB and per stream), On-demand Advantage (an account-level option with a committed minimum and lower per-GB prices) and Provisioned (you pay for shards). With steady, high traffic, Advantage or Provisioned come out cheaper."
      - "Managed Service for Apache Flink (formerly Kinesis Data Analytics) bills per KPU-hour and adds one orchestration KPU per application: many small applications inflate the bill."
      - "Redshift reads Kinesis or MSK directly into a materialised view with auto refresh; it cannot parse KPL-aggregated records, so turn aggregation off in producers."
      - "Glue Schema Registry supports Avro, JSON Schema and Protobuf, checks compatibility between versions and has no charge of its own."
      - "For the archive, Amazon Data Firehose writes to S3 as Parquet or into Iceberg tables with no code; Flink does not need to do it."
  azure:
    summary: "Event Hubs with its schema registry, Azure Stream Analytics for windows, Functions for actions, Fabric Eventhouse as OLAP with Real-Time Dashboards, and Capture to Blob Storage."
    notes:
      - "The Event Hubs schema registry is not available on the Basic tier (it is on Standard, Premium and Dedicated) and compatibility rules apply to Avro only."
      - "Stream Analytics sets event time with `TIMESTAMP BY` and has late-arrival and out-of-order policies: tune them or late events are dropped or adjusted without you noticing."
      - "Stream Analytics has no dedicated Eventhouse output: use the Azure Data Explorer output, or publish to an Event Hub read by a Fabric Eventstream. Its Power BI output is retired on 31 October 2027."
      - "Eventhouse and Real-Time Dashboards live in Microsoft Fabric and consume a fixed-price F capacity; if your organisation has no Fabric, consider Azure Data Explorer."
      - "Event Hubs Capture writes the stream to Blob Storage or ADLS as Avro or Parquet with no code: that is the lake archive."
  gcp:
    summary: "Pub/Sub with schemas, Dataflow for windows and watermarks, Cloud Run functions for actions, BigQuery as OLAP and Cloud Storage as the archive, with Looker Studio on top."
    notes:
      - "Pub/Sub schemas support Avro and Protocol Buffers (not JSON Schema), and a message that does not match the schema is rejected at publish time."
      - "Dataflow processes exactly-once by default; at-least-once mode is cheaper and lower-latency if your sink already deduplicates."
      - "Dataflow writes to BigQuery through the Storage Write API; if you don't need transformations, a Pub/Sub BigQuery subscription loads directly with no pipeline."
      - "BigQuery continuous queries run SQL continuously and export to Pub/Sub, Bigtable or Spanner, but they require Enterprise reservations and stateful operations (JOIN, windows) are still in preview."
      - "Looker Studio is not a push dashboard: it queries BigQuery with a cache and a configurable refresh. For second-level freshness, use Grafana with the BigQuery connector."
tiers:
  - name: "Direct ingestion into OLAP"
    when: "Dashboards with seconds-to-minutes delay, simple aggregates and a team without Flink experience."
    cost: 1
    ops: 1
    onprem: "A one-node or small three-node Kafka and ClickHouse with the Kafka table engine and materialised views; Grafana on top."
    aws: "On-demand Kinesis with streaming ingestion into Redshift Serverless and auto-refreshed materialised views; Firehose to S3."
    azure: "Event Hubs Standard with Capture and a Fabric Eventstream loading into Eventhouse; a Real-Time Dashboard on KQL."
    gcp: "Pub/Sub with a BigQuery subscription and a Cloud Storage subscription; views in BigQuery and Looker Studio."
    tradeoffs: "No state across events: no session windows, no fine-grained deduplication and no millisecond actions."
  - name: "Stateful processing"
    when: "Fraud, sensor alerts or clickstream sessions that need windows, joins and actions within seconds."
    cost: 2
    ops: 2
    onprem: "Three-broker Kafka with Strimzi, Flink with the Kubernetes operator and checkpoints on Ceph RGW, replicated ClickHouse."
    aws: "Kinesis, Managed Service for Apache Flink with checkpoints, Lambda for actions and Redshift streaming ingestion."
    azure: "Event Hubs, Stream Analytics with windows and output to Functions, Eventhouse via Event Hub and Eventstream."
    gcp: "Pub/Sub, Dataflow with Streaming Engine, Cloud Run functions for actions and BigQuery via the Storage Write API."
    tradeoffs: "A stateful job is critical software: it must be versioned, upgraded through savepoints and its lag watched."
  - name: "High volume and multi-region"
    when: "Payments or telemetry at large scale with strict availability targets and several regions."
    cost: 4
    ops: 3
    onprem: "Two Kafka clusters replicated with MirrorMaker 2, Flink with JobManager high availability and sharded, replicated ClickHouse."
    aws: "MSK or Kinesis in Provisioned or Advantage mode per region, Flink per region and multi-AZ Redshift clusters."
    azure: "Event Hubs Premium or Dedicated with geo-replication, Stream Analytics jobs per region and Eventhouse on dedicated capacity."
    gcp: "Global Pub/Sub with Dataflow per region and multi-region BigQuery."
    tradeoffs: "You duplicate processing and must decide which region owns each key so the same action is not emitted twice."
extensions:
  - name: "Invalid-event queue"
    when: "Whenever there are external producers: a malformed event goes to quarantine and the job keeps running."
    cost: "low"
    onprem: "DLQ topic in Kafka"
    aws: "Flink side output to another stream"
    azure: "TRY_CAST query routed to Blob"
    gcp: "Pub/Sub dead-letter topic"
  - name: "CDC enrichment"
    when: "When the rule needs reference data that changes (customer limits, sensor location)."
    cost: "medium"
    onprem: "Debezium into Kafka"
    aws: "DMS into Kinesis"
    azure: "Fabric CDC in Eventstream"
    gcp: "Datastream"
  - name: "Online ML model"
    when: "Fraud or anomalies where a fixed rule is not enough and every event needs a score."
    cost: "medium"
    onprem: "KServe"
    aws: "SageMaker AI endpoint"
    azure: "Azure ML online endpoint"
    gcp: "Vertex AI endpoint"
  - name: "No-code alerts"
    when: "The business wants to define thresholds and notifications without asking for a deployment."
    cost: "low"
    onprem: "Grafana alerting"
    aws: "Managed Grafana alerting"
    azure: "Fabric Activator"
    gcp: "Continuous query to Pub/Sub"
  - name: "Managed Kafka"
    when: "When the Kafka ecosystem (Connect, Streams, clients) matters more than native integration."
    cost: "medium"
    onprem: "Strimzi"
    aws: "Amazon MSK"
    azure: "Event Hubs Kafka endpoint"
    gcp: "Managed Service for Apache Kafka"
  - name: "Reprocessing from the lake"
    when: "After fixing a bug in a rule, to recompute historical results with the same code."
    cost: "medium"
    onprem: "Flink in batch mode"
    aws: "Flink reading from S3"
    azure: "Spark in Fabric"
    gcp: "Dataflow in batch"
savings:
  - "If Kinesis traffic is steady and high, compare On-demand Advantage or Provisioned with On-demand Standard: the default mode is the most expensive per GB at sustained volume."
  - "Consolidate small jobs into a single Managed Flink application or Dataflow job: each application adds its own orchestration KPU or its own minimum workers."
  - "Use Dataflow at-least-once mode when the sink deduplicates (BigQuery with keys, ClickHouse with ReplacingMergeTree): it saves resources and latency."
  - "Archive with Firehose, Event Hubs Capture or a Cloud Storage subscription as compressed Parquet and apply lifecycle rules to Glacier, Cool/Cold or Archive; don't keep raw JSON forever."
  - "Limit stream retention to what you need to recover (24 hours to 7 days): extended retention is billed and history already lives in the lake."
  - "Don't pay for a real-time OLAP store for dashboards that are looked at once a day: an hourly aggregate in the lake or warehouse does the job for far less."
---

## When you need it

When the value of a data point drops by the second. A fraudulent payment has to be stopped before it is authorised, not in tomorrow's report; a sensor crossing a threshold must raise an alert while the machine is still running; a clickstream is used to personalise the session that is happening now. If your questions can be answered with yesterday's data, a batch lakehouse is cheaper and simpler: this case only pays off when latency is part of the requirement.

## Scenarios

### Payment fraud detection

Every authorisation publishes an event keyed by card. The job keeps per-card state (amounts in the last hour, distinct countries in ten minutes) and emits a decision within seconds. What matters here is exactly-once state, an idempotent blocking action and tail latency, not the average. The usual pattern combines rules in the stream with an online ML model.

### E-commerce clickstream

High volume, low value per event and tolerance for losing the odd event. Session windows per user, funnels and most-viewed products in an OLAP store. Direct ingestion into OLAP is usually enough; cost is driven by ingest volume and retention, so sample and aggregate early.

### Industrial sensors with patchy connectivity

Devices buffer readings and send them in bulk when the network comes back: events arrive minutes or hours late. If you compute on arrival time, the averages are wrong. Use event-time windows, generous watermarks and an explicit policy for late data (correct the window or route it to a separate output). If sensors arrive over MQTT, the IoT telemetry case covers the ingestion side.

### Regulated company with data in the EU

The stream holds personal data: pin the region, encrypt with your own keys, pseudonymise identifiers before the OLAP store and define how long each layer keeps data. The lake archive is also the evidence of which decision was taken with which data.

## How it fits together

Sources (applications, payment gateways, devices) publish to the stream, a partitioned and durable log. Each event carries its partition key and its origin timestamp. Before publishing, the producer serialises against a schema in the registry; the consumer reads the schema ID and deserialises, so adding an optional field breaks nobody and removing a required one is rejected.

The processing engine consumes the stream and keeps state per key. Windows (tumbling, sliding, session) close according to the watermark, the engine's estimate of how far event time has progressed; anything arriving after the watermark is late and has its own policy. State is saved in periodic checkpoints together with read positions: if a worker dies, the job goes back to the last checkpoint and rereads from there, without duplicating results as long as the sink is transactional or idempotent.

Three paths leave the windows. Urgent decisions go to functions that block, notify or open an incident, always with an idempotency key. Aggregates and enriched events go to the real-time OLAP store, which answers queries in milliseconds and feeds the live dashboards. Raw events are archived in the lake in a columnar format for audit, model training and reprocessing.

If processing cannot keep up, the stream acts as a buffer: events wait within their retention and consumer lag grows. Flink and Dataflow apply backpressure towards the source instead of dropping data; treat that lag as your primary metric.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** Single-node Kafka in KRaft mode, Apicurio Registry, one Flink JobManager and TaskManager, ClickHouse and Grafana, with volumes for Kafka logs and ClickHouse data and checkpoints in an external S3 bucket. Good for development and small loads without availability requirements: if the host dies, everything does.

**Kubernetes on-premises.** k3s or RKE2 with Strimzi for Kafka (brokers on three nodes, rack awareness, topics as resources), the Flink Kubernetes Operator to deploy jobs with savepoint-based upgrades, the Altinity ClickHouse operator and Grafana. Fast local disks for Kafka and ClickHouse, cert-manager for TLS between components and KEDA if you want to scale simple consumers on lag.

**Cloud without Kubernetes.** This is the diagram: Kinesis, Event Hubs or Pub/Sub, the managed engine (Managed Flink, Stream Analytics, Dataflow) and functions for actions. No nodes to patch, but there are still jobs to version and lag to watch.

**Managed Kubernetes.** EKS, AKS or GKE with Strimzi and the Flink operator pay off when you need Flink versions or connectors the managed service doesn't offer, or exact portability with on-premises. You pay for running nodes and operate the state yourself.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | One host | Medium | None | Development, pilot |
| Kubernetes on-premises | Three or more nodes with fast disks | High | Partitions and TaskManagers | On-premises mandate |
| Managed services | Low, or minimum capacity | Low-medium | Automatic or by units | Cloud default |
| EKS, AKS, GKE | Nodes and control plane | High | Manual or with KEDA | Custom connectors or versions |

## Key decisions

- **Stateful engine or SQL straight in the OLAP store.** If you only aggregate per minute, direct ingestion into Redshift, Eventhouse, BigQuery or ClickHouse removes a whole component. As soon as you need stream joins, sessions or per-event actions, you need Flink, Stream Analytics or Dataflow.
- **Event time versus processing time.** Processing time is simpler and always wrong when there are delays. Use event time and decide how long you wait (the watermark) and what you do with late data.
- **Exactly-once or at-least-once with idempotency.** End-to-end exactly-once needs a transactional sink and adds latency. Processing at-least-once and deduplicating in the sink by event ID is often cheaper.
- **Kinesis, Event Hubs or Pub/Sub versus Kafka.** The native services integrate better with their cloud; Kafka (MSK, the Event Hubs Kafka endpoint, Google's Managed Kafka) brings portability and the connector ecosystem.
- **Schemas from day one.** A registry with backward compatibility stops a single producer deployment from breaking every consumer.

## Common pitfalls

- Windows on arrival time: a network delay turns into a fake spike.
- Picking a low-cardinality partition key (country, event type) and creating a hot partition that throttles the whole stream.
- Upgrading a stateful job without a savepoint and losing hours of aggregates.
- Non-idempotent actions: a retry after a checkpoint blocks twice or sends two text messages.
- Not measuring consumer lag or watermark age; the pipeline runs hours behind and nobody notices.
- Publishing free-form JSON without a schema registry and discovering a field change in production.
- Storing only aggregates and not the raw event: without an archive there is no reprocessing when the rule was wrong.
