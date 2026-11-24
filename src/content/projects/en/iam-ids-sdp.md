---
title: iam-ids-sdp
tagline: Identity, MFA and intrusion detection built into a Zero Trust Software-Defined Perimeter
description: "iam-ids-sdp: a Software-Defined Perimeter with Keycloak IAM (MFA, RBAC) and an Apollon-style IDS that revokes anomalous sessions."
kind: research
year: 2025
status: International Journal of Information Security, 2025
repo: https://github.com/antoniopaya22/iam-ids-sdp
site: https://antoniopaya22.github.io/iam-ids-sdp/
paper: https://doi.org/10.1007/s10207-025-01099-9
stack: [Go, Python, Keycloak, fwknop, iptables, Docker Compose]
facts:
  - { value: "75–100 ms", label: "extra connection set-up (as reported)" }
  - { value: "~3.3 KB", label: "extra data per session (as reported)" }
  - { value: "22", label: "checks in the lab demo" }
  - { value: "2", label: "modes, traditional and proposed, in one lab" }
links:
  - { label: "Getting started", href: "https://antoniopaya22.github.io/iam-ids-sdp/getting-started/" }
  - { label: "Architecture", href: "https://antoniopaya22.github.io/iam-ids-sdp/architecture/" }
  - { label: "IDS and UEBA", href: "https://antoniopaya22.github.io/iam-ids-sdp/ids/" }
  - { label: "Performance evaluation", href: "https://antoniopaya22.github.io/iam-ids-sdp/performance/" }
  - { label: "Provenance", href: "https://antoniopaya22.github.io/iam-ids-sdp/provenance/" }
order: 5
---

## The problem

A classic SDP trusts the device key pair. Whoever holds it gets every service registered for that device, there are no roles to narrow access, and once the gateway opens nobody watches what the session actually does. The IJIS paper (2025) proposes bringing identity and access management (IAM) and intrusion detection (IDS) inside the perimeter so that it lives up to Zero Trust.

## How it works

Every session starts with a Keycloak login using a password and TOTP; the realm roles in the token decide which services the user may ask for. The controller validates the token (signature, introspection and RBAC), and each accepting host checks it again on every request against its own copy of the policy, all behind fwknop SPA and mTLS. Per-session telemetry feeds a Python IDS built on the Apollon approach: a multi-armed bandit with Thompson sampling picks a classifier from a pool for each window, and its verdict is combined with a per-user behaviour baseline (UEBA). When an alert fires, the controller revokes the session on every gateway and ends the user's Keycloak session. The same lab runs in traditional or proposed mode, so the two can be compared side by side.

Within the [research line](https://antoniopaya22.github.io/iam-ids-sdp/research-line/) this is the latest step: SDP Lab runs the Waverley Labs SDP with fwknop, SecureSDP implements the Bridge model, and iam-ids-sdp adds identity and threat detection, building on Apollon (Computers & Security, 2024).

## Results

The paper measured four topologies, from one client and one gateway up to five clients and ten gateways. Adding Keycloak and the IDS raised connection set-up time by roughly 75–100 ms (103 to 181 ms in the simplest case) and added about 3.3 KB per session, while throughput stayed almost unchanged.

A provenance note: when the paper was published, the repository held only an initial commit. This implementation was written in 2026 following the paper and does not regenerate its results; the figures quoted are the published ones. The IDS is a lab model trained on benign workloads, not the Apollon model trained on public intrusion datasets, and the credential-theft and DoS experiments are not reproduced. `scripts/bench/run.sh` measures on your own machine, and the [performance page](https://antoniopaya22.github.io/iam-ids-sdp/performance/) shows one run clearly labelled as a local measurement.

## Try it

You need Linux, Docker 26+ with Compose 2.30+ and about 3 GB of free memory:

```bash
git clone https://github.com/antoniopaya22/iam-ids-sdp && cd iam-ids-sdp
./scripts/gen-env.sh
docker compose up -d --build --wait
./scripts/demo.sh
```

The demo takes about a minute and a half. It checks that no token is issued without TOTP, that an insufficient role gets a 403, that the gateway validates tokens on its own, and that an IDS alert revokes a session without touching other users.
