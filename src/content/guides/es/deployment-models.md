---
title: "Docker, Kubernetes o serverless: cómo desplegar"
short: "Cómo desplegar"
summary: "Cinco formas de poner un contenedor o una función en producción, de un docker-compose en una VM a Kubernetes gestionado, comparadas por coste fijo, operación, escalado y límites, con un árbol de decisión."
description: "Docker Compose, Kubernetes propio, PaaS de contenedores, Kubernetes gestionado o funciones: costes, operación, límites y cuándo elegir cada modelo."
order: 1
---

La pregunta «¿Docker, Kubernetes o serverless?» suele llegar mal planteada: no compite la tecnología, compite cuánta plataforma quieres operar tú y cuánta le pagas a otro. Las cinco opciones de esta guía ejecutan la misma imagen de contenedor (o casi), pero se diferencian en quién parchea, quién escala, quién se despierta a las tres de la mañana y cuánto pagas aunque no haya tráfico.

Mi punto de partida por defecto para un producto nuevo es un **PaaS de contenedores**: escala sin gestionar nodos, cobra poco sin tráfico y no ata el código a ningún proveedor. Las demás opciones se justifican por razones concretas que se explican abajo.

## Las cinco opciones de un vistazo

| | Compose en un host | Kubernetes propio | PaaS de contenedores | Kubernetes gestionado | Funciones |
|---|---|---|---|---|---|
| Coste fijo mínimo | Una VM o un servidor | Varios nodos (plano de control + workers) y almacenamiento | Casi cero con escala a cero | Plano de control (~0,10 USD/h en EKS, AKS Standard y GKE) más nodos | Cero |
| Coste a escala | El más bajo por unidad de cómputo, hasta que no cabe en una máquina | Bajo por unidad si hay volumen; caro en personas | Medio: pagas recargo por no gestionar | Bajo-medio en cómputo, más el coste de operar los add-ons | Alto con tráfico sostenido |
| Esfuerzo de operación | Bajo-medio: SO, copias, actualizaciones | Muy alto | Bajo | Medio-alto | Muy bajo |
| Escalado | Vertical, manual | Horizontal (HPA, KEDA) si hay nodos | Horizontal automático | Horizontal automático, nodos incluidos | Automático por petición o evento |
| Escala a cero | No | Con KEDA o Knative, pero los nodos siguen ahí | Sí en Container Apps y Cloud Run; no en Fargate ni App Service | Pods sí; plano de control no | Sí |
| Arranque en frío | No aplica | No, salvo escala a cero | Segundos al salir de cero | No, salvo escala a cero | Cientos de ms a segundos |
| Portabilidad | Total | Total | Alta: la imagen es estándar, la configuración no | Alta: manifiestos de Kubernetes | Baja: disparadores y SDK propios |
| Límites | Los de la máquina | Los de los nodos | Cloud Run: 8 vCPU, 32 GiB, 60 min por petición; Fargate: 32 vCPU, 244 GB | Los de los nodos | Lambda: 30 min, 10 GB; Flex Consumption: 4 GB, HTTP 230 s |
| Equipo necesario | Una persona con criterio de sistemas | Equipo de plataforma con guardias | Desarrolladores con nociones de cloud | Al menos dos personas que dominen Kubernetes | Desarrolladores |
| Cuándo | Un producto pequeño, un cliente on-prem, presupuesto mínimo | Soberanía, on-prem obligatorio, escala grande y estable | Casi cualquier API o web nueva | Muchos servicios, necesidades de Kubernetes, equipo ya formado | Tráfico esporádico, eventos, tareas cortas |

## 1. Docker Compose en un host

Un servidor propio o una VM (EC2, Azure VM, Compute Engine) con Docker, un fichero `compose.yaml` y un proxy inverso delante. Es la opción más infravalorada: una VM de 4 vCPU con PostgreSQL, la API y un proxy atiende sin problemas a miles de usuarios de una aplicación de gestión.

```yaml
services:
  proxy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes: ["./Caddyfile:/etc/caddy/Caddyfile", "caddy_data:/data"]
  api:
    image: registry.example.com/api@sha256:…
    env_file: .env
    depends_on:
      db: { condition: service_healthy }
    restart: unless-stopped
  db:
    image: postgres:17
    volumes: ["pg_data:/var/lib/postgresql/data"]
    healthcheck: { test: ["CMD", "pg_isready"], interval: 10s }
    restart: unless-stopped
volumes: { caddy_data: {}, pg_data: {} }
```

Lo que hay que resolver tú:

- **TLS y proxy.** Caddy obtiene y renueva certificados automáticamente sin configuración. Traefik también lo hace vía ACME, pero hay que declarar un `certificatesResolvers` y referenciarlo en cada router.
- **Copias.** `pg_dump` programado o, mejor, copia continua con WAL (pgBackRest, WAL-G) hacia almacenamiento de objetos en otro sitio, más instantáneas del disco. Prueba la restauración cada mes.
- **Actualizaciones.** Parches automáticos del SO (`unattended-upgrades` o equivalente), imágenes fijadas por digest y un procedimiento `docker compose pull && docker compose up -d` que el CI pueda ejecutar. Usa `docker compose` (v2): el antiguo `docker-compose` v1 dejó de mantenerse en 2023.
- **Observabilidad.** Logs del driver de Docker con rotación y un agente que los envíe fuera; métricas del host y alertas de disco.

El límite es claro: un host es un punto único de fallo, el escalado es vertical y cada despliegue tiene un corte breve salvo que montes un esquema azul/verde a mano. Si el negocio tolera minutos de caída en una actualización, es una opción excelente.

## 2. Kubernetes propio (on-prem o local)

Tiene sentido cuando el despliegue debe ser on-prem (soberanía, clientes que lo exigen, centros de datos propios) o cuando la escala es grande y estable y tienes un equipo de plataforma. No es la forma barata de empezar: es la forma de no depender de un proveedor a cambio de operar todo.

| Distribución | Para qué |
|---|---|
| k3s | Binario único y ligero; edge, laboratorios, clústeres pequeños. Proyecto CNCF Sandbox. |
| RKE2 | Distribución de SUSE Rancher orientada a seguridad y cumplimiento (perfil CIS); producción on-prem. |
| Talos Linux | SO inmutable y mínimo dedicado a Kubernetes, sin SSH, gestionado por API; reduce la superficie y la deriva de configuración. |

Un clúster desnudo no ejecuta una aplicación de producción. Los operadores y componentes que acabas instalando casi siempre:

| Necesidad | Pieza |
|---|---|
| PostgreSQL con réplicas, failover y copias | CloudNativePG (CNCF Incubating) |
| Certificados TLS | cert-manager |
| Entrada HTTP | Una implementación de Gateway API: Envoy Gateway, Traefik, Cilium, Istio |
| IP de servicio en bare metal | MetalLB o kube-vip |
| Escalado por colas y a cero | KEDA |
| Secretos desde un almacén externo | External Secrets Operator con OpenBao o Vault |
| Almacenamiento persistente | Longhorn (sencillo) o Rook-Ceph (más capacidad y complejidad) |
| Despliegue declarativo | Argo CD o Flux |
| Métricas y logs | Prometheus, Grafana, Loki |

Ojo con ingress-nginx: el proyecto de Kubernetes se retiró en marzo de 2026 y ya no recibe parches de seguridad. Para clústeres nuevos, Gateway API; para los existentes, plan de migración.

**Lo que cuesta operarlo.** Kubernetes publica tres versiones menores al año y cada una recibe parches durante aproximadamente un año, así que actualizas el clúster y todos los operadores varias veces al año. Además: copias de etcd y de los volúmenes, gestión de CVE en nodos e imágenes, capacidad para el pico (no hay elasticidad real sin hardware de sobra) y guardias. Con menos de dos personas que sepan arreglarlo un domingo, no lo hagas.

## 3. PaaS de contenedores sin Kubernetes

Das una imagen, defines CPU, memoria, réplicas y variables, y el proveedor se encarga de nodos, balanceo, TLS y escalado. Es el mejor equilibrio para la mayoría de APIs y webs.

| Servicio | Escala a cero | Límites relevantes | Notas |
|---|---|---|---|
| Cloud Run (GCP) | Sí | 8 vCPU y 32 GiB por instancia; 60 min por petición | Concurrencia por instancia configurable; *worker pools* para cargas de tipo pull; jobs para tareas |
| Azure Container Apps | Sí, en perfil Consumption | Consumption: hasta 4 vCPU y 8 GiB por réplica | Escalado con KEDA integrado; perfiles Dedicated para más tamaño; GPU serverless |
| ECS Fargate (AWS) | No de forma nativa (puedes bajar a 0 tareas, pero no despierta sola con una petición) | Hasta 32 vCPU y 244 GB | ECS Express Mode crea servicio, ALB, escalado y URL con una sola llamada |
| App Service for Containers (Azure) | No: pagas las instancias del plan | Los del plan (Basic a PremiumV4) | Encaja con equipos que ya usan App Service; ranuras de despliegue |
| AWS App Runner | — | — | Cerrado a clientes nuevos desde el 30 de abril de 2026; AWS recomienda ECS Express Mode |

Lo que no resuelven: la base de datos, la red privada y la observabilidad siguen siendo tuyas. Y en Fargate hay costes fijos que no se ven en la tarea: el ALB, el NAT Gateway si las tareas salen a Internet desde subredes privadas y las IPv4 públicas.

## 4. Kubernetes gestionado

El proveedor opera el plano de control; tú, los nodos (o una parte), los add-ons y las aplicaciones. Se justifica cuando tienes muchos servicios, necesitas el ecosistema de Kubernetes (operadores, service mesh, GitOps, cargas con GPU) o quieres el mismo modelo en cloud y on-prem.

| | EKS | AKS | GKE |
|---|---|---|---|
| Plano de control | 0,10 USD/h por clúster; 0,60 USD/h en soporte extendido | Free sin SLA; Standard 0,10 USD/h; Premium 0,60 USD/h | 0,10 USD/h por clúster; crédito mensual que cubre un clúster zonal o Autopilot por cuenta de facturación |
| Modo «sin nodos que gestionar» | EKS Auto Mode (recargo por instancia gestionada) | AKS Automatic | GKE Autopilot (cobra por recursos solicitados por los pods) |
| Ingress / Gateway nativo | AWS Load Balancer Controller | Application Gateway for Containers | GKE Gateway |
| Identidad de pods | EKS Pod Identity | Workload Identity | Workload Identity Federation for GKE |

Precios de lista en USD a noviembre de 2026. El plano de control es la parte pequeña de la factura: los nodos, los balanceadores que crea cada `Service` o `Gateway`, el NAT, los logs y el almacenamiento pesan mucho más. Y sigues actualizando: los tres proveedores obligan a subir de versión o a pagar soporte extendido.

## 5. Funciones serverless

Código que se ejecuta por petición o por evento, sin servidor ni contenedor que gestionar (aunque todos admiten imágenes de contenedor). Pagas por invocación y duración; sin tráfico, no pagas.

| | AWS Lambda | Azure Functions (Flex Consumption) | Cloud Run functions |
|---|---|---|---|
| Duración máxima | 30 min (desde noviembre de 2026) | 30 min por defecto, sin máximo forzado; HTTP limitado a 230 s | HTTP 60 min; por eventos 9 min |
| Memoria | 128 MB a 10.240 MB | Instancias de 512, 2.048 o 4.096 MB | Hasta 32 GiB |
| Concurrencia por instancia | Una petición por entorno (salvo Managed Instances) | Configurable | Configurable |
| Red privada | VPC | Integración con red virtual | Salida VPC directa o conector |
| Extras | Managed Instances (sobre EC2), durable functions | Instancias *always ready* | Es Cloud Run por debajo |

En Azure, el plan Consumption en Linux se retira el 30 de septiembre de 2028: los proyectos nuevos van en Flex Consumption.

Las funciones brillan con tráfico irregular, eventos (un fichero subido, un mensaje en una cola) y tareas cortas. Sufren con tráfico alto y constante (sale más caro que un contenedor), conexiones largas, dependencias pesadas que alargan el arranque en frío y bases de datos relacionales sin pooler.

## Árbol de decisión

1. **¿Tiene que ejecutarse on-prem o en tu propio hardware?**
   - Sí, una aplicación y un equipo pequeño: **Compose en un host**, con copias fuera de la máquina.
   - Sí, varias aplicaciones, alta disponibilidad y equipo de plataforma: **Kubernetes propio** (RKE2 o Talos).
2. **¿El trabajo es por eventos o el tráfico es esporádico, con tareas de segundos a pocos minutos?** Sí: **funciones**.
3. **¿Tienes ya decenas de servicios, necesitas operadores de Kubernetes o un modelo idéntico entre cloud y on-prem, y gente que domine Kubernetes?** Sí: **Kubernetes gestionado**, a ser posible en modo Autopilot, Automatic o Auto Mode.
4. **¿Presupuesto mínimo, tráfico modesto y toleras minutos de corte en una actualización?** Sí: **Compose en una VM cloud**.
5. **En cualquier otro caso: PaaS de contenedores.** Cloud Run o Container Apps si quieres escala a cero; Fargate (con ECS Express Mode) en AWS.

Revisa la decisión cuando cambien los datos: un equipo que crece de 3 a 30 servicios, una factura de funciones que supera lo que costarían contenedores siempre encendidos o un cliente que exige on-prem.

## Del docker-compose al cloud sin reescribir

La forma de no quedarse atrapado en ninguna de estas opciones es tratar la imagen como un artefacto con un contrato. Si el contenedor lo cumple, pasar de Compose a Cloud Run, Container Apps, ECS o Kubernetes es cambiar la definición del despliegue, no el código.

**El contrato del contenedor:**

- **Puerto por variable.** Escucha en `0.0.0.0:$PORT` (Cloud Run inyecta `PORT`; en el resto lo fijas tú).
- **Salud.** `/health` (o `/healthz` y `/readyz` separados) que responda rápido y no dependa de terceros para el liveness.
- **Configuración por variables de entorno**, sin ficheros de configuración horneados en la imagen. Los secretos llegan como variables o ficheros montados desde el gestor de secretos.
- **Logs a stdout/stderr**, en JSON de una línea por evento. Nada de ficheros de log dentro del contenedor.
- **Sin estado local.** Ficheros subidos a almacenamiento de objetos, sesiones en caché o en tokens. El disco del contenedor es efímero.
- **Apagado ordenado.** Al recibir `SIGTERM`, deja de aceptar peticiones, termina las que tiene en curso y cierra conexiones en menos de 10–30 s.
- **Migraciones fuera del arranque.** Un job o paso del pipeline las ejecuta una vez; si las lanza cada réplica al arrancar, compiten entre sí.
- **Imagen inmutable y firmada**, referenciada por digest, ejecutada como usuario no root y construida para `amd64` y `arm64`.

Con ese contrato, la equivalencia entre plataformas es directa:

| Concepto | Compose | Kubernetes | Cloud Run | Container Apps | ECS Fargate |
|---|---|---|---|---|---|
| Unidad desplegada | `service` | `Deployment` | Servicio | Container App | Servicio + definición de tarea |
| Configuración | `env_file` | `ConfigMap`, `Secret` | Variables y Secret Manager | Variables y Key Vault | Variables y Secrets Manager |
| Salud | `healthcheck` | `livenessProbe`, `readinessProbe` | Sondas de arranque y liveness | Sondas de salud | Health check del contenedor y del ALB |
| Entrada | Caddy o Traefik | Gateway API | URL gestionada o balanceador | Ingress integrado | ALB |
| Réplicas | `deploy.replicas` | HPA | Mín./máx. de instancias | Reglas de escala | Auto Scaling del servicio |
| Tarea puntual | `docker compose run` | `Job` | Cloud Run jobs | Container Apps jobs | Tarea `RunTask` |

El camino habitual es empezar con Compose en una VM o directamente en un PaaS, y llevar la misma imagen a otra plataforma solo cuando una necesidad real (escala, alta disponibilidad, un cliente on-prem) lo exija.
