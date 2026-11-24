---
title: "Arquitectura orientada a eventos"
short: "Eventos y pub/sub"
summary: "Un servicio publica hechos de negocio («pedido creado») y varios consumidores reaccionan sin que el productor los conozca, con la garantía de que ningún evento se pierde entre la base de datos y el bus."
description: "Outbox transaccional, bus de eventos y consumidores idempotentes con esquemas versionados: arquitectura de referencia en AWS, Azure, GCP y on-premises."
order: 3
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
---

## Cuándo lo necesitas

Cuando un mismo hecho de negocio interesa a varios sistemas y no quieres que el productor llame a cada uno. Al crear un pedido hay que facturar, avisar al cliente y alimentar la analítica; si el servicio de pedidos hace esas tres llamadas, cualquier fallo o lentitud de una de ellas rompe la venta, y cada nuevo interesado exige cambiar su código. Con eventos, el productor publica un hecho y se olvida.

## Cómo encaja

El servicio de pedidos escribe el pedido y, en la misma transacción, una fila en la tabla outbox con el evento serializado. Si la transacción se deshace, el evento tampoco existe. Un relay (CDC sobre el log de la base de datos o un proceso que lee la tabla) publica esas filas en el bus y las marca como enviadas. Si el relay cae entre publicar y marcar, al volver publicará de nuevo: entrega al menos una vez.

El bus entrega una copia a cada suscriptor. Facturación registra el cargo; avisos envía el correo; analítica vuelca el evento en el almacén. Cada consumidor guarda el id de los eventos ya procesados o hace operaciones idempotentes, porque recibirá duplicados.

## Decisiones clave

- **Outbox o doble escritura.** Escribir en la base de datos y después publicar en el bus parece equivalente, pero si el proceso muere en medio, la base de datos y el resto del sistema divergen. La outbox lo resuelve con una única transacción.
- **CDC o polling.** CDC tiene latencia baja y no carga la tabla, pero añade una pieza que operar; el polling es simple y suficiente con volumen moderado.
- **Log o bus de enrutado.** Kafka o Pub/Sub permiten releer el historial; EventBridge o Service Bus enrutan y filtran mejor pero la reproducción es más limitada.
- **Orden por clave, no global.** El orden global mata el paralelismo. Ordena por entidad (id del pedido) y diseña los consumidores para eventos fuera de orden entre entidades.

## Errores habituales

- Publicar el evento antes de confirmar la transacción: llegan eventos de pedidos que no existen.
- Eventos con el estado completo de la entidad sin versión de esquema, que rompen consumidores al añadir un campo obligatorio.
- Consumidores que no son idempotentes y cobran dos veces.
- Usar eventos para pedir cosas («envía este email») en lugar de comunicar hechos; eso es una cola.
- No vigilar el retraso de cada suscripción hasta que un consumidor lleva días atrasado.
