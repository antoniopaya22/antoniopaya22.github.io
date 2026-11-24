---
title: "Cutting cloud costs without losing what matters"
short: "Cutting cloud costs"
summary: "Where the money goes on a cloud bill, which savings levers each platform offers, three reference budgets for a web application and a minimal FinOps routine so the bill stops surprising you."
description: "Hidden costs, commitments, Spot, ARM, scale to zero, logs, storage and egress: how to cut your AWS, Azure and GCP bill without losing reliability."
order: 3
---

Most cloud bills I review aren't expensive because of production compute, but because of everything around it: hourly resources nobody notices, development environments that mirror production, logs nobody reads and traffic leaving by the most expensive route. Cutting there doesn't touch reliability. Cutting backups, high availability or security does, and that's what this guide tries to avoid.

Order of work: first **visibility** (knowing what costs what), then **removing waste**, then **right-sizing**, and only at the end **committing spend**. Committing for three years to pay for over-provisioning is the most effective way to make it permanent.

Prices quoted are list prices in USD for European regions (eu-west-1 on AWS, West Europe on Azure), checked in November 2026 and indicative only: they vary by region and over time.

## Why the bill blows up

| Cost | Why it shows up | What to do |
|---|---|---|
| NAT Gateway | On AWS, USD 0.048/h plus USD 0.048 per GB processed in eu-west-1, and one per zone in multi-AZ designs. Everything leaving private subnets goes through it, including traffic to the provider's own services | Private endpoints for object storage, image registry and secrets; a single NAT in dev |
| Load balancers | Fixed hourly cost plus capacity. On Kubernetes, every `Service` of type `LoadBalancer` creates one | One shared load balancer or Gateway with host or path routing |
| Public IPv4 | AWS charges USD 0.005/h for every public IPv4, in use or idle (about USD 3.65/month each) | Resources in private subnets behind the load balancer; IPv6 where possible |
| Kubernetes control plane | USD 0.10/h per cluster on EKS, AKS Standard and GKE: about USD 73/month each | Fewer clusters split by namespace, or a container PaaS |
| Logs | Charged per GB ingested and retained; `DEBUG` in production can cost more than the compute | `INFO` level, sampling, short retention and cheap archiving |
| Egress | Traffic to the Internet, across zones and across regions | A CDN in front; keep internal traffic within a zone where you can |
| Non-production environments | Dev and staging with multi-AZ, replicas and production sizes, running 24/7 | Small sizes, one zone, switched off out of hours |
| Orphans | Disks, snapshots, IPs and load balancers left over from deleted resources | Monthly review and mandatory tags |

## Savings levers

### Usage commitments

A discount in exchange for committing spend or capacity for one or three years. Only on your stable baseline, and only after right-sizing.

| | AWS | Azure | GCP |
|---|---|---|---|
| Flexible (spend-based) | Compute Savings Plans (EC2, Fargate, Lambda): up to 66 % | Savings plan for compute: up to 65 % | Flexible spend-based CUDs: around 28 % for 1 year and 46 % for 3 years |
| Specific (resource-based) | EC2 Instance Savings Plans: up to 72 % | Reservations: up to 72 % | Resource-based CUDs: up to 55 % (70 % on memory-optimised) |
| Databases | Database Savings Plans (1 year): up to 35 % on serverless and 20 % on instances; RDS Reserved Instances | Database reservations | Cloud SQL CUDs |
| Automatic | — | — | Sustained use discounts: up to 30 % on N1, 20 % on N2, N2D and C2; not on E2 or newer series |

Start with the flexible, one-year commitment: the specific one pays more but ties you to a family and region you may well change.

### Spot capacity

Spare capacity at a deep discount that the provider can reclaim at short notice. For interruption-tolerant work: queue workers, CI, batch jobs, stateless Kubernetes nodes. Never for the database, nor for the only node of anything.

| | AWS | Azure | GCP |
|---|---|---|---|
| VMs | Spot Instances: up to 90 %, 2-minute notice | Spot VMs: up to 90 %, 30-second notice | Spot VMs: up to 91 %, best-effort graceful shutdown of up to 30 s |
| Containers | Fargate Spot (up to 70 %); Spot nodes on EKS | Spot nodes on AKS (user pools only) | Spot Pods on GKE Autopilot; Spot nodes on GKE |

### ARM processors

If the application runs on Linux with a runtime that is interpreted or compiles for `arm64` (Node.js, Python, Java, Go, .NET), switching usually means changing the base image and the instance type.

| AWS | Azure | GCP |
|---|---|---|
| Graviton4 (M8g, C8g, R8g) and Graviton5 (M9g); AWS cites up to 20 % lower cost than comparable x86 | Cobalt 100 (Dpsv6, Epsv6), Cobalt 200 (Dpsv7, Epsv7) and Ampere Altra (Dpsv5) | Axion (C4A, N4A) and Tau T2A (Ampere Altra) |
| Lambda and Fargate on `arm64` are 20 % cheaper per unit than on x86 | ARM B-series v2 (B2pls v2, B2ps v2) | T2A only in some regions |

Build multi-architecture images in CI (`docker buildx --platform linux/amd64,linux/arm64`) and measure before deciding: the hourly saving only counts if performance holds.

### Scale to zero

| | AWS | Azure | GCP |
|---|---|---|---|
| Containers | — (Fargate doesn't wake up on a request) | Container Apps, Consumption profile | Cloud Run |
| Functions | Lambda | Functions Flex Consumption | Cloud Run functions |
| Relational | Aurora Serverless v2 with a 0 ACU minimum: pauses after 5 min to 24 h without connections, resumes in about 15 s | Azure SQL Database serverless with auto-pause; PostgreSQL flexible server can only be stopped manually | Cloud SQL can be stopped, no auto-pause |
| NoSQL | DynamoDB on-demand | Cosmos DB serverless | Firestore |

Resuming costs latency: perfect for dev, demos and internal tools; for production with users, measure first.

### Networking: private endpoints versus NAT

Traffic from a private workload to object storage, the image registry or the secrets manager doesn't need to go through NAT. On AWS, *gateway endpoints* for S3 and DynamoDB are free; *interface endpoints* aren't (per hour and zone, plus per GB), so compare them with what NAT would process. On Azure, *service endpoints* are free and *private endpoints* are charged per hour and GB. On GCP, Private Google Access reaches Google APIs without Cloud NAT. Since 2025 AWS also offers a regional NAT Gateway that doesn't need a public subnet per zone.

### Development environments

- Switch off out of hours: 12 hours a day plus weekends means about 65 % of hours off. Instance Scheduler on AWS, Start/Stop VMs on Azure, instance schedules on GCP, or scale to zero where the platform allows.
- One zone, no replicas, minimal sizes and a single NAT.
- Ephemeral per-branch environments destroyed when the pull request closes.
- Databases stopped when unused: RDS, Aurora and PostgreSQL flexible server can be stopped for up to 7 days, after which they start again on their own.

### Logs: retention and sampling

| | AWS | Azure | GCP |
|---|---|---|---|
| Ingestion (list, EU) | CloudWatch Logs: USD 0.57/GB Standard, USD 0.285/GB Infrequent Access | Log Analytics, Analytics plan: USD 2.99/GB; cheaper Basic and Auxiliary plans | Cloud Logging: USD 0.50/GiB, first 50 GiB per project per month free |
| Default retention | Never expires: set it on every log group | Depends on the table plan | 30 days included |

Rules: `INFO` level in production, sampling of traces and successful access logs, short retention in the expensive tool (14–30 days) and export to object storage for anything you must keep for audit.

### Storage: tiers and lifecycle

| Access | AWS (S3) | Azure (Blob) | GCP (Cloud Storage) |
|---|---|---|---|
| Frequent | Standard | Hot | Standard |
| Monthly | Standard-IA (30-day min.) | Cool (30-day min.) | Nearline (30-day min.) |
| Quarterly | Glacier Instant Retrieval (90-day min.) | Cold (90-day min.) | Coldline (90-day min.) |
| Archive | Glacier Flexible (90 days), Deep Archive (180 days) | Archive (180-day min.) | Archive (365-day min.) |
| Automatic | Intelligent-Tiering (no minimum) | Lifecycle policies; Smart tier | Autoclass |

Minimum durations matter: deleting earlier is billed anyway. Also expire old object versions, incomplete multipart uploads and disk snapshots.

### Egress and CDN

AWS and Azure include the first 100 GB/month of Internet egress free; after that, AWS eu-west-1 charges USD 0.09/GB. Transfer from AWS origins (S3, ALB) to CloudFront isn't charged, CloudFront includes 1 TB/month free and offers flat-rate plans starting at USD 0. Serving assets and downloads through the CDN almost always cuts egress cost as well as latency.

### Licences

Azure Hybrid Benefit lets you bring Windows Server and SQL Server licences with Software Assurance, and RHEL and SLES subscriptions, instead of paying for them again on the VM. If your organisation already owns them, it's the quickest saving on Azure.

### Free tiers and credits

| | AWS | Azure | GCP |
|---|---|---|---|
| New account | USD 100 credit plus up to USD 100 more for completing activities; 6-month free plan | USD 200 for 30 days and 12 months of popular services | USD 300 for 90 days; Always Free tier |
| Startups | AWS Activate: up to USD 5,000 (Founders) or up to USD 200,000 through accelerators and investors | Microsoft for Startups: up to USD 150,000 in stages | Google for Startups Cloud: up to USD 200,000, USD 350,000 for AI startups |

Credits run out. Design as if you were paying from day one, or the end of the credits turns into an urgent migration.

## Three reference budgets

For a web application with an API, a relational database and a few thousand users.

| | Minimal | Balanced | High availability |
|---|---|---|---|
| Architecture | One VM with Compose (API, PostgreSQL, Caddy) or pure serverless (functions + pay-per-use DB) | Container PaaS with 2 replicas, managed load balancer and a small managed DB | Multi-AZ everywhere, read replicas, WAF, managed cache, NAT per zone |
| Relative cost | € | €€ | €€€€ |
| AWS example (eu-west-1) | t4g.small 24/7: ~USD 13/month, plus USD 3.65 for its IPv4, disk and backups | 2 ARM Fargate tasks of 0.5 vCPU and 1 GB: ~USD 29; ALB: ~USD 18/month fixed plus LCUs; RDS db.t4g.micro: ~USD 12 plus storage | Fixed costs multiply: 3 NAT Gateways already add ~USD 105/month before processing any data; RDS Multi-AZ doubles the instance price |
| Azure example (West Europe) | B2pls v2: ~USD 28/month | Container Apps with scale to zero and PostgreSQL flexible B1ms: ~USD 15/month of DB compute | Application Gateway WAF_v2: ~USD 342/month in fixed cost alone |
| Operations | Yours: OS, backups, updates | Low | Medium: more pieces, failover drills |
| Risk you accept | Host failure; downtime on every update | Loss of a zone if the DB isn't multi-AZ | Little, short of a regional outage |

List prices, EU, November 2026, indicative; compute calculated at 730 hours a month, excluding tax, traffic and storage unless stated. The jump from balanced to high availability doesn't come from compute but from fixed costs that multiply per zone and from security services with an hourly fee. Before making it, check whether the business needs it: many internal applications live happily on "balanced" plus a multi-AZ database.

## FinOps: the minimal routine

You don't need a FinOps team to avoid surprises. You need this:

1. **Mandatory tags** (`app`, `env`, `owner`, `cost-center`) enforced by policy: SCPs or Tag Policies on AWS, Azure Policy, organisation policies and tags on GCP. No tags, no cost allocation.
2. **Budgets with alerts** per account, subscription or project, at 50, 80 and 100 % and on forecast. Remember an alert doesn't stop spending: on Azure consumption isn't stopped and on AWS only *budget actions* apply policies. GCP also offers spend-cap budgets that pause the project's services.
3. **Anomaly detection**: Cost Anomaly Detection on AWS, anomaly alerts in Azure Cost Management, anomaly detection in Cloud Billing.
4. **Cost export** to a queryable store: Data Exports with CUR 2.0 or FOCUS on AWS, Cost Management exports (FOCUS included) on Azure, billing export to BigQuery on GCP. With the data in SQL you can answer what grew and why.
5. **A 30-minute monthly review** with the technical lead: the five fastest-growing services, untagged resources, orphans, commitment coverage and utilisation, and right-sizing recommendations (Compute Optimizer, Azure Advisor, Recommender).

The goal isn't the lowest bill, but that every euro has an owner and a reason.
