---
title: "Webhooks and resilient integrations"
short: "Webhooks"
summary: "Receive third-party webhooks without losing or duplicating events, and call other people's APIs without their outages dragging you down: verified signature, raw event stored, immediate 2xx, a queue, idempotent processing and outbound calls with timeouts, retries and a circuit breaker."
description: "Webhooks with HMAC verification, event inbox, queue, DLQ, idempotency, back-off retries and a circuit breaker on AWS, Azure, GCP and on-premises."
order: 8
requirements:
  - "A webhook is accepted only with a valid HMAC signature and a timestamp inside the allowed window."
  - "Every accepted event is stored raw before the 2xx goes back, and the response takes milliseconds."
  - "The same event delivered several times produces a single effect."
  - "Whatever keeps failing ends up in a DLQ with an alarm and can be replayed."
  - "Outbound calls have timeouts, retries with back-off and jitter, and stop while the third party is down."
  - "Each external provider's rate limits are respected."
platforms:
  onprem:
    summary: "An HTTP receiver on Kubernetes verifies the signature with the secret from OpenBao, stores the event in a PostgreSQL inbox table and publishes it to RabbitMQ, where KEDA-scaled workers process it and the dead-letter exchange sets aside what fails."
    notes:
      - "A unique constraint on `(provider, event_id)` in the inbox table is the first line of defence against duplicates: the second `INSERT` fails and the receiver returns 2xx without enqueuing again."
      - "Use quorum queues with a delivery limit so a poison message ends up in the DLX instead of being requeued forever."
      - "Partition the inbox by date and drop old partitions: far cheaper than a mass `DELETE`."
      - "OpenBao holds the signing secret per provider; during a rotation the receiver accepts both the current and the previous secret."
      - "The cost is running PostgreSQL, RabbitMQ and OpenBao, and exposing the receiver to the internet through a DMZ or a reverse proxy with TLS."
  aws:
    summary: "API Gateway hands the webhook to a Lambda that verifies the signature with the secret from Secrets Manager, stores the event in DynamoDB and sends it to SQS; another Lambda processes it and the redrive policy moves failures to a DLQ."
    notes:
      - "With API Gateway the body may arrive base64-encoded (`isBase64Encoded`): decode it and compute the HMAC over those bytes, never over re-parsed JSON."
      - "A conditional write (`attribute_not_exists`) in DynamoDB catches duplicates on the way in; TTL removes old events without consuming write capacity."
      - "SQS FIFO deduplicates by `MessageDeduplicationId` for only five minutes: it does not replace an idempotent processor."
      - "On the SQS-to-Lambda mapping, `ReportBatchItemFailures` avoids retrying the whole batch and maximum concurrency caps the pace against the third-party API."
      - "HTTP API does not support AWS WAF directly: if you need it, use a REST API or put CloudFront in front."
  azure:
    summary: "An HTTP-triggered function verifies the signature with the secret from Key Vault, stores the event in Cosmos DB and sends it to a Service Bus queue; another function processes it and the dead-letter subqueue collects what cannot be processed."
    notes:
      - "Service Bus Standard and Premium offer duplicate detection by `MessageId` within a configurable window; use the provider's `event_id` as the `MessageId`."
      - "Read the body as bytes (`req.Body` or equivalent) before any binding deserialises it; otherwise the HMAC won't match."
      - "The Cosmos DB change feed can trigger a function that enqueues whatever the receiver stored but never managed to send."
      - "A TTL on the Cosmos DB container cleans up the inbox with no deletion jobs."
      - "Functions Flex Consumption supports virtual network integration and a NAT Gateway when the third party requires a fixed outbound IP."
  gcp:
    summary: "Cloud Run receives the webhook, verifies the signature with the secret from Secret Manager, stores the event in Firestore and publishes it to Pub/Sub; a subscription delivers to Cloud Run functions and the dead-letter policy sets aside what fails."
    notes:
      - "Use the `event_id` as the Firestore document ID and write with `create()`: if it already exists the call fails and you know it is a duplicate."
      - "Pub/Sub exactly-once delivery only exists on pull subscriptions and within one region; with push it is still at least once."
      - "A Firestore trigger through Eventarc can publish to Pub/Sub whatever was stored, closing the gap between inbox and queue."
      - "Firestore TTL policies delete old events with no code of your own."
      - "If the third party rate-limits you, Cloud Tasks controls dispatches per second and concurrency per queue better than Pub/Sub."
tiers:
  - name: "Minimum viable"
    when: "A few providers and hundreds of events a day, a small team that wants to stop losing events without building infrastructure."
    cost: 1
    ops: 1
    onprem: "One host with Docker Compose: the receiver and PostgreSQL acting as both inbox and queue with `SELECT … FOR UPDATE SKIP LOCKED`; a worker in another container."
    aws: "HTTP API + Lambda, an on-demand DynamoDB table, a standard SQS queue with a DLQ and a consumer Lambda."
    azure: "Functions Flex Consumption, Cosmos DB serverless and a Service Bus Standard queue with its dead-letter subqueue."
    gcp: "Cloud Run as receiver, Firestore, a Pub/Sub topic with dead-lettering and Cloud Run functions as processor."
    tradeoffs: "No relay between inbox and queue and no per-provider throttling: if the enqueue fails after the store, replay is manual."
  - name: "Balanced"
    when: "Several providers, some of them moving money, and third-party APIs with rate limits."
    cost: 2
    ops: 2
    onprem: "k3s or RKE2 with the receiver in several replicas, RabbitMQ with quorum queues, KEDA-scaled workers, PostgreSQL on CloudNativePG and a relay that forwards pending inbox rows."
    aws: "The above plus DynamoDB Streams with EventBridge Pipes into SQS, one queue per provider, alarms on the DLQ and maximum concurrency on each consumer."
    azure: "The above plus a function on the Cosmos DB change feed, Service Bus duplicate detection, one queue per provider and alerts on dead-lettered messages."
    gcp: "The above plus a Firestore trigger through Eventarc, one topic per provider and Cloud Tasks for rate-limited outbound calls."
    tradeoffs: "More moving parts to watch and a replay procedure that has to be documented and rehearsed."
  - name: "High volume and high availability"
    when: "A platform integrating dozens of providers or thousands of events a minute, under service-level agreements."
    cost: 3
    ops: 3
    onprem: "Receivers in two data centres behind a global load balancer, replicated RabbitMQ and PostgreSQL, an event archive on Ceph RGW and circuit breakers per provider."
    aws: "Receivers in several Regions with DynamoDB global tables, CloudFront with AWS WAF in front, an archive in S3 and queues split by provider and priority."
    azure: "Front Door with WAF, Service Bus Premium with availability zones, multi-region Cosmos DB on provisioned throughput and an archive in Blob Storage."
    gcp: "Global load balancer with Cloud Armor, Cloud Run in several regions, multi-region Firestore and an archive in Cloud Storage."
    tradeoffs: "Higher fixed cost and trickier deduplication: the same event can arrive through two regions at once."
extensions:
  - name: "WAF and provider IP allowlist"
    when: "When the provider publishes its IP ranges or the endpoint attracts abusive traffic."
    cost: "medium"
    onprem: "Traefik + Coraza"
    aws: "AWS WAF (REST API or CloudFront)"
    azure: "Front Door + WAF"
    gcp: "Cloud Armor"
  - name: "Inbox-to-queue relay via change feed"
    when: "When you cannot afford a stored event that never reached the queue."
    cost: "low"
    onprem: "Debezium or a pending-rows poller"
    aws: "DynamoDB Streams + EventBridge Pipes"
    azure: "Cosmos DB change feed"
    gcp: "Firestore trigger (Eventarc)"
  - name: "Per-provider outbound rate limiting"
    when: "When the third-party API has per-second or per-day quotas."
    cost: "low"
    onprem: "Token bucket in Redis"
    aws: "SQS mapping maximum concurrency"
    azure: "maxConcurrentCalls + Azure Managed Redis"
    gcp: "Cloud Tasks (per-queue limits)"
  - name: "Raw event archive"
    when: "Audits, disputes or replays beyond the inbox TTL."
    cost: "low"
    onprem: "Ceph RGW"
    aws: "Amazon S3"
    azure: "Blob Storage"
    gcp: "Cloud Storage"
  - name: "Fixed outbound IP"
    when: "When the third party only accepts calls from registered IPs."
    cost: "medium"
    onprem: "Egress proxy (Squid or Envoy)"
    aws: "Lambda in a VPC + NAT Gateway with EIP"
    azure: "VNet integration + NAT Gateway"
    gcp: "Direct VPC egress + Cloud NAT"
savings:
  - "Return 2xx and process later with functions that scale to zero: webhook traffic arrives in bursts, so paying per invocation beats keeping workers running."
  - "Run Lambda on arm64 (Graviton) and process in batches: the batch size and batching window on the SQS mapping cut the number of invocations."
  - "Expire the inbox with TTL (DynamoDB TTL, Cosmos DB TTL, Firestore TTL policies, date partitions in PostgreSQL) and move the archive to cold storage classes."
  - "Don't add a NAT Gateway out of habit: if the third party doesn't require a fixed IP, the function doesn't need to sit in a private network; and if it does, use VPC endpoints for the cloud provider's own services."
  - "Service Bus Standard bills per operation and is usually enough; Premium has a fixed cost per messaging unit and only pays off for isolation, private networking or sustained volume."
  - "Don't log the full body of every webhook: it is already in the inbox, and log ingestion usually costs more than storing the table."
---

## When you need it

As soon as another system tells you about something important over HTTP: a confirmed payment, a push to a repository, an order created in the ERP, a completed signature. Providers retry if you don't answer quickly with a 2xx, deliver the same event more than once and don't guarantee ordering. In the other direction, when your system calls someone else's API, that API goes down, slows down or throttles you. Process the webhook inside the request and call the third party unprotected, and a slow provider takes yours down with it while duplicate events turn into double charges.

## Scenarios

### Payment gateway

Every event moves money. Idempotency is not optional: the key is the provider's `event_id`, and the business effect (marking the order as paid) is recorded in the same transaction as the processed-event marker. The timestamp window stays short and the inbox is kept for as long as reconciliation requires.

### Git webhooks driving CI

Large bursts on merge, little sensitive data and tolerance for some delay. The point is absorbing the spike: the queue buffers it and workers scale with its depth. Ordering rarely matters, because the worker reads the repository's current state rather than trusting the payload.

### Integrating a slow ERP

The ERP accepts few requests per second and sometimes takes minutes. The design shifts towards the outbound side: one queue per destination, limited consumer concurrency, short timeouts, retries with exponential back-off and jitter, and a circuit breaker that stops calling when the error rate spikes and tries again after a cool-down.

### Regulated company with data in the EU

Payloads carry personal data. The inbox is encrypted with a customer-managed key, lives in an EU region and has a defined retention; logs record identifiers, not bodies. The signing secret is rotated on a schedule and every read of it is audited.

### Customer that requires on-premises with no inbound traffic

If no public endpoint can be opened, the receiver sits in a DMZ, or reception is replaced with polling: a job periodically queries the provider's events API, if it has one, and feeds the same inbox. The rest of the design stays the same.

## How it fits together

The external provider sends the event with an HMAC signature in a header, usually alongside a timestamp. The receiver reads the body as untouched bytes, fetches the signing secret from the secrets manager, computes the HMAC over the timestamp and those bytes and compares it in constant time. If the timestamp falls outside the allowed window, it rejects the event even with a good signature: that is what stops replays. During a rotation it accepts a signature from either the new or the previous secret.

With a valid signature, the receiver stores the raw event in the inbox under a unique constraint on `(provider, event_id)`. If it already existed, this is a redelivery: return 2xx and stop. If it is new, send it to the queue and return 2xx, all within milliseconds and with no business logic.

The processor takes messages from the queue, checks whether the event already produced its effect, applies the logic and marks it as processed. When it has to call a third-party API, it does so with a timeout, retries with exponential back-off and jitter, and a circuit breaker. A message that keeps failing moves to the DLQ, which fires an alarm; once the cause is fixed, it is replayed into the main queue.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** A reverse proxy with TLS (Traefik or Caddy), the receiver container, a worker and PostgreSQL with a persistent volume. PostgreSQL acts as both inbox and queue with `SKIP LOCKED`, which saves you RabbitMQ. Secrets are mounted from a protected file or read from OpenBao, and backups are a scheduled `pg_dump` plus WAL archiving if you can't lose events. Fine for modest volumes with an accepted single point of failure.

**Kubernetes on-premises.** k3s or RKE2 with the receiver as a multi-replica `Deployment` behind the ingress, cert-manager for certificates, CloudNativePG for the inbox, the RabbitMQ operator with quorum queues and KEDA scaling workers on queue length. External Secrets Operator syncs the signing secrets from OpenBao. Worth it when a Kubernetes platform already exists and several teams integrate providers.

**Cloud without Kubernetes.** The natural fit: receiver and processor as functions or Cloud Run, a managed queue, a pay-per-use database. It scales to zero between bursts and there is nothing to patch. This is the default unless you already run a cluster.

**Managed Kubernetes.** EKS, AKS or GKE with KEDA reading SQS, Service Bus or Pub/Sub. It makes sense when integrations are part of an existing microservices platform or processors need heavy dependencies and long runs.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | Low | Medium | Manual, one host | Small volume, on-premises |
| Kubernetes on-premises | Medium | High | KEDA on queue | Existing internal platform |
| Cloud serverless | Near zero | Low | Automatic, to zero | Default choice |
| Managed Kubernetes | Medium | Medium | KEDA on queue | Existing cluster or long jobs |

## Key decisions

- **How to close the gap between inbox and queue.** Storing and enqueuing are two writes that don't share a transaction. Either accept manually replaying the rare cases where the enqueue fails, or add a relay: a periodic sweep of stored-but-not-enqueued events, or a change feed (DynamoDB Streams, Cosmos DB change feed, Firestore triggers through Eventarc) that enqueues from the inbox itself.
- **Deduplicate on the way in or in the processor.** The inbox unique constraint and queue-level deduplication (Service Bus by `MessageId`, SQS FIFO for five minutes) reduce duplicates, but only an idempotent processor eliminates them.
- **One queue or one per provider.** A shared queue is simpler; one per provider stops a failing third party from filling everyone's queue and lets you rate-limit per destination.
- **Process the payload or fetch again.** Treating the webhook as a notification and reading current state from the provider's API avoids ordering problems and stale payloads, at the cost of one extra call.

## Common pitfalls

- Computing the HMAC over parsed and re-serialised JSON, or over the base64 body the gateway hands you, instead of the original bytes.
- Comparing signatures with `==` instead of a constant-time comparison.
- Checking the signature but not the timestamp, leaving the door open to replays.
- Running business logic before responding, exceeding the provider's timeout and triggering its retries.
- Retrying outbound calls with no back-off, no jitter and no limit, turning a third party's outage into an attack on it.
- A DLQ with no alarm and no rehearsed replay procedure.
- Rotating the signing secret in one step and rejecting every event signed with the old one for minutes.
