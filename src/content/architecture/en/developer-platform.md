---
title: "Internal developer platform"
short: "Developer platform"
summary: "A portal with a service catalogue and golden-path templates, approved IaC modules, ephemeral environments per pull request that clean themselves up, and cost attributed to each team."
description: "Backstage, golden-path templates, approved IaC modules, per-PR environments with TTL and cost per team: architecture on AWS, Azure, GCP and on-premises."
order: 32
requirements:
  - "Creating a new service with CI, observability and deployment working takes minutes and needs no tickets."
  - "All infrastructure comes from versioned, reviewed modules; nobody copies and pastes Terraform from another repository."
  - "Every pull request can get its own preview environment with its own URL, isolated from production."
  - "No ephemeral environment outlives its PR or its maximum time to live."
  - "Every resource carries team and service tags and its cost shows up in that team's report."
  - "The catalogue says who owns each service, what it depends on and whether it meets the organisation's baseline."
platforms:
  onprem:
    summary: "Backstage with GitLab or GitHub Enterprise, OpenTofu modules in an internal registry, GitLab CI and Argo CD, per-PR environments in namespaces or vCluster, OpenCost for cost and TTL-based clean-up."
    notes:
      - "The pull request generator in Argo CD ApplicationSets creates an application per open PR and deletes it when the PR closes: that is the main clean-up; the TTL covers whatever slips through."
      - "kube-janitor deletes resources carrying the `janitor/ttl` annotation, but the original project (hjacobs, on Codeberg) has had no commits since July 2023; webdevops published an active reimplementation in December 2025. Check which one you run."
      - "A namespace per PR is enough if the application installs no CRDs or cluster-scoped resources; if it does, vCluster gives each PR a virtual control plane inside the same cluster."
      - "OpenCost splits node cost by namespace, label and deployment; on-premises you have to feed it your own CPU, memory and disk prices."
      - "OpenTofu is the MPL-licensed fork of Terraform and reads the same modules; pick one and pin the version in the template."
  aws:
    summary: "Backstage on ECS Fargate, GitHub Actions with OIDC into AWS, Terraform modules in a private registry, one ECS service per PR behind a shared ALB, cost allocation tags and EventBridge Scheduler for the TTL."
    notes:
      - "AWS Proton stopped accepting new customers on 7 October 2025 and reached end of support on 7 October 2026: AWS has no first-party platform portal. AWS Service Catalog is still available for publishing approved products."
      - "A shared ALB with one rule per `Host` header (`pr-123.preview.example.com`) avoids paying for a load balancer per PR; rules per listener have a quota, so watch it if many PRs are open."
      - "EventBridge Scheduler supports one-time schedules that delete themselves after running: create one at deploy time with the expiry date and have it invoke the clean-up."
      - "Cost allocation tags must be activated in Billing; to split an ECS or EKS cluster across teams, turn on split cost allocation data."
      - "GitHub Actions signs in to AWS through an OIDC-federated role, restricted by repository and branch in the trust policy; no long-lived keys."
  azure:
    summary: "Backstage on Container Apps, GitHub Actions with federated identity, approved Terraform modules, labelled Container Apps revisions per PR, Cost Management by tag and a timer-triggered Function for the TTL."
    notes:
      - "Azure Deployment Environments is in maintenance mode and retires on 22 February 2027 (announced in October 2026) with no successor: don't build your platform on it."
      - "In multiple revision mode, each PR deploys a revision labelled `pr-123` and gets a stable URL without receiving production traffic. There is also a deployment labels mode in preview."
      - "Revisions share application-scoped configuration (secrets, ingress, Dapr): if a PR changes secrets or needs real isolation, create one Container App per PR in a shared environment."
      - "Inactive revisions are not billed and Container Apps keeps up to 100 of them; the timer Function removes expired labels and deactivates their revisions."
      - "Cost Management groups by tag and can inherit tags from the subscription and resource group, which fills in resources teams forget to tag."
  gcp:
    summary: "Backstage on Cloud Run, Cloud Build with PR triggers, approved Terraform modules, tagged Cloud Run revisions per PR, billing export with labels and Cloud Scheduler for the TTL."
    notes:
      - "`gcloud run deploy --no-traffic --tag pr-123` creates a revision with its own URL, whose subdomain starts with the tag name, that receives no production traffic."
      - "Tagged revisions don't get the service's minimum instances, so they scale to zero; remove expired tags so you don't pile up reachable revisions."
      - "Application Design Center (GA in December 2025) offers a governed catalogue of Terraform templates connected to App Hub; it is not a managed Backstage, but it covers part of the approved-templates story."
      - "To see cost per team, export billing to BigQuery: resource labels arrive as columns you can query or chart."
      - "If your code lives on GitHub, GitHub Actions with Workload Identity Federation is just as valid as Cloud Build; pick one for the whole organisation."
tiers:
  - name: "Templates and catalogue"
    when: "Five to fifteen teams that want to stop copying repositories and know who owns each service."
    cost: 1
    ops: 1
    onprem: "Backstage with catalogue and templates in one container with PostgreSQL, OpenTofu modules tagged in Git and your existing CI."
    aws: "Backstage on a Fargate task with a small RDS PostgreSQL, templates that create the repository with its GitHub Actions workflow."
    azure: "Backstage on Container Apps with Burstable PostgreSQL Flexible Server, templates that create repository, pipeline and federated identity."
    gcp: "Backstage on Cloud Run with a small Cloud SQL, templates that create the repository and a Cloud Build trigger."
    tradeoffs: "No per-PR environments: integration testing still happens on a shared staging that becomes the bottleneck."
  - name: "Ephemeral environments per PR"
    when: "Teams that review changes in a real environment before merging and a product team that wants to try every branch."
    cost: 2
    ops: 2
    onprem: "Argo CD with an ApplicationSet per PR, a namespace per PR with quotas, a seeded database per PR and TTL clean-up."
    aws: "An ECS service per PR on Fargate Spot behind a shared ALB, a shared preview database with one schema per PR and EventBridge Scheduler."
    azure: "A labelled revision or a Container App per PR in a shared environment, a schema per PR and a timer Function."
    gcp: "A tagged Cloud Run revision per PR, a schema per PR in Cloud SQL and Cloud Scheduler removing expired tags."
    tradeoffs: "Every PR consumes resources and test data has to be maintained; without a TTL the bill grows quietly."
  - name: "Platform at scale"
    when: "Dozens of teams, several clusters or accounts and a dedicated platform team with its own roadmap."
    cost: 3
    ops: 3
    onprem: "Backstage with scorecards, vCluster per PR, policy as code on modules, OpenCost with internal prices and several clusters managed by Argo CD."
    aws: "Backstage on EKS or ECS, accounts per team in Organizations, modules checked with Conftest and SCPs, cost reports per team and per-PR environments."
    azure: "Backstage on AKS or Container Apps, subscriptions per team, Azure Policy, Cost Management by tag and per-PR environments."
    gcp: "Backstage on GKE or Cloud Run, projects per team, Organization Policy, billing export to BigQuery and per-PR environments."
    tradeoffs: "Backstage is a product to maintain (monthly upgrades, plugins, migrations): without a dedicated team, it decays."
extensions:
  - name: "Maturity scorecards"
    when: "When you want to measure which services meet the baseline (owner, alerts, SBOM, supported runtime)."
    cost: "low"
    onprem: "Backstage Tech Insights"
    aws: "Tech Insights + Security Hub"
    azure: "Tech Insights + Defender for Cloud"
    gcp: "Tech Insights + Security Command Center"
  - name: "Policy as code on IaC"
    when: "When approved modules are not enough and forbidden configurations must be blocked in any plan."
    cost: "low"
    onprem: "OPA and Conftest"
    aws: "Conftest + SCPs"
    azure: "Conftest + Azure Policy"
    gcp: "Conftest + Organization Policy"
  - name: "Database per PR"
    when: "When a PR's migrations break the shared preview schema."
    cost: "medium"
    onprem: "CloudNativePG per namespace"
    aws: "Aurora fast cloning"
    azure: "PITR restore of Flexible Server"
    gcp: "Cloud SQL clone"
  - name: "Secrets for ephemeral environments"
    when: "Whenever the PR environment needs credentials: they must be its own and expire with it."
    cost: "low"
    onprem: "OpenBao + External Secrets"
    aws: "Secrets Manager"
    azure: "Key Vault"
    gcp: "Secret Manager"
  - name: "Managed portal"
    when: "When you want the catalogue and templates without running Backstage yourself."
    cost: "medium"
    onprem: "Red Hat Developer Hub"
    aws: "Roadie or Spotify Portal (SaaS)"
    azure: "Roadie or Spotify Portal (SaaS)"
    gcp: "Application Design Center"
savings:
  - "Delete the environment when the PR closes, from the pipeline itself, and keep the TTL as a safety net: most orphaned environments come from abandoned PRs, not closed ones."
  - "Share the expensive infrastructure across all PRs: one ALB, one Container Apps environment or one cluster with a namespace per PR, never a load balancer or cluster per branch."
  - "Run PR environments on Fargate Spot or scale them to zero (tagged Cloud Run revisions, Container Apps with a minimum of zero): almost nobody uses them outside review hours."
  - "Use a schema per PR in a shared preview database rather than an instance per PR; keep clones for PRs that change migrations."
  - "Make `team`, `service` and `pr` tags mandatory in the approved modules and reject plans without them in CI: what isn't tagged can't be attributed or cleaned up."
  - "Use ARM or Spot CI runners and cache dependencies and images: with many PRs, CI minutes weigh as much as the environments."
---

## When you need it

When the number of teams grows faster than the operations team's ability to work through tickets. The symptoms are familiar: every new service copies another repository along with its mistakes, nobody knows who owns the service failing at three in the morning, staging is always broken because ten teams share it, and the cloud bill grows without anyone being able to attribute it. An internal platform turns good practice into the easiest path: templates that already bring CI, observability and deployment, reviewed infrastructure modules and environments that appear and disappear with every PR.

If you have three teams and one product, a template repository and a good README give you 80% of the value: don't set up Backstage yet.

## Scenarios

### Scale-up going from 3 to 15 teams

The problem is divergence: every team deploys its own way. Start with the catalogue (a `catalog-info.yaml` in every repository with owner and system) and two or three golden-path templates for the most common service types. Per-PR environments come later, once staging becomes the bottleneck.

### Regulated company

What matters is that nobody can create infrastructure outside the approved modules. Modules bring encryption, logging and tags by default; CI runs policy as code on every plan and blocks anything non-compliant; ephemeral environments use synthetic data, never copies of production. The catalogue also serves as an inventory for audits.

### Many teams and expensive PR environments

When every PR spins up half a dozen services and a database, cost takes off. Share everything you can (one load balancer, one cluster, one database instance with schemas per PR), scale to zero out of hours and apply short TTLs. Measure preview cost per team so it is visible.

### On-premises organisation with Kubernetes

Argo CD with the PR generator, a namespace per PR with quotas and network policies, vCluster when the application installs its own operators, OpenCost with internal prices and TTL-based clean-up as a safety net.

## How it fits together

A developer opens the portal and picks a template. The Backstage Software Template asks for a few parameters, generates code from a skeleton, creates the repository on GitHub or GitLab with the pipeline already configured and registers the component in the catalogue with its owner. From there, the developer works in Git as usual.

Every push triggers CI, which builds, tests and applies infrastructure using only the approved IaC modules, versioned and referenced by tag. When a PR is opened, CI also deploys an ephemeral environment: a namespace or vCluster, an ECS service, a labelled Container Apps revision or a tagged Cloud Run revision, with its own URL posted as a comment on the PR. The environment carries team, service and PR-number tags.

Two processes close the loop. Cost: tags carry each resource into its team's report (OpenCost, Cost Explorer, Cost Management or the BigQuery export), and that figure can be shown on the service page in Backstage. Clean-up: when the PR closes, CI destroys the environment; if that fails or the PR is abandoned, a scheduled process deletes everything past its TTL.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** Backstage is a Node.js application with PostgreSQL: one Backstage container, PostgreSQL with a volume and backups, and a reverse proxy with TLS and OIDC single sign-on. Enough for catalogue and templates in a mid-sized organisation; per-PR environments don't fit here.

**Kubernetes on-premises.** Backstage with its Helm chart, PostgreSQL with CloudNativePG, Argo CD with ApplicationSets for per-PR environments, vCluster when cluster-level isolation is needed, cert-manager and ExternalDNS for preview URLs, OpenCost and TTL clean-up.

**Cloud without Kubernetes.** Backstage on Fargate, Container Apps or Cloud Run with managed PostgreSQL; per-PR environments as ECS services, tagged or labelled revisions, or separate Container Apps; clean-up with EventBridge Scheduler, a timer Function or Cloud Scheduler. The cheapest option if your services already run as containers without Kubernetes.

**Managed Kubernetes.** EKS, AKS or GKE pay off if your services already run on Kubernetes: per-PR environments look like production, Argo CD and vCluster behave as on-premises and OpenCost splits the cluster cost.

| Option | Fixed cost | Operations | Per-PR environments | When |
|---|---|---|---|---|
| Docker Compose | One host | Low | No | Catalogue and templates only |
| Kubernetes on-premises | Your own cluster | High | Namespaces and vCluster | On-premises platform |
| Container PaaS | Low, scales to zero | Low | Services or revisions | Services on PaaS |
| EKS, AKS, GKE | Managed cluster | Medium-high | Namespaces and vCluster | Services already on Kubernetes |

## Key decisions

- **Self-hosted Backstage or a managed portal.** None of the big cloud providers offers managed Backstage: AWS Proton ended in October 2026 and Azure Deployment Environments retires in February 2027. The managed options are SaaS such as Roadie or Spotify Portal; the supported self-hosted one is Red Hat Developer Hub.
- **Namespace or vCluster per PR.** A namespace is cheap and fast; vCluster isolates CRDs and cluster-scoped resources at the cost of a control plane per PR.
- **Tagged revision or service per PR.** Container Apps labels and Cloud Run tags are the cheapest, but they share configuration with the service; a service per PR isolates secrets and scaling.
- **Preview data.** A schema per PR on synthetic data covers almost everything; database clones only for PRs that touch migrations.
- **Living templates, not photocopies.** If a template only generates code once, services diverge the next day: complement it with versioned modules and scorecards that detect drift.

## Common pitfalls

- Setting up Backstage with forty plugins before the catalogue is complete and has real owners.
- Templates nobody maintains: the golden path is stuck on an unsupported runtime version.
- PR environments with no TTL and no tag: they show up on the bill months later and nobody knows whose they are.
- Copying production data into ephemeral environments.
- Giving CI admin permissions on the account instead of a role per repository and environment.
- Measuring success by plugins installed rather than by how long a team takes to put a new service into production.
