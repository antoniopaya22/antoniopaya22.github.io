---
title: "Telemetría IoT a escala"
short: "Telemetría IoT"
summary: "Conectar miles de dispositivos con identidad propia, recibir su telemetría por MQTT, mantener su configuración deseada aunque estén desconectados, dejarles subir ficheros sin credenciales permanentes y guardar las lecturas en una base de series temporales."
description: "Ingesta IoT con X.509 por dispositivo, MQTT, shadow o twin, ficheros con credencial temporal y series temporales en AWS, Azure, GCP y on-premises."
order: 11
requirements:
  - "Cada dispositivo se autentica con su propio certificado X.509 y se puede revocar de forma individual."
  - "Un dispositivo solo publica y se suscribe a sus propios topics y solo escribe ficheros bajo su prefijo."
  - "La configuración deseada se guarda en la nube y el dispositivo la aplica al reconectar."
  - "Ninguna clave permanente de la nube vive en el dispositivo: las credenciales para subir ficheros caducan."
  - "Un pico de reconexiones o un consumidor caído no pierde lecturas: el stream amortigua y la ingesta es idempotente."
  - "Las series temporales tienen retención y agregados definidos por antigüedad."
platforms:
  onprem:
    summary: "Los dispositivos hablan MQTT con mTLS contra EMQX o Mosquitto, el estado deseado vive en PostgreSQL, un puente lleva los mensajes a Kafka, workers en Kubernetes los escriben en TimescaleDB y los ficheros van a Ceph RGW."
    notes:
      - "EMQX se distribuye con Business Source License desde la versión 5.9 (mayo de 2025) y un clúster de más de un nodo necesita licencia; las versiones anteriores siguen siendo Apache 2.0. Mosquitto es abierto pero de un solo nodo."
      - "El twin propio es una tabla con `desired`, `reported` y una versión por dispositivo; el broker publica el delta en un topic del dispositivo y este responde con lo que aplicó."
      - "Para ficheros, un servicio que valida la identidad del dispositivo emite URLs prefirmadas de Ceph RGW limitadas a `devices/<id>/` y a pocos minutos."
      - "Necesitas tu propia CA para emitir y revocar certificados (step-ca, EJBCA o Vault PKI) y publicar la lista de revocación o un OCSP que el broker consulte."
      - "TimescaleDB trae compresión y agregados continuos, pero esas funciones están bajo la Timescale License, no bajo Apache 2.0."
  aws:
    summary: "AWS IoT Core autentica con X.509, guarda shadows con estado deseado y reportado y enruta con una regla a Kinesis Data Streams; Lambda escribe en Timestream for InfluxDB y el proveedor de credenciales con role alias da acceso temporal a S3."
    notes:
      - "El proveedor de credenciales cambia el certificado del dispositivo por credenciales de STS (de 15 minutos a 12 horas) y la política de IAM puede usar `${credentials-iot:ThingName}` para limitar cada dispositivo a su prefijo de S3."
      - "Timestream for LiveAnalytics dejó de aceptar clientes nuevos el 20 de junio de 2025; para proyectos nuevos AWS recomienda Timestream for InfluxDB, que desde octubre de 2025 ofrece InfluxDB 3 Core y Enterprise."
      - "Timestream for InfluxDB vive en tu VPC: la Lambda de ingesta necesita configuración de VPC y una ruta a la instancia, y el coste es por instancia encendida."
      - "En la ingesta desde Kinesis, activa la respuesta de fallos parciales por lote para no reprocesar el lote entero y usa la clave (dispositivo, marca de tiempo) para que reescribir sea inocuo."
      - "IoT Core cobra por minutos de conexión, mensajes, operaciones de shadow y acciones de reglas; Basic Ingest (topics `$aws/rules/...`) evita el coste de mensajería cuando solo quieres llevar datos a una regla."
  azure:
    summary: "Azure IoT Hub autentica con X.509, mantiene device twins con propiedades deseadas y reportadas y enruta a Event Hubs; Azure Functions ingiere en Azure Data Explorer y la subida de ficheros usa URIs SAS que emite el propio IoT Hub."
    notes:
      - "IoT Hub no es un broker MQTT completo: implementa un subconjunto de MQTT 3.1.1 con topics fijos. Si necesitas MQTT v5 o publicación entre dispositivos, el broker MQTT de Event Grid lo cubre, pero no tiene device twins."
      - "Twins, mensajes de nube a dispositivo y gestión de dispositivos solo existen en el nivel estándar de IoT Hub; el nivel básico sirve para telemetría pura."
      - "La subida de ficheros es nativa: el dispositivo pide una URI SAS a IoT Hub, sube a la cuenta de almacenamiento vinculada bajo su id de dispositivo y notifica al terminar."
      - "IoT Hub se paga por unidades de un nivel con una cuota diaria de mensajes medidos en bloques de 4 KB; agrupa lecturas en cada mensaje. IoT Central se retira en 2029: no empieces con él."
      - "Device Provisioning Service registra dispositivos en el primer arranque a partir de un certificado de grupo, sin dar de alta cada uno a mano."
  gcp:
    summary: "Google retiró Cloud IoT Core el 16 de agosto de 2023, así que el broker es EMQX en GKE; los mensajes van a Pub/Sub, Cloud Run functions escriben en Bigtable, el twin vive en Firestore y los ficheros se suben a Cloud Storage con URLs firmadas."
    notes:
      - "Sin servicio IoT gestionado, el broker, la CA de dispositivos, el registro y el twin son tuyos; la alternativa es un broker de un socio de Marketplace."
      - "EMQX necesita licencia para clúster desde la 5.9; inclúyela en el coste junto a los nodos de GKE, que son coste fijo aunque no haya tráfico."
      - "El twin en Firestore usa un documento por dispositivo con `desired`, `reported` y versión; un listener envía el delta al dispositivo por MQTT cuando cambia `desired`."
      - "Para ficheros, un servicio en Cloud Run valida el certificado del dispositivo y firma una URL V4 de Cloud Storage para `devices/<id>/...` con caducidad corta."
      - "En Bigtable el diseño de la clave de fila lo es todo: `dispositivo#marca_de_tiempo_invertida` reparte la carga y permite leer lo último de un dispositivo con un escaneo de prefijo."
tiers:
  - name: "Piloto"
    when: "Unos cientos de dispositivos, un solo equipo y lecturas cada minuto."
    cost: 1
    ops: 1
    onprem: "Un host con Docker Compose: Mosquitto con mTLS, un worker que escribe directamente en TimescaleDB y MinIO para ficheros, sin Kafka."
    aws: "IoT Core con una regla que invoca Lambda directamente y escribe en Timestream for InfluxDB de una instancia."
    azure: "IoT Hub en nivel estándar pequeño, ruta al endpoint integrado y Functions que escriben en un clúster de desarrollo de Data Explorer."
    gcp: "EMQX de un nodo en una VM, Pub/Sub, Cloud Run functions y Bigtable de un nodo o BigQuery si las consultas no son de baja latencia."
    tradeoffs: "Sin stream intermedio, un consumidor lento rechaza o pierde lecturas; un único broker es un único punto de fallo."
  - name: "Flota de producción"
    when: "De miles a decenas de miles de dispositivos, varios consumidores de la telemetría y SLA de disponibilidad."
    cost: 2
    ops: 2
    onprem: "Kubernetes con EMQX en clúster (con licencia) o varios Mosquitto por región, Strimzi para Kafka, KEDA para workers y TimescaleDB en alta disponibilidad."
    aws: "El diseño del diagrama: IoT Core, shadows, Kinesis, Lambda, Timestream for InfluxDB en multi-AZ y credenciales con role alias."
    azure: "El diseño del diagrama con IoT Hub de varias unidades, DPS, Event Hubs con particiones por dispositivo y Data Explorer."
    gcp: "El diseño del diagrama: EMQX en clúster sobre GKE regional, Pub/Sub, Cloud Run functions, Bigtable con autoescalado y Firestore."
    tradeoffs: "El broker propio en GCP y on-premises exige un equipo que conozca MQTT, TLS y la CA; en AWS y Azure pagas por mensaje."
  - name: "Flota industrial global"
    when: "Cientos de miles de dispositivos, gateways en planta, varias regiones y requisitos de soberanía."
    cost: 4
    ops: 3
    onprem: "Brokers por planta con puente a un clúster central, Kafka replicado entre sedes y gateways con k3s que filtran y agregan."
    aws: "IoT Core en varias regiones con aprovisionamiento de flota, Greengrass en los gateways y Kinesis con Managed Service for Apache Flink."
    azure: "Varios IoT Hub por región con DPS repartiendo dispositivos, IoT Edge en planta y Data Explorer o Eventhouse de Fabric."
    gcp: "Clústeres EMQX en GKE por región, puentes desde planta, Pub/Sub global y Dataflow para agregados en tiempo real."
    tradeoffs: "Coste y operación altos; las decisiones de identidad (CA, rotación) y de dónde se procesa (borde o nube) pesan más que la elección de servicios."
extensions:
  - name: "Aprovisionamiento masivo"
    when: "Cuando los dispositivos salen de fábrica y deben registrarse solos en el primer arranque."
    cost: "low"
    onprem: "CA propia + servicio de registro"
    aws: "Fleet provisioning de IoT Core"
    azure: "Device Provisioning Service"
    gcp: "CA propia + Cloud Run de registro"
  - name: "Actualizaciones OTA"
    when: "Cuando hay que actualizar firmware o configuración de forma escalonada y con vuelta atrás."
    cost: "low"
    onprem: "Mender o RAUC"
    aws: "AWS IoT Jobs"
    azure: "Jobs de IoT Hub + Mender"
    gcp: "Mender o servicio propio"
  - name: "Procesamiento en el borde"
    when: "Cuando la conectividad es mala o enviar todo en bruto cuesta demasiado."
    cost: "medium"
    onprem: "k3s en el gateway"
    aws: "AWS IoT Greengrass"
    azure: "Azure IoT Edge"
    gcp: "k3s o GKE en el gateway"
  - name: "Alertas en tiempo real"
    when: "Cuando una lectura fuera de rango debe disparar una acción en segundos."
    cost: "medium"
    onprem: "Apache Flink sobre Kafka"
    aws: "Managed Service for Apache Flink"
    azure: "Azure Stream Analytics"
    gcp: "Dataflow"
  - name: "Archivo en bruto"
    when: "Cuando necesitas reprocesar o entrenar modelos con el histórico completo."
    cost: "low"
    onprem: "Kafka Connect a Ceph RGW"
    aws: "Data Firehose a S3"
    azure: "Event Hubs Capture"
    gcp: "Suscripción de Pub/Sub a Cloud Storage"
  - name: "Paneles operativos"
    when: "Cuando operación necesita ver el estado de la flota sin escribir consultas."
    cost: "low"
    onprem: "Grafana"
    aws: "Amazon Managed Grafana"
    azure: "Paneles de Data Explorer"
    gcp: "Grafana en GKE"
savings:
  - "Agrupa varias lecturas por mensaje en el dispositivo: tanto IoT Core como IoT Hub cobran por mensaje (IoT Hub en bloques de 4 KB) y la mayoría de lecturas son mucho más pequeñas."
  - "En AWS, publica la telemetría con Basic Ingest (`$aws/rules/<regla>`) para no pagar mensajería de publicación y suscripción cuando el único destino es una regla."
  - "No actualices el shadow o el twin con cada lectura: es para estado y configuración, no para telemetría, y cada operación se cobra."
  - "Aplica retención y downsampling en la base de series temporales: datos en bruto unos días, agregados por minuto u hora para el resto, y archivo barato en almacenamiento de objetos."
  - "Usa Kinesis en modo on-demand mientras el volumen sea irregular y pasa a provisionado cuando sea estable; en Event Hubs, dimensiona unidades de throughput con autoinflado."
  - "Ejecuta las funciones de ingesta en ARM (Graviton en Lambda) y los nodos de GKE del broker con descuentos por compromiso cuando la flota sea estable."
---

## Cuándo lo necesitas

Cuando tienes dispositivos en el campo (sensores, PLC, gateways, vehículos, contadores) que envían lecturas continuas y a los que también hay que mandar configuración. Una API HTTP con una clave compartida funciona para diez dispositivos en un laboratorio; en una flota real necesitas identidad por dispositivo, un protocolo eficiente para conexiones inestables, una forma de cambiar la configuración de un dispositivo apagado y un almacén pensado para lecturas por tiempo.

La señal clara es esta: el número de dispositivos crece más rápido que la capacidad del equipo de gestionarlos a mano, y alguien pregunta qué pasa si roban uno.

## Escenarios

- **Startup de hardware con un piloto.** Cientos de dispositivos y un cliente. Usa el servicio IoT gestionado (AWS IoT Core o Azure IoT Hub) aunque luego cambies: te da certificados, MQTT y shadow sin operar nada. Sin Kinesis ni Event Hubs; la regla invoca la función directamente.
- **Industria con datos que no salen de la planta.** Un broker por planta y un gateway que agrega y filtra; a la nube solo suben agregados y alarmas, o nada si es on-premises puro. La CA de dispositivos la controla el cliente, y el diseño debe funcionar días sin conexión.
- **Contadores inteligentes con millones de lecturas al día.** El coste por mensaje domina. Se agrupan lecturas en el dispositivo, se usa ingesta básica y se rebaja la resolución de los datos antiguos. El stream con particiones por dispositivo es imprescindible para absorber reconexiones masivas tras un corte de red.
- **Empresa estándar en Google Cloud.** Sin IoT Core desde 2023, la decisión es operar un broker (EMQX en GKE) o contratar uno de un socio. El resto (Pub/Sub, funciones, Bigtable) es igual de gestionado que en otras nubes.
- **Equipos médicos o regulados.** Identidad por dispositivo, revocación inmediata, firmware firmado y trazabilidad de cada cambio de configuración. El twin se convierte en registro auditable.

## Cómo encaja

El dispositivo, o el gateway que lo representa, abre una conexión MQTT con TLS mutuo: presenta su certificado X.509 y el broker lo valida contra la CA registrada. La política asociada a ese certificado limita los topics a los del propio dispositivo.

La telemetría publicada llega al broker, que la reenvía a un stream particionado por dispositivo. El stream desacopla: si la ingesta va lenta o cae, los mensajes esperan en lugar de perderse. La función de ingesta lee lotes, descarta duplicados por (dispositivo, marca de tiempo, número de secuencia) y escribe en la base de series temporales. Como MQTT con QoS 1 y el stream entregan al menos una vez, la idempotencia no es opcional.

En paralelo, el broker mantiene el registro de estado: la nube escribe el estado **deseado** (frecuencia de muestreo, umbrales, versión de firmware) y el dispositivo publica el estado **reportado**. Si están desconectados, al volver el dispositivo recibe la diferencia y la aplica.

Para ficheros grandes (imágenes, volcados de diagnóstico), el dispositivo no usa MQTT: pide una credencial temporal con su certificado y sube directamente al almacenamiento de objetos, limitado a su prefijo.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Para un piloto o un laboratorio: Mosquitto con mTLS y un fichero de ACL por dispositivo, un worker que se suscribe y escribe en TimescaleDB, MinIO para ficheros con un pequeño servicio que firma URLs, y Grafana detrás de Caddy. Volúmenes para TimescaleDB, MinIO y la CA (step-ca); copia diaria con `pg_dump` y réplica del bucket.

**Kubernetes on-premises (k3s o RKE2).** EMQX con su operador (con licencia si usas clúster) o varios Mosquitto detrás de un balanceador L4 con afinidad, Strimzi para Kafka, KEDA para escalar los workers según el retraso del topic, CloudNativePG con una imagen que incluya TimescaleDB y cert-manager para los certificados de servidor. Los certificados de dispositivo los emite tu CA, no cert-manager.

**Cloud sin Kubernetes.** En AWS y Azure es el camino natural: IoT Core o IoT Hub, Kinesis o Event Hubs y funciones. No hay servidores salvo la base de series temporales. En GCP, sin broker gestionado, la variante sin Kubernetes es EMQX en un grupo de instancias de Compute Engine detrás de un balanceador TCP.

**Kubernetes gestionado (EKS, AKS, GKE).** Es la opción por defecto en GCP y tiene sentido en AWS o Azure si necesitas un broker MQTT completo (MQTT v5, publicación entre dispositivos) o quieres el mismo broker en planta y en la nube.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Muy bajo | Media | Un broker | Piloto, laboratorio |
| Kubernetes on-prem | Alto | Alta | Horizontal con licencia | Planta, soberanía |
| Servicio IoT gestionado | Bajo, pago por mensaje | Baja | Automático | AWS o Azure por defecto |
| Kubernetes gestionado | Medio | Media | Horizontal | GCP, broker completo |

## Decisiones clave

- **Servicio IoT gestionado o broker propio.** El gestionado da certificados, políticas, shadow y escalado, y cobra por mensaje; el propio da MQTT completo y portabilidad a cambio de operar broker, CA y registro.
- **Shadow para estado, stream para telemetría.** El shadow guarda el último estado y la configuración; la serie temporal guarda la historia. Mezclarlos encarece y complica ambos.
- **Base de series temporales.** InfluxDB y TimescaleDB brillan con consultas por dispositivo y ventana de tiempo; Data Explorer, con análisis ad hoc de grandes volúmenes; Bigtable, con escritura masiva y lecturas por clave, pero sin SQL analítico.
- **Procesar en el borde o en la nube.** Agregar en el gateway reduce mensajes y coste; enviar en bruto permite reanalizar después. Muchas flotas hacen ambas cosas: agregados por MQTT y bruto por fichero.
- **CA propia o del proveedor.** Una CA propia permite cambiar de nube y firmar en fábrica; la del proveedor es más sencilla pero te ata.

## Errores habituales

- Un certificado compartido por toda la flota: cuando se filtra, no puedes revocar uno sin dejar fuera a todos.
- Políticas que permiten publicar en `#`: un dispositivo comprometido inyecta datos de otros.
- Guardar claves de acceso de la nube en el dispositivo para subir ficheros en lugar de credenciales temporales.
- Ingesta no idempotente que duplica lecturas tras cada reconexión o reintento del lote.
- Reconexión simultánea de toda la flota tras un corte, sin espera exponencial aleatoria en el dispositivo.
- Elegir Timestream for LiveAnalytics o Cloud IoT Core siguiendo tutoriales antiguos.
