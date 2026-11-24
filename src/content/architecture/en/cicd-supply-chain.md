---
title: "CI/CD and the software supply chain"
short: "CI/CD & supply chain"
summary: "Make sure only images built by your pipeline from reviewed code, scanned, signed and with verifiable provenance reach production, and that the pipeline holds no key worth stealing."
description: "Secure CI/CD: SHA-pinned actions, keyless OIDC, SBOM, scanning, signing, SLSA provenance and signed-image admission on AWS, Azure, GCP and on-premises."
order: 21
requirements:
  - "Every change enters through a pull request to a protected branch with mandatory review and required checks."
  - "Third-party actions are pinned to a commit and the workflow token has the minimum permissions."
  - "The pipeline gets short-lived credentials through OIDC; no cloud keys are stored as secrets."
  - "Every image has an SBOM, scan result, signature and provenance attached to its digest."
  - "The runtime rejects images without a valid signature or from an unauthorised registry."
  - "Dependencies and actions are updated continuously and through review."
platforms:
  onprem:
    summary: "GitHub Actions builds and generates the SBOM, Harbor stores images and scans them with Trivy, cosign signs with transparency in Rekor, and Kyverno only admits into Kubernetes images signed by the pipeline's identity."
    notes:
      - "Harbor can block pulls of images without a cosign signature or with vulnerabilities above a severity, per project: a second barrier on top of admission."
      - "Keyless cosign uses the workflow's OIDC identity as the signer; the Kyverno policy checks the issuer and `subject` (repository and workflow), not a public key."
      - "On an isolated network there is no public Rekor or Fulcio: either run your own or sign with a key held in OpenBao or an HSM and verify with that key."
      - "Trivy in the pipeline fails fast; registry scanning catches CVEs published after the build."
      - "The cost is operations: Harbor with its database and storage, keeping the vulnerability database fresh and maintaining the Kyverno policies."
  aws:
    summary: "GitHub Actions signs in through the IAM OIDC provider, pushes to Amazon ECR, Amazon Inspector scans continuously, AWS Signer signs with Notation and Kyverno on EKS verifies the signature before admitting the pod."
    notes:
      - "AWS Signer container signing uses Notation (the CLI plus the AWS Signer plugin); since November 2025, ECR managed signing signs automatically on push with a Signer profile."
      - "Verification is not built into EKS: you need Kyverno (or Ratify with Gatekeeper) configured with the AWS Signer trust, including revocation checks."
      - "ECR enhanced scanning is Amazon Inspector: it re-evaluates images when new CVEs appear and is billed per image scanned and rescanned."
      - "ECS and Lambda have no signature-based admission for images (Lambda code signing only covers zip packages): there, verification lives in the pipeline, before deploying by digest."
      - "The CI role that pushes images only needs write access to its ECR repository; signing and deploying can be separate roles."
  azure:
    summary: "GitHub Actions signs in with federated credentials, pushes to Azure Container Registry, signs with Notation and a Key Vault certificate, Defender for Containers scans and blocks on vulnerabilities, and AKS verifies signatures with Ratify."
    notes:
      - "Notation signs through the Azure Key Vault plugin; the certificate and its private key never leave Key Vault and the CI identity only needs permission to sign."
      - "AKS Image Integrity (Ratify managed through Azure Policy) is still in preview, supports only the Audit effect and Microsoft does not recommend it for production: it logs, it does not block."
      - "To actually block, install Ratify with Gatekeeper yourself, or Kyverno with Notary verification, pointing at the Key Vault certificates."
      - "Defender for Containers gated deployment is GA and can deny images based on their vulnerability findings, starting in audit mode; it requires Kubernetes 1.31 or later and does not verify signatures."
      - "Defender for Containers is billed per core of the protected clusters; ACR retention of untagged manifests requires the Premium tier."
  gcp:
    summary: "GitHub Actions signs in through Workload Identity Federation, pushes to Artifact Registry, Artifact Analysis scans on push and continuously, the pipeline creates an attestation signed with Cloud KMS, and Binary Authorization only admits attested images into GKE and Cloud Run."
    notes:
      - "Binary Authorization is enforced at deploy time on GKE and Cloud Run: the policy requires attestations from one or more attestors, and each attestor verifies with a Cloud KMS key."
      - "The CI job signs the digest attestation with the KMS key; its identity only needs the signer role on that key and permission to attach occurrences."
      - "The continuous validation SLSA check only trusts Cloud Build as a builder: with GitHub Actions use your own attestations, not that check."
      - "Artifact Analysis bills per image scanned; Artifact Registry cleanup policies cut both storage and scans."
      - "Use the policy's dry-run mode to see what it would reject before enforcing it."
tiers:
  - name: "Hardened pipeline"
    when: "A small team deploying to a PaaS or a single host that wants to close the most exploitable gaps without new infrastructure."
    cost: 1
    ops: 1
    onprem: "SHA-pinned actions, Trivy in CI failing on criticals, SBOM as an artifact and deployment by digest with Compose from Harbor."
    aws: "OIDC with a role scoped to the repository, ECR basic scanning and deployment to ECS or Lambda by digest."
    azure: "Federated credentials, Trivy in CI, ACR and deployment to Container Apps by digest."
    gcp: "Workload Identity Federation, Artifact Analysis scanning and deployment to Cloud Run by digest."
    tradeoffs: "Nothing stops someone with permissions from deploying an image that did not come from the pipeline; you rely on deploy access being tightly locked."
  - name: "Signing and admission"
    when: "Several teams and a production cluster where only images from the official pipeline should run."
    cost: 2
    ops: 2
    onprem: "Keyless cosign with Rekor, Harbor with mandatory signatures and Kyverno in enforce mode in production."
    aws: "AWS Signer with ECR managed signing, Inspector and Kyverno on EKS verifying the Signer trust."
    azure: "Notation with a Key Vault certificate, Defender for Containers, and Ratify with Gatekeeper installed on AKS."
    gcp: "Attestations with Cloud KMS and Binary Authorization in enforce mode on GKE and Cloud Run."
    tradeoffs: "A badly written policy stops deployments; you need a documented break-glass path and to start in audit mode."
  - name: "Fully verifiable chain"
    when: "A regulated sector or software you ship to third parties that must prove how it was built."
    cost: 3
    ops: 3
    onprem: "Build in an isolated reusable workflow, provenance and SBOM attestations verified by Kyverno, your own dependency mirror and internal Fulcio and Rekor."
    aws: "All of the above plus ECR pull-through cache, CodeArtifact as a mirror and continuous rescanning of what runs on EKS."
    azure: "All of the above plus ACR artifact cache, Azure Artifacts and gated deployment in deny mode."
    gcp: "All of the above plus Artifact Registry remote repositories and separate attestors for build, scan and approval."
    tradeoffs: "Longer pipelines and more parts to maintain; worth it when a customer or auditor asks for the provenance of every release."
extensions:
  - name: "Dependency mirror"
    when: "When you do not want a build to depend on Docker Hub, npm or PyPI at the moment it runs."
    cost: "medium"
    onprem: "Harbor proxy cache + Nexus"
    aws: "ECR pull-through + CodeArtifact"
    azure: "ACR artifact cache"
    gcp: "Artifact Registry remote repositories"
  - name: "Vulnerability blocking"
    when: "When, besides the signature, you want to stop images with known critical CVEs from being deployed."
    cost: "medium"
    onprem: "Harbor: block by severity"
    aws: "Kyverno + scan attestation"
    azure: "Defender gated deployment"
    gcp: "Attestor after Artifact Analysis"
  - name: "Code and secret scanning"
    when: "Whenever the repository holds your own code; it stops credential leaks before the merge."
    cost: "low"
    onprem: "Semgrep + gitleaks"
    aws: "CodeQL + secret scanning"
    azure: "CodeQL + secret scanning"
    gcp: "CodeQL + secret scanning"
  - name: "Ephemeral self-hosted runners"
    when: "When the build needs a private network, large machines, or cannot run on shared runners."
    cost: "medium"
    onprem: "Actions Runner Controller (k3s)"
    aws: "CodeBuild runners or ARC on EKS"
    azure: "Container Apps jobs or ARC on AKS"
    gcp: "ARC on GKE"
  - name: "Rescanning what is running"
    when: "When you need to know which running containers are affected by a CVE published today."
    cost: "low"
    onprem: "Trivy Operator"
    aws: "Inspector (continuous scanning)"
    azure: "Defender: running containers"
    gcp: "Continuous Artifact Analysis"
savings:
  - "Build once and promote the same digest across environments instead of rebuilding per environment: you save runner minutes and guarantee that what was signed is what gets deployed."
  - "Apply lifecycle rules (ECR lifecycle policies, ACR retention and purge, Artifact Registry cleanup policies) to untagged and old images; besides storage, Inspector and Artifact Analysis bill per image scanned."
  - "Scope ECR enhanced scanning with repository filters to the images you deploy and keep Trivy in CI, which has no licence cost, for pull requests."
  - "Use `concurrency` with `cancel-in-progress` and path filters so you do not run duplicate pipelines or pipelines for parts that did not change; hosted runner minutes are billed on private repositories."
  - "Cache Docker layers and dependencies (`actions/cache`, buildx cache) and group Dependabot updates so each library bump does not trigger a full pipeline."
  - "Enable Defender for Containers only on subscriptions whose clusters need it: it is billed per protected core."
---

## When you need it

When the pipeline has more power than anyone on the team. It builds the code, holds deployment credentials and decides what reaches production, yet it is often built from third-party actions referenced by tag, a token with write permissions by default and cloud keys stored as secrets. Recent supply chain attacks do not break the application: they compromise an action, a dependency or the runner, and from there publish an image that looks legitimate.

This case closes three doors: what code goes into the build, what credentials the pipeline holds, and how the runtime knows an image came from that pipeline.

## Scenarios

- **Startup deploying to a PaaS.** The "Hardened pipeline" tier removes most of the risk in an afternoon: SHA-pinned actions, `permissions: contents: read` at the top, OIDC instead of keys and deployment by digest. Signing can wait until there is a cluster.
- **Company with several teams and shared Kubernetes.** Signature-based admission becomes essential: anyone with cluster access could deploy an image from Docker Hub. Each team signs with its pipeline's identity and the admission policy requires that identity per namespace.
- **Regulated sector.** The auditor will ask which dependencies the release deployed on a given date contained and who approved the change. SBOM and provenance attached to the digest, attestation retention and blocking on critical vulnerabilities.
- **Product shipped to customers.** Signatures and SBOM travel with the product; the customer verifies with your public key or signing identity before installing. It fits the disconnected deployment case.
- **Open source project.** GitHub artifact attestations and keyless cosign signing let any user verify provenance without you managing keys.

## How it fits together

1. **Pull request to the protected branch.** Mandatory review and required checks. Dependabot opens pull requests for dependencies, base images and actions; for actions it updates both the SHA and the version comment.
2. **CI: tests and SBOM.** The workflow uses actions pinned to a full SHA (an organisation policy can enforce this since August 2025, and workflow lockfiles, GA since October 2026, also pin the transitive dependencies of composite actions). The token starts with `contents: read` and only the job that needs it gets `id-token: write`. It generates the SBOM and runs the scan; a critical CVE stops things here.
3. **Short-lived credentials.** The job requests an OIDC token and the cloud's federation (or OpenBao) returns credentials valid for minutes, scoped to the repository and branch.
4. **Registry.** The image is pushed and identified by digest. The registry rescans it when new CVEs appear.
5. **Signing and provenance.** The digest is signed and attestations are attached: SLSA provenance (GitHub artifact attestations reach SLSA Build level 2, level 3 when the build runs in an isolated reusable workflow) and the SBOM.
6. **Admission.** Before the pod is created, the policy verifies signature and issuer. Only then does the runtime pull the image from the registry and run it.

## Deployment: Docker, Kubernetes or serverless

- **Docker Compose on one host.** There is no admission controller: the deploy script runs `cosign verify` (or `notation verify`) on the digest, and only if it passes does it update `compose.yaml` with that digest and run `docker compose pull` and `up -d`. Harbor with mandatory signatures adds a second barrier.
- **Kubernetes on-premises.** Kyverno with `verifyImages` rules in enforce mode for production namespaces, checking signature, issuer and attestations; Trivy Operator rescans what is running. Start in Audit and review the reports before blocking.
- **Cloud without Kubernetes.** Cloud Run supports Binary Authorization just like GKE. ECS and Container Apps do not verify signatures at deploy time: verification lives in the pipeline, deployment always uses a digest and only the CI identity holds deploy permission.
- **Managed Kubernetes.** EKS with Kyverno or Ratify and the AWS Signer trust; AKS with Ratify and Gatekeeper or Kyverno installed by you (Image Integrity only audits) plus Defender gated deployment for vulnerabilities; GKE with Binary Authorization.

| Option | Where it is verified | Blocks? | When |
|---|---|---|---|
| Compose on one host | Deploy script | Yes, if the script fails | One server or an on-premises product |
| Self-managed Kubernetes | Kyverno | Yes | Shared clusters outside the cloud |
| PaaS / functions | Pipeline (Cloud Run: Binary Authorization) | Only on Cloud Run | No Kubernetes |
| Managed Kubernetes | Kyverno, Ratify or Binary Authorization | Yes | EKS, AKS or GKE |

## Key decisions

- **Key-based or keyless signing.** Keyless (cosign with OIDC) avoids managing secrets and ties the signature to the workflow, but depends on Fulcio and Rekor. A key in KMS, Key Vault or Signer works on isolated networks and fits Notation; the key becomes another asset to protect and rotate.
- **Cosign or Notation.** Cosign dominates in Kubernetes and open source; Notation is the native path for AWS Signer and Azure. Kyverno verifies both, so your cloud's signing service usually decides.
- **Where to block on vulnerabilities.** CI fails fast but only knows today's CVEs; admission protects new deployments of old images. Do not block in both places with different thresholds.
- **What to pin.** SHA for actions, digest for images and a lockfile for dependencies. A tag can move; a SHA cannot.

## Common pitfalls

- Pinning top-level actions and forgetting that a composite action can call others by tag.
- Leaving the default `GITHUB_TOKEN` permission at write, or granting `id-token: write` to the whole workflow.
- Signing the tag instead of the digest, or deploying by tag after verifying the digest.
- Enabling Image Integrity on AKS believing it blocks: it only audits.
- Admission policies with no exception for the cluster's system images: the next upgrade gets stuck.
- Generating an SBOM and not storing it next to the digest: when a CVE lands, nobody knows which releases contain it.
