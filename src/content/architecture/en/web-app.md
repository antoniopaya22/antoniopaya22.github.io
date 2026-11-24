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
---

## When you need it

This is the starting point for almost any product with users: an admin console, a B2B SaaS, a public service website. There is an interface that is downloaded once, an API that holds the business logic and a relational database that is the source of truth. If your workload is mostly transactional CRUD with a few thousand concurrent users, this design goes much further than people expect before you need anything fancier.

## How it fits together

The client makes two kinds of request. Static assets (HTML, JS, CSS, images) go to the CDN, which serves them from cache and only goes back to storage when they expire. Calls to `/api` go to the load balancer, which terminates TLS, applies the WAF rules and spreads requests across the API replicas.

The API never handles passwords: the user signs in against the identity provider over OIDC, and the API only checks the JWT signature and claims against the issuer's public keys, which it caches. For each request it looks in the cache first (sessions, expensive results, rate limits) and then in the relational database. Database and third-party credentials come from the secrets manager at start-up or through workload identity, never from the image.

## Key decisions

- **Containers or functions.** An API with steady traffic and persistent database connections fits containers better; functions shine with spiky traffic but make connection pooling awkward.
- **One domain or two.** Routing `/api` through the CDN avoids CORS and unifies the WAF; separate domains keep caching simpler but force you to manage cross-origin rules.
- **Managed or self-hosted IdP.** A managed IdP saves operations; Keycloak gives full control over flows and data in exchange for running it.
- **Cache as an optimisation, not a dependency.** If the API stops working when the cache is down, the cache has become a database and needs the same guarantees.

## Common pitfalls

- Keeping sessions in replica memory: autoscaling and deployments throw them away.
- Exposing the database to the Internet "just to debug". It always lives on a private network.
- Validating the JWT without checking audience and expiry, or calling the IdP on every request.
- Never testing a restore: backups that have never been restored don't count.
- Letting the CDN cache API responses with user data because of a wrong header.
