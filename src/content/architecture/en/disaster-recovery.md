---
title: "Cross-region disaster recovery"
short: "Disaster recovery"
summary: "Keep serving, or be back within an agreed time, when a whole region fails or someone encrypts or deletes the data: cross-region replication, traffic failover, immutable backups in another account and regular drills."
description: "Disaster recovery with RPO/RTO, warm standby, cross-region replication, immutable backups and DNS failover on AWS, Azure, GCP and on-premises."
order: 19
requirements:
  - "RPO (data you can lose) and RTO (time without service) are agreed with the business and written down per system."
  - "The database replicates to another region and promoting the replica is documented and automated."
  - "Traffic moves between regions through an explicit or automatic action that doesn't depend on the failed region's control plane."
  - "Immutable backups exist in another account or subscription that not even a compromised administrator can delete."
  - "Failover and failback are rehearsed regularly and the real RTO is measured."
platforms:
  onprem:
    summary: "PowerDNS with health checks sends traffic to the primary site; PostgreSQL streams to the secondary, which keeps Kubernetes warm with fewer replicas, and restic stores backups on WORM-locked storage."
    notes:
      - "Patroni supports a standby cluster at the second site that is promoted with one command; without it, promoting PostgreSQL by hand under pressure is where most mistakes happen."
      - "PowerDNS LUA records (for example `ifurlup`) return only the IPs that respond; lower the TTL to 60 seconds or less on names that must switch quickly."
      - "For immutability, use a bucket with Object Lock in compliance mode (Ceph RGW or MinIO) and align restic pruning with the retention period, or deletes will fail."
      - "The second site is a full fixed cost: hardware, licences, power and connectivity, even though it only takes traffic in a disaster."
  aws:
    summary: "Route 53 ARC routes traffic to ECS Fargate in the primary region and switches to the secondary; Aurora Global Database replicates across regions and AWS Backup copies snapshots to a Vault Lock vault in another account."
    notes:
      - "ARC Region switch (since August 2025) defines plans with ordered steps: scale ECS in the secondary, switch over or fail over Aurora Global Database and change DNS; it is billed per plan per month."
      - "Aurora Global Database replicates at the storage layer with typical lag under a second; a planned switchover loses no data and an unplanned failover accepts losing whatever wasn't replicated."
      - "ARC routing controls are flipped through a data plane spread across several regions, with no dependency on the console or the failed region."
      - "Vault Lock in compliance mode prevents deleting recovery points, even by root; a logically air-gapped vault has it enabled by default and supports sharing with multi-party approval."
      - "The cost of warm standby is the Aurora replica (instances and replicated write I/O) plus the minimum tasks in the secondary."
  azure:
    summary: "Azure Front Door sends traffic to Container Apps in the primary region and switches origin when probes fail; PostgreSQL Flexible Server replicates to a geo replica and Azure Backup keeps copies in a locked immutable vault."
    notes:
      - "Front Door is not DNS: it is a global L7 proxy with priority-based origin groups and health probes. For non-HTTP traffic, Traffic Manager does DNS-based failover."
      - "Cross-region read replicas of PostgreSQL Flexible Server are asynchronous; virtual endpoints keep the same connection name after promotion."
      - "Promotion can be planned (waits to sync) or forced (immediate, possible data loss); afterwards you must recreate the replica to be protected again."
      - "An immutable vault in the locked state is irreversible, not even the subscription owner can disable it; combine it with soft delete and multi-user authorisation."
      - "Check that everything you need exists in the secondary region: quotas, SKUs, replicated Key Vault and managed identities."
  gcp:
    summary: "A Cloud DNS failover policy with health checks points to Cloud Run in the primary region; Cloud SQL has a cross-region replica and Backup and DR keeps copies in a backup vault with enforced retention."
    notes:
      - "Health checks on public endpoints only work in Cloud DNS public zones and require disabling the `compute.disableInternetNetworkEndpointGroup` organisation constraint."
      - "For HTTP, a global external Application Load Balancer with backends in two regions fails over without depending on DNS TTLs."
      - "Cloud SQL Enterprise Plus offers advanced DR: a designated DR replica, zero-data-loss switchover, replica failover and a write endpoint that follows the primary."
      - "Backup vaults are immutable and block deletion before the enforced retention ends; they can live in another project, and since 1 November 2026 Google places a lien on the project that holds them."
      - "The cost of standby is the running Cloud SQL replica and the minimum Cloud Run instances you keep warm in the secondary."
tiers:
  - name: "Backup and restore"
    when: "Internal systems that tolerate hours of downtime and losing everything since the last backup."
    cost: 1
    ops: 1
    onprem: "Daily restic backups to an Object Lock bucket in another building and a written procedure to rebuild from scratch."
    aws: "AWS Backup copying to another region and another account with Vault Lock, plus infrastructure as code to stand up the secondary on demand."
    azure: "Azure Backup with an immutable vault and cross-region restore, plus infrastructure as code for the secondary region."
    gcp: "Backup and DR with a backup vault in another region and project, plus infrastructure as code to recreate the environment."
    tradeoffs: "RTO of hours: network, compute and database must be created and restored. It's the minimum every system should have, even alongside the other tiers."
  - name: "Warm standby"
    when: "Business applications with an RTO of minutes and an RPO of seconds."
    cost: 3
    ops: 2
    onprem: "A second site with scaled-down Kubernetes, a Patroni standby cluster and PowerDNS with health checks, as in the diagram."
    aws: "The diagram as drawn: minimal ECS in the secondary, Aurora Global Database, a Region switch plan and Vault Lock."
    azure: "The diagram as drawn: Container Apps in two regions, geo replica with virtual endpoints, Front Door and an immutable vault."
    gcp: "The diagram as drawn: Cloud Run in two regions, Cloud SQL with advanced DR, DNS failover or a global load balancer, and a backup vault."
    tradeoffs: "You pay for a second, always-on (if reduced) region; scaling the secondary to take all the traffic must be tested."
  - name: "Active-active"
    when: "Critical services that can't afford minutes of downtime and have users in several regions."
    cost: 4
    ops: 3
    onprem: "Two sites serving at once with a distributed database (for example CockroachDB or YugabyteDB) or users partitioned by site."
    aws: "Traffic in both regions with latency-based routing, DynamoDB global tables or Aurora DSQL for multi-region data, and ARC to take a region out."
    azure: "Front Door spreading across regions and Cosmos DB with multi-region writes for the data that needs it."
    gcp: "A global load balancer with backends in several regions and multi-region Spanner for shared data."
    tradeoffs: "Maximum cost and complexity: write conflicts, consistency and much harder testing. Only worth it for part of the system."
extensions:
  - name: "Failover orchestration"
    when: "When failover is more than three steps and you can't rely on someone remembering them at 3 a.m."
    cost: "low"
    onprem: "Runbook in Ansible or Argo Workflows"
    aws: "ARC Region switch"
    azure: "Automation runbooks"
    gcp: "Workflows + Cloud Build"
  - name: "Virtual machine recovery"
    when: "When part of the system is legacy VMs that can't be rebuilt from code."
    cost: "medium"
    onprem: "Hypervisor VM replication"
    aws: "AWS Elastic Disaster Recovery"
    azure: "Azure Site Recovery"
    gcp: "Backup and DR (Compute Engine VMs)"
  - name: "Replicated object data"
    when: "When user-uploaded files are part of the service and must exist in the secondary."
    cost: "medium"
    onprem: "Ceph RGW multisite replication"
    aws: "S3 Cross-Region Replication"
    azure: "GRS or RA-GRS storage"
    gcp: "Dual-region or multi-region bucket"
  - name: "Secrets and keys in both regions"
    when: "Whenever data is encrypted with your own keys: without the key, the backup is useless."
    cost: "low"
    onprem: "Vault with DR replication"
    aws: "Multi-Region KMS keys"
    azure: "Key Vault with region replica"
    gcp: "Multi-region Cloud KMS keys"
  - name: "Chaos drills"
    when: "When you want to prove failover works before you need it."
    cost: "low"
    onprem: "Chaos Mesh or LitmusChaos"
    aws: "AWS Fault Injection Service"
    azure: "Azure Chaos Studio"
    gcp: "Chaos Mesh on GKE"
savings:
  - "Classify systems by RPO/RTO and only apply warm standby or active-active where required; everything else stays on backup and restore."
  - "Keep secondary-region compute at the minimum (one ECS task, minimum Container Apps or Cloud Run replicas) and scale on failover, with that scaling tested."
  - "Use cold storage for older backups (AWS Backup cold tiers, Azure Backup archive tier) and retention that matches regulation, not forever."
  - "Delete orphaned manual snapshots and duplicate copies across tools: they are often a large share of backup cost."
  - "Reserve or commit capacity only for the primary region; in the secondary, on-demand capacity is usually cheaper while it stays scaled down."
  - "Rehearse with ephemeral environments built from infrastructure as code and destroy them afterwards, instead of keeping a permanent DR test environment."
---

## When you need it

When the question 'what happens if the region goes down?' or 'what happens if ransomware encrypts the database and the backups?' has no concrete answer with times attached. High availability within a region (several zones, synchronous replicas) covers the loss of a server or a data centre; disaster recovery covers what high availability can't: a whole region down, a misconfiguration that propagates, or an attacker with administrator rights.

The starting point is two numbers per system. **RPO** is how much data you can lose (zero, seconds, an hour, a day). **RTO** is how long the system can be down. The business sets those numbers with the cost in front of it, not the technical team on its own.

## Scenarios

- **Startup in a single region.** Backup and restore done properly: automated backups, copies to another region and another account with a lock, and infrastructure as code that can stand everything up in another region. One drill per quarter. It's cheap and covers the most likely risk, which is not a region outage but accidental deletion.
- **E-commerce with an RTO of minutes.** Warm standby: the secondary region has the application deployed at minimum capacity and the database replicated. Failover is a plan that scales the secondary, promotes the database and moves traffic.
- **Regulated company (banking, healthcare, DORA or NIS2).** On top of warm standby: immutable backups in an isolated account run by another team, documented drills with measured RTO and a provider exit plan. The chosen regions must be in the EU.
- **Ransomware attack.** The replica doesn't help: it replicates the encryption or deletion within seconds. What saves you is the immutable copy in another account, with a minimum retention nobody can shorten, and a clean environment to restore into.
- **On-premises customer with a single site.** The second site can be a public cloud as the backup and recovery target, if the contract allows it, instead of a second data centre of your own.

## How it fits together

Users resolve the service name through a global routing layer (DNS with health checks or a global proxy). Under normal conditions it sends all traffic to the primary region.

The primary region runs the application against the primary database. That database replicates **asynchronously** to a replica in the secondary region: asynchronous because synchronous replication across regions would add the round-trip latency to every write. That is why the RPO of an unplanned failover is the replication lag at that moment, usually seconds.

The secondary region has the application deployed with the same version and configuration but minimal capacity (warm). In addition, the primary database produces snapshots that are copied to an **immutable backup** store in another account or subscription; that is the defence against deletion and encryption, which the replica doesn't give you.

In a disaster: someone decides to fail over (a human decision with one button is better than automation triggered by a transient fault), the replica is promoted, the secondary scales up and the routing layer sends traffic there. Then comes the part most often forgotten: recreating the replica in the reverse direction and planning the failback.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** A single host has no DR by itself; what you build is the backup: restic or Borg from cron to an Object Lock bucket at another site, the Compose file and configuration in Git, and a tested script that rebuilds the host from scratch. RTO in hours.

**On-premises Kubernetes (k3s or RKE2).** Two clusters, one per site, deployed from the same repository with Argo CD or Flux. CloudNativePG with a replica cluster at the second site and continuous backups to object storage with Barman; Velero for resource and volume backups; cert-manager and external-dns in both.

**Cloud without Kubernetes.** ECS Fargate, Container Apps or Cloud Run in two regions deployed by the same pipeline, with the managed database replicated and the provider's global routing. The cheapest way to have warm standby, because minimum compute in the secondary costs little.

**Managed Kubernetes (EKS, AKS, GKE).** One cluster per region managed with GitOps; the secondary cluster with few nodes and node autoscaling ready. The secondary cluster's control plane is paid for all the time.

| Option | Fixed DR cost | Operations | Typical RTO | When |
|---|---|---|---|---|
| Docker Compose + backups | Very low | Low | Hours | Internal systems, minimal budget |
| On-prem Kubernetes on two sites | Very high | High | Minutes | Sovereignty, second site available |
| Managed containers in two regions | Low-medium | Low | Minutes | Default in the cloud |
| Managed Kubernetes in two regions | Medium | Medium | Minutes | Existing Kubernetes platform |

## Key decisions

- **A tier per system, not one for everything.** Backup and restore, pilot light (replicated data only), warm standby and active-active multiply the cost at each step. Assign the tier from each system's RPO/RTO.
- **Automatic or manual failover.** Automatic shortens RTO but can be triggered by a partial fault and cause split brain; the usual pattern is automated detection and a one-button human decision.
- **DNS or global proxy.** DNS depends on TTLs and client caches; a global proxy (Front Door, Google's global load balancer) switches instantly, but only for HTTP.
- **Replica and immutable backup, not one or the other.** The replica protects against a region outage; the immutable backup protects against deletion, mistakes and attackers. You need both.

## Common pitfalls

- Never having rehearsed failover and discovering on the day that a quota, a secret or a permission is missing in the secondary region.
- Keeping backups in the same account and under the same administrators as production.
- Depending on the failed region's console or API to run the failover.
- Forgetting dependencies: encryption keys, secrets, container images and DNS that only exist in the primary region.
- DNS TTLs of hours on names that need to switch.
- Failing over with no plan to come back, leaving the system unprotected for weeks.
