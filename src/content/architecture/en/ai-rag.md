---
title: "Production AI with RAG"
short: "AI with RAG"
summary: "An assistant that answers from the organisation's own documents, respects each user's permissions, filters what goes in and out, and leaves traces that explain every answer."
description: "Production RAG with orchestrator, guardrails, LLM, vector search and evaluation: a reference architecture on AWS, Azure, GCP and on-premises."
order: 12
requirements:
  - "Answers are grounded in your own documents and cite their source."
  - "A user only retrieves chunks from documents they are allowed to see."
  - "Inputs and outputs pass through guardrails: prompt injection, personal data and disallowed content."
  - "Every request leaves a trace of the prompt, retrieved context, answer, tokens and latency."
  - "No change of model, prompt or chunking reaches production without passing an evaluation set."
platforms:
  onprem:
    summary: "An orchestrator on Kubernetes retrieves context from PostgreSQL with pgvector, runs input and output through NeMo Guardrails, calls an open model served by vLLM and records everything in Langfuse."
    notes:
      - "vLLM needs GPUs and the cost is fixed per node whether you use it or not; size for concurrency and context length, not for user count."
      - "pgvector with an HNSW index is enough for most internal corpora and lets you filter by permissions and metadata with plain SQL in the same query."
      - "The embedding model also has to be served and versioned (vLLM or Text Embeddings Inference): changing it means re-indexing the whole corpus."
      - "Langfuse covers tracing, prompt versioning and dataset-based evaluation; self-hosted, it needs PostgreSQL, ClickHouse, Redis and object storage."
  aws:
    summary: "An orchestrator on ECS Fargate retrieves from Aurora with pgvector, invokes Amazon Bedrock models, Claude among them, and applies Bedrock Guardrails to input and output."
    notes:
      - "Bedrock Guardrails can be applied to any text through the `ApplyGuardrail` API, including models outside Bedrock; it bills by volume of text evaluated and per policy enabled."
      - "If you would rather not build ingestion, Bedrock Knowledge Bases chunks, embeds and can use Aurora, OpenSearch Serverless or S3 Vectors as its store."
      - "Lambda is fine for ingesting individual documents; the initial load or documents that need OCR fit better in Step Functions or ECS tasks."
      - "CloudWatch gives you traces and metrics, not quality evaluation: turn on Bedrock model invocation logging and evaluate with Bedrock Evaluations or Langfuse."
      - "You pay per input and output token, and retrieved context is input tokens on every question: top-k and chunk size are cost decisions."
  azure:
    summary: "An orchestrator on Container Apps retrieves with Azure AI Search, calls models deployed in Microsoft Foundry, which also offers Claude, and filters with Azure AI Content Safety."
    notes:
      - "Azure AI Foundry was renamed Microsoft Foundry in late 2025; Content Safety and Prompt Shields are now configured as guardrails on each deployment."
      - "AI Search combines vector search, keyword search and semantic reranking; hybrid search markedly improves retrieval of proper names, codes and references."
      - "Store in the index the Entra ID groups allowed to see each document and filter on them in the query."
      - "AI Search has a fixed cost per search unit (replicas times partitions) even with no traffic; models bill per token or through reserved capacity."
      - "Application Insights collects traces via OpenTelemetry; groundedness and relevance evaluation is done with Foundry's evaluators."
  gcp:
    summary: "An orchestrator on Cloud Run retrieves from Vertex AI Vector Search (part of Gemini Enterprise Agent Platform since April 2026), calls Vertex AI models (Gemini, Claude or open models) and sanitises prompt and response with Model Armor."
    notes:
      - "Model Armor is model-agnostic: it exposes one API to sanitise prompts and another for responses, with filters for injection, sensitive data and malicious URLs."
      - "Vector Search bills per deployed node even with no queries; for small corpora, AlloyDB or Cloud SQL with pgvector, or Vertex AI RAG Engine, are cheaper to start with."
      - "Cloud Run jobs suit batch ingestion: re-indexing the corpus is one job with parallel tasks, not one invocation per document."
      - "Cloud Trace stores OpenTelemetry traces; to measure quality use the Vertex AI Gen AI evaluation service or Langfuse."
tiers:
  - name: "All in PostgreSQL + managed API"
    when: "An internal assistant or first AI product: thousands to hundreds of thousands of chunks and a team that already runs PostgreSQL."
    cost: 1
    ops: 1
    onprem: "Docker Compose with the orchestrator, PostgreSQL with pgvector and pg_trgm, Text Embeddings Inference on CPU and Langfuse; the LLM is a managed API if data policy allows it, or vLLM with a small model on a single GPU."
    aws: "Orchestrator on ECS Fargate, Aurora Serverless v2 with pgvector and pg_trgm, on-demand Bedrock models and Bedrock Guardrails."
    azure: "Orchestrator on Container Apps, Azure Database for PostgreSQL with pgvector instead of AI Search, pay-as-you-go Microsoft Foundry models and Content Safety."
    gcp: "Orchestrator on Cloud Run, Cloud SQL or AlloyDB with pgvector instead of Vector Search, Vertex AI models and Model Armor."
    tradeoffs: "PostgreSQL's lexical search is not BM25 and has no built-in semantic reranking; with very large corpora or high concurrency, the database competes with the application."
  - name: "Dedicated search and reranking"
    when: "A large, heterogeneous corpus, many sources, queries full of names and codes, and retrieval quality as the priority."
    cost: 3
    ops: 2
    onprem: "OpenSearch or Elasticsearch with hybrid search, a cross-encoder reranker served with Text Embeddings Inference, and ingestion as Kubernetes jobs."
    aws: "Amazon OpenSearch Service with hybrid search or Bedrock Knowledge Bases, reranking with the Bedrock rerank API and on-demand models."
    azure: "Azure AI Search with hybrid search and the semantic ranker, as in the diagram, plus Foundry models and Content Safety."
    gcp: "Vertex AI Vector Search with dense and sparse hybrid search, as in the diagram, plus the Vertex AI ranking API."
    tradeoffs: "One more system to keep in sync with the source of truth for permissions, and a fixed cost per node or search unit even with no traffic."
  - name: "Own models on GPUs"
    when: "Data sovereignty, your own fine-tuned models or a high, sustained token volume that makes GPUs cheaper than paying per token."
    cost: 4
    ops: 3
    onprem: "Kubernetes with GPU nodes, the NVIDIA GPU Operator, vLLM behind KServe or the vLLM production stack, KEDA and Langfuse in high availability."
    aws: "EKS with GPU nodes managed by Karpenter, ECS on GPU instances or SageMaker AI endpoints; Fargate offers no GPUs."
    azure: "AKS with GPU node pools, or Container Apps serverless GPUs for intermittent load that can scale to zero."
    gcp: "GKE with GPU node pools, or Cloud Run with GPUs for intermittent load that can scale to zero."
    tradeoffs: "You pay for GPUs by the hour whether you use them or not, and you own model upgrades, quality measurement and capacity; open models that fit your hardware do not always match the best API models."
extensions:
  - name: "Semantic cache"
    when: "When many questions repeat in different words (support, internal FAQs) and answers do not depend on the user."
    cost: "low"
    onprem: "Valkey or Redis with vector search"
    aws: "ElastiCache for Valkey"
    azure: "Azure Managed Redis (RediSearch)"
    gcp: "Memorystore for Valkey"
  - name: "Reranking"
    when: "When the top-k returns similar but not the best chunks and you want to send less context to the LLM."
    cost: "low"
    onprem: "Cross-encoder on TEI"
    aws: "Bedrock Rerank"
    azure: "AI Search semantic ranker"
    gcp: "Vertex AI ranking API"
  - name: "Dedicated hybrid search engine"
    when: "When PostgreSQL no longer gives you the latency or lexical quality you need at your volume."
    cost: "high"
    onprem: "OpenSearch"
    aws: "Amazon OpenSearch Service"
    azure: "Azure AI Search"
    gcp: "Vertex AI Vector Search (hybrid)"
  - name: "Provider prompt caching"
    when: "When the system prompt, instructions or a long document repeat across many calls."
    cost: "low"
    onprem: "vLLM prefix caching"
    aws: "Bedrock prompt caching"
    azure: "Prompt caching in Foundry"
    gcp: "Vertex AI context caching"
  - name: "LLM gateway with quotas"
    when: "When several teams or applications share models and you need token quotas, routing and a single logging point."
    cost: "medium"
    onprem: "LiteLLM proxy"
    aws: "LiteLLM on ECS"
    azure: "API Management (AI gateway)"
    gcp: "Apigee"
savings:
  - "Route by difficulty: a small model to classify, rewrite the question or summarise, and the large one only for the final answer; Bedrock offers Intelligent Prompt Routing to do this within a model family."
  - "Turn on provider prompt caching for the system prompt and fixed instructions, and put that stable part at the start of the prompt so it gets reused."
  - "Cut the context: fewer, smaller chunks after a reranker cost fewer input tokens than twenty unordered chunks, and usually give better answers."
  - "Do not pay for a fixed-cost search engine for a small corpus: pgvector in the database you already have, Aurora Serverless v2 or the lowest AI Search tier is enough until your evaluation says otherwise."
  - "Move ingestion enrichment and evaluation runs, which need no immediate answer, to batch inference (Bedrock batch inference, Batch in Foundry, Vertex AI batch inference)."
  - "With your own GPUs, shut down or scale development environments to zero (KEDA, Cloud Run or Container Apps with GPUs), use Spot to compute embeddings in batch, and reserve capacity only for the sustained base load."
---

## When you need it

When a language model has to answer questions about information it does not know: internal policies, manuals, tickets, contracts. Fine-tuning does not solve this well, because the knowledge changes every week and you could not tell where each claim came from. RAG (retrieval-augmented generation) fetches the relevant chunks for each question and hands them to the model as context. The "production" part is everything else: permissions, filters, cost per token and being able to explain why an answer went wrong.

## Scenarios

- **Internal assistant at a mid-sized company.** A few thousand documents in SharePoint or a document management system, dozens of users. All in PostgreSQL: `tsvector` for keyword search with the language's dictionary, `pg_trgm` for names and codes with typos, and pgvector with HNSW for semantic similarity, combined in one query with Reciprocal Rank Fusion and the permission filter in the same `WHERE`. The LLM through a managed API. It is cheap, runs on skills you already have, and the hybrid query already covers much of what a dedicated engine brings.
- **Large knowledge base with many sources.** Millions of chunks, several languages, product references. This is where a dedicated search engine (AI Search, OpenSearch, Vector Search) with real BM25, hybrid search and reranking pays off, in exchange for a fixed cost and syncing permissions from the sources.
- **Public sector or healthcare with data sovereignty.** No data leaves your infrastructure or a given region: an open model served with vLLM on your own GPUs or on managed Kubernetes in that region, embeddings with Text Embeddings Inference and self-hosted guardrails. More operations, and evaluation becomes essential to compare open models.
- **High-traffic support chatbot.** Many questions are the same one in other words. A semantic cache in front of the LLM returns already validated answers when similarity is above a threshold, and provider prompt caching makes the rest cheaper. It only works for answers that do not depend on who is asking.
- **A team new to AI.** Managed ingestion (Bedrock Knowledge Bases, Vertex AI RAG Engine or the AI Search indexer) to move fast, with an evaluation set from day one so you know when to take control of chunking.

## How it fits together

There are two paths. Ingestion runs in the background: source documents land in object storage, and a process converts them to text, splits them into chunks, computes embeddings and stores them in the index with their metadata (source, date, who may see them). In the all-PostgreSQL variant, the same row holds the text, its `tsvector`, the vector and the groups with access.

The query path starts with the user. The orchestrator receives the question and runs it through the input guardrails. If there is a semantic cache, it checks it first. It embeds the question, asks the index for the top-k chunks with hybrid search filtered by the user's permissions, optionally reorders them with a reranker, builds the prompt with that context and calls the LLM. The answer goes back through the output guardrails before it reaches the user. Every step leaves a trace: what was retrieved, what was sent, how many tokens and how long it took.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** Orchestrator, PostgreSQL with pgvector and pg_trgm, Text Embeddings Inference, NeMo Guardrails and Langfuse with its dependencies (PostgreSQL, ClickHouse, Redis and object storage). If the model is your own, vLLM on the same host with the GPU exposed to the container. Volumes for the database, the model cache and Langfuse; Caddy or Traefik in front. Fine for a pilot or a department.

**Kubernetes on-premises.** CloudNativePG for PostgreSQL, the NVIDIA GPU Operator, vLLM with KServe or the vLLM production stack, KEDA to scale the orchestrator and ingestion jobs, cert-manager and the Langfuse Helm chart. Keep GPU nodes apart with taints so nothing else lands on them.

**Cloud without Kubernetes.** Orchestrator on ECS Fargate, Container Apps or Cloud Run, the LLM through a managed API, and ingestion in Lambda, Functions or Cloud Run jobs. If you need your own model on a GPU without a cluster, Cloud Run and Container Apps offer GPUs that scale to zero; on AWS, ECS on GPU instances (Fargate has none) or SageMaker AI.

**Managed Kubernetes.** EKS, AKS or GKE when you serve your own models under sustained load, need several models sharing GPUs or already have the platform.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Compose on one host | Low (high with GPU) | Medium | Manual | Pilot, department |
| Kubernetes on-premises | High | High | KEDA, fixed GPU nodes | Sovereignty, sustained volume |
| PaaS + managed API | Near zero | Low | Automatic | Default in the cloud |
| EKS / AKS / GKE with GPUs | High | High | GPU nodes + KEDA | Own models at scale |

## Key decisions

- **Managed LLM or your own model in a GPU container.** Bedrock, Microsoft Foundry and Vertex AI give API access to models from several providers (Anthropic's Claude is available on all three) and bill per token, with no idle cost. An open model on vLLM makes sense for sovereignty or high, sustained volume; you pay for GPUs by the hour and run the platform.
- **All in PostgreSQL or a dedicated search engine.** PostgreSQL joins text, vectors, permissions and metadata in one transactional query. A dedicated engine scales better with huge corpora and ships BM25 and reranking built in, but it is one more system with a fixed cost.
- **Own or managed ingestion.** Bedrock Knowledge Bases or Vertex AI RAG Engine save you chunking and embedding, but you lose control over how each document is split, which is where most quality is won or lost.
- **Provider guardrails and business guardrails.** Managed services cover the generic cases; rules like "never quote prices" or "never cite drafts" are your own code and tests.

## Common pitfalls

- Filtering permissions after retrieval rather than in the query itself: the top-k fills up with chunks you then discard or, worse, do not. With pgvector, enable iterative index scans (from version 0.8) so the filter does not leave the result short.
- Treating retrieved content as trusted. A document can carry instructions (indirect injection), and the guardrail has to inspect the context too.
- Changing the embedding model without re-indexing, or mixing vectors from two models in one index.
- Caching answers that depend on the user's permissions in a shared semantic cache.
- Touching the prompt, model or chunk size without a set of questions with expected answers: without it you cannot tell whether you are improving or regressing.
