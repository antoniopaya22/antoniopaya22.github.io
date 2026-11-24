---
title: "Zero Trust access without a VPN"
short: "Zero Trust, no VPN"
summary: "Grant access to internal applications by deciding on every request based on who the user is and what state their device is in, instead of trusting that they are inside the network."
description: "Zero Trust access to internal apps without a VPN using identity, MFA, device posture and a proxy: reference on AWS, Azure, GCP and on-premises."
order: 6
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
---

## When you need it

When the answer to "I need to get into the internal app" is "connect to the VPN". A VPN authenticates once and then grants access to an entire network: a compromised laptop or stolen credentials reach everything on that segment. Zero Trust changes the question from "are you inside?" to "who are you, on which device, and may you use this application right now?", and answers it on every request.

## How it fits together

1. The user signs in to the identity provider with MFA. In parallel, an agent on the device reports its posture (encryption, patches, EDR) to a management service.
2. The user requests the application. The request does not reach the application but the policy decision point and proxy, which combines identity (groups, claims, MFA method) with posture and evaluates that specific application's policy.
3. If policy allows it, the proxy forwards the request to the application, which stays on a private network with no direct exposure. If not, the request dies at the proxy.

Every decision, allowed or denied, is sent to the SIEM with user, device and application.

## Key decisions

- **Web proxy or network-level access.** An identity-aware HTTP proxy needs no client and allows per-path rules. SSH, RDP, databases or custom protocols need a client or tunnel (Private Access, IAP TCP forwarding, the Verified Access client, SDP).
- **Posture from an existing MDM or EDR, or your own agent.** Reusing Intune, Jamf or CrowdStrike is the most reliable option. Building it on osquery is possible, but the rules become yours to maintain.
- **Managed service or your own SDP.** Outside the cloud, a Software-Defined Perimeter separates the controller (decides) from the gateway (enforces) and uses Single Packet Authorization so services do not even respond to anyone unauthorised. It is more operational work than a managed service, in exchange for not depending on a vendor.
- **Gradual migration.** Start with the most used web applications and leave the VPN for what remains, with a retirement date.

## Common pitfalls

- Deploying the proxy but leaving the application reachable from the internal network or the old VPN: the control gets bypassed.
- Evaluating posture only at sign-in. A device that falls out of compliance should lose access at the next evaluation.
- An application that does not validate the identity the proxy passes along (signed header or JWT) and accepts any request that reaches it.
- SMS or context-free push MFA: real-time phishing and MFA fatigue still work. Prefer FIDO2 and passkeys.
- Logging only allowed access. The denied requests are the ones that warn you of an attack.
