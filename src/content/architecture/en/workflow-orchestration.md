---
title: "Durable orchestration and sagas"
short: "Orchestration & sagas"
summary: "Multi-step business processes that survive crashes and deployments: a durable orchestrator records progress, retries each step, waits days for a human approval when needed and, if something fails halfway, undoes the completed work with compensations."
description: "Durable orchestration and sagas: steps, compensations, human approval, idempotency and versioning on AWS, Azure, GCP and on-premises."
order: 7
requirements:
  - "Workflow progress is saved after every step and survives restarts, crashes and deployments."
  - "Each step is retried with growing back-off and is idempotent: repeating it causes no duplicate effects."
  - "If a step fails for good, the compensations for the steps already completed run."
  - "The workflow can wait hours or days for a human decision without using compute, and with a deadline."
  - "A new deployment does not break executions already in flight."
  - "Every execution can be inspected: which step it is on, what its inputs were and why it failed."
platforms:
  onprem:
    summary: "Temporal as the orchestrator with PostgreSQL for persistence; steps are activities run by workers on Kubernetes, and the human approval is a signal the workflow waits for alongside a timer."
    notes:
      - "Workflow code must be deterministic: no system clock, random numbers or direct network calls; every side effect goes into an activity and time comes from the SDK."
      - "Changes to workflows with live executions are guarded with `patched`/`GetVersion` or with Worker Versioning, which pins each execution to the worker version that started it."
      - "Self-hosted Temporal needs a database (PostgreSQL, MySQL or Cassandra) and someone to run its internal services; Temporal Cloud removes that part and leaves the workers in your cluster."
      - "Signals deliver the human decision to the workflow; pair them with a timer so the wait has a deadline and an escalation or cancellation branch."
      - "The cost is the cluster, the database and its growth: set the namespace retention so the history of closed executions doesn't grow without bound."
  aws:
    summary: "Step Functions Standard defines the workflow in Amazon States Language, invokes each step on Lambda with `Retry` and `Catch`, and waits for the approval with the `.waitForTaskToken` pattern."
    notes:
      - "Standard runs for up to a year, executes each state exactly once unless you configure `Retry`, and keeps history for 90 days; it bills per state transition."
      - "Express runs for at most five minutes, is at-least-once (asynchronous) or at-most-once (synchronous) and supports neither `.waitForTaskToken` nor `.sync`: human approval requires Standard."
      - "The task token is sent to the approver (email, chat, internal API) and comes back through `SendTaskSuccess` or `SendTaskFailure`; set `TimeoutSeconds` or `HeartbeatSeconds` so it never waits forever."
      - "Compensations are modelled with a `Catch` on each step that leads to the states undoing the completed work, in reverse order."
      - "If the team would rather write the workflow as code, Lambda durable functions offer executions of up to a year with deterministic replay and callbacks, with no separate service."
  azure:
    summary: "Durable Functions on the isolated worker model: a code orchestrator calls activity functions, waits for the approval with `WaitForExternalEvent` plus a durable timer, and stores state in Durable Task Scheduler."
    notes:
      - "The orchestrator is replayed from history on every step forward, so it must be deterministic: use the context clock (`CurrentUtcDateTime`) and keep all I/O in activities."
      - "Durable Task Scheduler is the recommended backend: managed, with an executions dashboard, in Dedicated or Consumption SKUs; the Azure Storage provider is still available."
      - "Support for the in-process model ended on 10 November 2026: new and existing projects should use the isolated worker model."
      - "For breaking changes, built-in orchestration versioning stamps each instance with a version; the alternative is a side-by-side deployment with another task hub."
      - "The approval arrives as an external event (`RaiseEventAsync` or the HTTP API); combine it with `CreateTimer` and `Task.WhenAny` to set the deadline."
  gcp:
    summary: "Workflows defines the flow in YAML, calls Cloud Run functions over HTTP with OIDC authentication, retries with `try`/`retry`/`except` and waits for the approval on a callback endpoint."
    notes:
      - "`events.create_callback_endpoint` creates a URL the approver calls and `events.await_callback` waits on it; the default timeout is 12 hours and can be extended."
      - "An execution can last up to a year, but variables share a 512 KB limit: pass references to Cloud Storage or Firestore, not large documents."
      - "Billing is per executed step, split into internal steps and external calls; waiting costs no compute, but polling loops do cost steps."
      - "Compensations go in each step's `except` block, calling the endpoints that undo the completed work."
      - "Workflows is declarative and limited as a language; if the workflow logic is complex, Temporal on GKE or Temporal Cloud is a better fit."
tiers:
  - name: "Minimum viable"
    when: "A few workflows, low volume and a small team that doesn't want to run infrastructure."
    cost: 1
    ops: 1
    onprem: "One host with Docker Compose: Temporal, PostgreSQL and the web UI, with workers as containers on the same host and daily database backups."
    aws: "Step Functions Standard with steps on arm64 Lambda and approval through a task token sent by email."
    azure: "Durable Functions on Flex Consumption with Durable Task Scheduler on the Consumption SKU."
    gcp: "Workflows with steps on Cloud Run functions and a callback for the approval."
    tradeoffs: "No redundancy on-premises and little separation between environments; in the cloud, the per-transition or per-step cost grows fast if volume rises."
  - name: "Balanced"
    when: "Production with several business workflows, frequent deployments and a need to version without breaking executions."
    cost: 2
    ops: 2
    onprem: "Temporal on Kubernetes via its Helm chart, PostgreSQL run by CloudNativePG with a replica, and workers scaled with HPA or KEDA."
    aws: "Step Functions Standard for the business workflow with nested Express for short high-volume sub-flows; long steps on ECS Fargate with `.sync`."
    azure: "Durable Functions with Durable Task Scheduler on the Dedicated SKU and orchestration versioning turned on."
    gcp: "Workflows triggered by Eventarc, steps on Cloud Run and long jobs on Cloud Run jobs."
    tradeoffs: "More moving parts to watch and mandatory versioning discipline; cost is no longer negligible at millions of executions."
  - name: "Scale and high availability"
    when: "Critical high-volume workflows with availability targets and several teams publishing workflows."
    cost: 4
    ops: 3
    onprem: "Temporal with separate services (frontend, history, matching), persistence on Cassandra or highly available PostgreSQL and advanced visibility; or Temporal Cloud with local workers."
    aws: "Step Functions in several Regions with Distributed Map for massive batches, or Temporal Cloud with workers on EKS if the workflow is very complex."
    azure: "Durable Task Scheduler Dedicated with more capacity units, several function apps per domain and availability zones."
    gcp: "Workflows per domain with reviewed quotas, or Temporal Cloud with workers on GKE for complex, high-volume logic."
    tradeoffs: "High fixed cost and a dedicated platform team; multi-region forces you to decide what happens to in-flight executions if a region goes down."
extensions:
  - name: "Queue in front of the orchestrator"
    when: "When starts arrive in bursts and you want to cap how many workflows begin per second."
    cost: "low"
    onprem: "RabbitMQ"
    aws: "Amazon SQS"
    azure: "Service Bus"
    gcp: "Pub/Sub"
  - name: "Idempotency store"
    when: "When steps call third parties that don't accept idempotency keys and you must deduplicate yourself."
    cost: "low"
    onprem: "PostgreSQL (unique constraint)"
    aws: "DynamoDB (conditional write)"
    azure: "Cosmos DB"
    gcp: "Firestore"
  - name: "Long steps in containers"
    when: "When a step runs longer than a function allows or needs a lot of memory."
    cost: "medium"
    onprem: "Kubernetes Job"
    aws: "ECS Fargate (`.sync`)"
    azure: "Container Apps Jobs"
    gcp: "Cloud Run jobs"
  - name: "Massive fan-out"
    when: "When a workflow processes thousands of items in parallel and waits for all of them."
    cost: "medium"
    onprem: "Temporal child workflows"
    aws: "Distributed Map"
    azure: "Fan-out/fan-in"
    gcp: "`parallel` steps"
  - name: "Scheduled starts"
    when: "When the workflow must start at fixed times without a fragile external cron."
    cost: "low"
    onprem: "Temporal Schedules"
    aws: "EventBridge Scheduler"
    azure: "Timer trigger"
    gcp: "Cloud Scheduler"
  - name: "Tracing and execution search"
    when: "When support needs to find the execution for a given order and see where it stopped."
    cost: "medium"
    onprem: "Temporal visibility + OTel"
    aws: "CloudWatch Logs + X-Ray"
    azure: "Application Insights + DTS dashboard"
    gcp: "Cloud Logging + Cloud Trace"
savings:
  - "In Step Functions, nest Express workflows for short, idempotent, high-volume sub-processes: Standard bills per transition, Express per execution, duration and memory."
  - "Cut transitions and steps: transform data inside the state with JSONata or intrinsic functions instead of chaining `Pass` states, and group trivial operations into a single activity."
  - "Wait with callbacks, signals or timers rather than polling loops: waiting costs no compute, while every lap of a loop costs transitions or steps."
  - "Run steps on arm64 Lambda or on functions that scale to zero; the orchestrator already holds the state, so workers don't need to stay up."
  - "Set Step Functions logging to `ERROR` on high-volume Express workflows and set log group retention; in Temporal, shorten the namespace retention."
  - "On Azure, start with Durable Task Scheduler Consumption and move to Dedicated only once volume is sustained and you have measured it."
---

## When you need it

When a business process has several steps touching different systems and must never be left half done: an order that reserves stock, charges and ships; a customer onboarding that verifies identity, creates accounts and waits for a manager's sign-off; a loan application that goes through scoring, manual review and payout. Chaining these calls inside one HTTP request or through loose queues works until a step fails halfway: the charge went through but the shipment didn't, and nobody knows what state the order is in. A durable orchestrator records the progress of every execution, retries what fails and spells out what to do when something cannot be fixed.

You don't need it for a single-step task (that's a queue with workers), nor when several systems react independently to the same fact with no shared outcome (that's choreography with events).

## Scenarios

### An online shop getting started

One order workflow with three steps and little volume. Step Functions Standard, Durable Functions or Workflows with functions as steps cost next to nothing and there is nothing to run. The saga is short: if the charge fails, release the stock; if shipping fails, refund and release.

### Customer onboarding with manual review

Identity verification that sometimes needs a person to review documents and takes days. Here the human wait is the heart of the design: the workflow must sleep at no cost, have a deadline, escalate to another reviewer when it expires and record who decided. On AWS, rule out Express; on Workflows, extend the callback timeout beyond the 12-hour default.

### High volume of short workflows

Thousands of executions per second of workflows lasting seconds (enriching events, validating transactions). The per-transition cost of Standard explodes: use Express or an in-code flow inside the worker itself, and keep the durable orchestrator for work that really lasts and is not idempotent.

### A bank that requires on-premises

Data cannot leave the data centre and the workflow has complex logic. Self-hosted Temporal on Kubernetes, with highly available PostgreSQL and workers in the same namespaces as the services they call. The team takes on running the database and upgrading Temporal.

### A .NET team on Azure

Durable Functions lets the team write the workflow in C# with ordinary unit tests, which suits a team that doesn't want a declarative language. It demands discipline about determinism and orchestration versioning.

## How it fits together

A start (an API call or an event) begins an execution in the orchestrator with a business identifier, such as the order number, so that a second start with the same identifier doesn't create a duplicate. The orchestrator calls step 1, reserve stock, and records the result in its history before moving on. Then it calls step 2, charge, and step 3, ship. Each step is a stateless function or worker that receives an idempotency key derived from the execution and the step, so a retry after a timeout doesn't charge twice.

When the process needs a human decision, the orchestrator issues a token or a callback endpoint, sends it to the approver and waits without using compute. The response (a signal in Temporal, a token in Step Functions, an external event in Durable Functions, a callback in Workflows) resumes the execution at the exact point. Always with a deadline: if it expires, the workflow takes an escalation branch or cancels.

If the charge fails for good after exhausting retries, the orchestrator runs the compensations in reverse order: it releases the reserved stock. If shipping fails, it refunds and releases. Compensations are idempotent steps with retries too, because failing halfway through undoing is as likely as failing halfway through doing.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** Containers for Temporal (server and UI), PostgreSQL with its volume and your workers, behind a TLS reverse proxy (Traefik or Caddy) exposing only the UI and the start API. Daily PostgreSQL backups with `pg_dump` to external storage. Fine for a small team or an isolated environment, but a host failure stops every workflow (without losing them, if the database survives).

**Kubernetes on-premises.** k3s or RKE2 with the Temporal Helm chart, CloudNativePG for PostgreSQL with a replica and backups to object storage, cert-manager for certificates and HPA or KEDA to scale workers. The option when there are sovereignty requirements and a team already running Kubernetes.

**Cloud without Kubernetes.** The managed orchestrator (Step Functions, Durable Functions with Durable Task Scheduler, Workflows) with steps on functions and long steps on ECS Fargate, Container Apps Jobs or Cloud Run jobs. Nothing to patch, and next to no cost with no traffic.

**Managed Kubernetes.** Temporal Cloud or self-hosted Temporal with workers on EKS, AKS or GKE. Worth it when workflows are complex, the team wants to write them as code in its usual language and a Kubernetes platform already exists.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | Low | Medium | Manual, one host | Small team, on-premises |
| Kubernetes on-premises | Medium | High | HPA/KEDA on workers | Sovereignty, existing platform |
| Managed orchestrator | Near zero | Low | Automatic | Most cloud cases |
| Temporal on EKS/AKS/GKE | Medium-high | Medium-high | HPA/KEDA | Complex workflows as code |

## Key decisions

- **Orchestration or choreography.** An orchestrator gives you one place to see state and decide compensations; event choreography couples less, but process state ends up scattered and is hard to debug.
- **Declarative or code workflows.** ASL and the Workflows YAML render as a diagram and have no determinism concerns; Temporal, Durable Functions and Lambda durable functions are tested like code but demand determinism and careful versioning.
- **Standard or Express.** Standard for long, non-idempotent workflows or those with a human wait; Express for short, idempotent, high-volume ones.
- **Managed or self-hosted.** A managed orchestrator ties you to the cloud but needs no operations; Temporal is portable and powerful, at the cost of a critical database and upgrades of your own.
- **Step granularity.** Steps that are too fine raise cost and lengthen history; steps that are too coarse make a retry repeat work and complicate compensation.

## Common pitfalls

- Non-idempotent steps: a timeout after a successful charge causes a second charge on retry.
- Compensations that assume the original step actually ran, or that have never been tested.
- Human waits with no deadline, leaving thousands of executions open for months.
- Deploying a change to the order of steps without versioning and breaking in-flight executions with non-determinism errors.
- Putting large documents in workflow state instead of references to object storage.
- Using the orchestrator as a high-volume queue for single-step tasks and paying for transitions for nothing.
