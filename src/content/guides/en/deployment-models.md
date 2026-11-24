---
title: "Docker, Kubernetes or serverless: how to deploy"
short: "How to deploy"
summary: "Five ways to put a container or a function into production, from docker-compose on a VM to managed Kubernetes, compared on fixed cost, operations, scaling and limits, with a decision tree."
description: "Docker Compose, self-managed Kubernetes, container PaaS, managed Kubernetes or functions: costs, operations, limits and when to choose each model."
order: 1
---

"Docker, Kubernetes or serverless?" is usually the wrong question: the technologies aren't really competing. What you are choosing is how much platform you run yourself and how much you pay someone else to run. The five options in this guide all run the same container image (or close to it), but they differ in who patches, who scales, who gets woken up at 3 a.m. and how much you pay when there is no traffic.

My default starting point for a new product is a **container PaaS**: it scales without managing nodes, costs little when idle and doesn't tie the code to any provider. The other options need specific reasons, explained below.

## The five options at a glance

| | Compose on one host | Self-managed Kubernetes | Container PaaS | Managed Kubernetes | Functions |
|---|---|---|---|---|---|
| Minimum fixed cost | One VM or server | Several nodes (control plane + workers) and storage | Close to zero with scale to zero | Control plane (~USD 0.10/h on EKS, AKS Standard and GKE) plus nodes | Zero |
| Cost at scale | Lowest per unit of compute, until it no longer fits on one machine | Low per unit at volume; expensive in people | Medium: you pay a premium for not managing | Low to medium in compute, plus the cost of running add-ons | High under sustained traffic |
| Operational effort | Low to medium: OS, backups, updates | Very high | Low | Medium to high | Very low |
| Scaling | Vertical, manual | Horizontal (HPA, KEDA) if there are nodes | Automatic horizontal | Automatic horizontal, nodes included | Automatic per request or event |
| Scale to zero | No | With KEDA or Knative, but the nodes stay | Yes on Container Apps and Cloud Run; not on Fargate or App Service | Pods yes; control plane no | Yes |
| Cold start | N/A | No, unless scaled to zero | Seconds when coming from zero | No, unless scaled to zero | Hundreds of ms to seconds |
| Portability | Full | Full | High: the image is standard, the config isn't | High: Kubernetes manifests | Low: provider triggers and SDKs |
| Limits | The machine's | The nodes' | Cloud Run: 8 vCPU, 32 GiB, 60 min per request; Fargate: 32 vCPU, 244 GB | The nodes' | Lambda: 30 min, 10 GB; Flex Consumption: 4 GB, HTTP 230 s |
| Team needed | One person with solid sysadmin judgement | A platform team with on-call | Developers with cloud basics | At least two people fluent in Kubernetes | Developers |
| When | A small product, an on-prem customer, a minimal budget | Sovereignty, mandatory on-prem, large and stable scale | Almost any new API or web app | Many services, Kubernetes-specific needs, a team already trained | Sporadic traffic, events, short tasks |

## 1. Docker Compose on one host

Your own server or a VM (EC2, Azure VM, Compute Engine) with Docker, a `compose.yaml` and a reverse proxy in front. It is the most underrated option: a 4-vCPU VM running PostgreSQL, the API and a proxy will comfortably serve thousands of users of a business application.

```yaml
services:
  proxy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes: ["./Caddyfile:/etc/caddy/Caddyfile", "caddy_data:/data"]
  api:
    image: registry.example.com/api@sha256:…
    env_file: .env
    depends_on:
      db: { condition: service_healthy }
    restart: unless-stopped
  db:
    image: postgres:17
    volumes: ["pg_data:/var/lib/postgresql/data"]
    healthcheck: { test: ["CMD", "pg_isready"], interval: 10s }
    restart: unless-stopped
volumes: { caddy_data: {}, pg_data: {} }
```

What you have to solve yourself:

- **TLS and proxy.** Caddy obtains and renews certificates automatically with no configuration. Traefik does it too via ACME, but you need to declare a `certificatesResolvers` entry and reference it from each router.
- **Backups.** A scheduled `pg_dump` or, better, continuous WAL archiving (pgBackRest, WAL-G) to object storage somewhere else, plus disk snapshots. Test a restore every month.
- **Updates.** Automatic OS patches (`unattended-upgrades` or equivalent), images pinned by digest and a `docker compose pull && docker compose up -d` procedure that CI can run. Use `docker compose` (v2): the old `docker-compose` v1 has been unmaintained since 2023.
- **Observability.** Docker log driver with rotation and an agent shipping logs off the box; host metrics and disk alerts.

The limit is clear: one host is a single point of failure, scaling is vertical and every deployment causes a brief interruption unless you hand-build a blue/green setup. If the business tolerates minutes of downtime during an update, it's an excellent option.

## 2. Self-managed Kubernetes (on-prem or local)

It makes sense when the deployment must be on-prem (sovereignty, customers who require it, your own data centres) or when scale is large and stable and you have a platform team. It's not the cheap way to start: it's the way to avoid depending on a provider in exchange for running everything yourself.

| Distribution | What for |
|---|---|
| k3s | Single lightweight binary; edge, labs, small clusters. CNCF Sandbox project. |
| RKE2 | SUSE Rancher's security- and compliance-focused distribution (CIS profile); on-prem production. |
| Talos Linux | Immutable, minimal OS dedicated to Kubernetes, no SSH, managed through an API; reduces attack surface and configuration drift. |

A bare cluster won't run a production application. The operators and components you almost always end up installing:

| Need | Piece |
|---|---|
| PostgreSQL with replicas, failover and backups | CloudNativePG (CNCF Incubating) |
| TLS certificates | cert-manager |
| HTTP ingress | A Gateway API implementation: Envoy Gateway, Traefik, Cilium, Istio |
| Service IPs on bare metal | MetalLB or kube-vip |
| Queue-driven scaling and scale to zero | KEDA |
| Secrets from an external store | External Secrets Operator with OpenBao or Vault |
| Persistent storage | Longhorn (simple) or Rook-Ceph (more capacity and complexity) |
| Declarative deployment | Argo CD or Flux |
| Metrics and logs | Prometheus, Grafana, Loki |

Watch out for ingress-nginx: the Kubernetes project retired it in March 2026 and it no longer gets security fixes. Use Gateway API for new clusters and plan a migration for existing ones.

**What it costs to run.** Kubernetes ships three minor versions a year and each gets patches for roughly a year, so you upgrade the cluster and every operator several times a year. Add etcd and volume backups, CVE management on nodes and images, capacity for the peak (there's no real elasticity without spare hardware) and on-call. With fewer than two people who can fix it on a Sunday, don't do it.

## 3. Container PaaS without Kubernetes

You hand over an image, set CPU, memory, replicas and variables, and the provider takes care of nodes, load balancing, TLS and scaling. It's the best balance for most APIs and web apps.

| Service | Scale to zero | Relevant limits | Notes |
|---|---|---|---|
| Cloud Run (GCP) | Yes | 8 vCPU and 32 GiB per instance; 60 min per request | Configurable per-instance concurrency; *worker pools* for pull-based workloads; jobs for tasks |
| Azure Container Apps | Yes, on the Consumption profile | Consumption: up to 4 vCPU and 8 GiB per replica | Built-in KEDA scaling; Dedicated profiles for larger sizes; serverless GPUs |
| ECS Fargate (AWS) | Not natively (you can go to 0 tasks, but a request won't wake it up) | Up to 32 vCPU and 244 GB | ECS Express Mode creates service, ALB, autoscaling and URL in a single call |
| App Service for Containers (Azure) | No: you pay for the plan's instances | Those of the plan (Basic to PremiumV4) | Fits teams already on App Service; deployment slots |
| AWS App Runner | — | — | Closed to new customers since 30 April 2026; AWS recommends ECS Express Mode |

What they don't solve: the database, private networking and observability are still yours. And on Fargate there are fixed costs you don't see on the task: the ALB, the NAT Gateway if tasks reach the Internet from private subnets, and public IPv4 addresses.

## 4. Managed Kubernetes

The provider runs the control plane; you run the nodes (or part of them), the add-ons and the applications. It pays off when you have many services, need the Kubernetes ecosystem (operators, service mesh, GitOps, GPU workloads) or want the same model in the cloud and on-prem.

| | EKS | AKS | GKE |
|---|---|---|---|
| Control plane | USD 0.10/h per cluster; USD 0.60/h on extended support | Free tier with no SLA; Standard USD 0.10/h; Premium USD 0.60/h | USD 0.10/h per cluster; a monthly credit covers one zonal or Autopilot cluster per billing account |
| "No nodes to manage" mode | EKS Auto Mode (surcharge per managed instance) | AKS Automatic | GKE Autopilot (bills the resources requested by pods) |
| Native ingress / Gateway | AWS Load Balancer Controller | Application Gateway for Containers | GKE Gateway |
| Pod identity | EKS Pod Identity | Workload Identity | Workload Identity Federation for GKE |

List prices in USD as of November 2026. The control plane is the small part of the bill: nodes, the load balancers each `Service` or `Gateway` creates, NAT, logs and storage weigh far more. And you still upgrade: all three providers force you to move versions or pay for extended support.

## 5. Serverless functions

Code that runs per request or per event, with no server or container to manage (although all of them accept container images). You pay per invocation and duration; with no traffic, you pay nothing.

| | AWS Lambda | Azure Functions (Flex Consumption) | Cloud Run functions |
|---|---|---|---|
| Maximum duration | 30 min (since November 2026) | 30 min by default, no enforced maximum; HTTP capped at 230 s | HTTP 60 min; event-driven 9 min |
| Memory | 128 MB to 10,240 MB | 512, 2,048 or 4,096 MB instances | Up to 32 GiB |
| Concurrency per instance | One request per environment (except Managed Instances) | Configurable | Configurable |
| Private networking | VPC | Virtual network integration | Direct VPC egress or connector |
| Extras | Managed Instances (on EC2), durable functions | *Always ready* instances | It's Cloud Run underneath |

On Azure, the Linux Consumption plan retires on 30 September 2028: new projects go on Flex Consumption.

Functions shine with irregular traffic, events (an uploaded file, a queue message) and short tasks. They struggle with high, steady traffic (more expensive than a container), long-lived connections, heavy dependencies that lengthen cold starts and relational databases without a pooler.

## Decision tree

1. **Must it run on-prem or on your own hardware?**
   - Yes, one application and a small team: **Compose on one host**, with backups off the machine.
   - Yes, several applications, high availability and a platform team: **self-managed Kubernetes** (RKE2 or Talos).
2. **Is the work event-driven, or traffic sporadic, with tasks lasting seconds to a few minutes?** Yes: **functions**.
3. **Do you already have dozens of services, need Kubernetes operators or an identical model across cloud and on-prem, and people who know Kubernetes well?** Yes: **managed Kubernetes**, ideally in Autopilot, Automatic or Auto Mode.
4. **Minimal budget, modest traffic and minutes of downtime acceptable during an update?** Yes: **Compose on a cloud VM**.
5. **Otherwise: container PaaS.** Cloud Run or Container Apps if you want scale to zero; Fargate (with ECS Express Mode) on AWS.

Revisit the decision when the facts change: a team growing from 3 to 30 services, a functions bill that exceeds what always-on containers would cost, or a customer who demands on-prem.

## From docker-compose to the cloud without a rewrite

The way not to get trapped in any of these options is to treat the image as an artefact with a contract. If the container honours it, moving from Compose to Cloud Run, Container Apps, ECS or Kubernetes means changing the deployment definition, not the code.

**The container contract:**

- **Port from a variable.** Listen on `0.0.0.0:$PORT` (Cloud Run injects `PORT`; elsewhere you set it).
- **Health.** A `/health` endpoint (or separate `/healthz` and `/readyz`) that answers quickly and doesn't depend on third parties for liveness.
- **Configuration through environment variables**, with no config files baked into the image. Secrets arrive as variables or mounted files from the secrets manager.
- **Logs to stdout/stderr**, as one-line JSON per event. No log files inside the container.
- **No local state.** Uploaded files go to object storage, sessions to a cache or tokens. The container disk is ephemeral.
- **Graceful shutdown.** On `SIGTERM`, stop accepting requests, finish in-flight ones and close connections within 10–30 s.
- **Migrations outside start-up.** A job or pipeline step runs them once; if every replica runs them on boot, they race each other.
- **An immutable, signed image**, referenced by digest, running as a non-root user and built for `amd64` and `arm64`.

With that contract, the mapping between platforms is direct:

| Concept | Compose | Kubernetes | Cloud Run | Container Apps | ECS Fargate |
|---|---|---|---|---|---|
| Deployed unit | `service` | `Deployment` | Service | Container App | Service + task definition |
| Configuration | `env_file` | `ConfigMap`, `Secret` | Variables and Secret Manager | Variables and Key Vault | Variables and Secrets Manager |
| Health | `healthcheck` | `livenessProbe`, `readinessProbe` | Startup and liveness probes | Health probes | Container and ALB health checks |
| Ingress | Caddy or Traefik | Gateway API | Managed URL or load balancer | Built-in ingress | ALB |
| Replicas | `deploy.replicas` | HPA | Min/max instances | Scale rules | Service Auto Scaling |
| One-off task | `docker compose run` | `Job` | Cloud Run jobs | Container Apps jobs | `RunTask` |

The usual path is to start with Compose on a VM or go straight to a PaaS, and move the same image to another platform only when a real need (scale, high availability, an on-prem customer) demands it.
