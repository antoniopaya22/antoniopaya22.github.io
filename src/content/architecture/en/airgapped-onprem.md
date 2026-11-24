---
title: "Product in a site without internet (air-gapped)"
short: "Air-gapped site"
summary: "Deliver, install, upgrade and troubleshoot a product at a site that never connects to the internet, using a signed offline bundle that is carried in by hand and deployed on a single host."
description: "Air-gapped deployment with a signed offline bundle, SBOM, Docker Compose, encrypted backups and rollback: reference on AWS, Azure, GCP and on-premises."
order: 20
requirements:
  - "Everything needed to install or upgrade travels in a single versioned bundle: images, compose file, migrations and SBOM."
  - "The target verifies the signature and SHA256 sums before loading anything; a tampered bundle is never installed."
  - "Migrations run as a separate step first, and there is a tested way back."
  - "Database and volume backups are encrypted and restored in a regular drill."
  - "The customer can troubleshoot with no connectivity and export a support bundle through the same controlled channel."
platforms:
  onprem:
    summary: "GitHub Actions builds and signs, Harbor stores images and SBOMs, and the bundle (images.tar plus a signed SHA256SUMS) is loaded with `docker load` and started with Docker Compose on a single customer host."
    notes:
      - "The compose file references every image by digest (`image: registry/app@sha256:…`), not by tag: what runs is exactly what was signed."
      - "The verification public key (cosign, minisign or GPG) is installed once through a different channel from the bundle; if they travel together, the signature proves nothing."
      - "Harbor replicates and keeps the versions delivered to each customer: when a ticket arrives about 3.4.1, you can rebuild exactly that environment."
      - "Grafana and Loki run on the same host with bounded retention; a support script packs logs, versions and state into a tarball that leaves through the same controlled channel."
      - "The cost lies in operating each delivery: preparing, transferring and validating bundles, and keeping several versions in support at once."
  aws:
    summary: "AWS stays on the build side (Amazon ECR and signing); the target is customer hardware running Docker Compose, because Snowball Edge is no longer available to new customers."
    notes:
      - "Snowball Edge is not an option for a new design: AWS no longer offers Snow Family devices to new customers and only supports existing ones."
      - "AWS Outposts (rack or server) is AWS's suggested alternative for edge compute, but it depends on its parent Region and only tolerates temporary disconnection of up to 7 days: it suits intermittently connected sites, not an air-gapped one."
      - "ECR stores each version's images with scanning; the pipeline exports them with `docker save` or `skopeo` and builds the bundle from the signed digests."
      - "Cost on AWS: ECR storage and CI minutes. The hardware and its operation belong to the customer."
  azure:
    summary: "If the customer already runs Azure Local with disconnected operations, the bundle is pushed to their local Azure Container Registry and runs on an Azure Local VM with Compose or on AKS on Azure Local; otherwise the target is a customer host, as on-premises."
    notes:
      - "Azure Local disconnected operations provide a local control plane with portal, ARM, RBAC, VMs, AKS, Container Registry, Key Vault and Azure Policy, with no connection to the public cloud."
      - "It is not self-service: it requires an eligible agreement (not MOSA), a support plan, an approved business need through a prequalification form, Premier Solutions hardware and a dedicated management cluster."
      - "It does not pay off for a single product; it makes sense when the customer already runs it as a sovereign platform and wants everything to go through their ACR and Azure Policy."
      - "The local Key Vault holds the installation's secrets and certificates; the customer's internal CA issues the TLS certificates."
  gcp:
    summary: "At a customer running Google Distributed Cloud air-gapped, the product ships as charts or manifests, images are pushed to its managed Harbor and deployed on its Kubernetes; Artifact Registry stays on the build side."
    notes:
      - "GDC air-gapped is Google-designed hardware and software, delivered in racks (or as an appliance) with no connectivity to Google Cloud; the customer contracts and runs it with Google or a partner."
      - "GDC itself receives its software on portable storage verified with checksums: the same pattern as this case, so the customer's operator already has the procedure."
      - "Workloads run on Kubernetes, so the bundle includes a Helm chart or manifests instead of a compose file, and images are pushed to the environment's Managed Harbor Service."
      - "Outside GDC, the target is again a customer host with Docker Compose; Google Cloud only provides Artifact Registry and CI."
tiers:
  - name: "Single host with Compose"
    when: "A customer with one dedicated server or VM, no platform team and acceptable maintenance windows."
    cost: 1
    ops: 1
    onprem: "One Linux host with Docker Compose, Postgres in a container, restic to a separate disk or NAS, local Grafana + Loki."
    aws: "CI and Amazon ECR on AWS; at the target, the same customer host with Compose. Snowball Edge is not available to new customers."
    azure: "CI and Container Registry on Azure; at the target, a customer VM (or disconnected Azure Local if it already exists) with Compose."
    gcp: "CI and Artifact Registry on Google Cloud; at the target, a customer host with Compose."
    tradeoffs: "No high availability: an upgrade or a disk failure stops the service until it is restored."
  - name: "Active-passive"
    when: "The service cannot wait for a host rebuild; the customer provides two machines."
    cost: 2
    ops: 2
    onprem: "Two hosts with Compose; Postgres streaming replication to the passive one, a floating IP with keepalived and restic backups off both."
    aws: "Same as on-premises on customer hardware; AWS only builds and stores the versions."
    azure: "Two VMs on disconnected Azure Local or two own hosts, with Postgres replication and the same floating IP."
    gcp: "Two own hosts, or two replicas on GDC air-gapped Kubernetes if the customer has it."
    tradeoffs: "Failover is manual or semi-automatic and must be rehearsed; upgrades still need a window."
  - name: "Air-gapped Kubernetes"
    when: "Several applications or sites, a platform team at the customer and a need for zero-downtime upgrades."
    cost: 3
    ops: 3
    onprem: "k3s or RKE2 installed in air-gapped mode, local Harbor as registry, CloudNativePG for Postgres and Helm deployments."
    aws: "There is no AWS air-gapped platform for new customers: k3s or RKE2 on customer hardware."
    azure: "AKS on Azure Local with disconnected operations, images in the local ACR."
    gcp: "GDC air-gapped Kubernetes with its Managed Harbor Service."
    tradeoffs: "More pieces to maintain and upgrade without internet: Kubernetes itself, the registry and the operators also travel in bundles."
extensions:
  - name: "Data diode"
    when: "Classified or industrial sites where USB drives are not allowed and inbound transfer must be physical and one-way."
    cost: "high"
    onprem: "Hardware data diode"
    aws: "Hardware data diode"
    azure: "Hardware data diode"
    gcp: "Hardware data diode"
  - name: "Local registry at the target"
    when: "More than one host or Kubernetes at the customer: load once and let every node pull from the registry."
    cost: "low"
    onprem: "Local Harbor or registry:2"
    aws: "Local Harbor or registry:2"
    azure: "ACR on disconnected Azure Local"
    gcp: "Managed Harbor Service (GDC)"
  - name: "Delta bundles"
    when: "Large images and frequent upgrades: only the changed layers travel."
    cost: "low"
    onprem: "skopeo + layers by digest"
    aws: "skopeo from Amazon ECR"
    azure: "skopeo / oras from ACR"
    gcp: "skopeo from Artifact Registry"
  - name: "Offline vulnerability scanning"
    when: "The customer requires auditing the delivered SBOM against CVEs without going online."
    cost: "low"
    onprem: "Trivy / Grype with offline DB"
    aws: "Amazon Inspector (at source)"
    azure: "Defender for Containers (source)"
    gcp: "Artifact Analysis (at source)"
  - name: "Signed offline licence"
    when: "Commercial product: the licence is validated locally against a public key, with no licence server."
    cost: "low"
    onprem: "Signed licence file"
    aws: "Signed licence file"
    azure: "Signed licence file"
    gcp: "Signed licence file"
savings:
  - "Use minimal base images (distroless, Alpine or Wolfi) and multi-stage builds: the bundle is smaller, transfers faster and carries fewer CVEs to justify."
  - "Apply lifecycle policies in Harbor, Amazon ECR, Container Registry or Artifact Registry to keep only versions that some customer still has in support."
  - "Run the packaging pipeline only on release tags, not on every commit: building and signing a multi-GB bundle on every push wastes minutes and storage."
  - "Set Loki and Prometheus retention on the customer host in days, not months: it avoids buying disks and stops a full volume from taking the service down."
  - "Rely on restic deduplication and pruning (`forget --prune`) with a clear retention policy instead of keeping full copies forever."
  - "Do not propose disconnected Azure Local or GDC air-gapped just for your product: the customer pays for the hardware, licences and operation, and they only pay off as a shared platform."
---

## When you need it

When the customer is a hospital, an industrial plant, defence, a lab or a public body that does not let the system reach the internet, not even to pull an image. No `docker pull`, no telemetry, no remote support, and every upgrade is a procedure someone signs off. If the product was designed as SaaS, the first disconnected installation exposes everything it took for granted: a public registry, a licence server, NTP, a public CA for TLS, or an installer that downloads dependencies.

## Scenarios

- **Software for hospitals or labs.** An isolated clinical network, one virtual server provided by the customer and no platform team. A single host with Compose, backups to the customer's NAS and an upgrade procedure their technician can run from a one-page guide.
- **Industrial plant with an OT network.** Inbound transfer is physical and often goes through a data diode or a USB cleaning station. The bundle must be a single file with a versioned name, signature and sums, because the operator cannot ping you on chat if a layer fails.
- **Defence or public sector with its own sovereign cloud.** The customer already runs Azure Local with disconnected operations or Google Distributed Cloud air-gapped. You do not ship a compose file but images for their local registry and a chart or template that fits their policies.
- **Many disconnected sites.** Many identical installations, each on its own version. You need an inventory of which version each site runs, delta bundles and a migration compatibility matrix.
- **Intermittent, not zero, connectivity.** A ship or a mine that connects now and then. That is not air-gapped: AWS Outposts or another intermittently connected platform fits better than a physical bundle.

## How it fits together

1. **CI: build and sign.** The pipeline compiles, runs tests, generates each image's SBOM (Syft, in CycloneDX or SPDX) and signs the images.
2. **Registry + SBOM.** Images and their SBOMs land in the registry (Harbor, Amazon ECR, Container Registry or Artifact Registry) as the source of truth for what each customer received.
3. **Signed offline bundle.** A job exports the images by digest into `images.tar` and adds the compose file (or chart), migrations, SBOMs and a `SHA256SUMS` signed with the delivery key.
4. **Transfer.** The bundle leaves through a controlled channel: encrypted USB drive, optical media or data diode. It is a human, documented step.
5. **Load into the disconnected site.** On the host, the signature is verified with the public key already installed, the sums are checked, `docker load` runs and the migration container starts first; only if it succeeds does the application come up with `docker compose up -d`.
6. **Encrypted backups.** `pg_dump` and file volumes go to an encrypted restic repository on a disk or NAS separate from the host.
7. **Local diagnostics.** Grafana and Loki show metrics and logs locally. For support, a script produces a bundle with logs, versions and state that leaves through the same controlled channel, reviewed by the customer.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host** is the baseline and what most customers accept. Containers: a reverse proxy (Caddy or Traefik with certificates from the customer's internal CA), the application, a worker if any, Postgres with a named volume, a one-shot `migrate` service the application depends on (`depends_on` with `condition: service_completed_successfully`), Grafana, Loki and a log agent. Volumes for Postgres data, uploaded files and Grafana configuration. Backups are triggered by a systemd timer running restic.

**On-premises Kubernetes** pays off when there are several applications or a platform team. k3s and RKE2 both document an air-gapped install: the binary, the system images tarball and a local registry (Harbor or `registry:2`) configured as a mirror. Postgres with CloudNativePG, certificates with cert-manager against an issuer from the internal CA, and Helm for deployments. All of that is also upgraded through bundles, so your delivery grows.

**Serverless** does not exist in a truly disconnected site: there is no cloud API to call. The closest thing is platforms that bring their own local control plane: AKS and VMs on Azure Local with disconnected operations, or GDC air-gapped Kubernetes. Snowball Edge, which covered part of this gap on AWS, is no longer offered to new customers.

| Option | Fixed cost | Operations | Zero-downtime upgrade | When |
|---|---|---|---|---|
| Compose on one host | Low | Low | No | One product, one site, no platform team |
| Air-gapped k3s / RKE2 | Medium | High | Yes | Several apps or sites, platform team |
| Disconnected Azure Local | High | Medium (the customer runs the platform) | Yes, with AKS | The customer already has it as a sovereign platform |
| GDC air-gapped | High | Medium (with Google or a partner) | Yes | Government or regulated customer that already bought it |

## Key decisions

- **One monolithic bundle or delta bundles.** The monolithic one is easier to verify and to explain to the operator; deltas save transfer but require knowing exactly which layers the target already has. Start monolithic.
- **Compose or Kubernetes at the target.** Compose is installed and understood in an afternoon; Kubernetes gives you zero-downtime upgrades at the price of also shipping and maintaining the platform. Choose by who will operate it, not by what you use in your cloud.
- **Expand/contract migrations.** If each version only adds columns and tables and removes them in the next one, rollback means going back to the previous images. If a migration breaks compatibility, rollback means restoring the previous backup, and the procedure must say so.
- **How the key is trusted.** The verification public key is delivered once through another channel and rotated with its own procedure. If the key travels with the bundle, the signature only detects corruption, not tampering.
- **Customer platform or own host.** Fitting into Azure Local or GDC air-gapped forces you to deliver in their format and under their policies, but spares you the hardware discussion.

## Common pitfalls

- Images by tag (`:latest`, `:3.4`) in the compose file: at the target you cannot tell what is running.
- Hidden internet dependencies: a licence server, web fonts, a JavaScript CDN, a `pip install` at startup or an update check.
- Forgetting time and trust: without internal NTP, certificates and tokens fail; without the internal CA in the trust store, TLS does not work.
- Backups that are never restored. At a site with no remote support, a failed restore is discovered on the worst day.
- Deleting the previous images when upgrading: without them there is no quick rollback.
- Counting on Snowball Edge in a new AWS design: it is no longer offered to new customers, and Outposts needs its Region.
