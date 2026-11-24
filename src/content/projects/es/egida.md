---
title: Egida
tagline: Despliegue automatizado de configuraciones de seguridad basadas en los CIS Benchmarks sobre infraestructuras de servidores
description: "Egida: orquestador de bastionado de servidores que despliega controles de los CIS Benchmarks con Ansible y un lenguaje propio, Aspida."
kind: research
year: 2022
status: Computers & Security, 2022
repo: https://github.com/Egida-Kassandra/egida
site: https://egida-kassandra.github.io/egida/
paper: https://doi.org/10.1016/j.cose.2022.102638
stack: [Go, Ansible, ANTLR, Lynis]
facts:
  - { value: "3", label: "módulos: egida, egida-roles y egida-api" }
  - { value: "CIS", label: "Benchmarks como fuente de los controles" }
  - { value: "Aspida", label: "lenguaje específico de dominio para el bastionado" }
  - { value: "Apache-2.0", label: "licencia" }
links:
  - { label: "Documentación", href: "https://egida-kassandra.github.io/egida/" }
  - { label: "Lenguaje Aspida", href: "https://egida-kassandra.github.io/egida/dsl/" }
  - { label: "Código fuente", href: "https://github.com/Egida-Kassandra/egida" }
  - { label: "Versiones", href: "https://github.com/Egida-Kassandra/egida/releases" }
order: 7
---

## El problema

Bastionar un servidor siguiendo los CIS Benchmarks supone aplicar una larga lista de controles, y lo adecuado para cada máquina depende de su perfil: qué servicios ejecuta, qué sistema operativo tiene o cómo de protegida está ya. Hacerlo a mano en toda una infraestructura es lento y propenso a errores. Egida automatiza ese despliegue de configuraciones de seguridad sobre grupos de servidores y adapta las medidas al perfil de cada uno.

## Cómo funciona

Egida tiene una arquitectura de microservicios con tres módulos:

- **egida**, el módulo principal, ofrece la interfaz de usuario y procesa Aspida, el lenguaje propio del proyecto.
- **egida-roles** define los roles de Ansible con las acciones de cada control: operaciones de bastionado de los CIS Benchmarks o pasos de preparación de la máquina.
- **egida-api** recoge información de cada host, como los servicios en ejecución, la versión del sistema o la puntuación de Lynis.

Al estilo de Ansible, se trabaja con grupos de hosts a los que se conecta por SSH o en local. Desde un menú de consola se eligen benchmarks completos, secciones, controles o puntos concretos, y un fichero de variables ajusta valores como el puerto SSH o la política de contraseñas.

Aspida permite escribir scripts de bastionado con cuatro bloques (`MAIN`, `HOST`, `TASKS` y `VARS`) e incluye condicionales `IF`/`ELSE`/`ELIF` que deciden qué aplicar según el estado de la máquina; por ejemplo, unas secciones u otras según si el servicio `ufw` está parado.

## Resultados

El sistema se publicó en *Computers & Security* (vol. 116, 102638, 2022) con el título «Egida: Automated security configuration deployment systems with early error detection», firmado por Antonio Payá, Alba Cotarelo y José Manuel Redondo. La web del proyecto documenta el uso de la herramienta y no recoge cifras de evaluación; para el detalle del sistema hay que ir al artículo. El código está publicado con licencia Apache 2.0.

## Pruébalo

La documentación indica Ubuntu 18.04 LTS o superior, una versión de Ansible posterior a la 2.8 y Python 3 en el nodo maestro. Tras instalar el núcleo, se crea un grupo de hosts y se compila un script de Aspida:

```bash
sudo egida add-group -c ssh -g webservers -H 192.168.1.3 -H 192.168.1.2
sudo egida compile -f /examples/example_cond.aspida
```

La sintaxis completa del lenguaje está en la [guía de Aspida](https://egida-kassandra.github.io/egida/dsl/).
