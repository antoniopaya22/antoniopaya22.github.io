---
title: go-rest-template
tagline: A Go REST API template with an enforced OpenAPI contract and a tool that trims it down to your project
description: "go-rest-template: a Go REST API template with an enforced OpenAPI 3.1 contract, token auth, PostgreSQL/SQLite and an init tool that removes what you skip."
kind: oss
year: 2026
status: Open source · v3
repo: https://github.com/antoniopaya22/go-rest-template
site: https://antoniopaya22.github.io/go-rest-template/
stack: [Go, chi, OpenAPI 3.1, PostgreSQL, SQLite, Prometheus, OpenTelemetry, Helm]
facts:
  - { value: "170+", label: "GitHub stars" }
  - { value: "OpenAPI 3.1", label: "contract embedded and checked on every request" }
  - { value: "9", label: "projects generated and tested on every CI run" }
  - { value: "MIT", label: "license" }
links:
  - { label: "Create your project", href: "https://antoniopaya22.github.io/go-rest-template/getting-started/create-your-project/" }
  - { label: "Quickstart", href: "https://antoniopaya22.github.io/go-rest-template/getting-started/quickstart/" }
  - { label: "Architecture", href: "https://antoniopaya22.github.io/go-rest-template/architecture/" }
  - { label: "Add a resource", href: "https://antoniopaya22.github.io/go-rest-template/guides/add-a-resource/" }
  - { label: "Production checklist", href: "https://antoniopaya22.github.io/go-rest-template/deployment/production-checklist/" }
order: 1
---

## The problem

Every new API has to settle the same questions before it does anything useful: error format, pagination, authentication, migrations, configuration, logging, tests and deployment. A template answers them once, but a template you cannot trim leaves code in your repository that you never chose and still have to maintain. go-rest-template started in 2020 as a Gin-based template, was rewritten on modern Go in 2.0 and rebuilt around feature packages in v3. It hands you a running service and lets you strip out whatever you don't need.

## How it works

Code is split into feature packages (`internal/users`, `internal/tasks`) sitting on a small shared platform layer, and a single composition root (`internal/app`) builds every component and mounts every route. Each feature owns its model, service, SQL repository and HTTP handler, and features never import each other. The stack is chi, `log/slog` and `database/sql`, with no framework.

`api/openapi.yaml` is embedded in the binary: requests that don't match it are rejected, and a test fails if the router and the document drift apart. One repository implementation serves both PostgreSQL and SQLite.

The `tools/init` command renames the module, deletes the options you turn off (database driver, metrics, tracing, rate limiting, Helm chart and so on) along with their dependencies, and removes everything that belongs to the template itself. A generator (`make resource`) clones the example resource into a new CRUD endpoint that builds and passes its own end-to-end tests.

## What's inside

- RFC 9457 problem responses with stable codes and request IDs, plus cursor pagination.
- ETag and `If-Match` for concurrent updates.
- Rotating refresh tokens, signed with HS256 or EdDSA.
- Embedded SQL migrations run by goose.
- Prometheus metrics, OpenTelemetry tracing and a separate admin port.
- A Helm chart and a distroless image signed with cosign.

Every CI run generates nine projects with different options and checks that each one builds, passes `go vet` and passes its tests. The current release is 3.0.1, under the module path `github.com/antoniopaya22/go-rest-template/v3`.

## Try it

Go is the only requirement; development runs on a SQLite file.

```bash
git clone https://github.com/antoniopaya22/go-rest-template billing && cd billing && make init
```

The [quickstart](https://antoniopaya22.github.io/go-rest-template/getting-started/quickstart/) then walks through logging in, creating tasks and updating them with `If-Match`, all with `curl`.
