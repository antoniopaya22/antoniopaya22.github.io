---
title: "Notificaciones multicanal"
short: "Notificaciones"
summary: "Un único servicio decide qué avisar, a quién y por qué canal (email, SMS, push o aviso en la app), respetando preferencias y bajas, con reintentos, deduplicación y control de la reputación del dominio."
description: "Email, SMS, push y avisos en la app con preferencias, plantillas, reintentos y SPF/DKIM/DMARC: arquitectura de referencia en AWS, Azure, GCP y on-premises."
order: 26
requirements:
  - "Los servicios de negocio publican intenciones de aviso; ninguno llama directamente a un proveedor de email o SMS."
  - "Cada envío respeta las preferencias, el idioma y la baja del destinatario, y la baja se aplica en todos los canales que correspondan."
  - "Un mismo aviso no llega dos veces aunque el mensaje se reintente o se publique duplicado."
  - "Rebotes y quejas vuelven al sistema y suprimen la dirección o el número afectados."
  - "El dominio de envío está autenticado con SPF, DKIM y DMARC, y los envíos de marketing se separan de los transaccionales."
platforms:
  onprem:
    summary: "RabbitMQ como cola, workers en Kubernetes como enrutador, PostgreSQL para preferencias y plantillas, Postfix como MTA y las APIs de FCM, APNs y de un operador de SMS para el resto de canales."
    notes:
      - "Postfix enviando directamente desde tus IP exige PTR correcto, IP con buena reputación y un calentamiento progresivo; muchas organizaciones lo usan solo como relay hacia un proveedor externo que ya tiene esa reputación."
      - "El push no se puede autoalojar del todo: Android pasa por FCM y iOS por APNs, así que necesitas salida a Internet hacia Google y Apple aunque el resto esté en tu CPD."
      - "Para SMS, contrata la API de un operador o agregador que gestione remitentes alfanuméricos y entregas en España; pide informes de entrega por webhook."
      - "En desarrollo, Mailpit captura todo el SMTP con una interfaz web: nadie envía un correo real a un cliente desde un portátil."
      - "El coste es operación: colas, workers y, sobre todo, vigilar listas negras y la reputación de tus IP."
  aws:
    summary: "SQS como cola, Lambda como enrutador, Aurora PostgreSQL para preferencias, Amazon SES para email, AWS End User Messaging SMS y SNS mobile push hacia FCM y APNs."
    notes:
      - "SES arranca en sandbox: hay que pedir acceso de producción y las cuotas de envío diario y por segundo crecen con el historial de la cuenta. Respeta la tasa máxima desde el enrutador, no confíes en los errores de límite."
      - "Publica rebotes y quejas de SES (conjunto de configuración hacia SNS o EventBridge) y alimenta con ellos tu tabla de supresión además de la lista de supresión de SES."
      - "Amazon Pinpoint quedó sin soporte en octubre de 2026; SMS, voz y push siguen bajo AWS End User Messaging. No empieces nada sobre Pinpoint."
      - "Si envías por cuenta de varios clientes, la gestión de tenants de SES separa la reputación por cliente y mantiene listas de supresión por tenant."
      - "SES cobra por mensaje y por volumen adjunto; el SMS se paga por mensaje según país de destino y suele ser, con diferencia, el canal más caro."
  azure:
    summary: "Service Bus como cola, Azure Functions como enrutador, PostgreSQL para preferencias y Notification Hubs para push; ACS Email y ACS SMS, que figuran en el diagrama, están en retirada y conviene sustituirlos por un proveedor de Marketplace."
    notes:
      - "Microsoft anunció en septiembre de 2026 la retirada de Azure Communication Services como oferta independiente el 30 de septiembre de 2028, incluidos Email y SMS. Desde el 23 de octubre de 2026 los clientes nuevos no pueden comprar números para SMS."
      - "Para un proyecto nuevo, usa un CPaaS del Marketplace (Microsoft remite a Infobip, Telesign o Blip) o SendGrid o Mailgun para email; Microsoft 365 High Volume Email solo cubre envío interno del propio inquilino."
      - "Si ya tienes ACS, aísla el proveedor detrás de un adaptador en el enrutador: la migración será cambiar un módulo, no cada servicio emisor."
      - "Notification Hubs entrega a FCM (API HTTP v1) y APNs y permite segmentar por etiquetas; el plan gratuito no tiene SLA."
      - "Service Bus Standard se paga por operaciones; Premium, por unidad de mensajería y hora, con aislamiento y red privada."
  gcp:
    summary: "Pub/Sub como cola, Cloud Run functions como enrutador, Cloud SQL para preferencias y Firebase Cloud Messaging para push; Google Cloud no tiene servicio propio de email ni SMS, así que se contratan SendGrid, Mailgun, Mailjet o Twilio."
    notes:
      - "La documentación de Google remite a SendGrid, Mailgun o Mailjet para email y a Twilio para SMS; son contratos con terceros y quedan fuera del SLA de Google."
      - "SendGrid retiró su plan gratuito permanente en 2025: las cuentas nuevas empiezan con una prueba de duración limitada."
      - "Compute Engine bloquea la salida por el puerto 25: envía por la API HTTP del proveedor o por SMTP en el puerto 587."
      - "FCM es gratuito y usa la API HTTP v1 con credenciales de cuenta de servicio; la API heredada ya no existe."
      - "Pub/Sub no garantiza entrega única por defecto: la deduplicación por clave de idempotencia es responsabilidad del enrutador."
tiers:
  - name: "Mínimo viable"
    when: "Producto que envía correos transaccionales (registro, contraseña, facturas) y quizá push, con un equipo pequeño."
    cost: 1
    ops: 1
    onprem: "Un host con Docker Compose: la API encola en PostgreSQL o Valkey, un worker envía por SMTP a un relay externo y Mailpit sustituye al relay en desarrollo."
    aws: "SES con dominio verificado y DKIM, una cola SQS con cola de mensajes fallidos y una Lambda; preferencias en la misma base de datos de la aplicación."
    azure: "Service Bus Standard, una Function y un proveedor de email del Marketplace; Notification Hubs si hay app móvil."
    gcp: "Pub/Sub, una Cloud Run function, un proveedor de email por API y FCM para push."
    tradeoffs: "Sin SMS ni panel de preferencias completo; la deduplicación y la supresión de rebotes son básicas y la reputación depende de un solo dominio."
  - name: "Multicanal con preferencias"
    when: "SaaS con miles de usuarios que necesita email, SMS, push y avisos en la app con bajas por categoría y varios idiomas."
    cost: 2
    ops: 2
    onprem: "Kubernetes con RabbitMQ, workers por canal escalados con KEDA, PostgreSQL con preferencias y plantillas versionadas, y Postfix como relay hacia un proveedor."
    aws: "SQS por canal, Lambda con concurrencia limitada para no superar la cuota de SES, End User Messaging SMS, SNS mobile push y eventos de SES hacia EventBridge."
    azure: "Service Bus con una cola por canal, Functions, Notification Hubs Basic o Standard y un CPaaS del Marketplace para email y SMS."
    gcp: "Un tema de Pub/Sub por canal, Cloud Run functions, Cloud SQL, FCM y proveedores externos de email y SMS con webhooks de entrega."
    tradeoffs: "Más piezas y más proveedores con los que firmar contrato; el SMS dispara la factura si no se limita a lo crítico."
  - name: "Alto volumen y varios remitentes"
    when: "Plataforma que envía millones de mensajes o lo hace en nombre de muchos clientes, con marketing y transaccional separados."
    cost: 4
    ops: 3
    onprem: "Varias instancias de MTA con IP dedicadas y calentadas, colas separadas por prioridad y por cliente, y un panel de reputación alimentado por los informes DMARC."
    aws: "SES con IP dedicadas o gestionadas, gestión de tenants con supresión por tenant y Virtual Deliverability Manager; colas separadas para transaccional y marketing."
    azure: "Un CPaaS de alto volumen del Marketplace con subcuentas por cliente, Service Bus Premium y Functions en plan dedicado o Container Apps."
    gcp: "Un proveedor con IP dedicadas y subcuentas, Pub/Sub con temas por prioridad y el enrutador en Cloud Run con instancias mínimas."
    tradeoffs: "IP dedicadas exigen volumen constante para mantener reputación; la operación de entregabilidad pasa a ser un trabajo en sí mismo."
extensions:
  - name: "Avisos en tiempo real en la app"
    when: "Cuando el usuario debe ver el aviso al instante sin recargar y sin depender del push."
    cost: "low"
    onprem: "SSE desde la API + Valkey pub/sub"
    aws: "API Gateway WebSocket o AppSync Events"
    azure: "Azure Web PubSub"
    gcp: "SSE en Cloud Run"
  - name: "Resumen y horas de silencio"
    when: "Cuando muchos avisos pequeños molestan más que informan: agrupa y envía un resumen."
    cost: "low"
    onprem: "Cron en Kubernetes"
    aws: "EventBridge Scheduler"
    azure: "Functions con disparador de tiempo"
    gcp: "Cloud Scheduler"
  - name: "Entrada de rebotes y quejas"
    when: "Siempre que envíes email en volumen: sin supresión automática la reputación cae en días."
    cost: "low"
    onprem: "Buzón de rebotes + parser VERP"
    aws: "Eventos de SES a EventBridge"
    azure: "Webhooks del proveedor a Functions"
    gcp: "Webhooks del proveedor a Cloud Run"
  - name: "Informes DMARC"
    when: "Al pasar DMARC de p=none a quarantine o reject, para saber quién envía en tu nombre."
    cost: "low"
    onprem: "parsedmarc + OpenSearch"
    aws: "Servicio de informes DMARC (SaaS)"
    azure: "Servicio de informes DMARC (SaaS)"
    gcp: "Servicio de informes DMARC (SaaS)"
  - name: "Mensajería por WhatsApp"
    when: "Cuando el cliente final responde mejor por WhatsApp que por SMS y el caso de uso lo permite."
    cost: "medium"
    onprem: "WhatsApp Business Platform (API)"
    aws: "End User Messaging Social"
    azure: "CPaaS del Marketplace"
    gcp: "WhatsApp Business Platform (API)"
  - name: "Cola de prioridad"
    when: "Cuando una campaña masiva no debe retrasar un código de verificación o un aviso de seguridad."
    cost: "low"
    onprem: "Colas de prioridad de RabbitMQ"
    aws: "Colas SQS separadas"
    azure: "Colas de Service Bus separadas"
    gcp: "Temas de Pub/Sub separados"
savings:
  - "Limita el SMS a lo que de verdad lo necesita (códigos de un solo uso, alertas críticas) y ofrece push o email como alternativa: el SMS cuesta por mensaje y por país, y es fácil que supere al resto de canales juntos."
  - "Agrupa avisos en resúmenes diarios o por hora: menos mensajes, menos quejas y menos coste por mensaje en todos los proveedores."
  - "Mantén limpias las listas: suprimir direcciones que rebotan evita pagar envíos inútiles y protege la reputación que te permite seguir enviando."
  - "Usa IP compartidas del proveedor hasta tener volumen constante; las IP dedicadas tienen coste fijo y exigen calentarlas y mantenerlas activas."
  - "En desarrollo y preproducción, apunta el SMTP a Mailpit y los SMS a un simulador: ni costes ni mensajes accidentales a clientes reales."
  - "Pon colas SQS o Service Bus Standard y funciones que escalan a cero: un sistema de notificaciones pasa la mayor parte del día casi parado."
---

## Cuándo lo necesitas

En cuanto un producto envía algo más que el correo de recuperación de contraseña. Confirmaciones de pedido, alertas de seguridad, recordatorios, avisos de que un informe está listo: cada equipo acaba integrando su propio proveedor de email, con sus plantillas, sin respetar las bajas y sin saber qué se envió a quién. El usuario recibe tres correos por el mismo evento y el dominio acaba en la carpeta de spam. Este caso centraliza la decisión de qué avisar y por qué canal en un servicio con preferencias, plantillas, reintentos y trazabilidad.

## Escenarios

### Startup con un solo canal

Email transaccional y nada más. Un proveedor gestionado (SES o un proveedor por API), un dominio con SPF, DKIM y DMARC desde el primer día, y una cola con cola de mensajes fallidos. No hace falta un servicio separado todavía, pero sí la interfaz: «publica una intención de aviso», no «llama a SES». Cuando llegue el segundo canal, solo cambia el consumidor.

### SaaS B2B con preferencias por categoría

Los clientes piden poder silenciar los avisos de facturación pero no los de seguridad, en su idioma y sin correos entre las 22:00 y las 8:00. Aquí aparece la tabla de preferencias por usuario, categoría y canal, las plantillas versionadas por idioma y la lógica de horas de silencio y resúmenes. Las categorías obligatorias (seguridad, legales) no se pueden desactivar, y eso se modela explícitamente.

### Envíos en nombre de clientes

Una plataforma que envía correos de sus clientes a los clientes de estos hereda la reputación de todos. Separa remitentes por cliente (subdominios o tenants de SES), suprime por tenant y corta el envío de quien supere la tasa de quejas antes de que arrastre al resto. Gmail deja de aplicar mitigaciones a remitentes masivos que superan un 0,3 % de spam declarado, y exige DMARC y baja en un clic (RFC 8058) en los envíos de marketing.

### Organismo público on-premises

El MTA es propio y los datos no salen del CPD, salvo lo inevitable: el push pasa por FCM y APNs, y el SMS por un operador. Documenta esos flujos en el análisis de riesgos y no metas datos personales en el cuerpo del push; manda un aviso genérico y que la app recupere el detalle autenticada.

## Cómo encaja

Los servicios emisores (pedidos, cuentas, alertas) publican en la cola un mensaje con el destinatario, el tipo de aviso, los datos para la plantilla y una clave de idempotencia. No saben nada de canales ni de proveedores.

El enrutador consume la cola. Para cada mensaje consulta preferencias y plantillas: qué canales tiene activos el usuario para esa categoría, si se dio de baja, en qué idioma y zona horaria está y si es hora de silencio. Comprueba la clave de idempotencia contra una tabla de envíos (una restricción única basta) para no repetir un aviso ya enviado. Después renderiza la plantilla y entrega a cada canal: email, SMS, push y aviso en la app, que es simplemente una fila en una tabla que la interfaz lee y que se empuja al navegador por SSE si el usuario está conectado.

Cada envío deja un registro con estado. Los errores transitorios del proveedor se reintentan con espera exponencial y, tras varios fallos, el mensaje va a la cola de fallidos. Los eventos de vuelta (entregado, rebotado, queja, baja por STOP) entran por webhook o por el bus del proveedor y actualizan la supresión. Una dirección con rebote permanente no vuelve a recibir nada sin intervención.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** RabbitMQ (o una tabla de cola en PostgreSQL con `SKIP LOCKED` si el volumen es bajo), un contenedor del enrutador con varios workers, PostgreSQL con volumen y copias, y Postfix configurado como relay autenticado hacia un proveedor. Mailpit en el `compose.override.yml` de desarrollo. El proxy inverso solo expone la API de preferencias y el endpoint de webhooks de entrega.

**Kubernetes on-premises.** k3s o RKE2 con el RabbitMQ Cluster Operator, CloudNativePG para la base de datos, un Deployment por canal escalado con KEDA según la longitud de la cola y cert-manager para el TLS de los webhooks. Separar workers por canal permite limitar la concurrencia del SMS sin frenar el email.

**Cloud sin Kubernetes.** Es el diseño del diagrama: SQS con Lambda, Service Bus con Functions o Pub/Sub con Cloud Run functions. Limita la concurrencia de las funciones para no superar la cuota de envío del proveedor y usa colas de fallidos nativas.

**Kubernetes gestionado.** EKS, AKS o GKE tienen sentido si el resto de la plataforma ya vive ahí; el enrutador es un Deployment más con KEDA leyendo la cola gestionada. No justifica por sí solo un clúster.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Un host | Media | Manual | Volumen bajo, on-premises |
| Kubernetes on-premises | Tres o más nodos | Alta | KEDA por cola | Varios canales, sin cloud |
| Funciones y colas gestionadas | Casi nulo | Baja | Automático | Opción por defecto en cloud |
| EKS, AKS, GKE | Plano de control y nodos | Media-alta | KEDA y nodos | Plataforma ya existente |

## Decisiones clave

- **Construir o contratar la orquestación.** Un enrutador propio son unos pocos cientos de líneas y te da control total; plataformas como Novu (open source) o servicios SaaS de notificaciones aportan panel de preferencias y plantillas a cambio de otra dependencia.
- **Un dominio o subdominios por tipo.** Separar `notificaciones.ejemplo.es` de `marketing.ejemplo.es` aísla la reputación: una campaña con quejas no bloquea los correos de contraseña.
- **Proveedor del cloud o independiente.** SES es barato e integrado; un proveedor independiente es portable entre nubes y, en Azure, ya es la opción recomendada tras la retirada de ACS.
- **Idempotencia en el enrutador, no en la cola.** Ninguna cola garantiza exactamente una vez de extremo a extremo; la clave de idempotencia y una restricción única en la tabla de envíos sí.
- **Datos personales en el mensaje.** Push y SMS pasan por terceros y se ven en la pantalla bloqueada: manda el mínimo y deja el detalle detrás de la autenticación.

## Errores habituales

- Enviar desde cada microservicio con su propia clave del proveedor: sin preferencias comunes, sin supresión y sin registro.
- Publicar DMARC con `p=reject` sin haber revisado antes los informes: los correos legítimos de otros sistemas desaparecen.
- Ignorar rebotes y quejas hasta que el proveedor suspende la cuenta.
- Reintentar sin límite un SMS que falla por número inválido: cada intento se cobra.
- Usar remitentes alfanuméricos sin ofrecer otra vía de baja: no admiten respuestas ni STOP.
- Probar con direcciones reales en preproducción y enviar mil correos a clientes desde un entorno de pruebas.
- Plantillas sin versión ni idioma por defecto: el primer usuario con un idioma no previsto recibe un correo vacío.
