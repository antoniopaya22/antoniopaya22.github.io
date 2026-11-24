---
title: "Microservices on Kubernetes"
short: "Microservices on K8s"
summary: "Several services deployed and scaled independently on a managed cluster: an ingress gateway, mTLS between services through a service mesh, one database per service, secrets kept outside the cluster and deployments driven from Git."
description: "Microservices on Kubernetes: ingress gateway, HPA, mesh mTLS, database per service, external secrets and GitOps on AWS, Azure, GCP and on-premises."
order: 3
requirements:
  - "Each service is deployed, scaled and rolled back without touching the others."
  - "Service-to-service traffic is encrypted and authenticated by workload identity, not by IP."
  - "No service reads another service's database: each one owns its data."
  - "Secrets live in an external manager, never in the repository or the manifests."
  - "Cluster state is described in Git, and any manual change is detected and reverted."
  - "Images come from a private registry, scanned and with immutable versions."
platforms:
  onprem:
    summary: "RKE2 with Cluster API for cluster lifecycle, Envoy Gateway at the edge, Linkerd or Istio for mTLS, PostgreSQL with Patroni per service, External Secrets Operator backed by OpenBao, Harbor as the registry and Argo CD for GitOps."
    notes:
      - "Cluster API treats clusters as declarative resources: creating, upgrading or replacing nodes becomes a change in Git rather than a runbook."
      - "Linkerd is lighter and easier to run than Istio, but the open source project only publishes edge releases; stable releases are distributed by Buoyant. Istio in ambient mode avoids a sidecar per pod."
      - "ESO syncs secrets from OpenBao into Kubernetes `Secret`s; encrypt etcd at rest, because the `Secret` still exists inside the cluster."
      - "Harbor adds vulnerability scanning, signing and cross-site replication; without it, the registry is a single point of failure for every deployment."
      - "The cost is people: upgrading Kubernetes, the mesh and the operators every few months, plus spare capacity for peaks and rolling upgrades."
  aws:
    summary: "Amazon EKS with the AWS Load Balancer Controller provisioning an ALB, Istio in ambient mode for mTLS, Aurora PostgreSQL per service, External Secrets Operator backed by Secrets Manager, Amazon ECR and Argo CD."
    notes:
      - "AWS App Mesh reached end of support on 30 September 2026, which is why the mesh is self-managed Istio. The AWS-native alternative for service-to-service traffic is Amazon VPC Lattice."
      - "The Load Balancer Controller creates ALBs from `Ingress` or, with support generally available since 2026, from the Gateway API (`HTTPRoute`, `GRPCRoute`)."
      - "Use EKS Pod Identity or IRSA so that ESO and each service get their own IAM role; never static credentials in the cluster."
      - "Argo CD can be self-managed or the managed EKS capability (EKS Capabilities), which runs outside your nodes and is billed hourly while enabled."
      - "You pay an hourly fee per cluster, the nodes (EC2 or Fargate), ALBs per hour and usage, and each Aurora instance: one database per service multiplies that last term."
  azure:
    summary: "AKS with Application Gateway for Containers at the edge, the AKS Istio add-on for mTLS, Azure Database for PostgreSQL per service, Key Vault mounted through the CSI driver, Azure Container Registry and Flux as the GitOps extension."
    notes:
      - "Application Gateway for Containers is the successor to AGIC (generally available since 2024) and supports both `Ingress` and the Gateway API."
      - "The AKS Istio add-on is sidecar-only (no ambient), single-cluster and does not upgrade itself: move it to a new revision before it blocks the cluster upgrade."
      - "The `microsoft.flux` extension is free on AKS and can be enforced at scale with Azure Policy; Argo CD works too, but you run it."
      - "The Key Vault CSI driver mounts secrets as files using Workload Identity; syncing them into Kubernetes `Secret`s is optional and widens the exposure."
      - "The control plane has a Free tier with no SLA and a Standard tier with one; the rest of the bill is nodes, AGC per hour and usage, and each PostgreSQL server."
  gcp:
    summary: "GKE Autopilot with GKE Gateway at the edge, Cloud Service Mesh for mTLS, Cloud SQL for PostgreSQL per service, the Secret Manager add-on (CSI), Artifact Registry and Config Sync for GitOps."
    notes:
      - "Autopilot manages the nodes and bills for the resources pods request: badly sized `requests` go straight to the invoice."
      - "Cloud Service Mesh provides a managed control plane and uses the Istio APIs on GKE, so policies are written exactly as in Istio."
      - "Config Sync has been part of standard GKE since October 2025 (it used to require GKE Enterprise) and syncs from Git, OCI images or Helm charts."
      - "The Secret Manager add-on mounts secrets through the CSI driver and Workload Identity; it does not sync into Kubernetes `Secret`s, so apps read files, but exposure is lower."
      - "You pay for cluster management, pod resources on Autopilot, the Gateway load balancer and each Cloud SQL instance."
tiers:
  - name: "Starter cluster"
    when: "A small team with a handful of services that wants the Kubernetes model without running a mesh yet."
    cost: 2
    ops: 2
    onprem: "k3s on three nodes, Traefik or Envoy Gateway at the edge, NetworkPolicies instead of a mesh, and one CloudNativePG PostgreSQL with a logical database per service."
    aws: "EKS with Auto Mode or one managed node group, a shared ALB, one Aurora instance with a database per service, and ESO backed by Secrets Manager."
    azure: "AKS on the Free or Standard tier with one node pool, AGC, one PostgreSQL flexible server with several databases, and Key Vault through CSI."
    gcp: "One GKE Autopilot cluster, GKE Gateway, one Cloud SQL instance with a database per service, and the Secret Manager add-on."
    tradeoffs: "No mTLS between services and a shared database server: a noisy service affects the rest, and isolation relies on users and grants."
  - name: "Production with mesh and GitOps"
    when: "Several teams deploying daily, with requirements for internal encryption and change auditing."
    cost: 3
    ops: 2
    onprem: "RKE2 across three zones or racks, Istio ambient or Linkerd, PostgreSQL with Patroni per critical service, ESO with OpenBao, Harbor and Argo CD."
    aws: "Multi-AZ EKS with Karpenter, Istio ambient, Aurora per critical service, ECR with scanning, and Argo CD self-managed or as an EKS capability."
    azure: "AKS Standard across availability zones, the Istio add-on, a highly available PostgreSQL flexible server per critical service, ACR and Flux."
    gcp: "Regional GKE Autopilot, managed Cloud Service Mesh, highly available Cloud SQL per critical service, Artifact Registry and Config Sync."
    tradeoffs: "More moving parts to upgrade (mesh, operators, gateway) and more database instances to pay for; in exchange, each service fails and scales on its own."
  - name: "Multi-cluster and high availability"
    when: "A critical platform that must survive losing a region, or must separate workloads per customer or regulation."
    cost: 4
    ops: 3
    onprem: "Several RKE2 clusters created with Cluster API across two sites, multi-cluster Istio, PostgreSQL replicas between sites and Argo CD with ApplicationSets."
    aws: "EKS clusters in two Regions, Aurora Global Database for critical services, Route 53 failover and multi-cluster Istio."
    azure: "AKS clusters in two regions behind Azure Front Door, cross-region PostgreSQL replicas and Flux enforced by Azure Policy; the Istio add-on is not multi-cluster, so the mesh becomes self-managed Istio."
    gcp: "Several GKE clusters in a fleet, multi-cluster Gateway, multi-cluster Cloud Service Mesh and cross-region Cloud SQL replicas."
    tradeoffs: "Cost and complexity multiply: data replicated across regions, weaker consistency and a dedicated platform team."
extensions:
  - name: "Node autoscaling"
    when: "When the HPA creates pods that don't fit and nodes must come and go on their own."
    cost: "low"
    onprem: "Cluster Autoscaler + Cluster API"
    aws: "Karpenter / EKS Auto Mode"
    azure: "Node auto-provisioning (Karpenter)"
    gcp: "Built into Autopilot"
  - name: "Event-driven scaling"
    when: "Services that consume queues or streams and must scale on backlog, down to zero."
    cost: "low"
    onprem: "KEDA"
    aws: "KEDA"
    azure: "AKS KEDA add-on"
    gcp: "KEDA"
  - name: "Event bus between services"
    when: "When chained synchronous calls start propagating failures and latency."
    cost: "medium"
    onprem: "Apache Kafka (Strimzi)"
    aws: "Amazon MSK"
    azure: "Event Hubs"
    gcp: "Pub/Sub"
  - name: "Distributed metrics and traces"
    when: "As soon as there is more than one hop between services and nobody knows where latency goes."
    cost: "medium"
    onprem: "OTel + Prometheus + Grafana Tempo"
    aws: "Managed Prometheus + Managed Grafana"
    azure: "Azure Monitor managed Prometheus"
    gcp: "Managed Service for Prometheus"
  - name: "WAF on the gateway"
    when: "Public APIs exposed to bots, injection or credential abuse."
    cost: "medium"
    onprem: "Coraza on Envoy"
    aws: "AWS WAF on the ALB"
    azure: "WAF on AppGw for Containers"
    gcp: "Cloud Armor"
  - name: "Shared cache"
    when: "Repeated reads that load a service's database, or shared sessions."
    cost: "medium"
    onprem: "Valkey (operator)"
    aws: "ElastiCache (Valkey)"
    azure: "Azure Managed Redis"
    gcp: "Memorystore for Valkey"
savings:
  - "Run stateless services on Spot capacity (Karpenter with Spot on EKS, Spot node pools on AKS, Spot Pods on GKE) with several replicas and a `PodDisruptionBudget`; keep on-demand only for what cannot tolerate interruptions."
  - "Build multi-architecture images and use ARM nodes (Graviton on EKS, Cobalt or Ampere on AKS, Axion or Tau T2A on GKE), which usually give better price-performance."
  - "Right-size `requests` with the VPA in recommendation mode: on Autopilot you pay for what pods request, and elsewhere nodes are sized by the sum of `requests`, not by actual usage."
  - "Istio ambient mode replaces the per-pod sidecar with a per-node proxy and removes the CPU and memory every sidecar reserves."
  - "Cover baseline capacity with Savings Plans on AWS, reservations on Azure or committed use discounts on GCP, and leave the peak to Spot or on-demand."
  - "In development, use one database instance with several logical databases, the AKS Free tier or `az aks stop` outside working hours, and lifecycle policies in the registry to delete old images."
---

## When you need it

When several teams work on the same product and the monolith has become the bottleneck: one deployment drags everyone along, one part needs to scale ten times more than the rest, or a component has different security requirements (payments, personal data). Splitting into services with their own lifecycle and their own database lets teams deploy daily without coordinating the whole organisation.

If you are one team with a small domain, you don't need it yet. A modular monolith on a container PaaS is cheaper and easier to debug; Kubernetes plus a mesh add a whole platform that someone has to maintain.

## Scenarios

- **Startup growing from one team to four.** Begin with the starter cluster: one managed cluster, NetworkPolicies and one PostgreSQL server with a database per service. The mesh and separate instances arrive when a specific service justifies them, not before.
- **Bank or healthcare provider with data in the EU.** mTLS with workload identity becomes an audit requirement, as do secrets in an external manager with access logging and signed images. Clusters in a European region, customer-managed keys for the databases and GitOps as the record of who changed what.
- **Seasonal peaks (sales, enrolment, campaigns).** The HPA scales the services on the critical path and node autoscaling (Karpenter, Autopilot) adds Spot capacity. The bottleneck is usually the orders database: read replicas, a connection pooler and a queue to decouple whatever doesn't have to be synchronous.
- **Customer that requires on-premises.** The same design with RKE2, Cluster API, Harbor, OpenBao and Argo CD. The difference is that the team runs the control plane, the storage and the upgrades; reuse the same manifests as in the cloud so you don't maintain two products.
- **Team new to Kubernetes.** Use GKE Autopilot or EKS Auto Mode, skip the mesh at first and rely on GitOps from day one: a manual `kubectl apply` is the fastest way to lose track of the cluster's state.

## How it fits together

The client enters through the ingress gateway, which terminates TLS, applies routes and spreads traffic across services. Each service is a `Deployment` with its `HorizontalPodAutoscaler`, which adds or removes replicas based on CPU, memory or custom metrics. When orders calls payments, the call goes through the service mesh: both ends present short-lived certificates bound to their service account, traffic is encrypted, and an authorization policy decides who may call whom.

Orders writes only to its own database; payments has its own and never reads the orders one. Payments gets its credentials from the external secrets manager, which injects them as a file or a `Secret` using the pod's workload identity, with no static keys.

Underneath sits the delivery loop: CI builds the image, scans it and pushes it to the private registry with an immutable tag; the GitOps controller sees the change in the manifests repository and applies it to the managed cluster, which also hosts the mesh and the controllers.

## Deployment: Docker, Kubernetes or serverless

**On-premises with Docker Compose.** Fine for local development and very small deployments: one container per service, one PostgreSQL per service with its volume, Traefik or Caddy as a reverse proxy with automatic certificates, and backups with `pg_dump` or restic to another host. There is no HPA, no mTLS between services and no zero-downtime deployment; if the host goes down, everything does.

**On-premises with Kubernetes.** RKE2 or k3s with Cluster API for lifecycle, CloudNativePG with one `Cluster` per service, cert-manager for certificates, Envoy Gateway at the edge, Istio or Linkerd, External Secrets Operator with OpenBao, Harbor, Argo CD, KEDA, and Velero to back up cluster state. It is the full design, with the cost of running all of it.

**Cloud without Kubernetes.** ECS Fargate with Service Connect (which supports TLS with AWS Private CA), Azure Container Apps (with encryption between apps in the environment and optional Dapr) or Cloud Run (with service-to-service authentication through IAM identity tokens). You lose the mesh and manifest portability, but there is no cluster to run.

**Cloud with managed Kubernetes.** EKS, AKS or GKE with the services in the diagram. It pays off when there are many services, several teams and needs a PaaS doesn't cover: fine-grained network policies, operators, stateful workloads or portability across clouds and on-premises.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | Very low | Low, manual | None | Development, pilot |
| On-prem Kubernetes | Hardware and people | High | HPA + own nodes | Sovereignty, on-prem customer |
| Container PaaS | Low, scales to zero | Low | Automatic | Few services, small team |
| Managed Kubernetes | Cluster + nodes | Medium | HPA + node autoscaling | Many services and teams |

## Key decisions

- **Mesh or no mesh.** A mesh gives mTLS, retries and metrics without code changes, but it is one more system to upgrade. With few services, NetworkPolicies and TLS in the application may be enough; with audit requirements or many teams, the mesh pays off. Ambient lowers the per-pod cost compared with sidecars.
- **Managed or self-managed mesh.** Cloud Service Mesh and the AKS Istio add-on take the control plane off your hands but restrict versions and customisation. On EKS there has been no managed mesh since App Mesh was retired: you run Istio yourself.
- **Database per service or shared.** Per service gives real independence of schema and scaling, at the cost of more instances and of cross-domain queries going through APIs or events. A shared server with separate databases is the middle ground.
- **Argo CD or Flux.** Argo CD has a very visual UI and application model; Flux is lighter and ships as a native extension on AKS. Config Sync is the built-in option on GKE. What matters is that Git is the only path to change.
- **Secrets as files or as `Secret`s.** Mounting them through CSI avoids copying them into etcd; syncing them with ESO is more convenient for apps that expect environment variables.

## Common pitfalls

- Microservices sharing a database: the coupling is still there, only now it is distributed.
- Long chains of synchronous calls with no timeouts or circuit breaker, where one slow service takes down everything that depends on it.
- HPA without `requests`, or with inflated `requests` that make you pay for empty nodes.
- Turning on the mesh in permissive mode and never moving to strict mTLS.
- Upgrading Kubernetes without first checking that the mesh, the gateway and the operators support the new version.
- Images tagged `latest`: GitOps cannot tell which version is running or roll back to the previous one.
