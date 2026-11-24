---
title: "Scaling building blocks: caches, load balancers and friends"
short: "Scaling blocks"
summary: "CDN, caching, load balancers, autoscaling, read replicas, poolers, queues and rate limiting: what each piece solves, when it isn't worth it and which service provides it on each platform."
description: "CDN, caching, load balancers, autoscaling, read replicas, connection pooling, queues and rate limiting: when to use each on AWS, Azure, GCP and on-prem."
order: 2
---

Almost every scaling problem in a web application ends up at the database. The pieces in this guide mostly exist so that it receives fewer requests, fewer connections or a smoother flow of them. None of them is free: each adds a component to run and a new failure mode.

Before adding any of them, **measure**: with traces and per-endpoint latency you know whether the bottleneck is CPU, slow queries, exhausted connections or a third party. And the prerequisite for everything below is a **stateless** API, with no in-memory sessions and no files on local disk.

## CDN and HTTP caching

A CDN keeps copies of responses close to the user. For static assets with versioned names (`app.3f9c2a.js`) it is the cheapest optimisation there is.

What gets cached is decided by the origin's `Cache-Control` header:

| Directive | Effect | Typical use |
|---|---|---|
| `public, max-age=31536000, immutable` | Browser and CDN keep it for a year without revalidating | Assets with a hash in the name |
| `public, max-age=60, s-maxage=300` | Browser 1 min, CDN 5 min | Pages or public API responses that rarely change |
| `stale-while-revalidate=30` | Serves the stale copy while refreshing in the background | Avoiding latency spikes on expiry |
| `private, no-store` | No intermediary stores anything | Responses with user data |
| `Vary: Accept-Encoding` | One copy per variant | Compression; avoid `Vary: Cookie` |

**Invalidation** is the tricky part: purging paths takes time to propagate and may be charged per path. The robust approach is not to need it: versioned names for assets, short TTLs for dynamic content and `no-cache` on `index.html`.

**When:** whenever you serve static assets or public content, and to absorb spikes of anonymous traffic.

**When not:** for personalised responses, unless you fully control the cache keys. A wrong `Cache-Control` on a response with user data is a data leak, not a performance bug.

| On-prem | AWS | Azure | GCP |
|---|---|---|---|
| Varnish or Nginx `proxy_cache`; a commercial CDN in front | CloudFront (pay as you go or flat-rate plans) | Front Door Standard/Premium | Cloud CDN on the global external Application Load Balancer; Media CDN for video |

On Azure, don't start anything on Azure CDN Standard from Microsoft (classic), which retires on 30 September 2027, or on Front Door (classic), which retires on 31 March 2027. Since November 2025 CloudFront offers flat-rate monthly plans with no overages, which can coexist with pay-as-you-go on other distributions.

## Application cache

An in-memory cache (Valkey or Redis) between the API and the database for expensive or highly repeated results: profiles, catalogues, computed permissions, usage counters.

| Pattern | How it works | Main risk |
|---|---|---|
| Cache-aside | The app reads the cache; on a miss it reads the DB and fills the cache | Stale data until the TTL expires |
| Write-through | The app writes to the DB and updates the cache in the same operation | Slower writes; caches things nobody reads |
| Write-behind | The app writes to the cache and another process flushes to the DB | Data loss if the cache dies: avoid it except in very specific cases |

Cache-aside with a TTL is the sensible starting point. The details that make the difference:

- **TTL with jitter** (10–20 % random), so keys created together don't expire together.
- **Stampedes.** When a hot key expires, a hundred requests hit the database. Use a per-key lock (only one recomputes), early refresh, or serve the stale value while recomputing.
- **Keys with tenant and version:** `t:{tenant}:user:{id}:v3`. The prefix prevents serving one customer's data to another; the version invalidates a whole schema.
- **Delete the key on write**, on top of the TTL.
- **Negative caching** with a short TTL for "not found", or requests for non-existent IDs will flatten the database.
- **An explicit `maxmemory-policy`:** `allkeys-lru` for a pure cache.

**When:** repeated reads of data that tolerates seconds or minutes of staleness, once queries and indexes are already tuned.

**When not:** to hide a query with no index, for data that must be exact right now (balances, stock at checkout) or when the expected hit rate is low. If the API can't work with the cache down, the cache has become a database and needs the same guarantees.

| On-prem | AWS | Azure | GCP |
|---|---|---|---|
| Valkey (Sentinel or cluster) | ElastiCache (Valkey, Redis OSS, Memcached), also in Serverless mode | Azure Managed Redis | Memorystore for Valkey / for Redis Cluster |

ElastiCache Serverless for Valkey bills a minimum of 100 MB of data per cache (1 GB on the other engines), which makes it viable for small workloads. Azure Cache for Redis is being retired: Basic, Standard and Premium on 30 September 2028 and Enterprise in March 2027; new work goes on Azure Managed Redis.

## Load balancers

| | L4 (transport) | L7 (application) |
|---|---|---|
| Sees | IP, port, TCP/UDP | Host, path, headers, cookies |
| Terminates TLS | Optional | Yes, usually |
| Routes by path or host | No | Yes |
| WAF | No | Yes, built in or in front |
| Added latency | Minimal | Somewhat higher |
| Typical use | Databases, MQTT, gRPC without inspection, non-HTTP traffic | HTTP APIs and websites |

The second decision is **regional or global**. A regional load balancer spreads traffic across the zones of one region; a global (anycast) one receives the user at the nearest point of presence and sends them to the closest healthy region. Global only makes sense if you have backends in several regions or want to terminate TLS at the edge.

| Role | On-prem | AWS | Azure | GCP |
|---|---|---|---|---|
| Regional L7 | HAProxy, Envoy, Nginx, Traefik | Application Load Balancer | Application Gateway v2 | Regional external Application Load Balancer |
| Regional L4 | HAProxy (TCP), MetalLB + kube-proxy, Keepalived | Network Load Balancer | Load Balancer Standard | Network Load Balancer (proxy or passthrough) |
| Global L7 | A commercial CDN in front | CloudFront with per-region origins | Front Door | Global external Application Load Balancer |
| Global L4 | Your own anycast (BGP) | Global Accelerator | Global tier (cross-region) Load Balancer | Global external proxy Network Load Balancer |

On Azure, Basic Load Balancer was retired on 30 September 2025 and Application Gateway v1 on 28 April 2026: use Standard and v2.

**Health checks.** *Liveness* says whether the process is alive (if it fails, it is restarted); *readiness*, whether it can take traffic right now (if it fails, it stops receiving it). Keep the database out of liveness: a bad moment on the database would restart every replica at once. Also configure *draining* so outgoing replicas finish their in-flight requests.

**Sticky sessions.** Every L7 balancer offers them (cookies on ALB and Application Gateway, session affinity on Container Apps and, best effort, on Cloud Run). Avoid them for application state: they spread load badly, autoscaling and deployments break affinity, and a failed node takes its sessions with it. Move the session into the cache or a token; keep stickiness for WebSockets or legacy applications.

**When:** as soon as you have two replicas or need zero-downtime deployments.

**When not:** on a container PaaS or functions, balancing is already built in; another load balancer in front is only justified for WAF, custom domains or routing several services under one domain.

## Autoscaling

| Signal | Good for | Watch out for |
|---|---|---|
| CPU | APIs with uniform compute load | I/O-bound workloads: CPU stays flat while latency climbs |
| Requests or concurrency per replica | HTTP APIs | Needs a realistic target measured with load tests |
| Queue length or age | Workers | Scale to zero and the cold start of the first message |
| Schedule | Predictable peaks (opening hours, month end) | A calendar that goes stale |

Rules I always apply: a **minimum** that carries baseline traffic without cold starts in production, a **maximum** that acts as a fuse for the bill and for the database (every replica opens connections), and scaling down more slowly than up to avoid flapping.

| On-prem | AWS | Azure | GCP |
|---|---|---|---|
| HPA, KEDA for queues and scale to zero; Cluster Autoscaler (with Cluster API) for nodes | ECS Service Auto Scaling (CPU or `ALBRequestCountPerTarget` target tracking), Lambda by concurrency | Container Apps with HTTP rules and KEDA scalers | Cloud Run by concurrency and CPU; on GKE, HPA and node auto-provisioning |

**When:** variable or spiky traffic.

**When not:** when the bottleneck is downstream. Scaling the API against a saturated database only multiplies connections and makes things worse.

## Read replicas

Asynchronous copies that serve reads which tolerate seconds of lag: reports, search, listings. The classic problem is **reading your own writes**: if the next screen reads from a lagging replica, the user sees the old value. Send reads that follow a write by the same user to the primary.

| On-prem | AWS | Azure | GCP |
|---|---|---|---|
| Patroni or CloudNativePG replicas (`-ro` service) | Aurora: up to 15 replicas behind a reader endpoint | PostgreSQL flexible server: up to 5 replicas (more with cascading) and virtual endpoints | Cloud SQL: read replicas; *read pools* behind a single endpoint on Enterprise Plus |

On Azure Database for PostgreSQL, replicas are not available on the Burstable tier.

**When:** the load is mostly reads and the primary is limited by query CPU or I/O.

**When not:** if the problem is writes (a replica doesn't relieve them) or you haven't reviewed indexes and queries yet. A replica is not a backup: it replicates a mistaken `DELETE` too.

## Connection pooler

PostgreSQL forks a process per connection. With dozens of API replicas or hundreds of functions, each with its own pool, you run out of `max_connections` and memory long before CPU. A pooler multiplexes thousands of client connections over a few server connections.

**Transaction** mode is where the gain is, and it has restrictions: no session-level `SET`, session advisory locks, `LISTEN/NOTIFY` or temporary tables that outlive the transaction. Protocol-level prepared statements work on modern PgBouncer with `max_prepared_statements` enabled.

| On-prem | AWS | Azure | GCP |
|---|---|---|---|
| PgBouncer; on Kubernetes, the CloudNativePG `Pooler` | RDS Proxy (Aurora and RDS) | Built-in PgBouncer on PostgreSQL flexible server, port `6432` | Cloud SQL Managed Connection Pooling |

RDS Proxy stops multiplexing (*pinning*) when it detects session state. Azure's PgBouncer is not available on the Burstable tier. Cloud SQL Managed Connection Pooling (PostgreSQL and MySQL) requires Enterprise Plus, and enabling it on an existing instance restarts it.

**When:** many compute replicas, serverless functions or short-lived connections.

**When not:** a few replicas with well-sized application pools. There the pooler only adds a hop and another component.

## Queues as a buffer

A queue turns a spike into a delay instead of an outage: the API answers `202 Accepted` and workers consume at the pace the database can sustain, scaling with queue length. It is the piece that buys the most stability per euro. The "Queues and background jobs" case covers it in full.

| On-prem | AWS | Azure | GCP |
|---|---|---|---|
| RabbitMQ (quorum queues), Kafka for streams | SQS | Service Bus | Pub/Sub, Cloud Tasks for rate-controlled HTTP tasks |

**When:** slow, fragile work or work with external dependencies: emails, PDFs, integrations, imports.

**When not:** when the user needs the answer in the same request: waiting on a queue result adds latency for no gain.

## Rate limiting and backpressure

Autoscaling isn't enough: something has to say no. Rate limiting stops abusive or buggy clients; backpressure rejects early the work a saturated system won't be able to finish.

- Limit by API key, user or tenant, not just by IP. Answer `429` with `Retry-After`.
- Put **timeouts** on every outbound call, and retries with exponential back-off, jitter and a cap.
- Use **circuit breakers** towards failing dependencies so you don't pile on while they recover.
- Isolate resources (*bulkheads*): a connection pool or queue per kind of work, so one heavy client can't exhaust everyone's.

| On-prem | AWS | Azure | GCP |
|---|---|---|---|
| Envoy or Envoy Gateway (local and global rate limiting), HAProxy *stick tables*, Nginx `limit_req` | AWS WAF rate-based rules; API Gateway throttling per stage and route | Front Door WAF rate limit rules; `rate-limit-by-key` in API Management | Cloud Armor (`throttle` and `rate_based_ban`); quotas in API Gateway or Apigee |

AWS WAF rate-based rules accept limits from 10 requests per window, with 1, 2, 5 or 10-minute windows; they are approximate, meant to stop abuse rather than meter quotas.

## Multi-AZ versus multi-region

| | Multi-AZ | Multi-region |
|---|---|---|
| Protects against | Loss of a data centre or zone | Loss of an entire region, regional disaster |
| Complexity | Low: most managed services offer it as an option | High: data replication, global DNS or load balancing, failover drills |
| Consistency | Synchronous replication is common in managed databases | Asynchronous: you accept losing seconds of data (RPO > 0) |
| Cost | Duplicated resources in another zone plus cross-zone traffic | A duplicated environment plus inter-region egress |
| For whom | Any production that matters | Regulatory requirements, minutes of RTO on regional failure, users on several continents |

Multi-AZ should be the production default: Aurora replicates storage across three zones, Azure has zone-redundant services and Cloud SQL offers regional high availability. Mind the cross-zone traffic: on AWS it costs USD 0.01/GB in each direction between EC2, RDS or ElastiCache in different zones, and heavy internal traffic shows up on the bill.

Multi-region is a different league. First write down the RTO and RPO you really need and what an hour of downtime costs. For most products, multi-AZ plus backups restorable in another region is the right balance.

## In what order

For a web application starting to struggle, the order that usually gives the most for the least: indexes and queries; a CDN for static assets; a stateless API with two replicas and properly separated health checks; a pooler if compute scales horizontally or is serverless; queues for anything that doesn't need an immediate answer; an application cache for expensive, measured reads; read replicas. Rate limiting at the edge belongs from the first day of public exposure. Multi-region and sharding come after exhausting everything above.
