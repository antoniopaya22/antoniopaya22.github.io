---
title: "Arquitectura orientada a eventos"
short: "Eventos y pub/sub"
summary: "Un servicio publica hechos de negocio («pedido creado») y varios consumidores reaccionan sin que el productor los conozca, con la garantía de que ningún evento se pierde entre la base de datos y el bus."
description: "Outbox transaccional, bus de eventos y consumidores idempotentes con esquemas versionados: arquitectura de referencia en AWS, Azure, GCP y on-premises."
order: 6
requirements:
  - "Un evento se publica si y solo si la transacción de negocio se confirma."
  - "Cada consumidor recibe todos los eventos al menos una vez y tolera duplicados."
  - "Añadir un consumidor no obliga a tocar el productor."
  - "El orden se garantiza donde hace falta (por pedido), no de forma global."
  - "Los esquemas de eventos están versionados y los cambios son compatibles hacia atrás."
  - "Un consumidor caído se pone al día reprocesando, sin intervención manual."
platforms:
  onprem:
    summary: "Debezium lee la outbox de PostgreSQL y publica en Apache Kafka; los consumidores son workers en Kubernetes y Kafka Connect vuelca los eventos en ClickHouse."
    notes:
      - "Debezium lee el WAL de PostgreSQL y su transformación Outbox Event Router publica cada fila de la outbox en el topic que toca, sin polling."
      - "La clave del mensaje (el id del pedido) fija la partición y, con ella, el orden por entidad."
      - "Para esquemas, Apicurio Registry o Karapace son open source; el Schema Registry de Confluent usa una licencia comunitaria que no es OSI."
      - "El conector de ClickHouse para Kafka Connect evita escribir y operar un consumidor propio de analítica."
      - "Kafka (con KRaft) es la pieza que más conocimiento exige: réplicas, retención, particiones y discos son decisiones tuyas."
  aws:
    summary: "Un relay publica la outbox de Aurora en EventBridge; las reglas enrutan a Lambdas de facturación y avisos (que envía por SES) y a Data Firehose, que deja los eventos en S3 para consultarlos con Athena."
    notes:
      - "No hay CDC nativo de Aurora a EventBridge: el relay es un proceso propio (un servicio en ECS que lee la outbox y llama a `PutEvents`) o Debezium hacia Kinesis y de ahí al bus con EventBridge Pipes."
      - "EventBridge no garantiza orden. Si el orden por entidad importa, usa SNS FIFO con SQS FIFO o Amazon MSK."
      - "Configura reintentos y DLQ en cada destino, o pon una cola SQS entre la regla y la Lambda, para no perder eventos cuando el consumidor falla."
      - "El registro de esquemas de EventBridge descubre y versiona esquemas, y el archivo con reproducción permite reprocesar eventos pasados."
      - "Se paga por evento publicado, por volumen en Firehose y por datos escaneados en Athena: convierte a Parquet y particiona por fecha."
  azure:
    summary: "Un relay publica la outbox en un topic de Service Bus; cada consumidor tiene su suscripción procesada por Azure Functions, los avisos salen por Communication Services y la analítica acaba en Microsoft Fabric."
    notes:
      - "Cada suscripción es una copia independiente con su propia DLQ; los filtros SQL o de correlación evitan que un consumidor reciba lo que no le toca."
      - "Para orden por pedido, activa sesiones y usa el id del pedido como `SessionId`; la detección de duplicados descarta reenvíos del relay dentro de una ventana."
      - "Service Bus no tiene registro de esquemas: Azure Schema Registry forma parte de Event Hubs. Si no lo adoptas, versiona los contratos en un repositorio compartido."
      - "Para analítica de gran volumen, Event Hubs con Eventstream de Fabric es más natural que una Function; la Function es razonable con volumen moderado."
      - "Los topics requieren nivel Standard o Premium; Fabric se paga por capacidad, así que dimensiónala o páusala cuando no se use."
  gcp:
    summary: "Un relay publica la outbox en un topic de Pub/Sub; Cloud Run functions atienden facturación y avisos (con SendGrid desde Marketplace) y una suscripción de BigQuery escribe directamente en el almacén."
    notes:
      - "Debezium Server tiene destino Pub/Sub, así que el relay puede ser CDC sobre Cloud SQL con decodificación lógica en lugar de polling."
      - "Las claves de ordenación dan orden por entidad y hay que activarlas también en la suscripción; sin ellas no hay orden."
      - "Los esquemas de Pub/Sub (Avro o Protocol Buffers) admiten revisiones y validan los mensajes al publicar."
      - "La suscripción de BigQuery elimina el consumidor de analítica: Pub/Sub escribe en la tabla usando el esquema del topic o columnas de metadatos."
      - "Google Cloud no tiene servicio propio de email transaccional; SendGrid u otro proveedor llega vía Marketplace y se factura aparte."
tiers:
  - name: "Outbox con polling y bus gestionado"
    when: "Un monolito o pocos servicios, volumen moderado y un equipo que quiere desacoplar sin operar un log distribuido."
    cost: 1
    ops: 1
    onprem: "Un host con Docker Compose: PostgreSQL, un relay que sondea la outbox con `FOR UPDATE SKIP LOCKED`, Kafka de un nodo en modo KRaft y los consumidores como contenedores."
    aws: "Un relay pequeño en ECS que lee la outbox y llama a `PutEvents`, un bus de EventBridge con reglas hacia Lambda y Data Firehose hacia S3."
    azure: "Un relay en Container Apps que publica en un topic de Service Bus Standard y una suscripción por consumidor atendida por Azure Functions."
    gcp: "Un relay en Cloud Run que publica en Pub/Sub, Cloud Run functions para los consumidores y una suscripción de BigQuery para la analítica."
    tradeoffs: "El polling añade latencia y carga a la tabla; sin registro de esquemas, los contratos dependen de la disciplina del equipo; el Kafka de un nodo no tiene réplicas."
  - name: "CDC y contratos versionados"
    when: "Varios equipos publican y consumen, la latencia importa y un cambio de esquema no puede romper a nadie."
    cost: 2
    ops: 2
    onprem: "Debezium sobre el WAL publica en Kafka de tres brokers gestionado con Strimzi, Apicurio Registry valida esquemas y Kafka Connect vuelca en ClickHouse."
    aws: "Debezium hacia Kinesis y EventBridge Pipes hasta el bus, registro de esquemas y archivo de EventBridge, y una cola SQS con DLQ delante de cada Lambda."
    azure: "Service Bus con sesiones para orden por pedido y detección de duplicados; Event Hubs con Schema Registry y Eventstream de Fabric para la analítica."
    gcp: "Debezium Server sobre Cloud SQL publica en Pub/Sub con esquemas y claves de ordenación; suscripción de BigQuery y dead-letter en cada consumidor."
    tradeoffs: "CDC es otra pieza crítica: el slot de replicación lógica, sus permisos y su comportamiento en un failover pasan a ser responsabilidad tuya."
  - name: "Log de eventos a gran escala"
    when: "Decenas de consumidores, reproducción del historial como requisito y volúmenes que exigen particionado."
    cost: 4
    ops: 3
    onprem: "Kafka en varios racks o salas con réplicas repartidas, tiered storage hacia almacenamiento de objetos, un clúster de Kafka Connect dedicado y Flink para el streaming."
    aws: "Amazon MSK con MSK Connect ejecutando Debezium, consumidores en ECS o Lambda y Firehose escribiendo tablas Iceberg o Parquet en S3."
    azure: "Event Hubs Premium o Dedicated con el endpoint de Kafka, Schema Registry y Fabric como almacén analítico."
    gcp: "Managed Service for Apache Kafka, o Pub/Sub si no necesitas el protocolo de Kafka, con BigQuery como almacén."
    tradeoffs: "Coste fijo alto y especialistas: particiones, retención, rebalanceos y capacidad de disco se planifican y se revisan."
extensions:
  - name: "Registro de esquemas"
    when: "En cuanto hay más de un equipo consumiendo los mismos eventos."
    cost: "low"
    onprem: "Apicurio Registry"
    aws: "Registro de esquemas de EventBridge"
    azure: "Schema Registry (Event Hubs)"
    gcp: "Esquemas de Pub/Sub"
  - name: "Archivo y reproducción"
    when: "Para reconstruir un consumidor nuevo o corregir uno que procesó mal durante días."
    cost: "medium"
    onprem: "Retención de Kafka + tiered storage"
    aws: "Archivo y reproducción de EventBridge"
    azure: "Event Hubs con retención y Capture"
    gcp: "Retención de Pub/Sub y seek"
  - name: "Orden por entidad"
    when: "Cuando los eventos de un mismo pedido deben procesarse en el orden en que ocurrieron."
    cost: "low"
    onprem: "Clave de partición en Kafka"
    aws: "SNS FIFO + SQS FIFO"
    azure: "Sesiones de Service Bus"
    gcp: "Claves de ordenación de Pub/Sub"
  - name: "Relay por CDC"
    when: "Cuando el polling de la outbox añade demasiada latencia o carga a la base de datos."
    cost: "medium"
    onprem: "Debezium (Kafka Connect)"
    aws: "Debezium, Kinesis y EventBridge Pipes"
    azure: "Debezium Server hacia Event Hubs"
    gcp: "Debezium Server hacia Pub/Sub"
  - name: "Procesado en streaming"
    when: "Agregados en ventanas de tiempo, detección de fraude o enriquecimiento antes del almacén."
    cost: "high"
    onprem: "Apache Flink"
    aws: "Managed Service for Apache Flink"
    azure: "Azure Stream Analytics"
    gcp: "Dataflow"
  - name: "Webhooks hacia terceros"
    when: "Cuando socios externos quieren recibir los eventos en su propio endpoint HTTP."
    cost: "low"
    onprem: "Worker con cola de reintentos"
    aws: "EventBridge API destinations"
    azure: "Event Grid (webhooks)"
    gcp: "Cloud Tasks + Cloud Run"
savings:
  - "Filtra en el bus y no en el consumidor: reglas de EventBridge, filtros de suscripción de Service Bus y filtros de suscripción de Pub/Sub evitan invocaciones (y facturas) para eventos que el consumidor iba a descartar."
  - "Usa los consumidores sin código cuando existen: la suscripción de BigQuery, Data Firehose o Kafka Connect evitan pagar y operar una función por cada evento de analítica."
  - "Convierte a Parquet y particiona por fecha en Firehose: Athena cobra por datos escaneados, y una consulta sobre JSON sin particionar lee todo el histórico."
  - "Pausa la capacidad de Fabric cuando no se use y dimensiónala por la carga real; es coste fijo por hora aunque no lleguen eventos."
  - "Ajusta la retención del log a lo que de verdad reproduces y mueve lo antiguo a tiered storage en lugar de comprar disco para los brokers."
  - "Agrupa en los consumidores: tamaño de lote y ventana en el mapeo de SQS a Lambda (en `arm64`) o en el trigger de Functions reducen invocaciones sin cambiar la lógica."
---

## Cuándo lo necesitas

Cuando un mismo hecho de negocio interesa a varios sistemas y no quieres que el productor llame a cada uno. Al crear un pedido hay que facturar, avisar al cliente y alimentar la analítica; si el servicio de pedidos hace esas tres llamadas, cualquier fallo o lentitud de una de ellas rompe la venta, y cada nuevo interesado exige cambiar su código. Con eventos, el productor publica un hecho y se olvida.

No lo necesitas si solo hay un consumidor y siempre lo habrá: eso es una cola de trabajos. Y no sustituye a una llamada síncrona cuando el usuario necesita la respuesta para continuar.

## Escenarios

### Un monolito que empieza a crecer

El primer paso no es Kafka. La outbox en la misma base de datos, un relay que la sondea cada segundo y un bus gestionado (EventBridge, Service Bus o Pub/Sub) bastan para sacar la facturación y los avisos del camino crítico. Cuando el polling se note en la base de datos o en la latencia, se cambia el relay por CDC sin tocar productores ni consumidores.

### Empresa regulada que necesita auditoría

Los eventos se convierten en evidencia: retención larga, archivo inmutable y reproducción para reconstruir qué pasó. El conflicto aparece con el RGPD: un log inmutable con datos personales no se puede «borrar». Publica identificadores y lo imprescindible, deja los datos personales en el servicio dueño y, si deben viajar, cifra cada sujeto con su propia clave para poder destruirla.

### Picos de campaña

En un Black Friday el productor sigue escribiendo a su ritmo y el bus absorbe la diferencia; lo que crece es el retraso de cada consumidor. Escala los consumidores por retraso (KEDA con el scaler de Kafka, la concurrencia de Lambda o las réplicas de Functions) y pon un techo para no tumbar la base de datos de facturación. El aviso al cliente puede ir con minutos de retraso; la factura, con horas.

### Portabilidad entre nubes o con on-premises

Si el mismo producto se instala en casa del cliente y en cloud, el protocolo de Kafka es el denominador común: Amazon MSK, el endpoint de Kafka de Event Hubs y Managed Service for Apache Kafka lo hablan. A cambio renuncias al enrutado por reglas de EventBridge o a los filtros de Service Bus, y el filtrado vuelve al consumidor.

## Cómo encaja

El servicio de pedidos escribe el pedido y, en la misma transacción, una fila en la tabla outbox con el evento serializado: id del evento, tipo, versión de esquema, id del pedido como clave y la carga. Si la transacción se deshace, el evento tampoco existe. Un relay (CDC sobre el log de la base de datos o un proceso que lee la tabla) publica esas filas en el bus y las marca como enviadas. Si el relay cae entre publicar y marcar, al volver publicará de nuevo: entrega al menos una vez.

El bus entrega una copia a cada suscriptor. Facturación registra el cargo; avisos envía el correo; analítica vuelca el evento en el almacén. Cada consumidor guarda el id de los eventos ya procesados (en la misma transacción que su efecto) o hace operaciones idempotentes, porque recibirá duplicados. Lo que falla repetidamente va a la DLQ del consumidor, no del bus, para que un consumidor roto no afecte a los demás.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** PostgreSQL con `wal_level=logical`, Kafka en modo KRaft, Kafka Connect con los conectores de Debezium y de ClickHouse, Apicurio Registry, ClickHouse, los consumidores y Postfix como relay SMTP hacia tu proveedor de correo. Volúmenes para PostgreSQL, Kafka y ClickHouse. Copia PostgreSQL y ClickHouse; Kafka no es una copia de seguridad, es retención. Útil para desarrollo, demos y clientes pequeños; un broker no tolera fallos.

**Kubernetes on-premises.** Strimzi gestiona Kafka, Kafka Connect y cada conector como recursos de Kubernetes; Debezium es un `KafkaConnector` más. CloudNativePG o Patroni para PostgreSQL, comprobando que el slot de replicación lógica sobrevive a un failover (slots de failover de PostgreSQL 17 o slots permanentes de Patroni). KEDA escala los consumidores por retraso del grupo y el operador de Altinity gestiona ClickHouse.

**Cloud sin Kubernetes.** Es el diseño del diagrama: el relay como servicio siempre encendido en ECS, Container Apps o Cloud Run; consumidores en Lambda, Azure Functions o Cloud Run functions; y los consumidores sin código (Firehose, suscripción de BigQuery) donde existen.

**Kubernetes gestionado.** EKS, AKS o GKE tienen sentido para consumidores de larga duración con mucho estado local o si quieres operar Kafka con Strimzi en la nube. Casi siempre compensa más el bus gestionado y los consumidores en el clúster.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Un host | Media | Manual | Desarrollo, cliente pequeño |
| Kubernetes + Strimzi | Clúster y discos de Kafka | Alta | Particiones y KEDA | On-premises con reproducción |
| Bus gestionado + funciones | Casi nulo | Baja | Automático por evento | Opción por defecto en cloud |
| EKS, AKS, GKE + bus gestionado | Plano de control y nodos | Media | HPA o KEDA | Consumidores largos o con estado |

## Decisiones clave

- **Outbox o doble escritura.** Escribir en la base de datos y después publicar en el bus parece equivalente, pero si el proceso muere en medio, la base de datos y el resto del sistema divergen. La outbox lo resuelve con una única transacción.
- **CDC o polling.** CDC tiene latencia baja y no carga la tabla, pero añade una pieza que operar; el polling es simple y suficiente con volumen moderado.
- **Log o bus de enrutado.** Kafka o Pub/Sub permiten releer el historial; EventBridge o Service Bus enrutan y filtran mejor pero la reproducción es más limitada.
- **Evento ligero o con estado.** Un evento con solo ids obliga a los consumidores a llamar al productor; uno con el estado completo los desacopla pero fija un contrato más grande. Publica lo que los consumidores necesitan, versionado.
- **Orden por clave, no global.** El orden global mata el paralelismo. Ordena por entidad (id del pedido) y diseña los consumidores para eventos fuera de orden entre entidades.

## Errores habituales

- Publicar el evento antes de confirmar la transacción: llegan eventos de pedidos que no existen.
- Eventos con el estado completo de la entidad sin versión de esquema, que rompen consumidores al añadir un campo obligatorio.
- Consumidores que no son idempotentes y cobran dos veces.
- Usar eventos para pedir cosas («envía este email») en lugar de comunicar hechos; eso es una cola.
- Un slot de replicación lógica abandonado: PostgreSQL retiene WAL para él hasta llenar el disco del primario.
- No vigilar el retraso de cada suscripción hasta que un consumidor lleva días atrasado.
