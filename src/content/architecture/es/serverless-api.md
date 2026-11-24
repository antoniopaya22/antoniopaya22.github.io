---
title: "API serverless"
short: "API serverless"
summary: "Una API que pasa de cero a un pico sin gestionar servidores: el gateway valida el token y limita el ritmo, una función sin estado atiende cada petición y una base de datos de pago por uso guarda los datos cifrados con una clave propia."
description: "API serverless con gateway, autorizador JWT, funciones, BBDD de pago por uso, cifrado y trazas: referencia en AWS, Azure, GCP y on-premises."
order: 2
requirements:
  - "Ninguna petición llega a la función sin un token válido de un emisor de confianza."
  - "La API escala con la demanda y sin tráfico apenas cuesta."
  - "Un pico o una tormenta de reintentos no puede agotar la base de datos ni disparar la factura."
  - "Los datos se cifran en reposo con una clave que controla el equipo y se pueden restaurar a un punto en el tiempo."
  - "Cada petición deja una traza que cruza gateway, función y base de datos."
platforms:
  onprem:
    summary: "Knative Serving ejecuta la función como `Knative Service` que escala a cero, Istio como capa de red de Knative enruta el tráfico y valida los JWT, Keycloak emite los tokens y PostgreSQL con CloudNativePG guarda los datos, con claves en OpenBao."
    notes:
      - "Con Istio como capa de red, una `RequestAuthentication` valida el JWT contra el JWKS de Keycloak antes de llegar a la función. Kourier es más ligero, pero solo enruta: con él, la validación tiene que hacerla la función."
      - "PostgreSQL no es serverless: CNPG automatiza réplicas, failover y copias, pero el clúster está siempre encendido. Pon el `Pooler` de CNPG (PgBouncer) delante, porque cada réplica de la función abre conexiones."
      - "El motor transit de OpenBao cifra campos sensibles sin que la clave salga del servicio; el cifrado del disco se resuelve aparte, en el almacenamiento o con LUKS."
      - "`containerConcurrency` y la anotación `autoscaling.knative.dev/max-scale` hacen de fusible, como la concurrencia reservada en la nube."
      - "El coste es la capacidad del clúster y operar Knative, PostgreSQL y OpenBao; escalar a cero solo ahorra si el autoescalador de nodos retira los nodos vacíos."
  aws:
    summary: "API Gateway HTTP API con autorizador JWT (Cognito u otro emisor OIDC), Lambda arm64 con concurrencia reservada y DynamoDB on-demand con PITR, cifrada con una clave KMS gestionada por el cliente."
    notes:
      - "HTTP API en lugar de REST API: más barata y con menos latencia. REST API compensa si necesitas planes de uso, claves de API, validación de peticiones o AWS WAF directamente sobre la API."
      - "El autorizador JWT de HTTP API comprueba firma, emisor, audiencia y caducidad sin código; Cognito es una opción, pero sirve cualquier proveedor OIDC."
      - "La concurrencia reservada de Lambda es un tope deliberado: protege la tabla, los servicios aguas abajo y la factura. Combínala con el throttling de la etapa del gateway."
      - "DynamoDB on-demand se paga por petición y no exige planificar capacidad; activa PITR y la protección contra borrado. La clave KMS propia añade una cuota mensual y coste por llamada a KMS."
      - "X-Ray sigue recibiendo trazas, pero sus SDK y su daemon están en modo mantenimiento desde febrero de 2026: instrumenta con OpenTelemetry (ADOT)."
  azure:
    summary: "API Management valida el token de Entra ID con la política `validate-jwt`, Azure Functions en el plan Flex Consumption ejecuta la lógica y Cosmos DB serverless guarda los datos, con claves en Key Vault y trazas en Application Insights."
    notes:
      - "El nivel Consumption de API Management se paga por llamada y encaja con este patrón; los niveles v2 tienen coste fijo por unidad a cambio de integración con red virtual y más capacidad. Para tokens de Entra ID existe también `validate-azure-ad-token`."
      - "Flex Consumption es el plan serverless a elegir: escala a cero, admite integración con red virtual y un máximo de instancias que hace de fusible. El plan Consumption en Linux se retira en septiembre de 2028."
      - "Una cuenta serverless de Cosmos DB vive en una sola región y no admite añadir más; si necesitas multirregión, usa throughput provisionado o autoescalado."
      - "Con clave gestionada por el cliente, la identidad de la cuenta de Cosmos DB necesita acceso a la clave en Key Vault; si la revocas, los datos quedan inaccesibles."
      - "Se paga por llamada en APIM, por ejecución y memoria en Functions y por RU consumida en Cosmos DB: pon alertas sobre las RU, porque el coste depende de cómo consultas."
  gcp:
    summary: "API Gateway valida los tokens de Identity Platform declarados en la especificación OpenAPI, Cloud Run functions ejecuta la lógica y Firestore guarda los datos con una clave de Cloud KMS (CMEK), con trazas en Cloud Trace."
    notes:
      - "API Gateway valida JWT con `x-google-issuer` y `x-google-jwks_uri` en la especificación OpenAPI; si necesitas cuotas por consumidor, monetización o políticas complejas, la alternativa es Apigee."
      - "Cloud Run functions es Cloud Run por debajo: fija la concurrencia por instancia y un máximo de instancias como fusible."
      - "CMEK en Firestore se elige al crear la base de datos: no se puede activar después ni cambiar de clave, solo rotarla."
      - "Firestore encaja con accesos por documento y colección; las consultas necesitan índices y no hay joins, igual que en DynamoDB y Cosmos DB."
      - "Se paga por llamada al gateway, por CPU y memoria de la función mientras atiende y por lecturas, escrituras y almacenamiento en Firestore."
tiers:
  - name: "Mínimo viable"
    when: "MVP, API interna o backend móvil con tráfico bajo e irregular y un equipo pequeño sin operaciones dedicadas."
    cost: 1
    ops: 1
    onprem: "Un host con Docker Compose: la API en un contenedor detrás de Caddy, PostgreSQL con volumen y `pg_dump` diario a almacenamiento externo; tokens de un IdP existente."
    aws: "HTTP API con autorizador JWT, una Lambda arm64 con concurrencia reservada baja y DynamoDB on-demand con PITR y la clave gestionada por AWS."
    azure: "APIM Consumption con `validate-jwt`, Functions en Flex Consumption y Cosmos DB serverless con las claves gestionadas por Microsoft."
    gcp: "API Gateway con validación JWT, Cloud Run functions con un máximo de instancias bajo y Firestore con el cifrado por defecto."
    tradeoffs: "Sin clave propia ni red privada, una sola región y arranques en frío visibles; on-premises no escala a cero y el host es un punto único de fallo."
  - name: "Producción"
    when: "Producto con clientes reales, datos personales y requisitos de auditoría, con tráfico variable."
    cost: 2
    ops: 2
    onprem: "k3s o RKE2 con Knative Serving, CNPG con réplica, `Pooler` y copias a S3 compatible, Keycloak, OpenBao transit y OpenTelemetry hacia Grafana."
    aws: "Lo anterior con clave KMS propia, protección contra borrado, alarmas, trazas con ADOT, entornos en cuentas separadas y CloudFront con WAF delante."
    azure: "Functions Flex con integración de red virtual, APIM con `validate-azure-ad-token`, Cosmos DB con clave en Key Vault y Application Insights con muestreo."
    gcp: "Cloud Run functions con salida a VPC cuando haga falta, Firestore con CMEK, alertas de presupuesto y Cloud Trace; Apigee si necesitas cuotas por consumidor."
    tradeoffs: "Más piezas que configurar y una cuota fija por claves, WAF y retención de logs; sigue siendo una sola región."
  - name: "Escala y multirregión"
    when: "API crítica con usuarios en varios continentes o un objetivo de disponibilidad que no admite perder una región."
    cost: 4
    ops: 3
    onprem: "Dos clústeres en CPD distintos, CNPG con un clúster réplica en el segundo sitio y DNS o GSLB para conmutar."
    aws: "La API en dos regiones con Route 53 por latencia o failover, DynamoDB global tables y concurrencia aprovisionada en las rutas críticas."
    azure: "Front Door delante de APIM y Functions en dos regiones; Cosmos DB con throughput provisionado o autoescalado y escrituras multirregión, porque serverless no lo admite."
    gcp: "Cloud Run en varias regiones detrás de un balanceador global con NEG serverless y Firestore en ubicación multirregional; la validación JWT pasa al servicio o a Apigee."
    tradeoffs: "Coste fijo alto y datos multirregión: conflictos de escritura, consistencia eventual y simulacros de failover que hay que ensayar."
extensions:
  - name: "Caché en el borde"
    when: "Respuestas GET públicas o que cambian poco y se piden mucho."
    cost: "low"
    onprem: "Varnish o caché de Nginx"
    aws: "CloudFront"
    azure: "Front Door (caché)"
    gcp: "Cloud CDN"
  - name: "WAF y límite por cliente"
    when: "API expuesta a Internet con clientes de terceros o riesgo de abuso."
    cost: "medium"
    onprem: "Coraza + rate limit en Envoy"
    aws: "AWS WAF (CloudFront o REST API)"
    azure: "Front Door WAF + límites en APIM"
    gcp: "Cloud Armor o Apigee"
  - name: "Instancias precalentadas"
    when: "Rutas sensibles a latencia donde el arranque en frío se nota en los percentiles altos."
    cost: "medium"
    onprem: "`min-scale` en Knative"
    aws: "Provisioned concurrency o SnapStart"
    azure: "Instancias always ready (Flex)"
    gcp: "Instancias mínimas en Cloud Run"
  - name: "Caché de datos"
    when: "Lecturas repetidas de las mismas claves que encarecen la base de datos o necesitan menos latencia."
    cost: "medium"
    onprem: "Valkey"
    aws: "DynamoDB Accelerator (DAX)"
    azure: "Azure Managed Redis"
    gcp: "Memorystore"
  - name: "Cola para escrituras"
    when: "Escrituras que pueden confirmarse con 202 y procesarse después, para absorber picos."
    cost: "low"
    onprem: "RabbitMQ"
    aws: "Amazon SQS"
    azure: "Service Bus"
    gcp: "Pub/Sub o Cloud Tasks"
savings:
  - "Ejecuta Lambda en arm64 (Graviton): cuesta menos por GB-segundo que x86 y, en Python o Node.js, rinde igual o mejor."
  - "Ajusta la memoria de cada función midiendo, por ejemplo con AWS Lambda Power Tuning: más memoria da más CPU y a veces acorta tanto la duración que la invocación sale más barata."
  - "Elige HTTP API antes que REST API en AWS y el nivel Consumption de API Management con tráfico bajo: ambos se pagan por llamada y no tienen cuota fija."
  - "Deja las funciones fuera de la VPC si solo hablan con servicios gestionados; si necesitan red privada, usa VPC endpoints en lugar de NAT Gateway, y un solo NAT en desarrollo."
  - "Fija la retención de logs (días en desarrollo, lo que exija la auditoría en producción) y muestrea las trazas: la ingesta de logs suele ser una de las partidas mayores en APIs pequeñas."
  - "Pasa a capacidad provisionada con autoescalado en DynamoDB o Cosmos DB solo con tráfico estable y el ahorro medido; los Compute Savings Plans de AWS cubren también Lambda."
---

## Cuándo lo necesitas

Cuando la API tiene tráfico irregular o todavía desconocido: el backend de una app móvil, una API interna que solo se usa en horario laboral, un producto que empieza. Mantener servidores encendidos todo el día para atender ráfagas cortas no compensa, y el equipo prefiere no parchear sistemas operativos. Si el tráfico es alto y constante o necesitas conexiones largas (WebSockets, streaming), contenedores siempre encendidos suelen salir mejor.

## Escenarios

### MVP de una startup

Lo que importa es salir rápido y no pagar por capacidad ociosa. El nivel mínimo basta: gateway con validación JWT contra el IdP que ya uséis, una función por recurso o una sola función con enrutado interno, y una tabla on-demand. Guarda las cuentas en el IdP, no en tu base de datos, y deja la clave propia para cuando lleguen datos sensibles.

### Empresa regulada con datos en la UE

La región fija la residencia de los datos, pero también hay que mirar dónde van logs, trazas y copias. Aquí la clave gestionada por el cliente deja de ser opcional: da auditoría de cada uso y permite revocar el acceso. Se añaden red privada para la función, WAF delante, retención de logs acordada con cumplimiento y PITR con pruebas de restauración periódicas.

### Picos estacionales o campañas

El serverless absorbe el pico, pero lo que se rompe es lo que hay detrás: la base de datos, una API de terceros con límites o la factura. Ajusta la concurrencia reservada al caudal que aguanta lo de abajo, pon límites de ritmo en el gateway y pasa a cola las escrituras que no necesiten respuesta inmediata. Calienta instancias solo durante la campaña.

### Cliente que exige on-premises

Knative da el mismo modelo de escalado a cero sobre Kubernetes, pero la base de datos no es serverless: PostgreSQL con CNPG y un pooler delante. El código de la función debe ser portable (un contenedor HTTP estándar), así que conviene escribirlo contra HTTP y no contra el formato de evento de un proveedor.

## Cómo encaja

El cliente llama al gateway por HTTPS. Antes de reenviar nada, el gateway comprueba el token con el autorizador: firma contra las claves públicas del emisor, emisor, audiencia y caducidad. Si falla, responde 401 y la función ni se entera. El gateway también limita el ritmo y deja un log de acceso por petición.

La petición válida llega a la función, que no guarda estado entre invocaciones: lee los claims ya validados, aplica la lógica y lee o escribe en la base de datos serverless. La base de datos cifra en reposo con una clave del KMS que gestiona el equipo; sin permiso sobre la clave, tener acceso a la tabla no basta para leer los datos. La función emite logs estructurados y trazas que unen gateway, función y base de datos en un solo recorrido.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Un contenedor con la API (cualquier framework HTTP), PostgreSQL con su volumen y Caddy como proxy inverso con TLS automático. La validación JWT se hace en la API contra el JWKS del IdP. Copias con `pg_dump` o WAL archivado a almacenamiento externo, cifradas. No hay escalado a cero ni alta disponibilidad: sirve para empezar o para un cliente pequeño.

**Kubernetes on-premises.** k3s o RKE2 con Knative Serving para escalar por peticiones y a cero, cert-manager para los certificados, CloudNativePG con `Pooler` y copias a almacenamiento S3 compatible, OpenBao para claves y secretos, y un OpenTelemetry Collector hacia Grafana. Si necesitas JWT en el borde, usa la capa de red de Knative basada en Istio o pon Envoy Gateway delante.

**Cloud sin Kubernetes.** Es el encaje natural: Lambda, Functions o Cloud Run functions detrás del gateway gestionado. Si prefieres empaquetar un contenedor, Cloud Run y Container Apps también escalan a cero; ECS Fargate no, siempre deja al menos una tarea.

**Kubernetes gestionado.** EKS, AKS o GKE con Knative solo compensan si ya tenéis una plataforma de Kubernetes y queréis la misma forma de desplegar en todas partes. Para una API aislada, pagas el clúster y su operación sin ganar nada.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Un host | Baja, manual | Vertical | Empezar, cliente pequeño |
| Kubernetes + Knative | Clúster | Alta | A cero, por peticiones | On-premises obligatorio |
| Funciones gestionadas | Casi nulo | Baja | A cero, automático | Caso por defecto en cloud |
| EKS/AKS/GKE + Knative | Clúster | Media-alta | A cero, por peticiones | Plataforma Kubernetes ya existente |

## Decisiones clave

- **Funciones o contenedores.** Las funciones escalan a cero y se pagan por uso, pero tienen límite de duración y arranque en frío; un contenedor serverless como Cloud Run o Container Apps admite más concurrencia por instancia y cualquier runtime.
- **Base de datos serverless o relacional.** DynamoDB, Cosmos DB y Firestore escalan por petición y no tienen conexiones que agotar, pero obligan a modelar según los patrones de acceso. Una relacional da consultas flexibles a cambio de capacidad fija y un pooler de conexiones.
- **Validar en el gateway o en el código.** En el gateway se rechaza pronto y barato; la autorización fina (si este usuario puede tocar este recurso) sigue siendo cosa de la función.
- **Clave propia o del proveedor.** Una clave gestionada por el cliente da rotación, auditoría de cada uso y la opción de revocar, a cambio de una cuota y de una dependencia más.
- **Fusible de concurrencia.** Sin tope, el autoescalado también escala los errores: un cliente que reintenta en bucle se convierte en miles de invocaciones y en una base de datos saturada.

## Errores habituales

- Crear la conexión o el cliente del SDK dentro del handler en lugar de reutilizarlo entre invocaciones.
- Confiar en el gateway para la autorización por recurso: el token dice quién eres, no qué registros puedes leer.
- Diseñar la tabla NoSQL como si fuera relacional y acabar recorriéndola entera con scans.
- Pagar concurrencia aprovisionada contra el arranque en frío sin haberlo medido antes.
- Logs sin retención definida ni cifrado, que crecen y acaban guardando datos personales indefinidamente.
- No ensayar nunca una restauración con PITR: la copia existe, pero nadie sabe cuánto tarda ni cómo se apunta la aplicación a la tabla restaurada.
