---
title: "Frontend, backend and database"
short: "Web + API + DB"
summary: "The foundation of almost every product: an SPA served from a CDN, a stateless containerised API and a relational database, with identity, caching and secrets sorted out from day one."
description: "SPA, containerised API and relational database with CDN, WAF, OIDC, cache and secrets: a reference architecture on AWS, Azure, GCP and on-premises."
order: 1
requirements:
  - "The API is stateless and scales horizontally."
  - "All traffic arrives over TLS and passes a WAF before reaching the API."
  - "Authentication is delegated to an OIDC provider; the API only validates tokens."
  - "No credential lives in code, in images or in plain-text variables."
  - "The database is highly available, backed up and restorable to a point in time."
platforms:
  onprem:
    summary: "Kubernetes with HAProxy and Coraza WAF at the edge, Keycloak as IdP, PostgreSQL with Patroni, Valkey and OpenBao, all run by your own team."
    notes:
      - "Patroni needs a consensus store (etcd) and an entry point that always follows the primary; without it, every failover leaves the API writing to a replica."
      - "Coraza (via SPOA on HAProxy) with the OWASP Core Rule Set produces false positives at first: start in detection mode and tune exclusions before blocking. Coraza is the maintained successor to ModSecurity."
      - "Vault moved to the BSL licence; OpenBao is the open source fork with a compatible API, which is why it comes first."
      - "Keycloak and Valkey are state too: they need replicas, backups and upgrades just like the database."
      - "There is no usage bill: the cost is operations (patching, on-call, tested backups) and capacity reserved for the peak."
  aws:
    summary: "CloudFront with S3 for the frontend, ALB with AWS WAF in front of ECS Fargate, Cognito for identity, Aurora PostgreSQL, ElastiCache and Secrets Manager."
    notes:
      - "CloudFront can serve S3 and also route `/api/*` to the ALB: a single domain removes CORS and lets you apply the WAF at the edge too."
      - "Use Origin Access Control so the bucket is not public and only CloudFront can read it."
      - "Inject secrets into the ECS task definition from Secrets Manager and turn on rotation for the Aurora credentials."
      - "ElastiCache supports Valkey as well as Redis OSS; for sessions, use replicas across zones or sessions die with the node."
      - "Fargate bills for allocated vCPU and memory; Aurora for instances (or capacity on Serverless v2), storage and I/O. NAT Gateway and cross-zone traffic are the usual surprises on the bill."
  azure:
    summary: "Front Door with Storage for static assets, Application Gateway with WAF in front of Container Apps, Entra External ID, Azure Database for PostgreSQL, Azure Managed Redis and Key Vault."
    notes:
      - "Front Door has its own WAF: if everything enters through it, consider dropping Application Gateway; if you keep both, decide where the rules live so you don't maintain them twice."
      - "Entra External ID replaces Azure AD B2C for new customers; don't start a new project on B2C."
      - "Azure Managed Redis is the successor to Azure Cache for Redis, which is being retired."
      - "With managed identities, Container Apps reads Key Vault and signs in to PostgreSQL with Entra authentication, so there are no passwords to rotate."
      - "Application Gateway has a fixed hourly cost plus capacity units; Container Apps scales to zero on consumption, but an API with steady traffic pays for its replicas anyway."
  gcp:
    summary: "An external Application Load Balancer with Cloud Armor serves the bucket through Cloud CDN and routes `/api` to Cloud Run; Identity Platform, Cloud SQL, Memorystore and Secret Manager complete the design."
    notes:
      - "The same load balancer serves a backend bucket with Cloud CDN and a serverless NEG pointing at Cloud Run: one domain and a single Cloud Armor policy."
      - "Restrict Cloud Run ingress to internal and load balancer traffic; otherwise the `run.app` URL lets callers bypass Cloud Armor."
      - "Memorystore is only reachable over private networking: Cloud Run gets there with Direct VPC egress or a connector."
      - "With many Cloud Run instances, connections to Cloud SQL pile up: cap the pool per instance or put PgBouncer in front."
      - "Identity Platform bills per monthly active user; Cloud Run for CPU and memory while serving requests, unless you allocate CPU always."
tiers:
  - name: "Minimum viable"
    when: "An MVP or internal tool with a few hundred users, a small team and tolerance for the odd minute of downtime."
    cost: 1
    ops: 1
    onprem: "One host with Docker Compose: Caddy or HAProxy with Coraza in front, the API, PostgreSQL, Valkey and Keycloak, with PostgreSQL backups shipped to external storage."
    aws: "CloudFront and S3, one Fargate task on ARM64, Aurora Serverless v2 with auto-pause in dev, ElastiCache Serverless and VPC endpoints instead of NAT."
    azure: "Front Door Premium with WAF and Private Link to Container Apps at zero minimum replicas, a Burstable PostgreSQL Flexible Server and Azure Managed Redis without a replica."
    gcp: "Load balancer with Cloud Armor and Cloud CDN, Cloud Run at zero minimum instances, a small zonal Cloud SQL and a shared-core Memorystore for Valkey."
    tradeoffs: "Database and cache live in a single zone: losing a zone or the host means losing the service, and scaling to zero adds cold starts."
  - name: "Multi-zone production"
    when: "A product with paying customers, a contractual SLA and sustained daytime traffic."
    cost: 2
    ops: 2
    onprem: "A three-node Kubernetes cluster (k3s or RKE2), PostgreSQL with Patroni or an operator across three nodes, Valkey with Sentinel and Keycloak with two replicas."
    aws: "At least two Fargate tasks in two zones, Aurora with writer and reader in different zones, WAF with managed rules and Secrets Manager with rotation."
    azure: "A zone-redundant Container Apps environment with at least two replicas, General Purpose PostgreSQL with zone HA and geo-redundant backups, Managed Redis with HA."
    gcp: "Cloud Run with at least one warm instance, regional Cloud SQL with automatic failover and Memorystore with a replica in another zone."
    tradeoffs: "You pay for capacity that sits idle most of the time so you can survive losing a zone; the region is still a single point of failure."
  - name: "Multi-region"
    when: "A critical service with recovery objectives of minutes if a region goes down, or users spread across continents."
    cost: 4
    ops: 3
    onprem: "Two data centres, a standby Patroni cluster in the second one and DNS or global load balancing that fails over."
    aws: "Aurora Global Database, the ECS service replicated in a second region and failover through Route 53 or CloudFront origin groups."
    azure: "Front Door with origins in two regions, Container Apps in both and a cross-region PostgreSQL read replica that is promoted on failover."
    gcp: "The global load balancer with Cloud Run serverless NEGs in two regions and a cross-region Cloud SQL replica that is promoted on failover."
    tradeoffs: "More than double the cost and far more complexity: asynchronous replication, possible lost writes on failover and mandatory drills."
extensions:
  - name: "Connection pooler"
    when: "When API replicas times pool size approaches the PostgreSQL connection limit."
    cost: "low"
    onprem: "PgBouncer"
    aws: "RDS Proxy"
    azure: "Built-in PgBouncer on Flexible Server"
    gcp: "PgBouncer next to the API"
  - name: "Read replicas"
    when: "When reports or searches compete with writes for the primary's CPU."
    cost: "medium"
    onprem: "Patroni replicas"
    aws: "Aurora readers"
    azure: "Flexible Server read replicas"
    gcp: "Cloud SQL read replicas"
  - name: "Rate limiting"
    when: "A public API exposed to scraping, brute force against the login or clients that exceed their quota."
    cost: "low"
    onprem: "HAProxy stick tables"
    aws: "AWS WAF rate-based rules"
    azure: "Front Door WAF rate limit"
    gcp: "Cloud Armor rate limiting"
  - name: "Queue for slow work"
    when: "When some requests render PDFs, send emails or call slow third parties."
    cost: "low"
    onprem: "RabbitMQ"
    aws: "Amazon SQS"
    azure: "Service Bus (queues)"
    gcp: "Pub/Sub or Cloud Tasks"
  - name: "Recovery in another region"
    when: "When the business cannot accept hours of downtime if the whole region fails."
    cost: "high"
    onprem: "Standby Patroni cluster"
    aws: "Aurora Global Database"
    azure: "Cross-region PostgreSQL replica"
    gcp: "Cross-region Cloud SQL replica"
  - name: "User uploads and images"
    when: "When users upload files: they go straight to storage with a pre-signed URL, not through the API."
    cost: "low"
    onprem: "Ceph RGW (S3)"
    aws: "S3 pre-signed URLs"
    azure: "Blob Storage user delegation SAS"
    gcp: "Cloud Storage signed URLs"
savings:
  - "Build the image for ARM and run Fargate on Graviton (`ARM64`): the price per vCPU-hour is lower than x86 and most APIs in Node, Python, Go or Java run unchanged."
  - "Avoid the NAT Gateway: with VPC endpoints for ECR, Secrets Manager, CloudWatch Logs and S3, private tasks need no Internet egress; if you do need it, a single NAT in dev."
  - "In dev, scale the API to zero (Container Apps and Cloud Run with a minimum of zero) and let Aurora Serverless v2 pause at 0 ACU; in prod, keep one warm instance."
  - "Commit to the baseline once it is stable: Compute Savings Plans cover Fargate, and there is reserved capacity for PostgreSQL Flexible Server and committed use discounts for Cloud SQL and Cloud Run."
  - "Cache every static asset at the CDN with hashed names and long expiry; every cache hit is a request that neither the API nor the WAF pays for."
  - "Set log retention (30 days in dev is reasonable) and cap trace sampling: observability often grows faster than the API itself."
---

## When you need it

This is the starting point for almost any product with users: an admin console, a B2B SaaS, a public service website. There is an interface that is downloaded once, an API that holds the business logic and a relational database that is the source of truth. If your workload is mostly transactional CRUD with a few thousand concurrent users, this design goes much further than people expect before you need anything fancier.

## Scenarios

### A startup MVP

Optimise for low fixed cost and delivery speed. One region, the API at zero or one minimum replica, the database at its smallest size with backups on, and a managed IdP so you never write a password form. Non-negotiable even here: TLS, secrets outside the code and a tested restore; replicas and multiple zones come later by changing parameters.

### A regulated company with data in the EU

Pin the region and check where the IdP stores users (Cognito is regional; Entra External ID fixes the data location when the tenant is created), encrypt with your own keys in the key management service, turn on WAF and load balancer access logs with retention that matches the regulation, and keep environments in separate accounts, subscriptions or projects. The CDN serves from a global edge: if the HTML or the API returns personal data, don't cache it, and check which headers get logged at the edge.

### Seasonal peaks

Enrolment periods or sales multiply traffic for a few days a year. The API scales on its own; the bottleneck is the database. Prepare before the peak: scheduled vertical scaling of the primary, read replicas for heavy queries, a pooler so that a hundred API replicas don't open thousands of connections, and caching of common responses. And rehearse with a load test.

### A customer who requires on-premises

The same design is built with open source: Nginx or HAProxy at the edge, Keycloak, PostgreSQL with Patroni, Valkey and OpenBao. If the API is a container image that reads its configuration from environment variables and validates JWTs from any OIDC issuer, the code is the same in all four columns of the diagram; what changes is who runs each piece.

## How it fits together

The client makes two kinds of request. Static assets (HTML, JS, CSS, images) go to the CDN, which serves them from cache and only goes back to storage when they expire. Calls to `/api` go to the load balancer, which terminates TLS, applies the WAF rules and spreads requests across the API replicas. Ideally both paths share a domain: the CDN routes `/api/*` to the load balancer and the browser needs no CORS.

The API never handles passwords: the user signs in against the identity provider over OIDC (authorisation code flow with PKCE), and the API only checks the JWT signature and claims against the issuer's public keys, which it caches. It looks in the cache first (sessions, expensive results, rate limits) and then in the database. Credentials come from the secrets manager or, better, don't exist at all: with workload identity the API signs in to the database and the cache with its platform identity.

Only the entry point is public. API, cache, database and secrets live on a private network, and the API origin rejects traffic that doesn't come from the load balancer or the CDN (a secret origin header, Private Link or restricted ingress).

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** A reverse proxy (Caddy with automatic certificates, or HAProxy with Coraza) serves the SPA and routes `/api` to two or three API containers. Alongside: PostgreSQL with its volume, Valkey, Keycloak with its own database and, if there are secrets to rotate, OpenBao. Backups are what matters: pgBackRest or WAL archiving to S3-compatible storage outside the host, with a restore rehearsed every month. The host is a single point of failure.

**Kubernetes on-premises.** k3s or RKE2 on three nodes, an ingress controller (HAProxy Ingress, or Gateway API with Envoy Gateway) with Coraza as the WAF, cert-manager for certificates, the Keycloak operator and a PostgreSQL operator: Zalando's runs Patroni underneath; CloudNativePG is the alternative without Patroni. External Secrets Operator syncs from OpenBao and the HPA scales the API. Don't use ingress-nginx for new installations: the project has been retired.

**Cloud without Kubernetes.** This is the design in the diagram: ECS Fargate, Container Apps or Cloud Run run the image and scale on their own, and everything else is a managed service. On Azure, the simplest variant keeps the WAF on Front Door Premium and reaches Container Apps over Private Link, with no Application Gateway.

**Managed Kubernetes.** EKS, AKS or GKE pay off when you already run a platform with several services, need sidecars or a service mesh, or want exact parity with your on-premises setup. Use the modes that manage nodes for you (EKS Auto Mode, AKS Automatic, GKE Autopilot) if you have no platform team.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | One host | Medium: you own everything | Manual, vertical | MVP, small on-premises customer |
| Kubernetes on-premises | Three or more nodes | High | HPA inside the cluster | On-premises requirement with HA |
| Container PaaS | Near zero; scales to zero | Low | Automatic, per request | Default choice in the cloud |
| EKS, AKS, GKE | Control plane and nodes | Medium-high | HPA and node autoscaling | A Kubernetes platform already exists |

## Key decisions

- **Containers or functions.** An API with steady traffic and persistent database connections fits containers better; functions shine with spiky traffic but make connection pooling awkward.
- **One domain or two.** Routing `/api` through the CDN avoids CORS and unifies the WAF; separate domains keep caching simpler but force you to manage cross-origin rules.
- **Managed or self-hosted IdP.** A managed IdP saves operations; Keycloak gives full control over flows and data in exchange for running it. Switching IdP later means migrating users and passwords: decide early.
- **Serverless or provisioned database.** Aurora Serverless v2 or scaling to zero saves money in dev and under irregular load; with steady load, a reserved provisioned instance is cheaper and more predictable.
- **Cache as an optimisation, not a dependency.** If the API stops working when the cache is down, the cache has become a database and needs the same guarantees.

## Common pitfalls

- Keeping sessions in replica memory: autoscaling and deployments throw them away.
- Exposing the database to the Internet "just to debug". It always lives on a private network; to debug, use a bastion or a managed session.
- Leaving the container's direct URL reachable (`run.app`, the ALB's or the Container Apps one), which lets callers bypass the WAF.
- Validating the JWT without checking audience and expiry, or calling the IdP on every request.
- Scaling the API without a ceiling and exhausting PostgreSQL connections: the replica maximum protects the database too.
- Never testing a restore: backups that have never been restored don't count.
- Letting the CDN cache API responses with user data because of a wrong header.
