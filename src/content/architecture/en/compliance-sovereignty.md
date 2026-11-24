---
title: "Compliance and data sovereignty in Spain and the EU"
short: "Compliance & sovereignty"
summary: "How to deploy a workload holding personal or regulated data so that residency, key control, provider access and audit evidence are guaranteed by design and by policy, not by goodwill."
description: "ENS, GDPR, NIS2 and DORA in the cloud: residency by policy, external keys, immutable logs and DLP on AWS, Azure, GCP and on-premises."
order: 31
requirements:
  - "Data, backups and logs stay in the permitted regions, enforced by policy rather than verbal agreement."
  - "Encryption keys for regulated data are under the organisation's control, with rotation and separation of duties."
  - "Every access and change, including by provider staff, lands in a log nobody can alter or delete before its retention ends."
  - "Personal data is discovered and classified continuously, including where nobody expected it."
  - "Audit evidence (ENS, GDPR, contracts) is produced continuously from the actual configuration."
platforms:
  onprem:
    summary: "Your own ENS-certified data centre, your own HSM for keys, OPA enforcing location and configuration policy, WORM storage with Wazuh for audit, and Microsoft Presidio to detect personal data."
    notes:
      - "The option with the most control and the most work: ENS certification of the system, physical security, continuity and key custody are yours end to end."
      - "OPA (with Gatekeeper or Kyverno on Kubernetes and conftest in the Terraform pipeline) blocks deployments outside the permitted clusters and locations."
      - "The HSM must be redundant with keys backed up to another HSM; losing the HSM without a backup means losing the encrypted data."
      - "Presidio detects entities such as names, national IDs, IBANs or phone numbers with configurable recognisers; tune them for local formats and measure false positives."
      - "Object storage with Object Lock in compliance mode serves as WORM for logs and backups."
  aws:
    summary: "An EU Region or the AWS European Sovereign Cloud, workloads on ECS Fargate, SCPs denying non-permitted Regions, KMS with External Key Store, encrypted Aurora, Macie to discover personal data, and an immutable audit log."
    notes:
      - "The AWS European Sovereign Cloud has been generally available since 15 January 2026, with its first Region in Brandenburg, Germany: a separate partition operated from the EU, with its own accounts and a smaller service catalogue. For many Spanish cases the Spain Region (Aragón) with controls is enough."
      - "CloudTrail Lake, the diagram's service, has not accepted new customers since 31 May 2026. Use an organisation trail to S3 with Object Lock in compliance mode and log file integrity validation, or CloudTrail events in CloudWatch, which AWS proposes as the replacement."
      - "With External Key Store, keys never leave your HSM and every operation goes through your proxy: if the proxy or HSM goes down, data can no longer be decrypted. Reserve it for what truly requires it."
      - "Macie scans objects in S3, not databases: to review Aurora you export snapshots to S3 as Parquet and scan them there."
      - "AWS holds ENS High certification for a broad set of services and Regions; the certificate is downloadable from AWS Artifact and covers AWS's part, not your system."
  azure:
    summary: "EU regions under the EU Data Boundary (or the Microsoft Sovereign Cloud offering), Container Apps, Azure Policy allowed locations, Managed HSM for keys, encrypted PostgreSQL, logs exported to immutable storage and Microsoft Purview for information protection."
    notes:
      - "The EU Data Boundary, completed in February 2025, commits to storing and processing data in the EU and EFTA for most services; it is not a separate cloud. Sovereign Public Cloud adds Data Guardian (European oversight of remote engineer access, rolling out) and Sovereign Private Cloud runs on Azure Local in your data centre."
      - "Azure Policy includes the Spain ENS regulatory compliance initiative and the allowed-locations policy; assign them at the root management group, not per subscription."
      - "Log Analytics lets you purge but not modify data: for real immutability export to a storage account with a time-based retention policy and protected append writes enabled."
      - "Purview's data governance capabilities (Data Map and Unified Catalog) are being retired: no new accounts since November 2026. The security capabilities (DLP, sensitivity labels) remain; to classify PostgreSQL consider Presidio in a job."
      - "Customer Lockbox requires your approval when a Microsoft engineer needs access to customer data to resolve a support case."
  gcp:
    summary: "Google Cloud Data Boundary with Assured Workloads (or Sovereign Controls by Partners), Cloud Run, the resource locations constraint, Cloud External Key Manager, encrypted Cloud SQL, Access Transparency and Sensitive Data Protection."
    notes:
      - "Assured Workloads control packages include an EU data boundary and Sovereign Controls by Partners; in Spain the partner is SIA/Minsait, in the Madrid region. Google Cloud Dedicated (operated by a partner, such as S3NS in France) is the next step up."
      - "Access Transparency logs Google staff access, and Access Approval lets you approve it beforehand; neither is an immutable log of your own activity. For that, use a Cloud Logging bucket with locked retention or Cloud Storage with Bucket Lock."
      - "Cloud EKM with Key Access Justifications lets your external key manager deny each request based on the reason Google declares."
      - "Sensitive Data Protection discovers and profiles data in BigQuery, Cloud SQL and Cloud Storage, and also de-identifies it (masking, tokenisation)."
      - "Google Cloud and Workspace hold ENS High certification; the `gcp.resourceLocations` policy enforces locations across the organisation."
tiers:
  - name: "EU region with baseline controls"
    when: "A company or public body with ordinary personal data and ENS basic or medium category."
    cost: 1
    ops: 1
    onprem: "Your own data centre or colocation in Spain, disk and database encryption with keys in a manager (OpenBao), central logs in Wazuh and WORM backups."
    aws: "Spain or another EU Region, Region-deny SCPs, KMS with customer managed keys, an organisation trail to S3 with Object Lock and Security Hub controls."
    azure: "Spain Central or another EU region, the ENS initiative and allowed locations in Azure Policy, Key Vault with customer keys and log export to immutable storage."
    gcp: "Madrid or another EU region, `gcp.resourceLocations`, Cloud KMS with customer keys, log buckets with locked retention and Sensitive Data Protection."
    tradeoffs: "The provider runs the key infrastructure and its staff could access data in exceptional support cases; enough for most, not for everyone."
  - name: "External keys, controlled provider access"
    when: "High-category data, health or financial sector, or contracts requiring that the provider cannot decrypt without you."
    cost: 2
    ops: 2
    onprem: "Dedicated HSMs in two data centres, separation of duties between key custodians and administrators, and Presidio for continuous classification."
    aws: "KMS External Key Store against your own or a partner's HSM, Macie with automated discovery and Object Lock logs in a separate account."
    azure: "Managed HSM (or external key management with Managed HSM), Customer Lockbox, customer keys on every data service and Purview for DLP."
    gcp: "Assured Workloads with a premium EU boundary, Cloud EKM with Key Access Justifications, Access Approval and VPC Service Controls."
    tradeoffs: "More latency and a new critical dependency: if your key infrastructure fails, the application can no longer read its data."
  - name: "Sovereign or partner-operated cloud"
    when: "Public sector with ENS High and operational sovereignty requirements, defence or critical infrastructure needing immunity from foreign law."
    cost: 4
    ops: 3
    onprem: "Your own data centre or a certified national private cloud, with no dependency on external services to operate and continuity across two sites."
    aws: "AWS European Sovereign Cloud, with accounts, IAM and billing separate from the global partition and operation by EU-resident staff."
    azure: "Sovereign Public Cloud with Data Guardian, Sovereign Private Cloud on Azure Local, or a national partner cloud where one exists."
    gcp: "Sovereign Controls by SIA/Minsait in Madrid, partner-operated Google Cloud Dedicated, or Google Distributed Cloud air-gapped in your data centre."
    tradeoffs: "A shorter service catalogue, new features later, higher prices and, with partner variants, another contract and another support desk."
extensions:
  - name: "Confidential computing"
    when: "When you also want to protect data in use from the infrastructure operator."
    cost: "medium"
    onprem: "Hosts with AMD SEV-SNP or Intel TDX"
    aws: "Nitro Enclaves"
    azure: "Azure confidential VMs"
    gcp: "Confidential VMs"
  - name: "Exfiltration perimeter"
    when: "So that not even a stolen credential can copy data to a foreign account or project."
    cost: "low"
    onprem: "Egress proxy with allowlist"
    aws: "SCPs, RCPs and VPC endpoint policies"
    azure: "Network Security Perimeter"
    gcp: "VPC Service Controls"
  - name: "Continuous compliance evidence"
    when: "When an ENS or customer audit asks for configuration evidence on a regular basis."
    cost: "low"
    onprem: "Wazuh SCA or OpenSCAP"
    aws: "Security Hub and Config"
    azure: "Azure Policy regulatory compliance"
    gcp: "Security Command Center"
  - name: "De-identification and tokenisation"
    when: "For test environments, analytics or suppliers that do not need the real data."
    cost: "low"
    onprem: "Presidio (anonymizer)"
    aws: "Own job with Presidio"
    azure: "Own job with Presidio"
    gcp: "SDP de-identification"
  - name: "Backups in a second EU region"
    when: "When continuity requires recovering from a regional outage without leaving the jurisdiction."
    cost: "medium"
    onprem: "Second data centre in Spain"
    aws: "AWS Backup across EU Regions"
    azure: "Azure Backup across EU regions"
    gcp: "Backup and DR across EU regions"
savings:
  - "Apply external keys (External Key Store, Cloud EKM, Managed HSM) only to data that requires them: they add HSM cost, per-operation latency and a point of failure. Everything else can use customer managed keys in the standard KMS."
  - "Move to the sovereign cloud or dedicated data centre only the workloads that need it; the rest can live in a standard EU region with policies, at lower cost and with the full catalogue."
  - "Tier log retention: a few months queryable and the rest in locked archive classes (S3 Glacier with Object Lock, Archive tier with immutability, Cloud Storage Archive with Bucket Lock)."
  - "Configure Macie and Sensitive Data Protection with sampled discovery and periodic profiles instead of recurring full scans of all storage."
  - "Reuse provider certifications (ENS High, ISO 27001) from AWS Artifact, Service Trust Portal or Compliance Reports Manager: your audit covers your part, not theirs."
  - "Filter the data events you log (for example, only buckets holding regulated data): logging every read of every object multiplies audit cost."
---

## When you need it

When the workload processes personal data at scale, serves a public administration or belongs to a regulated sector. In Spain that almost always means the Esquema Nacional de Seguridad (ENS, Royal Decree 311/2022, with basic, medium and high categories depending on incident impact), GDPR and, depending on the sector, NIS2 or DORA. The architecture does not replace legal analysis or risk assessment: it describes technical controls these frameworks usually call for. **Which controls you need and whether your system complies depends on each organisation's own analysis, its DPO and its advisers; this is not legal advice.**

## Scenarios

### City council or university with ENS medium

An e-government portal holding citizens' data. A Spanish or EU region, encryption with customer keys, central logs with retention matching the category, and the ENS controls initiative turned on to produce evidence. All three providers hold ENS High certification for their part; the organisation's system needs its own statement or certification of conformity, and the CCN-STIC guides for each cloud help configure it.

### Financial institution under DORA

DORA has applied since 17 January 2025 and requires managing ICT provider risk: a register of information on contracts, exit strategies, resilience testing and concentration analysis. Technically that translates into infrastructure as code that can be deployed elsewhere, backups outside the main provider, keys under your control and documented recovery drills.

### Company in scope of NIS2

NIS2 widens the sectors in scope and tightens incident reporting and management accountability. In Spain, at the end of 2026, the transposition law was still going through parliament and Royal Decree-law 12/2018 remained in force. The technical controls in this case (immutable logging, key management, supply chain control) are useful however it is finally passed.

### Sensitive data with sovereignty demands

Health, defence or critical infrastructure, with a customer asking what happens if a foreign government compels the provider to hand over data. Data in the EU is not enough: the goal is that the provider cannot decrypt without you (external keys), that its staff cannot access without approval and logging, and, at the extreme, operation by a European entity or in your own data centre.

## How it fits together

Citizens or customers hand over personal data that enters only through the chosen EU region or sovereign cloud. The regulated workload lives there, and a residency policy applied at organisation level (SCP, Azure Policy, resource locations constraint, OPA) prevents creating resources outside the permitted locations, backups and logs included.

The workload writes to the encrypted database. The keys protecting that data are not controlled by the application or the regular operations team: they live in a manager under the organisation's control, anywhere from a KMS with customer keys to an HSM outside the provider, with separation of duties between those who administer keys and those who administer data.

Every access and change to data and infrastructure is sent to an immutable log in a separate account or project, with locked retention that not even an administrator can shorten. Where available, the provider's staff access logs are added to it. In parallel, classification and DLP periodically sweep storage and databases looking for personal data where it should not be: a forgotten export, a log full of ID numbers, a test table copied from production.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** Only for small environments or for testing the model: ENS medium or high requires redundancy, segregation and logging that a single host struggles to meet. If you use it: disk encryption, secrets in OpenBao, logs shipped off the host to WORM storage, and encrypted backups.

**Kubernetes on-premises.** RKE2 (compliance-oriented, with a CIS profile) or hardened k3s, Kyverno or OPA Gatekeeper for policy, cert-manager, etcd secret encryption with an HSM-backed KMS, CloudNativePG with encryption and backups to Ceph RGW with Object Lock, and Wazuh collecting Kubernetes and operating system audit.

**Cloud without Kubernetes.** This is the diagram's design: Fargate, Container Apps or Cloud Run in the permitted region, with workload identity, a managed database with customer keys and organisation policies. Check that every service you use is in scope of the provider's ENS certification and available in the chosen sovereign offering.

**Managed Kubernetes.** EKS, AKS or GKE when you need real portability to on-premises or another cloud as an exit strategy, or network and admission controls the PaaS does not offer. Add secret encryption with the customer key and ship control plane audit logs to the central log.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | One host | Medium | Manual | Testing or basic category |
| Kubernetes on-premises | Three or more nodes plus HSM | High | HPA | Maximum sovereignty or own data centre |
| PaaS in an EU region | Near zero | Low | Automatic | Default choice |
| EKS, AKS, GKE | Control plane and nodes | Medium-high | HPA and nodes | Exit strategy and portability |

## Key decisions

- **EU region with controls or sovereign cloud.** The standard region has the full catalogue and the best price; the sovereign offering reduces legal and operational exposure in exchange for catalogue and cost. Decide per workload, not for the whole organisation.
- **Who holds the keys.** Customer keys in the provider's KMS cover most cases; external keys (HYOK) give real control over decryption in exchange for running availability and operations yourself.
- **International transfers.** Support, telemetry and sub-processors may process data outside the EU even when the region is European. Review the data processing agreement, the transfer mechanism (adequacy decision, standard contractual clauses) and what the provider's data boundary commitment actually covers.
- **Exit strategy from day one.** DORA and the EU Data Act push towards being able to switch provider: infrastructure as code, open formats and exportable backups.
- **Classify before you protect.** Without knowing where personal data is, every control is applied in the wrong place.

## Common pitfalls

- Choosing a European region and considering residency solved, without restricting by policy where resources, backups and logs can be created.
- Keeping audit logs in the same account administered by the very people who should be audited.
- Turning on external keys with no high-availability plan for the HSM and proxy: a key outage is a service outage.
- Assuming the provider's ENS certification certifies your system.
- Copying production to staging with real personal data.
- Mistaking Access Transparency or Customer Lockbox for your own audit log: they record the provider, not your administrators.
- Building on services being retired (CloudTrail Lake for new customers, Purview data governance) with no migration plan.
