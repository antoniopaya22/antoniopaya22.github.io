---
title: "Video and image processing"
short: "Video and images"
summary: "Direct uploads to storage with a signed URL, transcoding to HLS/DASH with a bitrate ladder, thumbnails, images resized on the fly and CDN delivery protected by signed URLs or DRM."
description: "Signed uploads, HLS/DASH transcoding, on-the-fly images, CDN with signed URLs and DRM: a reference architecture on AWS, Azure, GCP and on-premises."
order: 29
requirements:
  - "Original files never go through the API: they are uploaded straight to storage with a short-lived signed URL."
  - "Every video is transcoded to a bitrate ladder in HLS and DASH, with thumbnails and a job status you can query."
  - "Images are resized on demand and the result is cached; the origin only stores the original."
  - "Only entitled viewers can play content: signed URLs or cookies and, when the contract requires it, DRM."
  - "Cost per processed minute and per GB served is known and can be attributed to each customer or collection."
platforms:
  onprem:
    summary: "Ceph RGW for originals and renditions, GPU FFmpeg workers coordinated by RabbitMQ, imgproxy for images and Nginx with secure_link for delivery."
    notes:
      - "FFmpeg with NVENC (NVIDIA) or Quick Sync/VA-API (Intel) multiplies throughput over CPU for H.264 and HEVC, but at the same bitrate the software encoder usually gives better quality; measure with VMAF before deciding."
      - "Shaka Packager or FFmpeg itself produce HLS and DASH over shared CMAF segments: one set of segments serves both formats."
      - "Nginx's `secure_link` module validates an expiring hash in the URL; sign the video's directory prefix or you will have to sign every segment."
      - "imgproxy requires URLs signed with a key and salt: without signatures, anyone can request thousands of sizes and take the service down."
      - "The cost is hardware: GPUs sitting idle outside upload peaks, and egress bandwidth if there is no CDN in front."
  aws:
    summary: "S3 with presigned URLs, AWS Elemental MediaConvert triggered by events, EventBridge for job status, CloudFront with signed URLs or cookies and the Dynamic Image Transformation solution for images."
    notes:
      - "MediaConvert bills per output minute, with multipliers for resolution, codec, frame rate and quality mode; the Basic tier is cheaper than Professional if H.264 is enough."
      - "MediaConvert emits job state changes to EventBridge: there is no need to poll the API to find out when a job finishes."
      - "With steady volume, MediaConvert reserved queues give a fixed monthly price per slot with a 12-month commitment; they don't support some features such as AV1 or 8K."
      - "The former Serverless Image Handler is now called Dynamic Image Transformation for Amazon CloudFront: Lambda resizes with sharp and CloudFront caches; the Lambda variant is meant for images up to about 6 MB."
      - "For DRM, MediaConvert encrypts with keys obtained via SPEKE from a licence provider; CloudFront signs with key groups, not with the account root key."
  azure:
    summary: "Blob Storage with user delegation SAS, FFmpeg in Container Apps jobs triggered by Event Grid, imgproxy on Container Apps and Azure Front Door for delivery."
    notes:
      - "Azure Media Services was retired on 30 June 2024 and has no first-party replacement: Microsoft points to partners for encoding, packaging and DRM. FFmpeg on Container Apps is the option without third parties."
      - "Use event-driven Container Apps jobs (scaled by KEDA on a Storage queue fed by Event Grid) rather than an always-on app."
      - "Container Apps serverless GPUs are T4 and A100: the T4 has an NVENC encoder, the A100 does not, so for GPU transcoding pick T4 or stay on CPU."
      - "Front Door has no native URL signing (Microsoft lists it on its roadmap): validate a token or cookie in a function or at the origin, or pass the SAS in the query string knowing it fragments the cache."
      - "Turn off Front Door compression for `.m4s` and `.ts` segments and cache VOD manifests; live manifests, no."
  gcp:
    summary: "Cloud Storage with signed URLs, the Transcoder API triggered by Eventarc, Pub/Sub for status, imgproxy on Cloud Run and Media CDN with signed tokens."
    notes:
      - "The Transcoder API produces HLS and DASH, thumbnail sprite sheets and encryption for Widevine, FairPlay and PlayReady, but keys and licences come from an external DRM provider and are stored in Secret Manager."
      - "Each Transcoder job can publish its state to a Pub/Sub topic: that is the signal to mark the video as ready."
      - "Media CDN is enabled on request through Google's sales team and is designed for large volumes; for a modest catalogue, Cloud CDN with signed URLs or cookies is enough."
      - "Media CDN uses tokens signed with Ed25519 (or HMAC) and supports dual-token authentication; for DASH, only through cookies."
      - "imgproxy on Cloud Run scales to zero; put Cloud CDN in front with a long cache so each size is generated only once."
tiers:
  - name: "Small catalogue"
    when: "Internal training, product pages or an MVP with a few hundred videos and no DRM requirement."
    cost: 1
    ops: 1
    onprem: "One host with Docker Compose: MinIO or Ceph RGW, a CPU FFmpeg worker, imgproxy and Nginx with secure_link."
    aws: "S3, MediaConvert Basic with a short H.264 ladder, Lambda to submit jobs and CloudFront with signed URLs."
    azure: "Blob Storage, a Container Apps job running FFmpeg on CPU, imgproxy on Container Apps and Front Door Standard."
    gcp: "Cloud Storage, the Transcoder API with a preset, imgproxy on Cloud Run and Cloud CDN with signed URLs."
    tradeoffs: "No DRM and no dynamic packaging: content can be downloaded with some effort and every format change means re-transcoding."
  - name: "Professional video on demand"
    when: "A course or media platform with thousands of videos, playback on browser, mobile and smart TV, and subscription access."
    cost: 2
    ops: 2
    onprem: "Kubernetes with GPU FFmpeg workers scaled by KEDA on the queue, Shaka Packager for CMAF and an Nginx cache in front of storage."
    aws: "MediaConvert Professional with automated ABR ladders, EventBridge, CloudFront with signed cookies and Origin Shield."
    azure: "Container Apps jobs on a T4 GPU profile, Event Grid, Front Door Premium with token validation at the origin."
    gcp: "Transcoder API with custom templates, Pub/Sub for status, Cloud CDN or Media CDN with tokens."
    tradeoffs: "More formats and more renditions per video: transcoding and storage cost grow with every rung on the ladder."
  - name: "Premium content with DRM"
    when: "Premieres, sports or licensed catalogues whose contracts require multi-DRM and delivery at large scale."
    cost: 4
    ops: 3
    onprem: "A GPU encoding farm, packaging with CENC encryption, a DRM provider's licence server and several commercial CDNs in front."
    aws: "MediaConvert with SPEKE, AWS Elemental MediaPackage for just-in-time packaging and DRM, CloudFront plus a second CDN."
    azure: "Encoding and DRM from a partner in the Azure catalogue, Blob Storage as origin and Front Door alongside another CDN."
    gcp: "Transcoder API with encryption and keys in Secret Manager, an external DRM provider and Media CDN."
    tradeoffs: "DRM licences per playback or per device, provider integration and testing on every player family."
extensions:
  - name: "Malware scanning of uploads"
    when: "When anonymous or external users upload files before they are processed."
    cost: "low"
    onprem: "ClamAV"
    aws: "GuardDuty Malware Protection for S3"
    azure: "Defender for Storage"
    gcp: "ClamAV on Cloud Run"
  - name: "Automatic subtitles"
    when: "Mandatory accessibility or search inside videos."
    cost: "medium"
    onprem: "Whisper on GPU"
    aws: "Amazon Transcribe"
    azure: "Azure AI Speech"
    gcp: "Speech-to-Text"
  - name: "Tagging and moderation"
    when: "User-generated content that must be reviewed or catalogued."
    cost: "medium"
    onprem: "Your own models on GPU"
    aws: "Amazon Rekognition"
    azure: "Azure AI Video Indexer"
    gcp: "Video Intelligence API"
  - name: "Live streaming"
    when: "Live events or classes on top of the on-demand catalogue."
    cost: "high"
    onprem: "SRS or Nginx RTMP"
    aws: "MediaLive + MediaPackage"
    azure: "Partner (no first-party service)"
    gcp: "Live Stream API"
  - name: "Just-in-time packaging"
    when: "When storing HLS and DASH separately doubles storage, or DRM must change without re-transcoding."
    cost: "medium"
    onprem: "nginx-vod-module"
    aws: "AWS Elemental MediaPackage"
    azure: "A partner's packager"
    gcp: "Shared CMAF segments"
  - name: "Origin shield"
    when: "When many CDN regions request the same objects from storage at the same time."
    cost: "low"
    onprem: "Mid-tier Nginx cache"
    aws: "CloudFront Origin Shield"
    azure: "Own Nginx cache in front of Blob"
    gcp: "Media CDN origin shielding"
savings:
  - "Only transcode what gets watched: produce the most-used rungs up front and generate the rare ones (4K, high bitrates) the first time someone asks for them."
  - "Use the MediaConvert Basic tier for H.264 and keep Professional (HEVC, AV1, HDR) for content that needs it; with steady volume, compare against reserved queues."
  - "Run FFmpeg workers on Spot, Azure Spot VMs or preemptible nodes: a transcoding job can be retried from the start."
  - "Move originals to Glacier, Cold/Archive or Coldline after publishing; they are only needed to re-transcode, which is rare."
  - "The big bill is usually CDN egress, not transcoding: HEVC or AV1 cut GB served for devices that support them, and the top rung is only served to viewers with the bandwidth for it."
  - "For images, normalise allowed sizes (a closed list of widths) to maximise cache hits and stop every combination from triggering a new transformation."
---

## When you need it

When your product receives or serves video and images at scale: a course platform, a marketplace with product photos, an internal social network, a local broadcaster publishing its archive. Serving an MP4 from a bucket works until users are on mobile with poor coverage, the video weighs gigabytes or the contract says nobody may download it. At that point you need to transcode to adaptive streaming, generate thumbnails, resize images without storing a hundred variants and protect delivery.

## Scenarios

### Marketplace product photos

Images only, lots of them, in unpredictable sizes. Signed uploads, an on-the-fly image service with URL signing and a CDN that caches every variant are enough. The critical part is fixing a closed list of sizes and formats (WebP, AVIF) and not letting the client ask for any combination.

### Training platform

Thousands of medium-length videos, playback in browser and on mobile, subscription access. A four- or five-rung H.264 ladder, HLS over CMAF segments, thumbnails for the player and signed cookies so access is checked once per session rather than per segment.

### Media company with licensed third-party content

The contract requires DRM: Widevine for Chrome and Android, FairPlay for Apple, PlayReady for smart TVs and Windows. Transcoding encrypts with keys supplied by a licence provider; the player requests the licence from that provider. Cost changes (licences per playback) and so does test effort.

### Public body that mandates on-premises

FFmpeg, Shaka Packager, imgproxy and Nginx cover the whole flow with no managed services. The real decision is the GPU: it pays off with sustained volume; for occasional uploads, CPU and patience.

## How it fits together

The client asks the API for a signed upload URL and uploads the original straight to storage; the API never touches the bytes. Large files use multipart, resumable uploads.

The new object raises an event. If it is an image, nothing else happens: the on-the-fly image service reads the original when someone requests a specific size, transforms it and the CDN keeps the result. If it is a video, the event starts a transcoding job: it decodes the original, produces the bitrate ladder (for example from 360p to 1080p, each rung with its own bitrate), segments into CMAF, writes HLS and DASH manifests, and extracts thumbnails and a sprite for player scrubbing.

The job publishes its state changes (queued, in progress, complete, error) on the event bus; a consumer updates the catalogue database and marks the video as publishable. Renditions are written to a different prefix or bucket, separate from originals and with their own lifecycle.

The CDN serves manifests and segments with long cache lifetimes, because VOD does not change. Access control lives at the CDN: a signed URL for the manifest and a signed cookie or token for segments, with short expiry. With DRM, segments are encrypted and the key only reaches the player through the licence server.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** MinIO or Ceph RGW (or an external bucket), RabbitMQ, one or two worker containers with FFmpeg (with the NVIDIA runtime if there is a GPU), imgproxy and Nginx with `secure_link` and an on-disk cache. Back up only the originals; renditions can be regenerated.

**Kubernetes on-premises.** k3s or RKE2 with the NVIDIA GPU Operator to expose GPUs, workers as Jobs or Deployments scaled by KEDA on RabbitMQ queue length (to zero when there is no work), Ceph with Rook for storage, imgproxy with an HPA and cert-manager for TLS. Taint the GPU nodes so only workers land on them.

**Cloud without Kubernetes.** The natural path is a per-minute managed service (MediaConvert, Transcoder API) triggered by events; on Azure, Container Apps jobs running FFmpeg. Images on Lambda, Container Apps or Cloud Run scaling to zero. No servers to maintain and cost proportional to volume.

**Managed Kubernetes.** EKS, AKS or GKE with Spot GPU node pools and queue-based scaling pay off with high, continuous volume, when a managed service's per-minute price exceeds the cost of keeping GPUs busy, or when you need custom encoders or filters.

| Option | Fixed cost | Operations | Scaling | When |
|---|---|---|---|---|
| Docker Compose | One host, maybe with a GPU | Medium | Manual | Small on-premises catalogue |
| Kubernetes on-premises | Your own GPU nodes | High | KEDA on the queue | Sustained on-premises volume |
| Per-minute managed service | Near zero | Low | Automatic | Cloud default |
| EKS, AKS, GKE with GPUs | Nodes and control plane | High | Queue-based, Spot nodes | High, continuous volume |

## Key decisions

- **Managed service or your own FFmpeg.** The managed service charges per output minute with no fixed cost; your own FFmpeg only pays off with high volume and a team to maintain it.
- **GPU or CPU.** GPUs encode much faster and make each minute cheaper at volume; CPUs give better quality per bit and cost nothing when idle. Measure with VMAF before choosing.
- **Pre-packaged or just-in-time.** Storing ready-made HLS and DASH is simple; packaging on the fly saves storage and lets you change DRM without re-transcoding, at the cost of another component.
- **Signed URL or signed cookie.** Signing every segment fragments the cache and complicates the player; validate on the manifest and issue a cookie or prefix token for the segments.
- **DRM only if the contract asks for it.** Signed URLs stop hotlinking, not copying; DRM makes copying harder but adds licences and per-device testing.

## Common pitfalls

- Uploading videos through the API and exhausting memory and timeouts.
- Leaving imgproxy or the image handler without URL signing and opening the door to a cost attack.
- One fixed ladder for the whole catalogue: a simple animation and a football match don't need the same bitrates.
- Caching live manifests as if they were VOD.
- Keeping originals and renditions in the same storage class forever.
- Forgetting CORS on the CDN and discovering the web player cannot load segments.
- Not recording each job's status and not knowing which videos failed until a user reports it.
