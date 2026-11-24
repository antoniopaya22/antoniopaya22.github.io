---
title: "Analítica en tiempo real sobre streams"
short: "Streaming analytics"
summary: "Detección de fraude, clickstream o sensores: eventos que entran en un stream, se agregan en ventanas con estado, disparan acciones en segundos y acaban en un OLAP en tiempo real y en el lake."
description: "Stream, procesado con estado (ventanas, watermarks, exactly-once), OLAP en tiempo real y archivo en el lake: arquitectura en AWS, Azure, GCP y on-premises."
order: 28
requirements:
  - "Cada evento lleva su propia marca de tiempo y las ventanas se calculan por tiempo de evento, no por hora de llegada."
  - "Los productores publican contra un esquema registrado; un evento inválido no rompe el procesado."
  - "El procesado guarda su estado en checkpoints y se recupera sin duplicar resultados."
  - "Las acciones críticas (bloquear un pago, abrir una alerta) se disparan en segundos y son idempotentes."
  - "Todo evento crudo queda archivado en el lake para reprocesar y auditar."
  - "Un pico de entrada se absorbe en el stream sin perder datos aunque el procesado vaya por detrás."
platforms:
  onprem:
    summary: "Apache Kafka con Apicurio Registry, Apache Flink para ventanas y estado, ClickHouse como OLAP, Grafana para los paneles y Ceph RGW como archivo."
    notes:
      - "Kafka 4.x funciona solo en modo KRaft, sin ZooKeeper; en Kubernetes, Strimzi gestiona brokers, topics y usuarios como recursos."
      - "Apicurio Registry expone una API compatible con la de Confluent Schema Registry, así que los serializadores habituales de Kafka funcionan sin cambios."
      - "Flink necesita un almacenamiento externo y duradero para checkpoints y savepoints (Ceph RGW vía S3); sin él, reiniciar un job es empezar de cero."
      - "ClickHouse puede leer directamente de Kafka con su motor de tabla Kafka y vistas materializadas, útil para agregados sencillos sin pasar por Flink."
      - "El coste es capacidad: brokers con disco rápido y tres réplicas por partición, más TaskManagers de Flink dimensionados para el pico de estado."
  aws:
    summary: "Kinesis Data Streams con Glue Schema Registry, Amazon Managed Service for Apache Flink, Lambda para las acciones, Redshift con ingesta en streaming, S3 como archivo y Managed Grafana."
    notes:
      - "Kinesis tiene tres modos: On-demand Standard (pago por GB y por stream), On-demand Advantage (opción de cuenta con un consumo mínimo comprometido y precio por GB más bajo) y Provisioned (pagas shards). Con tráfico estable y alto, Advantage o Provisioned salen más baratos."
      - "Managed Service for Apache Flink (antes Kinesis Data Analytics) cobra por KPU-hora y suma una KPU de orquestación por aplicación: muchas aplicaciones pequeñas encarecen la factura."
      - "Redshift lee Kinesis o MSK directamente en una vista materializada con refresco automático; no admite registros agregados con KPL, así que desactiva la agregación en los productores."
      - "Glue Schema Registry admite Avro, JSON Schema y Protobuf, valida compatibilidad entre versiones y no tiene coste propio."
      - "Para el archivo, Amazon Data Firehose escribe en S3 en Parquet o en tablas Iceberg sin código; no hace falta que Flink se ocupe de eso."
  azure:
    summary: "Event Hubs con su registro de esquemas, Azure Stream Analytics para ventanas, Functions para las acciones, Fabric Eventhouse como OLAP con Real-Time Dashboards y Capture hacia Blob Storage."
    notes:
      - "El registro de esquemas de Event Hubs no existe en el nivel Basic (sí en Standard, Premium y Dedicated) y las reglas de compatibilidad solo se aplican a Avro."
      - "Stream Analytics define el tiempo de evento con `TIMESTAMP BY` y tiene políticas de llegada tardía y de desorden: ajústalas o los eventos tardíos se descartan o se reajustan sin que lo veas."
      - "Stream Analytics no tiene una salida específica para Eventhouse: usa la salida de Azure Data Explorer o publica en un Event Hub que lea un Eventstream de Fabric. Su salida a Power BI se retira el 31 de octubre de 2027."
      - "Eventhouse y los Real-Time Dashboards viven en Microsoft Fabric y consumen una capacidad F de pago fijo; si ya no hay Fabric en la casa, valora Azure Data Explorer."
      - "Event Hubs Capture escribe el stream en Blob Storage o ADLS en Avro o Parquet sin código: es el archivo del lake."
  gcp:
    summary: "Pub/Sub con esquemas, Dataflow para ventanas y watermarks, Cloud Run functions para las acciones, BigQuery como OLAP y Cloud Storage como archivo, con Looker Studio encima."
    notes:
      - "Los esquemas de Pub/Sub admiten Avro y Protocol Buffers (no JSON Schema) y un mensaje que no cumple el esquema se rechaza al publicar."
      - "Dataflow procesa exactly-once por defecto; el modo at-least-once es más barato y con menos latencia si tu destino ya deduplica."
      - "Dataflow escribe en BigQuery con la Storage Write API; si no necesitas transformar, una suscripción de BigQuery en Pub/Sub carga directamente sin pipeline."
      - "Las continuous queries de BigQuery ejecutan SQL continuo y exportan a Pub/Sub, Bigtable o Spanner, pero exigen reservas Enterprise y las operaciones con estado (JOIN, ventanas) siguen en preview."
      - "Looker Studio no es un panel push: consulta BigQuery con caché y frecuencia de refresco configurable. Para segundos, Grafana con el conector de BigQuery."
tiers:
  - name: "Ingesta directa al OLAP"
    when: "Paneles con segundos o minutos de retraso, agregados sencillos y un equipo sin experiencia en Flink."
    cost: 1
    ops: 1
    onprem: "Kafka de un nodo o tres pequeños y ClickHouse con el motor de tabla Kafka y vistas materializadas; Grafana encima."
    aws: "Kinesis on-demand con ingesta en streaming a Redshift Serverless y vistas materializadas con refresco automático; Firehose a S3."
    azure: "Event Hubs Standard con Capture y un Eventstream de Fabric que carga en Eventhouse; Real-Time Dashboard sobre KQL."
    gcp: "Pub/Sub con suscripción de BigQuery y suscripción de Cloud Storage; vistas en BigQuery y Looker Studio."
    tradeoffs: "Sin estado entre eventos: no hay ventanas de sesión, ni deduplicación fina, ni acciones en milisegundos."
  - name: "Procesado con estado"
    when: "Fraude, alertas de sensores o sesiones de clickstream que necesitan ventanas, joins y acciones en segundos."
    cost: 2
    ops: 2
    onprem: "Kafka de tres brokers con Strimzi, Flink con el operador de Kubernetes y checkpoints en Ceph RGW, ClickHouse replicado."
    aws: "Kinesis, Managed Service for Apache Flink con checkpoints, Lambda para acciones y Redshift con ingesta en streaming."
    azure: "Event Hubs, Stream Analytics con ventanas y salida a Functions, Eventhouse vía Event Hub y Eventstream."
    gcp: "Pub/Sub, Dataflow con Streaming Engine, Cloud Run functions para acciones y BigQuery vía Storage Write API."
    tradeoffs: "Un job con estado es software crítico: hay que versionarlo, actualizarlo con savepoints y vigilar su retraso."
  - name: "Alto volumen y multirregión"
    when: "Pagos o telemetría a gran escala con objetivos de disponibilidad estrictos y varias regiones."
    cost: 4
    ops: 3
    onprem: "Dos clústeres Kafka replicados con MirrorMaker 2, Flink con alta disponibilidad del JobManager y ClickHouse con shards y réplicas."
    aws: "MSK o Kinesis en Provisioned o Advantage por región, Flink por región y Redshift con clústeres multi-AZ."
    azure: "Event Hubs Premium o Dedicated con replicación geográfica, jobs de Stream Analytics por región y Eventhouse con capacidad dedicada."
    gcp: "Pub/Sub global con Dataflow por región y BigQuery multirregión."
    tradeoffs: "Duplicas el procesado y tienes que decidir qué región manda en cada clave para no emitir dos veces la misma acción."
extensions:
  - name: "Cola de eventos inválidos"
    when: "Siempre que haya productores externos: un evento malformado va a cuarentena y el job sigue."
    cost: "low"
    onprem: "Topic DLQ en Kafka"
    aws: "Side output de Flink a otro stream"
    azure: "Consulta con TRY_CAST a Blob"
    gcp: "Dead-letter topic de Pub/Sub"
  - name: "Enriquecimiento con CDC"
    when: "Cuando la regla necesita datos de referencia (límites del cliente, ubicación del sensor) que cambian."
    cost: "medium"
    onprem: "Debezium hacia Kafka"
    aws: "DMS hacia Kinesis"
    azure: "CDC de Fabric en Eventstream"
    gcp: "Datastream"
  - name: "Modelo de ML en línea"
    when: "Fraude o anomalías donde una regla fija no basta y hay que puntuar cada evento."
    cost: "medium"
    onprem: "KServe"
    aws: "SageMaker AI endpoint"
    azure: "Azure ML online endpoint"
    gcp: "Vertex AI endpoint"
  - name: "Alertas sin código"
    when: "Negocio quiere definir umbrales y avisos sin pedir un despliegue."
    cost: "low"
    onprem: "Alertas de Grafana"
    aws: "Alertas de Managed Grafana"
    azure: "Fabric Activator"
    gcp: "Continuous query hacia Pub/Sub"
  - name: "Kafka gestionado"
    when: "Cuando el ecosistema Kafka (Connect, Streams, clientes) pesa más que la integración nativa."
    cost: "medium"
    onprem: "Strimzi"
    aws: "Amazon MSK"
    azure: "Endpoint Kafka de Event Hubs"
    gcp: "Managed Service for Apache Kafka"
  - name: "Reproceso desde el lake"
    when: "Tras corregir un bug en una regla, para recalcular resultados históricos con el mismo código."
    cost: "medium"
    onprem: "Flink en modo batch"
    aws: "Flink leyendo de S3"
    azure: "Spark en Fabric"
    gcp: "Dataflow en batch"
savings:
  - "Si el tráfico de Kinesis es estable y alto, compara On-demand Advantage o Provisioned con On-demand Standard: el modo por defecto es el más caro por GB a volumen sostenido."
  - "Consolida jobs pequeños en una sola aplicación de Managed Flink o en un job de Dataflow: cada aplicación suma su propia KPU de orquestación o sus propios workers mínimos."
  - "En Dataflow usa el modo at-least-once cuando el destino deduplica (BigQuery con claves, ClickHouse con ReplacingMergeTree): ahorra recursos y latencia."
  - "Archiva con Firehose, Event Hubs Capture o una suscripción de Cloud Storage en Parquet comprimido y aplica ciclo de vida a Glacier, Cool/Cold o Archive; no guardes JSON crudo para siempre."
  - "Limita la retención del stream a lo que necesitas para recuperarte (24 horas a 7 días): la retención extendida se paga y el histórico ya está en el lake."
  - "No pagues un OLAP en tiempo real para paneles que se miran una vez al día: un agregado horario en el lake o en el data warehouse sirve y cuesta mucho menos."
---

## Cuándo lo necesitas

Cuando el valor de un dato cae con los segundos. Un pago fraudulento hay que pararlo antes de autorizarlo, no en el informe de mañana; un sensor que supera un umbral debe abrir una alerta mientras la máquina aún funciona; un clickstream sirve para personalizar la sesión que está ocurriendo. Si tus preguntas se responden con datos de ayer, un lakehouse por lotes es más barato y más sencillo: este caso solo compensa cuando la latencia forma parte del requisito.

## Escenarios

### Detección de fraude en pagos

Cada autorización publica un evento con la tarjeta como clave. El job mantiene estado por tarjeta (importes de la última hora, países distintos en diez minutos) y emite una decisión en segundos. Aquí importan el exactly-once en el estado, la idempotencia de la acción de bloqueo y la latencia de cola, no la media. Lo habitual es combinar reglas en el stream con un modelo de ML en línea.

### Clickstream de un comercio electrónico

Volumen alto, valor por evento bajo y tolerancia a perder algún evento. Ventanas de sesión por usuario, embudos y productos más vistos en un OLAP. Suele bastar la opción de ingesta directa al OLAP; el coste lo marcan el volumen de ingesta y la retención, así que muestrea y agrega pronto.

### Sensores industriales con conectividad irregular

Los dispositivos acumulan lecturas y las envían en bloque al recuperar la red: los eventos llegan con minutos u horas de retraso. Si calculas por hora de llegada, las medias son falsas. Ventanas por tiempo de evento, watermarks generosos y una política explícita para los tardíos (corregir la ventana o mandarlos a una salida aparte). Si los sensores llegan por MQTT, el caso de telemetría IoT cubre la entrada.

### Empresa regulada con datos en la UE

El stream contiene datos personales: fija la región, cifra con claves propias, seudonimiza identificadores antes del OLAP y define cuánto tiempo se conserva cada capa. El archivo en el lake es también la prueba de qué decisión se tomó con qué datos.

## Cómo encaja

Las fuentes (aplicaciones, pasarelas de pago, dispositivos) publican en el stream, que es un registro particionado y duradero. Cada evento lleva su clave de partición y su marca de tiempo de origen. Antes de publicar, el productor serializa contra un esquema del registro; el consumidor lee el identificador de esquema y deserializa, de modo que añadir un campo opcional no rompe a nadie y quitar uno obligatorio se rechaza.

El motor de procesado consume el stream y mantiene estado por clave. Las ventanas (tumbling, sliding, de sesión) se cierran según el watermark, que es la estimación del motor de hasta dónde ha llegado el tiempo de evento; lo que llega después del watermark es tardío y tiene una política propia. El estado se guarda en checkpoints periódicos junto con las posiciones de lectura: si un worker cae, el job vuelve al último checkpoint y relee desde ahí, sin duplicar resultados si el destino es transaccional o idempotente.

De las ventanas salen tres caminos. Las decisiones urgentes van a funciones que bloquean, notifican o abren un incidente, siempre con una clave de idempotencia. Los agregados y los eventos enriquecidos van al OLAP en tiempo real, que responde consultas en milisegundos y alimenta los paneles en vivo. Y los eventos crudos se archivan en el lake en formato columnar, para auditoría, entrenamiento de modelos y reproceso.

Si el procesado no da abasto, el stream hace de amortiguador: los eventos esperan con su retención y el retraso del consumidor crece. Flink y Dataflow aplican backpressure hacia la fuente en lugar de perder datos; vigila ese retraso como métrica principal.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Kafka en modo KRaft de un nodo, Apicurio Registry, un JobManager y un TaskManager de Flink, ClickHouse y Grafana, con volúmenes para los logs de Kafka y los datos de ClickHouse, y checkpoints en un bucket S3 externo. Sirve para desarrollo y para cargas pequeñas sin requisitos de disponibilidad: si cae el host, cae todo.

**Kubernetes on-premises.** k3s o RKE2 con Strimzi para Kafka (brokers en tres nodos, rack awareness, topics como recursos), el Flink Kubernetes Operator para desplegar jobs con upgrades vía savepoint, el operador de ClickHouse de Altinity y Grafana. Discos locales rápidos para Kafka y ClickHouse, cert-manager para TLS entre componentes y KEDA si quieres escalar consumidores sencillos por retraso.

**Cloud sin Kubernetes.** Es el diagrama: Kinesis, Event Hubs o Pub/Sub, el motor gestionado (Managed Flink, Stream Analytics, Dataflow) y funciones para las acciones. No hay nodos que parchear, pero sí jobs que versionar y retrasos que vigilar.

**Kubernetes gestionado.** EKS, AKS o GKE con Strimzi y el operador de Flink compensan si necesitas versiones de Flink o conectores que el servicio gestionado no ofrece, o portabilidad exacta con on-premises. Pagas nodos encendidos y operas el estado tú.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Un host | Media | Ninguno | Desarrollo, piloto |
| Kubernetes on-premises | Tres o más nodos con disco rápido | Alta | Particiones y TaskManagers | Exigencia on-premises |
| Servicios gestionados | Bajo o por capacidad mínima | Baja-media | Automático o por unidades | Opción por defecto en cloud |
| EKS, AKS, GKE | Nodos y plano de control | Alta | Manual o con KEDA | Conectores o versiones a medida |

## Decisiones clave

- **Motor con estado o SQL directo en el OLAP.** Si solo agregas por minuto, la ingesta directa a Redshift, Eventhouse, BigQuery o ClickHouse evita un componente entero. En cuanto necesitas joins entre streams, sesiones o acciones por evento, hace falta Flink, Stream Analytics o Dataflow.
- **Tiempo de evento frente a tiempo de proceso.** El tiempo de proceso es más simple y siempre está mal cuando hay retrasos. Usa tiempo de evento y decide cuánto esperas (watermark) y qué haces con lo tardío.
- **Exactly-once o at-least-once con idempotencia.** El exactly-once de extremo a extremo exige un destino transaccional y añade latencia. Muchas veces es más barato procesar at-least-once y deduplicar en el destino por identificador de evento.
- **Kinesis, Event Hubs o Pub/Sub frente a Kafka.** Los nativos se integran mejor con su nube; Kafka (MSK, endpoint Kafka de Event Hubs, Managed Kafka de Google) da portabilidad y el ecosistema de conectores.
- **Esquemas desde el primer día.** Un registro con compatibilidad hacia atrás evita que un despliegue de un productor rompa todos los consumidores.

## Errores habituales

- Ventanas por hora de llegada: un retraso de red se convierte en un pico falso.
- Elegir una clave de partición con poca cardinalidad (el país, el tipo de evento) y crear una partición caliente que limita todo el stream.
- Actualizar un job con estado sin savepoint y perder horas de agregados.
- Acciones no idempotentes: un reintento tras un checkpoint bloquea dos veces o envía dos SMS.
- No medir el retraso del consumidor ni la edad del watermark; el pipeline va horas por detrás y nadie lo ve.
- Publicar JSON libre sin registro de esquemas y descubrir el cambio de un campo en producción.
- Guardar solo los agregados y no el evento crudo: sin archivo no hay reproceso cuando la regla estaba mal.
