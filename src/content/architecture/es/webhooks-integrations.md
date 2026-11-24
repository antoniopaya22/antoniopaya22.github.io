---
title: "Webhooks e integraciones resilientes"
short: "Webhooks"
summary: "Recibir webhooks de terceros sin perder ni duplicar eventos y llamar a APIs ajenas sin que sus caídas te arrastren: firma verificada, evento crudo guardado, 2xx inmediato, cola, procesado idempotente y llamadas salientes con timeout, reintentos y circuit breaker."
description: "Webhooks con verificación HMAC, inbox de eventos, cola, DLQ, idempotencia, reintentos con backoff y circuit breaker en AWS, Azure, GCP y on-premises."
order: 8
requirements:
  - "Solo se acepta un webhook con firma HMAC válida y timestamp dentro de la ventana permitida."
  - "Todo evento aceptado queda guardado en crudo antes de responder 2xx, y se responde en milisegundos."
  - "Un mismo evento entregado varias veces produce un único efecto."
  - "Lo que falla de forma persistente acaba en una DLQ con alarma y se puede reprocesar."
  - "Las llamadas salientes tienen timeout, reintentos con backoff y jitter, y se cortan si el tercero está caído."
  - "Se respetan los límites de ritmo de cada proveedor externo."
platforms:
  onprem:
    summary: "Un receptor HTTP en Kubernetes verifica la firma con el secreto de OpenBao, guarda el evento en una tabla inbox de PostgreSQL y lo publica en RabbitMQ, donde workers escalados con KEDA lo procesan y el dead-letter exchange aparta lo que falla."
    notes:
      - "La restricción única `(provider, event_id)` en la tabla inbox es la primera barrera contra duplicados: el segundo `INSERT` falla y el receptor responde 2xx sin volver a encolar."
      - "Usa colas quorum con límite de entregas para que un mensaje envenenado acabe en el DLX en lugar de reencolarse sin fin."
      - "Particiona la inbox por fecha y borra particiones antiguas: es mucho más barato que un `DELETE` masivo."
      - "OpenBao guarda los secretos de firma por proveedor; durante una rotación el receptor acepta el secreto actual y el anterior."
      - "El coste es operar PostgreSQL, RabbitMQ y OpenBao, y exponer el receptor a Internet a través de una DMZ o un proxy inverso con TLS."
  aws:
    summary: "API Gateway entrega el webhook a una Lambda que verifica la firma con el secreto de Secrets Manager, guarda el evento en DynamoDB y lo envía a SQS; otra Lambda lo procesa y la política de redrive manda lo que falla a una DLQ."
    notes:
      - "Con API Gateway el cuerpo puede llegar codificado en base64 (`isBase64Encoded`): decodifícalo y calcula el HMAC sobre esos bytes, nunca sobre el JSON reparseado."
      - "Una escritura condicional (`attribute_not_exists`) en DynamoDB detecta duplicados en la entrada; TTL borra los eventos viejos sin consumir capacidad de escritura."
      - "SQS FIFO deduplica por `MessageDeduplicationId` solo durante cinco minutos: no sustituye a la idempotencia del procesador."
      - "En el mapeo de SQS a Lambda, `ReportBatchItemFailures` evita reintentar el lote entero y la concurrencia máxima limita el ritmo contra la API del tercero."
      - "HTTP API no admite AWS WAF directamente: si lo necesitas, REST API o CloudFront delante."
  azure:
    summary: "Una función con disparador HTTP verifica la firma con el secreto de Key Vault, guarda el evento en Cosmos DB y lo envía a una cola de Service Bus; otra función lo procesa y la subcola de mensajes fallidos recoge lo que no se puede procesar."
    notes:
      - "Service Bus Standard y Premium tienen detección de duplicados por `MessageId` en una ventana configurable; usa el `event_id` del proveedor como `MessageId`."
      - "Lee el cuerpo como bytes (`req.Body` o equivalente) antes de cualquier binding que lo deserialice; si no, el HMAC no cuadra."
      - "El change feed de Cosmos DB puede disparar una función que encola lo que el receptor guardó pero no llegó a enviar."
      - "Un TTL en el contenedor de Cosmos DB limpia la inbox sin trabajos de borrado."
      - "Functions Flex Consumption permite integración con red virtual y NAT Gateway cuando el tercero exige una IP de salida fija."
  gcp:
    summary: "Cloud Run recibe el webhook, verifica la firma con el secreto de Secret Manager, guarda el evento en Firestore y lo publica en Pub/Sub; una suscripción entrega a Cloud Run functions y la política de dead-letter aparta lo que falla."
    notes:
      - "Usa el `event_id` como ID del documento en Firestore con `create()`: si ya existe, falla y sabes que es un duplicado."
      - "La entrega exactamente una vez de Pub/Sub solo existe en suscripciones pull y dentro de una región; con push sigue siendo al menos una vez."
      - "Un disparador de Firestore vía Eventarc puede publicar en Pub/Sub lo que se guardó, cerrando el hueco entre inbox y cola."
      - "Las políticas TTL de Firestore borran eventos viejos sin código propio."
      - "Si el tercero limita el ritmo, Cloud Tasks controla envíos por segundo y concurrencia por cola mejor que Pub/Sub."
tiers:
  - name: "Mínimo viable"
    when: "Pocos proveedores y cientos de eventos al día, un equipo pequeño que quiere no perder eventos sin montar infraestructura."
    cost: 1
    ops: 1
    onprem: "Un host con Docker Compose: el receptor y PostgreSQL, que hace de inbox y de cola con `SELECT … FOR UPDATE SKIP LOCKED`; un worker en otro contenedor."
    aws: "HTTP API + Lambda, tabla DynamoDB on-demand, cola SQS estándar con DLQ y una Lambda consumidora."
    azure: "Functions Flex Consumption, Cosmos DB serverless y una cola de Service Bus Standard con su subcola de mensajes fallidos."
    gcp: "Cloud Run como receptor, Firestore, un tema de Pub/Sub con dead-letter y Cloud Run functions como procesador."
    tradeoffs: "Sin relay entre inbox y cola ni limitación por proveedor: si el envío a la cola falla después de guardar, hay que reprocesar a mano."
  - name: "Equilibrado"
    when: "Varios proveedores, algunos con dinero de por medio, y APIs de terceros con límites de ritmo."
    cost: 2
    ops: 2
    onprem: "k3s o RKE2 con el receptor en varias réplicas, RabbitMQ con colas quorum, workers escalados por KEDA, PostgreSQL con CloudNativePG y un relay que reenvía lo pendiente de la inbox."
    aws: "Lo anterior más DynamoDB Streams con EventBridge Pipes hacia SQS, una cola por proveedor, alarmas sobre la DLQ y concurrencia máxima en cada consumidor."
    azure: "Lo anterior más una función sobre el change feed de Cosmos DB, detección de duplicados en Service Bus, una cola por proveedor y alertas sobre los mensajes fallidos."
    gcp: "Lo anterior más un disparador de Firestore vía Eventarc, un tema por proveedor y Cloud Tasks para las llamadas salientes con límite de ritmo."
    tradeoffs: "Más piezas que vigilar y un procedimiento de reproceso que hay que documentar y probar."
  - name: "Gran volumen y alta disponibilidad"
    when: "Plataforma que integra decenas de proveedores o miles de eventos por minuto, con acuerdos de nivel de servicio."
    cost: 3
    ops: 3
    onprem: "Receptores en dos centros de datos tras un balanceador global, RabbitMQ y PostgreSQL replicados, archivo de eventos en Ceph RGW y circuit breakers por proveedor."
    aws: "Receptor en varias regiones con DynamoDB global tables, CloudFront con AWS WAF delante, archivo en S3 y colas separadas por proveedor y prioridad."
    azure: "Front Door con WAF, Service Bus Premium con zonas de disponibilidad, Cosmos DB con varias regiones en throughput provisionado y archivo en Blob Storage."
    gcp: "Balanceador global con Cloud Armor, Cloud Run en varias regiones, Firestore multirregión y archivo en Cloud Storage."
    tradeoffs: "Coste fijo mayor y deduplicación más delicada: un mismo evento puede entrar por dos regiones a la vez."
extensions:
  - name: "WAF y lista de IPs del proveedor"
    when: "Cuando el proveedor publica sus rangos de IP o el endpoint recibe tráfico abusivo."
    cost: "medium"
    onprem: "Traefik + Coraza"
    aws: "AWS WAF (REST API o CloudFront)"
    azure: "Front Door + WAF"
    gcp: "Cloud Armor"
  - name: "Relay inbox → cola por change feed"
    when: "Cuando no puedes permitirte un evento guardado que nunca llegó a la cola."
    cost: "low"
    onprem: "Debezium o un poller de pendientes"
    aws: "DynamoDB Streams + EventBridge Pipes"
    azure: "Change feed de Cosmos DB"
    gcp: "Disparador de Firestore (Eventarc)"
  - name: "Límite de ritmo saliente por proveedor"
    when: "Cuando la API de terceros tiene cuotas por segundo o por día."
    cost: "low"
    onprem: "Token bucket en Redis"
    aws: "Concurrencia máxima del mapeo SQS"
    azure: "maxConcurrentCalls + Azure Managed Redis"
    gcp: "Cloud Tasks (límites por cola)"
  - name: "Archivo de eventos crudos"
    when: "Auditoría, disputas o reprocesos más allá del TTL de la inbox."
    cost: "low"
    onprem: "Ceph RGW"
    aws: "Amazon S3"
    azure: "Blob Storage"
    gcp: "Cloud Storage"
  - name: "IP de salida fija"
    when: "Cuando el tercero solo acepta llamadas desde IPs registradas."
    cost: "medium"
    onprem: "Proxy de salida (Squid o Envoy)"
    aws: "Lambda en VPC + NAT Gateway con EIP"
    azure: "Integración con VNet + NAT Gateway"
    gcp: "Direct VPC egress + Cloud NAT"
savings:
  - "Responde 2xx y procesa después con funciones que escalan a cero: con tráfico de webhooks, que llega a ráfagas, pagar por invocación sale más barato que tener workers encendidos."
  - "Usa Lambda en arm64 (Graviton) y procesa en lotes: el tamaño de lote y la ventana de agrupación del mapeo de SQS reducen invocaciones."
  - "Borra la inbox con TTL (DynamoDB TTL, TTL de Cosmos DB, políticas TTL de Firestore, particiones por fecha en PostgreSQL) y mueve el archivo a clases de almacenamiento frías."
  - "No pongas un NAT Gateway solo por costumbre: si el tercero no exige IP fija, la función no necesita estar en una red privada; y si lo está, usa endpoints de VPC para los servicios del propio proveedor de nube."
  - "Service Bus Standard se paga por operación y suele bastar; Premium tiene coste fijo por unidad y solo compensa con aislamiento, red privada o volumen sostenido."
  - "No registres el cuerpo completo de cada webhook en los logs: ya está en la inbox, y la ingesta de logs suele costar más que el almacenamiento de la tabla."
---

## Cuándo lo necesitas

En cuanto otro sistema te avisa por HTTP de algo que importa: un pago confirmado, un push a un repositorio, un pedido creado en el ERP, una firma completada. Los proveedores reintentan si no respondes rápido con 2xx, entregan el mismo evento más de una vez y no garantizan el orden. Y en sentido contrario, cuando tu sistema llama a una API ajena, esa API se cae, se ralentiza o te limita. Si procesas el webhook dentro de la petición y llamas al tercero sin protección, un proveedor lento acaba tumbando el tuyo y los eventos duplicados se convierten en cobros dobles.

## Escenarios

### Pasarela de pagos

Cada evento mueve dinero. La idempotencia no es opcional: la clave es el `event_id` del proveedor y el efecto de negocio (marcar el pedido como pagado) se registra en la misma transacción que la marca de evento procesado. La ventana de timestamp se mantiene corta y la inbox se conserva el tiempo que exija la conciliación.

### Webhooks de Git hacia CI

Ráfagas grandes al hacer merge y tolerancia a algo de retraso. Lo importante es absorber el pico: la cola amortigua y los workers escalan con su profundidad. El orden casi nunca importa, porque el worker consulta el estado actual del repositorio.

### Integración con un ERP lento

El ERP acepta pocas peticiones por segundo y a veces tarda minutos. El diseño se desplaza hacia la salida: una cola por destino, concurrencia limitada en el consumidor, timeouts cortos, reintentos con backoff exponencial y jitter, y un circuit breaker que deja de llamar cuando la tasa de error se dispara y prueba de nuevo pasado un tiempo.

### Empresa regulada con datos en la UE

Los payloads contienen datos personales. La inbox se cifra con clave propia, vive en una región de la UE y tiene retención definida; los logs registran identificadores, no cuerpos. El secreto de firma se rota con periodicidad y se audita quién lo lee.

### Cliente que exige on-premises sin tráfico entrante

Si no se puede abrir un endpoint público, el receptor se coloca en una DMZ o se sustituye la recepción por sondeo: un job consulta periódicamente la API de eventos del proveedor, si la tiene, y alimenta la misma inbox. El resto del diseño no cambia.

## Cómo encaja

El proveedor externo envía el evento con una firma HMAC en una cabecera, normalmente junto a un timestamp. El receptor lee el cuerpo como bytes sin tocarlo, obtiene el secreto de firma del gestor de secretos, calcula el HMAC sobre el timestamp y esos bytes y lo compara en tiempo constante. Si el timestamp cae fuera de la ventana permitida, rechaza el evento aunque la firma sea buena: así se frenan los replays. Durante una rotación, acepta la firma del secreto nuevo o del anterior.

Con la firma válida, el receptor guarda el evento crudo en la inbox con una restricción única sobre `(provider, event_id)`. Si ya existía, es un reenvío: responde 2xx y termina. Si es nuevo, lo envía a la cola y responde 2xx, todo en milisegundos y sin lógica de negocio.

El procesador toma mensajes de la cola, comprueba si el evento ya produjo su efecto, aplica la lógica y lo marca como procesado. Cuando necesita llamar a la API de un tercero, lo hace con timeout, reintentos con backoff exponencial y jitter, y un circuit breaker. Un mensaje que falla una y otra vez pasa a la DLQ, que dispara una alarma; tras corregir la causa, se reinyecta en la cola principal.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Un proxy inverso con TLS (Traefik o Caddy), el contenedor del receptor, un worker y PostgreSQL con volumen persistente. PostgreSQL hace de inbox y de cola con `SKIP LOCKED`, lo que ahorra RabbitMQ. Los secretos se leen de OpenBao o de un fichero protegido, y las copias son un `pg_dump` programado más archivo de WAL. Sirve para volúmenes modestos con un único punto de fallo asumido.

**Kubernetes on-premises.** k3s o RKE2 con el receptor como `Deployment` de varias réplicas tras el ingress, cert-manager para los certificados, CloudNativePG para la inbox, el operador de RabbitMQ con colas quorum y KEDA escalando los workers por longitud de cola. External Secrets Operator sincroniza los secretos de firma desde OpenBao. Compensa cuando ya hay plataforma Kubernetes y varios equipos integran proveedores.

**Cloud sin Kubernetes.** Es el encaje natural: receptor y procesador como funciones o Cloud Run, cola gestionada, base de datos de pago por uso. Escala a cero entre ráfagas y no hay nada que parchear. Es la opción por defecto salvo que ya tengas un clúster.

**Kubernetes gestionado.** EKS, AKS o GKE con KEDA leyendo SQS, Service Bus o Pub/Sub. Tiene sentido si las integraciones forman parte de una plataforma de microservicios existente o los procesadores necesitan dependencias pesadas y ejecuciones largas.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Bajo | Media | Manual, un host | Volumen pequeño, on-premises |
| Kubernetes on-premises | Medio | Alta | KEDA por cola | Plataforma interna existente |
| Serverless en la nube | Casi nulo | Baja | Automático, a cero | Opción por defecto |
| Kubernetes gestionado | Medio | Media | KEDA por cola | Ya hay clúster o procesos largos |

## Decisiones clave

- **Cómo cerrar el hueco entre inbox y cola.** Guardar y encolar son dos escrituras que no comparten transacción. O aceptas reprocesar a mano los raros casos en que falla el envío, o pones un relay: un barrido periódico de eventos guardados y no encolados, o un change feed (DynamoDB Streams, change feed de Cosmos DB, disparadores de Firestore vía Eventarc) que encola desde la propia inbox.
- **Deduplicar en la entrada o en el procesador.** La restricción única de la inbox y la deduplicación de la cola (Service Bus por `MessageId`, SQS FIFO durante cinco minutos) reducen duplicados, pero solo un procesador idempotente los elimina.
- **Una cola o una por proveedor.** Una cola compartida es más simple; una por proveedor evita que un tercero caído llene la cola de todos y permite limitar el ritmo por destino.
- **Procesar el payload o volver a consultar.** Tratar el webhook como aviso y leer el estado actual de la API del proveedor evita problemas de orden y de payloads antiguos, a cambio de una llamada más.

## Errores habituales

- Calcular el HMAC sobre el JSON ya parseado y reserializado, o sobre el cuerpo en base64 que entrega el gateway, en lugar de sobre los bytes originales.
- Comparar firmas con `==` en lugar de una comparación en tiempo constante.
- Validar la firma pero no el timestamp, dejando la puerta abierta a replays.
- Hacer la lógica de negocio antes de responder, superar el timeout del proveedor y provocar sus reintentos.
- Reintentar llamadas salientes sin backoff, sin jitter y sin límite, convirtiendo la caída de un tercero en un ataque contra él.
- Una DLQ sin alarma ni procedimiento de reproceso probado.
- Rotar el secreto de firma de golpe y rechazar durante minutos todos los eventos firmados con el anterior.
