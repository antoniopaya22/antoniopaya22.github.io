---
title: "Recuperación ante desastres entre regiones"
short: "Recuperación (DR)"
summary: "Seguir dando servicio, o volver a darlo en un tiempo pactado, cuando cae una región entera o alguien cifra o borra los datos: réplica entre regiones, failover de tráfico, copias inmutables en otra cuenta y ensayos periódicos."
description: "Recuperación ante desastres con RPO/RTO, warm standby, réplica entre regiones, copias inmutables y failover de DNS en AWS, Azure, GCP y on-premises."
order: 19
requirements:
  - "El RPO (datos que se pueden perder) y el RTO (tiempo sin servicio) están acordados con negocio y escritos por sistema."
  - "La base de datos se replica a otra región y la promoción de la réplica está documentada y automatizada."
  - "El tráfico cambia de región con una acción explícita o automática, sin depender del plano de control de la región caída."
  - "Existen copias inmutables en otra cuenta o suscripción que ni un administrador comprometido puede borrar."
  - "El failover y la vuelta atrás se ensayan con regularidad y se mide el RTO real."
platforms:
  onprem:
    summary: "PowerDNS con comprobaciones de salud dirige el tráfico al centro principal; PostgreSQL replica por streaming al secundario, que mantiene Kubernetes en caliente con menos réplicas, y restic guarda copias en almacenamiento con bloqueo WORM."
    notes:
      - "Patroni admite un standby cluster en el segundo centro que se promociona con un comando; sin él, la promoción manual de PostgreSQL bajo presión es donde más se falla."
      - "Los registros LUA de PowerDNS (por ejemplo, `ifurlup`) devuelven solo las IP que responden; baja el TTL a 60 segundos o menos en los nombres que deben cambiar rápido."
      - "Para la inmutabilidad, usa un bucket con Object Lock en modo compliance (Ceph RGW o MinIO) y alinea la poda de restic con la retención, o los borrados fallarán."
      - "El segundo centro es coste fijo completo: hardware, licencias, energía y conectividad, aunque solo reciba tráfico en un desastre."
  aws:
    summary: "Route 53 ARC dirige el tráfico a ECS Fargate en la región primaria y cambia a la secundaria; Aurora Global Database replica entre regiones y AWS Backup copia snapshots a un vault con Vault Lock en otra cuenta."
    notes:
      - "Region switch de ARC (desde agosto de 2025) define planes con pasos ordenados: escalar ECS en la secundaria, hacer switchover o failover de Aurora Global Database y cambiar el DNS; se paga por plan y mes."
      - "Aurora Global Database replica a nivel de almacenamiento con un retraso típico por debajo del segundo; el switchover planificado no pierde datos y el failover no planificado acepta perder lo no replicado."
      - "Los controles de enrutamiento de ARC se cambian a través de un plano de datos repartido en varias regiones, sin depender de la consola ni de la región caída."
      - "Vault Lock en modo compliance impide borrar puntos de recuperación incluso a root; un vault lógicamente aislado (logically air-gapped) lo trae activado y admite compartir con aprobación multiparte."
      - "El coste del warm standby es la réplica de Aurora (instancias y E/S de escritura replicada) y las tareas mínimas en la secundaria."
  azure:
    summary: "Azure Front Door envía el tráfico a Container Apps en la región primaria y cambia de origen si las sondas fallan; PostgreSQL Flexible Server replica a una réplica geo y Azure Backup guarda copias en un vault inmutable bloqueado."
    notes:
      - "Front Door no es DNS: es un proxy global L7 con grupos de origen por prioridad y sondas de salud. Para tráfico que no es HTTP, Traffic Manager hace el failover por DNS."
      - "Las réplicas de lectura entre regiones de PostgreSQL Flexible Server son asíncronas; los virtual endpoints mantienen el mismo nombre de conexión después de promocionar."
      - "La promoción puede ser planificada (espera a sincronizar) o forzada (inmediata, con posible pérdida de datos); después hay que recrear la réplica para volver a tener protección."
      - "Un vault inmutable en estado bloqueado es irreversible, ni el propietario de la suscripción puede desactivarlo; combínalo con borrado temporal y autorización multiusuario."
      - "Comprueba que todo lo que necesitas existe en la región secundaria: cuotas, SKU, Key Vault replicado e identidades gestionadas."
  gcp:
    summary: "Una política de failover de Cloud DNS con comprobaciones de salud apunta a Cloud Run en la región primaria; Cloud SQL tiene una réplica entre regiones y Backup and DR guarda copias en un backup vault con retención forzada."
    notes:
      - "Las comprobaciones de salud de endpoints públicos solo funcionan en zonas públicas de Cloud DNS y exigen desactivar la restricción `compute.disableInternetNetworkEndpointGroup` de la organización."
      - "Para HTTP, un balanceador de aplicaciones externo global con backends en dos regiones hace el failover sin depender del TTL del DNS."
      - "Cloud SQL Enterprise Plus ofrece DR avanzada: réplica de DR designada, switchover sin pérdida de datos, failover de réplica y un endpoint de escritura que sigue al primario."
      - "Los backup vaults son inmutables y no permiten borrar antes de la retención forzada; pueden estar en otro proyecto, y desde el 1 de noviembre de 2026 Google aplica un lien al proyecto que los contiene."
      - "El coste del standby es la réplica de Cloud SQL encendida y las instancias mínimas de Cloud Run que mantengas calientes en la secundaria."
tiers:
  - name: "Copia y restauración"
    when: "Sistemas internos que toleran horas sin servicio y perder hasta el último backup."
    cost: 1
    ops: 1
    onprem: "Copias diarias con restic a un bucket con Object Lock en otro edificio y un procedimiento escrito para reconstruir desde cero."
    aws: "AWS Backup con copia a otra región y a otra cuenta con Vault Lock, e infraestructura como código para levantar la secundaria al vuelo."
    azure: "Azure Backup con vault inmutable y restauración entre regiones, e infraestructura como código para la región secundaria."
    gcp: "Backup and DR con backup vault en otra región y proyecto, e infraestructura como código para recrear el entorno."
    tradeoffs: "RTO de horas: hay que crear red, cómputo y base de datos y restaurar. Es el mínimo que todo sistema debería tener, incluso con los demás niveles."
  - name: "Warm standby"
    when: "Aplicaciones de negocio con RTO de minutos y RPO de segundos."
    cost: 3
    ops: 2
    onprem: "Segundo centro con Kubernetes reducido, standby cluster de Patroni y PowerDNS con comprobaciones, como en el diagrama."
    aws: "El diseño del diagrama: ECS mínimo en la secundaria, Aurora Global Database, plan de Region switch y Vault Lock."
    azure: "El diseño del diagrama: Container Apps en dos regiones, réplica geo con virtual endpoints, Front Door y vault inmutable."
    gcp: "El diseño del diagrama: Cloud Run en dos regiones, Cloud SQL con DR avanzada, failover de DNS o balanceador global y backup vault."
    tradeoffs: "Pagas una segunda región siempre encendida aunque reducida; el escalado de la secundaria al recibir todo el tráfico debe estar probado."
  - name: "Activo-activo"
    when: "Servicios críticos que no admiten minutos sin servicio y tienen usuarios en varias regiones."
    cost: 4
    ops: 3
    onprem: "Dos centros sirviendo a la vez con una base de datos distribuida (por ejemplo, CockroachDB o YugabyteDB) o particionando usuarios por centro."
    aws: "Tráfico en ambas regiones con enrutamiento por latencia, DynamoDB global tables o Aurora DSQL para datos multirregión, y ARC para sacar una región."
    azure: "Front Door repartiendo entre regiones y Cosmos DB con escrituras multirregión para los datos que lo necesiten."
    gcp: "Balanceador global con backends en varias regiones y Spanner multirregional para los datos compartidos."
    tradeoffs: "Coste y complejidad máximos: conflictos de escritura, consistencia y pruebas mucho más exigentes. Solo merece la pena para una parte del sistema."
extensions:
  - name: "Orquestación del failover"
    when: "Cuando el failover son más de tres pasos y no se puede depender de que alguien los recuerde a las tres de la mañana."
    cost: "low"
    onprem: "Runbook en Ansible o Argo Workflows"
    aws: "ARC Region switch"
    azure: "Runbooks de Automation"
    gcp: "Workflows + Cloud Build"
  - name: "Recuperación de máquinas virtuales"
    when: "Cuando parte del sistema son VM heredadas que no se reconstruyen con código."
    cost: "medium"
    onprem: "Réplica de VM del hipervisor"
    aws: "AWS Elastic Disaster Recovery"
    azure: "Azure Site Recovery"
    gcp: "Backup and DR (VM de Compute Engine)"
  - name: "Datos de objetos replicados"
    when: "Cuando ficheros subidos por usuarios forman parte del servicio y deben existir en la secundaria."
    cost: "medium"
    onprem: "Replicación multisitio de Ceph RGW"
    aws: "S3 Cross-Region Replication"
    azure: "Almacenamiento GRS o RA-GRS"
    gcp: "Bucket de doble región o multirregión"
  - name: "Secretos y claves en ambas regiones"
    when: "Siempre que los datos estén cifrados con claves propias: sin la clave, la copia no sirve."
    cost: "low"
    onprem: "Vault con replicación DR"
    aws: "Claves KMS multirregión"
    azure: "Key Vault con réplica de región"
    gcp: "Claves de Cloud KMS multirregión"
  - name: "Ensayos de caos"
    when: "Cuando quieres comprobar que el failover funciona antes de necesitarlo."
    cost: "low"
    onprem: "Chaos Mesh o LitmusChaos"
    aws: "AWS Fault Injection Service"
    azure: "Azure Chaos Studio"
    gcp: "Chaos Mesh en GKE"
savings:
  - "Clasifica los sistemas por RPO/RTO y aplica warm standby o activo-activo solo a los que lo exigen; el resto queda en copia y restauración."
  - "En la región secundaria mantén el cómputo al mínimo (una tarea de ECS, réplicas mínimas de Container Apps o Cloud Run) y escala al hacer failover, con el escalado probado."
  - "Usa clases de almacenamiento frías para copias antiguas (niveles cold de AWS Backup, nivel de archivo de Azure Backup) y una retención acorde a la normativa, no indefinida."
  - "Elimina snapshots manuales huérfanos y copias duplicadas entre herramientas: suelen ser una parte notable del coste de backup."
  - "Reserva o compra capacidad comprometida solo para la región primaria; en la secundaria, la capacidad bajo demanda suele salir más barata mientras esté reducida."
  - "Ensaya con entornos efímeros creados por infraestructura como código y destrúyelos al terminar en lugar de mantener un entorno de pruebas de DR permanente."
---

## Cuándo lo necesitas

Cuando la pregunta «¿qué pasa si cae la región?» o «¿qué pasa si un ransomware cifra la base de datos y los backups?» no tiene una respuesta concreta con tiempos. La alta disponibilidad dentro de una región (varias zonas, réplicas síncronas) cubre fallos de un servidor o de un centro de datos; la recuperación ante desastres cubre lo que la alta disponibilidad no puede: una región entera caída, un error de configuración propagado o un atacante con permisos de administrador.

El punto de partida son dos números por sistema. El **RPO** es cuánto dato se puede perder (cero, segundos, una hora, un día). El **RTO** es cuánto tiempo puede estar sin servicio. Esos números los decide negocio con el coste delante, no el equipo técnico por su cuenta.

## Escenarios

- **Startup con una sola región.** Copia y restauración bien hechas: backups automáticos, copia a otra región y otra cuenta con bloqueo, e infraestructura como código capaz de levantar todo en otra región. Un ensayo al trimestre. Es barato y cubre el riesgo más probable, que no es la caída de una región sino el borrado accidental.
- **Comercio electrónico con RTO de minutos.** Warm standby: la región secundaria tiene la aplicación desplegada con capacidad mínima y la base de datos replicada. El failover es un plan que escala la secundaria, promociona la base y mueve el tráfico.
- **Empresa regulada (banca, sanidad, DORA o NIS2).** Además del warm standby, copias inmutables en una cuenta aislada gestionada por otro equipo, pruebas documentadas con el RTO medido y un plan de salida del proveedor. Las regiones elegidas deben estar en la UE.
- **Ataque de ransomware.** La réplica no ayuda: replica el cifrado o el borrado en segundos. Lo que salva es la copia inmutable en otra cuenta, con retención mínima que nadie puede acortar, y un entorno limpio donde restaurar.
- **Cliente on-premises con un solo centro.** El segundo sitio puede ser una nube pública como destino de copias y de recuperación, si el contrato lo permite, en lugar de un segundo centro propio.

## Cómo encaja

Los usuarios resuelven el nombre del servicio a través de una capa de enrutamiento global (DNS con comprobaciones o un proxy global). En condiciones normales envía todo el tráfico a la región primaria.

La región primaria ejecuta la aplicación contra la base de datos primaria. Esa base replica de forma **asíncrona** a una réplica en la región secundaria: asíncrona porque la síncrona entre regiones añadiría la latencia de ida y vuelta a cada escritura. Por eso el RPO del failover no planificado es el retraso de replicación en ese momento, normalmente segundos.

La región secundaria tiene la aplicación desplegada con la misma versión y configuración, pero con capacidad mínima (warm). Además, la base primaria genera snapshots que se copian a un almacén de **copias inmutables** en otra cuenta o suscripción; esa es la defensa contra borrados y cifrado, que la réplica no da.

En un desastre: se decide hacer failover (mejor una decisión humana con un botón que un automatismo que se dispara por un fallo pasajero), se promociona la réplica, se escala la secundaria y la capa de enrutamiento envía el tráfico allí. Después llega lo que más se olvida: recrear la réplica en sentido inverso y planificar la vuelta.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Un solo host no tiene DR por sí mismo; lo que se monta es la copia: restic o Borg por cron a un bucket con Object Lock en otro sitio, el fichero de Compose y la configuración en Git, y un script probado que reconstruye el host desde cero. RTO de horas.

**Kubernetes on-premises (k3s o RKE2).** Dos clústeres, uno por centro, desplegados desde el mismo repositorio con Argo CD o Flux. CloudNativePG con una réplica de clúster en el segundo centro (replica cluster) y copias continuas a almacenamiento de objetos con Barman; Velero para copias de recursos y volúmenes; cert-manager y external-dns en ambos.

**Cloud sin Kubernetes.** ECS Fargate, Container Apps o Cloud Run en dos regiones desplegadas por el mismo pipeline, con la base gestionada replicada y el enrutamiento global del proveedor. Es la forma más barata de tener warm standby porque el cómputo mínimo en la secundaria cuesta poco.

**Kubernetes gestionado (EKS, AKS, GKE).** Un clúster por región gestionado con GitOps; el clúster secundario con pocos nodos y el autoescalado de nodos listo. El plano de control del clúster secundario sí se paga siempre.

| Opción | Coste fijo del DR | Operación | RTO típico | Cuándo |
|---|---|---|---|---|
| Docker Compose + copias | Muy bajo | Baja | Horas | Sistemas internos, presupuesto mínimo |
| Kubernetes on-prem en dos centros | Muy alto | Alta | Minutos | Soberanía, segundo centro disponible |
| Contenedores gestionados en dos regiones | Bajo-medio | Baja | Minutos | Opción por defecto en cloud |
| Kubernetes gestionado en dos regiones | Medio | Media | Minutos | Plataforma Kubernetes existente |

## Decisiones clave

- **Nivel por sistema, no para todo.** Backup y restauración, pilot light (solo datos replicados), warm standby y activo-activo multiplican el coste en cada paso. Asigna el nivel según RPO/RTO de cada sistema.
- **Failover automático o manual.** Automático reduce el RTO pero puede dispararse por un fallo parcial y provocar una división de cerebro; lo habitual es detección automática y decisión humana con un solo botón.
- **DNS o proxy global.** El DNS depende del TTL y de las cachés de los clientes; un proxy global (Front Door, balanceador global de Google) cambia al instante, pero solo para HTTP.
- **Réplica y copia inmutable, no una u otra.** La réplica protege de la caída de una región; la copia inmutable protege de borrados, errores y atacantes. Hacen falta las dos.

## Errores habituales

- No haber ensayado nunca el failover y descubrir el día del desastre que falta una cuota, un secreto o un permiso en la región secundaria.
- Guardar las copias en la misma cuenta y con los mismos administradores que producción.
- Depender de la consola o de la API de la región caída para ejecutar el failover.
- Olvidar las dependencias: claves de cifrado, secretos, imágenes de contenedor y DNS solo existen en la región primaria.
- TTL de DNS de horas en los nombres que deben cambiar.
- Hacer failover y no tener plan para volver, con lo que el sistema queda semanas sin protección.
