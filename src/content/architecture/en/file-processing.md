---
title: "File upload and processing"
short: "File uploads"
summary: "Accept files from users without routing them through the API, check them for malware and extract their content asynchronously, with a status the user can follow."
description: "Direct upload with signed URLs, malware scanning, OCR and event-driven processing: a reference architecture on AWS, Azure, GCP and on-premises."
order: 4
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
      - "Textract has synchronous and asynchronous APIs; for multi-page PDFs use the asynchronous one with an SNS notification instead of waiting inside the Lambda, which has a 15-minute limit."
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
---

## When you need it

When users upload files (invoices, contracts, ID documents, photos) and something has to happen to them. Sending the file through the API is the version that works in the demo: it ties up backend memory and connections, runs into request size limits on the load balancer or serverless platform, and mixes upload, analysis and response into a single request. This pattern separates the three and lets object storage do what it does best.

## How it fits together

1. The client asks the API for permission. The API authenticates, validates the declared type and size, creates a record in `pending` state and returns a short-lived signed URL for an object key it chooses.
2. The client uploads the file straight to object storage. The API never sees the bytes.
3. Once the object exists, malware scanning inspects it.
4. If it is clean, a "file clean" event is emitted (the GuardDuty or Defender result, or the copy to the clean bucket on GCP).
5. The processor receives that event, downloads the file, calls OCR or the extraction service and stores the result and the new status in the database.

The client polls the status or is notified when it is done; it never waits on an open connection.

## Key decisions

- **Scan as a gate or in parallel.** The diagram puts scanning in front of the processor: work starts from the verdict, not from the upload. It adds some latency and keeps you from processing an infected file. Scanning in parallel only pays off when processing is harmless and latency rules.
- **Functions or containers.** Functions suit small files and API-based OCR. If processing is long, uses heavy libraries or needs a GPU, move to container workers reading from a queue.
- **Managed or self-hosted OCR.** Textract, Document Intelligence and Document AI ship models for tables, forms and invoices and bill per page. Tesseract or PaddleOCR have no per-use cost but do need compute, and quality on hard documents becomes your problem.
- **One bucket with prefixes or several buckets.** Separate upload, clean and quarantine buckets make permissions and lifecycle simpler; a single bucket is quicker to set up, but the policies end up fragile.

## Common pitfalls

- Signing long-lived URLs or letting the client pick the object key: it opens the door to overwriting other people's files.
- Trusting the extension or the `Content-Type` the client declares. Check the real type from the content in the processor.
- A non-idempotent processor. Events are delivered at least once: deduplicate on object key plus version or ETag.
- Serving the original file from the application's domain without forcing `Content-Disposition: attachment`, which lets HTML or SVG with scripts slip through.
- Forgetting lifecycle rules: uploads that were never confirmed and quarantine buckets that grow forever.
