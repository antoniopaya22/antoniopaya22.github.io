---
title: "Multi-account landing zone and FinOps"
short: "Landing zone & FinOps"
summary: "Prepare the cloud organisation before the teams arrive: an account hierarchy, guardrails nobody can switch off, centralised security and logs, group-based human access and visible costs from day one."
description: "Multi-account landing zone with guardrails, security and log archive accounts, group-based access and FinOps: reference on AWS, Azure, GCP and on-premises."
order: 16
requirements:
  - "Each environment and each team lives in its own account, subscription or project, never mixed with production."
  - "Preventive guardrails are applied from the hierarchy and no account administrator can disable them."
  - "Audit logs from every account end up in a separate, immutable account outside the reach of whoever runs the workloads."
  - "People sign in through IdP groups, with no local users and no long-lived keys."
  - "Every account has a budget, alerts and cost tags, and billing detail is exported to a queryable store."
  - "There is a defined path to create sandbox accounts and to suspend and close the ones no longer used."
platforms:
  onprem:
    summary: "Rancher manages several clusters (production and non-production) as isolation units, Kyverno or Gatekeeper enforce policy, Keycloak provides group-based access, Wazuh and Loki or OpenSearch centralise security and logs, and OpenCost allocates cost."
    notes:
      - "The equivalent of an account is a cluster (strong isolation) or a Rancher project with its namespaces (weak isolation); production gets its own cluster."
      - "Kyverno and Gatekeeper both support audit and enforce modes: start in audit, review the policy reports and switch to enforce one policy at a time."
      - "Keycloak federates with the corporate directory and its groups map to Rancher roles and Kubernetes RBAC; local users are kept for emergencies only."
      - "Loki or OpenSearch must live outside the clusters they watch, with their own retention and permissions, or a cluster administrator can erase their own trail."
      - "OpenCost does not know your bill: give it the real cost of the data centre's nodes, storage and network so that per-namespace allocation means something."
  aws:
    summary: "AWS Organizations groups accounts into OUs, SCPs and RCPs set the permission ceiling, GuardDuty and Security Hub watch from a security account, an organisation trail writes to S3 in a log archive account, IAM Identity Center provides group-based access, and Budgets plus CUR 2.0 cover cost."
    notes:
      - "SCPs cap principals in member accounts and RCPs cap resources (S3, KMS, STS, SQS, Secrets Manager and other supported services) against external principals; neither affects the management account or service-linked roles, so nothing is deployed in the management account."
      - "AWS Control Tower builds the usual structure (a Security OU with the Log Archive and Audit accounts) and adds detective controls based on AWS Config; Config bills per configuration item recorded and per rule evaluation."
      - "Delegate GuardDuty and Security Hub administration to the security account. Since December 2025, Security Hub is the service that correlates findings, and the original one is now called Security Hub CSPM (the best-practice controls)."
      - "CUR 2.0 is created in Data Exports and queried with Athena; if you need to compare with other clouds, the same tool exports in FOCUS format."
      - "With centralised root access management you can remove root credentials from member accounts and keep only the management account's, protected by hardware MFA."
  azure:
    summary: "Management groups organise subscriptions, Azure Policy applies inherited guardrails, Defender for Cloud assesses posture, Log Analytics centralises logs, Entra ID with PIM grants time-bound group-based access, and Cost Management covers budgets and exports."
    notes:
      - "The Azure Landing Zones hierarchy separates Platform (management, connectivity, identity), Landing zones (corp and online), Sandbox and Decommissioned; in Terraform, the caf-enterprise-scale module has been replaced by the Azure Verified Modules for the platform landing zone (AVM)."
      - "Azure Policy acts as a preventive (`Deny`), detective (`Audit`) and corrective (`DeployIfNotExists`, `Modify`) guardrail; assignments with remediation need a managed identity with permissions at that scope."
      - "Defender for Cloud includes free foundational posture management; paid plans bill per protected resource, so enable them per subscription, not across the board."
      - "PIM turns Azure roles and group membership into eligible assignments with time-bound activation and approval; it requires an Entra ID P2 or Entra ID Governance licence."
      - "Log Analytics bills per GB ingested and for retention: the destination for diagnostics from the whole organisation is often the platform's largest cost."
  gcp:
    summary: "The organisation node and its folders (production, non-production) organise projects, organization policies set guardrails, Security Command Center watches, an organisation sink aggregates logs, Cloud Identity with IAM provides group-based access and billing budgets flag spend."
    notes:
      - "Use the v2 organization policy API (`google_org_policy_policy` in Terraform, which supersedes `google_organization_policy`): it supports tag-based conditions, `dry_run_spec` to test before enforcing, and custom constraints."
      - "Grant permissions to Cloud Identity groups on the folder, not to users on each project; basic roles (Owner, Editor) should not appear outside sandbox."
      - "The aggregated organisation sink (with `include_children`) sends audit logs to a log bucket or BigQuery in a logging project that only the security team can read."
      - "Security Command Center has Standard, Premium and Enterprise tiers; the tier decides which detections (Security Health Analytics, threats) you actually get."
      - "Budgets only alert: to act, publish them to Pub/Sub and react with a function; the billing export to BigQuery is the basis of any FinOps analysis."
tiers:
  - name: "Minimum baseline"
    when: "A small company with one or two teams moving from a single account to several."
    cost: 1
    ops: 1
    onprem: "One k3s or RKE2 cluster with a namespace per environment, Kyverno in audit mode, Keycloak for access and Loki on a separate host."
    aws: "Organizations with Prod, NonProd and Security OUs, a handful of SCPs, an organisation trail to S3 in the log account, Identity Center and per-account Budgets."
    azure: "One intermediate management group, prod and non-prod subscriptions, built-in Azure Policy initiatives, a single Log Analytics workspace and Cost Management budgets."
    gcp: "Organisation with production and non-production folders, basic organization policies, an organisation sink to a log bucket and billing export to BigQuery."
    tradeoffs: "Security and logs share an account, detection is basic and account creation is still manual."
  - name: "Standard platform"
    when: "Several product teams, external audits or customers asking for evidence of controls."
    cost: 2
    ops: 2
    onprem: "Rancher with separate production and non-production clusters, Kyverno in enforce mode, Wazuh, OpenSearch and OpenCost fed with real data-centre costs."
    aws: "Control Tower with Log Archive and Audit, delegated GuardDuty and Security Hub, Account Factory, Sandbox and Suspended OUs and CUR 2.0 queried with Athena."
    azure: "Azure Landing Zones with AVM, Defender for Cloud on production subscriptions, PIM for privileged roles and cost exports to Storage."
    gcp: "Folders per environment and business unit, Security Command Center, a Terraform project factory, custom constraints and budgets wired to Pub/Sub."
    tradeoffs: "More pieces to maintain and a platform team to own them; guardrail changes go through review."
  - name: "Regulated organisation"
    when: "Regulated sector, several business units or regions, and an obligation to keep evidence for years."
    cost: 3
    ops: 3
    onprem: "Several clusters per security zone, WORM logs in object storage, Wazuh feeding a SIEM and privileged access with approval."
    aws: "Data perimeter RCPs, logs under S3 Object Lock, Security Lake or an external SIEM, approved time-bound access and shared savings commitments."
    azure: "Management groups per business unit, Microsoft Sentinel, immutable storage for logs, PIM with approval and periodic access reviews."
    gcp: "VPC Service Controls, Assured Workloads where applicable, Google SecOps, Bucket Lock on logs and Privileged Access Manager."
    tradeoffs: "High fixed cost in SIEM and retention, and every guardrail exception needs a formal process."
extensions:
  - name: "Account factory"
    when: "When accounts or projects are created every week and manual onboarding no longer scales."
    cost: "low"
    onprem: "Rancher + cluster templates"
    aws: "Account Factory for Terraform"
    azure: "Subscription vending (AVM)"
    gcp: "Terraform project factory"
  - name: "Data perimeter"
    when: "When you must guarantee that data is only read from the organisation's identities and networks."
    cost: "low"
    onprem: "NetworkPolicies + Kyverno"
    aws: "RCPs + VPC endpoint policies"
    azure: "Azure Policy + Private Link"
    gcp: "VPC Service Controls"
  - name: "Time-bound privileged access"
    when: "When nobody should hold permanent administrator permissions."
    cost: "low"
    onprem: "Keycloak + expiring groups"
    aws: "Identity Center + TEAM"
    azure: "Entra PIM"
    gcp: "Privileged Access Manager"
  - name: "Central SIEM"
    when: "When a team investigates incidents and needs to correlate every account."
    cost: "high"
    onprem: "Wazuh + OpenSearch"
    aws: "Amazon Security Lake + SIEM"
    azure: "Microsoft Sentinel"
    gcp: "Google SecOps"
  - name: "Immutable logs"
    when: "When an audit or regulation requires that nobody, not even an administrator, can delete logs."
    cost: "medium"
    onprem: "MinIO or Ceph with object lock"
    aws: "S3 Object Lock"
    azure: "Immutable Blob Storage"
    gcp: "Bucket Lock"
  - name: "Per-team showback"
    when: "When several teams share a bill and nobody knows which part is theirs."
    cost: "low"
    onprem: "OpenCost per namespace"
    aws: "Tag policies + Cost Categories"
    azure: "Tag inheritance via Policy"
    gcp: "Labels + BigQuery billing export"
savings:
  - "Buy commitments (Savings Plans, reservations, CUDs) once for the whole organisation and share the discount: on AWS sharing across accounts is on by default, on Azure use shared or management group scope, and on GCP enable CUD sharing on the billing account."
  - "Keep a single organisation trail for management events (the first copy is free) and enable data events only on the buckets or tables that need them."
  - "Cut the cost of detection: AWS Config with periodic recording in non-production accounts, and paid Defender for Cloud plans and extra GuardDuty protections only where there is production data."
  - "Control centralised log volume: exclude noisy logs nobody reads in the sink, use the Log Analytics Basic table plan for debug logs and move the archive to cold storage."
  - "Give sandbox accounts a budget with an automatic action (a deny SCP on AWS, automation from the action group on Azure, a function via Pub/Sub on GCP) and an expiry date."
  - "Move ownerless accounts to Suspended, close them after the retention period, and on-premises use OpenCost to find namespaces that reserve far more than they use."
---

## When you need it

When the second or third application lands in the same cloud account as the first. Everything works until a developer with admin rights in development deletes a production resource, an audit asks who changed what six months ago, or the bill jumps 40 % and nobody knows which team did it. A landing zone is the scaffolding you put up before the workloads: where each thing lives, what can never be done, who gets in and how, and what each part costs. Retrofitting one around a hundred deployed resources is far more expensive than starting with it.

## Scenarios

- **Startup moving from one account to several.** The hierarchy, separating production from development, an organisation trail, SSO access and budgets with alerts are enough. No Control Tower or SIEM yet: the goal is that growth does not break isolation.
- **Regulated company with data in the EU.** Preventive guardrails restrict regions and services, logs go to immutable storage with multi-year retention, and privileged access is time-bound and approved. The data perimeter (RCPs, VPC Service Controls, Private Link) moves from optional to mandatory.
- **Group with several business units.** Each unit has its own branch of the hierarchy and its own budgets, but security, logs and commitment purchases are central. Tag-based showback is what prevents arguments at month end.
- **Customer that requires on-premises.** The same idea carries over to clusters: Rancher as the organisation, clusters or projects as accounts, Kyverno as SCPs and OpenCost as the internal bill.
- **Training or hackathons.** Many short-lived sandbox accounts, each with a small budget, an automatic action when it is exceeded and scheduled closure.

## How it fits together

1. The organisation sits at the root: AWS Organizations, the management group tree, the GCP organisation node or Rancher on-premises. Three shared pieces hang from it.
2. Guardrails are applied from the hierarchy downwards. Preventive ones (SCPs and RCPs, Azure Policy with `Deny`, organization policies, Kyverno in enforce mode) stop the action; detective ones (AWS Config and Security Hub CSPM, `Audit`, Security Health Analytics, Kyverno reports) detect it and alert.
3. Central security (GuardDuty and Security Hub, Defender for Cloud, Security Command Center, Wazuh) receives findings from every account in a delegated security account.
4. The log archive receives audit logs from the whole organisation in a separate account that only the security team can read.
5. Workloads hang under the guardrails, split into production and non-production. People reach them through IdP groups, with tighter restrictions in production, and every account reports its spend to budgets and the cost export.

## Deployment: Docker, Kubernetes or serverless

A landing zone is mostly configuration declared as code (Terraform or each cloud's accelerator), but it does have pieces to run.

**Docker Compose on one host.** For a small on-premises organisation: Keycloak with its PostgreSQL, Loki and Grafana, and the Wazuh manager, each with its own volume, behind a reverse proxy with TLS (Traefik or Caddy). That host watches one or two k3s clusters and is backed up with restic to another machine. It is cheap, but it is a single point of failure: if it goes down you lose access and audit at the same time.

**Kubernetes on-premises.** Rancher on its own RKE2 management cluster, which creates and governs the workload clusters. In each one: Kyverno or Gatekeeper, cert-manager, the Wazuh agent and a log shipper to Loki or OpenSearch, and OpenCost. Keycloak can run in the management cluster with its operator and a database managed by CloudNativePG.

**Cloud without Kubernetes.** This is the natural fit: everything is managed services configured with Terraform. What actually runs are small automations: a function that reacts to a budget, the pipeline that creates accounts, or a remediation triggered by a finding (Lambda, Azure Functions or Automation, Cloud Run functions).

**Managed Kubernetes.** The landing zone does not need EKS, AKS or GKE, but it must prepare them: in-cluster guardrails (Kyverno or Gatekeeper; on AKS, the Azure Policy add-on), control-plane logs shipped to the central archive, and access through IdP groups mapped to RBAC.

| Option | Fixed cost | Operations | When |
|---|---|---|---|
| Compose on one host | Very low | Medium, all manual | Small on-premises, one team |
| Kubernetes on-premises | Medium (hardware and management) | High | Several clusters and teams in your own data centre |
| Managed services + functions | Low, grows with logs and detection | Low | Any organisation in the cloud |
| Managed + Kubernetes | Medium | Medium | When workloads already run on EKS, AKS or GKE |

## Key decisions

- **Your own tooling or an accelerator.** Control Tower, Azure Landing Zones and Google's foundations give you a proven structure in days, in exchange for accepting their conventions. Your own Terraform gives full control, but every piece is yours.
- **Account granularity.** One account per environment and application isolates better and splits cost without tags, but multiplies access, networks and budgets. One per environment and team is the usual middle ground.
- **Preventive versus detective.** Block only what must never happen (disabling the trail, forbidden regions, public resources in production); detect the rest. Too many denials lead to exception requests, and then to exceptions being ignored.
- **Who owns the platform.** Without a team responsible for guardrails, logs and the account factory, the landing zone decays within months.

## Common pitfalls

- Deploying workloads in the management account, where SCPs and RCPs do not apply.
- Leaving audit logs in the same account they watch, with permissions that let its administrator delete them.
- Turning on preventive guardrails at the root without first testing them on one OU or in `dry_run` mode, and blocking production deployments.
- IAM users or local accounts for people "just for now", still there two years later.
- Trusting a budget to stop spend: it only alerts unless you wire an action to it.
- Not having a tested break-glass account, or having one with no alerts when it is used.
