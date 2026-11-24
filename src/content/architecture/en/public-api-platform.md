---
title: "Public API for third parties"
short: "Public API"
summary: "Exposing your services to partners and external developers as a product: app registration, machine-to-machine OAuth 2.0, plans with quotas, versioning, documentation, analytics and, where it applies, usage-based billing."
description: "Public third-party API with OAuth 2.0, usage plans, quotas, versioning, developer portal and monetisation: a reference on AWS, Azure, GCP and on-premises."
order: 24
requirements:
  - "Each consumer is identified as an application and obtains OAuth 2.0 tokens via client credentials; the API key only binds the plan."
  - "Quotas and rate limits are enforced per application and plan before reaching internal services."
  - "Versions coexist and are retired with notice; no breaking change ever reaches a published version."
  - "Documentation, sign-up and credential rotation are self-service."
  - "Every request is metered per application for analytics, support and billing."
platforms:
  onprem:
    summary: "Kong or Gravitee as the gateway with quotas and caching, Keycloak as the OAuth 2.0 server, Gravitee's portal for self-service and OpenMeter to meter consumption."
    notes:
      - "Kong's developer portal belongs to the Enterprise edition or Konnect; if you want everything open source, Gravitee's community edition includes gateway, portal and subscription management."
      - "Keycloak issues client-credentials tokens; the gateway validates the JWT locally with the public keys and does not call Keycloak on every request."
      - "Kong quotas in a cluster need a shared Redis or Valkey; with local counters each node enforces its own limit."
      - "OpenMeter aggregates usage events per customer and exposes them to your billing; the gateway sends it every request through an asynchronous log."
  aws:
    summary: "API Gateway REST with usage plans, API keys, per-stage caching and a Cognito authorizer with client credentials; CloudWatch and usage reports feed analytics and billing."
    notes:
      - "Usage plans and API keys exist only on REST APIs, not HTTP APIs. AWS warns that usage plan throttling and quotas are best effort: don't use them for cost control or access control."
      - "An API key does not authenticate: anyone holding a key for a plan can reach every API in it. Authorisation comes from Cognito (resource server scopes) or a Lambda authorizer."
      - "Cognito bills M2M per token issued: require clients to reuse the token until it expires."
      - "API Gateway Portals (November 2025) and its successor API Portal publish documentation with Cognito-based access control, but they don't register applications or issue credentials: you build that flow yourself."
      - "The REST cache is billed per hour by size, whether or not it is getting hits."
  azure:
    summary: "API Management with products, subscriptions, quota and cache policies, the built-in developer portal and Microsoft Entra ID as the OAuth 2.0 server; APIM analytics and Application Insights measure usage."
    notes:
      - "The Consumption tier has no developer portal, built-in cache or API analytics: for this case start at Basic v2 or Standard v2."
      - "APIM products and subscriptions are the plans; the `rate-limit-by-key` and `quota-by-key` policies enforce per-application limits and `validate-jwt` checks the Entra ID token."
      - "For external partners, each consumer is an app registration with a secret or certificate; the portal can delegate sign-in to Entra External ID."
      - "APIM has no monetisation: export usage per subscription and integrate it with your payment provider."
      - "The v2 tiers carry a fixed cost per unit even with no traffic; Premium v2 adds VNet injection and availability zones."
  gcp:
    summary: "Apigee as the gateway with API products, quotas, caching and its own OAuth 2.0 server, plus the integrated portal and Apigee analytics; monetisation is a subscription add-on."
    notes:
      - "On pay-as-you-go, Apigee charges each environment per hour and region from the moment it exists, plus calls: the minimum cost is not zero."
      - "The Base environment includes neither API products nor portals; for this case you need Intermediate or Comprehensive."
      - "Monetisation is not available to pay-as-you-go organisations: it requires a subscription contracted through sales. Without it, export analytics to your billing system."
      - "The OAuthV2 policy issues and validates client-credentials tokens; Quota and SpikeArrest separate business quotas from burst protection."
tiers:
  - name: "API for a few partners"
    when: "One or two dozen known integrators, manual onboarding and no usage-based billing."
    cost: 1
    ops: 1
    onprem: "Kong or Gravitee on one host with Keycloak, OpenAPI documentation published as a static site and onboarding by email."
    aws: "API Gateway REST with usage plans, Cognito M2M and documentation on a static site or in API Portal."
    azure: "APIM Basic v2 with the developer portal and Entra ID."
    gcp: "Google Cloud API Gateway with OpenAPI and keys, or Apigee on an Intermediate environment if already contracted."
    tradeoffs: "Manual sign-ups and rotations that don't scale; no per-customer business analytics."
  - name: "Self-service partner programme"
    when: "Hundreds of consumers, differentiated plans, a self-service portal and an SLA."
    cost: 2
    ops: 2
    onprem: "Gravitee or Kong in a cluster with Valkey for quotas, Keycloak in HA and OpenMeter."
    aws: "API Gateway REST with caching, Cognito M2M, your own self-service flow (a Lambda that creates the app client and key) and CloudWatch with usage reports."
    azure: "APIM Standard v2 with products, approval-based subscriptions and built-in cache."
    gcp: "Apigee on an Intermediate or Comprehensive environment with products, integrated portal and analytics."
    tradeoffs: "A meaningful fixed cost for the managed gateway, plus product work: documentation, support and a versioning policy."
  - name: "API as a billable product"
    when: "The API generates revenue, with usage-based billing, regulatory requirements or presence in several regions."
    cost: 4
    ops: 3
    onprem: "Gateway across several sites, Keycloak with mTLS for certificate-bound tokens and OpenMeter wired into billing."
    aws: "API Gateway in two Regions with a custom domain and Route 53, WAF, mTLS and usage exported to the billing system."
    azure: "APIM Premium in several regions with availability zones and usage exported to the payment provider."
    gcp: "Subscription Apigee with monetisation, Advanced API Security and instances in several regions."
    tradeoffs: "The platform becomes a product with its own team; gateway subscription contracts weigh on the bill."
extensions:
  - name: "WAF in front of the gateway"
    when: "Whenever the API is public: injections, bots and brute force against the token endpoint."
    cost: "low"
    onprem: "Coraza on HAProxy"
    aws: "AWS WAF"
    azure: "Front Door or Application Gateway WAF"
    gcp: "Cloud Armor"
  - name: "mTLS and certificate-bound tokens"
    when: "Banking, healthcare or partners that require mutual authentication."
    cost: "low"
    onprem: "Keycloak + mTLS at the gateway"
    aws: "mTLS on an API Gateway custom domain"
    azure: "Client certificates in APIM"
    gcp: "mTLS on Apigee or the load balancer"
  - name: "External shared cache"
    when: "When the built-in cache falls short or there are several gateway instances."
    cost: "medium"
    onprem: "Valkey"
    aws: "CloudFront in front of the API"
    azure: "Azure Managed Redis"
    gcp: "Memorystore"
  - name: "Integrator sandbox"
    when: "So partners can test without touching real data."
    cost: "low"
    onprem: "Gravitee environment with mocks"
    aws: "Sandbox stage with mock integration"
    azure: "Sandbox product with `mock-response`"
    gcp: "Apigee environment with mock proxies"
  - name: "Outbound webhooks"
    when: "When consumers poll to find out about changes."
    cost: "low"
    onprem: "Svix (self-hosted)"
    aws: "EventBridge API destinations"
    azure: "Event Grid"
    gcp: "Eventarc + Cloud Run"
  - name: "API catalogue and governance"
    when: "Several teams publish APIs and you need to avoid duplicates and shadow APIs."
    cost: "medium"
    onprem: "Backstage"
    aws: "API Portal (discovery)"
    azure: "Azure API Center"
    gcp: "Apigee API hub"
savings:
  - "Size the managed gateway by its fixed cost: Apigee charges each environment per hour and region, and APIM v2 per unit; delete test environments nobody uses."
  - "On Azure, don't pay for Premium just to get a portal and cache: Basic v2 and Standard v2 include them; Premium only if you need VNet injection, zones or several regions."
  - "Require clients to cache the token until it expires: Cognito bills M2M per token issued and any OAuth server suffers with one token per request."
  - "Return `Cache-Control` and ETag on public reads and put a CDN in front where the data allows: an edge hit never reaches the gateway."
  - "Reject early what shouldn't get through: WAF and rate limiting up front avoid paying gateway and backend calls for abusive traffic."
  - "Set retention on access logs and send only the fields you use to analytics; with millions of calls, logs cost more than the gateway."
---

## When you need it

When the API stops being something your own frontend consumes and becomes a product for third parties: partners integrating their ERP, developers building on your platform, a regulator demanding access (open banking, healthcare, government) or a business model that charges per call. From then on a load balancer is not enough: you need to know who is calling, with which permissions, how much they may call, how they hear about changes and what you charge them.

If only your own application consumes the API, this case is overkill: the load balancer or API gateway from the [serverless API](/en/architecture/serverless-api/) case is enough.

## Scenarios

### Integration with a dozen partners

Suppliers or large customers connecting their systems. Onboarding is manual and negotiated, so a self-service portal is optional; what matters is OAuth 2.0 with client credentials, one key per partner bound to its plan, published OpenAPI documentation and a sandbox. A small gateway and no monetisation.

### Platform with a developer ecosystem

Hundreds or thousands of developers sign up on their own. The portal is the product: registration, app creation, credentials, rotation, interactive documentation and service status. Free and paid plans with different quotas, and per-application analytics for support. This is where APIM, Apigee or Gravitee shine; on AWS you build the self-service part yourself.

### Regulated sector

Open banking or healthcare: mTLS with client certificates, certificate-bound tokens, end-user consent (which brings in the authorisation code flow, not just client credentials), immutable audit logs and data residency. The gateway and the OAuth server must sit in the required region and logs cannot leave it.

### API billed by usage

The usage counter becomes billing data: it must be complete, idempotent and auditable. Meter at the gateway, aggregate in a metering system (OpenMeter, Apigee monetisation or your own pipeline) and invoice from there. Plan quotas either cut off the excess or bill it, depending on the contract.

## How it fits together

The developer visits the portal, signs up and creates an application. The portal registers it with the OAuth server (getting a `client_id` and a secret or certificate) and with the gateway (binding it to a plan with its key). From then on, the application requests a token from the OAuth server with client credentials and calls the gateway with the token and the key.

The gateway validates the token locally using the issuer's public keys, checks scopes, enforces the rate limit and quota of that application's plan, and looks up the response in the cache if the operation is cacheable. On a miss it routes to the matching version of the internal service, which lives on a private network and only accepts traffic from the gateway. Each request is logged asynchronously with application, operation, status code and latency for analytics and billing.

Versioning lives at the gateway: `/v1` and `/v2` (or a header) route to different backends, the old version returns `Deprecation` and `Sunset` headers, and the portal shows which applications still use it so you can warn them before retiring it.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** Kong (with PostgreSQL) or Gravitee (with MongoDB or PostgreSQL, and Elasticsearch or OpenSearch for analytics), Keycloak with its database and the portal, behind a TLS proxy. Fine for a few partners; the gateway is a single point of failure and backups must include plan and application configuration.

**On-premises Kubernetes.** Kong Ingress Controller or the Gravitee operator, managing APIs, plans and consumers as declarative resources in Git. Keycloak with its operator, CloudNativePG, Valkey for shared counters and cert-manager. This is the serious on-premises option.

**Cloud without Kubernetes.** The diagram's design: managed API Gateway, APIM or Apigee, with internal services on ECS Fargate, Container Apps or Cloud Run. You don't operate the gateway, but you pay its fixed cost and accept its limits.

**Managed Kubernetes.** Kong or Gravitee on EKS, AKS or GKE pay off if you want the same gateway across every cloud and on-premises, or if the fixed cost of Apigee or APIM Premium isn't justified by your volume.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | One host | Medium | Vertical | Few partners, on-premises |
| On-premises Kubernetes | Cluster | High | HPA | Serious on-premises |
| Managed gateway | From near zero (API Gateway) to high (Apigee) | Low | Managed | Default in the cloud |
| EKS, AKS, GKE | Control plane and nodes | Medium-high | HPA | Same gateway everywhere |

## Key decisions

- **Key or token.** The key identifies the application and its plan; the OAuth token authorises. Keys alone are convenient but give you no scopes, expiry or clean rotation.
- **Managed or self-run gateway.** API Gateway is cheap but basic; APIM and Apigee bring a portal and analytics at a fixed cost; Kong and Gravitee give portability in exchange for running them.
- **Versioning by path or header.** A path is visible and easy to route and cache; a header keeps URLs stable. Pick one and write it into the versioning policy with retirement deadlines.
- **Quota versus rate limit.** A quota is a business limit (calls per month); a rate limit protects against bursts (calls per second). You need both, and they are configured differently.
- **Your own metering or the gateway's.** If you bill, the gateway's log must be the source; reconciling it against backend logs breeds disputes.

## Common pitfalls

- Treating the API key as authentication and sending it in the query string, where it lands in logs and caches.
- Quotas with local counters on each node: with five replicas the client gets five times its quota.
- Publishing the first version with no deprecation policy and having to maintain it forever.
- Caching client-specific responses without including the application in the cache key.
- Returning internal errors with stack traces to third parties, or 500s when the problem is the quota (it should be 429 with `Retry-After`).
- Leaving the backend reachable without going through the gateway, until a partner discovers the direct URL.
