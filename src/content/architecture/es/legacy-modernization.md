---
title: "Modernizar un monolito heredado"
short: "Modernizar un monolito"
summary: "Sacar una aplicación heredada del centro de datos y modernizarla por partes sin un big bang: rehost primero, una fachada que reparte rutas entre el monolito y los servicios nuevos, y CDC para mover los datos sin dobles escrituras."
description: "Modernizar un monolito con rehost, strangler fig, capa anticorrupción y migración de BBDD con CDC y licencias: AWS, Azure, GCP y on-premises."
order: 25
requirements:
  - "El usuario no nota la migración: la fachada mantiene las mismas URLs mientras las rutas cambian de destino."
  - "Cada funcionalidad migrada se puede devolver al monolito cambiando una regla de enrutado."
  - "Cada dato tiene un único sistema que lo escribe en cada momento; nunca se escribe en las dos bases de datos desde la misma petición."
  - "Los servicios nuevos no heredan el modelo del monolito: lo traducen en una capa anticorrupción."
  - "La migración de la base de datos tiene un corte ensayado y un plan de vuelta atrás."
platforms:
  onprem:
    summary: "El monolito sigue en sus VMs (Proxmox o VMware), Nginx o Envoy hacen de fachada por rutas, los servicios nuevos van a Kubernetes con PostgreSQL y Debezium replica los cambios de SQL Server u Oracle."
    notes:
      - "Debezium lee el log de transacciones (CDC de SQL Server, LogMiner u OpenLogReplicator en Oracle) y publica en Kafka; un conector JDBC o tu servicio escriben en PostgreSQL."
      - "En SQL Server hay que activar CDC por base de datos y por tabla, y el job de limpieza tiene que dejar margen para que Debezium no pierda cambios tras una parada."
      - "La subida de precio de VMware tras su compra por Broadcom empuja a muchos a Proxmox: mover las VMs es un rehost en sí mismo, con su propio plan y pruebas."
      - "El coste está en las licencias del motor heredado y en mantener dos plataformas en paralelo durante meses."
  aws:
    summary: "AWS Transform MGN (antes Application Migration Service) hace el rehost a EC2, un ALB con reglas por ruta reparte entre el monolito y ECS Fargate, la base de datos va a RDS for SQL Server y AWS DMS replica con CDC hacia Aurora PostgreSQL."
    notes:
      - "Application Migration Service pasó a llamarse AWS Transform MGN en junio de 2026, con las mismas APIs; la replicación sin agente ya no está disponible para despliegues nuevos, así que cuenta con instalar el agente."
      - "AWS DMS hace carga completa más CDC de SQL Server a Aurora PostgreSQL; DMS Schema Conversion traduce el esquema y señala lo que no convierte. En el origen hay que activar MS-CDC o la replicación de SQL Server."
      - "RDS for SQL Server incluye la licencia en el precio por hora; si tienes licencias con Software Assurance, compara con EC2 y movilidad de licencias antes de decidir."
      - "AWS Transform para .NET porta aplicaciones .NET Framework a .NET multiplataforma para que corran en Linux y contenedores; revisa siempre el resultado y las dependencias nativas de Windows."
      - "Migration Hub dejó de admitir clientes nuevos en noviembre de 2025; la planificación de oleadas y recomendaciones está ahora en AWS Transform."
  azure:
    summary: "Azure Migrate (ahora Azure Catalyst) hace el rehost a Azure VMs, Application Gateway reparte por rutas, la base de datos va a Azure SQL Managed Instance y los servicios nuevos a Container Apps con Azure Database for PostgreSQL."
    notes:
      - "Azure Migrate evoluciona a Azure Catalyst desde noviembre de 2026; los proyectos y flujos existentes siguen funcionando igual."
      - "Azure DMS solo migra SQL Server hacia la familia Azure SQL (Database, Managed Instance, SQL en VM): no hace CDC heterogéneo hacia PostgreSQL. Para eso, Debezium en Container Apps o AKS con el endpoint Kafka de Event Hubs."
      - "Para llegar a Managed Instance con el mínimo corte, el enlace de Managed Instance replica casi en tiempo real; la extensión de migración de Azure Data Studio se retiró en febrero de 2026 junto con la herramienta."
      - "Azure Hybrid Benefit permite usar licencias de Windows Server y SQL Server con Software Assurance en VMs y Managed Instance: suele ser el mayor ahorro de toda la migración."
      - "Managed Instance mantiene compatibilidad casi total con SQL Server (Agent, CLR, consultas entre bases de datos); el tier General Purpose de nueva generación admite más bases de datos y almacenamiento por instancia."
  gcp:
    summary: "Migrate to Virtual Machines hace el rehost a Compute Engine, Cloud Load Balancing reparte por rutas, la base de datos va a Cloud SQL for SQL Server y Database Migration Service replica de forma continua hacia Cloud SQL for PostgreSQL."
    notes:
      - "Database Migration Service hace migraciones heterogéneas continuas de SQL Server y de Oracle a Cloud SQL for PostgreSQL o AlloyDB, con un espacio de conversión del esquema asistido."
      - "Las migraciones homogéneas (SQL Server a Cloud SQL for SQL Server) no tienen coste adicional y parten de copias de seguridad; las heterogéneas se cobran por volumen de datos."
      - "Cloud SQL for SQL Server incluye la licencia en el precio; para traer las tuyas, SQL Server en Compute Engine con movilidad de licencias o en nodos de único inquilino."
      - "Migrate to Virtual Machines replica desde VMware, AWS y Azure; prueba en clones antes del corte, que no afectan a la replicación."
tiers:
  - name: "Rehost"
    when: "Hay que salir del centro de datos con fecha (fin de contrato, hardware sin soporte) y sin tiempo para cambiar código."
    cost: 2
    ops: 2
    onprem: "Mover las VMs de VMware a Proxmox con las mismas aplicaciones y la misma base de datos."
    aws: "AWS Transform MGN a EC2, la base de datos tal cual en EC2 o en RDS for SQL Server y un ALB delante."
    azure: "Azure Migrate a Azure VMs con Azure Hybrid Benefit y la base de datos en Managed Instance."
    gcp: "Migrate to Virtual Machines a Compute Engine y la base de datos en Cloud SQL for SQL Server."
    tradeoffs: "Llevas los problemas de siempre a otro sitio; el ahorro viene de dimensionar bien y de las licencias, no de la arquitectura."
  - name: "Replatform y strangler fig"
    when: "La aplicación tiene futuro y el equipo puede extraer funcionalidades una a una durante meses."
    cost: 3
    ops: 3
    onprem: "Fachada en Nginx o Envoy, servicios nuevos en Kubernetes con PostgreSQL y Debezium replicando desde la base heredada."
    aws: "ALB con reglas por ruta, servicios en ECS Fargate con Aurora PostgreSQL y AWS DMS en CDC continuo."
    azure: "Application Gateway por rutas, Container Apps con Azure Database for PostgreSQL y Debezium sobre Event Hubs."
    gcp: "Cloud Load Balancing por rutas, Cloud Run con Cloud SQL for PostgreSQL y Database Migration Service continuo."
    tradeoffs: "Durante la transición pagas y operas dos sistemas y una tubería de CDC; si el proyecto se para a medias, te quedas con lo peor de los dos."
  - name: "Refactor completo"
    when: "El monolito bloquea el negocio y hay presupuesto para rediseñar dominios, datos e integraciones."
    cost: 4
    ops: 3
    onprem: "Plataforma Kubernetes con bus de eventos, una base de datos por servicio y el monolito retirado por fases."
    aws: "Servicios en ECS o EKS con eventos en EventBridge, bases de datos por servicio y el monolito apagado al final."
    azure: "Container Apps o AKS con Service Bus, bases de datos por servicio y el monolito apagado al final."
    gcp: "Cloud Run o GKE con Pub/Sub, bases de datos por servicio y el monolito apagado al final."
    tradeoffs: "Es el más caro y el más arriesgado; casi siempre conviene llegar aquí por strangler fig, no de golpe."
extensions:
  - name: "Capa anticorrupción"
    when: "Cuando el modelo del monolito no debe contaminar los servicios nuevos."
    cost: "low"
    onprem: "Servicio traductor propio"
    aws: "Servicio traductor en Fargate"
    azure: "Servicio traductor en Container Apps"
    gcp: "Servicio traductor en Cloud Run"
  - name: "Tráfico en sombra"
    when: "Para comparar respuestas del servicio nuevo con el monolito antes de cambiar la ruta."
    cost: "low"
    onprem: "Mirroring de Envoy"
    aws: "Duplicado desde la fachada"
    azure: "Duplicado desde la fachada"
    gcp: "Request mirroring del balanceador"
  - name: "Bus de eventos con outbox"
    when: "Cuando el monolito también tiene que enterarse de lo que escriben los servicios nuevos."
    cost: "medium"
    onprem: "Kafka + Debezium (outbox)"
    aws: "Amazon MSK o EventBridge"
    azure: "Event Hubs o Service Bus"
    gcp: "Pub/Sub"
  - name: "Banderas de funcionalidad"
    when: "Para mover usuarios por porcentaje o por cliente, no todos a la vez."
    cost: "low"
    onprem: "Unleash o Flagsmith"
    aws: "AWS AppConfig"
    azure: "Azure App Configuration"
    gcp: "Firebase Remote Config"
  - name: "Hosting gestionado para .NET Framework"
    when: "Apps web .NET Framework con dependencias de Windows que no compensa portar todavía."
    cost: "medium"
    onprem: "IIS en VMs Windows"
    aws: "Elastic Beanstalk en Windows"
    azure: "Managed Instance en App Service"
    gcp: "Compute Engine con Windows"
  - name: "Validación de datos migrados"
    when: "Antes de cada corte, para comprobar recuentos y sumas entre origen y destino."
    cost: "low"
    onprem: "Comparación con consultas propias"
    aws: "Validación de datos de AWS DMS"
    azure: "Comparación con consultas propias"
    gcp: "Data Validation Tool"
savings:
  - "Aplica Azure Hybrid Benefit o la movilidad de licencias con Software Assurance a Windows Server y SQL Server: la licencia suele pesar más que la infraestructura."
  - "Revisa la edición de SQL Server: muchas bases en Enterprise solo usan funciones de Standard, y el cambio abarata mucho la licencia incluida en RDS, Managed Instance o Cloud SQL."
  - "Dimensiona tras el rehost con datos reales de uso, no con el tamaño de las VMs de origen, que suelen estar sobredimensionadas; después compromete con Savings Plans, reservas o CUD."
  - "Portar .NET Framework a .NET moderno permite pasar a Linux y contenedores y dejar de pagar licencias de Windows en cada instancia."
  - "Apaga cuanto antes lo que ya no recibe tráfico: cada ruta migrada debería reducir réplicas del monolito, no solo sumar servicios nuevos."
  - "Retira la tubería de CDC y la base heredada en cuanto termine la migración de cada dominio: las instancias de replicación y las licencias se siguen pagando."
---

## Cuándo lo necesitas

Cuando hay una aplicación que lleva diez o veinte años funcionando, factura y nadie se atreve a tocar: un ERP a medida, una intranet en .NET Framework sobre IIS, un Java EE en WebLogic con Oracle detrás. Los motivos para moverla suelen ser externos: el contrato del centro de datos vence, el hardware pierde soporte, la renovación de VMware o de Oracle se dispara, o el negocio pide cambios que el monolito no admite a ritmo razonable.

La tentación es reescribirla entera. Casi nunca sale bien: la reescritura tarda años, el original sigue cambiando y el día del corte aparecen reglas que nadie documentó. Este caso describe la alternativa incremental.

## Escenarios

### Salida del centro de datos con fecha

Seis meses para salir. Rehost con la herramienta de migración de la nube (replicación continua de discos, pruebas en clones y corte por oleadas), la base de datos a su servicio gestionado equivalente y nada más. La modernización empieza después, con la presión del plazo ya resuelta. Ganar tiempo es una estrategia legítima.

### Aplicación .NET Framework con SQL Server

El caso más frecuente en empresa. Tres caminos: mantenerla en Windows (VMs o hosting gestionado para .NET Framework), portarla a .NET moderno para contenedores Linux, o extraer funcionalidades a servicios nuevos. Las licencias deciden mucho: con Software Assurance, Azure Hybrid Benefit hace que Azure sea a menudo lo más barato para este perfil.

### Monolito Java con Oracle

Oracle cuenta los vCPU de forma particular en nubes autorizadas y su licencia suele ser la mayor partida. El objetivo habitual es salir de Oracle hacia PostgreSQL: conversión del esquema (PL/SQL es lo que más cuesta), CDC desde Oracle y migración por dominios. Si salir no es viable a corto plazo, las ofertas de Oracle Database dentro de cada nube mantienen el motor cerca de la aplicación.

### Sector regulado o cliente que exige on-premises

La modernización se hace dentro: de VMware a Proxmox o a Kubernetes on-premises, de Oracle a PostgreSQL con Debezium y los servicios nuevos en el clúster. El patrón es el mismo; solo cambia quién opera cada pieza.

## Cómo encaja

Todo el tráfico entra por la fachada, que al principio envía todas las rutas al monolito. El monolito, ya en su nueva plataforma, sigue leyendo y escribiendo en su base de datos heredada.

Cuando se extrae una funcionalidad (por ejemplo, el catálogo), se construye el servicio nuevo con su propia base de datos y una capa anticorrupción que traduce entre el modelo heredado y el nuevo. Mientras el monolito siga siendo quien escribe esos datos, la tubería de CDC lee el log de transacciones de la base heredada y aplica los cambios en la base nueva, de modo que el servicio nuevo puede atender lecturas con datos al día. Cuando el servicio nuevo pasa a ser el dueño del dato, la escritura cambia de lado y, si el monolito todavía lo necesita, recibe los cambios por eventos (outbox) o por CDC en sentido inverso.

Se cambia la regla de la fachada para esa ruta: `/catalogo/*` va al servicio nuevo. Si algo falla, se devuelve la regla. Ruta a ruta, el monolito encoge hasta que se puede apagar. Lo que nunca se hace es que una petición escriba en las dos bases a la vez: sin transacción distribuida, cualquier fallo intermedio deja datos inconsistentes.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Útil para contenerizar el monolito sin cambiar código (si corre en Linux) y para el entorno de desarrollo: el monolito, la fachada con Nginx, Debezium con Kafka en modo KRaft y PostgreSQL. No es la plataforma de producción de una migración de este tamaño.

**Kubernetes on-premises.** RKE2 o k3s con la fachada como Gateway (Envoy Gateway), los servicios nuevos como Deployments, CloudNativePG para PostgreSQL y Strimzi para Kafka y los conectores de Debezium. El monolito puede seguir en VMs o contenerizarse; KubeVirt permite tenerlo en el mismo clúster como VM.

**Cloud sin Kubernetes.** El diseño del diagrama: monolito en VMs migradas, servicios nuevos en ECS Fargate, Container Apps o Cloud Run, y el servicio de migración de datos gestionado. Es lo más rápido de montar.

**Kubernetes gestionado.** EKS, AKS o GKE compensan si el destino final es una plataforma de microservicios y quieres ir construyéndola desde el principio, o si el monolito contenerizado necesita control fino de red y recursos.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Un host | Media | Manual | Desarrollo y pruebas de contenerización |
| Kubernetes on-premises | Clúster | Alta | HPA | Modernización dentro del centro de datos |
| VMs + PaaS de contenedores | VMs del monolito | Media | Por servicio | Opción por defecto en cloud |
| EKS, AKS, GKE | Plano de control y nodos | Media-alta | HPA y nodos | Destino final de microservicios |

## Decisiones clave

- **Rehost, replatform o refactor.** No es una elección única: lo normal es rehost de todo, replatform de la base de datos y refactor solo de lo que el negocio necesita cambiar.
- **Por dónde empezar a estrangular.** Por una funcionalidad con valor, pocas dependencias y datos acotados; nunca por el núcleo más acoplado ni por algo tan trivial que no enseñe nada.
- **Quién escribe cada dato.** Decide el dueño de cada tabla en cada fase y documenta el sentido del CDC. Si dos sistemas escriben lo mismo, tienes un problema de consistencia, no de migración.
- **Motor de destino.** Mantener SQL Server en su servicio gestionado minimiza el riesgo; pasar a PostgreSQL elimina licencias pero exige convertir procedimientos almacenados y probar mucho.
- **Fachada en el balanceador o en un gateway.** Las reglas por ruta del balanceador bastan; un gateway o Envoy aporta tráfico en sombra, reintentos y métricas por ruta.

## Errores habituales

- Escribir en la base vieja y en la nueva desde la misma petición «para mantenerlas sincronizadas».
- Migrar la base de datos al final, con todos los servicios ya construidos sobre el esquema antiguo.
- Copiar el modelo del monolito tal cual en los servicios nuevos, sin capa anticorrupción: un monolito distribuido es peor que el original.
- No ensayar el corte de la base de datos con un volumen real ni medir cuánto tarda.
- Olvidar las integraciones ocultas: ficheros FTP nocturnos, procedimientos que llaman a servicios externos, informes que leen tablas directamente.
- Dejar la migración a medias indefinidamente y pagar dos plataformas, dos equipos y la tubería de CDC durante años.
