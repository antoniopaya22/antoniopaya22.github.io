---
title: Software-Defined Perimeter Lab
tagline: Laboratorio reproducible de SDP con Single Packet Authorization, donde un solo paquete abre la puerta
description: "Software-Defined Perimeter Lab: laboratorio Docker reproducible con Single Packet Authorization (fwknop) que oculta servicios tras un gateway."
kind: research
year: 2024
status: Laboratorio del artículo SecureSDP (IJIS, 2024)
repo: https://github.com/antoniopaya22/Software-Defined-Perimeter
site: https://antoniopaya22.github.io/Software-Defined-Perimeter/
paper: https://doi.org/10.1007/s10207-024-00863-7
stack: [Node.js, fwknop, iptables, MariaDB, nginx, Docker Compose]
facts:
  - { value: "5", label: "contenedores en tres redes" }
  - { value: "1", label: "paquete UDP por sesión" }
  - { value: "30 s", label: "ventana de acceso para un único cliente" }
  - { value: "Apache-2.0", label: "licencia" }
links:
  - { label: "Guía rápida", href: "https://antoniopaya22.github.io/Software-Defined-Perimeter/getting-started/" }
  - { label: "Arquitectura y secuencias", href: "https://antoniopaya22.github.io/Software-Defined-Perimeter/architecture/" }
  - { label: "Configuración", href: "https://antoniopaya22.github.io/Software-Defined-Perimeter/configuration/" }
  - { label: "Artículo y cita", href: "https://antoniopaya22.github.io/Software-Defined-Perimeter/research/" }
  - { label: "Línea de investigación", href: "https://antoniopaya22.github.io/Software-Defined-Perimeter/research-line/" }
order: 6
---

## El problema

Un servicio que responde a cualquiera puede descubrirse con un barrido de puertos, identificarse por su banner y atacarse con un fallo previo a la autenticación antes de que nadie compruebe una credencial. Un Software-Defined Perimeter invierte esa lógica: nada contesta hasta que el cliente demuestra quién es. Este laboratorio pone ese mecanismo en marcha de forma reproducible y es el compañero práctico del artículo SecureSDP (IJIS, 2024).

## Cómo funciona

Sigue el modelo SDP de la Cloud Security Alliance con cinco contenedores repartidos en tres redes. El controlador de Waverley Labs (Node.js, con MariaDB) crea la CA, autentica a cada miembro con mTLS, emite y rota sus credenciales y envía al gateway las listas de servicios y de acceso. El gateway, compilado a partir del fork SDP de fwknop sobre Debian 12, pone INPUT y FORWARD en DROP y escucha paquetes de Single Packet Authorization. El cliente envía un único paquete UDP cifrado y autenticado con HMAC; si es válido, fwknopd añade reglas DNAT y FORWARD limitadas a la IP de ese cliente y a ese servicio, y las retira a los 30 segundos. No hay secretos en git: la CA y las credenciales se generan al arrancar, y el código upstream está fijado a commits concretos para que las builds sean reproducibles. Las secuencias completas están en la [arquitectura](https://antoniopaya22.github.io/Software-Defined-Perimeter/architecture/).

En la [línea de investigación](https://antoniopaya22.github.io/Software-Defined-Perimeter/research-line/), este laboratorio y Secure-SDP acompañan al mismo artículo: aquí se ejecuta el SDP de Waverley Labs con fwknop, mientras que Secure-SDP es la implementación en Go del modelo Bridge. iam-ids-sdp (IJIS, 2025) continúa la línea con IAM sobre Keycloak y detección de intrusiones.

## Resultados

El paper bastionó cada componente del SDP con Egida y, para el controlador, reporta Lynis del 52 % al 86 %, Chef InSpec del 36,2 % al 64,3 % y OpenSCAP del 63,5 % al 82,9 %. Esas cifras no se regeneran aquí: los contenedores no se bastionan con Egida, que endurece hosts completos mediante Ansible, así que reproducirlas exige desplegar los componentes en máquinas virtuales. Lo que el laboratorio sí verifica, de extremo a extremo y en CI con cada cambio, es el flujo de acceso completo.

## Pruébalo

Necesitas Linux y Docker Engine 26 o posterior:

```bash
git clone https://github.com/antoniopaya22/Software-Defined-Perimeter.git
cd Software-Defined-Perimeter
cp .env.example .env   # sustituye cada valor "change-me"
docker compose up -d --build --wait
./scripts/demo.sh
```

La demo comprueba que el servicio no responde antes del SPA, que la red privada es inalcanzable, que el paquete SPA se acepta y que después nginx devuelve HTTP 200. Es un laboratorio de investigación y docencia, no algo para producción.
