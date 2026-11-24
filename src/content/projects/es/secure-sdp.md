---
title: SecureSDP
tagline: Software-Defined Perimeter escalable con modelo Bridge y bastionado dinámico por componente
description: "SecureSDP: Software-Defined Perimeter en Go con modelo Bridge, claves SPA por concesión y bastionado dinámico con Egida."
kind: research
year: 2024
status: International Journal of Information Security, 2024
repo: https://github.com/antoniopaya22/Secure-SDP
site: https://antoniopaya22.github.io/Secure-SDP/
paper: https://doi.org/10.1007/s10207-024-00863-7
stack: [Go, fwknop, iptables, mTLS, Egida, Docker Compose]
facts:
  - { value: "+65 %", label: "Lynis en el controlador (según el paper)" }
  - { value: "+78 %", label: "Chef InSpec en el controlador (según el paper)" }
  - { value: "+30 %", label: "OpenSCAP en el controlador (según el paper)" }
  - { value: "3", label: "binarios Go con los nombres del paper" }
links:
  - { label: "Guía rápida", href: "https://antoniopaya22.github.io/Secure-SDP/getting-started/" }
  - { label: "Arquitectura del modelo Bridge", href: "https://antoniopaya22.github.io/Secure-SDP/architecture/" }
  - { label: "Evaluación", href: "https://antoniopaya22.github.io/Secure-SDP/evaluation/" }
  - { label: "Historia y procedencia", href: "https://antoniopaya22.github.io/Secure-SDP/history/" }
  - { label: "Artículo y cita", href: "https://antoniopaya22.github.io/Secure-SDP/research/" }
order: 4
---

## El problema

Los SDP clásicos ponen a todos sus miembros detrás de un único controlador: todo pasa por ese punto y unir perímetros existentes obliga a rediseñarlos. Además, controladores y gateways rara vez reciben un bastionado pensado para su función. El artículo SecureSDP (IJIS, 2024) ataca ambos frentes: escalabilidad con el modelo Bridge y bastionado dinámico de cada componente con Egida.

## Cómo funciona

El repositorio implementa en Go los tres módulos que nombra el paper: `sdp-controller`, `sdp-services` y `sdp-client`. Cada dominio conserva su propio controlador, con una CA restringida por nombre a ese dominio. El controlador puente autentica a sus miembros y reenvía la petición, junto con la cadena de certificados del cliente, a un controlador raíz a través de un enlace mTLS persistente. La raíz vuelve a verificar la cadena, aplica la política común y genera claves Rijndael y HMAC nuevas para esa concesión, que instala como stanza de fwknop en el host que acepta. El servicio sigue oculto tras iptables en denegación por defecto hasta que llega el paquete SPA, y una revocación cierra túneles y retira reglas. La raíz también deriva un programa Aspida por host y lo envía para aplicarlo con Egida (en el laboratorio, en modo *dry-run*). Detalle en la [arquitectura](https://antoniopaya22.github.io/Secure-SDP/architecture/).

Dentro de la [línea de investigación](https://antoniopaya22.github.io/Secure-SDP/research-line/), este repositorio es la implementación en Go del modelo Bridge. El SDP Lab acompaña al mismo artículo ejecutando el SDP de Waverley Labs con fwknop, e iam-ids-sdp (IJIS, 2025) continúa la línea añadiendo identidad y detección de amenazas.

## Resultados

El paper comparó tiempos de respuesta HTTP de topologías Bridge, Mesh e Híbrida de tres niveles: Bridge fue la más rápida en los cuatro tamaños de respuesta, con Mesh cerca pero más costosa. En bastionado, el controlador pasó del 52 % al 86 % en Lynis, del 36,2 % al 64,3 % en Chef InSpec y del 63,5 % al 82,9 % en OpenSCAP.

Aclaración necesaria: cuando se publicó el artículo, el repositorio solo contenía un esqueleto y un banco de pruebas con OpenSPA. Este código se escribió en 2026 siguiendo la arquitectura descrita en el paper y no regenera sus resultados; las cifras anteriores son las publicadas. `scripts/bench.sh` y la auditoría con Lynis permiten tomar medidas locales, y la página de [historia y procedencia](https://antoniopaya22.github.io/Secure-SDP/history/) detalla las simplificaciones, como admitir solo dos niveles de controlador.

## Pruébalo

Necesitas Linux y Docker con Compose 2.30 o posterior:

```bash
git clone https://github.com/antoniopaya22/Secure-SDP.git
cd Secure-SDP
docker compose up -d --build --wait
./scripts/demo.sh
```

El laboratorio levanta dos controladores, un gateway delante de nginx y dos clientes. La demo comprueba 15 propiedades del perímetro: el servicio no responde antes del SPA, la raíz autoriza a Alice a través del puente, Bob sigue sin ver nada y la revocación corta el acceso al instante.
