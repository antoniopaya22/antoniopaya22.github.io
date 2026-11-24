---
title: "Observability with OpenTelemetry"
short: "Observability"
summary: "Instrument services once with OpenTelemetry, ship metrics, logs and traces through a collector to the right backends, and alert on service level objectives (SLOs) that reflect what users notice, without the ingestion bill running away."
description: "Observability with OpenTelemetry: SDK, collector, metrics, logs, traces, dashboards, SLO alerts and synthetic probes on AWS, Azure, GCP and on-premises."
order: 18
requirements:
  - "Services are instrumented with OpenTelemetry and export OTLP; changing backend needs no code change."
  - "Metrics, logs and traces share resource attributes and the trace ID, so you can jump from one signal to another."
  - "Alerts are based on SLOs (error budget burn rate), not CPU thresholds."
  - "External probes check critical journeys from outside even when there is no traffic."
  - "Metric cardinality and log and trace volume are capped and measured per service."
platforms:
  onprem:
    summary: "Services send OTLP to the OpenTelemetry Collector or Grafana Alloy, which fans out to Prometheus or Mimir, Loki and Tempo; Grafana presents, Alertmanager notifies and the blackbox exporter probes from outside."
    notes:
      - "Deploy the collector in two tiers: a per-node agent (DaemonSet) that adds Kubernetes metadata and a gateway that batches, filters and samples before sending."
      - "Tail sampling needs every span of a trace to reach the same replica: put the `loadbalancing` exporter, keyed on trace ID, in front of the gateway."
      - "Mimir, Loki, Tempo and Grafana are AGPLv3; Prometheus, Alertmanager and the OpenTelemetry Collector are Apache 2.0. Check this if you distribute the stack to customers."
      - "Generate multi-window burn-rate SLO rules with Sloth or Pyrra from one file per service instead of writing them by hand."
      - "The cost is disk and memory: Prometheus grows with active series, and Loki and Tempo with the volume kept in object storage."
  aws:
    summary: "The ADOT Collector sends metrics to Amazon Managed Service for Prometheus, logs to CloudWatch Logs and traces to X-Ray; Amazon Managed Grafana presents, CloudWatch alarms notify and CloudWatch Synthetics probes."
    notes:
      - "The X-Ray SDKs and daemon have been in maintenance mode since 25 February 2026 and reach end of support on 25 February 2027: instrument with OpenTelemetry and send traces over OTLP to the X-Ray endpoint."
      - "CloudWatch accepts OTLP directly for traces and logs (HTTP only, SigV4-signed), and since 2026 also OpenTelemetry metrics queryable with PromQL; that is an alternative to Managed Prometheus if you prefer a single service."
      - "CloudWatch Application Signals defines SLOs on each service's latency and availability and alarms on burn rate."
      - "CloudWatch Logs bills per GB ingested and stored: set retention on every log group and use the Infrequent Access class for logs that are rarely queried."
      - "Managed Prometheus bills per sample ingested and queried, so cardinality and scrape interval drive the bill."
  azure:
    summary: "An OpenTelemetry Collector sends metrics to Azure Monitor managed Prometheus, logs to Log Analytics and traces to Application Insights; Azure Managed Grafana presents, Azure Monitor alerts notify and availability tests probe."
    notes:
      - "Azure Monitor supports native OTLP ingestion from the collector and from the Azure Monitor Agent; the Azure Monitor OpenTelemetry Distro is the shortest path to instrument from the SDK."
      - "Application Insights stores its data in a Log Analytics workspace, so logs and traces are queried together with KQL."
      - "Log Analytics bills per GB ingested: the Basic plan and commitment tiers make high-volume logs cheaper, and transformations in the data collection rule drop fields before you pay for them."
      - "Use standard tests for probes; classic URL ping tests are being retired."
      - "Action groups centralise who gets notified and how (email, webhook, on-call tool), and an alert rule can use PromQL on the Prometheus workspace."
  gcp:
    summary: "An OpenTelemetry Collector sends metrics to Managed Service for Prometheus, logs to Cloud Logging and traces to Cloud Trace; Cloud Monitoring presents and alerts with SLO policies, and uptime checks probe."
    notes:
      - "The Telemetry API (`telemetry.googleapis.com`) accepts OTLP for traces, metrics and logs; metrics are stored as Prometheus series and billed as ingested samples."
      - "Google publishes its own collector distribution (Google-Built OpenTelemetry Collector) with exporters and authentication preconfigured."
      - "Cloud Monitoring has native service SLOs with burn-rate alerting; they are the most direct way to meet the SLO alerting requirement."
      - "Cloud Logging bills per GiB ingested above the free allotment: exclusion filters on the sink drop noisy logs before they are billed."
      - "Grafana can query Managed Prometheus with PromQL if the team already works in Grafana rather than Cloud Monitoring dashboards."
tiers:
  - name: "Provider-native"
    when: "A small team with a few services that wants to see errors and latency without building anything."
    cost: 1
    ops: 1
    onprem: "One host with Docker Compose: collector, Prometheus, Loki, Tempo and Grafana with short retention on local disk."
    aws: "OpenTelemetry SDK exporting OTLP straight to CloudWatch and X-Ray, Application Signals for SLOs and CloudWatch alarms."
    azure: "Azure Monitor OpenTelemetry Distro into Application Insights, Azure Monitor alerts and standard tests."
    gcp: "OpenTelemetry SDK exporting to the Telemetry API, Cloud Monitoring dashboards and SLOs, and uptime checks."
    tradeoffs: "With no collector there is no central sampling or filtering: everything the code emits is billed, and changing backend means reconfiguring every service."
  - name: "Collector plus managed backends"
    when: "Dozens of services, several teams and a need to control cost and cardinality."
    cost: 2
    ops: 2
    onprem: "Kubernetes with the OpenTelemetry Operator, agent and gateway collectors, Mimir, Loki and Tempo on object storage, and Grafana."
    aws: "The diagram as drawn: ADOT Collector, Managed Prometheus, CloudWatch Logs, X-Ray, Managed Grafana, alarms and Synthetics."
    azure: "The diagram as drawn: collector, managed Prometheus, Log Analytics, Application Insights, Managed Grafana and alerts."
    gcp: "The diagram as drawn: collector, Managed Service for Prometheus, Cloud Logging, Cloud Trace, Cloud Monitoring and uptime checks."
    tradeoffs: "The collector gateway is one more thing to run and scale; if it goes down, telemetry is lost unless it has a persistent queue."
  - name: "Platform observability"
    when: "Many teams, several accounts or regions, contractual SLOs and a per-team observability budget."
    cost: 4
    ops: 3
    onprem: "Multi-tenant Mimir, Loki and Tempo with per-team limits, per-cluster collectors and Grafana with per-team folders and permissions."
    aws: "Central observability accounts with CloudWatch cross-account, one Prometheus workspace per environment and Grafana with SSO."
    azure: "Log Analytics and Azure Monitor workspaces per environment with shared data collection rules and a central Managed Grafana."
    gcp: "Metrics scopes that aggregate several projects, centralised log buckets and per-service SLOs."
    tradeoffs: "Ingestion cost grows with every team; without per-tenant limits, one badly instrumented service eats everyone's budget."
extensions:
  - name: "Continuous profiling"
    when: "When latency or CPU cost can't be explained by traces."
    cost: "low"
    onprem: "Grafana Pyroscope"
    aws: "Pyroscope on ECS or EKS"
    azure: "Application Insights Profiler"
    gcp: "Cloud Profiler"
  - name: "Real user monitoring"
    when: "When what degrades is the browser or the app, not the backend."
    cost: "medium"
    onprem: "Grafana Faro"
    aws: "CloudWatch RUM"
    azure: "App Insights JavaScript SDK"
    gcp: "OpenTelemetry web SDK"
  - name: "On-call management"
    when: "When there are rotations, escalations and someone must acknowledge the alert."
    cost: "low"
    onprem: "Grafana OnCall or Alertmanager"
    aws: "SNS + external tool"
    azure: "Action groups + external tool"
    gcp: "Notification channels + external tool"
  - name: "Cheap log archive"
    when: "When audit requires keeping logs for months or years that hardly anyone queries."
    cost: "low"
    onprem: "Loki on object storage"
    aws: "Export to S3 + Athena"
    azure: "Log Analytics Auxiliary plan"
    gcp: "Sink to Cloud Storage or BigQuery"
  - name: "Tail sampling"
    when: "When keeping every trace is expensive but you want to keep errors and slow requests."
    cost: "low"
    onprem: "Tail sampling in the gateway"
    aws: "Tail sampling in ADOT"
    azure: "Tail sampling in the collector"
    gcp: "Tail sampling in the collector"
savings:
  - "Filter in the collector before sending: drop debug logs, health checks and high-cardinality attributes (user IDs, full URLs) from metrics."
  - "Sample traces: a fixed percentage for normal traffic and always keep errors and slow requests with tail sampling."
  - "Set explicit retention per log type and use the cheap tiers (CloudWatch Logs Infrequent Access, Log Analytics Basic or Auxiliary plans, short-retention buckets in Cloud Logging)."
  - "Raise the metric scrape interval from 15 to 60 seconds where you don't need more resolution: ingested samples drop in the same proportion."
  - "Use Log Analytics commitment tiers or reservations when daily ingestion is steady."
  - "Switch off or slow down synthetic probes in non-production environments and set their frequency from the SLO, not to the minimum possible."
---

## When you need it

As soon as there is more than one service and someone asks 'why is it slow?' and nobody can answer within minutes. With a monolith and a database, server logs and the provider's metrics are enough. With several services, queues and external dependencies, a slow request crosses five systems and only a distributed trace tells you where the time went.

The second reason is the bill: without a central place to filter and sample, observability ends up costing a noticeable share of the infrastructure it observes.

## Scenarios

- **Startup with three services.** The OpenTelemetry SDK with auto-instrumentation exports straight to the cloud's native backend. One availability SLO and one latency SLO on the main endpoint, plus a synthetic probe on sign-up and checkout. No collector of your own yet.
- **Company with several teams on Kubernetes.** The OpenTelemetry Operator injects auto-instrumentation, agent and gateway collectors, per-team cardinality limits and standard dashboards per service. Each team owns its SLOs.
- **Regulated sector.** Logs contain personal data: the collector masks it before it leaves the cluster, retention is defined per type and audit logs go to an immutable archive separate from operational logs.
- **On-premises or air-gapped customer.** The full Grafana stack (Mimir, Loki, Tempo) with local object storage; probes run from another network so they don't share the fate of the system they watch.
- **Moving between clouds or to an observability SaaS.** Because code only speaks OTLP, the switch happens in the collector: send to both destinations in parallel during the transition, then switch off the old one.

## How it fits together

Every service carries the OpenTelemetry SDK, which produces metrics, logs and traces with the same resource attributes (`service.name`, version, environment) and propagates trace context on outgoing calls. Everything is exported over OTLP to the collector.

The collector is the control point: it adds metadata (pod, node, region), batches, filters what you don't want to pay for, samples traces and forwards each signal to its backend. Metrics go to the Prometheus-compatible store; logs to the log store; traces to the trace store. Because they share the trace ID, you can jump from an error log to its trace, and from a spike on a dashboard to example traces (exemplars).

Dashboards read metrics for health and trends. Alerts are defined on SLOs: for example, 99.5% of checkout requests succeed in under 800 ms over 30 days, with a page when the error budget burns too fast. The latency and error metrics behind those SLOs can be derived from traces in the collector or the backend, which is what the arrow from traces to alerts represents.

Synthetic probes hit critical journeys from outside and alert even when there is no real traffic, in the middle of the night for instance.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** For a small or lab environment: OpenTelemetry Collector, Prometheus, Loki, Tempo and Grafana with local volumes and short retention, and Alertmanager sending to email or chat. Caddy in front of Grafana with TLS. Also handy on a developer laptop to see traces locally.

**On-premises Kubernetes (k3s or RKE2).** OpenTelemetry Operator (an `OpenTelemetryCollector` resource in DaemonSet and Deployment modes, plus `Instrumentation` for auto-instrumentation), kube-prometheus-stack or Mimir, Loki and Tempo in distributed mode on object storage (Ceph or MinIO), cert-manager for TLS and Sloth or Pyrra for SLO rules.

**Cloud without Kubernetes.** On ECS Fargate, Container Apps or Cloud Run the collector runs as a sidecar or as a shared gateway service; for functions, use the OpenTelemetry layer or extension or export directly. The backends are the provider's managed ones.

**Managed Kubernetes (EKS, AKS, GKE).** Same OpenTelemetry Operator and managed backends; each provider's add-ons (ADOT on EKS, managed Prometheus on AKS and GKE) install the agents in one step.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | Very low | Medium | One host | Lab, few services |
| On-prem Kubernetes | Medium (disks) | High | Horizontal | Sovereignty, air-gapped |
| Managed backends, no K8s | Per ingestion | Low | Automatic | Managed containers or functions |
| Managed Kubernetes | Per ingestion | Medium | Horizontal | Existing Kubernetes platform |

## Key decisions

- **OpenTelemetry or vendor agents.** OpenTelemetry takes a little more setup but decouples code from backend; proprietary agents are quicker to start and lock you in.
- **Central collector or direct export.** Without a collector everything is simpler, but there is no tail sampling, filtering or shared masking. Beyond a handful of services the collector pays for itself.
- **Managed or self-hosted.** The self-hosted Grafana stack is cheap in licences and expensive in people; managed backends bill per ingestion and you have to watch the volume.
- **Alert on SLOs or on technical symptoms.** CPU or memory alerts wake people up when users notice nothing; SLO alerts fire when the promise is actually being broken. Keep a few technical alerts for failures that predict an outage (disk filling up, certificate about to expire).

## Common pitfalls

- Using user ID, order ID or the full URL as a metric label and multiplying active series.
- Logging every request with its full body at info level in production.
- Not propagating trace context through queues and async jobs, so traces break exactly where the problem is.
- Alerts nobody acts on because they fire daily; they get silenced and the real one goes unnoticed.
- Still instrumenting new projects with the X-Ray SDKs.
- Synthetic probes running from the same network or region as the system they watch.
