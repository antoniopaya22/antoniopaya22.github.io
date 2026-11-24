---
title: "Multi-tenant SaaS"
short: "Multi-tenant SaaS"
summary: "Serve many organisations from a single platform without any of them seeing another's data: identity per organisation, tenant context on every request, a shared database with RLS for most customers and dedicated silos for those who pay for or require them."
description: "Multi-tenant SaaS: RLS pool or silo, identity per organisation, per-tenant keys, usage metering and onboarding on AWS, Azure, GCP and on-premises."
order: 4
requirements:
  - "No tenant can read or change another tenant's data, even if the API code has a bug."
  - "Every user signs in with their organisation's identity and the token carries the tenant in a verifiable way."
  - "Each tenant's data is encrypted with a key that is attributable to that tenant and revocable."
  - "A noisy tenant does not degrade the others: there are per-tenant limits in the API and the database."
  - "Usage is measured per tenant and is auditable for billing."
  - "Onboarding a tenant, pooled or siloed, is an automated, repeatable process."
platforms:
  onprem:
    summary: "Keycloak with organisations, Traefik with Coraza at the edge, the API on Kubernetes, PostgreSQL with Patroni and RLS for the pool, a namespace with its own database per silo, OpenBao transit for keys and Kafka for usage."
    notes:
      - "Keycloak organisations are a supported feature since version 26: one realm with one organisation per customer, linked domains and the customer's own federated identity provider."
      - "OpenBao transit supports derived keys: with `derived=true`, each operation passes the `tenant_id` as context and gets a distinct key without creating one per tenant."
      - "An on-premises silo is a namespace with `ResourceQuota`, `NetworkPolicy` and its own PostgreSQL cluster; for strong isolation, dedicated nodes or a separate cluster."
      - "Coraza plugs into Traefik as a WASM plugin and applies the OWASP CRS rules; certificates for customer domains come from cert-manager and ACME."
      - "The cost is running everything: Keycloak, Patroni, Kafka and OpenBao with high availability, plus the capacity set aside for silos."
  aws:
    summary: "CloudFront with WAF in front of the API on ECS Fargate, Cognito for identity, Aurora PostgreSQL with RLS for the pool, an AWS account per silo, KMS for keys and Kinesis Data Streams for usage metering."
    notes:
      - "Cognito supports several models: a user pool per tenant (strongest isolation, more moving parts), an app client per tenant, groups or custom attributes. Cognito quotas are per account and Region and shared by every tenant."
      - "A KMS key per tenant carries a monthly fee per key; the alternative is envelope encryption with one key and the `tenant_id` in the encryption context, which CloudTrail records."
      - "CloudFront SaaS Manager multi-tenant distributions share one configuration and let each customer point their own domain at it with a CNAME."
      - "A silo as a dedicated account is created with AWS Organizations and Control Tower; the pool API reaches it through an assumed role, never with static credentials."
      - "CloudFront and WAF bill per request, Fargate per task time, Aurora per instance or ACU and Kinesis per shard or on demand."
  azure:
    summary: "Front Door with WAF in front of Container Apps, Entra External ID for identity, Azure Database for PostgreSQL with RLS for the pool, a subscription per silo, Key Vault for keys and Event Hubs for usage metering."
    notes:
      - "Entra External ID is the product for external identities; Azure AD B2C has been closed to new customers since May 2025. For customers already on Entra ID, a multi-tenant app registration lets them sign in with their own directory."
      - "Front Door manages custom domains with managed certificates; check the per-profile domain limit before promising custom domains to thousands of customers."
      - "Key Vault has no encryption context: with envelope encryption, put the `tenant_id` in AES-GCM additional authenticated data (AAD) when encrypting with the data key."
      - "The per-silo subscription is created by a subscription vending process (Terraform or Bicep) under a management group carrying the common policies."
      - "Front Door bills per request and rule, Container Apps per vCPU and memory, PostgreSQL per instance and Event Hubs per throughput unit."
  gcp:
    summary: "A Cloud Load Balancer with Cloud Armor in front of Cloud Run, Identity Platform with tenants, Cloud SQL for PostgreSQL with RLS for the pool, a project per silo, Cloud KMS for keys and Pub/Sub for usage metering."
    notes:
      - "Identity Platform has native multi-tenancy: each tenant has its own users and providers (SAML, OIDC) and the token carries the tenant ID."
      - "Cloud KMS bills per active key version and per operation; to avoid a key per tenant, use envelope encryption with the `tenant_id` as additional authenticated data."
      - "Certificate Manager with certificate maps serves many customer domains on the same load balancer."
      - "The per-silo project comes from a Terraform project factory inside a folder carrying the common organisation policies."
      - "The load balancer and Cloud Armor bill per rule and request, Cloud Run per CPU and memory, Cloud SQL per instance and Pub/Sub by volume."
tiers:
  - name: "Shared pool"
    when: "A young product, dozens of small customers and a team that cannot run one environment per customer."
    cost: 1
    ops: 1
    onprem: "One host or a small k3s with Traefik, the API, Keycloak and PostgreSQL with RLS; envelope encryption with a single OpenBao key."
    aws: "Fargate behind CloudFront, one Cognito user pool with a tenant attribute, Aurora PostgreSQL Serverless v2 with RLS and one KMS key with per-tenant context."
    azure: "Container Apps behind Front Door, Entra External ID, PostgreSQL flexible server with RLS and one Key Vault key with per-tenant AAD."
    gcp: "Cloud Run behind the load balancer, Identity Platform with tenants, Cloud SQL with RLS and one Cloud KMS key with per-tenant AAD."
    tradeoffs: "An isolation bug exposes everyone, noisy neighbours are only held back by limits, and you cannot offer a dedicated Region or key."
  - name: "Pool + premium silos"
    when: "Most customers in the pool and a few large or regulated ones paying for their own isolation."
    cost: 2
    ops: 2
    onprem: "Pool on Kubernetes with Patroni and RLS; each silo is a namespace with quotas, NetworkPolicy and its own CloudNativePG or Patroni cluster."
    aws: "The pool as above plus one account per silo created with Control Tower, with its own Aurora and dedicated KMS key; Kinesis for usage."
    azure: "A shared pool and one subscription per silo with its own PostgreSQL and Key Vault key; Event Hubs for usage."
    gcp: "A shared pool and one project per silo with its own Cloud SQL and Cloud KMS key; Pub/Sub for usage."
    tradeoffs: "Two ways to deploy and migrate the database; tenant routing and onboarding must understand both models."
  - name: "Silo per tenant"
    when: "A few large customers, contracts with data residency, or audits that demand full physical separation."
    cost: 4
    ops: 3
    onprem: "One cluster or node set per customer managed with Cluster API and GitOps; the SaaS control plane only orchestrates."
    aws: "One account per tenant with the whole stack deployed from the same template; a central control plane for onboarding, metrics and billing."
    azure: "One subscription per tenant from vending with the full stack; the control plane in its own subscription."
    gcp: "One project per tenant with the full stack from a project factory; the control plane in a central project."
    tradeoffs: "Fixed cost multiplies per customer and shipping a release means upgrading N environments; without full automation it does not scale."
extensions:
  - name: "Customer custom domains"
    when: "When customers want their brand on `app.customer.com` instead of a subdomain of yours."
    cost: "low"
    onprem: "Traefik + cert-manager (ACME)"
    aws: "CloudFront SaaS Manager"
    azure: "Front Door custom domains"
    gcp: "Certificate Manager (cert maps)"
  - name: "Per-tenant limits"
    when: "When one customer's peaks or a badly built integration start degrading everyone else."
    cost: "low"
    onprem: "Limits in the API backed by Redis"
    aws: "AWS WAF rate-based rules"
    azure: "API Management rate-limit-by-key"
    gcp: "Cloud Armor rate limiting"
  - name: "Connection pooler"
    when: "When many API replicas open connections to the shared database."
    cost: "low"
    onprem: "PgBouncer"
    aws: "RDS Proxy"
    azure: "Built-in PgBouncer"
    gcp: "PgBouncer next to the API"
  - name: "Read replicas"
    when: "When some tenants' reports and exports compete with everyone's writes."
    cost: "medium"
    onprem: "Patroni replicas"
    aws: "Aurora Replicas"
    azure: "Read replicas"
    gcp: "Cloud SQL read replicas"
  - name: "Usage aggregation for billing"
    when: "When pricing depends on consumption and usage has to reconcile with invoices."
    cost: "low"
    onprem: "Kafka Connect + ClickHouse"
    aws: "Firehose + S3 + Athena"
    azure: "Event Hubs Capture + Data Explorer"
    gcp: "Pub/Sub BigQuery subscription"
  - name: "Silo vending"
    when: "When creating a silo stops being exceptional and should take minutes, not days."
    cost: "low"
    onprem: "Cluster API + Argo CD ApplicationSet"
    aws: "Control Tower Account Factory"
    azure: "Subscription vending (Terraform)"
    gcp: "Project Factory (Terraform)"
savings:
  - "Keep most customers in the pool and sell the silo as a plan priced to cover its fixed cost: account, database, keys and operations."
  - "Use envelope encryption with one KMS key and the `tenant_id` in the encryption context or as AAD rather than a key per tenant; keep dedicated keys for the contracts that require them."
  - "For silos of small or quiet customers, Aurora Serverless v2 with a 0 ACU minimum pauses when there are no connections and stops billing instance capacity while paused."
  - "Aggregate usage per tenant and minute in the API before emitting it: fewer events into Kinesis, Event Hubs or Pub/Sub and lower ingestion cost, with the same billing accuracy."
  - "Share the edge: one CloudFront multi-tenant distribution, one Front Door profile or one load balancer with a certificate map for every domain, not one per customer."
  - "Commit the pool's baseline with Savings Plans, Azure reservations or Google Cloud CUDs, and use Graviton on Fargate; keep variable silos on demand."
---

## When you need it

When you sell the same product to many organisations and each expects its data to be kept apart from everyone else's. Deploying one copy per customer works with three customers and becomes unmanageable with three hundred: every release has to ship N times and the fixed cost multiplies. Sharing everything with no design is the other extreme: one forgotten `WHERE` clause shows one customer's data to another. This case sits in between: share what can be shared, isolate what must be isolated, and make the tenant a first-class concept in identity, data, keys, limits and billing.

## Scenarios

### A B2B startup with its first customers

Everything in the pool: one database with RLS, one identity provider with an organisation per customer, and envelope encryption with a single key. What matters is not physical isolation but having the `tenant_id` in the token, in every table and in every log line from day one. Moving to silos later is feasible; retrofitting a `tenant_id` into a schema that lacks it is very expensive.

### A regulated customer that wants its data in the EU and its own key

That customer goes into a silo: its own account, subscription or project in an EU Region, with its own database and a dedicated key that may even be customer-owned (BYOK). Everyone else stays in the pool. The SaaS control plane knows which model each tenant lives in and routes accordingly.

### One large customer saturating the rest

The symptom is latency rising for everyone when one tenant runs a bulk export. First, per-tenant limits in the API and the WAF; then separate queues for heavy work and read replicas for reports. If it still weighs too much, the tenant moves to a silo and the migration is billed.

### Software that customers also run in-house

Some customers ask for on-premises. The silo design fits: the same stack, deployed with Kubernetes and GitOps in their data centre, with Keycloak federated to their directory. This requires the application core not to depend on proprietary services of one particular cloud.

## How it fits together

The user signs in through the identity provider, which knows which organisation they belong to: from their email domain, from federation with the customer's directory, or from the subdomain they arrive on. The token it issues carries the `tenant_id` as a signed claim. With it, the user calls the edge (domains and WAF), which terminates TLS for the customer's domain, applies rules and limits, and forwards to the API.

The API validates the token and takes the tenant from it, never from a URL parameter or the body. With that context it looks up its tenant registry and decides: if the tenant lives in the pool, it opens a transaction on the shared database, sets the tenant with `SET LOCAL app.tenant_id` and lets the RLS policies filter every row; if it lives in a silo, it routes to the database in that tenant's account, subscription or project.

For sensitive data, the API asks the KMS for a data key bound to the tenant (a dedicated key or an encryption context carrying the `tenant_id`) and encrypts before storing. Every key use is then logged and attributed to a tenant, and revoking a silo's key leaves its data unreadable. Those key-usage records, like the rest of the consumption, feed metering: the API emits per-tenant usage events (requests, storage, operations) to a stream that is aggregated for billing and for spotting abuse.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** Traefik as reverse proxy with ACME certificates, the API, Keycloak, PostgreSQL with RLS and OpenBao, with volumes for the database and OpenBao storage and backups via `pg_dump` or pgBackRest to external storage. Good for a startup's pool or a demo; no silos and no high availability.

**On-premises Kubernetes (k3s or RKE2).** CloudNativePG or Patroni for PostgreSQL, the Keycloak operator, cert-manager for domains, Strimzi for Kafka and OpenBao in HA. Silos are namespaces with `ResourceQuota`, `LimitRange`, `NetworkPolicy` and their own database cluster; Argo CD with an ApplicationSet deploys one silo per entry in the tenant registry.

**Cloud without Kubernetes.** The API on ECS Fargate, Container Apps or Cloud Run; a managed database; managed identity, keys and stream. This is the lowest-operations option for the pool, and silos are accounts, subscriptions or projects receiving the same stack from the same Terraform template.

**Managed Kubernetes (EKS, AKS, GKE).** Worth it when there is already a platform team or when silos are many and small: a namespace per tenant on a shared cluster is cheaper than an account per tenant, and you can move to dedicated nodes per tenant with taints and tolerations.

| Option | Fixed cost | Operations | Silos | When |
|---|---|---|---|---|
| Docker Compose | Very low | Manual | No | Demo or first customers |
| On-prem Kubernetes | High | High | Namespace or cluster | On-premises requirement |
| PaaS or serverless | Low | Low | Account or project | Managed pool |
| Managed Kubernetes | Medium | Medium | Namespace or nodes | Many small silos |

## Key decisions

- **Pool or silo.** The pool is cheap and deploys once; the silo gives real isolation and its own Region and key, at a fixed cost per customer. The answer is almost always both, with the silo as the premium plan.
- **RLS or filters in code.** RLS makes the database reject what the code forgets to filter. Filters in code are still needed for good index use, but they must not be the only barrier.
- **One key per tenant or envelope encryption.** A dedicated key allows per-customer revocation and audit, but every key costs money and KMS request quotas are per account; an encryption context gives attribution without multiplying keys.
- **Identity: one directory or one per tenant.** A shared directory with organisations is simpler; a user pool or identity tenant per customer isolates configuration, MFA and federation but multiplies what you maintain.
- **Real-time or batch metering.** The stream gives immediate visibility for limits and alerts; billing can come from daily aggregates. What cannot be missing is a tenant and a deduplication ID on every event.

## Common pitfalls

- Taking the tenant from the URL or a client-sent header instead of the signed token.
- Enabling RLS without `FORCE ROW LEVEL SECURITY`: the table owner bypasses the policies, as does any superuser or role with `BYPASSRLS`. The API must connect with a role that has neither.
- Using `SET` instead of `SET LOCAL` behind a transaction-mode pooler: the connection returns to the pool with the previous tenant still set and the next request inherits the wrong context.
- Forgetting the tenant outside the database: caches, object storage keys, queues, search indexes and logs.
- Manual onboarding: every silo created by clicking is configuration no one can reproduce or upgrade.
- Never testing isolation: a test that tries to read another tenant's data with a valid token belongs in continuous integration.
