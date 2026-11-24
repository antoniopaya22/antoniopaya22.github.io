---
title: "Search and catalogue"
short: "Search"
summary: "A denormalised search index, fed by change data capture from the database, that delivers relevance, facets, autocomplete and hybrid vector search without becoming a second source of truth."
description: "Catalogue search with CDC, zero-downtime reindexing, facets, synonyms and hybrid vector search: reference architecture on AWS, Azure, GCP and on-premises."
order: 30
requirements:
  - "The database is the source of truth; the index can be rebuilt from it in full at any time."
  - "A database change shows up in results within seconds or minutes, as agreed, without dual writes from the application."
  - "Changing the index schema or analysers never leaves search down or half-populated."
  - "Results honour permissions and visibility (tenant, published, in stock) exactly as the application does."
  - "Queries, zero-result searches and clicks are recorded to measure and tune relevance."
platforms:
  onprem:
    summary: "The API on Kubernetes queries OpenSearch (or Meilisearch for small catalogues), Debezium reads the PostgreSQL WAL and a worker indexes; Valkey caches queries and OpenSearch Dashboards shows the analytics."
    notes:
      - "OpenSearch is Apache 2.0 and governed by the OpenSearch Software Foundation; Elasticsearch once again has an open source licence option (AGPL) alongside Elastic's own. Choose on features and operations, not licence alone."
      - "Debezium needs a logical replication slot: if the connector stops, PostgreSQL retains WAL until the disk fills. Watch slot lag and cap retained WAL."
      - "Meilisearch and Typesense give typo tolerance, facets and good results with almost no tuning; in exchange, less control over analysers and more limited horizontal scaling than OpenSearch."
      - "A serious OpenSearch cluster is three cluster-manager-eligible nodes with fast disks; snapshots to S3 (Ceph RGW) are your backup."
      - "The cost is memory and disk: the index with replicas and vectors can take several times the size of the source table."
  aws:
    summary: "The API on ECS Fargate queries OpenSearch Service; OpenSearch Ingestion reads Aurora PostgreSQL via logical replication and keeps the index current; ElastiCache caches and OpenSearch Dashboards shows the analytics."
    notes:
      - "OpenSearch Ingestion supports Aurora PostgreSQL and RDS for PostgreSQL as sources: it exports an initial snapshot to S3 and then follows changes. Logical replication must be enabled in the parameter group."
      - "OpenSearch Service (domains) bills per instance-hour and storage; Serverless bills per compute unit (OCU) with an always-on minimum. Serverless is not cheaper for a small, steady index."
      - "Use three zones with dedicated manager nodes in production; in development a single small node is enough."
      - "Access through the VPC with IAM or fine-grained access control; a domain with a public endpoint and an open policy is a data leak waiting to happen."
      - "OpenSearch supports hybrid search (BM25 plus k-NN) with normalisation processors; embeddings can be computed at ingest with connectors to Amazon Bedrock."
  azure:
    summary: "The API on Container Apps queries Azure AI Search, which Microsoft now brands as Foundry IQ; a worker pushes PostgreSQL changes into the index, Azure Managed Redis caches and Application Insights records the analytics."
    notes:
      - "Azure AI Search indexers do not support Azure Database for PostgreSQL as a source (they do support Azure SQL, Cosmos DB, Blob, OneLake and MySQL in preview). With PostgreSQL, use the push API from a worker fed by logical replication or Debezium."
      - "Indexers can be scheduled at most every five minutes; if you need lower latency, the push model is required anyway."
      - "Dedicated tiers (Basic, S1–S3, S3 HD, L1–L2) are billed per search unit per hour, replicas times partitions; the Serverless tier has been billed on consumption since September 2026 and cannot be migrated to or from other tiers."
      - "The query SLA requires at least two replicas, and the read-write SLA three. One replica is a test environment."
      - "The semantic ranker and integrated vectorisation at ingest cover hybrid search without custom code, at an extra usage-based cost."
  gcp:
    summary: "The API on Cloud Run queries Agent Search (formerly Vertex AI Search, now part of Gemini Enterprise Agent Platform); Datastream and Dataflow carry Cloud SQL changes into the data store and Memorystore caches."
    notes:
      - "Google renamed Vertex AI to Gemini Enterprise Agent Platform in April 2026 and its search product is now called Agent Search; for e-commerce there is AI Commerce Search (formerly Vertex AI Search for commerce)."
      - "Agent Search imports from BigQuery with periodic sync measured in days, from Cloud SQL or Cloud Storage, or document by document through the API. For changes within minutes, write through the API from the CDC pipeline."
      - "You pay per query and for indexed storage, with no cluster to size; in exchange you get less control over analysers, mappings and scoring than with OpenSearch or Elasticsearch."
      - "If you need fine-grained relevance control, Elastic Cloud from the Marketplace or OpenSearch on GKE are the usual alternatives on GCP."
      - "Datastream carries PostgreSQL into BigQuery with CDC; Dataflow helps if you transform, but for a simple index a Cloud Run worker reading the changes is cheaper."
tiers:
  - name: "PostgreSQL as the search engine"
    when: "A catalogue of thousands to hundreds of thousands of rows, one language and a team that does not want another database."
    cost: 1
    ops: 1
    onprem: "PostgreSQL with `tsvector`, GIN indexes, `unaccent` and `pg_trgm` for typos; pgvector if semantics are needed. No CDC: the column is updated in the same transaction."
    aws: "Aurora PostgreSQL with full-text search and pgvector, no extra service."
    azure: "Azure Database for PostgreSQL with full-text search and the vector extension."
    gcp: "Cloud SQL for PostgreSQL with full-text search and pgvector."
    tradeoffs: "Facets, synonyms and autocomplete must be hand-built, and search competes for CPU with transactions."
  - name: "Dedicated engine with CDC"
    when: "A shop or portal with facets, autocomplete and synonyms, updates within seconds and thousands of searches per minute."
    cost: 2
    ops: 2
    onprem: "A three-node OpenSearch cluster (or single-node Meilisearch for mid-sized catalogues), Debezium with Kafka or NATS and an indexing worker."
    aws: "OpenSearch Service across two or three zones with OpenSearch Ingestion reading Aurora PostgreSQL."
    azure: "Azure AI Search S1 with two replicas and a worker pushing changes from PostgreSQL."
    gcp: "Agent Search with a Cloud Run worker writing changes through the API, or Elastic Cloud from the Marketplace."
    tradeoffs: "One more system to run and pay for; eventual consistency between the database and what search shows."
  - name: "Scale and hybrid"
    when: "Catalogues of millions of documents, several languages, semantic vector search and high, spiky traffic."
    cost: 4
    ops: 3
    onprem: "OpenSearch with dedicated manager nodes, data nodes split by index, embeddings computed on your own GPUs and index replicas in a second data centre."
    aws: "OpenSearch Service with dedicated manager nodes in three zones, memory-optimised instances for vectors and embeddings via Bedrock."
    azure: "Azure AI Search S2 or S3 with three replicas, integrated vectorisation and the semantic ranker."
    gcp: "Agent Search or AI Commerce Search with personalisation from user events, or Elastic Cloud sized for vectors."
    tradeoffs: "Vectors multiply memory and cost; relevance can no longer be tuned by eye and needs evaluation against query sets."
extensions:
  - name: "Hybrid vector search"
    when: "When users describe what they want in their own words and lexical matching fails."
    cost: "medium"
    onprem: "OpenSearch k-NN or pgvector"
    aws: "OpenSearch k-NN + Bedrock"
    azure: "Vectors + semantic ranker"
    gcp: "Agent Search (built-in semantics)"
  - name: "Event-based personalisation"
    when: "Catalogues where ranking should depend on history and popularity, not just text."
    cost: "medium"
    onprem: "OpenSearch Learning to Rank"
    aws: "Amazon Personalize"
    azure: "Scoring profiles with own signals"
    gcp: "AI Commerce Search"
  - name: "Cache for frequent queries"
    when: "When autocomplete and category pages repeat the same queries thousands of times."
    cost: "low"
    onprem: "Valkey"
    aws: "ElastiCache"
    azure: "Azure Managed Redis"
    gcp: "Memorystore"
  - name: "Index replica in another region"
    when: "When search is critical to revenue and cannot depend on one region."
    cost: "high"
    onprem: "Cross-cluster replication"
    aws: "Cross-cluster replication"
    azure: "Second service + dual indexing"
    gcp: "Agent Search multi-region location"
  - name: "Queue between CDC and indexer"
    when: "To absorb bulk reindexing and not lose changes when the engine is slow or under maintenance."
    cost: "low"
    onprem: "Kafka or NATS JetStream"
    aws: "Amazon MSK or SQS"
    azure: "Event Hubs"
    gcp: "Pub/Sub"
savings:
  - "Start with PostgreSQL full-text search and add an engine only when you need facets, synonyms or good autocomplete: it is a whole service fewer."
  - "Index only the fields that are searched, filtered or shown in results; storing the full document in the index doubles storage and memory."
  - "On OpenSearch Service use Graviton instances and reserve the production domain's instances; on Azure AI Search, scale replicas on a schedule if traffic is daytime-only."
  - "Reduce dimensions or quantise vectors (OpenSearch and Azure AI Search support compression): memory is the biggest cost in hybrid search."
  - "Cache autocomplete and category pages with a short TTL: on services that charge per query, such as Agent Search, every cache hit is money saved."
  - "For a small, stable index, an OpenSearch Service domain with one small instance costs less than the always-on minimum of Serverless."
---

## When you need it

When `LIKE '%text%'` no longer cuts it: users type with typos, without accents, in plural or with synonyms ('laptop' and 'notebook'), want to filter by brand, price and size while seeing how many results each option has, and expect suggestions as they type. Also when the catalogue grows and search queries start competing for CPU with transactions. This case moves search reads into a specialised index without losing the database as the source of truth.

## Scenarios

### Small or internal product

A case-file search or a catalogue of a few thousand items. PostgreSQL with `tsvector`, a language dictionary, `unaccent` and `pg_trgm` covers 80% of it with no new infrastructure and no eventual consistency. Meilisearch or Typesense are the next step if you want typo tolerance and facets without tuning analysers.

### E-commerce with peaks

Sales and campaigns multiply searches. The index scales out with read replicas, the cache absorbs autocomplete and category pages, and the indexer is decoupled by a queue so a bulk price update does not slow down queries. Facets and ordering by stock or margin matter as much as the text.

### Multi-tenant SaaS

Each customer may see only its own documents. Either one index per tenant (simple isolation, too many indexes with thousands of customers) or a shared index with a mandatory `tenant_id` filter applied in the API, never from the client. Azure AI Search S3 HD is designed precisely for many small indexes, one per customer.

### Semantic search over documentation

Users ask 'how do I cancel an order that has already shipped' instead of typing keywords. Hybrid search: BM25 for exact matches (codes, references) and vectors for meaning, combined with rank fusion. It is the same foundation as RAG, without the generative model at the end.

## How it fits together

The user types into the search box and applies filters; the API turns that into an engine query, always adding the permission and visibility filters. First it checks the cache: the most repeated queries (autocomplete prefixes, categories) are served from there with a short TTL.

The application does not write the index. Changes in the source-of-truth database are captured via CDC (PostgreSQL logical replication) and the indexer turns them into denormalised documents: the product with its brand name, category, current price and stock, ready to search and filter without joins. If the indexer goes down, it resumes from its position in the change stream. This avoids dual writes, which always drift out of sync.

Schema or analyser changes are made with zero-downtime reindexing: create a new index, fill it from a database snapshot, apply the changes accumulated meanwhile, compare, and switch the alias to the new index atomically. The old one is kept for a few days to roll back.

The engine sends queries, zero-result searches and clicks to analytics. That data drives synonyms, field weights and business rules, and exposes the searches that find nothing.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** The API, PostgreSQL, single-node Meilisearch or OpenSearch with its volume, Valkey and, if you use CDC, Debezium Server writing straight to the indexer or to NATS. Index snapshots are optional if you can rebuild from the database in acceptable time; measure that time.

**Kubernetes on-premises.** k3s or RKE2 with the OpenSearch Kubernetes Operator (or ECK if you choose Elasticsearch), CloudNativePG with logical replication enabled, Strimzi for Kafka and Kafka Connect with Debezium, and KEDA scaling the indexer on consumer lag. Use anti-affinity to spread data nodes across hosts and fast local storage.

**Cloud without Kubernetes.** The API on Fargate, Container Apps or Cloud Run, the managed engine (OpenSearch Service, Azure AI Search, Agent Search) and managed CDC where it exists (OpenSearch Ingestion) or a small worker where it does not.

**Managed Kubernetes.** EKS, AKS or GKE pay off if you want the same OpenSearch or Elasticsearch as on-premises, control over versions and plugins, or to avoid the cost of a managed search service at high volume. In exchange, you run a stateful system.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | One host | Medium | Vertical | Small or mid-sized catalogue |
| Kubernetes on-premises | Three or more nodes | High | Nodes and replicas | On-premises requirement |
| Managed engine | Instances or consumption | Low | Replicas or automatic | Default choice in the cloud |
| EKS, AKS, GKE | Control plane and nodes | High | Operator | Full control of the engine |

## Key decisions

- **PostgreSQL or a dedicated engine.** While search is a secondary feature, PostgreSQL avoids eventual consistency and another system. An engine is justified by relevance, facets, languages and volume.
- **CDC or domain events.** CDC captures every change, including those that bypass the application; domain events carry intent and pre-shaped data. Many teams combine both: CDC as the guarantee and events to enrich.
- **High-level managed service or configurable engine.** Agent Search or Azure AI Search with the semantic ranker deliver good results fast; OpenSearch or Elasticsearch give full control over analysers, scoring and cost in exchange for work.
- **Per-tenant or shared index.** Isolation and easy deletion versus index count and fixed cost.
- **Vectors or not.** They add semantic understanding, but also memory, latency and an embedding model to version. Start lexical, measure, and add vectors where it fails.

## Common pitfalls

- Writing to the database and the index from the application: after the first partial failure they stay out of sync forever.
- Treating the index as the source of truth and being unable to rebuild it.
- Changing mappings on the live index instead of reindexing behind an alias.
- Applying permission filters in the frontend.
- An abandoned logical replication slot filling the PostgreSQL disk.
- Tuning relevance without a reference query set: every improvement breaks another search and nobody notices.
- Ignoring zero-result searches, which are the to-do list for synonyms and the catalogue.
