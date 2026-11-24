---
title: Egida
tagline: Automated deployment of CIS Benchmark security configurations across a server infrastructure
description: "Egida: a server hardening orchestrator that deploys CIS Benchmark controls with Ansible and its own domain-specific language, Aspida."
kind: research
year: 2022
status: Computers & Security, 2022
repo: https://github.com/Egida-Kassandra/egida
site: https://egida-kassandra.github.io/egida/
paper: https://doi.org/10.1016/j.cose.2022.102638
stack: [Go, Ansible, ANTLR, Lynis]
facts:
  - { value: "3", label: "modules: egida, egida-roles and egida-api" }
  - { value: "CIS", label: "Benchmarks as the source of controls" }
  - { value: "Aspida", label: "domain-specific language for hardening" }
  - { value: "Apache-2.0", label: "license" }
links:
  - { label: "Documentation", href: "https://egida-kassandra.github.io/egida/" }
  - { label: "Aspida language", href: "https://egida-kassandra.github.io/egida/dsl/" }
  - { label: "Source code", href: "https://github.com/Egida-Kassandra/egida" }
  - { label: "Releases", href: "https://github.com/Egida-Kassandra/egida/releases" }
order: 7
---

## The problem

Hardening a server against the CIS Benchmarks means applying a long list of controls, and the right set for each machine depends on its profile: which services it runs, which OS version it has, how well protected it already is. Doing that by hand across a whole infrastructure is slow and error-prone. Egida automates the rollout of security configurations to groups of servers and tailors the measures to each server's profile.

## How it works

Egida follows a microservices architecture made of three modules:

- **egida**, the main module, provides the user interface and processes Aspida, the project's own language.
- **egida-roles** defines the Ansible roles that carry out each control, either CIS Benchmark hardening operations or setup steps that prepare a machine for Egida.
- **egida-api** collects information about each host, such as running services, OS version or its Lynis score.

As in Ansible, you work with host groups reached over SSH or locally. A console menu lets you apply whole benchmarks or pick specific sections, controls or points, and a variables file tunes values such as the SSH port or the password policy.

Aspida scripts are made of four blocks (`MAIN`, `HOST`, `TASKS` and `VARS`) and support `IF`/`ELSE`/`ELIF` conditions on the state of the target machine, for instance applying different sections depending on whether the `ufw` service is stopped.

## Results

The system was published in *Computers & Security* (vol. 116, 102638, 2022) as "Egida: Automated security configuration deployment systems with early error detection", by Antonio Payá, Alba Cotarelo and José Manuel Redondo. The project site documents how to use the tool and does not report evaluation figures; the paper is the reference for the system's design. The code is released under the Apache 2.0 license.

## Try it

The documentation lists Ubuntu 18.04 LTS or later, Ansible newer than 2.8 and Python 3 on the master node. Once the core is installed, create a host group and compile an Aspida script:

```bash
sudo egida add-group -c ssh -g webservers -H 192.168.1.3 -H 192.168.1.2
sudo egida compile -f /examples/example_cond.aspida
```

The full language syntax is in the [Aspida guide](https://egida-kassandra.github.io/egida/dsl/).
