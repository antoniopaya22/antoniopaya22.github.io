---
title: "Identity and access: people, workloads and keyless CI"
short: "Keyless identity"
summary: "Let people, pipelines and applications reach the cloud with federated identities and short-lived credentials, with no static keys stored anywhere, temporary privileges and everything audited."
description: "Keyless identity for people, OIDC-based CI and workloads: SSO, MFA, just-in-time access and audit on AWS, Azure, GCP and on-premises."
order: 14
requirements:
  - "No person, pipeline or application uses long-lived access keys."
  - "People sign in through SSO with MFA and get permissions by group; production privileges are temporary."
  - "The pipeline only gets credentials for its repository, branch and workflow, and the deploy identity cannot widen its own permissions."
  - "Every workload has its own identity with the permissions it uses, and secrets are read at runtime."
  - "There is a tested emergency access path that does not depend on the IdP, and using it raises an alert."
  - "Every action on resources lands in an audit log that workload administrators cannot delete."
platforms:
  onprem:
    summary: "Keycloak is the IdP with MFA, groups map to Kubernetes RBAC, OpenBao accepts GitHub Actions OIDC tokens and issues dynamic secrets, SPIFFE/SPIRE gives workloads an identity and Wazuh centralises the audit trail."
    notes:
      - "OpenBao (the open fork of Vault) validates the GitHub token with its `jwt` auth method against the `token.actions.githubusercontent.com` issuer; conditions go in `bound_claims` (repository, branch, environment)."
      - "Dynamic secrets (database engine, PKI) expire on their own: a leaked credential stops working in minutes or hours, not months."
      - "SPIRE issues X.509 or JWT SVIDs per workload; OpenBao can accept JWT-SVIDs to hand out secrets with no bootstrap secret in the container."
      - "There is no native just-in-time access: approximate it with Keycloak groups granted for a limited time and short-TTL OpenBao credentials."
      - "The cost is operations: Keycloak and OpenBao in high availability, OpenBao unsealing, SPIRE CA rotation and someone maintaining the policies."
  aws:
    summary: "IAM Identity Center federates with the corporate IdP and assigns permission sets by group, GitHub Actions assumes IAM roles through the OIDC provider, EKS Pod Identity gives each pod a role and an organisation CloudTrail records everything."
    notes:
      - "Permission sets are standing assignments, not temporary access. For time-bound elevation with approval, AWS points to partners integrated with Identity Center or its open-source TEAM solution (Temporary Elevated Access Management)."
      - "The `plan` role trusts only the repository's `pull_request` event (by name and immutable ID) and only reads; the `apply` role requires the protected environment, the `main` branch and the workflow file (`job_workflow_ref`), and carries a permissions boundary that stops it from touching the CI roles, the OIDC provider and the state bucket."
      - "EKS Pod Identity needs no per-cluster OIDC provider and one trust policy serves several clusters; it does not work on Fargate, Windows, Outposts or EKS Anywhere, where IRSA is still the answer."
      - "Centralised root access management lets you remove root credentials from member accounts; emergency access is left to a few identities with hardware MFA and an alarm on every use."
      - "Identity Center and IAM roles cost nothing; Secrets Manager bills per secret and per call, and CloudTrail beyond the first copy of management events and for data events."
  azure:
    summary: "Microsoft Entra ID is the IdP with Conditional Access, Entra PIM makes Azure roles eligible with time-bound activation, GitHub Actions signs in with federated credentials on managed identities and AKS uses Workload Identity with Key Vault."
    notes:
      - "PIM requires Microsoft Entra ID P2 or Entra ID Governance licences for the people who elevate or approve; it supports maximum duration, justification, approval and MFA on activation."
      - "Each federated credential matches one specific `subject` (`repo:org/repo:pull_request`, `repo:org/repo:environment:prod`), so plan and apply are two separate managed identities with different roles."
      - "The apply identity should not hold unrestricted `Owner` or `User Access Administrator`: if it must assign roles, use `Role Based Access Control Administrator` with conditions that limit which roles it can assign and to whom."
      - "AKS Workload Identity federates the Kubernetes service account with a managed identity; the pod gets Entra tokens with no mounted secrets."
      - "The Activity Log is kept for 90 days at no cost; sending it to Log Analytics or Storage for longer retention is billed by ingestion and storage."
  gcp:
    summary: "Cloud Identity (or federation with the corporate IdP) authenticates people, Privileged Access Manager grants temporary roles, Workload Identity Federation exchanges the GitHub token for a service account and GKE gives each pod its own identity."
    notes:
      - "Privileged Access Manager works with entitlements at organisation, folder or project level: a grant adds a conditional IAM binding that expires on its own, with optional approval and a record in Cloud Audit Logs."
      - "The Workload Identity Federation provider must carry an attribute condition on `repository_id` and `repository_owner_id`; without it, any GitHub repository could present a valid token."
      - "Workload Identity Federation for GKE (formerly GKE Workload Identity) lets you grant roles directly to the Kubernetes service account principal, with no intermediate Google service account."
      - "To stop apply from widening itself, the CI service accounts live in a separate project where apply has no IAM roles; an IAM deny policy reinforces the boundary."
      - "Admin Activity logs are free and always on; Data Access logs are off by default (except BigQuery) and billed by volume once enabled."
tiers:
  - name: "Small team"
    when: "One or two accounts or subscriptions, one infrastructure repository and a handful of administrators."
    cost: 1
    ops: 1
    onprem: "Keycloak with WebAuthn, groups mapped to Kubernetes RBAC and a single-node OpenBao with JWT auth for GitHub Actions."
    aws: "IAM Identity Center with two or three permission sets, the GitHub OIDC provider with plan and apply roles, and task roles or Pod Identity for workloads."
    azure: "Entra ID with Conditional Access and MFA, two managed identities with federated credentials for plan and apply, and Key Vault."
    gcp: "Cloud Identity with groups, one Workload Identity Federation pool with two service accounts, and Secret Manager."
    tradeoffs: "Administrators hold standing privileges and audit stays in the native service without correlation; acceptable while the team is small and everyone knows each other."
  - name: "Organisation with separate environments"
    when: "Several teams, production in its own accounts or subscriptions, and a duty to prove who changed what."
    cost: 2
    ops: 2
    onprem: "Highly available Keycloak federated with the directory, clustered OpenBao with dynamic secrets and SPIRE for workloads."
    aws: "Identity Center with IdP groups through SCIM, temporary access with TEAM or a partner, CI roles per account and an organisation CloudTrail in the log archive account."
    azure: "Entra PIM for production roles, Workload Identity on AKS and the Activity Log of every subscription in a central Log Analytics workspace."
    gcp: "Privileged Access Manager for production, Workload Identity Federation per environment and an organisation log sink."
    tradeoffs: "More moving parts and licences (PIM needs P2 or Governance); temporary access adds friction during incidents if approvals are not well designed."
  - name: "Regulated environment"
    when: "Sensitive data, external audits and mandatory phishing-resistant MFA and access reviews."
    cost: 3
    ops: 3
    onprem: "Mandatory passkeys or FIDO2 keys in Keycloak, OpenBao backed by an HSM, SPIRE federated across clusters and Wazuh shipping to a SIEM with immutable retention."
    aws: "All of the above plus FIDO2 keys at the IdP, IAM Access Analyzer for unused permissions, GuardDuty and logs in S3 with Object Lock."
    azure: "All of the above plus mandatory passkeys, ID Governance Access Reviews, Entra ID Protection and Microsoft Sentinel."
    gcp: "All of the above plus mandatory security keys, IAM recommendations, Security Command Center and log buckets with a retention lock."
    tradeoffs: "Licence and SIEM costs, and a review process someone has to run every quarter; in return, audit stops being a manual search."
extensions:
  - name: "Approval-based temporary access"
    when: "When nobody should hold write permissions in production outside a change or an incident."
    cost: "medium"
    onprem: "Temporary groups + OpenBao TTLs"
    aws: "TEAM or partner with Identity Center"
    azure: "Entra PIM with approval"
    gcp: "Privileged Access Manager"
  - name: "Phishing-resistant MFA"
    when: "Always for administrators; for everyone once there is sensitive data."
    cost: "low"
    onprem: "Keycloak WebAuthn / passkeys"
    aws: "FIDO2 at the IdP or Identity Center"
    azure: "Passkeys (FIDO2) in Entra ID"
    gcp: "Security keys / passkeys"
  - name: "Passwordless database credentials"
    when: "When applications currently keep a database username and password in a secret."
    cost: "low"
    onprem: "OpenBao database engine"
    aws: "IAM authentication on Aurora"
    azure: "Entra auth on PostgreSQL"
    gcp: "IAM authentication on Cloud SQL"
  - name: "Identity for machines outside the cloud"
    when: "Servers in the data centre or another cloud that use static keys to call the cloud today."
    cost: "low"
    onprem: "SPIRE agents on the VMs"
    aws: "IAM Roles Anywhere"
    azure: "Azure Arc-enabled servers"
    gcp: "Workload Identity Fed. with X.509"
  - name: "Identity abuse detection"
    when: "When you need to hear about an impossible-travel sign-in or a role used from an odd IP without reading logs by hand."
    cost: "medium"
    onprem: "Wazuh rules + SIEM"
    aws: "Amazon GuardDuty"
    azure: "Entra ID Protection"
    gcp: "Security Command Center"
  - name: "Unused permission review"
    when: "When roles grow by accretion and nobody knows which permissions are still needed."
    cost: "low"
    onprem: "Keycloak group report"
    aws: "IAM Access Analyzer"
    azure: "Access Reviews (ID Governance)"
    gcp: "IAM recommendations"
savings:
  - "Centralise human access in IAM Identity Center, Entra ID or Cloud Identity and remove IAM users and local accounts: SSO is not billed separately and every local user is one more secret to rotate."
  - "Assign Entra ID P2 or ID Governance licences only to people with eligible PIM roles or who approve them, not to the whole workforce."
  - "Use workload identity against the target service (IAM database authentication, managed identity to Storage) instead of storing secrets: Secrets Manager and Secret Manager bill per secret and per access, Key Vault per operation."
  - "Cache secrets in the application or with the OpenBao agent instead of reading them on every request; per-call cost and latency drop together."
  - "Enable only the CloudTrail data events and Cloud Audit Logs Data Access logs you will actually look at (state buckets, secrets, sensitive data); turning them on for everything multiplies the volume."
  - "Move old audit logs to cold storage (S3 Glacier, Blob Storage archive tier, Cloud Storage Archive class) and keep only the investigation window in the SIEM."
---

## When you need it

When someone finds an access key in a `.env` file, in a GitHub secret nobody remembers creating or on a former employee's laptop. Long-lived keys do not expire, do not say who is using them and usually carry more permissions than needed. This case replaces all of them with three flows using credentials that last minutes or hours: people through SSO with MFA, pipelines through OIDC federation and workloads through the platform's own identity.

It is also the piece that makes every other case safe: if the identity that deploys can grant itself more permissions, any change merged to `main` can make itself administrator.

## Scenarios

- **Startup with one account and one repository.** Start with what removes the most risk: SSO with MFA for the team and OIDC for GitHub Actions. One plan role and one apply role are enough; temporary access can wait while there are three administrators who know each other.
- **Company with several teams and separate production.** Each environment lives in its own account, subscription or project, with its own pair of CI identities. Production permissions become eligible (PIM, Privileged Access Manager or TEAM on AWS) and the SOC receives the audit trail of every environment.
- **Regulated sector with data in the EU.** Mandatory phishing-resistant MFA, quarterly access reviews, logs with immutable retention and an emergency account that is tested and documented. The auditor will want to see who approved each elevation.
- **Customer who requires on-premises.** Keycloak, OpenBao and SPIRE cover the same three flows. OpenBao validates the GitHub Actions OIDC token just as AWS would, as long as it can reach the issuer's public keys.
- **Workloads outside the cloud calling the cloud.** Data centre servers that upload files to S3 or Blob Storage stop using keys with IAM Roles Anywhere, Azure Arc or Workload Identity Federation with X.509 certificates.

## How it fits together

The diagram has three rows, one per identity type, and they all end at the same resources and the same audit trail.

1. **People.** The user signs in to the IdP with MFA. The IdP grants read access by group and, when they need to write to production, they request a temporary elevation: an eligible permission activated with a justification (and approval, if policy requires it) that expires on its own.
2. **CI.** The GitHub Actions job asks GitHub for a signed OIDC token that describes repository, branch, event, environment and workflow. Federation validates it against its conditions and returns credentials for the matching identity: **plan**, read-only, for pull requests; **apply**, only for the protected branch and the environment with reviewers. The apply identity has a boundary (permissions boundary, RBAC conditions or a separate project) that prevents it from changing the CI identities, its own trust and the protection of the state storage. A person creates those identities with a separate bootstrap stack.
3. **Workloads.** The pod, function or VM gets a token from the platform (projected service account, managed identity, metadata server) and exchanges it for cloud credentials or for a secret from the secret store. No bootstrap secret travels in the image.

Every access to resources, allowed or denied, ends up in the central audit log, out of reach of the people who administer the workloads.

## Deployment: Docker, Kubernetes or serverless

Workload identity is what changes most depending on where things run:

- **Docker Compose on one host.** No platform issues a per-container identity. The usual answer is an OpenBao agent (or a SPIRE agent with the Docker workload attestor) on the host that authenticates once and writes secrets to a `tmpfs` volume the container mounts read-only. The host is the root of trust: if it is compromised, all its containers fall with it.
- **Kubernetes on-premises (k3s, RKE2).** Service accounts with projected tokens are the identity. OpenBao validates them with its `kubernetes` auth method, or SPIRE issues an SVID per pod. External Secrets Operator or the OpenBao injector deliver secrets to the pod, and cert-manager issues internal certificates.
- **Cloud without Kubernetes.** The simplest option: the ECS task role, the Container Apps managed identity, the Cloud Run service account or the Lambda execution role already are workload identity. Just give each service its own identity and do not reuse the platform's (the ECS execution role is not the task role).
- **Managed Kubernetes.** EKS Pod Identity, AKS Workload Identity and Workload Identity Federation for GKE bind a Kubernetes service account to cloud permissions. EKS on Fargate still needs IRSA.

| Option | Workload identity | Operations | When |
|---|---|---|---|
| Compose on one host | OpenBao or SPIRE agent on the host | Medium | On-premises product or a single server |
| Self-managed Kubernetes | Service accounts + OpenBao or SPIRE | High | Many services outside the cloud |
| PaaS / functions | Built into the service | Low | Default choice in the cloud |
| Managed Kubernetes | Pod Identity / Workload Identity | Medium | You already run EKS, AKS or GKE |

## Key decisions

- **One CI identity or two.** Splitting plan and apply costs little and changes a lot: a malicious pull request can edit the workflow, so the only thing that makes it harmless is that the plan identity can only read. Apply relies on the branch and environment being protected with reviewers.
- **Which claims to check.** Checking only `aud` lets any GitHub repository in. The minimum is `sub` with repository and branch or environment; better to add the immutable repository and organisation IDs (they survive a rename and stop someone recreating a repository with the same name) and the workflow file.
- **Temporary elevation or standing privileges.** Elevation shrinks the window in which a stolen session is useful, but adds friction. Use short durations, approval only for the most critical roles and a fast path for incidents.
- **Dynamic secrets or rotation.** A dynamic secret is created per request and expires on its own; scheduled rotation leaves the secret valid for weeks. If the database supports identity-based authentication, you do not need a secret at all.
- **Emergency account.** Two cloud-only identities, outside federation, with a FIDO2 key kept in a safe, excluded only from the policies that depend on the IdP and with an alert on every sign-in. Test them every few months.

## Common pitfalls

- Trusting the OIDC provider with no condition on the repository, or with wildcards such as `repo:org/*`.
- Giving the apply identity unrestricted administrator permissions: it can create a new role with more privileges and assume it.
- Using `pull_request_target` with a checkout of the pull request's code: it runs someone else's code with the base branch's secrets and permissions.
- Keeping old keys "just in case" after moving to OIDC.
- An emergency account that depends on the same IdP or the same Conditional Access that fails during the emergency.
- Not enabling or reviewing data access logs on sensitive resources (Terraform state, secrets): management audit does not tell you who read the state.
