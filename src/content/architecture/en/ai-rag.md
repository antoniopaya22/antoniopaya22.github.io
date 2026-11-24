---
title: "Production AI with RAG"
short: "AI with RAG"
summary: "An assistant that answers from the organisation's own documents, respects each user's permissions, filters what goes in and out, and leaves traces that explain every answer."
description: "Production RAG with orchestrator, guardrails, LLM, vector search and evaluation: a reference architecture on AWS, Azure, GCP and on-premises."
order: 5
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
    summary: "An orchestrator on Cloud Run retrieves from Vertex AI Vector Search, calls Vertex AI models (Gemini, Claude or open models) and sanitises prompt and response with Model Armor."
    notes:
      - "Model Armor is model-agnostic: it exposes one API to sanitise prompts and another for responses, with filters for injection, sensitive data and malicious URLs."
      - "Vector Search bills per deployed node even with no queries; for small corpora, AlloyDB or Cloud SQL with pgvector, or Vertex AI RAG Engine, are cheaper to start with."
      - "Cloud Run jobs suit batch ingestion: re-indexing the corpus is one job with parallel tasks, not one invocation per document."
      - "Cloud Trace stores OpenTelemetry traces; to measure quality use the Vertex AI Gen AI evaluation service or Langfuse."
---

## When you need it

When a language model has to answer questions about information it does not know: internal policies, manuals, tickets, contracts. Fine-tuning does not solve this well, because the knowledge changes every week and you could not tell where each claim came from. RAG (retrieval-augmented generation) fetches the relevant chunks for each question and hands them to the model as context. The "production" part is everything else: permissions, filters, cost per token and being able to explain why an answer went wrong.

## How it fits together

There are two paths. Ingestion runs in the background: source documents land in object storage, and a process converts them to text, splits them into chunks, computes embeddings and stores them in the vector index with their metadata (source, date, who may see them).

The query path starts with the user. The orchestrator receives the question and runs it through the input guardrails. It embeds the question, asks the index for the top-k chunks filtered by the user's permissions, builds the prompt with that context and calls the LLM. The answer goes back through the output guardrails before it reaches the user. Every step leaves a trace: what was retrieved, what was sent, how many tokens and how long it took.

## Key decisions

- **Managed or self-hosted LLM.** Bedrock, Microsoft Foundry and Vertex AI give API access to models from several providers (Anthropic's Claude is available on all three) and bill per token. Self-hosting an open model with vLLM makes sense for data sovereignty or high, sustained volume; in exchange you pay for GPUs by the hour and run the platform.
- **Vectors in your database or a dedicated engine.** pgvector joins vectors, permissions and metadata in a single query. A dedicated engine scales better with huge corpora and usually brings hybrid search, but it is one more system and almost always has a fixed cost.
- **Own or managed ingestion.** Bedrock Knowledge Bases or Vertex AI RAG Engine save you chunking and embedding, but you lose control over how each document is split, which is where most quality is won or lost.
- **Provider guardrails and business guardrails.** Managed services cover the generic cases; rules like "never quote prices" or "never cite drafts" are your own code and tests.

## Common pitfalls

- Filtering permissions after retrieval rather than in the query itself: the top-k fills up with chunks you then discard or, worse, do not.
- Treating retrieved content as trusted. A document can carry instructions (indirect injection), and the guardrail has to inspect the context too.
- Changing the embedding model without re-indexing, or mixing vectors from two models in one index.
- Touching the prompt, model or chunk size without a set of questions with expected answers: without it you cannot tell whether you are improving or regressing.
- Stuffing in twenty chunks "just in case": more cost, more latency and often worse answers.
