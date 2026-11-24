---
title: "Zero Trust access without a VPN"
short: "Zero Trust, no VPN"
summary: "Grant access to internal applications by deciding on every request based on who the user is and what state their device is in, instead of trusting that they are inside the network."
description: "Zero Trust access to internal apps without a VPN using identity, MFA, device posture and a proxy: reference on AWS, Azure, GCP and on-premises."
order: 15
requirements:
  - "No internal application is directly exposed to the internet or to a flat network."
  - "Every session requires MFA, ideally phishing-resistant."
  - "Access is granted per application, never to an entire network segment."
  - "Device posture is re-evaluated during the session, not only at sign-in."
  - "Every decision, allowed or denied, is recorded in the SIEM."
platforms:
  onprem:
    summary: "Keycloak authenticates with MFA, osquery or Wazuh supply device posture, and a Software-Defined Perimeter (controller plus gateway with Single Packet Authorization) keeps the application invisible until policy opens it."
    notes:
      - "With SPA (for example `fwknop`) the gateway drops everything by default and only opens the port to the IP that sends an authenticated packet: a scan finds nothing to attack. This combination of SDP, SPA and Keycloak is the author's research line (SecureSDP, IJIS 2024; iam-ids-sdp, IJIS 2025)."
      - "Keycloak acts as the IdP with OTP or WebAuthn and passkeys; the SDP controller consumes its OIDC tokens to decide which services to open for each user."
      - "Posture comes from agents (osquery, Wazuh) and has to be reduced to simple signals for the policy: encrypted disk, patches up to date, EDR running."
      - "If you want something with a bigger ecosystem, OpenZiti provides a Zero Trust overlay network and Pomerium an identity-aware proxy for web applications."
      - "The cost is operations: controller and gateways in high availability, agents on every machine and posture rules that someone maintains."
  aws:
    summary: "AWS Verified Access evaluates each request using identity from IAM Identity Center (or another OIDC IdP) and posture from Jamf or CrowdStrike before letting it reach the application in a private VPC."
    notes:
      - "Policies are written in Cedar and combine user claims with device data; besides HTTP, Verified Access supports TCP applications (SSH, RDP, databases) through its client."
      - "Using IAM Identity Center as a trust provider requires an organization instance in the same region; in practice it usually federates with the corporate IdP."
      - "Supported device trust providers are Jamf, CrowdStrike and JumpCloud; for web applications they need the Verified Access browser extension."
      - "Security Lake normalises to OCSF but is not a SIEM: Verified Access logs (already in OCSF) go to S3, CloudWatch Logs or Firehose, enter as a custom source, and detection runs in another tool on top."
      - "Verified Access bills per hour for each associated application and by volume of data processed."
  azure:
    summary: "Microsoft Entra Private Access publishes internal applications through connectors, with Entra ID Conditional Access requiring MFA and an Intune-compliant device."
    notes:
      - "It is part of Global Secure Access: the client on the device routes only the traffic for published applications, and a private network connector in the VNet or data centre makes outbound connections, with no inbound ports."
      - "Conditional Access makes the decision: per application, it requires phishing-resistant MFA and a device that Intune marks as compliant."
      - "It covers TCP and UDP, not just web; for a simple web application, Entra application proxy is still a lighter option."
      - "The cost is per-user Entra licences (Private Access or Entra Suite) plus Intune, not infrastructure per application."
      - "Microsoft Sentinel ingests Entra ID and Global Secure Access logs through dedicated connectors."
  gcp:
    summary: "Identity-Aware Proxy authenticates against Cloud Identity and enforces Access Context Manager access levels, fed by Endpoint Verification, before letting traffic through to the application in the VPC."
    notes:
      - "IAP protects HTTPS applications behind a load balancer and also TCP (SSH, RDP) through forwarding; the application needs no public IP."
      - "Endpoint Verification collects encryption, operating system and screen lock status; Access Context Manager turns those signals into access levels that IAP requires per application."
      - "Device conditions are part of Chrome Enterprise Premium (formerly BeyondCorp Enterprise): check licensing before designing policies."
      - "Cloud Identity can federate with an external IdP via SSO; MFA is enforced wherever the user actually authenticates."
      - "Google SecOps ingests IAP audit logs from Cloud Logging; the cost lies mostly in licences and in the volume ingested into the SIEM."
tiers:
  - name: "Identity-aware proxy for web"
    when: "A few internal web applications, no MDM, and the goal of getting them off the VPN as soon as possible."
    cost: 1
    ops: 1
    onprem: "Docker Compose with Keycloak (WebAuthn and passkeys) and Pomerium or oauth2-proxy in front of each application, with the firewall accepting traffic only from the proxy."
    aws: "Verified Access with IAM Identity Center or another OIDC IdP and no device trust provider; for low-risk internal tools, an ALB with OIDC authentication."
    azure: "Microsoft Entra application proxy, included in Entra ID P1, with Conditional Access requiring phishing-resistant MFA."
    gcp: "Identity-Aware Proxy with Cloud Identity and no device conditions; for Google Cloud resources it has no charge of its own, only the load balancer's."
    tradeoffs: "HTTP only and no device posture: stolen credentials used from any machine still get in if they pass MFA."
  - name: "Identity, posture and TCP"
    when: "A company with MDM or EDR, web applications plus SSH, RDP or databases, and the VPN on a retirement date."
    cost: 2
    ops: 2
    onprem: "Keycloak, osquery or Wazuh for posture, and OpenZiti or an SDP with SPA for web and TCP, all on Kubernetes."
    aws: "Verified Access with Jamf, CrowdStrike or JumpCloud as device trust provider and its client for TCP applications."
    azure: "Entra Private Access with private network connectors, Intune marking compliance and per-application Conditional Access."
    gcp: "IAP for web and TCP forwarding, Endpoint Verification and access levels with device attributes, which require Chrome Enterprise Premium."
    tradeoffs: "Per-user licences and agents on every machine; posture rules need an owner and well-managed exceptions."
  - name: "Full, regulated SDP"
    when: "A regulated or critical environment, several sites or data centres, controlled privileged access and correlation in the SIEM."
    cost: 4
    ops: 3
    onprem: "SDP with a highly available controller and SPA gateways per site, clustered Keycloak, Teleport for privileged access with session recording, and clustered Wazuh."
    aws: "Verified Access across several accounts and regions, federated IAM Identity Center, Security Lake with a SIEM on top and Session Manager for administrative access."
    azure: "Microsoft Entra Suite (Private Access, Internet Access, ID Governance), PIM, continuous access evaluation and Microsoft Sentinel."
    gcp: "Chrome Enterprise Premium with IAP, Privileged Access Manager for temporary elevation and Google SecOps."
    tradeoffs: "The tier with the most licences and the most operations; only worth it when the regulator or the risk justifies it."
extensions:
  - name: "SSH and RDP without an exposed bastion"
    when: "When admins or vendors need to reach servers and today do it over the VPN or through a bastion with a public IP."
    cost: "low"
    onprem: "Teleport"
    aws: "Systems Manager Session Manager"
    azure: "Azure Bastion"
    gcp: "IAP TCP forwarding"
  - name: "Just-in-time privileged access"
    when: "When admin permissions should not be always on and every elevation needs approval and a record."
    cost: "low"
    onprem: "Teleport (access requests)"
    aws: "Identity Center + approval flow"
    azure: "Entra Privileged Identity Management"
    gcp: "Privileged Access Manager"
  - name: "East-west microsegmentation"
    when: "When a compromised application must not be able to talk to the others even on the same network."
    cost: "low"
    onprem: "Cilium NetworkPolicy"
    aws: "Per-service security groups"
    azure: "NSG + application security groups"
    gcp: "Firewall policies with tags"
  - name: "Filtered internet egress"
    when: "When besides internal access you have to control which sites devices reach without routing back through the VPN."
    cost: "medium"
    onprem: "Squid with lists and SSL Bump"
    aws: "AWS Network Firewall"
    azure: "Microsoft Entra Internet Access"
    gcp: "Secure Web Proxy"
  - name: "Identity risk detection"
    when: "When anomalous sign-ins or leaked credentials should raise the bar or cut the session."
    cost: "medium"
    onprem: "Wazuh rules on Keycloak"
    aws: "Amazon GuardDuty"
    azure: "Microsoft Entra ID Protection"
    gcp: "Google SecOps (UEBA)"
savings:
  - "Choose the tier per application, not for the whole company: web applications go through the clientless proxy, and only those needing SSH, RDP or custom protocols justify a client and network access licences."
  - "On Azure, check whether Entra application proxy, included in Entra ID P1, covers your web applications before licensing Private Access or Entra Suite for every user."
  - "On Google Cloud, IAP has no charge of its own for Google Cloud resources; pay for Chrome Enterprise Premium only if you need device conditions or must protect resources outside Google Cloud."
  - "On AWS, Verified Access bills per hour for each associated application: do not leave endpoints for temporary environments running, and use an ALB with OIDC authentication for low-risk internal tools."
  - "Reuse the MDM or EDR you already pay for (Intune, Jamf, CrowdStrike) as the posture source instead of rolling out yet another agent."
  - "Send access decisions and identity events to the SIEM, and keep detailed traffic logs in cheap tiers (auxiliary logs or the Sentinel data lake, S3 with lifecycle under Security Lake) with bounded retention; retiring VPN concentrators and their licences often offsets much of the cost."
---

## When you need it

When the answer to "I need to get into the internal app" is "connect to the VPN". A VPN authenticates once and then grants access to an entire network: a compromised laptop or stolen credentials reach everything on that segment. Zero Trust changes the question from "are you inside?" to "who are you, on which device, and may you use this application right now?", and answers it on every request.

## Scenarios

- **A startup with everything in SaaS and a couple of internal tools.** An admin panel and a Grafana. No overlay network or agents needed: an identity-aware proxy (IAP, Verified Access, Entra application proxy or Pomerium) with passkeys solves it in a day and removes the VPN.
- **A mid-sized company with managed laptops.** Intune, Jamf or CrowdStrike is already there. Device posture enters the policy: encrypted disk, up-to-date OS and EDR running to reach the ERP or the databases. TCP applications go through the service's client and the VPN is retired in phases.
- **Contractors and external vendors.** You do not control their devices, so there is no trustworthy posture. Web-only, clientless access with phishing-resistant MFA to a short list of applications, with short sessions and recording for administrative access.
- **Regulated environment or critical infrastructure on-premises.** The service cannot depend on a cloud provider. A Software-Defined Perimeter with Keycloak and Single Packet Authorization keeps services invisible to scans; posture comes from osquery or Wazuh and everything ends up in your own SIEM. More operations, but full control.
- **Merger or multicloud.** Two IdPs and applications across several clouds. Federate identities into a primary IdP and run one broker per environment with the same policy expressed in each, or an overlay such as OpenZiti that does not depend on any cloud.

## How it fits together

1. The user signs in to the identity provider with MFA. In parallel, an agent on the device reports its posture (encryption, patches, EDR) to a management service.
2. The user requests the application. The request does not reach the application but the policy decision point and proxy, which combines identity (groups, claims, MFA method) with posture and evaluates that specific application's policy.
3. If policy allows it, the proxy forwards the request to the application, which stays on a private network with no direct exposure and accepts traffic only from the proxy. If not, the request dies at the proxy.

Every decision, allowed or denied, is sent to the SIEM with user, device and application. If posture or risk changes, the next evaluation cuts access.

## Deployment: Docker, Kubernetes or serverless

**Docker Compose on one host.** Keycloak with its PostgreSQL, Pomerium or oauth2-proxy as the proxy and, if you use SPA, the gateway with `fwknop` on the host itself (it needs to control the firewall, so better outside a container or with host networking). Wazuh ships a single-node Docker deployment (manager, indexer and dashboard). Volumes for the Keycloak database and Wazuh indices; back up the realm configuration. It is a single point of failure: fine for a pilot or a small site.

**Kubernetes on-premises.** The Keycloak operator with CloudNativePG, the Pomerium Ingress Controller or OpenZiti with its Helm charts, cert-manager and Wazuh deployed in the cluster. SPA gateways are best run on dedicated edge nodes or machines, not mixed with workloads.

**Cloud without Kubernetes.** Here the broker is a managed service (Verified Access, Entra Private Access, IAP) and applications run wherever they already are: ECS Fargate or EC2 behind an internal load balancer, Container Apps in an internal environment, Cloud Run behind IAP. The only thing you operate is the policy.

**Managed Kubernetes.** The same, with cluster services exposed through an internal load balancer (AWS Load Balancer Controller for Verified Access, GKE Gateway or Ingress with IAP, an AKS internal load balancer reachable by the Private Access connector).

| Option | Fixed cost | Operations | When |
|---|---|---|---|
| Compose on one host | Low | Medium | Pilot, small site |
| Kubernetes on-premises | Medium | High | Sovereignty, own SDP |
| Managed broker + PaaS | Licences or per app | Low | Default in the cloud |
| Managed broker + EKS / AKS / GKE | Medium | Medium | Applications already in a cluster |

## Key decisions

- **Web proxy or network-level access.** An identity-aware HTTP proxy needs no client and allows per-path rules. SSH, RDP, databases or custom protocols need a client or tunnel (Private Access, IAP TCP forwarding, the Verified Access client, SDP).
- **Posture from an existing MDM or EDR, or your own agent.** Reusing Intune, Jamf or CrowdStrike is the most reliable option. Building it on osquery is possible, but the rules become yours to maintain.
- **Managed service or your own SDP.** A Software-Defined Perimeter separates the controller (decides) from the gateway (enforces) and uses Single Packet Authorization so services do not even respond to anyone unauthorised. It is more operational work than a managed service, in exchange for not depending on a vendor.
- **Gradual migration.** Start with the most used web applications and leave the VPN for what remains, with a retirement date.

## Common pitfalls

- Deploying the proxy but leaving the application reachable from the internal network or the old VPN: the control gets bypassed.
- Evaluating posture only at sign-in. A device that falls out of compliance should lose access at the next evaluation.
- An application that does not validate the identity the proxy passes along (signed header or JWT) and accepts any request that reaches it.
- SMS or context-free push MFA: real-time phishing and MFA fatigue still work. Prefer FIDO2 and passkeys.
- Logging only allowed access. The denied requests are the ones that warn you of an attack.
