---
title: "Subida y procesamiento de ficheros"
short: "Subida de ficheros"
summary: "Recibir ficheros de los usuarios sin que pasen por la API, comprobar que no traen malware y extraer su contenido de forma asíncrona, con un estado que el usuario puede consultar."
description: "Subida directa con URL firmada, antimalware, OCR y procesamiento por eventos: arquitectura de referencia en AWS, Azure, GCP y on-premises."
order: 9
requirements:
  - "La API nunca recibe los bytes del fichero, solo emite permisos de subida."
  - "Cada URL de subida caduca pronto y sirve para un único objeto con una clave decidida por el servidor."
  - "Ningún fichero se procesa ni se sirve a otros usuarios antes de pasar el antimalware."
  - "El procesamiento es idempotente y tolera reintentos y eventos duplicados."
  - "El usuario puede consultar en qué estado está su fichero."
platforms:
  onprem:
    summary: "Ceph RGW emite URLs prefirmadas y publica las notificaciones de bucket en RabbitMQ; workers en Kubernetes escanean con ClamAV, extraen texto con PaddleOCR o Tesseract y guardan el resultado en PostgreSQL."
    notes:
      - "Ceph RGW es compatible con la API de S3, admite URLs prefirmadas y notificaciones a AMQP o Kafka. MinIO era la opción habitual, pero dejó de publicar binarios de su edición comunitaria en 2025 y ya no evoluciona."
      - "Ejecuta ClamAV como servicio (`clamd`) en el clúster con un mirror propio de firmas: muchos nodos lanzando `freshclam` contra el CDN público acaban limitados o bloqueados."
      - "Tesseract rinde bien con texto impreso limpio; con escaneos, tablas o maquetación compleja PaddleOCR suele acertar más, a cambio de más CPU o de GPU."
      - "El coste es capacidad: discos para el almacenamiento y nodos para el OCR, que es con diferencia la carga más pesada. Escala los workers por profundidad de cola."
  aws:
    summary: "S3 con URL prefirmada, GuardDuty Malware Protection for S3 analiza cada objeto nuevo, EventBridge dispara una Lambda que llama a Textract y el resultado acaba en Aurora PostgreSQL."
    notes:
      - "Si necesitas acotar el tamaño desde el servidor, usa un POST prefirmado con política (`content-length-range`) en lugar de un PUT."
      - "GuardDuty publica el veredicto en EventBridge (`GuardDuty Malware Protection Object Scan Result`) y puede etiquetar el objeto con `GuardDutyMalwareScanStatus`: dispara el procesador con ese evento, no con el de objeto creado, y bloquea la lectura de objetos sin etiqueta limpia con la política del bucket."
      - "Textract tiene API síncrona y asíncrona; para PDFs de varias páginas usa la asíncrona con aviso por SNS en vez de esperar dentro de la Lambda, que tiene un límite de duración (30 minutos desde noviembre de 2026) y cobra el tiempo de espera."
      - "GuardDuty se paga por volumen analizado y Textract por página y tipo de análisis: extraer tablas y formularios cuesta más que el texto plano."
  azure:
    summary: "Blob Storage con SAS de delegación de usuario, Defender for Storage analiza al subir, Event Grid entrega el evento a Azure Functions y Document Intelligence extrae el contenido."
    notes:
      - "Emite SAS de delegación de usuario (firmadas con Entra ID), solo con permiso de creación y sobre un blob concreto; evita las SAS firmadas con la clave de la cuenta."
      - "Una SAS no limita el tamaño del fichero: compruébalo en el procesador y descarta lo que supere tu límite."
      - "Defender for Storage escribe el resultado en etiquetas de índice del blob y puede enviarlo a un topic de Event Grid; las etiquetas no son a prueba de manipulación, así que decide con el evento del resultado."
      - "Document Intelligence ofrece modelos de lectura, de layout y precompilados (facturas, recibos, documentos de identidad); se paga por página y modelo, así que usa el más sencillo que resuelva el caso."
      - "Defender for Storage se paga por cuenta de almacenamiento protegida y por volumen analizado."
  gcp:
    summary: "Cloud Storage con URL firmada V4, Eventarc enruta el evento de objeto finalizado a ClamAV en Cloud Run y a una Cloud Run function que llama a Document AI."
    notes:
      - "Google Cloud no tiene antimalware nativo para Cloud Storage; su arquitectura de referencia despliega ClamAV en Cloud Run con buckets separados para ficheros sin analizar, limpios y en cuarentena."
      - "Con ese diseño, el procesador escucha el bucket de limpios y no el de subida: el escaneo deja de ser una rama paralela y pasa a ser una puerta."
      - "Para limitar el tamaño, incluye la cabecera `x-goog-content-length-range` en la firma, o usa un policy document si la subida es por formulario HTML."
      - "Document AI se paga por página y procesador; los especializados (facturas, identidad) cuestan más que el OCR genérico."
tiers:
  - name: "Mínimo viable"
    when: "Pocas subidas al día, ficheros de pocas páginas y un equipo pequeño que no quiere operar colas ni clústeres."
    cost: 1
    ops: 1
    onprem: "Un host con Docker Compose: API, un almacenamiento S3 compatible ligero (Garage o MicroCeph con RGW), `clamd`, un worker con Tesseract y PostgreSQL como cola con `SKIP LOCKED`; el cliente confirma la subida a la API en lugar de depender de notificaciones del bucket."
    aws: "S3 con URL prefirmada, GuardDuty Malware Protection limitado al prefijo de subidas, una Lambda disparada por el resultado del escaneo, Textract síncrono y Aurora Serverless v2 capaz de bajar a cero."
    azure: "Blob Storage con SAS de delegación, Defender for Storage con escaneo al subir, Azure Functions en el plan Flex Consumption, el modelo Read de Document Intelligence y PostgreSQL Flexible Server en nivel Burstable."
    gcp: "Buckets de subida, limpios y cuarentena, ClamAV en Cloud Run, una Cloud Run function sobre el bucket de limpios, el OCR genérico de Document AI y la instancia más pequeña de Cloud SQL."
    tradeoffs: "Sin cola intermedia, un pico de subidas se traduce en ejecuciones concurrentes contra el OCR y la base de datos; los documentos largos y los reintentos finos quedan fuera."
  - name: "Equilibrado"
    when: "Volumen sostenido, PDFs de muchas páginas y un servicio que no puede perder ficheros ni procesarlos dos veces."
    cost: 2
    ops: 2
    onprem: "k3s o RKE2 con Rook-Ceph para el RGW, RabbitMQ con colas quorum y DLX, workers escalados por KEDA según la profundidad de cola y CloudNativePG con réplica síncrona."
    aws: "EventBridge entrega a SQS con DLQ, Lambda o servicios ECS Fargate consumen la cola, Textract asíncrono con aviso por SNS y Aurora Multi-AZ."
    azure: "Event Grid entrega a Service Bus, jobs de Container Apps escalados por eventos procesan los mensajes, Document Intelligence asíncrono y PostgreSQL con alta disponibilidad entre zonas."
    gcp: "Eventarc publica en Pub/Sub con dead-letter topic, Cloud Run procesa por push, Document AI en modo por lotes para documentos largos y Cloud SQL con alta disponibilidad regional."
    tradeoffs: "Una cola más que vigilar (mensajes envejecidos, DLQ) y algo más de latencia, a cambio de absorber picos, reintentar con control y no saturar el OCR."
  - name: "Gran volumen y OCR propio"
    when: "Cientos de miles de documentos al mes, modelos de extracción propios o la necesidad de que los ficheros no salgan de tu infraestructura."
    cost: 4
    ops: 3
    onprem: "Clúster Ceph dedicado con multisite entre CPD, nodos con GPU y NVIDIA GPU Operator para PaddleOCR o modelos propios, KEDA y almacenamiento por niveles con clases de almacenamiento del RGW."
    aws: "EKS con Karpenter mezclando GPU e instancias Spot para los workers, S3 con replicación entre regiones y Textract reservado a los documentos que tus modelos no resuelven."
    azure: "AKS con node pools de GPU y Spot, replicación de objetos entre cuentas de almacenamiento y Document Intelligence solo como segunda pasada."
    gcp: "GKE con node pools de GPU y VMs Spot, o Cloud Run con GPU para cargas intermitentes, buckets birregionales y Document AI como respaldo."
    tradeoffs: "Operas modelos, GPUs y un clúster; la calidad de extracción pasa a depender de tu equipo y el ahorro por página solo aparece con volumen alto y constante."
extensions:
  - name: "Subida multipart o reanudable"
    when: "Cuando hay ficheros de cientos de MB o conexiones móviles inestables que no pueden reintentar la subida entera."
    cost: "low"
    onprem: "Multipart S3 en Ceph RGW"
    aws: "S3 multipart con URL por parte"
    azure: "Bloques + Put Block List con SAS"
    gcp: "Subida reanudable firmada"
  - name: "Cola como amortiguador con DLQ"
    when: "En cuanto el volumen tiene picos o el OCR es lento o tiene cuotas por segundo."
    cost: "low"
    onprem: "RabbitMQ (quorum + DLX)"
    aws: "Amazon SQS + DLQ"
    azure: "Azure Service Bus"
    gcp: "Pub/Sub + dead-letter topic"
  - name: "Ciclo de vida y niveles de almacenamiento"
    when: "Siempre que guardes originales más de unas semanas o tengas subidas que nunca se confirman."
    cost: "low"
    onprem: "Lifecycle + clases de RGW"
    aws: "S3 Lifecycle / Intelligent-Tiering"
    azure: "Lifecycle management (Cool/Cold/Archive)"
    gcp: "Object Lifecycle / Autoclass"
  - name: "Detección de datos personales"
    when: "Cuando los ficheros pueden traer DNI, datos de salud o bancarios y tienes que clasificarlos o anonimizarlos."
    cost: "medium"
    onprem: "Microsoft Presidio"
    aws: "Amazon Macie"
    azure: "Microsoft Purview"
    gcp: "Sensitive Data Protection"
  - name: "CDN para servir resultados"
    when: "Cuando además de procesar sirves miniaturas, previsualizaciones o ficheros limpios a muchos usuarios."
    cost: "medium"
    onprem: "Nginx o Varnish como caché"
    aws: "CloudFront + OAC"
    azure: "Azure Front Door"
    gcp: "Cloud CDN"
  - name: "Aviso en tiempo real al cliente"
    when: "Cuando el usuario espera en pantalla y el sondeo del estado genera demasiadas peticiones."
    cost: "low"
    onprem: "SSE o WebSocket en la API"
    aws: "API Gateway WebSocket"
    azure: "Azure Web PubSub"
    gcp: "SSE desde Cloud Run"
savings:
  - "Antes de pagar OCR, comprueba si el PDF ya trae capa de texto (`pdftotext`, PyMuPDF): los documentos nacidos digitales no necesitan Textract, Document Intelligence ni Document AI."
  - "Usa el modelo más simple que resuelva el caso: `DetectDocumentText` en lugar de `AnalyzeDocument` en Textract, Read en lugar de Layout en Document Intelligence, OCR genérico en lugar de procesadores especializados en Document AI."
  - "Configura reglas de ciclo de vida: aborta multipart incompletas (`AbortIncompleteMultipartUpload` en S3 y Cloud Storage), borra a los pocos días lo que quedó en el prefijo de subidas sin confirmar y mueve originales a Standard-IA, Cool o Nearline y después a S3 Glacier o a los niveles Archive de Azure y Cloud Storage; ten en cuenta las duraciones mínimas y el coste de recuperación."
  - "Acota el antimalware a lo que hace falta: GuardDuty Malware Protection for S3 admite limitar el escaneo a prefijos y Defender for Storage permite fijar un tope mensual de GB analizados por cuenta."
  - "Ejecuta los workers sobre ARM (Lambda arm64, Graviton en Fargate) cuando las librerías lo permiten, y los workers de OCR en contenedores sobre Fargate Spot, VMs Spot o nodos Spot: el trabajo es reintentable por diseño."
  - "Evita que las descargas de los workers pasen por NAT: endpoint de gateway de S3 en AWS, Private Google Access en GCP o service endpoints de Storage en Azure; y procesa en la misma región que el bucket."
---

## Cuándo lo necesitas

Cuando los usuarios suben ficheros (facturas, contratos, documentos de identidad, fotos) y hay que hacer algo con ellos. Mandar el fichero a través de la API es la versión que funciona en la demo: ocupa memoria y conexiones del backend, choca con los límites de tamaño de petición del balanceador o de la plataforma serverless y mezcla en una sola petición la subida, el análisis y la respuesta. Este patrón separa las tres cosas y deja que el almacenamiento de objetos haga lo que mejor sabe hacer.

## Escenarios

- **MVP que recibe facturas.** Pocas decenas de documentos al día. Basta con la opción mínima: URL firmada, escaneo gestionado, una función y OCR por API. Sin cola ni clúster todavía, pero con el estado en base de datos y el procesador idempotente desde el primer día.
- **Plataforma con vídeos o planos de cientos de MB.** El cuello de botella es la subida, no el OCR. Pasa a multipart (S3, Ceph) o subida reanudable (Cloud Storage) o por bloques (Azure): la API firma cada parte o la sesión, el cliente sube en paralelo y reintenta solo la parte que falla, y la API cierra la subida al final. Revisa el tamaño máximo que analiza tu antimalware: por encima de él el fichero no debe pasar a «limpio» por omisión, sino a revisión.
- **Empresa regulada con datos personales en la UE.** Buckets en región europea con cifrado por clave gestionada por ti, escaneo como puerta, detección de datos personales antes de indexar el contenido y retención con borrado programado. Los originales pasan pronto a un nivel frío.
- **Cliente que exige on-premises.** Ceph RGW con Rook, RabbitMQ, ClamAV con mirror propio de firmas y PaddleOCR en nodos con GPU. La factura por página se convierte en capacidad que dimensionas tú: la cola y el escalado por profundidad dejan de ser opcionales.
- **Campañas con picos estacionales.** Declaraciones, matrículas, cierres de trimestre. La cola amortigua y los workers escalan a cero fuera de temporada; vigila las cuotas del servicio de OCR, que suelen limitar antes que tu cómputo.

## Cómo encaja

1. El cliente pide permiso a la API. La API autentica, valida el tipo y el tamaño declarados, crea un registro en estado `pendiente` y devuelve una URL firmada de corta duración para una clave de objeto que decide ella (o, en multipart, un identificador de subida y una URL por parte).
2. El cliente sube el fichero directamente al almacenamiento de objetos. La API no ve los bytes.
3. Al crearse el objeto, el antimalware lo analiza. Mientras tanto el fichero no se puede leer ni servir.
4. Si está limpio, se emite un evento «fichero limpio» (el resultado de GuardDuty o Defender, o la copia al bucket de limpios en GCP). Si no, va a cuarentena y el registro pasa a `rechazado`.
5. El procesador recibe ese evento, descarga el fichero, comprueba su tipo real, llama al OCR o al servicio de extracción y guarda el resultado y el nuevo estado en la base de datos.

El cliente consulta el estado o recibe un aviso cuando termina; nunca espera con la conexión abierta.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Contenedores para la API, el almacenamiento S3 compatible (Garage o MicroCeph; Garage admite URLs prefirmadas pero no notificaciones de bucket, así que el cliente confirma la subida a la API y esta encola el trabajo), `clamd` con `freshclam` apuntando a tu mirror, uno o varios workers y PostgreSQL. Volúmenes para datos del almacenamiento, firmas de ClamAV y base de datos; Caddy o Traefik delante con TLS. Copias: `pg_dump` o pgBackRest y réplica del bucket a otro sitio. Sirve para empezar o para un cliente pequeño; no tiene alta disponibilidad.

**Kubernetes on-premises (k3s o RKE2).** Rook gestiona Ceph y el RGW, el RabbitMQ Cluster Operator la cola, CloudNativePG la base de datos con copias a objeto, cert-manager los certificados y KEDA escala los workers por mensajes pendientes, hasta cero. Si usas GPU para OCR, NVIDIA GPU Operator y un node pool separado con taints.

**Cloud sin Kubernetes.** Encaja de forma natural: funciones para el procesador (Lambda, Azure Functions, Cloud Run functions) y, cuando el OCR es pesado o propio, contenedores en ECS Fargate, jobs de Container Apps o Cloud Run. Todo escala a cero y pagas por uso.

**Kubernetes gestionado (EKS, AKS, GKE).** Compensa con clúster existente, GPU con control fino o volumen alto y constante: Karpenter o el autoescalado de node pools con Spot, KEDA leyendo SQS, Service Bus o Pub/Sub.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Compose en un host | Bajo | Media | Manual | Piloto, cliente pequeño on-premises |
| Kubernetes on-premises | Alto | Alta | KEDA por cola | Soberanía, volumen alto, GPU propia |
| Serverless / PaaS | Casi nulo | Baja | Automático, a cero | Por defecto en cloud |
| EKS / AKS / GKE | Medio | Media-alta | Nodos + KEDA | Clúster existente, GPU, volumen constante |

## Decisiones clave

- **Escaneo como puerta o en paralelo.** El diagrama pone el antimalware delante del procesador: el trabajo arranca con el veredicto, no con la subida. Añade algo de latencia y evita procesar o servir un fichero infectado. Escanear en paralelo solo compensa si el procesado es inocuo y nadie más ve el fichero hasta tener el veredicto.
- **Funciones o contenedores.** Las funciones encajan con ficheros pequeños y OCR por API. Si el procesamiento es largo, usa librerías pesadas o necesita GPU, pasa a workers en contenedores que leen de una cola.
- **OCR gestionado o autoalojado.** Textract, Document Intelligence y Document AI traen modelos para tablas, formularios y facturas, y se pagan por página. Tesseract o PaddleOCR no tienen coste por uso, pero sí cómputo, y la calidad con documentos difíciles pasa a ser problema tuyo.
- **Un bucket con prefijos o varios buckets.** Separar subida, limpios y cuarentena simplifica permisos y ciclo de vida; un solo bucket es más sencillo de montar, pero las políticas acaban siendo frágiles.
- **Subida simple o multipart.** Por debajo de unas decenas de MB, una URL firmada basta. Por encima, multipart o reanudable, con la API como dueña del identificador de subida y del cierre.

## Errores habituales

- Firmar URLs de larga duración o dejar que el cliente elija la clave del objeto: abre la puerta a sobrescribir ficheros ajenos.
- Fiarse de la extensión o del `Content-Type` que declara el cliente. Comprueba el tipo real por su contenido en el procesador.
- Procesador no idempotente. Los eventos se entregan al menos una vez: deduplica por clave de objeto y versión o ETag.
- Tratar «sin resultado de escaneo» como «limpio»: ficheros demasiado grandes, cifrados o con error de análisis deben ir a revisión, no al procesador.
- Servir el fichero original desde el dominio de la aplicación sin forzar `Content-Disposition: attachment`, lo que permite colar HTML o SVG con scripts.
- Olvidar el ciclo de vida: multipart abandonadas que se facturan sin verse, subidas que nunca se confirmaron y cuarentenas que crecen sin límite.
