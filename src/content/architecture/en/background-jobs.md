---
title: "Queues and background jobs"
short: "Queues and workers"
summary: "Move everything slow or fragile out of the request-response path: the API enqueues, workers process at their own pace and scale with the queue, and whatever keeps failing ends up isolated in a dead-letter queue."
description: "Queues, autoscaled workers, DLQ, scheduled jobs, retries and idempotency: a reference architecture on AWS, Azure, GCP and on-premises."
order: 5
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
tiers:
  - name: "Local queue or serverless"
    when: "A small product with jobs of seconds or a few minutes, modest volume and a team that doesn't want to run a broker."
    cost: 1
    ops: 1
    onprem: "One host with Docker Compose: Celery with Valkey (Redis) as the broker, a single `celery beat` for scheduled work and PostgreSQL for job status; RabbitMQ if you can't accept losing messages on restart."
    aws: "SQS with its DLQ, Lambda behind an event source mapping as the worker and EventBridge Scheduler for periodic work."
    azure: "Service Bus Standard, Container Apps at zero minimum replicas scaled by KEDA and Container Apps Jobs with a schedule trigger."
    gcp: "Pub/Sub with a push subscription to Cloud Run at zero minimum instances, a dead-letter policy and Cloud Scheduler."
    tradeoffs: "Duration limits (15 minutes on Lambda, the request timeout with push) and little control over pace; with Celery on Redis, delivery depends on the persistence you configure."
  - name: "Autoscaled workers"
    when: "Sustained volume, jobs of up to hours and several job types with different priorities."
    cost: 2
    ops: 2
    onprem: "RabbitMQ with quorum queues on three nodes, workers on Kubernetes scaled by KEDA (down to zero) and a `CronJob` with `concurrencyPolicy: Forbid`."
    aws: "SQS and ECS Fargate tasks scaled on backlog per task, with Fargate Spot for capacity that can be interrupted."
    azure: "Service Bus with a queue per job type, Container Apps with the KEDA Service Bus scaler and event-driven jobs for long work."
    gcp: "Pub/Sub with Cloud Run worker pools pulling, or Cloud Tasks when you need to limit the rate, and Cloud Run jobs for batches."
    tradeoffs: "You have to tune visibility, locks, concurrency and scaling limits; the baseline cost rises if you keep workers warm."
  - name: "Batch executor for long and GPU jobs"
    when: "Rendering, transcoding, batch inference or hours-long calculations that need GPUs, lots of memory or Spot machines."
    cost: 3
    ops: 2
    onprem: "Kubernetes with Kueue to queue `Job`s and share them across GPU nodes (NVIDIA GPU Operator), with per-team quotas."
    aws: "AWS Batch with EC2 compute environments (GPU and Spot) or Fargate; EventBridge Pipes carries SQS messages to the Batch job queue."
    azure: "Azure Batch with GPU VM pools and Spot VMs, fed from Service Bus by a dispatcher."
    gcp: "Google Cloud Batch with GPUs and Spot VMs, launched by a dispatcher on Cloud Run from Pub/Sub."
    tradeoffs: "Start-up takes minutes (provisioning VMs and pulling the image), there is one more component to run, and bills grow fast if you don't cap vCPUs and GPUs."
extensions:
  - name: "Delayed retry"
    when: "When failures come from third parties that recover on their own and retrying immediately only makes things worse."
    cost: "low"
    onprem: "TTL wait queues or delayed plugin"
    aws: "SQS visibility timeout change"
    azure: "Service Bus scheduled messages"
    gcp: "Cloud Tasks with a schedule time"
  - name: "Rate control towards third parties"
    when: "When an external API has a quota that worker autoscaling would blow through."
    cost: "low"
    onprem: "Token bucket in Valkey"
    aws: "SQS-Lambda maximum concurrency"
    azure: "Container Apps max replicas"
    gcp: "Cloud Tasks rate limits"
  - name: "Priorities"
    when: "When interactive jobs cannot wait behind a nightly batch."
    cost: "low"
    onprem: "One RabbitMQ queue per priority"
    aws: "One SQS queue per priority"
    azure: "One Service Bus queue per priority"
    gcp: "One topic and subscription per priority"
  - name: "Batch executor with GPUs"
    when: "When some jobs run for hours, need GPUs or can run on Spot with retries."
    cost: "high"
    onprem: "Kueue + Jobs on GPU nodes"
    aws: "AWS Batch"
    azure: "Azure Batch"
    gcp: "Batch (Google Cloud)"
  - name: "Multi-step flows"
    when: "When a job chains steps with waits, compensations or human approval."
    cost: "medium"
    onprem: "Temporal"
    aws: "Step Functions"
    azure: "Durable Functions"
    gcp: "Workflows"
  - name: "Completion notification"
    when: "When the client shouldn't poll for status and would rather get a webhook or a live notification."
    cost: "low"
    onprem: "SSE from the API + webhooks"
    aws: "Amazon SNS"
    azure: "Event Grid"
    gcp: "Pub/Sub (results topic)"
savings:
  - "Run idempotent workers on interruptible capacity: Fargate Spot, Spot in AWS Batch, Spot VMs in Azure Batch and Spot VMs in Google Cloud Batch. An idempotent worker survives the interruption without losing work."
  - "Scale to zero outside working hours: KEDA on Kubernetes, Container Apps with a minimum of zero, Cloud Run and Lambda charge no compute while the queue is empty; the fixed cost stays with the broker."
  - "On SQS, use long polling (`WaitTimeSeconds` up to 20 s) and batch sends and receives: you pay per request, and empty receives are requests too."
  - "Lambda on `arm64` and Fargate on Graviton cost less per unit of compute than x86; worker images usually build for ARM unchanged."
  - "Apply lifecycle rules to results in object storage: automatic expiry for temporary output and infrequent-access or archive classes for what you must keep."
  - "Keep Service Bus on Standard while volume allows; Premium has a fixed cost per messaging unit and only pays off when you need isolation or predictable throughput."
---

## When you need it

When a request triggers something that takes longer than a user should wait, or that depends on an unreliable third party: rendering a PDF, sending a thousand emails, rebuilding a report, calling a rate-limited external API. Also when there is periodic work (daily closes, clean-ups, syncs). Do it inside the request and a traffic spike or a slow third party takes the API down; with a queue, the spike turns into delay.

## Scenarios

### An MVP with Celery and Redis

A Python team with a single server doesn't need a managed broker on day one. Celery with Valkey (or Redis) as the broker and `celery beat` for periodic work cover the case in one `docker-compose.yml`. Two conditions: turn on AOF persistence on the broker or accept that a restart loses messages, and set `visibility_timeout` above your longest job, because with Redis an unacknowledged job is redelivered to another worker when it expires. If those guarantees matter, switch the broker to RabbitMQ; the task code doesn't change.

### Long or GPU jobs

Transcoding video, rendering or running batch inference doesn't fit in a function or an always-on worker. Here the executor changes: the API still enqueues the same way, but a dispatcher hands those jobs to AWS Batch (or Azure Batch, Google Cloud Batch, Kueue on-premises), which provisions GPU or Spot machines, runs the container and shuts them down. Batch adds per-attempt retries, per-job timeouts and array jobs.

### Critical scheduled jobs

An accounting close or monthly billing must neither run twice nor be skipped. The scheduler only enqueues a message with a period key (`close:2026-11-24`), and a unique constraint on the jobs table prevents the duplicate. Schedule in UTC or an explicit time zone (EventBridge Scheduler and Cloud Scheduler accept a time zone; the `CronJob` has `timeZone`), watch daylight saving changes and alert if the expected run hasn't finished on time.

### Integrating with a rate-limited third party

If the provider allows a hundred requests a minute, autoscaling is your enemy. Cap the concurrency of that queue's workers or use a queue with rate control (Cloud Tasks), honour `Retry-After`, and keep that provider's messages on their own queue so its outage doesn't block everything else.

## How it fits together

The API validates the request, records the job as pending in the database, enqueues a message carrying its ID and returns `202 Accepted` with a status URL. The scheduler does the same at fixed times: it never runs the job itself, it only enqueues it, so it inherits retries, the DLQ and scaling. The queue absorbs the burst, and its depth is the scaling signal.

Each worker takes a message, does the work, stores the heavy output in object storage, updates the job status in the database and only then acknowledges the message. If it fails, the message reappears after the visibility timeout or lock expires and is retried. After N attempts it moves to the dead-letter queue, where someone inspects it and decides whether to replay it.

The executor is swappable as long as the contract is stable: a message with `job_id`, type, idempotency key and references to the data (never the data itself), and a container image with an entry point like `run-job <job_id>`. That same image runs as a Celery worker, a Fargate task or an AWS Batch job; what changes is who starts it. Batch job state change events update the same jobs table.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** Containers for `api`, `worker` (with `--concurrency` matched to the CPU), a single `beat`, the broker (Valkey with AOF or RabbitMQ) on a persistent volume and PostgreSQL for status. Results go to S3-compatible storage (Ceph RGW if you already have it; on a single host, Garage or SeaweedFS). Back up the database; the broker only holds pending work, but its volume stops you losing it on restart.

**Kubernetes on-premises.** The RabbitMQ operator creates the cluster with quorum queues, KEDA scales the worker `Deployment` with a `ScaledObject` or launches one `Job` per message with a `ScaledJob`, and `CronJob`s cover periodic work. CloudNativePG or Patroni for status. For GPUs, the NVIDIA GPU Operator and Kueue, which queues `Job`s until quota and nodes are available.

**Cloud without Kubernetes.** This is the design in the diagram: SQS with Lambda or Fargate, Service Bus with Container Apps and Container Apps Jobs, Pub/Sub with Cloud Run and Cloud Scheduler. For long or GPU jobs, AWS Batch, Azure Batch or Google Cloud Batch.

**Managed Kubernetes.** EKS, AKS or GKE pay off if they already run the API and you want one model for services, workers and batches. KEDA is an add-on on AKS and installs with Helm elsewhere; on EKS, Karpenter provisions Spot or GPU nodes only while there are jobs.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Compose + Celery | One host | Medium | Manual | MVP, low volume |
| Kubernetes + KEDA | Cluster and broker | High | On queue depth, to zero | On-premises, many job types |
| Managed queue + serverless | Near zero | Low | Automatic | Default choice in the cloud |
| Batch service | Zero with no jobs | Medium | Per job, with Spot and GPUs | Hours-long or GPU jobs |

## Key decisions

- **Containers or functions for workers.** Functions scale on their own and bill per use but have a duration limit; containers handle long jobs and heavy dependencies.
- **Executor by job type.** Queue and workers for short, frequent work; a batch service for long, GPU or Spot work. With a shared contract, moving a job type from one to the other is configuration.
- **Queue or bus.** Work that exactly one kind of worker must do belongs on a queue. If several systems react to the same fact, that is an event and belongs on a bus.
- **Push or pull.** Push keeps the worker simple (it's an HTTP endpoint) but hands over control of the pace; pull gives fine-grained concurrency control in exchange for managing consumption.
- **Managed or self-hosted.** RabbitMQ offers routing flexibility; a managed queue removes operations but imposes its own size and duration limits.

## Common pitfalls

- Assuming exactly-once delivery. All of these queues deliver at least once: workers must be idempotent, for example with an idempotency key and a unique constraint in the database.
- Retrying with no back-off and no limit, turning a third party's outage into an attack on it.
- A visibility timeout shorter than the job: two workers process the same message.
- Starting two `celery beat` processes (or two replicas of a home-grown scheduler): every scheduled job runs twice.
- A DLQ with no alarm and no replay procedure, which just piles up.
- Putting the whole file in the message instead of a reference to the object.
