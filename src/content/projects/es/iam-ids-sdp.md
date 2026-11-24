---
title: iam-ids-sdp
tagline: Identidad con MFA y detección de intrusiones integradas en un Software-Defined Perimeter Zero Trust
description: "iam-ids-sdp: Software-Defined Perimeter con IAM de Keycloak (MFA, RBAC) e IDS estilo Apollon que revoca sesiones anómalas."
kind: research
year: 2025
status: International Journal of Information Security, 2025
repo: https://github.com/antoniopaya22/iam-ids-sdp
site: https://antoniopaya22.github.io/iam-ids-sdp/
paper: https://doi.org/10.1007/s10207-025-01099-9
stack: [Go, Python, Keycloak, fwknop, iptables, Docker Compose]
facts:
  - { value: "75–100 ms", label: "más de establecimiento de conexión (según el paper)" }
  - { value: "≈3,3 KB", label: "extra por sesión (según el paper)" }
  - { value: "22", label: "comprobaciones en la demo del laboratorio" }
  - { value: "2", label: "modos, tradicional y propuesto, en el mismo laboratorio" }
links:
  - { label: "Guía rápida", href: "https://antoniopaya22.github.io/iam-ids-sdp/getting-started/" }
  - { label: "Arquitectura", href: "https://antoniopaya22.github.io/iam-ids-sdp/architecture/" }
  - { label: "IDS y UEBA", href: "https://antoniopaya22.github.io/iam-ids-sdp/ids/" }
  - { label: "Evaluación de rendimiento", href: "https://antoniopaya22.github.io/iam-ids-sdp/performance/" }
  - { label: "Procedencia del código", href: "https://antoniopaya22.github.io/iam-ids-sdp/provenance/" }
order: 5
---

## El problema

Un SDP clásico confía en el par de claves del dispositivo. Quien lo tenga obtiene todos los servicios registrados para ese equipo, no hay roles que limiten el acceso y, una vez que el gateway se abre, nadie vigila lo que hace la sesión. El artículo de IJIS (2025) propone integrar gestión de identidades (IAM) y detección de intrusiones (IDS) dentro del perímetro, en línea con Zero Trust.

## Cómo funciona

Cada sesión empieza con un inicio de sesión en Keycloak con contraseña y TOTP; los roles de realm del token deciden qué servicios puede solicitar el usuario. El controlador valida el token (firma, introspección y RBAC) y después cada host que acepta lo vuelve a comprobar en cada petición con su propia copia de la política, todo ello tras SPA con fwknop y mTLS. La telemetría de cada sesión alimenta un IDS en Python basado en Apollon: un *multi-armed bandit* con muestreo de Thompson elige un clasificador del pool en cada ventana, y su veredicto se combina con una línea base de comportamiento por usuario (UEBA). Ante una alerta, el controlador revoca la sesión en todos los gateways y cierra la sesión de Keycloak. El mismo laboratorio arranca en modo tradicional o propuesto para comparar ambos.

Según su [línea de investigación](https://antoniopaya22.github.io/iam-ids-sdp/research-line/), es el último paso por ahora: el SDP Lab ejecuta el SDP de Waverley Labs con fwknop, SecureSDP implementa el modelo Bridge e iam-ids-sdp añade identidad y detección de amenazas, apoyándose en Apollon (Computers & Security, 2024).

## Resultados

El paper midió cuatro topologías, desde 1 cliente y 1 gateway hasta 5 clientes y 10 gateways. Añadir Keycloak y el IDS elevó el establecimiento de conexión entre 75 y 100 ms aproximadamente (de 103 a 181 ms en la más sencilla) y unos 3,3 KB por sesión, con un throughput casi sin cambios.

Aviso de procedencia: cuando se publicó el artículo, el repositorio solo tenía un commit inicial. Esta implementación se escribió en 2026 siguiendo el paper y no regenera sus resultados; las cifras citadas son las publicadas. El IDS es un modelo de laboratorio entrenado con cargas benignas, no el Apollon entrenado con datasets públicos, y no se reproducen los ataques de robo de credenciales ni de DoS. `scripts/bench/run.sh` mide en tu máquina y la página de [rendimiento](https://antoniopaya22.github.io/iam-ids-sdp/performance/) muestra una ejecución etiquetada como medida local.

## Pruébalo

Requiere Linux, Docker con Compose 2.30+ y unos 3 GB de memoria libre:

```bash
git clone https://github.com/antoniopaya22/iam-ids-sdp && cd iam-ids-sdp
./scripts/gen-env.sh
docker compose up -d --build --wait
./scripts/demo.sh
```

La demo (minuto y medio) comprueba que sin TOTP no hay token, que un rol insuficiente recibe 403, que el gateway valida el token por su cuenta y que una alerta del IDS revoca la sesión sin afectar a otros usuarios.
