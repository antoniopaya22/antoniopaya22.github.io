---
title: "Serverless API"
short: "Serverless API"
summary: "An API that goes from zero to a spike without managing servers: the gateway validates the token and enforces rate limits, a stateless function serves each request and a pay-per-use database stores the data encrypted under your own key."
description: "Serverless API with gateway, JWT authorizer, functions, pay-per-use database, encryption and tracing: reference design on AWS, Azure, GCP and on-premises."
order: 2
requirements:
  - "No request reaches the function without a valid token from a trusted issuer."
  - "The API scales with demand and costs next to nothing with no traffic."
  - "A spike or a retry storm cannot exhaust the database or blow up the bill."
  - "Data is encrypted at rest under a key the team controls and can be restored to a point in time."
  - "Every request leaves a trace spanning gateway, function and database."
platforms:
  onprem:
    summary: "Knative Serving runs the function as a scale-to-zero `Knative Service`, Istio as the Knative networking layer routes traffic and validates JWTs, Keycloak issues the tokens and PostgreSQL on CloudNativePG stores the data, with keys in OpenBao."
    notes:
      - "With Istio as the networking layer, a `RequestAuthentication` validates the JWT against Keycloak's JWKS before the request reaches the function. Kourier is lighter but only routes: with it, the function has to validate the token."
      - "PostgreSQL is not serverless: CNPG automates replicas, failover and backups, but the cluster is always on. Put the CNPG `Pooler` (PgBouncer) in front, because every function replica opens connections."
      - "OpenBao's transit engine encrypts sensitive fields without the key ever leaving the service; disk encryption is handled separately, in the storage layer or with LUKS."
      - "`containerConcurrency` and the `autoscaling.knative.dev/max-scale` annotation act as the fuse, like reserved concurrency in the cloud."
      - "The cost is cluster capacity plus running Knative, PostgreSQL and OpenBao; scaling to zero only saves money if the node autoscaler removes the empty nodes."
  aws:
    summary: "API Gateway HTTP API with a JWT authorizer (Cognito or any OIDC issuer), arm64 Lambda with reserved concurrency and on-demand DynamoDB with PITR, encrypted with a customer-managed KMS key."
    notes:
      - "HTTP API rather than REST API: cheaper and lower latency. REST API is worth it if you need usage plans, API keys, request validation or AWS WAF attached directly to the API."
      - "The HTTP API JWT authorizer checks signature, issuer, audience and expiry with no code; Cognito is one option, but any OIDC provider works."
      - "Lambda reserved concurrency is a deliberate cap: it protects the table, downstream services and the bill. Pair it with stage throttling on the gateway."
      - "On-demand DynamoDB bills per request with no capacity planning; turn on PITR and deletion protection. A customer-managed KMS key adds a monthly fee and a per-call KMS cost."
      - "X-Ray still ingests traces, but its SDKs and daemon have been in maintenance mode since February 2026: instrument with OpenTelemetry (ADOT)."
  azure:
    summary: "API Management validates the Entra ID token with the `validate-jwt` policy, Azure Functions on the Flex Consumption plan runs the logic and serverless Cosmos DB stores the data, with keys in Key Vault and traces in Application Insights."
    notes:
      - "The API Management Consumption tier bills per call and suits this pattern; the v2 tiers have a fixed cost per unit in exchange for virtual network integration and more capacity. For Entra ID tokens there is also `validate-azure-ad-token`."
      - "Flex Consumption is the serverless plan to pick: it scales to zero, supports virtual network integration and a maximum instance count that acts as a fuse. Linux on the Consumption plan retires in September 2028."
      - "A serverless Cosmos DB account lives in a single region and cannot add more; if you need multi-region, use provisioned or autoscale throughput."
      - "With a customer-managed key, the Cosmos DB account identity needs access to the key in Key Vault; revoke it and the data becomes unreadable."
      - "You pay per call in APIM, per execution and memory in Functions and per consumed RU in Cosmos DB: alert on RUs, because the cost depends on how you query."
  gcp:
    summary: "API Gateway validates Identity Platform tokens declared in the OpenAPI spec, Cloud Run functions runs the logic and Firestore stores the data under a Cloud KMS key (CMEK), with traces in Cloud Trace."
    notes:
      - "API Gateway validates JWTs through `x-google-issuer` and `x-google-jwks_uri` in the OpenAPI spec; if you need per-consumer quotas, monetisation or complex policies, the alternative is Apigee."
      - "Cloud Run functions is Cloud Run underneath: set per-instance concurrency and a maximum instance count as the fuse."
      - "CMEK on Firestore is chosen when the database is created: it cannot be enabled later and the key cannot be swapped, only rotated."
      - "Firestore suits document and collection access; queries need indexes and there are no joins, just like DynamoDB and Cosmos DB."
      - "You pay per gateway call, for function CPU and memory while serving, and for Firestore reads, writes and storage."
tiers:
  - name: "Minimum viable"
    when: "An MVP, internal API or mobile backend with low, bursty traffic and a small team with no dedicated operations."
    cost: 1
    ops: 1
    onprem: "One host with Docker Compose: the API in a container behind Caddy, PostgreSQL on a volume and a daily `pg_dump` to external storage; tokens from an existing IdP."
    aws: "HTTP API with a JWT authorizer, one arm64 Lambda with low reserved concurrency and on-demand DynamoDB with PITR and the AWS-managed key."
    azure: "APIM Consumption with `validate-jwt`, Functions on Flex Consumption and serverless Cosmos DB with Microsoft-managed keys."
    gcp: "API Gateway with JWT validation, Cloud Run functions with a low maximum instance count and Firestore with default encryption."
    tradeoffs: "No customer-managed key or private networking, a single region and visible cold starts; on-premises does not scale to zero and the host is a single point of failure."
  - name: "Production"
    when: "A product with real customers, personal data and audit requirements, with variable traffic."
    cost: 2
    ops: 2
    onprem: "k3s or RKE2 with Knative Serving, CNPG with a replica, `Pooler` and backups to S3-compatible storage, Keycloak, OpenBao transit and OpenTelemetry into Grafana."
    aws: "The above plus a customer-managed KMS key, deletion protection, alarms, ADOT tracing, environments in separate accounts and CloudFront with WAF in front."
    azure: "Flex Functions with virtual network integration, APIM with `validate-azure-ad-token`, Cosmos DB with a key in Key Vault and Application Insights with sampling."
    gcp: "Cloud Run functions with VPC egress where needed, Firestore with CMEK, budget alerts and Cloud Trace; Apigee if you need per-consumer quotas."
    tradeoffs: "More pieces to configure and a fixed fee for keys, WAF and log retention; still a single region."
  - name: "Scale and multi-region"
    when: "A critical API with users on several continents or an availability target that cannot tolerate losing a region."
    cost: 4
    ops: 3
    onprem: "Two clusters in different data centres, CNPG with a replica cluster at the second site and DNS or GSLB to fail over."
    aws: "The API in two regions with Route 53 latency or failover routing, DynamoDB global tables and provisioned concurrency on critical routes."
    azure: "Front Door in front of APIM and Functions in two regions; Cosmos DB with provisioned or autoscale throughput and multi-region writes, since serverless does not support it."
    gcp: "Cloud Run in several regions behind a global load balancer with serverless NEGs and Firestore in a multi-region location; JWT validation moves into the service or Apigee."
    tradeoffs: "High fixed cost and multi-region data: write conflicts, eventual consistency and failover drills that must be rehearsed."
extensions:
  - name: "Edge cache"
    when: "Public or slowly changing GET responses that are requested a lot."
    cost: "low"
    onprem: "Varnish or Nginx cache"
    aws: "CloudFront"
    azure: "Front Door (caching)"
    gcp: "Cloud CDN"
  - name: "WAF and per-client limits"
    when: "An Internet-facing API with third-party clients or a risk of abuse."
    cost: "medium"
    onprem: "Coraza + Envoy rate limiting"
    aws: "AWS WAF (CloudFront or REST API)"
    azure: "Front Door WAF + APIM limits"
    gcp: "Cloud Armor or Apigee"
  - name: "Pre-warmed instances"
    when: "Latency-sensitive routes where cold starts show up in the high percentiles."
    cost: "medium"
    onprem: "Knative `min-scale`"
    aws: "Provisioned concurrency or SnapStart"
    azure: "Always-ready instances (Flex)"
    gcp: "Cloud Run minimum instances"
  - name: "Data cache"
    when: "Repeated reads of the same keys that drive up database cost or need lower latency."
    cost: "medium"
    onprem: "Valkey"
    aws: "DynamoDB Accelerator (DAX)"
    azure: "Azure Managed Redis"
    gcp: "Memorystore"
  - name: "Write buffer queue"
    when: "Writes that can be acknowledged with 202 and processed later, to absorb spikes."
    cost: "low"
    onprem: "RabbitMQ"
    aws: "Amazon SQS"
    azure: "Service Bus"
    gcp: "Pub/Sub or Cloud Tasks"
savings:
  - "Run Lambda on arm64 (Graviton): it costs less per GB-second than x86 and, for Python or Node.js, performs the same or better."
  - "Tune each function's memory by measuring, for example with AWS Lambda Power Tuning: more memory brings more CPU and sometimes shortens the duration enough to make the invocation cheaper."
  - "Choose HTTP API over REST API on AWS and the API Management Consumption tier at low traffic: both bill per call with no fixed fee."
  - "Keep functions out of the VPC if they only talk to managed services; if they need private networking, use VPC endpoints instead of a NAT Gateway, and a single NAT in development."
  - "Set log retention (days in development, whatever audit requires in production) and sample traces: log ingestion is often one of the largest line items for a small API."
  - "Move to provisioned capacity with autoscaling on DynamoDB or Cosmos DB only with steady traffic and a measured saving; AWS Compute Savings Plans also cover Lambda."
---

## When you need it

When the API has bursty or still unknown traffic: a mobile app backend, an internal API only used during office hours, a product that is just starting. Keeping servers running all day to serve short bursts doesn't pay off, and the team would rather not patch operating systems. If traffic is high and steady, or you need long-lived connections (WebSockets, streaming), always-on containers usually work out better.

## Scenarios

### Startup MVP

What matters is shipping fast and not paying for idle capacity. The minimum tier is enough: a gateway with JWT validation against whatever IdP you already use, one function per resource or a single function with internal routing, and an on-demand table. Keep user accounts in the IdP, not in your database, and leave the customer-managed key for when sensitive data arrives.

### Regulated company with data in the EU

The region pins data residency, but you also have to check where logs, traces and backups go. Here a customer-managed key stops being optional: it gives you an audit trail of every use and lets you revoke access. Add private networking for the function, a WAF in front, log retention agreed with compliance and PITR with regular restore tests.

### Seasonal peaks or campaigns

Serverless absorbs the spike, but what breaks is whatever sits behind it: the database, a rate-limited third-party API or the bill. Set reserved concurrency to the throughput the downstream can take, rate-limit at the gateway and push writes that don't need an immediate answer onto a queue. Pre-warm instances only for the duration of the campaign.

### Customer that requires on-premises

Knative gives you the same scale-to-zero model on Kubernetes, but the database is not serverless: PostgreSQL on CNPG with a pooler in front. The function code has to be portable (a standard HTTP container), so write it against HTTP rather than against one provider's event format.

## How it fits together

The client calls the gateway over HTTPS. Before forwarding anything, the gateway checks the token with the authorizer: signature against the issuer's public keys, issuer, audience and expiry. If it fails, it returns 401 and the function never hears about it. The gateway also enforces rate limits and writes an access log entry per request.

A valid request reaches the function, which keeps no state between invocations: it reads the already validated claims, applies the logic and reads from or writes to the serverless database. The database encrypts at rest with a KMS key the team manages; without permission on the key, access to the table is not enough to read the data. The function emits structured logs and traces that tie gateway, function and database into a single path.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** One container with the API (any HTTP framework), PostgreSQL with its volume and Caddy as the reverse proxy with automatic TLS. JWT validation happens in the API against the IdP's JWKS. Back up with `pg_dump` or archived WAL to external storage, encrypted. There is no scale to zero and no high availability: it's for getting started or for a small customer.

**Kubernetes on-premises.** k3s or RKE2 with Knative Serving to scale on requests and down to zero, cert-manager for certificates, CloudNativePG with a `Pooler` and backups to S3-compatible storage, OpenBao for keys and secrets, and an OpenTelemetry Collector feeding Grafana. If you need JWT checks at the edge, use Knative's Istio-based networking layer or put Envoy Gateway in front.

**Cloud without Kubernetes.** This is the natural fit: Lambda, Functions or Cloud Run functions behind the managed gateway. If you'd rather ship a container, Cloud Run and Container Apps also scale to zero; ECS Fargate does not, it always keeps at least one task running.

**Managed Kubernetes.** EKS, AKS or GKE with Knative only pays off if you already run a Kubernetes platform and want the same way of deploying everywhere. For a standalone API you pay for the cluster and its operation and gain nothing.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | One host | Low, manual | Vertical | Getting started, small customer |
| Kubernetes + Knative | Cluster | High | To zero, on requests | On-premises is mandatory |
| Managed functions | Almost none | Low | To zero, automatic | Default choice in the cloud |
| EKS/AKS/GKE + Knative | Cluster | Medium-high | To zero, on requests | Existing Kubernetes platform |

## Key decisions

- **Functions or containers.** Functions scale to zero and bill per use but have a duration limit and cold starts; a serverless container such as Cloud Run or Container Apps handles more concurrency per instance and any runtime.
- **Serverless or relational database.** DynamoDB, Cosmos DB and Firestore scale per request and have no connections to exhaust, but force you to model around access patterns. A relational database gives flexible queries in exchange for fixed capacity and a connection pooler.
- **Validate at the gateway or in code.** The gateway rejects early and cheaply; fine-grained authorisation (whether this user may touch this resource) is still the function's job.
- **Your own key or the provider's.** A customer-managed key gives rotation, an audit trail of every use and the option to revoke, at the cost of a fee and one more dependency.
- **Concurrency fuse.** Without a cap, autoscaling also scales your failures: a client retrying in a loop becomes thousands of invocations and a saturated database.

## Common pitfalls

- Creating the database connection or SDK client inside the handler instead of reusing it across invocations.
- Relying on the gateway for per-resource authorisation: the token says who you are, not which records you may read.
- Designing the NoSQL table as if it were relational and ending up scanning all of it.
- Paying for provisioned concurrency against cold starts without measuring them first.
- Logs with no retention period and no encryption, which keep growing and end up holding personal data indefinitely.
- Never rehearsing a PITR restore: the backup exists, but nobody knows how long it takes or how to point the application at the restored table.
