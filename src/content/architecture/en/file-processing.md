---
title: "File upload and processing"
short: "File uploads"
summary: "Accept files from users without routing them through the API, check them for malware and extract their content asynchronously, with a status the user can follow."
description: "Direct upload with signed URLs, malware scanning, OCR and event-driven processing: a reference architecture on AWS, Azure, GCP and on-premises."
order: 9
requirements:
  - "The API never receives the file bytes; it only issues upload permissions."
  - "Every upload URL expires quickly and covers a single object whose key the server chooses."
  - "No file is processed or served to other users before it passes malware scanning."
  - "Processing is idempotent and tolerates retries and duplicate events."
  - "Users can check the status of their file."
platforms:
  onprem:
    summary: "Ceph RGW issues presigned URLs and publishes bucket notifications to RabbitMQ; workers on Kubernetes scan with ClamAV, extract text with PaddleOCR or Tesseract and store the result in PostgreSQL."
    notes:
      - "Ceph RGW speaks the S3 API and supports presigned URLs and notifications to AMQP or Kafka. MinIO used to be the usual pick, but it stopped publishing community edition binaries in 2025 and is no longer developed."
      - "Run ClamAV as a service (`clamd`) inside the cluster with your own signature mirror: many nodes running `freshclam` against the public CDN end up rate-limited or blocked."
      - "Tesseract does well on clean printed text; on scans, tables or complex layouts PaddleOCR is usually more accurate, at the price of more CPU or a GPU."
      - "The cost is capacity: disks for storage and nodes for OCR, which is by far the heaviest workload. Scale workers on queue depth."
  aws:
    summary: "S3 with a presigned URL, GuardDuty Malware Protection for S3 scans every new object, EventBridge triggers a Lambda that calls Textract, and results land in Aurora PostgreSQL."
    notes:
      - "If you need to cap file size server-side, use a presigned POST with a policy (`content-length-range`) rather than a PUT."
      - "GuardDuty publishes its verdict to EventBridge (`GuardDuty Malware Protection Object Scan Result`) and can tag the object with `GuardDutyMalwareScanStatus`: trigger the processor from that event, not from object creation, and block reads of objects without a clean tag in the bucket policy."
      - "Textract has synchronous and asynchronous APIs; for multi-page PDFs use the asynchronous one with an SNS notification instead of waiting inside the Lambda, which has a duration limit (30 minutes since November 2026) and bills the waiting time."
      - "GuardDuty bills by volume scanned and Textract by page and analysis type: extracting tables and forms costs more than plain text."
  azure:
    summary: "Blob Storage with a user delegation SAS, Defender for Storage scans on upload, Event Grid delivers the event to Azure Functions and Document Intelligence extracts the content."
    notes:
      - "Issue user delegation SAS tokens (signed with Entra ID), with create permission only and scoped to a single blob; avoid SAS signed with the account key."
      - "A SAS does not limit file size: check it in the processor and discard anything above your limit."
      - "Defender for Storage writes the result to blob index tags and can send it to an Event Grid topic; tags are not tamper-proof, so make the decision on the result event."
      - "Document Intelligence offers read, layout and prebuilt models (invoices, receipts, ID documents); it bills per page and model, so use the simplest one that solves the case."
      - "Defender for Storage bills per protected storage account and by volume scanned."
  gcp:
    summary: "Cloud Storage with a V4 signed URL, Eventarc routes the object finalized event to ClamAV on Cloud Run and to a Cloud Run function that calls Document AI."
    notes:
      - "Google Cloud has no native malware scanning for Cloud Storage; its reference architecture deploys ClamAV on Cloud Run with separate buckets for unscanned, clean and quarantined files."
      - "With that design the processor listens on the clean bucket, not the upload bucket: scanning stops being a side branch and becomes a gate."
      - "To cap size, include the `x-goog-content-length-range` header in the signature, or use a policy document for HTML form uploads."
      - "Document AI bills per page and processor; specialised processors (invoices, identity) cost more than generic OCR."
tiers:
  - name: "Minimum viable"
    when: "A few uploads a day, short documents and a small team that does not want to run queues or clusters."
    cost: 1
    ops: 1
    onprem: "One host with Docker Compose: API, a lightweight S3-compatible store (Garage or MicroCeph with RGW), `clamd`, a Tesseract worker and PostgreSQL as a queue with `SKIP LOCKED`; the client confirms the upload to the API instead of relying on bucket notifications."
    aws: "S3 with a presigned URL, GuardDuty Malware Protection scoped to the upload prefix, a Lambda triggered by the scan result, synchronous Textract and Aurora Serverless v2 able to scale to zero."
    azure: "Blob Storage with a user delegation SAS, Defender for Storage on-upload scanning, Azure Functions on the Flex Consumption plan, the Document Intelligence Read model and a Burstable PostgreSQL Flexible Server."
    gcp: "Upload, clean and quarantine buckets, ClamAV on Cloud Run, a Cloud Run function on the clean bucket, Document AI's generic OCR and the smallest Cloud SQL instance."
    tradeoffs: "With no queue in between, an upload spike becomes concurrent executions hitting OCR and the database; long documents and fine-grained retries are out of scope."
  - name: "Balanced"
    when: "Sustained volume, multi-page PDFs and a service that must neither lose files nor process them twice."
    cost: 2
    ops: 2
    onprem: "k3s or RKE2 with Rook-Ceph for RGW, RabbitMQ with quorum queues and a DLX, workers scaled by KEDA on queue depth and CloudNativePG with a synchronous replica."
    aws: "EventBridge delivers to SQS with a DLQ, Lambda or ECS Fargate services consume the queue, asynchronous Textract with SNS notification and Multi-AZ Aurora."
    azure: "Event Grid delivers to Service Bus, event-driven Container Apps jobs process the messages, asynchronous Document Intelligence and zone-redundant high-availability PostgreSQL."
    gcp: "Eventarc publishes to Pub/Sub with a dead-letter topic, Cloud Run processes via push, Document AI batch mode for long documents and regional high-availability Cloud SQL."
    tradeoffs: "One more queue to watch (message age, DLQ) and a little more latency, in exchange for absorbing spikes, retrying under control and not overloading OCR."
  - name: "High volume and in-house OCR"
    when: "Hundreds of thousands of documents a month, your own extraction models, or files that must never leave your infrastructure."
    cost: 4
    ops: 3
    onprem: "A dedicated Ceph cluster with multisite across data centres, GPU nodes with the NVIDIA GPU Operator for PaddleOCR or custom models, KEDA and tiered storage using RGW storage classes."
    aws: "EKS with Karpenter mixing GPU and Spot instances for workers, S3 cross-region replication and Textract kept for the documents your models cannot handle."
    azure: "AKS with GPU and Spot node pools, object replication between storage accounts and Document Intelligence only as a second pass."
    gcp: "GKE with GPU node pools and Spot VMs, or Cloud Run with GPUs for intermittent load, dual-region buckets and Document AI as a fallback."
    tradeoffs: "You run models, GPUs and a cluster; extraction quality depends on your team, and the per-page saving only shows up with high, steady volume."
extensions:
  - name: "Multipart or resumable upload"
    when: "When files reach hundreds of MB or mobile connections are flaky and cannot retry the whole upload."
    cost: "low"
    onprem: "S3 multipart on Ceph RGW"
    aws: "S3 multipart, one URL per part"
    azure: "Blocks + Put Block List with SAS"
    gcp: "Signed resumable upload"
  - name: "Queue as a buffer with DLQ"
    when: "As soon as volume is spiky or OCR is slow or has per-second quotas."
    cost: "low"
    onprem: "RabbitMQ (quorum + DLX)"
    aws: "Amazon SQS + DLQ"
    azure: "Azure Service Bus"
    gcp: "Pub/Sub + dead-letter topic"
  - name: "Lifecycle and storage tiers"
    when: "Whenever you keep originals for more than a few weeks or have uploads that are never confirmed."
    cost: "low"
    onprem: "Lifecycle + RGW storage classes"
    aws: "S3 Lifecycle / Intelligent-Tiering"
    azure: "Lifecycle management (Cool/Cold/Archive)"
    gcp: "Object Lifecycle / Autoclass"
  - name: "Personal data detection"
    when: "When files may carry ID numbers, health or banking data and you have to classify or redact them."
    cost: "medium"
    onprem: "Microsoft Presidio"
    aws: "Amazon Macie"
    azure: "Microsoft Purview"
    gcp: "Sensitive Data Protection"
  - name: "CDN to serve results"
    when: "When besides processing you serve thumbnails, previews or clean files to many users."
    cost: "medium"
    onprem: "Nginx or Varnish cache"
    aws: "CloudFront + OAC"
    azure: "Azure Front Door"
    gcp: "Cloud CDN"
  - name: "Real-time notification to the client"
    when: "When the user waits on screen and status polling generates too many requests."
    cost: "low"
    onprem: "SSE or WebSocket in the API"
    aws: "API Gateway WebSocket"
    azure: "Azure Web PubSub"
    gcp: "SSE from Cloud Run"
savings:
  - "Before paying for OCR, check whether the PDF already has a text layer (`pdftotext`, PyMuPDF): born-digital documents need neither Textract, Document Intelligence nor Document AI."
  - "Use the simplest model that solves the case: `DetectDocumentText` rather than `AnalyzeDocument` in Textract, Read rather than Layout in Document Intelligence, generic OCR rather than specialised processors in Document AI."
  - "Set lifecycle rules: abort incomplete multipart uploads (`AbortIncompleteMultipartUpload` on S3 and Cloud Storage), delete anything left unconfirmed in the upload prefix after a few days, and move originals to Standard-IA, Cool or Nearline and later to S3 Glacier or the Azure and Cloud Storage Archive tiers; mind minimum storage durations and retrieval costs."
  - "Scope malware scanning to what needs it: GuardDuty Malware Protection for S3 can be limited to prefixes, and Defender for Storage lets you set a monthly cap on GB scanned per account."
  - "Run workers on ARM (Lambda arm64, Graviton on Fargate) when your libraries allow it, and OCR workers on Fargate Spot, Spot VMs or Spot nodes: the work is retryable by design."
  - "Keep worker downloads away from NAT: an S3 gateway endpoint on AWS, Private Google Access on GCP or Storage service endpoints on Azure; and process in the same region as the bucket."
---

## When you need it

When users upload files (invoices, contracts, ID documents, photos) and something has to happen to them. Sending the file through the API is the version that works in the demo: it ties up backend memory and connections, runs into request size limits on the load balancer or serverless platform, and mixes upload, analysis and response into a single request. This pattern separates the three and lets object storage do what it does best.

## Scenarios

- **An MVP that receives invoices.** A few dozen documents a day. The minimum option is enough: signed URL, managed scanning, a function and API-based OCR. Do not build a queue or a cluster until volume asks for it, but keep the file status in the database and make the processor idempotent from day one.
- **A platform with videos or drawings of hundreds of MB.** The bottleneck is the upload, not OCR. Move to multipart (S3, Ceph), resumable uploads (Cloud Storage) or block uploads (Azure): the API signs each part or the session, the client uploads in parallel and retries only the part that failed, and the API completes the upload at the end. Check the maximum size your malware scanner handles: above it, a file must not become "clean" by default but go to review.
- **A regulated company with personal data in the EU.** Buckets in a European region encrypted with keys you manage, scanning as a gate, personal data detection before the content is indexed, and retention with scheduled deletion. Originals move to a cold tier early.
- **A customer who requires on-premises.** Ceph RGW on Rook, RabbitMQ, ClamAV with its own signature mirror and PaddleOCR on GPU nodes. What is a per-page bill in the cloud becomes capacity you size yourself, so the queue and depth-based scaling stop being optional.
- **Seasonal campaigns.** Tax returns, enrolments, quarter closes. The queue absorbs the peak and workers scale to zero off-season; watch the OCR service quotas, which usually bite before your compute does.

## How it fits together

1. The client asks the API for permission. The API authenticates, validates the declared type and size, creates a record in `pending` state and returns a short-lived signed URL for an object key it chooses (or, for multipart, an upload ID and one URL per part).
2. The client uploads the file straight to object storage. The API never sees the bytes.
3. Once the object exists, malware scanning inspects it. Until then the file cannot be read or served.
4. If it is clean, a "file clean" event is emitted (the GuardDuty or Defender result, or the copy to the clean bucket on GCP). If not, it goes to quarantine and the record becomes `rejected`.
5. The processor receives that event, downloads the file, checks its real type, calls OCR or the extraction service and stores the result and the new status in the database.

The client polls the status or is notified when it is done; it never waits on an open connection.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** Containers for the API, the S3-compatible store (Garage or MicroCeph; Garage supports presigned URLs but not bucket notifications, so the client confirms the upload to the API, which enqueues the job), `clamd` with `freshclam` pointed at your mirror, one or more workers and PostgreSQL. Volumes for storage data, ClamAV signatures and the database; Caddy or Traefik in front with TLS. Backups: `pg_dump` or pgBackRest plus bucket replication to another site. Good to start or for a small customer; there is no high availability.

**Kubernetes on-premises (k3s or RKE2).** Rook runs Ceph and RGW, the RabbitMQ Cluster Operator runs the queue, CloudNativePG the database with backups to object storage, cert-manager the certificates, and KEDA scales workers on pending messages, down to zero. If you use GPUs for OCR, add the NVIDIA GPU Operator and a separate tainted node pool.

**Cloud without Kubernetes.** The natural fit for this case: functions for the processor (Lambda, Azure Functions, Cloud Run functions) and, when OCR is heavy or your own, containers on ECS Fargate, Container Apps jobs or Cloud Run. Everything scales to zero and you pay per use.

**Managed Kubernetes (EKS, AKS, GKE).** Worth it if you already run a cluster, need GPUs with fine control or have high, steady volume: Karpenter or node pool autoscaling with Spot, KEDA reading SQS, Service Bus or Pub/Sub.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Compose on one host | Low | Medium | Manual | Pilot, small on-premises customer |
| Kubernetes on-premises | High | High | KEDA on queue | Sovereignty, high volume, own GPUs |
| Serverless / PaaS | Near zero | Low | Automatic, to zero | Default in the cloud |
| EKS / AKS / GKE | Medium | Medium-high | Nodes + KEDA | Existing cluster, GPUs, steady volume |

## Key decisions

- **Scan as a gate or in parallel.** The diagram puts scanning in front of the processor: work starts from the verdict, not from the upload. It adds some latency and keeps you from processing or serving an infected file. Scanning in parallel only pays off when processing is harmless and nobody else sees the file until the verdict is in.
- **Functions or containers.** Functions suit small files and API-based OCR. If processing is long, uses heavy libraries or needs a GPU, move to container workers reading from a queue.
- **Managed or self-hosted OCR.** Textract, Document Intelligence and Document AI ship models for tables, forms and invoices and bill per page. Tesseract or PaddleOCR have no per-use cost but do need compute, and quality on hard documents becomes your problem.
- **One bucket with prefixes or several buckets.** Separate upload, clean and quarantine buckets make permissions and lifecycle simpler; a single bucket is quicker to set up, but the policies end up fragile.
- **Single or multipart upload.** Below a few tens of MB, one signed URL is enough. Above that, multipart or resumable, with the API owning the upload ID and the completion step.

## Common pitfalls

- Signing long-lived URLs or letting the client pick the object key: it opens the door to overwriting other people's files.
- Trusting the extension or the `Content-Type` the client declares. Check the real type from the content in the processor.
- A non-idempotent processor. Events are delivered at least once: deduplicate on object key plus version or ETag.
- Treating "no scan result" as "clean": files that are too large, encrypted or failed to scan must go to review, not to the processor.
- Serving the original file from the application's domain without forcing `Content-Disposition: attachment`, which lets HTML or SVG with scripts slip through.
- Forgetting lifecycle rules: abandoned multipart uploads billed without being visible, uploads that were never confirmed and quarantine buckets that grow forever.
