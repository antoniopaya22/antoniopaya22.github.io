---
title: go-rest-template
tagline: Plantilla de API REST en Go con contrato OpenAPI obligatorio y una herramienta que la recorta a la medida de tu proyecto
description: "go-rest-template: plantilla de API REST en Go con contrato OpenAPI 3.1, tokens, PostgreSQL/SQLite y una herramienta que elimina lo que no uses."
kind: oss
year: 2026
status: Open source · v3
repo: https://github.com/antoniopaya22/go-rest-template
site: https://antoniopaya22.github.io/go-rest-template/
stack: [Go, chi, OpenAPI 3.1, PostgreSQL, SQLite, Prometheus, OpenTelemetry, Helm]
facts:
  - { value: "170+", label: "estrellas en GitHub" }
  - { value: "OpenAPI 3.1", label: "contrato embebido y validado en cada petición" }
  - { value: "9", label: "proyectos generados y probados en cada ejecución de CI" }
  - { value: "MIT", label: "licencia" }
links:
  - { label: "Crear tu proyecto", href: "https://antoniopaya22.github.io/go-rest-template/getting-started/create-your-project/" }
  - { label: "Guía rápida", href: "https://antoniopaya22.github.io/go-rest-template/getting-started/quickstart/" }
  - { label: "Arquitectura", href: "https://antoniopaya22.github.io/go-rest-template/architecture/" }
  - { label: "Añadir un recurso", href: "https://antoniopaya22.github.io/go-rest-template/guides/add-a-resource/" }
  - { label: "Checklist de producción", href: "https://antoniopaya22.github.io/go-rest-template/deployment/production-checklist/" }
order: 1
---

## El problema

Antes de que una API nueva haga algo útil hay que decidir el formato de errores, la paginación, la autenticación, las migraciones, la configuración, los logs, los tests y cómo se despliega. Una plantilla resuelve esas decisiones una sola vez, pero si no se puede recortar deja en el repositorio código que nadie eligió y que hay que mantener. go-rest-template nació en 2020 sobre Gin, se reescribió en Go moderno en la 2.0 y en la v3 se reorganizó en torno a paquetes por funcionalidad. Parte de un servicio que ya funciona y permite quitarle lo que sobra.

## Cómo funciona

El código se organiza en paquetes por funcionalidad (`internal/users`, `internal/tasks`) sobre una capa de plataforma compartida, y un único punto de composición (`internal/app`) construye los componentes y monta las rutas. Cada funcionalidad tiene su modelo, su servicio, su repositorio SQL y su handler HTTP, y las funcionalidades no se importan entre sí. Usa chi, `log/slog` y `database/sql`, sin framework.

El documento `api/openapi.yaml` va embebido en el binario: las peticiones que no lo cumplen se rechazan y un test falla si el router y el contrato no coinciden. Las mismas consultas sirven para PostgreSQL y SQLite.

La herramienta `tools/init` renombra el módulo, elimina las opciones desactivadas (base de datos, métricas, tracing, rate limiting, chart de Helm…) junto con sus dependencias y borra lo que pertenece a la propia plantilla. Un generador (`make resource`) clona el recurso de ejemplo para crear un CRUD nuevo que compila y pasa sus tests.

## Qué incluye

- Errores RFC 9457 con código estable e ID de petición, y paginación por cursor.
- ETag e `If-Match` para escrituras concurrentes.
- Tokens de refresco rotatorios, firmados con HS256 o EdDSA.
- Migraciones SQL embebidas con goose.
- Métricas de Prometheus, trazas OpenTelemetry y un puerto de administración separado.
- Chart de Helm e imagen distroless firmada con cosign.

Cada ejecución de CI genera nueve proyectos con opciones distintas y comprueba que compilan, pasan `go vet` y sus tests. La versión actual es la 3.0.1, con el módulo `github.com/antoniopaya22/go-rest-template/v3`.

## Pruébalo

Solo hace falta Go: en desarrollo usa un fichero SQLite.

```bash
git clone https://github.com/antoniopaya22/go-rest-template billing && cd billing && make init
```

La [guía rápida](https://antoniopaya22.github.io/go-rest-template/getting-started/quickstart/) recorre el login, la creación de tareas y las actualizaciones con `If-Match` usando `curl`.
