---
title: Apollon
tagline: Defending intrusion detection systems against adversarial machine learning attacks
description: "Apollon: an IDS defence against adversarial machine learning that answers each request with a classifier picked by Thompson sampling."
kind: research
year: 2024
status: Computers & Security, 2024
repo: https://github.com/antoniopaya22/apollon
site: https://antoniopaya22.github.io/apollon/
paper: https://doi.org/10.1016/j.cose.2023.103546
stack: [Python, scikit-learn, NumPy, pandas, Adversarial Robustness Toolbox]
facts:
  - { value: "5", label: "classifiers in the paper's pool" }
  - { value: "3", label: "public CIC datasets evaluated" }
  - { value: "2", label: "black-box attacks: ZOO and HopSkipJump" }
  - { value: "Apache-2.0", label: "license" }
links:
  - { label: "Quickstart", href: "https://antoniopaya22.github.io/apollon/getting-started/quickstart/" }
  - { label: "How Apollon works", href: "https://antoniopaya22.github.io/apollon/guide/how-it-works/" }
  - { label: "Reproducing the paper", href: "https://antoniopaya22.github.io/apollon/experiments/reproduce/" }
  - { label: "Citing Apollon", href: "https://antoniopaya22.github.io/apollon/about/citation/" }
order: 3
---

## The problem

Machine-learning intrusion detection systems can be evaded without any knowledge of the model. Black-box attacks such as ZOO and HopSkipJump send thousands of queries, work out where the decision boundary sits, and nudge an attack flow just across it with the smallest possible change. All of this rests on one assumption: the same model answers every query.

## How it works

Apollon removes that assumption by turning the IDS into a moving target. Instead of one classifier it keeps a pool of models from different families (Random Forest, decision tree, Naive Bayes, logistic regression and a multi-layer perceptron), so their mistakes don't line up. Traffic is grouped with K-Means and every classifier is trained on every cluster, giving each kind of traffic its own specialised pool.

For each request, a multi-armed bandit solved with Thompson sampling picks who answers. Every classifier holds a Beta posterior of how often it is right on that cluster; one value is drawn per classifier and the highest draw wins. Strong classifiers handle most requests, yet no single answer is predictable, so an attacker's estimates end up blending several different boundaries. When an analyst confirms or corrects an alert, the posterior of the classifier that answered is updated online. Per-request cost stays in the same range as a single model, and every prediction reports which classifier produced it, so alerts remain auditable.

## Results

The paper, published in *Computers & Security* (vol. 136, 2024), evaluates Apollon on CIC-IDS2017, CSE-CIC-IDS2018 and CIC-DDoS2019 against ZOO and HopSkipJump, both querying Apollon directly and transferring adversarial examples from a surrogate model, and compares it with each classifier of the pool used on its own. Functional flow features (27 of them in CIC-IDS2017) are held fixed during the attacks so the adversarial traffic still works as an attack.

The definitive numbers are the ones in the paper. The installable package (version 2.0.0, from 2026) came after publication: it restructures the original code, which is kept in `research/` together with the recorded experiment outputs, and lets you rerun the experiments step by step.

## Try it

Needs Python 3.10 or newer. The demo runs on synthetic traffic, with no dataset to download:

```bash
pip install "apollon-ids @ git+https://github.com/antoniopaya22/apollon"
apollon demo
```

With the CIC-IDS2017 CSV files, the `prepare`, `train`, `evaluate` and `attack` commands take you from raw data to an adversarial evaluation; the [quickstart](https://antoniopaya22.github.io/apollon/getting-started/quickstart/) walks through them.
