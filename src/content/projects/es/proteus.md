---
title: Proteus
tagline: Alertas de intrusión certificadas frente a la manipulación aditiva del tráfico de red
description: "Proteus: detección de intrusiones en red con alertas certificadas frente a la manipulación aditiva del tráfico con machine learning adversarial."
kind: research
year: 2026
status: Manuscrito en preparación
repo: https://github.com/antoniopaya22/proteus
site: https://antoniopaya22.github.io/proteus/
stack: [Python, scikit-learn, numba, pandas, PyArrow, Adversarial Robustness Toolbox]
facts:
  - { value: "1", label: "evaluación extra del modelo para certificar una alerta" }
  - { value: "0", label: "presupuestos de perturbación, secretos o respuestas al azar" }
  - { value: "4", label: "subnúcleos monótonos combinados por un máximo calibrado" }
  - { value: "10 s – 6 h", label: "escalas temporales de los contadores de evidencia" }
links:
  - { label: "Inicio rápido", href: "https://antoniopaya22.github.io/proteus/es/getting-started/quickstart/" }
  - { label: "Cómo funciona Proteus", href: "https://antoniopaya22.github.io/proteus/es/concepts/" }
  - { label: "El certificado", href: "https://antoniopaya22.github.io/proteus/es/concepts/certificate/" }
  - { label: "Reproducir los experimentos", href: "https://antoniopaya22.github.io/proteus/es/guide/reproduce/" }
  - { label: "Cómo citar Proteus", href: "https://antoniopaya22.github.io/proteus/es/about/citation/" }
order: 2
---

## El problema

Un detector que clasifica cada conexión por separado se fija en cosas que elige quien la envía: tamaños, duraciones, tiempos. Con aprendizaje automático adversario, un atacante rellena paquetes, parte conexiones o añade señuelos hasta que cada flujo parece normal, y no pierde nada por hacerlo. Proteus, sucesor de Apollon, parte de otra pregunta: ¿qué no puede cambiar el atacante sin que su ataque deje de funcionar? Una inundación necesita volumen sobre su víctima, un escaneo necesita tocar muchos puertos y una fuerza bruta necesita muchos intentos.

## Cómo funciona

A partir de registros de flujo NetFlow/IPFIX, Proteus no juzga conexiones sino el estado de las máquinas: mantiene contadores con decaimiento exponencial por servicio, host de destino, host de origen y par origen–servicio, a escalas de diez segundos a seis horas, y los compara con la línea base de cada entidad aprendida en días de tráfico benigno. Los disfraces gratuitos solo pueden sumar a esa *evidencia conservada*.

Cuatro subnúcleos de gradient boosting con restricciones de monotonía puntúan la evidencia y se combinan con un máximo calibrado sobre tráfico benigno local; más evidencia solo puede subir la puntuación. Cuando salta una alerta, una sola evaluación adicional del modelo sobre el peor caso decide si está *certificada*: ningún relleno, señuelo o partición de flujos podría haberla evitado. La holgura depende solo del timeout activo del exportador y de la escala del contador (2Δ/τ), y la garantía no depende de secretos ni de aleatoriedad: se sostiene aunque el atacante conozca el modelo, los umbrales y las líneas base.

## Resultados

El trabajo está descrito en un manuscrito en preparación y los resultados medidos se publicarán con él. El diseño experimental ya está documentado: entrenar en una red y evaluar en otra (CIC-IDS-2017 y CSE-CIC-IDS-2018 corregidos), tráfico real de fondo de CTU-13, UGR'16 y CIC-DDoS-2019, y adversarios adaptativos, de consultas y de envenenamiento de líneas base. Lo que el certificado no cubre, como ir más despacio o enviar peticiones más pequeñas, se mide con la *frontera de daño*: la tasa de ataque más alta que no levanta ninguna alerta atribuible. Proteus se compara con umbrales de tasa, KitNET, detectores clásicos de escaneo e inundación y Apollon. No sustituye a un detector por conexión: un ataque que cabe en una sola conexión, como una inyección SQL, apenas deja huella acumulada.

## Pruébalo

Requiere Python 3.11 o superior. Los tests no necesitan ningún dataset y comprueban las propiedades de las que depende la garantía:

```bash
git clone https://github.com/antoniopaya22/proteus && cd proteus
uv venv && uv pip install -e ".[dev]"
uv run pytest
```

Los experimentos completos se lanzan por etapas con `scripts/reproduce.sh`; algunas tardan horas y necesitan unos 16 GB de RAM.
