---
title: SecureSDP
tagline: A scalable Software-Defined Perimeter with a Bridge model and per-component dynamic hardening
description: "SecureSDP: a Bridge-model Software-Defined Perimeter in Go with per-grant SPA keys and dynamic hardening driven by Egida."
kind: research
year: 2024
status: International Journal of Information Security, 2024
repo: https://github.com/antoniopaya22/Secure-SDP
site: https://antoniopaya22.github.io/Secure-SDP/
paper: https://doi.org/10.1007/s10207-024-00863-7
stack: [Go, fwknop, iptables, mTLS, Egida, Docker Compose]
facts:
  - { value: "+65 %", label: "Lynis on the controller (as reported)" }
  - { value: "+78 %", label: "Chef InSpec on the controller (as reported)" }
  - { value: "+30 %", label: "OpenSCAP on the controller (as reported)" }
  - { value: "3", label: "Go binaries named as in the paper" }
links:
  - { label: "Getting started", href: "https://antoniopaya22.github.io/Secure-SDP/getting-started/" }
  - { label: "Bridge-model architecture", href: "https://antoniopaya22.github.io/Secure-SDP/architecture/" }
  - { label: "Evaluation", href: "https://antoniopaya22.github.io/Secure-SDP/evaluation/" }
  - { label: "History and provenance", href: "https://antoniopaya22.github.io/Secure-SDP/history/" }
  - { label: "Paper and citation", href: "https://antoniopaya22.github.io/Secure-SDP/research/" }
order: 4
---

## The problem

Classic SDPs put every member behind a single controller. Everything goes through that one point, and joining existing perimeters means redesigning them around it. On top of that, controllers and gateways rarely get hardening that fits their role. The SecureSDP paper (IJIS, 2024) tackles both: scalability through the Bridge model, and dynamic per-component hardening with Egida.

## How it works

The repository implements, in Go, the three modules the paper names: `sdp-controller`, `sdp-services` and `sdp-client`. Each domain keeps its own controller, backed by a CA that is name-constrained to that domain. A bridged controller authenticates its own members and relays their requests, together with the client's certificate chain, to a root controller over a persistent mTLS link. The root doesn't trust the bridge blindly: it re-verifies the chain, applies the shared policy and mints fresh Rijndael and HMAC keys for that single grant, installed as a fwknop stanza on the accepting host. The service stays dark behind default-deny iptables until the SPA packet arrives, and revoking a grant tears down tunnels and rules. The root also derives an Aspida program for each accepting host and pushes it to be applied with Egida (dry-run in the container lab). The [architecture page](https://antoniopaya22.github.io/Secure-SDP/architecture/) covers the PKI and sequences.

In the [research line](https://antoniopaya22.github.io/Secure-SDP/research-line/), this repository is the Go implementation of the Bridge model. SDP Lab accompanies the same article by running the Waverley Labs SDP with fwknop, and iam-ids-sdp (IJIS, 2025) carries the line forward with identity and threat detection.

## Results

The paper compared HTTP response times for three-layer Bridge, Mesh and Hybrid topologies: Bridge was fastest for all four response sizes, with Mesh close behind but costlier to deploy. For hardening, the controller went from 52 % to 86 % in Lynis, 36.2 % to 64.3 % in Chef InSpec and 63.5 % to 82.9 % in OpenSCAP.

One caveat worth stating plainly: when the paper came out, the repository held only a skeleton and an OpenSPA test bed. This code was written in 2026 following the architecture in the paper, and it does not regenerate the paper's results; the figures above are the published ones. `scripts/bench.sh` and the Lynis audit let you take local measurements, and [history and provenance](https://antoniopaya22.github.io/Secure-SDP/history/) lists the simplifications, such as supporting only two controller levels.

## Try it

You need Linux and Docker with Compose 2.30 or later:

```bash
git clone https://github.com/antoniopaya22/Secure-SDP.git
cd Secure-SDP
docker compose up -d --build --wait
./scripts/demo.sh
```

The lab starts a root and a bridged controller, a gateway in front of nginx and two clients, generating the PKI on start-up. The demo runs 15 checks against the perimeter: the service is silent before SPA, the root authorizes Alice through the bridge, Bob still sees nothing, and revocation cuts access immediately.
