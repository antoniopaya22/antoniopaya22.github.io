---
title: "Observabilidad con OpenTelemetry"
short: "Observabilidad"
summary: "Instrumentar servicios una sola vez con OpenTelemetry, enviar métricas, logs y trazas a través de un colector a los backends que toque, y alertar sobre objetivos de servicio (SLO) que reflejan lo que nota el usuario, sin que la factura de ingesta se dispare."
description: "Observabilidad con OpenTelemetry: SDK, colector, métricas, logs, trazas, paneles, alertas por SLO y sondas sintéticas en AWS, Azure, GCP y on-premises."
order: 18
requirements:
  - "Los servicios se instrumentan con OpenTelemetry y exportan OTLP; cambiar de backend no exige tocar código."
  - "Métricas, logs y trazas comparten atributos de recurso y el id de traza, para saltar de una señal a otra."
  - "Las alertas se basan en SLO (tasa de consumo del presupuesto de error), no en umbrales de CPU."
  - "Sondas externas comprueban los recorridos críticos desde fuera aunque no haya tráfico."
  - "La cardinalidad de métricas y el volumen de logs y trazas están limitados y medidos por servicio."
platforms:
  onprem:
    summary: "Los servicios envían OTLP a OpenTelemetry Collector o Grafana Alloy, que reparte a Prometheus o Mimir, Loki y Tempo; Grafana presenta, Alertmanager avisa y el blackbox exporter sondea desde fuera."
    notes:
      - "Despliega el colector en dos capas: un agente por nodo (DaemonSet) que añade metadatos de Kubernetes y una pasarela que agrupa, filtra y muestrea antes de enviar."
      - "El muestreo por cola (tail sampling) necesita que todos los spans de una traza lleguen a la misma réplica: usa el exportador `loadbalancing` por id de traza delante de la pasarela."
      - "Mimir, Loki, Tempo y Grafana tienen licencia AGPLv3; Prometheus, Alertmanager y el colector de OpenTelemetry son Apache 2.0. Revísalo si distribuyes la pila a clientes."
      - "Las reglas de SLO con tasa de consumo multiventana se generan con Sloth o Pyrra a partir de un fichero por servicio, en lugar de escribirlas a mano."
      - "El coste es disco y memoria: Prometheus crece con las series activas, y Loki y Tempo con el volumen guardado en almacenamiento de objetos."
  aws:
    summary: "El ADOT Collector envía métricas a Amazon Managed Service for Prometheus, logs a CloudWatch Logs y trazas a X-Ray; Amazon Managed Grafana presenta, las alarmas de CloudWatch avisan y CloudWatch Synthetics sondea."
    notes:
      - "Los SDK y el daemon de X-Ray están en mantenimiento desde el 25 de febrero de 2026 y dejan de tener soporte el 25 de febrero de 2027: instrumenta con OpenTelemetry y envía las trazas por OTLP al endpoint de X-Ray."
      - "CloudWatch acepta OTLP directamente para trazas y logs (solo HTTP, con firma SigV4), y desde 2026 también métricas OpenTelemetry consultables con PromQL; es una alternativa a Managed Prometheus si prefieres un solo servicio."
      - "Application Signals de CloudWatch define SLO sobre latencia y disponibilidad de cada servicio y alarma por tasa de consumo."
      - "CloudWatch Logs cobra por GB ingerido y almacenado: fija retención en cada grupo de logs y usa la clase Infrequent Access para logs que casi no se consultan."
      - "Managed Prometheus cobra por muestras ingeridas y consultadas, así que la cardinalidad y el intervalo de recogida mandan en la factura."
  azure:
    summary: "Un OpenTelemetry Collector envía métricas al Prometheus gestionado de Azure Monitor, logs a Log Analytics y trazas a Application Insights; Azure Managed Grafana presenta, las alertas de Azure Monitor avisan y los availability tests sondean."
    notes:
      - "Azure Monitor admite ingesta OTLP nativa desde el colector y desde Azure Monitor Agent; la Azure Monitor OpenTelemetry Distro es la vía más corta para instrumentar desde el SDK."
      - "Application Insights guarda sus datos en un workspace de Log Analytics, así que logs y trazas se consultan juntos con KQL."
      - "Log Analytics cobra por GB ingerido: el plan Basic y los niveles de compromiso abaratan logs de alto volumen, y las transformaciones en la regla de recogida descartan campos antes de pagar."
      - "Usa standard tests para las sondas; los URL ping tests clásicos están en retirada."
      - "Los grupos de acciones centralizan a quién se avisa y cómo (correo, webhook, herramienta de guardias), y una regla de alerta puede usar PromQL sobre el workspace de Prometheus."
  gcp:
    summary: "Un OpenTelemetry Collector envía métricas a Managed Service for Prometheus, logs a Cloud Logging y trazas a Cloud Trace; Cloud Monitoring presenta y alerta con políticas de SLO, y las uptime checks sondean."
    notes:
      - "La Telemetry API (`telemetry.googleapis.com`) acepta OTLP para trazas, métricas y logs; las métricas se guardan como series de Prometheus y se facturan como muestras ingeridas."
      - "Google publica su propia distribución del colector (Google-Built OpenTelemetry Collector) con los exportadores y la autenticación ya configurados."
      - "Cloud Monitoring tiene SLO de servicio nativos con alertas por tasa de consumo; son la forma más directa de cumplir el requisito de alertar por SLO."
      - "Cloud Logging cobra por GiB ingerido por encima del tramo gratuito: los filtros de exclusión en el sink descartan logs ruidosos antes de facturarlos."
      - "Grafana puede consultar Managed Prometheus con PromQL si el equipo ya trabaja con Grafana en lugar de los paneles de Cloud Monitoring."
tiers:
  - name: "Lo nativo del proveedor"
    when: "Un equipo pequeño con pocos servicios que quiere ver errores y latencia sin montar nada."
    cost: 1
    ops: 1
    onprem: "Un host con Docker Compose: colector, Prometheus, Loki, Tempo y Grafana con retención corta en disco local."
    aws: "SDK de OpenTelemetry con exportación OTLP directa a CloudWatch y X-Ray, Application Signals para SLO y alarmas de CloudWatch."
    azure: "Azure Monitor OpenTelemetry Distro hacia Application Insights, alertas de Azure Monitor y standard tests."
    gcp: "SDK de OpenTelemetry con exportación a la Telemetry API, paneles y SLO de Cloud Monitoring y uptime checks."
    tradeoffs: "Sin colector no hay muestreo ni filtrado central: todo lo que emite el código se paga, y cambiar de backend obliga a reconfigurar cada servicio."
  - name: "Colector y backends gestionados"
    when: "Decenas de servicios, varios equipos y necesidad de controlar coste y cardinalidad."
    cost: 2
    ops: 2
    onprem: "Kubernetes con el operador de OpenTelemetry, colector en agente y pasarela, Mimir, Loki y Tempo sobre almacenamiento de objetos, y Grafana."
    aws: "El diseño del diagrama: ADOT Collector, Managed Prometheus, CloudWatch Logs, X-Ray, Managed Grafana, alarmas y Synthetics."
    azure: "El diseño del diagrama: colector, Prometheus gestionado, Log Analytics, Application Insights, Managed Grafana y alertas."
    gcp: "El diseño del diagrama: colector, Managed Service for Prometheus, Cloud Logging, Cloud Trace, Cloud Monitoring y uptime checks."
    tradeoffs: "La pasarela del colector es una pieza más que operar y escalar; si cae, se pierde telemetría salvo que tenga cola persistente."
  - name: "Observabilidad de plataforma"
    when: "Muchos equipos, varias cuentas o regiones, SLO contractuales y presupuesto de observabilidad por equipo."
    cost: 4
    ops: 3
    onprem: "Mimir, Loki y Tempo multiinquilino con límites por equipo, colectores por clúster y Grafana con carpetas y permisos por equipo."
    aws: "Cuentas de observabilidad centralizadas con CloudWatch cross-account, un workspace de Prometheus por entorno y Grafana con SSO."
    azure: "Workspaces de Log Analytics y de Azure Monitor por entorno con reglas de recogida comunes y Managed Grafana central."
    gcp: "Ámbitos de métricas que agregan varios proyectos, buckets de logs centralizados y SLO por servicio."
    tradeoffs: "El coste de ingesta crece con cada equipo; sin límites por inquilino, un servicio mal instrumentado se come el presupuesto de todos."
extensions:
  - name: "Perfilado continuo"
    when: "Cuando la latencia o el coste de CPU no se explican con trazas."
    cost: "low"
    onprem: "Grafana Pyroscope"
    aws: "Pyroscope en ECS o EKS"
    azure: "Application Insights Profiler"
    gcp: "Cloud Profiler"
  - name: "Monitorización real de usuario"
    when: "Cuando lo que se degrada es el navegador o la app, no el backend."
    cost: "medium"
    onprem: "Grafana Faro"
    aws: "CloudWatch RUM"
    azure: "SDK JavaScript de App Insights"
    gcp: "SDK web de OpenTelemetry"
  - name: "Gestión de guardias"
    when: "Cuando hay rotaciones, escalados y alguien debe confirmar que ha visto la alerta."
    cost: "low"
    onprem: "Grafana OnCall o Alertmanager"
    aws: "SNS + herramienta externa"
    azure: "Grupos de acciones + herramienta externa"
    gcp: "Notificaciones + herramienta externa"
  - name: "Archivo de logs barato"
    when: "Cuando auditoría exige conservar logs meses o años que casi nadie consulta."
    cost: "low"
    onprem: "Loki con almacenamiento de objetos"
    aws: "Exportación a S3 + Athena"
    azure: "Plan Auxiliary de Log Analytics"
    gcp: "Sink a Cloud Storage o BigQuery"
  - name: "Muestreo por cola"
    when: "Cuando guardar todas las trazas es caro pero quieres conservar las de error y las lentas."
    cost: "low"
    onprem: "Tail sampling en la pasarela"
    aws: "Tail sampling en ADOT"
    azure: "Tail sampling en el colector"
    gcp: "Tail sampling en el colector"
savings:
  - "Filtra en el colector antes de enviar: descarta logs de depuración, health checks y atributos de alta cardinalidad (ids de usuario, URLs completas) en las métricas."
  - "Muestrea trazas: un porcentaje fijo para el tráfico normal y siempre las de error o latencia alta mediante muestreo por cola."
  - "Fija retención explícita por tipo de log y usa los niveles baratos (CloudWatch Logs Infrequent Access, plan Basic o Auxiliary de Log Analytics, buckets con retención corta en Cloud Logging)."
  - "Sube el intervalo de recogida de métricas de 15 a 60 segundos donde no haga falta más resolución: reduce las muestras ingeridas en la misma proporción."
  - "Usa niveles de compromiso de Log Analytics o reservas cuando la ingesta diaria sea estable."
  - "Apaga o reduce las sondas sintéticas de entornos que no son de producción y ajusta su frecuencia al SLO, no al mínimo posible."
---

## Cuándo lo necesitas

En cuanto hay más de un servicio y alguien pregunta «¿por qué va lento?» sin poder contestar en minutos. Con un monolito y una base de datos, los logs del servidor y las métricas del proveedor bastan. Con varios servicios, colas y dependencias externas, una petición lenta atraviesa cinco sistemas y solo una traza distribuida dice dónde se perdió el tiempo.

El segundo motivo es la factura: sin un punto central donde filtrar y muestrear, la observabilidad acaba costando una parte notable de la infraestructura que observa.

## Escenarios

- **Startup con tres servicios.** El SDK de OpenTelemetry con autoinstrumentación exporta directamente al backend nativo de la nube. Un SLO de disponibilidad y otro de latencia del endpoint principal, y una sonda sintética del registro y del pago. Sin colector propio todavía.
- **Empresa con varios equipos y Kubernetes.** Operador de OpenTelemetry que inyecta la autoinstrumentación, colector en agente y pasarela, límites de cardinalidad por equipo y paneles estándar por servicio. Cada equipo es dueño de sus SLO.
- **Sector regulado.** Los logs contienen datos personales: el colector los enmascara antes de salir del clúster, la retención está definida por tipo y los logs de auditoría van a un archivo inmutable separado de los operativos.
- **Cliente on-premises o sin salida a internet.** Pila Grafana completa (Mimir, Loki, Tempo) con almacenamiento de objetos local; las sondas se ejecutan desde otra red para no compartir el destino del sistema que vigilan.
- **Migración entre nubes o hacia un SaaS de observabilidad.** Como el código solo habla OTLP, el cambio se hace en el colector: se envía en paralelo a ambos destinos durante la transición y se apaga el antiguo.

## Cómo encaja

Cada servicio lleva el SDK de OpenTelemetry, que genera métricas, logs y trazas con los mismos atributos de recurso (`service.name`, versión, entorno) y propaga el contexto de traza en las llamadas salientes. Todo se exporta por OTLP al colector.

El colector es el punto de control: añade metadatos (pod, nodo, región), agrupa, filtra lo que no se quiere pagar, muestrea trazas y reenvía cada señal a su backend. Las métricas van al almacén compatible con Prometheus; los logs, al almacén de logs; las trazas, al de trazas. Como comparten el id de traza, desde un log de error se salta a la traza y desde un pico en un panel se llega a trazas de ejemplo (exemplars).

Los paneles leen métricas para ver salud y tendencia. Las alertas se definen sobre SLO: por ejemplo, el 99,5 % de las peticiones al checkout tienen éxito en menos de 800 ms en 30 días; se avisa cuando el presupuesto de error se consume demasiado rápido. Las métricas de latencia y error que alimentan esos SLO pueden derivarse de las trazas en el colector o el backend, que es lo que representa la flecha de trazas a alertas.

Las sondas sintéticas atacan desde fuera los recorridos críticos y alertan aunque no haya tráfico real, por ejemplo de madrugada.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Para un entorno pequeño o de laboratorio: colector de OpenTelemetry, Prometheus, Loki, Tempo y Grafana, con volúmenes locales y retención corta, y Alertmanager enviando a correo o chat. Caddy delante de Grafana con TLS. Es útil también en el portátil de desarrollo para ver trazas en local.

**Kubernetes on-premises (k3s o RKE2).** OpenTelemetry Operator (recurso `OpenTelemetryCollector` en modo DaemonSet y Deployment, e `Instrumentation` para autoinstrumentar), kube-prometheus-stack o Mimir, Loki y Tempo en modo distribuido sobre almacenamiento de objetos (Ceph o MinIO), cert-manager para TLS y Sloth o Pyrra para las reglas de SLO.

**Cloud sin Kubernetes.** En ECS Fargate, Container Apps o Cloud Run, el colector va como contenedor auxiliar (sidecar) o como servicio pasarela compartido; en funciones, se usa la capa o extensión de OpenTelemetry o la exportación directa. Los backends son los gestionados del proveedor.

**Kubernetes gestionado (EKS, AKS, GKE).** Mismo operador de OpenTelemetry y backends gestionados; los complementos de cada proveedor (ADOT en EKS, Prometheus gestionado en AKS y GKE) instalan los agentes con un clic.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Muy bajo | Media | Un host | Laboratorio, pocos servicios |
| Kubernetes on-prem | Medio (discos) | Alta | Horizontal | Soberanía, sin salida a internet |
| Backends gestionados sin K8s | Por ingesta | Baja | Automático | Contenedores o funciones gestionados |
| Kubernetes gestionado | Por ingesta | Media | Horizontal | Plataforma Kubernetes existente |

## Decisiones clave

- **OpenTelemetry o agentes del proveedor.** OpenTelemetry cuesta algo más de configurar, pero desacopla el código del backend; los agentes propietarios son más rápidos de poner en marcha y te atan.
- **Colector central o exportación directa.** Sin colector todo es más simple, pero no hay muestreo por cola, ni filtrado, ni enmascarado común. Con más de un puñado de servicios, el colector se paga solo.
- **Gestionado o autoalojado.** La pila Grafana autoalojada es barata en licencias y cara en personas; los backends gestionados cobran por ingesta y hay que vigilar el volumen.
- **Alertar por SLO o por síntomas técnicos.** Las alertas por CPU o memoria despiertan sin que el usuario note nada; las de SLO avisan cuando de verdad se está incumpliendo lo prometido. Conserva unas pocas alertas técnicas para fallos que anticipan una caída (disco lleno, certificado a punto de caducar).

## Errores habituales

- Poner el id de usuario, de pedido o la URL completa como etiqueta de métrica y multiplicar las series activas.
- Registrar cada petición con el cuerpo completo en logs de nivel informativo en producción.
- No propagar el contexto de traza a través de colas y trabajos asíncronos, con lo que las trazas se cortan justo donde está el problema.
- Alertas que nadie atiende porque saltan a diario; acaban silenciadas y la real pasa desapercibida.
- Seguir instrumentando con los SDK de X-Ray en proyectos nuevos.
- Sondas sintéticas ejecutadas desde la misma red o región que el sistema que vigilan.
