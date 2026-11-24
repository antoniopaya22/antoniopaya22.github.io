---
title: "Tiempo real con WebSockets"
short: "Tiempo real"
summary: "Chat, presencia, colaboración, marcadores en directo o paneles que se actualizan solos: conexiones persistentes con miles de clientes, difusión de mensajes entre instancias y notificaciones push cuando el usuario no está conectado."
description: "Tiempo real con WebSockets, presencia, fan-out, reconexión y push móvil, o SSE como alternativa: arquitectura en AWS, Azure, GCP y on-premises."
order: 23
requirements:
  - "Un mensaje publicado llega a todos los clientes suscritos, estén conectados a la instancia que estén."
  - "El cliente se reconecta solo y recupera lo que se perdió mientras estuvo desconectado."
  - "Las conexiones se autentican al abrirse y se autorizan por canal o sala."
  - "El historial vive en una base de datos: la conexión es efímera y nunca es la fuente de verdad."
  - "Si el usuario no está conectado, el aviso importante le llega por push."
platforms:
  onprem:
    summary: "Centrifugo (o Socket.IO con su adaptador de Redis) mantiene las conexiones, Valkey reparte los mensajes entre nodos y guarda la presencia, NATS lleva los eventos de dominio, PostgreSQL el historial y FCM y APNs el push."
    notes:
      - "Centrifugo es un servidor de tiempo real independiente con canales, presencia, historial y recuperación tras reconexión; tu backend solo publica por su API. Socket.IO exige escribir y escalar tú el servidor."
      - "Para apps móviles nativas no hay atajo: el push pasa siempre por APNs y FCM. ntfy sirve para su propia app y web push; para tu app, un servidor como Gorush habla con APNs y FCM."
      - "El proxy inverso necesita tiempos de espera largos y soporte de `Upgrade`; un despliegue que corta las conexiones provoca una avalancha de reconexiones."
      - "El coste es memoria por conexión y ancho de banda de salida; dimensiona por conexiones simultáneas, no por peticiones."
  aws:
    summary: "API Gateway WebSocket mantiene las conexiones e invoca Lambda por ruta, DynamoDB guarda los identificadores de conexión, el historial y el estado, EventBridge distribuye los eventos y SNS envía el push móvil."
    notes:
      - "Cada conexión dura como máximo 2 horas y se cierra tras 10 minutos sin tráfico; el cliente debe enviar latidos y reconectar. Los mensajes admiten hasta 128 KB en tramas de 32 KB."
      - "No hay difusión nativa: para enviar a una sala, Lambda consulta las conexiones en DynamoDB y llama a `@connections` una vez por cliente. Para fan-out masivo, AWS AppSync Events ofrece canales con difusión gestionada."
      - "Se cobra por mensaje (en bloques de 32 KB) y por minuto de conexión; el ritmo de nuevas conexiones por segundo tiene una cuota por cuenta y región que se puede ampliar."
      - "SNS mobile push envía a APNs, FCM y otros con endpoints por dispositivo; AWS End User Messaging Push (la parte de push de Pinpoint) es la otra opción, ya que las funciones de campañas de Pinpoint terminaron en octubre de 2026."
  azure:
    summary: "Azure Web PubSub mantiene las conexiones, los grupos y la presencia, llama a Azure Functions con los eventos de los clientes, Cosmos DB guarda el historial, Event Grid distribuye los eventos de dominio y Notification Hubs envía el push."
    notes:
      - "Web PubSub gestiona grupos y envío a grupo o a usuario: no necesitas guardar las conexiones tú. También admite el protocolo de Socket.IO si ya lo usas."
      - "Se paga por unidad y día (cada unidad admite un número fijo de conexiones simultáneas) más los mensajes salientes por encima de los incluidos, contados en bloques de 2 KB; los entrantes no se cobran."
      - "El tier Free es solo para pruebas; Premium añade autoescalado, zonas de disponibilidad, dominio propio y georréplica."
      - "Event Grid no publica directamente en Web PubSub: una función suscrita al evento envía al grupo correspondiente."
  gcp:
    summary: "Cloud Run mantiene las conexiones WebSocket, Memorystore for Valkey reparte mensajes entre instancias y guarda la presencia, Firestore el historial, Pub/Sub los eventos de dominio y Firebase Cloud Messaging el push."
    notes:
      - "En Cloud Run una conexión WebSocket es una petición: dura como máximo el timeout del servicio (hasta 60 minutos) y el cliente tiene que reconectar."
      - "Mientras haya conexiones abiertas la instancia está activa y se factura con CPU asignada; mil usuarios conectados todo el día cuestan como instancias encendidas todo el día."
      - "La afinidad de sesión es de mejor esfuerzo: cada instancia se suscribe a los canales de Valkey para recibir lo que publican las demás."
      - "Si el caso es sobre todo sincronizar documentos, los listeners en tiempo real de Firestore evitan escribir el servidor WebSocket."
tiers:
  - name: "SSE o servicio gestionado pequeño"
    when: "Notificaciones y paneles en directo con pocos miles de usuarios y comunicación casi siempre de servidor a cliente."
    cost: 1
    ops: 1
    onprem: "Server-Sent Events desde la API existente detrás del proxy, con Valkey pub/sub para repartir entre réplicas."
    aws: "API Gateway WebSocket con Lambda y DynamoDB bajo demanda, o AppSync Events si basta con publicar en canales."
    azure: "Web PubSub Standard con una unidad y Azure Functions en consumo."
    gcp: "Cloud Run con SSE o WebSocket, mínimo una instancia y Memorystore de núcleo compartido."
    tradeoffs: "Sin alta disponibilidad multizona en el estado de conexiones y con límites del servicio gestionado que hay que conocer."
  - name: "Producción con presencia e historial"
    when: "Chat o colaboración con decenas de miles de conexiones, salas, presencia y recuperación de mensajes."
    cost: 2
    ops: 2
    onprem: "Centrifugo en tres nodos con Valkey en Sentinel, PostgreSQL con Patroni y Gorush para el push."
    aws: "API Gateway WebSocket o AppSync Events, DynamoDB con TTL para conexiones, EventBridge y SNS mobile push."
    azure: "Web PubSub Premium con autoescalado y zonas, Cosmos DB, Event Grid y Notification Hubs Standard."
    gcp: "Cloud Run con varias instancias mínimas, Memorystore con réplica, Firestore y FCM."
    tradeoffs: "Pagas conexiones abiertas aunque nadie escriba; el fan-out a salas grandes multiplica mensajes y coste."
  - name: "Escala masiva o global"
    when: "Cientos de miles o millones de conexiones, eventos en directo o usuarios en varios continentes."
    cost: 4
    ops: 3
    onprem: "Centrifugo con Valkey Cluster o NATS como broker, varios sitios y balanceo L4 global."
    aws: "AppSync Events en varias regiones, DynamoDB global tables y cuotas de conexión ampliadas."
    azure: "Web PubSub Premium con georréplica y Cosmos DB multirregión."
    gcp: "Cloud Run en varias regiones tras el balanceador global y Memorystore por región con puente de Pub/Sub."
    tradeoffs: "Ordenar mensajes entre regiones es difícil; normalmente se acepta orden por sala y región, no global."
extensions:
  - name: "SSE como alternativa simple"
    when: "Cuando solo el servidor envía datos y el cliente escribe con peticiones HTTP normales."
    cost: "low"
    onprem: "SSE desde la API"
    aws: "Lambda con response streaming"
    azure: "SSE desde Container Apps"
    gcp: "SSE desde Cloud Run"
  - name: "Difusión gestionada por canales"
    when: "Cuando el fan-out a salas grandes es el patrón dominante."
    cost: "medium"
    onprem: "Centrifugo"
    aws: "AWS AppSync Events"
    azure: "Grupos de Web PubSub"
    gcp: "Firestore listeners"
  - name: "Recuperación tras reconexión"
    when: "Cuando perder mensajes durante un corte de red no es aceptable."
    cost: "low"
    onprem: "Historial de canal de Centrifugo"
    aws: "Consulta por número de secuencia"
    azure: "Consulta a Cosmos DB por secuencia"
    gcp: "Consulta a Firestore por marca"
  - name: "Limitación por conexión"
    when: "Para que un cliente defectuoso o malicioso no inunde una sala."
    cost: "low"
    onprem: "Límites de Centrifugo"
    aws: "Throttling por ruta de API Gateway"
    azure: "Lógica en el event handler"
    gcp: "Token bucket en Valkey"
  - name: "Presencia con expiración"
    when: "Para mostrar quién está en línea sin estados fantasma tras desconexiones bruscas."
    cost: "low"
    onprem: "Claves con TTL en Valkey"
    aws: "TTL de DynamoDB"
    azure: "Eventos connect/disconnect"
    gcp: "Claves con TTL en Memorystore"
savings:
  - "Si la comunicación es de servidor a cliente, usa SSE sobre la API que ya tienes: no hay servicio nuevo, ni cuota de conexiones, ni latidos que pagar."
  - "En API Gateway WebSocket agrupa actualizaciones en un mensaje cada pocos cientos de milisegundos en lugar de uno por cambio: se cobra por mensaje y por bloque de 32 KB."
  - "En Web PubSub los mensajes salientes se cuentan en bloques de 2 KB: comprime o envía diferencias en lugar del estado completo."
  - "En Cloud Run cierra las conexiones de pestañas inactivas (Page Visibility API) y reconecta al volver: cada conexión abierta mantiene una instancia facturando."
  - "Pon TTL a las conexiones y a la presencia en DynamoDB o Valkey para no pagar almacenamiento ni escrituras de conexiones muertas."
  - "No uses push para lo que el usuario verá al abrir la app: el push es para lo urgente; el resto se sincroniza al reconectar."
---

## Cuándo lo necesitas

Cuando el usuario tiene que ver un cambio sin recargar y en menos de un segundo: un chat, un documento que editan varios a la vez, la posición de un repartidor, el marcador de un partido, un panel de operaciones o el aviso de «pedido listo». Si unos segundos de retraso son aceptables, el sondeo periódico es más simple y probablemente suficiente. Si solo el servidor habla, Server-Sent Events (SSE) sobre HTTP normal cubre la mayoría de casos sin WebSockets.

El problema no es abrir un WebSocket, sino lo que viene después: miles de conexiones repartidas entre instancias, un mensaje que tiene que llegar a todos los de una sala, clientes que se desconectan en un túnel y vuelven con huecos, y usuarios que cierran la app y aun así deben enterarse.

## Escenarios

### Notificaciones en un SaaS B2B

El servidor avisa de que un informe terminó o de que alguien comentó. Solo hay comunicación de servidor a cliente y volumen moderado: SSE desde la API existente, con Valkey o el bus de eventos para que cualquier réplica pueda entregar el aviso. Sin servicio nuevo.

### Chat o colaboración

Comunicación bidireccional, salas, presencia («escribiendo…»), historial y lectura de mensajes. Aquí compensa un servicio dedicado (Web PubSub, AppSync Events, Centrifugo) que gestione grupos y reconexión, y una base de datos con el historial ordenado por sala y número de secuencia. El push avisa a quien no está conectado.

### Evento en directo con picos

Un partido o un lanzamiento: cientos de miles de clientes se conectan en minutos y casi todos solo escuchan. El cuello de botella es el ritmo de nuevas conexiones y el fan-out. Pide ampliación de cuotas con antelación, reparte la reconexión con espera aleatoria y agrupa actualizaciones: el cliente no necesita cada cambio, necesita el último.

### Cliente que exige on-premises

Centrifugo con Valkey y PostgreSQL cubre canales, presencia e historial; el push a móviles sigue saliendo a APNs y FCM, que son servicios de Apple y Google. Si eso no es aceptable, la app solo puede notificar mientras está abierta.

## Cómo encaja

El cliente abre un WebSocket contra la capa de conexiones, autenticándose con un token corto en la petición inicial (no en la URL si puede evitarse, porque acaba en los logs). La capa de conexiones registra la conexión y sus suscripciones en el almacén de conexiones y presencia, y reenvía los mensajes entrantes a la lógica de negocio.

La lógica valida el mensaje, lo guarda en el almacén de historial con un número de secuencia por sala y publica un evento de dominio. El bus de eventos lo entrega a quien reparte: consulta qué conexiones están suscritas a esa sala y les envía el mensaje, sea cual sea la instancia que las mantiene. En los servicios gestionados (Web PubSub, AppSync Events) ese reparto lo hace el servicio; con API Gateway WebSocket o Cloud Run lo haces tú, con DynamoDB o con canales de Valkey.

Si el destinatario no tiene conexión abierta, la lógica envía un push a través de APNs o FCM. Al reconectar, el cliente envía el último número de secuencia que vio y recibe lo que falta desde el historial, no desde la conexión.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Centrifugo, Valkey, PostgreSQL y tu API, detrás de Caddy o HAProxy con tiempos de espera largos. Aguanta decenas de miles de conexiones en un host bien dimensionado (ajusta `ulimit` y los parámetros de red del kernel). Copias de PostgreSQL; Valkey solo guarda estado efímero.

**Kubernetes on-premises.** Centrifugo como Deployment con varias réplicas y Valkey en modo Sentinel o cluster, un balanceador L4 o un Ingress que soporte WebSocket con tiempos de espera largos, CloudNativePG para el historial y KEDA si escalas consumidores de eventos. Configura `preStop` y drenado lento: matar un pod con diez mil conexiones provoca diez mil reconexiones simultáneas.

**Cloud sin Kubernetes.** Es el diseño del diagrama: API Gateway WebSocket o AppSync Events con Lambda, Web PubSub con Functions, o Cloud Run con Memorystore. No gestionas conexiones a nivel de sistema operativo, pero sí sus límites de duración y su modelo de cobro.

**Kubernetes gestionado.** EKS, AKS o GKE con Centrifugo o tu servidor Socket.IO compensan con conexiones masivas y constantes, donde pagar por minuto de conexión en un servicio gestionado sale más caro que nodos reservados.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Un host | Media | Vertical | On-premises pequeño |
| Kubernetes on-premises | Tres o más nodos | Alta | Réplicas y broker | On-premises con HA |
| Servicio gestionado | Casi nulo | Baja | Automático, con cuotas | Opción por defecto |
| EKS, AKS, GKE | Plano de control y nodos | Media-alta | HPA por conexiones | Conexiones masivas y estables |

## Decisiones clave

- **WebSocket o SSE.** SSE funciona sobre HTTP, atraviesa proxies sin sorpresas y reconecta solo; WebSocket solo hace falta si el cliente envía muchos mensajes o necesitas binario.
- **Servicio con grupos o reparto propio.** Web PubSub, AppSync Events y Centrifugo resuelven la difusión; API Gateway WebSocket y Cloud Run te obligan a guardar conexiones y repartir tú, lo que encarece el fan-out a salas grandes.
- **Orden y entrega.** Garantiza orden por sala con un número de secuencia asignado al guardar, y tolera duplicados en el cliente. Orden global y entrega exactamente una vez no existen a precio razonable.
- **La conexión no es estado.** El historial y la presencia viven fuera; la conexión se puede caer en cualquier momento y el diseño tiene que asumirlo.
- **Push como complemento.** Decide qué merece push y qué espera a la reconexión; enviar todo por push agota la paciencia del usuario y las cuotas.

## Errores habituales

- Clientes sin espera aleatoria al reconectar: tras un despliegue o un corte, todos vuelven a la vez y tumban el servicio.
- Guardar la lista de conexiones en memoria de cada instancia y que los mensajes solo lleguen a los clientes conectados a la misma.
- Olvidar los latidos: API Gateway cierra a los 10 minutos de inactividad y muchos proxies antes.
- Autenticar solo al conectar y no revocar: un usuario expulsado de una sala sigue recibiendo mensajes hasta que reconecta.
- Enviar el estado completo en cada cambio en lugar de diferencias, multiplicando mensajes facturados.
- Tratar el push como fiable: APNs y FCM pueden retrasar o descartar; lo importante debe estar también en el historial.
