---
title: "Event-driven architecture"
short: "Events and pub/sub"
summary: "A service publishes business facts ('order created') and several consumers react without the producer knowing about them, with a guarantee that no event is lost between the database and the bus."
description: "Transactional outbox, event bus and idempotent consumers with versioned schemas: a reference architecture on AWS, Azure, GCP and on-premises."
order: 3
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
---

## When you need it

When the same business fact matters to several systems and you don't want the producer calling each of them. When an order is created you need to bill it, notify the customer and feed analytics; if the orders service makes those three calls, any failure or slowness in one of them breaks the sale, and every new interested party means changing its code. With events, the producer publishes a fact and moves on.

## How it fits together

The orders service writes the order and, in the same transaction, a row in the outbox table holding the serialised event. If the transaction rolls back, the event never existed. A relay (CDC on the database log, or a process that reads the table) publishes those rows to the bus and marks them as sent. If the relay crashes between publishing and marking, it publishes again when it comes back: at-least-once delivery.

The bus hands a copy to each subscriber. Billing records the charge; notifications sends the email; analytics loads the event into the warehouse. Every consumer stores the IDs of events it has already processed or performs idempotent operations, because it will see duplicates.

## Key decisions

- **Outbox or dual write.** Writing to the database and then publishing to the bus looks equivalent, but if the process dies in between, the database and the rest of the system diverge. The outbox fixes that with a single transaction.
- **CDC or polling.** CDC has low latency and puts no load on the table, but adds a component to run; polling is simple and good enough at moderate volume.
- **Log or routing bus.** Kafka or Pub/Sub let you reread history; EventBridge or Service Bus route and filter better but replay is more limited.
- **Order by key, not globally.** Global ordering kills parallelism. Order per entity (the order ID) and design consumers to cope with out-of-order events across entities.

## Common pitfalls

- Publishing the event before the transaction commits: events arrive for orders that don't exist.
- Events carrying the full entity state with no schema version, which break consumers as soon as a required field is added.
- Non-idempotent consumers that charge the customer twice.
- Using events to ask for things ('send this email') instead of stating facts; that's a queue.
- Not watching per-subscription lag until a consumer is days behind.
