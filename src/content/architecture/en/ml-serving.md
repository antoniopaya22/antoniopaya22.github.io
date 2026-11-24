---
title: "Training and serving ML models"
short: "ML in production"
summary: "Take a machine learning model from the notebook to production: consistent features between training and serving, reproducible GPU training, a registry with approval, an online endpoint, batch inference and retraining when the data drifts."
description: "MLOps with feature store, GPU training pipeline, model registry, online endpoint, batch inference and drift checks on AWS, Azure, GCP and on-premises."
order: 13
requirements:
  - "Features are computed the same way for training and serving, without implementing them twice."
  - "Every model is reproducible: code, data, parameters and metrics are recorded."
  - "No model reaches production without passing evaluation and an explicit approval in the registry."
  - "The online endpoint rolls out new versions without downtime and can roll back."
  - "Data and quality drift are measured in production and trigger retraining."
  - "GPUs are only paid for while they are in use."
platforms:
  onprem:
    summary: "Feast serves features, Kubeflow Pipelines trains on GPU nodes, MLflow registers models, KServe serves online, Kubernetes Jobs run batch inference and Evidently measures drift."
    notes:
      - "The NVIDIA GPU Operator installs drivers, runtime and the device plugin; without it every OS upgrade breaks the GPU nodes."
      - "Feast needs an online store (Redis or PostgreSQL) and an offline store (Parquet in the lake, Trino or a warehouse); materialising between them is a scheduled job."
      - "In MLflow use aliases (`champion`, `challenger`) instead of the old stages; KServe deploys whatever the alias points to and supports percentage-based canaries."
      - "Kueue shares GPUs between teams with queues and quotas; without queues, whoever launches a big job first blocks everyone else."
      - "The cost is fixed: purchased GPUs depreciate whether busy or idle. Measure utilisation before buying more."
  aws:
    summary: "SageMaker AI covers the lifecycle: Feature Store, Pipelines to train on GPU instances, Model Registry with approval, real-time endpoints and Model Monitor; batch inference runs on AWS Batch with GPUs."
    notes:
      - "Since December 2024 the classic ML service is called Amazon SageMaker AI; 'Amazon SageMaker' is now the unified data and AI platform that includes it."
      - "Model Monitor needs data capture enabled on the endpoint and a baseline computed from the training data; measuring model quality also needs ground-truth labels that arrive later."
      - "For batch, SageMaker Batch Transform avoids managing containers; AWS Batch with GPUs pays off when you already have the inference image and want Spot instances and your own queues."
      - "Real-time endpoints bill per instance hour even with no traffic; Serverless Inference (CPU only) or Asynchronous Inference with scale to zero suit sporadic traffic."
      - "Managed Spot Training cuts training cost if your code writes checkpoints and tolerates interruptions."
  azure:
    summary: "Azure Machine Learning provides a managed feature store, pipelines on GPU clusters, registries shared across workspaces, managed online endpoints, batch endpoints and model monitoring."
    notes:
      - "Microsoft Foundry (formerly Azure AI Foundry) is the platform for generative AI and agents; custom model training and classic MLOps stay in Azure Machine Learning."
      - "Azure ML registries hold models, environments and components for several workspaces: train in the dev workspace and deploy to production from the same registry."
      - "A managed online endpoint supports several deployments with traffic split and mirrored traffic, so canaries and shadow tests need no extra infrastructure."
      - "GPUs need quota per VM family and region; request it before the project starts, not on the day of the first training run."
      - "Compute clusters scale to zero nodes when idle; notebook compute instances don't unless you enable idle shutdown."
  gcp:
    summary: "Vertex AI, part of Gemini Enterprise Agent Platform since April 2026, provides Feature Store, Pipelines, Model Registry, online endpoints, batch inference and Model Monitoring."
    notes:
      - "The documentation already uses the new names (Agent Platform Pipelines, Model Registry, Feature Store); APIs, SDKs and existing resources keep working."
      - "Feature Store uses BigQuery as the offline store and serves online from a dedicated store; the Legacy version is deprecated and should not be used for new projects."
      - "Pipelines runs Kubeflow Pipelines (KFP) definitions, so what you build on-premises ports over with few changes."
      - "Online endpoints bill per deployed node while active; batch inference only while the job runs."
      - "Custom training supports Spot VMs and GPU reservations; without a reservation, availability of some GPUs in a region is not guaranteed."
tiers:
  - name: "One model, batch"
    when: "One data scientist, one model and predictions that can be computed nightly."
    cost: 1
    ops: 1
    onprem: "One GPU host with Docker Compose: MLflow with PostgreSQL and MinIO, a training container started from cron and a batch job that writes predictions to the database."
    aws: "A scheduled SageMaker AI training job, registration in Model Registry and Batch Transform writing results to S3."
    azure: "A scheduled Azure ML pipeline on a cluster that scales to zero and a batch endpoint."
    gcp: "A scheduled pipeline, Model Registry and batch inference writing to BigQuery."
    tradeoffs: "No online endpoint and no feature store: no real-time decisions, and features are recomputed in every pipeline."
  - name: "Full MLOps"
    when: "Several models, some online with low latency, and a team that deploys every week."
    cost: 2
    ops: 2
    onprem: "Kubernetes with the GPU Operator, Kubeflow Pipelines, Feast with Redis, MLflow, KServe and Evidently, as in the diagram."
    aws: "The diagram as drawn: Feature Store, Pipelines, Model Registry, autoscaled endpoint, Batch with GPUs and Model Monitor."
    azure: "The diagram as drawn with managed feature store, shared registry, managed online endpoint with canary and monitoring."
    gcp: "The diagram as drawn: Feature Store on BigQuery, Pipelines, Model Registry, endpoint, batch and Model Monitoring."
    tradeoffs: "The online endpoint and the online feature store are fixed costs; someone has to own the platform."
  - name: "Multi-team ML platform"
    when: "Dozens of models, several teams sharing GPUs and model audit requirements."
    cost: 4
    ops: 3
    onprem: "A GPU cluster with Kueue and MIG, namespaces per team, a central MLflow with permissions and KServe with ModelMesh for many small models."
    aws: "Accounts per environment, a central registry shared across accounts, multi-model endpoints and SageMaker AI Savings Plans."
    azure: "Workspaces per team with a common registry, per-team quotas and clusters, and privately networked endpoints."
    gcp: "Projects per team, a central Model Registry, GPU reservations and private endpoints."
    tradeoffs: "High cost and governance; the value is in reusing features and stopping every team from reinventing its pipeline."
extensions:
  - name: "Experiment tracking"
    when: "When you need to compare hundreds of runs and know what produced each metric."
    cost: "low"
    onprem: "MLflow Tracking"
    aws: "Managed MLflow in SageMaker AI"
    azure: "Azure ML (MLflow-compatible)"
    gcp: "Vertex AI Experiments"
  - name: "GPU queues and Spot"
    when: "When several teams compete for GPUs or training is long and tolerates interruptions."
    cost: "low"
    onprem: "Kueue + MIG"
    aws: "Managed Spot Training"
    azure: "Low-priority VMs in clusters"
    gcp: "Spot VMs for training"
  - name: "Canary or shadow deployment"
    when: "When a new model could hurt the business even though it improves offline metrics."
    cost: "medium"
    onprem: "KServe canary"
    aws: "SageMaker AI shadow tests"
    azure: "Mirrored traffic on endpoints"
    gcp: "Endpoint traffic split"
  - name: "Explainability and bias"
    when: "When the model makes decisions about people (credit, hiring, health) and you must justify them."
    cost: "low"
    onprem: "SHAP + Evidently"
    aws: "SageMaker Clarify"
    azure: "Responsible AI dashboard"
    gcp: "Vertex Explainable AI"
  - name: "Many small models"
    when: "When there is one model per customer or store and one endpoint per model isn't viable."
    cost: "medium"
    onprem: "KServe ModelMesh"
    aws: "Multi-model endpoints"
    azure: "Several deployments per endpoint"
    gcp: "Shared deployment resource pool"
savings:
  - "Train on Spot or low-priority capacity (Managed Spot Training, low-priority VMs, Spot VMs), writing checkpoints so jobs resume after an interruption."
  - "If the decision isn't real-time, use batch inference: you only pay while the job runs instead of for an endpoint that is up 24 hours a day."
  - "Serve small models on CPU (including ARM/Graviton) and keep GPUs for models that really need them; measure latency before deciding."
  - "Enable idle shutdown on notebooks and compute instances: they are often the biggest hidden cost of a data science team."
  - "Autoscale the endpoint on invocations and drop it to its minimum out of hours if traffic allows."
  - "With steady usage, SageMaker AI Savings Plans, Azure reservations or Google committed-use discounts lower the cost of training and serving compute."
---

## When you need it

When a model stops being an experiment and other systems depend on its predictions: a risk score on every order, a nightly demand forecast, recommendations on the website. From then on, questions appear that a notebook can't answer: what data trained the version in production, who approved the change, why today's predictions are worse than last month's and how to roll back to the previous version in five minutes.

You don't need this if the model is retrained twice a year and used in a report. You do when there are several models, frequent deployments or automated decisions about customers.

## Scenarios

- **Startup with a scoring model.** Batch first: scheduled training, a registry with manual approval and predictions computed nightly into a table. The online endpoint comes when the product needs the prediction at request time.
- **Regulated bank or insurer.** The model registry is the audit trail: every version with its dataset, metrics, bias report and signed-off approval. Explainability is mandatory and shadow deployment comes before anything touches customers. Everything in an EU region with private endpoints.
- **Retailer with campaign peaks.** The endpoint scales on invocations; the demand forecast is retrained more often in season because patterns change. Drift is checked daily.
- **Customer that requires on-premises.** Kubeflow, MLflow, Feast and KServe on Kubernetes with your own GPUs. The bottleneck is not the software but getting and sharing the GPUs.
- **Many small models.** One model per store or per customer: multi-model endpoints or ModelMesh and parameterised pipelines, not one pipeline per model.

## How it fits together

Training data comes from object storage or the lakehouse. Features that are also used at serving time (a customer's average order value over 30 days, orders this month) are defined once in the feature store: its offline store provides point-in-time correct history for training, and its online store gives the endpoint the latest value with low latency.

The training pipeline reads data and features, trains on GPU instances, evaluates against a fixed test set and against the current model, and if it improves, registers the new version with its metrics and lineage. The registry is the boundary: a version reaches production only when someone (or an automated rule) approves it.

**Promotion** deploys the approved version to the online endpoint, ideally first with a slice of traffic. The same registered model feeds **batch inference**, which scores millions of rows in one go and writes the results where other systems read them.

The endpoint logs inputs and outputs. Monitoring compares their distribution with the training data (data drift) and, once real labels arrive, measures quality. If thresholds are crossed it triggers the **retraining** pipeline and the cycle starts again.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on a GPU host.** For a team of one or two: MLflow with PostgreSQL and MinIO for artefacts, a training container with the NVIDIA Container Toolkit, an inference server (BentoML, FastAPI or Triton) behind Caddy, and Evidently producing reports from the prediction logs. Back up PostgreSQL and the artefact bucket; without them the registry is worthless.

**On-premises Kubernetes (k3s or RKE2).** NVIDIA GPU Operator, Kubeflow Pipelines or Argo Workflows, Kueue for GPU queues, KServe with Knative to scale rarely used models to zero, Feast with Redis, CloudNativePG for MLflow and cert-manager for TLS. The option with the most moving parts; justify it with several teams or sovereignty requirements.

**Cloud without Kubernetes.** SageMaker AI, Azure Machine Learning or Vertex AI: managed compute for training, a registry and endpoints with no cluster of your own. The default in the cloud. A small CPU model can also be served on Cloud Run, Container Apps or Lambda using the image built from the registry.

**Managed Kubernetes (EKS, AKS, GKE).** Worth it if you want the same stack (Kubeflow, KServe) in the cloud and on-premises, or if you serve many models and the per-endpoint cost of the managed service climbs.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose with GPU | Low | Medium | One host | Small team, prototype |
| On-prem Kubernetes | High (GPUs) | High | By GPU nodes | Sovereignty, own GPUs |
| Managed ML platform | Per use | Low | Automatic | Default choice |
| Managed Kubernetes | Medium | Medium | Horizontal | Portability, many models |

## Key decisions

- **Online or batch.** Batch is cheaper, simpler to monitor and tolerates failures; go online only when the prediction depends on request-time data.
- **Feature store or not.** With one model and simple features, a well-versioned table is enough. When several features are used both online and in training, a feature store prevents skew between them, which is the most common reason models work in testing and fail in production.
- **Managed platform or open stack.** Managed reduces operations and gives on-demand GPUs; the open stack (Kubeflow, MLflow, KServe) is portable and avoids depending on product names that change, as the SageMaker AI and Vertex AI renames show.
- **Human or automated approval.** Automated for low-risk models with good guard metrics; human, with evidence in the registry, when the model decides about people.

## Common pitfalls

- Computing features one way in the notebook and another way in the online service.
- Evaluating on data that overlaps in time with training and overestimating quality.
- Deploying straight from the pipeline without going through the registry or keeping a previous version to roll back to.
- Monitoring latency and errors but not the input distribution or prediction quality.
- Leaving GPU endpoints and notebooks running for weeks with no use.
- Retraining automatically on corrupted data and promoting the resulting model without evaluation.
