---
title: "Lakehouse de datos con Iceberg"
short: "Lakehouse de datos"
summary: "Reunir datos de bases operacionales, APIs y ficheros en un único almacén abierto por capas (bronce, plata, oro), con catálogo y permisos centralizados, para que analistas y BI consulten con SQL sin copiar datos entre sistemas."
description: "Lakehouse con ingesta CDC, capas bronce/plata/oro en Iceberg, catálogo, dbt y motor SQL: arquitectura de referencia en AWS, Azure, GCP y on-premises."
order: 10
requirements:
  - "Los datos de origen llegan sin cargar la base operacional y con historial de cambios (CDC)."
  - "Las tablas se guardan en un formato abierto (Iceberg) que varios motores pueden leer y escribir."
  - "Cada capa (bronce, plata, oro) tiene dueño, pruebas de calidad y linaje."
  - "Los permisos se definen una vez en el catálogo y se aplican a todos los motores, incluidas columnas sensibles."
  - "Las transformaciones son código versionado, reproducible y orquestado con reintentos."
  - "El coste de consulta es predecible: particionado, compactación y límites por equipo."
platforms:
  onprem:
    summary: "Airbyte y Debezium cargan en tablas Iceberg sobre Ceph RGW; Spark y dbt construyen plata y oro, Trino consulta, Superset presenta y Airflow o Dagster orquestan."
    notes:
      - "Hive Metastore sigue funcionando como catálogo, pero no gestiona permisos: hoy un catálogo REST de Iceberg (Lakekeeper, Apache Polaris o Nessie) es mejor punto de partida, y los permisos los pone ese catálogo o Ranger/OPA en Trino."
      - "La compactación y la expiración de snapshots de Iceberg son tareas tuyas: prográmalas en el orquestador o el lago se llena de ficheros pequeños y metadatos huérfanos."
      - "Trino escala horizontalmente para consultas concurrentes; DuckDB basta para un analista o para pruebas locales sobre las mismas tablas."
      - "El coste es hardware fijo (discos de Ceph y nodos de cómputo) y, sobre todo, el equipo que opera cinco o seis sistemas distintos."
  aws:
    summary: "DMS y Glue cargan en S3 Tables (Iceberg gestionado); Glue Spark con dbt transforma, Lake Formation gobierna permisos, Athena consulta, Quick Sight presenta y MWAA orquesta."
    notes:
      - "S3 Tables guarda tablas Iceberg en buckets de tablas y hace la compactación, la gestión de snapshots y el borrado de ficheros no referenciados por ti; expone un catálogo REST de Iceberg y se integra con Glue Data Catalog."
      - "Desde 2026 Glue Data Catalog admite autorización solo con IAM sobre S3 Tables; Lake Formation sigue siendo la opción para permisos por columna, fila o etiqueta."
      - "QuickSight es ahora Quick Sight, el componente de BI de la suite Amazon Quick; paneles y datasets existentes se mantienen."
      - "MWAA cobra por entorno aprovisionado aunque no ejecute nada; MWAA Serverless (desde noviembre de 2025) paga por uso pero solo admite operadores del paquete de proveedor de Amazon."
      - "Athena cobra por datos escaneados: particiona por fecha, usa Parquet comprimido y configura grupos de trabajo con límite por consulta."
  azure:
    summary: "Data Factory ingiere en OneLake, Fabric Spark con dbt transforma, Purview cataloga y clasifica, Fabric Warehouse consulta con T-SQL, Power BI presenta y Fabric Data Factory orquesta."
    notes:
      - "OneLake guarda las tablas en Delta Lake de forma nativa; Iceberg llega por virtualización de metadatos (accesos directos a tablas Iceberg y, en preview, exponer Delta como Iceberg), no como formato primario."
      - "Para CDC desde bases de datos, el mirroring de Fabric replica casi en tiempo real en OneLake sin pipelines; Data Factory encaja mejor con APIs y ficheros."
      - "Fabric Data Factory combina pipelines y trabajos de Apache Airflow; los trabajos de Airflow no admiten todavía redes privadas ni VNet."
      - "Todo Fabric se paga por capacidad (F SKU) compartida entre Spark, Warehouse y Power BI: un notebook pesado puede ralentizar los informes si no separas capacidades."
  gcp:
    summary: "Datastream replica cambios a Cloud Storage o BigQuery, Dataproc con dbt transforma tablas Iceberg gestionadas por BigLake, Dataplex gobierna, BigQuery consulta, Looker presenta y Cloud Composer orquesta."
    notes:
      - "En abril de 2026 Google renombró BigLake a Google Cloud Lakehouse (su metastore es ahora el Lakehouse runtime catalog) y Dataplex a Knowledge Catalog; APIs, roles IAM y comandos mantienen los nombres antiguos."
      - "El catálogo expone la API REST de Iceberg: Spark en Dataproc y BigQuery leen y escriben las mismas tablas con las mismas políticas."
      - "BigQuery cobra por bytes escaneados (on-demand) o por slots reservados; con equipos de analistas grandes, las reservas con autoescalado hacen el coste predecible."
      - "Cloud Composer tiene coste fijo por entorno; Dataproc Serverless evita mantener clústeres de Spark encendidos entre ejecuciones."
tiers:
  - name: "Almacén de un equipo"
    when: "Un equipo de datos pequeño, decenas de GB a pocos TB y paneles que se refrescan una vez al día."
    cost: 1
    ops: 1
    onprem: "Un host con Docker Compose: MinIO o Ceph RGW, catálogo REST (Lakekeeper), DuckDB o un Trino de un nodo, dbt-core por cron y Superset."
    aws: "Glue o DMS a S3 Tables, dbt sobre Athena, programación con EventBridge Scheduler y Quick Sight."
    azure: "Capacidad Fabric pequeña con mirroring, notebooks y dbt sobre Warehouse, y Power BI incluido en la capacidad."
    gcp: "Datastream a BigQuery, dbt sobre BigQuery on-demand y Looker Studio, sin clústeres de Spark."
    tradeoffs: "Sin orquestador completo ni Spark: las transformaciones complejas o muy grandes se hacen en SQL y el linaje es más pobre."
  - name: "Lakehouse por capas"
    when: "Varios equipos, fuentes con CDC, varios TB y necesidad de permisos por columna y linaje."
    cost: 2
    ops: 2
    onprem: "Kubernetes con Spark Operator, Trino, Airflow o Dagster, catálogo REST de Iceberg y Ceph RGW en clúster."
    aws: "El diseño del diagrama: DMS/Glue, S3 Tables, Lake Formation, Glue Spark con dbt, Athena, MWAA y Quick Sight."
    azure: "El diseño del diagrama sobre una capacidad Fabric dimensionada, Purview para clasificación y linaje, y Airflow en Fabric."
    gcp: "El diseño del diagrama: Datastream, Lakehouse con Iceberg, Dataproc Serverless con dbt, BigQuery con reservas y Composer."
    tradeoffs: "Más piezas y más perfiles necesarios (ingeniería de datos y plataforma); el coste fijo del orquestador y del catálogo aparece aunque haya poca carga."
  - name: "Plataforma de datos corporativa"
    when: "Muchos dominios, datos regulados, consumidores de IA y BI con SLA y equipos en varias regiones."
    cost: 4
    ops: 3
    onprem: "Varios clústeres de Trino por carga de trabajo, Ranger u OPA para permisos, Ceph replicado entre sedes y un equipo de plataforma dedicado."
    aws: "Cuentas por dominio con Lake Formation y compartición entre cuentas, Redshift para cargas de BI intensas sobre las mismas tablas Iceberg y MWAA por dominio."
    azure: "Varias capacidades Fabric por dominio, dominios de OneLake, Purview con etiquetas de sensibilidad y capacidad reservada."
    gcp: "Proyectos por dominio con Knowledge Catalog, BigQuery con reservas por equipo, Analytics Hub para compartir y Composer regional."
    tradeoffs: "El reto deja de ser técnico y pasa a ser de gobierno: contratos de datos, dueños por dominio y FinOps por equipo."
extensions:
  - name: "Ingesta en streaming"
    when: "Cuando los paneles o modelos necesitan datos de minutos, no del día anterior."
    cost: "medium"
    onprem: "Kafka + Flink"
    aws: "Data Firehose a tablas Iceberg"
    azure: "Eventstream de Fabric"
    gcp: "Pub/Sub a BigQuery"
  - name: "Calidad de datos y contratos"
    when: "Cuando un cambio en origen rompe paneles y nadie lo detecta hasta que lo ve negocio."
    cost: "low"
    onprem: "dbt tests + Great Expectations"
    aws: "Glue Data Quality"
    azure: "Purview Data Quality"
    gcp: "Knowledge Catalog data quality"
  - name: "Capa semántica"
    when: "Cuando cada panel calcula «ingresos» de forma distinta."
    cost: "low"
    onprem: "Cube o dbt Semantic Layer"
    aws: "Temas de Quick Sight"
    azure: "Modelos semánticos de Power BI"
    gcp: "LookML en Looker"
  - name: "Almacén para BI intensivo"
    when: "Cuando cientos de usuarios concurrentes hacen que el motor ad hoc sea lento o caro."
    cost: "high"
    onprem: "ClickHouse o StarRocks"
    aws: "Amazon Redshift Serverless"
    azure: "Fabric Warehouse en capacidad propia"
    gcp: "BigQuery BI Engine"
  - name: "Datos compartidos con terceros"
    when: "Cuando socios o filiales necesitan consultar sin recibir copias."
    cost: "low"
    onprem: "Delta Sharing o vistas en Trino"
    aws: "Lake Formation entre cuentas"
    azure: "Accesos directos de OneLake"
    gcp: "BigQuery sharing (Analytics Hub)"
savings:
  - "Activa la compactación y la expiración de snapshots (automática en S3 Tables, programada en Iceberg propio): menos ficheros pequeños es menos coste de lectura y de peticiones."
  - "En Athena y BigQuery on-demand, particiona por fecha, pide solo las columnas necesarias y fija un límite de bytes por consulta o por grupo de trabajo."
  - "Ejecuta Spark en modo serverless o en instancias Spot/preemptibles (Glue Flex, Dataproc Serverless, EMR en Spot) para cargas por lotes que toleran reintentos."
  - "Pausa la capacidad Fabric de desarrollo fuera de horario y reserva la de producción si su uso es estable."
  - "Mueve bronce antiguo a clases de almacenamiento frías (S3 Intelligent-Tiering, niveles cool/archive de Blob, Autoclass en Cloud Storage) una vez que plata y oro son reconstruibles."
  - "Valora MWAA Serverless o Cloud Composer pequeño solo si tus DAG lo justifican; con pocas tareas diarias, un programador nativo (EventBridge Scheduler, Cloud Scheduler) cuesta casi nada."
---

## Cuándo lo necesitas

Cuando las preguntas de negocio cruzan datos de varios sistemas y la respuesta actual es una exportación a Excel o consultas directas contra la base de producción. Un lakehouse aparece cuando tienes varias fuentes (ERP, aplicación propia, CRM, ficheros de socios), varios consumidores (BI, ciencia de datos, modelos de IA) y la necesidad de que todos lean la misma versión de los datos con los mismos permisos.

Si todo cabe en una base PostgreSQL de analítica y un solo equipo la usa, no lo necesitas todavía. El salto merece la pena cuando el volumen, la variedad de motores o el gobierno (quién ve qué columna) superan lo que un almacén único resuelve con comodidad.

## Escenarios

- **Startup con un analista.** Datastream, DMS o el mirroring de Fabric copian la base de producción a un almacén gestionado, dbt construye diez modelos y un panel se refresca cada noche. No hay Spark ni Airflow: dbt y el programador nativo bastan. Iceberg sigue mereciendo la pena porque evita quedarte atado a un motor cuando crezcas.
- **Empresa regulada con datos personales en la UE.** El catálogo es la pieza central: clasificación automática de columnas sensibles, enmascaramiento por rol y linaje para responder a auditorías. Todo en una región de la UE, cifrado con claves propias, y la capa bronce con retención limitada porque contiene datos sin seudonimizar.
- **Retail con picos estacionales.** La ingesta pasa a streaming en campañas y el motor SQL necesita más concurrencia durante unas semanas. Los motores serverless (Athena, BigQuery on-demand) absorben el pico sin reservar; en Fabric hay que subir la capacidad temporalmente.
- **Cliente que exige on-premises.** Mismo diseño con piezas abiertas: Iceberg sobre almacenamiento S3 compatible, catálogo REST, Spark y Trino en Kubernetes. Lo que cambia es que compactación, actualizaciones y capacidad dependen de tu equipo.
- **Equipo de IA que necesita features y texto.** Las tablas oro alimentan el feature store y los pipelines de entrenamiento; los documentos van a otro índice. El lakehouse es la fuente de verdad, no el lugar donde se sirven predicciones.

## Cómo encaja

Las fuentes entregan datos a la capa de ingesta. Para bases de datos, la ingesta es CDC: lee el log de transacciones y emite inserciones, cambios y borrados sin consultas pesadas contra producción. Para APIs y ficheros, son extracciones programadas e incrementales.

Todo aterriza en la capa **bronce** del lago, en tablas Iceberg: datos tal cual llegaron, con metadatos de carga. El catálogo registra cada tabla, su esquema y sus permisos; cualquier motor que lea o escriba pasa por él.

La transformación (Spark para volumen, dbt para la lógica en SQL) lee bronce y construye **plata** (datos limpios, deduplicados y con tipos correctos) y después **oro** (modelos de negocio listos para consumir: ventas por día, clientes activos). El orquestador lanza esas transformaciones en orden, con dependencias, reintentos y alertas; también lanza el mantenimiento de las tablas.

El motor SQL consulta las tablas del lago directamente, sin copiarlas, y la herramienta de BI se conecta a ese motor. Los permisos que el catálogo define (tabla, columna, fila) se aplican tanto al analista que lanza SQL como al panel.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Sirve para un equipo pequeño o para un entorno de desarrollo: MinIO como almacenamiento S3, Lakekeeper como catálogo REST de Iceberg con su PostgreSQL, un Trino de un nodo o DuckDB, Superset detrás de un proxy inverso (Caddy o Traefik con TLS) y dbt ejecutado por cron. Los volúmenes de MinIO y PostgreSQL son lo único con estado: haz copia del bucket a otro destino y `pg_dump` del catálogo, porque sin el catálogo las tablas no se pueden leer de forma coherente.

**Kubernetes on-premises (k3s o RKE2).** Para varios equipos: Spark Operator para trabajos de Spark, Trino con su chart oficial y autoescalado de workers, Airflow o Dagster con sus charts, CloudNativePG para las bases del catálogo y del orquestador, cert-manager para TLS y Ceph (Rook) como almacenamiento de objetos. KEDA puede escalar los workers de Trino según la cola de consultas.

**Cloud sin Kubernetes.** Es la opción por defecto en cloud: S3 Tables, Glue y Athena; OneLake y Fabric; Lakehouse de Google y BigQuery. No hay servidores; pagas por datos escaneados, por DPU o por capacidad. dbt puede ejecutarse en una tarea de ECS Fargate, Container Apps Jobs o Cloud Run jobs.

**Kubernetes gestionado (EKS, AKS, GKE).** Compensa si ya tienes una plataforma Kubernetes y quieres Trino o Spark propios por coste o por portabilidad, leyendo las mismas tablas Iceberg del catálogo gestionado.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Muy bajo | Media | Un host | Equipo pequeño, desarrollo |
| Kubernetes on-prem | Alto | Alta | Horizontal | Soberanía o cliente on-prem |
| Cloud serverless | Bajo o por capacidad | Baja | Automático | Opción por defecto |
| Kubernetes gestionado | Medio | Media | Horizontal | Plataforma K8s existente, portabilidad |

## Decisiones clave

- **Formato abierto o almacén propietario.** Iceberg permite cambiar de motor sin migrar datos; un almacén cerrado da mejor rendimiento sin esfuerzo. En Azure, OneLake es Delta de forma nativa e Iceberg llega por virtualización: elige pensando en qué motores leerán.
- **Catálogo gestionado o propio.** El catálogo es el punto único de permisos. Uno gestionado (Lake Formation, Purview, Knowledge Catalog) evita operar la pieza más crítica; uno propio da portabilidad.
- **ETL en Spark o ELT en SQL con dbt.** dbt con SQL lo mantienen analistas y tiene pruebas y linaje; Spark hace falta para volúmenes grandes, datos semiestructurados o lógica que no cabe en SQL.
- **Pago por consulta o por capacidad.** Athena y BigQuery on-demand son baratos con uso esporádico y caros con uso intensivo; Fabric o las reservas de BigQuery dan coste fijo predecible.
- **Orquestador completo o programador simple.** Airflow da dependencias, reintentos y backfills; para cinco tareas diarias es sobredimensionado.

## Errores habituales

- Leer de la base de producción con consultas de extracción completas en lugar de CDC, y degradar la aplicación cada noche.
- No compactar ni expirar snapshots: las consultas se vuelven lentas y el almacenamiento crece sin control.
- Dar permisos en el almacenamiento (bucket) en lugar de en el catálogo, con lo que cada motor aplica reglas distintas.
- Transformaciones sin pruebas que propagan nulos o duplicados hasta el panel del comité de dirección.
- Exponer bronce a los analistas «porque tiene todos los datos», incluidos los personales.
- Dejar el entorno de orquestación o la capacidad de desarrollo encendidos todo el mes sin uso.
