---
title: "Queues and background jobs"
short: "Queues and workers"
summary: "Move everything slow or fragile out of the request-response path: the API enqueues, workers process at their own pace and scale with the queue, and whatever keeps failing ends up isolated in a dead-letter queue."
description: "Queues, autoscaled workers, DLQ, scheduled jobs, retries and idempotency: a reference architecture on AWS, Azure, GCP and on-premises."
order: 2
requirements:
  - "The API responds as soon as the job is enqueued, without waiting for the result."
  - "A job can run more than once without producing duplicate side effects."
  - "Transient failures are retried with growing back-off; persistent ones go to a DLQ."
  - "Workers scale with queue depth and drop to the minimum when there is no work."
  - "The status of every job can be queried at any time."
  - "Scheduled jobs neither overlap nor go missing silently."
platforms:
  onprem:
    summary: "RabbitMQ as the queue with its dead-letter exchange, workers on Kubernetes scaled by KEDA on queue length and a `CronJob` for periodic work."
    notes:
      - "Use quorum queues: they replicate messages and enforce a delivery limit, so a poison message ends up in the DLX instead of being requeued forever."
      - "KEDA reads the queue length and scales the `Deployment` (or launches `Job`s), down to zero."
      - "On the `CronJob`, `concurrencyPolicy: Forbid` prevents overlaps and `startingDeadlineSeconds` decides what happens to missed runs."
      - "RabbitMQ has no built-in delayed retry: build it with TTL wait queues that dead-letter back to the original queue, or with the delayed message plugin."
      - "The cost is running the RabbitMQ cluster (replicas, disks, upgrades) and node capacity for peaks."
  aws:
    summary: "The API and EventBridge Scheduler publish to SQS; workers are ECS Fargate tasks scaled on backlog or Lambda functions behind an event source mapping, and the DLQ is another SQS queue with a redrive policy."
    notes:
      - "The SQS visibility timeout must exceed the job duration; with Lambda, AWS recommends at least six times the function timeout."
      - "With Lambda, enable `ReportBatchItemFailures` so one bad message doesn't force the whole batch to retry."
      - "Lambda fits jobs that take minutes; for long or memory-hungry jobs, use Fargate with autoscaling on backlog per task."
      - "Standard SQS delivers at least once with no ordering; FIFO adds per-group ordering and deduplication at the cost of throughput."
      - "SQS bills per request and Lambda per invocation and duration; Fargate per task time, so scaling down to zero or the minimum matters."
  azure:
    summary: "Service Bus queues with their dead-letter subqueue, workers on Container Apps scaled by the KEDA Service Bus scaler, and Container Apps Jobs for scheduled work."
    notes:
      - "Every Service Bus queue has a dead-letter subqueue; a message lands there after exceeding the maximum delivery count, or on expiry if you enable it."
      - "Receive in peek-lock mode and renew the lock on long jobs: if it expires, another worker gets the same message."
      - "Container Apps supports KEDA scale rules on apps and also event-driven jobs, which suit cases where each message is a long job."
      - "Service Bus scheduled messages give you delayed retries with no extra infrastructure."
      - "The Standard tier bills per operation; Premium has a fixed cost per messaging unit in exchange for isolation and predictable performance."
  gcp:
    summary: "The API and Cloud Scheduler publish to Pub/Sub; a push subscription delivers each message to Cloud Run and a dead-letter policy sets aside the ones that fail."
    notes:
      - "With push, Cloud Run scales on incoming requests, not on depth: Pub/Sub adjusts the delivery rate based on responses. For continuous pull consumption there are Cloud Run worker pools."
      - "If you need rate limiting, per-task scheduling or deduplication by name, Cloud Tasks is a better job queue than Pub/Sub."
      - "Dead-lettering is set on the subscription and needs the Pub/Sub service account to have permissions on the target topic; the attempt count is approximate."
      - "The ack deadline and the Cloud Run request timeout must cover the job duration; for long batches, Cloud Run jobs are a better fit."
      - "Pub/Sub bills by data volume; Cloud Run by CPU and memory while serving requests."
---

## When you need it

When a request triggers something that takes longer than a user should wait, or that depends on an unreliable third party: rendering a PDF, sending a thousand emails, rebuilding a report, calling a rate-limited external API. Also when there is periodic work (daily closes, clean-ups, syncs). Do it inside the request and a traffic spike or a slow third party takes the API down; with a queue, the spike turns into delay.

## How it fits together

The API validates the request, records the job as pending in the database, enqueues a message carrying its ID and returns `202 Accepted`. The scheduler does the same at fixed times. The queue absorbs the burst, and its depth is the scaling signal: the more messages waiting, the more workers start.

Each worker takes a message, does the work, stores the heavy output in object storage, updates the job status in the database and only then acknowledges the message. If it fails, the message reappears after the visibility timeout or lock expires and is retried. After N attempts it moves to the dead-letter queue, where someone inspects it and decides whether to replay it.

## Key decisions

- **Containers or functions for workers.** Functions scale on their own and bill per use but have a duration limit; containers handle long jobs and heavy dependencies.
- **Queue or bus.** Work that exactly one kind of worker must do belongs on a queue. If several systems react to the same fact, that is an event and belongs on a bus.
- **Push or pull.** Push keeps the worker simple (it's an HTTP endpoint) but hands over control of the pace; pull gives fine-grained concurrency control in exchange for managing consumption.
- **Managed or self-hosted.** RabbitMQ offers routing flexibility; a managed queue removes operations but imposes its own size and duration limits.

## Common pitfalls

- Assuming exactly-once delivery. All of these queues deliver at least once: workers must be idempotent, for example with an idempotency key and a unique constraint in the database.
- Retrying with no back-off and no limit, turning a third party's outage into an attack on it.
- A visibility timeout shorter than the job: two workers process the same message.
- A DLQ with no alarm and no replay procedure, which just piles up.
- Putting the whole file in the message instead of a reference to the object.
