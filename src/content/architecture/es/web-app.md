---
title: "Frontend, backend y base de datos"
short: "Web + API + BBDD"
summary: "La base de casi cualquier producto: una SPA servida desde CDN, una API sin estado en contenedores y una base de datos relacional, con identidad, caché y secretos resueltos desde el primer día."
description: "SPA, API en contenedores y base de datos relacional con CDN, WAF, OIDC, caché y secretos: arquitectura de referencia en AWS, Azure, GCP y on-premises."
order: 1
requirements:
  - "La API es sin estado y escala en horizontal."
  - "Todo el tráfico entra por TLS y atraviesa un WAF antes de llegar a la API."
  - "La autenticación se delega en un proveedor OIDC; la API solo valida tokens."
  - "Ninguna credencial vive en el código, en las imágenes ni en variables en claro."
  - "La base de datos tiene alta disponibilidad, copias y restauración a un punto en el tiempo."
platforms:
  onprem:
    summary: "Kubernetes con HAProxy y Coraza WAF en la entrada, Keycloak como IdP, PostgreSQL con Patroni, Valkey y OpenBao, todo operado por tu equipo."
    notes:
      - "Patroni necesita un almacén de consenso (etcd) y un punto de entrada que siga siempre al primario; sin eso, cada failover deja a la API escribiendo contra una réplica."
      - "Coraza (vía SPOA en HAProxy) con el OWASP Core Rule Set da falsos positivos al principio: arranca en modo detección y ajusta exclusiones antes de bloquear. Coraza es el sucesor mantenido de ModSecurity."
      - "Vault pasó a licencia BSL; OpenBao es el fork open source con API compatible, por eso va primero."
      - "Keycloak y Valkey también son estado: necesitan réplicas, copias y actualizaciones como la base de datos."
      - "No hay factura por uso: el coste es operación (parches, guardias, copias probadas) y capacidad reservada para el pico."
  aws:
    summary: "CloudFront con S3 para el frontend, ALB con AWS WAF delante de ECS Fargate, Cognito para identidad, Aurora PostgreSQL, ElastiCache y Secrets Manager."
    notes:
      - "CloudFront puede servir S3 y además enrutar `/api/*` al ALB: un único dominio elimina CORS y permite aplicar el WAF también en el borde."
      - "Usa Origin Access Control para que el bucket no sea público y solo CloudFront pueda leerlo."
      - "Inyecta los secretos en la definición de tarea de ECS desde Secrets Manager y activa la rotación de las credenciales de Aurora."
      - "ElastiCache admite Valkey además de Redis OSS; para sesiones, réplicas en varias zonas o la sesión se pierde con el nodo."
      - "Fargate cobra por vCPU y memoria asignadas; Aurora por instancia (o capacidad en Serverless v2), almacenamiento y E/S. NAT Gateway y tráfico entre zonas suelen ser la sorpresa de la factura."
  azure:
    summary: "Front Door con Storage para estáticos, Application Gateway con WAF delante de Container Apps, Entra External ID, Azure Database for PostgreSQL, Azure Managed Redis y Key Vault."
    notes:
      - "Front Door también tiene WAF: si todo entra por él, valora prescindir de Application Gateway; si usas los dos, decide en cuál viven las reglas para no mantenerlas duplicadas."
      - "Entra External ID sustituye a Azure AD B2C para clientes nuevos; no empieces un proyecto en B2C."
      - "Azure Managed Redis es el sucesor de Azure Cache for Redis, que está en retirada."
      - "Con identidades administradas, Container Apps lee Key Vault y entra en PostgreSQL con autenticación de Entra, sin contraseñas que rotar."
      - "Application Gateway tiene coste fijo por hora más unidades de capacidad; Container Apps escala a cero en consumo, pero una API con tráfico constante paga sus réplicas igual."
  gcp:
    summary: "Un balanceador de aplicaciones externo con Cloud Armor sirve el bucket a través de Cloud CDN y enruta `/api` a Cloud Run; Identity Platform, Cloud SQL, Memorystore y Secret Manager completan el diseño."
    notes:
      - "El mismo balanceador sirve un backend bucket con Cloud CDN y un NEG serverless hacia Cloud Run: un dominio y una sola política de Cloud Armor."
      - "Restringe la entrada de Cloud Run a tráfico interno y del balanceador; si no, la URL `run.app` permite saltarse Cloud Armor."
      - "Memorystore solo es accesible por red privada: Cloud Run llega con salida VPC directa o con un conector."
      - "Con muchas instancias de Cloud Run, las conexiones a Cloud SQL se disparan: limita el pool por instancia o pon PgBouncer delante."
      - "Identity Platform se paga por usuario activo mensual; Cloud Run, por CPU y memoria mientras atiende peticiones salvo que asignes CPU siempre."
tiers:
  - name: "Mínimo viable"
    when: "MVP o herramienta interna con pocos cientos de usuarios, un equipo pequeño y tolerancia a algún minuto de caída."
    cost: 1
    ops: 1
    onprem: "Un host con Docker Compose: Caddy o HAProxy con Coraza delante, la API, PostgreSQL, Valkey y Keycloak, con copias de PostgreSQL a un almacenamiento externo."
    aws: "CloudFront y S3, una tarea Fargate en ARM64, Aurora Serverless v2 con pausa automática en dev, ElastiCache Serverless y endpoints de VPC en lugar de NAT."
    azure: "Front Door Premium con WAF y Private Link hasta Container Apps con mínimo cero réplicas, PostgreSQL Flexible Server Burstable y Azure Managed Redis sin réplica."
    gcp: "Balanceador con Cloud Armor y Cloud CDN, Cloud Run con mínimo cero instancias, Cloud SQL zonal pequeño y Memorystore for Valkey de núcleo compartido."
    tradeoffs: "Una sola zona para la base de datos y la caché: una caída zonal o de host es una caída del servicio, y escalar a cero añade arranques en frío."
  - name: "Producción en varias zonas"
    when: "Producto con clientes que pagan, SLA contractual y tráfico diurno sostenido."
    cost: 2
    ops: 2
    onprem: "Kubernetes de tres nodos (k3s o RKE2), PostgreSQL con Patroni o un operador en tres nodos, Valkey con Sentinel y Keycloak con dos réplicas."
    aws: "Al menos dos tareas Fargate en dos zonas, Aurora con escritor y lector en zonas distintas, WAF con reglas gestionadas y Secrets Manager con rotación."
    azure: "Entorno de Container Apps con redundancia de zona y mínimo dos réplicas, PostgreSQL de uso general con HA de zona y copias georredundantes, Managed Redis con HA."
    gcp: "Cloud Run con al menos una instancia caliente, Cloud SQL regional con conmutación automática y Memorystore con réplica en otra zona."
    tradeoffs: "Duplicas capacidad que casi siempre está ociosa para sobrevivir a la pérdida de una zona; la región sigue siendo un punto único."
  - name: "Multirregión"
    when: "Servicio crítico con objetivos de recuperación de minutos ante la caída de una región, o usuarios repartidos por continentes."
    cost: 4
    ops: 3
    onprem: "Dos centros de datos, un clúster Patroni en espera en el segundo y un DNS o balanceo global que conmuta."
    aws: "Aurora Global Database, el servicio ECS replicado en una segunda región y conmutación con Route 53 o con grupos de origen de CloudFront."
    azure: "Front Door con orígenes en dos regiones, Container Apps en ambas y una réplica de lectura de PostgreSQL entre regiones que se promueve al conmutar."
    gcp: "El balanceador global con NEG serverless de Cloud Run en dos regiones y una réplica de Cloud SQL entre regiones que se promueve al conmutar."
    tradeoffs: "Más del doble de coste y mucha más complejidad: replicación asíncrona, posibles pérdidas de escrituras al conmutar y simulacros obligatorios."
extensions:
  - name: "Pooler de conexiones"
    when: "Cuando el número de réplicas de la API multiplicado por su pool se acerca al límite de conexiones de PostgreSQL."
    cost: "low"
    onprem: "PgBouncer"
    aws: "RDS Proxy"
    azure: "PgBouncer integrado en Flexible Server"
    gcp: "PgBouncer junto a la API"
  - name: "Réplicas de lectura"
    when: "Cuando los informes o las búsquedas compiten con las escrituras por la CPU del primario."
    cost: "medium"
    onprem: "Réplicas de Patroni"
    aws: "Lectores de Aurora"
    azure: "Réplicas de lectura de Flexible Server"
    gcp: "Réplicas de lectura de Cloud SQL"
  - name: "Limitación de peticiones"
    when: "API pública expuesta a scraping, fuerza bruta contra el login o clientes que se pasan de cuota."
    cost: "low"
    onprem: "Stick tables de HAProxy"
    aws: "Reglas por tasa de AWS WAF"
    azure: "Límite de tasa del WAF de Front Door"
    gcp: "Rate limiting de Cloud Armor"
  - name: "Cola para trabajo lento"
    when: "Cuando alguna petición genera PDFs, envía correos o llama a terceros lentos."
    cost: "low"
    onprem: "RabbitMQ"
    aws: "Amazon SQS"
    azure: "Service Bus (colas)"
    gcp: "Pub/Sub o Cloud Tasks"
  - name: "Recuperación en otra región"
    when: "Cuando el negocio no acepta horas de caída si cae la región entera."
    cost: "high"
    onprem: "Clúster Patroni en espera"
    aws: "Aurora Global Database"
    azure: "Réplica de PostgreSQL entre regiones"
    gcp: "Réplica de Cloud SQL entre regiones"
  - name: "Imágenes y subidas de usuario"
    when: "Cuando los usuarios suben ficheros: van directos al almacenamiento con URL prefirmada, no a través de la API."
    cost: "low"
    onprem: "Ceph RGW (S3)"
    aws: "S3 con URL prefirmadas"
    azure: "Blob Storage con SAS de delegación"
    gcp: "Cloud Storage con URL firmadas"
savings:
  - "Compila la imagen para ARM y ejecuta Fargate en Graviton (`ARM64`): el precio por vCPU-hora es menor que en x86 y la mayoría de APIs en Node, Python, Go o Java corren sin cambios."
  - "Evita el NAT Gateway: con endpoints de VPC para ECR, Secrets Manager, CloudWatch Logs y S3 las tareas privadas no necesitan salida a Internet; si la necesitas, un solo NAT en dev."
  - "En dev, escala la API a cero (Container Apps y Cloud Run con mínimo cero) y deja que Aurora Serverless v2 se pause con 0 ACU; en prod, mantén una instancia caliente."
  - "Compromete el consumo base cuando sea estable: Compute Savings Plans cubren Fargate, la capacidad reservada de PostgreSQL Flexible Server y los descuentos por compromiso de Cloud SQL y Cloud Run."
  - "Cachea en la CDN todo lo estático con nombres con hash y caducidad larga; cada acierto de caché es una petición que no paga ni la API ni el WAF."
  - "Fija la retención de logs (30 días en dev es razonable) y limita el muestreo de trazas: la observabilidad suele crecer más que la propia API."
---

## Cuándo lo necesitas

Es el punto de partida de casi cualquier producto con usuarios: un panel de gestión, un SaaS B2B, la web de un servicio público. Hay una interfaz que se descarga una vez, una API que concentra la lógica de negocio y una base de datos relacional que es la fuente de verdad. Si tu carga es sobre todo CRUD con transacciones y unos miles de usuarios concurrentes, este diseño aguanta mucho más de lo que se suele pensar antes de necesitar algo más sofisticado.

## Escenarios

### MVP de una startup

Prioriza el coste fijo bajo y la velocidad de entrega. Una sola región, la API con mínimo cero o una réplica, la base de datos en su tamaño más pequeño con copias activadas y el IdP gestionado para no escribir nunca un formulario de contraseñas. Lo innegociable incluso aquí: TLS, secretos fuera del código y restauración probada; réplicas y multizona se añaden después cambiando parámetros.

### Empresa regulada con datos en la UE

Fija la región y comprueba dónde guarda los usuarios el IdP (Cognito es regional; Entra External ID fija la ubicación de los datos al crear el inquilino), cifra con claves propias en el gestor de claves, activa los logs de acceso del WAF y del balanceador con retención acorde a la norma y separa entornos en cuentas, suscripciones o proyectos distintos. La CDN sirve contenido desde el borde global: si el HTML o la API devuelven datos personales, no los caches y revisa qué cabeceras se registran en el borde.

### Picos estacionales

Matrículas o rebajas multiplican el tráfico unos días al año. La API escala sola; el cuello de botella es la base de datos. Prepara antes del pico: escala vertical programada del primario, réplicas de lectura para las consultas pesadas, un pooler para que cien réplicas de la API no abran miles de conexiones y caché de las respuestas comunes. Y ensaya con una prueba de carga.

### Cliente que exige on-premises

El mismo diseño se monta con open source: Nginx o HAProxy en el borde, Keycloak, PostgreSQL con Patroni, Valkey y OpenBao. Si la API es una imagen de contenedor que lee su configuración de variables de entorno y valida JWT de cualquier emisor OIDC, el código es el mismo en las cuatro columnas del diagrama; lo que cambia es quién opera cada pieza.

## Cómo encaja

El cliente hace dos tipos de petición. Los estáticos (HTML, JS, CSS, imágenes) van a la CDN, que los sirve desde caché y solo acude al almacenamiento cuando expiran. Las llamadas a `/api` van al balanceador, que termina TLS, aplica las reglas del WAF y reparte entre las réplicas de la API. Lo ideal es que ambos caminos compartan dominio: la CDN enruta `/api/*` al balanceador y el navegador no necesita CORS.

La API no gestiona contraseñas: el usuario se autentica contra el proveedor de identidad mediante OIDC (flujo de código con PKCE), y la API solo valida la firma y los claims del JWT con las claves públicas del emisor, que cachea. Consulta primero la caché (sesiones, resultados caros, límites de uso) y después la base de datos. Las credenciales salen del gestor de secretos o, mejor, no existen: con identidad de carga de trabajo la API entra en la base de datos y en la caché con su identidad de plataforma.

Solo la entrada es pública. API, caché, base de datos y secretos viven en red privada, y el origen de la API rechaza tráfico que no venga del balanceador o de la CDN (cabecera secreta de origen, Private Link o entrada restringida).

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Un proxy inverso (Caddy con certificados automáticos, o HAProxy con Coraza) sirve la SPA y enruta `/api` a dos o tres contenedores de la API. Al lado, PostgreSQL con su volumen, Valkey, Keycloak con su propia base de datos y, si hay secretos que rotar, OpenBao. Las copias son lo crítico: pgBackRest o archivado de WAL hacia un almacenamiento S3 externo al host, con una restauración ensayada cada mes. El host es un punto único de fallo.

**Kubernetes on-premises.** k3s o RKE2 con tres nodos, un controlador de entrada (HAProxy Ingress, o Gateway API con Envoy Gateway) con Coraza como WAF, cert-manager para los certificados, el operador de Keycloak y un operador de PostgreSQL: el de Zalando usa Patroni por debajo; CloudNativePG es la alternativa sin Patroni. External Secrets Operator sincroniza desde OpenBao y el HPA escala la API. No uses ingress-nginx en instalaciones nuevas: el proyecto se ha retirado.

**Cloud sin Kubernetes.** Es el diseño del diagrama: ECS Fargate, Container Apps o Cloud Run ejecutan la imagen y escalan solos, y el resto son servicios gestionados. En Azure, la variante más simple deja el WAF en Front Door Premium y llega a Container Apps por Private Link, sin Application Gateway.

**Kubernetes gestionado.** EKS, AKS o GKE compensan cuando ya tienes una plataforma con varios servicios, necesitas sidecars, una malla de servicios o portabilidad exacta con tu on-premises. Usa los modos que gestionan los nodos (EKS Auto Mode, AKS Automatic, GKE Autopilot) si no tienes un equipo de plataforma.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Un host | Media: todo es tuyo | Manual, vertical | MVP, cliente pequeño on-premises |
| Kubernetes on-premises | Tres o más nodos | Alta | HPA dentro del clúster | Exigencia on-premises con HA |
| PaaS de contenedores | Casi nulo; escala a cero | Baja | Automático por peticiones | Opción por defecto en cloud |
| EKS, AKS, GKE | Plano de control y nodos | Media-alta | HPA y autoescalado de nodos | Ya hay plataforma Kubernetes |

## Decisiones clave

- **Contenedores frente a funciones.** Una API con tráfico continuo y conexiones persistentes a la base de datos encaja mejor en contenedores; las funciones brillan con tráfico esporádico pero complican el pool de conexiones.
- **Un dominio o dos.** Enrutar `/api` a través de la CDN evita CORS y unifica el WAF; separar dominios simplifica la caché pero obliga a gestionar orígenes cruzados.
- **IdP gestionado o propio.** Un IdP gestionado ahorra operación; Keycloak da control total sobre flujos y datos a cambio de mantenerlo. Cambiar de IdP después implica migrar usuarios y contraseñas: decide pronto.
- **Base de datos serverless o aprovisionada.** Aurora Serverless v2 o escalar a cero ahorran en dev y con carga irregular; con carga estable, una instancia aprovisionada y reservada sale más barata y más predecible.
- **Caché como optimización, no como dependencia.** Si la API no funciona con la caché caída, la caché se ha convertido en base de datos y necesita sus mismas garantías.

## Errores habituales

- Guardar la sesión en memoria de la réplica: el autoescalado y los despliegues la pierden.
- Abrir la base de datos a Internet «solo para depurar». Va siempre en red privada; para depurar, un bastión o una sesión gestionada.
- Dejar accesible la URL directa del contenedor (`run.app`, la del ALB o la de Container Apps), que permite saltarse el WAF.
- Validar el JWT sin comprobar audiencia y expiración, o consultar al IdP en cada petición.
- Escalar la API sin límite y agotar las conexiones de PostgreSQL: el máximo de réplicas también protege la base de datos.
- No probar nunca una restauración: las copias que no se han restaurado no cuentan.
- Cachear en la CDN respuestas de la API con datos de usuario por una cabecera mal puesta.
