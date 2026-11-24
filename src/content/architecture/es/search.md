---
title: "Búsqueda y catálogo"
short: "Búsqueda"
summary: "Un índice de búsqueda desnormalizado, alimentado por captura de cambios desde la base de datos, que da relevancia, facetas, autocompletado y búsqueda híbrida con vectores sin convertirse en una segunda fuente de verdad."
description: "Búsqueda de catálogo con CDC, reindexado sin corte, facetas, sinónimos y búsqueda híbrida con vectores: arquitectura en AWS, Azure, GCP y on-premises."
order: 30
requirements:
  - "La base de datos es la fuente de verdad; el índice se puede reconstruir entero desde ella en cualquier momento."
  - "Un cambio en la base de datos aparece en los resultados en segundos o minutos, según el objetivo acordado, sin escrituras dobles desde la aplicación."
  - "Cambiar el esquema o los analizadores del índice no deja la búsqueda caída ni con resultados a medias."
  - "Los resultados respetan permisos y visibilidad (tenant, publicado, stock) igual que la aplicación."
  - "Se registran consultas, resultados vacíos y clics para medir y ajustar la relevancia."
platforms:
  onprem:
    summary: "La API en Kubernetes consulta OpenSearch (o Meilisearch para catálogos pequeños), Debezium lee el WAL de PostgreSQL y un worker indexa; Valkey cachea consultas y OpenSearch Dashboards muestra la analítica."
    notes:
      - "OpenSearch es Apache 2.0 y lo gobierna la OpenSearch Software Foundation; Elasticsearch también vuelve a tener una licencia open source (AGPL) junto a las propias de Elastic. Elige por funciones y operación, no solo por licencia."
      - "Debezium necesita un slot de replicación lógica: si el conector se para, PostgreSQL retiene WAL hasta llenar el disco. Vigila el retraso del slot y pon un límite a la retención."
      - "Meilisearch y Typesense dan tolerancia a erratas, facetas y buen resultado sin ajustar casi nada; a cambio, menos control sobre analizadores y escalado horizontal más limitado que OpenSearch."
      - "Un clúster de OpenSearch serio son tres nodos con rol de gestor del clúster y discos rápidos; los snapshots a S3 (Ceph RGW) son tu copia de seguridad."
      - "El coste es memoria y disco: el índice con réplicas y vectores puede ocupar varias veces lo que ocupa la tabla original."
  aws:
    summary: "La API en ECS Fargate consulta OpenSearch Service; OpenSearch Ingestion lee Aurora PostgreSQL por replicación lógica y mantiene el índice; ElastiCache cachea y OpenSearch Dashboards muestra la analítica."
    notes:
      - "OpenSearch Ingestion admite Aurora PostgreSQL y RDS para PostgreSQL como origen: exporta una instantánea inicial a S3 y después sigue los cambios. Requiere activar la replicación lógica en el grupo de parámetros."
      - "OpenSearch Service (dominios) cobra por hora de instancia y almacenamiento; Serverless, por unidades de cómputo (OCU) con un mínimo siempre encendido. Serverless no es más barato para un índice pequeño y constante."
      - "Usa tres zonas con nodos gestores dedicados en producción; en desarrollo, un solo nodo pequeño basta."
      - "Accede por VPC y con IAM o control de acceso de grano fino; un dominio con endpoint público y política abierta es una fuga de datos esperando a ocurrir."
      - "OpenSearch admite búsqueda híbrida (BM25 más k-NN) con procesadores de normalización; los embeddings pueden calcularse en la ingesta con conectores a Amazon Bedrock."
  azure:
    summary: "La API en Container Apps consulta Azure AI Search, que Microsoft presenta ahora como Foundry IQ; un worker empuja los cambios de PostgreSQL al índice, Azure Managed Redis cachea y Application Insights registra la analítica."
    notes:
      - "Los indexadores de Azure AI Search no admiten Azure Database for PostgreSQL como origen (sí Azure SQL, Cosmos DB, Blob, OneLake y MySQL en versión preliminar). Con PostgreSQL usa la API push desde un worker alimentado por replicación lógica o Debezium."
      - "Los indexadores se programan como mínimo cada cinco minutos; si necesitas menos latencia, el modelo push es obligatorio igualmente."
      - "Niveles dedicados (Basic, S1–S3, S3 HD, L1–L2) se pagan por unidad de búsqueda y hora, réplicas por particiones; el nivel Serverless se factura por consumo desde septiembre de 2026 y no admite migrar a o desde otros niveles."
      - "El SLA de consultas exige al menos dos réplicas, y el de escritura tres. Una sola réplica es entorno de pruebas."
      - "El ranker semántico y la búsqueda vectorial integrada (vectorización en la ingesta) cubren la búsqueda híbrida sin código propio, con coste adicional por uso."
  gcp:
    summary: "La API en Cloud Run consulta Agent Search (antes Vertex AI Search, hoy dentro de Gemini Enterprise Agent Platform); Datastream y Dataflow llevan los cambios de Cloud SQL al almacén de datos y Memorystore cachea."
    notes:
      - "Google renombró Vertex AI en abril de 2026 a Gemini Enterprise Agent Platform y su producto de búsqueda se llama ahora Agent Search; para comercio electrónico existe AI Commerce Search (antes Vertex AI Search for commerce)."
      - "Agent Search importa desde BigQuery con sincronización periódica de días, desde Cloud SQL o Cloud Storage, o por API documento a documento. Para cambios en minutos, escribe por API desde el pipeline de CDC."
      - "Se paga por consulta y por almacenamiento indexado, sin clúster que dimensionar; a cambio, menos control sobre analizadores, mapeos y puntuación que en OpenSearch o Elasticsearch."
      - "Si necesitas control fino de relevancia, Elastic Cloud desde el Marketplace u OpenSearch en GKE son las alternativas habituales en GCP."
      - "Datastream lleva PostgreSQL a BigQuery con CDC; Dataflow es útil si transformas, pero para un índice sencillo un worker en Cloud Run que lee los cambios es más barato."
tiers:
  - name: "PostgreSQL como buscador"
    when: "Catálogo de miles a cientos de miles de filas, un idioma y un equipo que no quiere otra base de datos."
    cost: 1
    ops: 1
    onprem: "PostgreSQL con `tsvector`, índices GIN, `unaccent` y `pg_trgm` para erratas; pgvector si hace falta semántica. Sin CDC: la columna se actualiza en la misma transacción."
    aws: "Aurora PostgreSQL con búsqueda de texto completo y pgvector, sin servicio adicional."
    azure: "Azure Database for PostgreSQL con búsqueda de texto completo y la extensión vector."
    gcp: "Cloud SQL para PostgreSQL con búsqueda de texto completo y pgvector."
    tradeoffs: "Facetas, sinónimos y autocompletado hay que construirlos a mano y la búsqueda compite por CPU con las transacciones."
  - name: "Motor dedicado con CDC"
    when: "Tienda o portal con facetas, autocompletado y sinónimos, actualizaciones en segundos y miles de búsquedas por minuto."
    cost: 2
    ops: 2
    onprem: "OpenSearch de tres nodos (o Meilisearch en un nodo para catálogos medianos), Debezium con Kafka o NATS y un worker de indexación."
    aws: "OpenSearch Service en dos o tres zonas con OpenSearch Ingestion leyendo Aurora PostgreSQL."
    azure: "Azure AI Search S1 con dos réplicas y un worker que empuja cambios desde PostgreSQL."
    gcp: "Agent Search con un worker de Cloud Run que escribe los cambios por API, o Elastic Cloud desde el Marketplace."
    tradeoffs: "Un sistema más que operar y pagar; consistencia eventual entre la base de datos y lo que se ve en el buscador."
  - name: "Escala e híbrida"
    when: "Catálogos de millones de documentos, varios idiomas, búsqueda semántica con vectores y tráfico alto con picos."
    cost: 4
    ops: 3
    onprem: "OpenSearch con nodos gestores dedicados, nodos de datos separados por índice, embeddings calculados en GPU propia y réplicas de índice en otro CPD."
    aws: "OpenSearch Service con nodos gestores dedicados en tres zonas, instancias optimizadas para memoria para vectores y embeddings vía Bedrock."
    azure: "Azure AI Search S2 o S3 con tres réplicas, vectorización integrada y ranker semántico."
    gcp: "Agent Search o AI Commerce Search con personalización por eventos de usuario, o Elastic Cloud dimensionado para vectores."
    tradeoffs: "Los vectores multiplican memoria y coste; la relevancia ya no se ajusta a ojo y necesita evaluación con conjuntos de consultas."
extensions:
  - name: "Búsqueda híbrida con vectores"
    when: "Cuando los usuarios describen lo que buscan con sus palabras y la coincidencia léxica falla."
    cost: "medium"
    onprem: "k-NN de OpenSearch o pgvector"
    aws: "k-NN de OpenSearch + Bedrock"
    azure: "Vectores + ranker semántico"
    gcp: "Agent Search (semántica integrada)"
  - name: "Personalización por eventos"
    when: "Catálogos donde el orden debe depender del historial y la popularidad, no solo del texto."
    cost: "medium"
    onprem: "Learning to Rank en OpenSearch"
    aws: "Amazon Personalize"
    azure: "Perfiles de puntuación con señales"
    gcp: "AI Commerce Search"
  - name: "Caché de consultas frecuentes"
    when: "Cuando el autocompletado y las páginas de categoría repiten las mismas consultas miles de veces."
    cost: "low"
    onprem: "Valkey"
    aws: "ElastiCache"
    azure: "Azure Managed Redis"
    gcp: "Memorystore"
  - name: "Réplica del índice en otra región"
    when: "Cuando la búsqueda es crítica para vender y no puede depender de una región."
    cost: "high"
    onprem: "Replicación entre clústeres"
    aws: "Replicación entre clústeres"
    azure: "Segundo servicio + indexación doble"
    gcp: "Ubicación multirregión de Agent Search"
  - name: "Cola entre CDC e indexador"
    when: "Para absorber reindexados masivos y no perder cambios si el motor está lento o en mantenimiento."
    cost: "low"
    onprem: "Kafka o NATS JetStream"
    aws: "Amazon MSK o SQS"
    azure: "Event Hubs"
    gcp: "Pub/Sub"
savings:
  - "Empieza con la búsqueda de texto completo de PostgreSQL y añade un motor solo cuando necesites facetas, sinónimos o autocompletado de calidad: es un servicio entero menos."
  - "Indexa solo los campos que se buscan, filtran o muestran en resultados; guardar el documento completo en el índice duplica almacenamiento y memoria."
  - "En OpenSearch Service usa instancias Graviton y reserva las instancias del dominio de producción; en Azure AI Search, escala réplicas por horario si el tráfico es diurno."
  - "Reduce la dimensión o cuantiza los vectores (OpenSearch y Azure AI Search admiten compresión): la memoria es lo que más cuesta en búsqueda híbrida."
  - "Cachea el autocompletado y las páginas de categoría con TTL corto: en servicios que cobran por consulta, como Agent Search, cada acierto de caché es dinero."
  - "Para un índice pequeño y estable, un dominio de OpenSearch Service con una instancia pequeña sale más barato que el mínimo siempre encendido de Serverless."
---

## Cuándo lo necesitas

Cuando un `LIKE '%texto%'` ya no basta: el usuario escribe con erratas, sin tildes, en plural o con sinónimos («portátil» y «laptop»), quiere filtrar por marca, precio y talla mientras ve cuántos resultados hay en cada opción, y espera sugerencias mientras teclea. También cuando el catálogo crece y las consultas de búsqueda empiezan a competir por CPU con las transacciones. Este caso separa la lectura de búsqueda en un índice especializado sin perder la base de datos como fuente de verdad.

## Escenarios

### Producto pequeño o interno

Un buscador de expedientes o un catálogo de unos miles de artículos. PostgreSQL con `tsvector`, el diccionario de español, `unaccent` y `pg_trgm` resuelve el 80 % sin infraestructura nueva y sin consistencia eventual. Meilisearch o Typesense son el siguiente paso si quieres tolerancia a erratas y facetas sin ajustar analizadores.

### Comercio electrónico con picos

Rebajas y campañas multiplican las búsquedas. El índice escala en réplicas para lectura, la caché absorbe autocompletado y páginas de categoría, y el indexador se desacopla con una cola para que una carga masiva de precios no ralentice las consultas. Las facetas y el orden por stock o margen son tan importantes como el texto.

### SaaS multitenant

Cada cliente solo puede ver sus documentos. O bien un índice por tenant (aislamiento sencillo, demasiados índices si hay miles de clientes) o un índice compartido con filtro obligatorio por `tenant_id` aplicado en la API, nunca desde el cliente. Azure AI Search S3 HD está pensado justo para muchos índices pequeños, uno por cliente.

### Búsqueda semántica sobre documentación

Usuarios que preguntan «cómo cancelo un pedido ya enviado» en lugar de escribir palabras clave. Búsqueda híbrida: BM25 para coincidencias exactas (códigos, referencias) y vectores para el significado, combinadas con fusión de rangos. Es la misma base que un RAG, sin el modelo generativo al final.

## Cómo encaja

El usuario escribe en el buscador y aplica filtros; la API traduce eso a una consulta del motor, añadiendo siempre los filtros de permisos y visibilidad. Antes, mira la caché: las consultas más repetidas (prefijos de autocompletado, categorías) se sirven desde ahí con un TTL corto.

El índice no lo escribe la aplicación. Los cambios en la base de datos fuente de verdad se capturan por CDC (replicación lógica de PostgreSQL) y el indexador los convierte en documentos desnormalizados: el producto con el nombre de su marca, su categoría, su precio vigente y su stock, listos para buscar y filtrar sin joins. Si el indexador se cae, retoma desde su posición en el flujo de cambios. Así se evitan las escrituras dobles, que siempre acaban desincronizadas.

Para cambiar el esquema o los analizadores se reindexa sin corte: se crea un índice nuevo, se rellena desde una instantánea de la base de datos, se aplican los cambios acumulados mientras tanto, se compara y se mueve el alias al índice nuevo de forma atómica. El antiguo se conserva unos días para volver atrás.

El motor emite a la analítica las consultas, los resultados vacíos y los clics. Con eso se ajustan sinónimos, pesos de campos y reglas de negocio, y se detectan las búsquedas que no encuentran nada.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** La API, PostgreSQL, Meilisearch u OpenSearch de un nodo con su volumen, Valkey y, si hay CDC, Debezium Server escribiendo directamente al indexador o a NATS. Los snapshots del índice son opcionales si puedes reconstruirlo desde la base de datos en un tiempo aceptable; mide ese tiempo.

**Kubernetes on-premises.** k3s o RKE2 con el OpenSearch Kubernetes Operator (o ECK si eliges Elasticsearch), CloudNativePG con replicación lógica habilitada, Strimzi para Kafka y Kafka Connect con Debezium, y KEDA escalando el indexador por retraso de consumo. Afinidad para repartir nodos de datos entre hosts y almacenamiento local rápido.

**Cloud sin Kubernetes.** La API en Fargate, Container Apps o Cloud Run, el motor gestionado (OpenSearch Service, Azure AI Search, Agent Search) y el CDC gestionado donde exista (OpenSearch Ingestion) o un worker pequeño donde no.

**Kubernetes gestionado.** EKS, AKS o GKE compensan si quieres el mismo OpenSearch o Elasticsearch que on-premises, controlar versiones y plugins, o evitar el coste de un servicio de búsqueda gestionado con mucho volumen. A cambio, operas un sistema con estado.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Un host | Media | Vertical | Catálogo pequeño o mediano |
| Kubernetes on-premises | Tres o más nodos | Alta | Nodos y réplicas | Exigencia on-premises |
| Motor gestionado | Instancias o consumo | Baja | Réplicas o automático | Opción por defecto en cloud |
| EKS, AKS, GKE | Plano de control y nodos | Alta | Operador | Control total del motor |

## Decisiones clave

- **PostgreSQL o motor dedicado.** Mientras la búsqueda sea una función secundaria, PostgreSQL evita consistencia eventual y otro sistema. El motor se justifica por relevancia, facetas, idiomas y volumen.
- **CDC o eventos de dominio.** El CDC captura todo cambio, incluso los que no pasan por la aplicación; los eventos de dominio llevan intención y datos ya preparados. Muchos equipos combinan ambos: CDC como garantía y eventos para enriquecer.
- **Gestionado de alto nivel o motor configurable.** Agent Search o Azure AI Search con ranker semántico dan buen resultado rápido; OpenSearch o Elasticsearch dan control total de analizadores, puntuación y coste a cambio de trabajo.
- **Índice por tenant o compartido.** Aislamiento y borrado sencillo frente a número de índices y coste fijo.
- **Vectores sí o no.** Añaden comprensión semántica, pero también memoria, latencia y un modelo de embeddings que versionar. Empieza léxico, mide y añade vectores donde falle.

## Errores habituales

- Escribir en la base de datos y en el índice desde la aplicación: al primer fallo parcial quedan desincronizados para siempre.
- Tratar el índice como fuente de verdad y no poder reconstruirlo.
- Cambiar el mapeo sobre el índice en producción en lugar de reindexar tras un alias.
- Aplicar los filtros de permisos en el frontend.
- Un slot de replicación lógica abandonado que llena el disco de PostgreSQL.
- Ajustar la relevancia sin un conjunto de consultas de referencia: cada mejora rompe otra búsqueda sin que nadie lo note.
- Ignorar las búsquedas sin resultados, que son la lista de tareas de sinónimos y catálogo.
