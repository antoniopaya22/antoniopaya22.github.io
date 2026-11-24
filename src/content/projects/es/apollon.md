---
title: Apollon
tagline: Defensa frente a ataques de machine learning adversarial en sistemas de detección de intrusiones
description: "Apollon: defensa de IDS frente a machine learning adversarial que responde cada petición con un clasificador elegido por muestreo de Thompson."
kind: research
year: 2024
status: Computers & Security, 2024
repo: https://github.com/antoniopaya22/apollon
site: https://antoniopaya22.github.io/apollon/
paper: https://doi.org/10.1016/j.cose.2023.103546
stack: [Python, scikit-learn, NumPy, pandas, Adversarial Robustness Toolbox]
facts:
  - { value: "5", label: "clasificadores en el pool del artículo" }
  - { value: "3", label: "datasets públicos del CIC evaluados" }
  - { value: "2", label: "ataques de caja negra: ZOO y HopSkipJump" }
  - { value: "Apache-2.0", label: "licencia" }
links:
  - { label: "Inicio rápido", href: "https://antoniopaya22.github.io/apollon/es/getting-started/quickstart/" }
  - { label: "Cómo funciona Apollon", href: "https://antoniopaya22.github.io/apollon/es/guide/how-it-works/" }
  - { label: "Reproducir el artículo", href: "https://antoniopaya22.github.io/apollon/es/experiments/reproduce/" }
  - { label: "Cómo citar Apollon", href: "https://antoniopaya22.github.io/apollon/es/about/citation/" }
order: 3
---

## El problema

Los sistemas de detección de intrusiones basados en aprendizaje automático se pueden evadir sin conocer el modelo. Ataques de caja negra como ZOO y HopSkipJump lanzan miles de consultas, estiman dónde está la frontera de decisión y empujan un flujo de ataque justo al otro lado con la perturbación mínima. Todo eso depende de una suposición: que siempre responde el mismo modelo.

## Cómo funciona

Apollon rompe esa suposición convirtiendo el IDS en un blanco móvil. En lugar de un único clasificador, mantiene un conjunto de modelos de familias distintas (Random Forest, árbol de decisión, Naive Bayes, regresión logística y un perceptrón multicapa), cuyos errores no coinciden. El tráfico se agrupa con K-Means y cada clasificador se entrena en cada grupo, de modo que cada tipo de tráfico tiene su propio conjunto especializado.

Para cada petición, un bandido multibrazo resuelto con muestreo de Thompson decide quién responde: cada clasificador guarda una posterior Beta de su tasa de acierto en ese grupo, se sortea un valor por clasificador y contesta el más alto. Los mejores responden la mayoría de las veces, pero ninguna respuesta es predecible, así que las estimaciones del atacante mezclan varias fronteras distintas. Cuando un analista confirma o corrige una alerta, la posterior del clasificador que respondió se actualiza en línea. El coste por petición es del mismo orden que un único modelo, y cada predicción indica qué clasificador la dio, por lo que las alertas siguen siendo auditables.

## Resultados

El artículo, publicado en *Computers & Security* (vol. 136, 2024), evalúa Apollon sobre CIC-IDS2017, CSE-CIC-IDS2018 y CIC-DDoS2019 frente a ZOO y HopSkipJump, tanto consultando a Apollon directamente como transfiriendo ejemplos desde un modelo sustituto, y lo compara con cada clasificador del conjunto usado por separado. Durante el ataque se mantienen fijas las características funcionales del flujo (27 en CIC-IDS2017) para que el ataque siga siendo válido.

Las cifras definitivas son las del artículo. El paquete instalable (versión 2.0.0, de 2026) es posterior a la publicación: reorganiza el código original, que se conserva en `research/` junto con las salidas registradas de los experimentos, y permite volver a lanzarlos paso a paso.

## Pruébalo

Requiere Python 3.10 o superior. La demo usa tráfico sintético, sin descargar ningún dataset:

```bash
pip install "apollon-ids @ git+https://github.com/antoniopaya22/apollon"
apollon demo
```

Con los CSV de CIC-IDS2017, los comandos `prepare`, `train`, `evaluate` y `attack` llevan del dato en bruto a la evaluación adversaria; el [inicio rápido](https://antoniopaya22.github.io/apollon/es/getting-started/quickstart/) los detalla.
