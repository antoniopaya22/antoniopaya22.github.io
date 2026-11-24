---
title: "File exchange with partners and banks"
short: "B2B files (SFTP/EDI)"
summary: "A single SFTP or AS2 entry point for banks, suppliers and customers, with keys under control, a landing zone, validation and malware scanning, EDI or CSV transformation, idempotency and auditable acknowledgements."
description: "SFTP, FTPS and AS2 with SSH and PGP keys, malware scanning, X12/EDIFACT EDI and idempotency for partners and banks on AWS, Azure, GCP and on-premises."
order: 27
requirements:
  - "Each partner signs in with its own identity (SSH key or AS2 certificate) and sees only its own folders."
  - "No file reaches internal systems without format validation and a malware scan."
  - "A resent or duplicated file is never processed twice: idempotency by partner, name and content hash."
  - "Every exchange produces an acknowledgement (MDN, 997/999, CONTRL or response file) and is logged with who, what, when and outcome."
  - "SSH, PGP and AS2 private keys live in a secret store and are rotated without cutting partners off."
platforms:
  onprem:
    summary: "SFTPGo as the SFTP and FTPS server on Ceph RGW, keys in OpenBao, ClamAV plus a custom validator, workers on Kubernetes for transformation and Wazuh for audit."
    notes:
      - "SFTPGo covers SFTP, FTP/S, WebDAV and a web client, stores into S3-compatible storage and fires actions on every upload; it does not speak AS2, which needs something like OpenAS2."
      - "Keep the server's host key across every migration: partners have it pinned, and a new key breaks their connection with a possible-attack warning."
      - "Some Spanish banks still use EDITRAN for corporate file exchange; no managed service covers it and it usually means running their software."
      - "Publish a fixed, stable IP: banks and large suppliers work with allowlists, and changing it means weeks of coordination."
      - "The cost is operations: patching a server exposed to the Internet, rotating keys, onboarding partners and watching login attempts."
  aws:
    summary: "Transfer Family as the SFTP, FTPS or AS2 endpoint on S3, keys in Secrets Manager, GuardDuty Malware Protection for S3, B2B Data Interchange for X12, and CloudTrail with CloudWatch for audit."
    notes:
      - "A VPC endpoint with Elastic IPs gives partners fixed addresses for their allowlists; a custom identity provider (Lambda or API Gateway) lets you authenticate against your own directory."
      - "Transfer Family managed workflows can decrypt PGP with keys held in Secrets Manager, copy, tag and invoke Lambda after each upload."
      - "B2B Data Interchange supports X12 only, transforming it to and from JSON or XML; for EDIFACT you need your own translator on Lambda or containers."
      - "Transfer Family also offers web apps so a partner without an SFTP client can upload and download from the browser, and SFTP connectors to push files to the partner's servers."
      - "You pay per hour per protocol enabled on each endpoint plus data transferred: enabling SFTP, FTPS and AS2 on one server triples the fixed cost."
  azure:
    summary: "Blob Storage with SFTP enabled as the endpoint, Key Vault for keys, Defender for Storage for malware scanning, Logic Apps with the Enterprise Integration Pack for EDI, and Azure Monitor for audit."
    notes:
      - "SFTP on Blob Storage requires a hierarchical namespace and uses local users with SSH key or password, not Entra identities; it offers neither FTPS nor AS2."
      - "SFTP support is billed per hour while it is enabled on the account, used or not: turn it off in environments that do not need it."
      - "Logic Apps supports AS2, X12, EDIFACT and RosettaNet; partners and agreements live in an integration account, which has a fixed hourly cost by tier. On Standard, maps and schemas can live in the logic app itself."
      - "Defender for Storage scans each blob on upload and publishes the verdict as index tags and to Event Grid: processing must wait for that verdict."
      - "A storage account's public IP is not guaranteed; if the bank requires a fixed IP, the usual pattern is a private endpoint behind Azure Firewall with a static IP."
  gcp:
    summary: "SFTPGo on GKE as the endpoint (or Cloud FTP, Google's managed SFTP), Secret Manager for keys, ClamAV on Cloud Run, Cloud Run functions for transformation and Cloud Audit Logs."
    notes:
      - "Since August 2026 Google Cloud has a managed SFTP service, Cloud FTP: SFTP only with public-key auth, each user mapped to a service account with bucket permissions, and external or internal servers via Private Service Connect."
      - "Cloud FTP is not in every region (as of November 2026 it does not include Madrid) and does not cover FTPS, passwords or AS2: for those you still need SFTPGo or another server on GKE or Compute Engine."
      - "There is no managed EDI service: X12 or EDIFACT parsing is your code on Cloud Run or a third-party Marketplace product."
      - "ClamAV scanning on Cloud Run follows a Google reference solution: a Cloud Storage event triggers the scan and the file moves to a clean or quarantine bucket."
      - "Cloud Storage data access logs are off by default and billed by volume: enable them only on the exchange buckets."
tiers:
  - name: "A handful of partners"
    when: "A company receiving bank statements and CSV orders from a few partners, with no EDI or AS2."
    cost: 1
    ops: 1
    onprem: "One host with Docker Compose: SFTPGo, MinIO or a backed-up file system, ClamAV and a worker that validates and loads into the ERP."
    aws: "One Transfer Family server with SFTP only and service-managed users, S3 with per-partner prefixes, GuardDuty for S3 and a validation Lambda."
    azure: "A storage account with SFTP and local users, Defender for Storage and a Function triggered by Event Grid."
    gcp: "An external Cloud FTP server in a region that offers it, per-partner buckets, ClamAV on Cloud Run and a Cloud Run function."
    tradeoffs: "A single instance and ad hoc transformation per partner; onboarding is manual and availability rests on one endpoint."
  - name: "Production with PGP and acks"
    when: "Dozens of partners and banks, PGP-encrypted files, mandatory acknowledgements and audit for customers or regulators."
    cost: 2
    ops: 2
    onprem: "Kubernetes with SFTPGo in two replicas behind an L4 load balancer with a fixed IP, Ceph RGW, OpenBao for keys, a job queue and a transfer log in PostgreSQL."
    aws: "Transfer Family on a VPC endpoint with Elastic IPs in two zones, managed workflows with PGP decryption, and Step Functions to validate, transform and produce acks."
    azure: "SFTP on Blob Storage behind Azure Firewall, Logic Apps Standard to orchestrate and produce acks, Key Vault and Defender for Storage."
    gcp: "SFTPGo on GKE behind a network load balancer with a static IP, or Cloud FTP, with Workflows orchestrating and ClamAV on Cloud Run."
    tradeoffs: "More fixed cost per endpoint and orchestrator; in return, repeatable partner onboarding and traceability for every file."
  - name: "Full EDI and AS2"
    when: "Supply chain or retail with hundreds of partners, X12 or EDIFACT, AS2 with signed MDNs and service-level agreements."
    cost: 4
    ops: 3
    onprem: "SFTPGo and OpenAS2 clustered, a commercial or open source EDI translator and a partner onboarding portal; two data centres if the business cannot stop."
    aws: "Transfer Family with SFTP and AS2, B2B Data Interchange for X12 and your own EDIFACT translation, with EventBridge events to the ERP."
    azure: "Logic Apps Standard with an integration account for AS2, X12 and EDIFACT, per-partner agreements and B2B tracking in Azure Monitor."
    gcp: "SFTP and AS2 endpoint on GKE, a third-party Marketplace EDI translator or your own on Cloud Run, and Pub/Sub to internal systems."
    tradeoffs: "High fixed cost and scarce EDI expertise; per-partner configuration (versions, separators, agreements) is the bulk of the work."
extensions:
  - name: "Outbound delivery to partner servers"
    when: "When you are the one dropping files on the bank's or customer's SFTP."
    cost: "low"
    onprem: "SFTPGo actions or rclone"
    aws: "Transfer Family SFTP connectors"
    azure: "Logic Apps SFTP connector"
    gcp: "Cloud Run job with an SFTP client"
  - name: "Web portal for partners"
    when: "Small partners without an SFTP client who upload files occasionally."
    cost: "medium"
    onprem: "SFTPGo web client"
    aws: "Transfer Family web apps"
    azure: "Own app with user delegation SAS"
    gcp: "Cloud Run app with signed URLs"
  - name: "Fixed IP for allowlists"
    when: "Banks and large accounts that only accept connections from or to declared IPs."
    cost: "low"
    onprem: "VIP with keepalived"
    aws: "VPC endpoint with Elastic IPs"
    azure: "Azure Firewall with static IP"
    gcp: "Static external IP on the LB"
  - name: "Quarantine and reprocessing"
    when: "When a file fails validation and must be fixed and replayed without asking the partner again."
    cost: "low"
    onprem: "Quarantine bucket + queue"
    aws: "Quarantine prefix + Step Functions"
    azure: "Quarantine container + Logic Apps"
    gcp: "Quarantine bucket + Workflows"
  - name: "Immutable file retention"
    when: "When contracts or auditors require keeping the original unaltered for years."
    cost: "medium"
    onprem: "Object Lock on Ceph RGW"
    aws: "S3 Object Lock"
    azure: "Immutable Blob storage"
    gcp: "Cloud Storage Bucket Lock"
  - name: "Automated partner onboarding"
    when: "Past a few dozen partners: keys, folders, permissions and agreements from a form or a pull request."
    cost: "low"
    onprem: "Terraform + SFTPGo API"
    aws: "Terraform or CloudFormation"
    azure: "Bicep or Terraform"
    gcp: "Terraform"
savings:
  - "Enable on each endpoint only the protocols some partner actually uses: on Transfer Family every protocol adds its own hourly charge."
  - "Stop or delete idle development and staging endpoints: Transfer Family, SFTP on Blob Storage and Cloud FTP bill per hour while running, even if no file arrives."
  - "Move originals to cold storage classes with lifecycle rules (S3 Glacier, Cool or Archive tier, Coldline) once the reprocessing window has passed."
  - "Enable data access logs only on the exchange buckets or containers and set their retention; logging everything everywhere is billed by volume."
  - "On Azure, pick the lowest integration account tier that covers your partners and agreements, and do not create one per environment unless needed: it has a fixed hourly cost."
  - "Compress before encrypting and transferring: it cuts the per-GB volume and the malware scanning time."
---

## When you need it

When the outside world does not speak your API. Banks return statements (MT940, camt.053, or Norma 43 in Spain) and accept payment files (pain.001) over SFTP or bank-specific protocols; large retail customers send orders as X12 or EDIFACT EDI over AS2; small suppliers upload a CSV every night. For years this has been a forgotten SFTP server in a DMZ with shared accounts and cron scripts. This case turns it into an integration component with per-partner identity, security controls, idempotency and end-to-end traceability.

## Scenarios

### SME with bank statements

One or two banks and a few suppliers. A managed SFTP with per-partner users, separate prefixes, malware scanning and a function that validates the format and loads into the ERP. The part most often forgotten is reprocessing: keep the original and a record of what was loaded, because the bank will resend yesterday's file on the day something breaks.

### Retail with EDI

Orders (850 in X12, ORDERS in EDIFACT), shipping notices and invoices with hundreds of partners, each with its own version and quirks. This is where an EDI translator and per-partner agreements pay off. AS2 adds signing, encryption and a signed receipt (MDN) that serves as proof of delivery; the functional acknowledgement (997, 999 or CONTRL) also confirms the content was understood.

### Regulated financial institution

Payment files with personal and banking data, external audit and DORA. End-to-end PGP encryption, keys in an HSM or managed store with rotation, immutable retention of originals and acknowledgements, and a record of who accessed what. The endpoint sits in an EU region and the logs stay in the same jurisdiction.

### Partners without technical capacity

A small haulier has no SFTP client and does not know what an SSH key is. A web portal with username and MFA that drops files into the same landing zone avoids email attachments, which is what would happen otherwise.

## How it fits together

The partner connects to the SFTP endpoint (or sends over AS2) with its SSH key or certificate. The endpoint takes its own host key and the decryption keys from the secret store, authenticates the partner and confines it to its inbound folder. The file lands in the landing zone, object storage with prefixes per partner and direction (inbound, outbound, quarantine, processed).

Every upload triggers the scan: malware and validation (format, size, structure, expected name). If the file is PGP-encrypted, it is first decrypted in an isolated area: an encrypted file cannot be scanned. Only clean files move on to transformation, which hashes the content and checks it against a per-partner record of processed files; a duplicate is flagged and not loaded. The EDI or CSV is then parsed, converted to the internal format and delivered to the ERP or database. The outcome produces the acknowledgement that goes back to the partner over the same channel.

In parallel, the landing zone and the endpoint emit records to the audit store: connections, uploads, downloads, scan results and acknowledgements sent, with the retention that contracts and regulation require.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** SFTPGo with its user database, MinIO or a backed-up volume, `clamd` with signatures refreshed by `freshclam`, a validation and transformation worker, and an L4 proxy or the host IP published on port 22 or 2222. SFTPGo's admin port is never exposed. Back up the configuration, host keys and files.

**Kubernetes on-premises.** k3s or RKE2 with SFTPGo in several replicas sharing S3 storage (Ceph RGW), a LoadBalancer Service with MetalLB for the fixed IP, OpenBao with External Secrets Operator for keys, and KEDA scaling workers on the queue of pending files.

**Cloud without Kubernetes.** This is the diagram's design on AWS and Azure: Transfer Family or SFTP on Blob Storage, storage events and functions or orchestrators (Step Functions, Logic Apps). On GCP, Cloud FTP covers SFTP if your region offers it, with Cloud Run for scanning and transformation.

**Managed Kubernetes.** EKS, AKS or GKE pay off when you need protocols the managed service does not provide (FTPS on Azure or GCP, AS2 outside AWS, bank-specific protocols) or the platform already exists. It is the diagram's choice on GCP.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | One host | Medium | Vertical | Few partners, on-premises |
| Kubernetes on-premises | Three or more nodes | High | Replicas and KEDA | On-premises with HA |
| Managed SFTP service | Per endpoint-hour | Low | Managed | Default choice in the cloud |
| EKS, AKS, GKE | Control plane and nodes | Medium-high | Replicas | Protocols not offered as managed |

## Key decisions

- **Managed or self-hosted.** The managed service removes patching and availability of an Internet-facing server; self-hosting gives you protocols and options the managed one lacks. Compare how easily each gives you a fixed IP, too.
- **Own EDI parser or a product.** A home-grown parser works for a couple of message types with a couple of partners; beyond that, per-partner variants justify B2B Data Interchange, Logic Apps or a commercial translator.
- **Idempotency by hash, not just by name.** Many partners reuse names (`statement.txt`) or resend the same content under another name: record both.
- **Push or pull.** Having the partner drop files on your SFTP is easier to control; fetching from theirs means managing their credentials and their availability.
- **Transport encryption versus content encryption.** SFTP protects the transfer; PGP or AS2 protect the file at rest and prove its origin. Banks often ask for both.

## Common pitfalls

- Accounts shared between partners or a common password: impossible to audit or revoke a single one.
- Processing a file the moment it appears, before the upload finishes or the malware scan returns a verdict.
- Scanning encrypted files and treating them as clean.
- Losing the host key when migrating the server, so every partner sees a security warning.
- Not keeping the original: without it there is no reprocessing and no evidence in a dispute.
- Sending a positive acknowledgement before validating the content.
- Leaving port 22 open to the world with no attempt limits or IP allowlist when partners have fixed addresses.
