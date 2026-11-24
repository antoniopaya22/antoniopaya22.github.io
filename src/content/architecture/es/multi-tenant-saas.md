---
title: "SaaS multi-tenant"
short: "SaaS multi-tenant"
summary: "Servir a muchas organizaciones con una sola plataforma sin que ninguna vea los datos de otra: identidad por organización, contexto de tenant en cada petición, base de datos compartida con RLS para la mayoría y silos dedicados para quien los paga o los exige."
description: "SaaS multi-tenant: pool con RLS o silo, identidad por organización, clave por tenant, medición de uso y onboarding en AWS, Azure, GCP y on-premises."
order: 4
requirements:
  - "Ningún tenant puede leer ni modificar datos de otro, aunque el código de la API tenga un fallo."
  - "Cada usuario entra con la identidad de su organización y el token lleva el tenant de forma verificable."
  - "Los datos de cada tenant se cifran con una clave atribuible a ese tenant y revocable."
  - "Un tenant ruidoso no degrada a los demás: hay límites por tenant en la API y en la base de datos."
  - "El uso se mide por tenant y es auditable para facturar."
  - "Dar de alta un tenant, pool o silo, es un proceso automatizado y repetible."
platforms:
  onprem:
    summary: "Keycloak con organizaciones, Traefik con Coraza en el borde, la API en Kubernetes, PostgreSQL con Patroni y RLS para el pool, un namespace con base de datos propia para cada silo, OpenBao transit para las claves y Kafka para el uso."
    notes:
      - "Las organizaciones de Keycloak están soportadas desde la versión 26: un solo realm con una organización por cliente, dominios asociados y su propio proveedor de identidad federado."
      - "OpenBao transit admite claves derivadas: con `derived=true`, cada operación pasa el `tenant_id` como contexto y obtiene una clave distinta sin crear una por tenant."
      - "El silo on-premises es un namespace con `ResourceQuota`, `NetworkPolicy` y su propio clúster de PostgreSQL; para aislamiento fuerte, nodos dedicados o un clúster aparte."
      - "Coraza se integra en Traefik como plugin WASM y aplica las reglas OWASP CRS; los certificados de dominios de cliente, con cert-manager y ACME."
      - "El coste es operar todo: Keycloak, Patroni, Kafka y OpenBao con alta disponibilidad, más la capacidad reservada para los silos."
  aws:
    summary: "CloudFront con WAF delante de la API en ECS Fargate, Cognito para la identidad, Aurora PostgreSQL con RLS para el pool, una cuenta AWS por silo, KMS para las claves y Kinesis Data Streams para medir el uso."
    notes:
      - "Cognito ofrece varios modelos: user pool por tenant (aislamiento máximo, más piezas que gestionar), app client por tenant, grupos o atributos personalizados. Las cuotas de Cognito son por cuenta y región y las comparten todos los tenants."
      - "Una clave KMS por tenant tiene cuota mensual por clave; la alternativa es cifrado envolvente con una clave y el `tenant_id` en el contexto de cifrado, que queda registrado en CloudTrail."
      - "Las distribuciones multi-tenant de CloudFront SaaS Manager comparten configuración y dejan que cada cliente apunte su dominio con un CNAME."
      - "El silo como cuenta dedicada se crea con AWS Organizations y Control Tower; la API del pool lo alcanza por rol asumido, nunca con credenciales fijas."
      - "Se paga por petición en CloudFront y WAF, por tiempo de tarea en Fargate, por instancia o ACU en Aurora y por shard u on-demand en Kinesis."
  azure:
    summary: "Front Door con WAF delante de Container Apps, Entra External ID para la identidad, Azure Database for PostgreSQL con RLS para el pool, una suscripción por silo, Key Vault para las claves y Event Hubs para medir el uso."
    notes:
      - "Entra External ID es el producto para identidades externas; Azure AD B2C no admite clientes nuevos desde mayo de 2025. Para clientes que ya usan Entra ID, una aplicación multiinquilino les deja entrar con su propio directorio."
      - "Front Door gestiona dominios personalizados con certificados administrados; revisa el límite de dominios por perfil antes de prometer dominios propios a miles de clientes."
      - "Key Vault no tiene contexto de cifrado: con cifrado envolvente, mete el `tenant_id` como dato autenticado adicional (AAD) en AES-GCM al cifrar con la clave de datos."
      - "La suscripción por silo se crea con un proceso de subscription vending (Terraform o Bicep) bajo un grupo de administración con las políticas comunes."
      - "Se paga por petición y regla en Front Door, por vCPU y memoria en Container Apps, por instancia en PostgreSQL y por unidad de throughput en Event Hubs."
  gcp:
    summary: "Balanceador de Cloud con Cloud Armor delante de Cloud Run, Identity Platform con tenants, Cloud SQL para PostgreSQL con RLS para el pool, un proyecto por silo, Cloud KMS para las claves y Pub/Sub para medir el uso."
    notes:
      - "Identity Platform admite multi-tenancy nativa: cada tenant tiene sus usuarios y sus proveedores (SAML, OIDC) y el token incluye el identificador del tenant."
      - "Cloud KMS cobra por versión de clave activa y por operación; para no crear una clave por tenant, cifrado envolvente con el `tenant_id` como dato autenticado adicional."
      - "Certificate Manager con mapas de certificados sirve muchos dominios de cliente en el mismo balanceador."
      - "El proyecto por silo se crea con una factoría de proyectos en Terraform dentro de una carpeta con las políticas de organización comunes."
      - "Se paga por regla y petición en el balanceador y Cloud Armor, por CPU y memoria en Cloud Run, por instancia en Cloud SQL y por volumen en Pub/Sub."
tiers:
  - name: "Pool compartido"
    when: "Producto que empieza, decenas de clientes pequeños y un equipo que no puede operar un entorno por cliente."
    cost: 1
    ops: 1
    onprem: "Un host o un k3s pequeño con Traefik, la API, Keycloak y un PostgreSQL con RLS; cifrado envolvente con una sola clave de OpenBao."
    aws: "Fargate detrás de CloudFront, un user pool de Cognito con atributo de tenant, Aurora PostgreSQL Serverless v2 con RLS y una clave KMS con contexto por tenant."
    azure: "Container Apps detrás de Front Door, Entra External ID, PostgreSQL flexible server con RLS y una clave de Key Vault con AAD por tenant."
    gcp: "Cloud Run detrás del balanceador, Identity Platform con tenants, Cloud SQL con RLS y una clave de Cloud KMS con AAD por tenant."
    tradeoffs: "Un fallo de aislamiento expone a todos, el ruido entre vecinos solo se controla con límites y no se pueden ofrecer región ni clave dedicadas."
  - name: "Pool + silos premium"
    when: "La mayoría de clientes en el pool y unos pocos grandes o regulados que pagan por aislamiento propio."
    cost: 2
    ops: 2
    onprem: "Pool en Kubernetes con Patroni y RLS; cada silo, un namespace con quota, NetworkPolicy y su clúster de CloudNativePG o Patroni."
    aws: "Pool como en el nivel anterior más una cuenta por silo creada con Control Tower, con su Aurora y su clave KMS dedicada; Kinesis para el uso."
    azure: "Pool compartido y una suscripción por silo con su PostgreSQL y su clave en Key Vault; Event Hubs para el uso."
    gcp: "Pool compartido y un proyecto por silo con su Cloud SQL y su clave de Cloud KMS; Pub/Sub para el uso."
    tradeoffs: "Dos formas de desplegar y migrar la base de datos; el enrutado por tenant y el onboarding tienen que conocer ambos modelos."
  - name: "Silo por tenant"
    when: "Pocos clientes grandes, contratos con residencia de datos o auditorías que exigen separación física completa."
    cost: 4
    ops: 3
    onprem: "Un clúster o un conjunto de nodos por cliente gestionado con Cluster API y GitOps; el plano de control del SaaS solo orquesta."
    aws: "Una cuenta por tenant con toda la pila desplegada desde la misma plantilla; un plano de control central para onboarding, métricas y facturación."
    azure: "Una suscripción por tenant creada por vending con la pila completa; el plano de control en una suscripción propia."
    gcp: "Un proyecto por tenant con la pila completa desde una factoría de proyectos; plano de control en un proyecto central."
    tradeoffs: "El coste fijo se multiplica por cliente y desplegar una versión significa actualizar N entornos; sin automatización total no escala."
extensions:
  - name: "Dominios propios de cliente"
    when: "Cuando los clientes quieren su marca en `app.cliente.com` en lugar de un subdominio tuyo."
    cost: "low"
    onprem: "Traefik + cert-manager (ACME)"
    aws: "CloudFront SaaS Manager"
    azure: "Front Door custom domains"
    gcp: "Certificate Manager (cert maps)"
  - name: "Límites por tenant"
    when: "Cuando un cliente con picos o una integración mal hecha empieza a degradar al resto."
    cost: "low"
    onprem: "Límites en la API con Redis"
    aws: "AWS WAF rate-based rules"
    azure: "API Management rate-limit-by-key"
    gcp: "Cloud Armor rate limiting"
  - name: "Pooler de conexiones"
    when: "Cuando muchas réplicas de la API abren conexiones a la base de datos compartida."
    cost: "low"
    onprem: "PgBouncer"
    aws: "RDS Proxy"
    azure: "PgBouncer integrado"
    gcp: "PgBouncer junto a la API"
  - name: "Réplicas de lectura"
    when: "Cuando informes y exportaciones de unos tenants compiten con las escrituras de todos."
    cost: "medium"
    onprem: "Réplicas de Patroni"
    aws: "Aurora Replicas"
    azure: "Read replicas"
    gcp: "Cloud SQL read replicas"
  - name: "Agregación del uso para facturar"
    when: "Cuando el precio depende del consumo y hay que conciliar el uso con las facturas."
    cost: "low"
    onprem: "Kafka Connect + ClickHouse"
    aws: "Firehose + S3 + Athena"
    azure: "Event Hubs Capture + Data Explorer"
    gcp: "Suscripción de Pub/Sub a BigQuery"
  - name: "Vending de silos"
    when: "Cuando dar de alta un silo deja de ser algo excepcional y debe tardar minutos, no días."
    cost: "low"
    onprem: "Cluster API + Argo CD ApplicationSet"
    aws: "Control Tower Account Factory"
    azure: "Subscription vending (Terraform)"
    gcp: "Project Factory (Terraform)"
savings:
  - "Mantén a la mayoría de clientes en el pool y ofrece el silo como plan de pago cuyo precio cubra su coste fijo: cuenta, base de datos, claves y operación."
  - "Usa cifrado envolvente con una clave KMS y el `tenant_id` en el contexto de cifrado o como AAD en lugar de una clave por tenant; reserva las claves dedicadas para los contratos que las exigen."
  - "Para silos de clientes pequeños o poco activos, Aurora Serverless v2 con capacidad mínima 0 ACU se pausa sin conexiones y deja de cobrar instancia mientras está parada."
  - "Agrega el uso por tenant y minuto en la API antes de emitirlo: menos eventos en Kinesis, Event Hubs o Pub/Sub y menos coste de ingesta, con la misma precisión de facturación."
  - "Comparte el borde: una distribución multi-tenant de CloudFront, un perfil de Front Door o un balanceador con mapa de certificados para todos los dominios, no uno por cliente."
  - "Compromete la capacidad base del pool con Savings Plans, reservas de Azure o CUD de Google Cloud, y usa Graviton en Fargate; los silos variables, bajo demanda."
---

## Cuándo lo necesitas

Cuando vendes el mismo producto a muchas organizaciones y cada una espera que sus datos estén separados de los demás. Una copia por cliente funciona con tres clientes y es inmanejable con trescientos. Compartirlo todo sin diseño es el otro extremo: un `WHERE` olvidado enseña los datos de un cliente a otro. Este caso es el punto intermedio: compartir lo que se puede compartir y aislar lo que hace falta, con el tenant como concepto de primer nivel en identidad, datos, claves, límites y facturación.

## Escenarios

### Startup B2B con sus primeros clientes

Todo en el pool: una base de datos con RLS, un único proveedor de identidad con una organización por cliente y cifrado envolvente con una sola clave. Lo importante no es el aislamiento físico, sino que el `tenant_id` esté en el token, en cada tabla y en cada log desde el primer día. Añadirlo después a un esquema que no lo tiene es muy caro.

### Cliente regulado que exige sus datos en la UE y su propia clave

Ese cliente va a un silo: cuenta, suscripción o proyecto propio en una región de la UE, con su base de datos y una clave dedicada que puede ser incluso de su propiedad (BYOK). El resto sigue en el pool. El plano de control del SaaS sabe en qué modelo vive cada tenant y enruta según eso.

### Un cliente grande que satura a los demás

Cuando un tenant lanza una exportación masiva y la latencia sube para todos: primero, límites por tenant en la API y en el WAF; después, colas separadas para trabajo pesado y réplicas de lectura para informes. Si sigue pesando demasiado, se le mueve a un silo y la migración se cobra.

### Software que también se instala en casa del cliente

Algunos clientes piden on-premises. El diseño de silo encaja: la misma pila, desplegada con Kubernetes y GitOps en su centro de datos, con Keycloak federado a su directorio. Exige que el núcleo de la aplicación no dependa de servicios propietarios de una nube.

## Cómo encaja

El usuario entra por el proveedor de identidad, que sabe a qué organización pertenece: por el dominio de su correo, por la federación con el directorio del cliente o por el subdominio desde el que llega. El token que emite lleva el `tenant_id` como claim firmado. Con él, el usuario llama al borde (dominios y WAF), que termina TLS para el dominio del cliente, aplica reglas y límites y reenvía a la API.

La API valida el token y saca de él el tenant, nunca de un parámetro de la URL o del cuerpo. Con ese contexto consulta su registro de tenants y decide: si el tenant vive en el pool, abre una transacción contra la base de datos compartida, fija el tenant con `SET LOCAL app.tenant_id` y deja que las políticas de RLS filtren cada fila; si vive en un silo, enruta a la base de datos de su cuenta, suscripción o proyecto.

Para los datos sensibles, la API pide al KMS una clave de datos ligada al tenant (clave dedicada o contexto de cifrado con el `tenant_id`) y cifra antes de guardar. Así cada uso de clave queda registrado y atribuido a un tenant, y revocar la clave de un silo deja sus datos ilegibles. Esos registros de uso de clave, como el resto de consumo, alimentan la medición: la API emite eventos de uso por tenant (peticiones, almacenamiento, operaciones) a un stream del que se agrega para facturar y para detectar abusos.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Traefik como proxy inverso con certificados ACME, la API, Keycloak, PostgreSQL con RLS y OpenBao, con volúmenes para la base de datos y el almacenamiento de OpenBao y copias con `pg_dump` o pgBackRest a un almacenamiento externo. Sirve para una demo o los primeros clientes, sin silos ni alta disponibilidad.

**Kubernetes on-premises (k3s o RKE2).** CloudNativePG o Patroni para PostgreSQL, el operador de Keycloak, cert-manager para los dominios, Strimzi para Kafka y OpenBao en alta disponibilidad. Los silos son namespaces con `ResourceQuota`, `LimitRange`, `NetworkPolicy` y su propio clúster de base de datos; Argo CD con ApplicationSet despliega un silo por cada entrada del registro de tenants.

**Cloud sin Kubernetes.** La API en ECS Fargate, Container Apps o Cloud Run; base de datos gestionada; identidad, claves y stream gestionados. Es la opción con menos operación; los silos son cuentas, suscripciones o proyectos con la misma pila desde la misma plantilla de Terraform.

**Kubernetes gestionado (EKS, AKS, GKE).** Compensa cuando ya hay un equipo de plataforma o cuando los silos son muchos y pequeños: un namespace por tenant en un clúster compartido es más barato que una cuenta por tenant, y se puede pasar a nodos dedicados por tenant con taints y tolerations.

| Opción | Coste fijo | Operación | Silos | Cuándo |
|---|---|---|---|---|
| Docker Compose | Muy bajo | Manual | No | Demo o primeros clientes |
| Kubernetes on-premises | Alto | Alta | Namespace o clúster | Requisito on-premises |
| PaaS o serverless | Bajo | Baja | Cuenta o proyecto | Pool gestionado |
| Kubernetes gestionado | Medio | Media | Namespace o nodos | Muchos silos pequeños |

## Decisiones clave

- **Pool o silo.** El pool es barato y se despliega una vez; el silo da aislamiento real, región y clave propias, a cambio de coste fijo por cliente. Casi siempre la respuesta es ambos, con el silo como plan superior.
- **RLS o filtros en el código.** RLS hace que la base de datos rechace lo que el código olvida filtrar. Los filtros en el código siguen haciendo falta para usar bien los índices, pero no como única barrera.
- **Una clave por tenant o cifrado envolvente.** Una clave dedicada permite revocar y auditar por cliente, pero cada clave tiene coste y las cuotas de peticiones al KMS son por cuenta; el contexto de cifrado da atribución sin multiplicar claves.
- **Identidad: un directorio o uno por tenant.** Un directorio compartido con organizaciones es más simple; un user pool o tenant de identidad por cliente aísla configuración, MFA y federación, pero multiplica lo que hay que mantener.
- **Medir en tiempo real o por lotes.** El stream da visibilidad inmediata para límites y alertas; la facturación puede salir de agregados diarios. Lo que no puede faltar es que cada evento lleve tenant y un identificador para deduplicar.

## Errores habituales

- Tomar el tenant de la URL o de una cabecera que manda el cliente, en lugar del token firmado.
- Activar RLS sin `FORCE ROW LEVEL SECURITY`: el propietario de la tabla se salta las políticas, y también cualquier rol superusuario o con `BYPASSRLS`. La API debe conectarse con un rol sin esos privilegios.
- Usar `SET` en lugar de `SET LOCAL` detrás de un pooler en modo transacción: la conexión vuelve al pool con el tenant anterior fijado y la siguiente petición hereda el contexto equivocado.
- Olvidar el tenant en lo que no es la base de datos: cachés, nombres de objetos en almacenamiento, colas, índices de búsqueda y logs.
- Hacer el onboarding a mano: cada silo creado con clics es una configuración que nadie podrá reproducir ni actualizar.
- No probar el aislamiento: un test que intenta leer datos de otro tenant con un token válido debe formar parte de la integración continua.
