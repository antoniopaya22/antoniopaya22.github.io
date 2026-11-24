---
title: "API pública para terceros"
short: "API pública"
summary: "Exponer tus servicios a partners y desarrolladores externos como un producto: alta de aplicaciones, OAuth 2.0 entre máquinas, planes con cuotas, versionado, documentación, analítica y, si toca, cobro por uso."
description: "API pública con OAuth 2.0, planes de uso, cuotas, versionado, portal de desarrolladores y monetización: arquitectura en AWS, Azure, GCP y on-premises."
order: 24
requirements:
  - "Cada consumidor se identifica como aplicación y obtiene tokens OAuth 2.0 con client credentials; la clave de API solo asocia el plan."
  - "Las cuotas y la limitación de tasa se aplican por aplicación y plan antes de tocar los servicios internos."
  - "Las versiones conviven y se retiran con aviso; ningún cambio incompatible llega a una versión publicada."
  - "La documentación, el alta y la rotación de credenciales son de autoservicio."
  - "Cada petición queda medida por aplicación para analítica, soporte y facturación."
platforms:
  onprem:
    summary: "Kong o Gravitee como gateway con cuotas y caché, Keycloak como servidor OAuth 2.0, el portal de Gravitee para el autoservicio y OpenMeter para medir el consumo."
    notes:
      - "El portal de desarrolladores de Kong es de la edición Enterprise o de Konnect; si buscas todo open source, Gravitee incluye gateway, portal y gestión de suscripciones en su edición community."
      - "Keycloak emite tokens de client credentials; el gateway valida el JWT localmente con las claves públicas y no consulta a Keycloak en cada petición."
      - "Las cuotas de Kong en modo clúster necesitan Redis o Valkey compartido; con contadores locales cada nodo aplica su propio límite."
      - "OpenMeter agrega eventos de uso por cliente y los expone a tu facturación; el gateway le envía cada petición por un log asíncrono."
  aws:
    summary: "API Gateway REST con usage plans, claves de API, caché por etapa y un autorizador de Cognito con client credentials; CloudWatch y los informes de uso alimentan analítica y facturación."
    notes:
      - "Usage plans y claves de API solo existen en las APIs REST, no en las HTTP APIs. AWS avisa de que la limitación y las cuotas de los planes son de mejor esfuerzo: no las uses como control de costes ni de acceso."
      - "Una clave de API no autentica: quien tenga una clave de un plan accede a todas las APIs del plan. La autorización va con Cognito (scopes de un resource server) o un autorizador Lambda."
      - "Cognito cobra el M2M por cada token emitido: exige a los clientes que reutilicen el token hasta que caduque."
      - "API Gateway Portals (noviembre de 2025) y su sucesor API Portal publican documentación con control de acceso por Cognito, pero no dan de alta aplicaciones ni emiten credenciales: ese flujo lo construyes tú."
      - "La caché de REST se cobra por hora según su tamaño, esté o no acertando."
  azure:
    summary: "API Management con productos, suscripciones, políticas de cuota y caché, el portal de desarrolladores integrado y Microsoft Entra ID como servidor OAuth 2.0; la analítica de APIM y Application Insights miden el uso."
    notes:
      - "El tier Consumption no tiene portal de desarrolladores, caché integrada ni analítica de API: para este caso empieza en Basic v2 o Standard v2."
      - "Productos y suscripciones de APIM son los planes; las políticas `rate-limit-by-key` y `quota-by-key` aplican límites por aplicación y `validate-jwt` comprueba el token de Entra ID."
      - "Para partners externos, cada consumidor es un registro de aplicación con secreto o certificado; el portal puede delegar el inicio de sesión en Entra External ID."
      - "APIM no trae monetización: exporta el uso por suscripción e intégralo con tu pasarela de pago."
      - "Los tiers v2 tienen un coste fijo por unidad aunque no haya tráfico; Premium v2 añade inyección en VNet y zonas de disponibilidad."
  gcp:
    summary: "Apigee como gateway con productos de API, cuotas, caché y su propio servidor OAuth 2.0, con el portal integrado y la analítica de Apigee; la monetización es un complemento de suscripción."
    notes:
      - "En pago por uso, Apigee cobra cada entorno por hora y región desde que existe, más las llamadas: el coste mínimo no es cero."
      - "El entorno Base no incluye productos de API ni portales; para este caso necesitas Intermediate o Comprehensive."
      - "La monetización no está disponible en organizaciones de pago por uso: requiere suscripción contratada con ventas. Sin ella, exporta la analítica a tu sistema de cobro."
      - "La política OAuthV2 emite y valida tokens de client credentials; Quota y SpikeArrest separan cuota de negocio y protección ante ráfagas."
tiers:
  - name: "API para pocos partners"
    when: "Una o dos decenas de integradores conocidos, alta manual y sin cobro por uso."
    cost: 1
    ops: 1
    onprem: "Kong o Gravitee en un host con Keycloak, documentación OpenAPI publicada como web estática y alta por correo."
    aws: "API Gateway REST con usage plans, Cognito M2M y la documentación en una web estática o en API Portal."
    azure: "APIM Basic v2 con portal de desarrolladores y Entra ID."
    gcp: "API Gateway de Google Cloud con OpenAPI y claves, o Apigee en entorno Intermediate si ya está contratado."
    tradeoffs: "Altas y rotaciones manuales que no escalan; sin analítica de negocio por cliente."
  - name: "Programa de partners con autoservicio"
    when: "Cientos de consumidores, planes diferenciados, portal de autoservicio y SLA."
    cost: 2
    ops: 2
    onprem: "Gravitee o Kong en clúster con Valkey para cuotas, Keycloak en HA y OpenMeter."
    aws: "API Gateway REST con caché, Cognito M2M, autoservicio propio (Lambda que crea app client y clave) y CloudWatch con informes de uso."
    azure: "APIM Standard v2 con productos, suscripciones con aprobación y caché integrada."
    gcp: "Apigee en entorno Intermediate o Comprehensive con productos, portal integrado y analítica."
    tradeoffs: "Coste fijo relevante del gateway gestionado y trabajo de producto: documentación, soporte y política de versiones."
  - name: "API como producto facturable"
    when: "La API genera ingresos, hay cobro por uso, requisitos regulatorios o presencia en varias regiones."
    cost: 4
    ops: 3
    onprem: "Gateway en varios sitios, Keycloak con mTLS para tokens ligados a certificado y OpenMeter conectado a la facturación."
    aws: "API Gateway en dos regiones con dominio propio y Route 53, WAF, mTLS y uso exportado al sistema de facturación."
    azure: "APIM Premium en varias regiones con zonas de disponibilidad y uso exportado a la pasarela de pago."
    gcp: "Apigee por suscripción con monetización, Advanced API Security e instancias en varias regiones."
    tradeoffs: "La plataforma se convierte en un producto con su propio equipo; los contratos de suscripción del gateway pesan en la factura."
extensions:
  - name: "WAF delante del gateway"
    when: "Siempre que la API sea pública: inyecciones, bots y fuerza bruta contra el endpoint de tokens."
    cost: "low"
    onprem: "Coraza en HAProxy"
    aws: "AWS WAF"
    azure: "Front Door o Application Gateway WAF"
    gcp: "Cloud Armor"
  - name: "mTLS y tokens ligados a certificado"
    when: "Banca, salud o partners que exigen autenticación mutua."
    cost: "low"
    onprem: "Keycloak + mTLS en el gateway"
    aws: "mTLS en dominio propio de API Gateway"
    azure: "Certificados de cliente en APIM"
    gcp: "mTLS en Apigee o en el balanceador"
  - name: "Caché compartida externa"
    when: "Cuando la caché integrada se queda corta o hay varias instancias del gateway."
    cost: "medium"
    onprem: "Valkey"
    aws: "CloudFront delante de la API"
    azure: "Azure Managed Redis"
    gcp: "Memorystore"
  - name: "Sandbox para integradores"
    when: "Para que los partners prueben sin tocar datos reales."
    cost: "low"
    onprem: "Entorno de Gravitee con mocks"
    aws: "Etapa sandbox con integración mock"
    azure: "Producto sandbox con `mock-response`"
    gcp: "Entorno de Apigee con proxies mock"
  - name: "Webhooks salientes"
    when: "Cuando los consumidores hacen sondeo para enterarse de cambios."
    cost: "low"
    onprem: "Svix (autoalojado)"
    aws: "EventBridge API destinations"
    azure: "Event Grid"
    gcp: "Eventarc + Cloud Run"
  - name: "Catálogo y gobierno de APIs"
    when: "Varios equipos publican APIs y hay que evitar duplicados y APIs en la sombra."
    cost: "medium"
    onprem: "Backstage"
    aws: "API Portal (descubrimiento)"
    azure: "Azure API Center"
    gcp: "Apigee API hub"
savings:
  - "Dimensiona el gateway gestionado por su coste fijo: Apigee cobra cada entorno por hora y región, y APIM v2 por unidad; elimina entornos de pruebas que nadie usa."
  - "En Azure, no pagues Premium para tener portal y caché: Basic v2 y Standard v2 los incluyen; Premium solo si necesitas VNet inyectada, zonas o varias regiones."
  - "Obliga a los clientes a cachear el token hasta su caducidad: Cognito cobra el M2M por token emitido y cualquier servidor OAuth sufre con un token por petición."
  - "Responde con `Cache-Control` y ETag en las lecturas públicas y pon una CDN delante si los datos lo permiten: un acierto en el borde no pasa por el gateway."
  - "Rechaza pronto lo que no debería llegar: WAF y limitación de tasa delante evitan pagar llamadas al gateway y al backend por tráfico abusivo."
  - "Fija la retención de logs de acceso y envía a analítica solo los campos que usas; con millones de llamadas, los logs cuestan más que el gateway."
---

## Cuándo lo necesitas

Cuando la API deja de ser algo que consume tu frontend y pasa a ser un producto para terceros: partners que integran su ERP, desarrolladores que construyen sobre tu plataforma, un regulador que exige acceso (banca abierta, sanidad, administración) o un modelo de negocio que cobra por llamada. A partir de ahí ya no basta con un balanceador: necesitas saber quién llama, con qué permisos, cuánto puede llamar, cómo se entera de los cambios y cuánto le cobras.

Si la API solo la consume tu propia aplicación, este caso sobra: el balanceador o el API gateway del caso de [API serverless](/arquitectura/serverless-api/) es suficiente.

## Escenarios

### Integración con una docena de partners

Proveedores o clientes grandes que conectan sus sistemas. El alta es manual y negociada, así que un portal de autoservicio es prescindible; lo importante es OAuth 2.0 con client credentials, una clave por partner asociada a su plan, documentación OpenAPI publicada y un sandbox. Gateway pequeño y nada de monetización.

### Plataforma con ecosistema de desarrolladores

Cientos o miles de desarrolladores se dan de alta solos. El portal es el producto: registro, creación de aplicaciones, credenciales, rotación, documentación interactiva y estado del servicio. Planes gratuito y de pago con cuotas distintas, y analítica por aplicación para soporte. Aquí brillan APIM, Apigee o Gravitee; en AWS el autoservicio lo construyes tú.

### Sector regulado

Banca abierta o sanidad: mTLS con certificados de cliente, tokens ligados al certificado, consentimiento del usuario final (aquí entra el flujo de código, no solo client credentials), registros de auditoría inmutables y residencia de datos. El gateway y el servidor OAuth deben estar en la región exigida y los logs no pueden salir de ella.

### API que se cobra por uso

El contador de uso se convierte en dato de facturación: tiene que ser completo, idempotente y auditable. Mide en el gateway, agrega en un sistema de medición (OpenMeter, la monetización de Apigee o tu propio pipeline) y factura desde ahí. Las cuotas del plan cortan el exceso o lo facturan según el contrato.

## Cómo encaja

El desarrollador entra en el portal, se registra y crea una aplicación. El portal la da de alta en el servidor OAuth (obtiene `client_id` y secreto o certificado) y en el gateway (la asocia a un plan con su clave). Desde ese momento, la aplicación pide un token al servidor OAuth con client credentials y llama al gateway con el token y la clave.

El gateway valida el token localmente con las claves públicas del emisor, comprueba scopes, aplica la limitación de tasa y la cuota del plan de esa aplicación, y busca la respuesta en la caché si la operación es cacheable. Si no hay acierto, enruta a la versión correspondiente del servicio interno, que vive en red privada y solo acepta tráfico del gateway. Cada petición se registra de forma asíncrona con aplicación, operación, código y latencia para la analítica y la facturación.

El versionado vive en el gateway: `/v1` y `/v2` (o una cabecera) enrutan a backends distintos, la versión antigua devuelve cabeceras `Deprecation` y `Sunset`, y el portal muestra qué aplicaciones siguen usándola para avisarles antes de retirarla.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Kong (con PostgreSQL) o Gravitee (con MongoDB o PostgreSQL y Elasticsearch u OpenSearch para la analítica), Keycloak con su base de datos y el portal, detrás de un proxy con TLS. Válido para pocos partners; el gateway es un punto único de fallo y las copias incluyen la configuración de planes y aplicaciones.

**Kubernetes on-premises.** Kong Ingress Controller o el operador de Gravitee, gestionando APIs, planes y consumidores como recursos declarativos en Git. Keycloak con su operador, CloudNativePG, Valkey para contadores compartidos y cert-manager. Es la opción seria on-premises.

**Cloud sin Kubernetes.** El diseño del diagrama: API Gateway, APIM o Apigee gestionados, con los servicios internos en ECS Fargate, Container Apps o Cloud Run. No operas el gateway, pero pagas su coste fijo y aceptas sus límites.

**Kubernetes gestionado.** Kong o Gravitee en EKS, AKS o GKE compensan si quieres el mismo gateway en todas las nubes y on-premises, o si el coste fijo de Apigee o APIM Premium no se justifica con tu volumen.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Un host | Media | Vertical | Pocos partners on-premises |
| Kubernetes on-premises | Clúster | Alta | HPA | On-premises serio |
| Gateway gestionado | De casi nulo (API Gateway) a alto (Apigee) | Baja | Gestionado | Opción por defecto en cloud |
| EKS, AKS, GKE | Plano de control y nodos | Media-alta | HPA | Mismo gateway en todas partes |

## Decisiones clave

- **Clave o token.** La clave identifica la aplicación y su plan; el token OAuth autoriza. Usar solo claves es cómodo pero no permite scopes, caducidad ni rotación limpia.
- **Gateway gestionado o propio.** API Gateway es barato pero básico; APIM y Apigee traen portal y analítica con coste fijo; Kong y Gravitee dan portabilidad a cambio de operarlos.
- **Versionado por ruta o cabecera.** La ruta es visible, fácil de enrutar y de cachear; la cabecera mantiene URLs estables. Elige una y escríbela en la política de versiones con plazos de retirada.
- **Cuota frente a limitación de tasa.** La cuota es un límite de negocio (llamadas al mes); la limitación protege de ráfagas (llamadas por segundo). Necesitas las dos y no se configuran igual.
- **Medición propia o del gateway.** Si facturas, el registro del gateway debe ser la fuente; conciliarlo con logs del backend genera disputas.

## Errores habituales

- Tratar la clave de API como autenticación y enviarla por query string, donde acaba en logs y cachés.
- Cuotas con contadores locales en cada nodo: con cinco réplicas el cliente tiene cinco veces su cuota.
- Publicar la primera versión sin política de deprecación y tener que mantenerla eternamente.
- Cachear respuestas que dependen del cliente sin incluir la aplicación en la clave de caché.
- Devolver errores internos con trazas de pila a terceros, o códigos 500 cuando el problema es la cuota (debe ser 429 con `Retry-After`).
- Dejar el backend accesible sin pasar por el gateway y que un partner descubra la URL directa.
