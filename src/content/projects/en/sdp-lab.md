---
title: Software-Defined Perimeter Lab
tagline: A reproducible SDP lab with Single Packet Authorization, where one packet opens the door
description: "Software-Defined Perimeter Lab: a reproducible Docker lab where Single Packet Authorization (fwknop) keeps services dark behind a gateway."
kind: research
year: 2024
status: Companion lab of SecureSDP (IJIS, 2024)
repo: https://github.com/antoniopaya22/Software-Defined-Perimeter
site: https://antoniopaya22.github.io/Software-Defined-Perimeter/
paper: https://doi.org/10.1007/s10207-024-00863-7
stack: [Node.js, fwknop, iptables, MariaDB, nginx, Docker Compose]
facts:
  - { value: "5", label: "containers on three networks" }
  - { value: "1", label: "UDP packet per session" }
  - { value: "30 s", label: "access window for a single client" }
  - { value: "Apache-2.0", label: "licence" }
links:
  - { label: "Getting started", href: "https://antoniopaya22.github.io/Software-Defined-Perimeter/getting-started/" }
  - { label: "Architecture and sequences", href: "https://antoniopaya22.github.io/Software-Defined-Perimeter/architecture/" }
  - { label: "Configuration", href: "https://antoniopaya22.github.io/Software-Defined-Perimeter/configuration/" }
  - { label: "Paper and citation", href: "https://antoniopaya22.github.io/Software-Defined-Perimeter/research/" }
  - { label: "Research line", href: "https://antoniopaya22.github.io/Software-Defined-Perimeter/research-line/" }
order: 6
---

## The problem

A service that answers everyone can be found by a port sweep, fingerprinted from its banner and hit with a pre-authentication bug before any credential is checked. A Software-Defined Perimeter flips that around: nothing answers until the client has proven who it is. This lab puts that mechanism to work in a reproducible way, as the hands-on companion of the SecureSDP paper (IJIS, 2024).

## How it works

It follows the Cloud Security Alliance SDP model with five containers spread over three networks. The Waverley Labs controller (Node.js, backed by MariaDB) creates the CA, authenticates every member over mTLS, issues and rotates their credentials, and sends the gateway its service and access lists. The gateway, built from the SDP fork of fwknop on Debian 12, sets INPUT and FORWARD to DROP and listens for Single Packet Authorization. The client sends one encrypted, HMAC-authenticated UDP packet; if it checks out, fwknopd adds DNAT and FORWARD rules scoped to that client's address and that service, and removes them after 30 seconds. No secrets live in git: the CA and credentials are generated at start-up, and upstream code is pinned to fixed commits so builds stay reproducible. The [architecture page](https://antoniopaya22.github.io/Software-Defined-Perimeter/architecture/) walks through the bootstrap and access sequences.

In the [research line](https://antoniopaya22.github.io/Software-Defined-Perimeter/research-line/), this lab and Secure-SDP accompany the same article: this one runs the Waverley Labs SDP with fwknop, while Secure-SDP is the Go implementation of the Bridge model. iam-ids-sdp (IJIS, 2025) continues the line with Keycloak-based IAM and intrusion detection.

## Results

The paper hardened each SDP component with Egida and, for the controller, reports Lynis going from 52 % to 86 %, Chef InSpec from 36.2 % to 64.3 % and OpenSCAP from 63.5 % to 82.9 %. Those numbers are not regenerated here: the containers aren't hardened with Egida, which hardens full hosts through Ansible, so reproducing them means deploying the components on virtual machines. What the lab does verify, end to end and in CI on every change, is the full access flow.

## Try it

You need Linux and Docker Engine 26 or newer:

```bash
git clone https://github.com/antoniopaya22/Software-Defined-Perimeter.git
cd Software-Defined-Perimeter
cp .env.example .env   # replace every "change-me" value
docker compose up -d --build --wait
./scripts/demo.sh
```

The demo checks that the service is silent before SPA, that the private network is unreachable, that the SPA packet is accepted, and that nginx then answers with HTTP 200. It is a research and teaching lab, not something to run in production.
