---
title: Proteus
tagline: Intrusion alerts certified against additive manipulation of network traffic
description: "Proteus: network intrusion detection whose alerts are certified against additive traffic manipulation by adversarial machine learning."
kind: research
year: 2026
status: Manuscript in preparation
repo: https://github.com/antoniopaya22/proteus
site: https://antoniopaya22.github.io/proteus/
stack: [Python, scikit-learn, numba, pandas, PyArrow, Adversarial Robustness Toolbox]
facts:
  - { value: "1", label: "extra model evaluation certifies an alert" }
  - { value: "0", label: "perturbation budgets, secrets or random answers" }
  - { value: "4", label: "monotone sub-cores joined by a calibrated maximum" }
  - { value: "10 s – 6 h", label: "time scales of the evidence counters" }
links:
  - { label: "Quickstart", href: "https://antoniopaya22.github.io/proteus/getting-started/quickstart/" }
  - { label: "How Proteus works", href: "https://antoniopaya22.github.io/proteus/concepts/" }
  - { label: "The certificate", href: "https://antoniopaya22.github.io/proteus/concepts/certificate/" }
  - { label: "Reproducing the experiments", href: "https://antoniopaya22.github.io/proteus/guide/reproduce/" }
  - { label: "Citing Proteus", href: "https://antoniopaya22.github.io/proteus/about/citation/" }
order: 2
---

## The problem

A detector that judges each connection on its own looks at things the sender picks: sizes, durations, timings. With adversarial machine learning, an attacker pads packets, splits connections or adds decoys until every flow looks normal, and it costs them nothing. Proteus, the successor to Apollon, starts from a different question: what can't an attacker change without breaking the attack? A flood needs volume on its victim, a scan has to touch many ports, a brute force needs many attempts.

## How it works

Working from NetFlow/IPFIX flow records, Proteus scores the state of machines rather than individual connections. It keeps exponentially decayed counters per destination service, destination host, source host and source–service pair, at time scales from ten seconds to six hours, and compares them with each entity's own baseline learned from benign days. Free disguises can only add to this *conserved evidence*.

Four gradient-boosted sub-cores with monotonicity constraints score the evidence and are merged through a maximum calibrated on local benign traffic, so more evidence can only push the score up. When an alert fires, one extra evaluation of the model on the worst case tells whether it is *certified*: no padding, decoy or flow splitting could have avoided it. The slack depends only on the exporter's active timeout and the counter's time scale (2Δ/τ), and the guarantee involves no secrets or randomness: it holds even against an attacker who knows the model, the thresholds and the baselines.

## Results

The work is described in a manuscript in preparation, and the measured results will be published with it. The experimental design is already documented: train on one network and test on another (corrected CIC-IDS-2017 and CSE-CIC-IDS-2018), real background traffic from CTU-13, UGR'16 and CIC-DDoS-2019, and adaptive, query-based and baseline-poisoning adversaries. What the certificate does not cover, such as slowing down or sending smaller requests, is measured with the *harm frontier*: the highest attack rate that raises no attributable alert. Proteus is compared with rate thresholds, KitNET, classic scan and flood detectors, and Apollon. It is not a replacement for a per-connection detector: an attack that fits in a single connection, like an SQL injection, leaves almost no accumulated footprint.

## Try it

Needs Python 3.11 or newer. The test suite needs no dataset and checks the properties the guarantee relies on:

```bash
git clone https://github.com/antoniopaya22/proteus && cd proteus
uv venv && uv pip install -e ".[dev]"
uv run pytest
```

The full experiments run stage by stage through `scripts/reproduce.sh`; some stages take hours and need around 16 GB of RAM.
