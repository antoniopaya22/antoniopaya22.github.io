---
title: "Procesado de vídeo e imágenes"
short: "Vídeo e imágenes"
summary: "Subidas directas al almacenamiento con URL firmada, transcodificación a HLS/DASH con una escalera de bitrates, miniaturas, imágenes redimensionadas al vuelo y entrega protegida por CDN con URLs firmadas o DRM."
description: "Subida firmada, transcodificación a HLS/DASH, imágenes al vuelo, CDN con URLs firmadas y DRM: arquitectura de referencia en AWS, Azure, GCP y on-premises."
order: 29
requirements:
  - "Los ficheros originales nunca pasan por la API: se suben directos al almacenamiento con una URL firmada de vida corta."
  - "Cada vídeo se transcodifica a una escalera de bitrates en HLS y DASH, con miniaturas y un estado de trabajo consultable."
  - "Las imágenes se redimensionan bajo demanda y el resultado se cachea; el origen solo guarda el original."
  - "Solo quien tiene derecho reproduce el contenido: URLs o cookies firmadas y, si el contrato lo exige, DRM."
  - "El coste por minuto procesado y por GB servido se conoce y se puede atribuir a cada cliente o colección."
platforms:
  onprem:
    summary: "Ceph RGW para originales y renditions, workers de FFmpeg con GPU coordinados por RabbitMQ, imgproxy para imágenes y Nginx con secure_link para la entrega."
    notes:
      - "FFmpeg con NVENC (NVIDIA) o Quick Sync/VA-API (Intel) multiplica el rendimiento frente a CPU en H.264 y HEVC, pero a igual bitrate la calidad del codificador por software suele ser mejor; mide con VMAF antes de decidir."
      - "Shaka Packager o el propio FFmpeg generan HLS y DASH sobre segmentos CMAF comunes: un solo juego de segmentos sirve a ambos formatos."
      - "El módulo `secure_link` de Nginx valida un hash con caducidad en la URL; firma el prefijo del directorio del vídeo o tendrás que firmar cada segmento."
      - "imgproxy exige URLs firmadas con clave y sal: sin firma, cualquiera puede pedir miles de tamaños y tumbar el servicio."
      - "El coste es hardware: GPUs que están ociosas fuera de los picos de subida y ancho de banda de salida si no hay una CDN delante."
  aws:
    summary: "S3 con URLs prefirmadas, AWS Elemental MediaConvert lanzado por evento, EventBridge para el estado de los trabajos, CloudFront con URLs o cookies firmadas y la solución Dynamic Image Transformation para imágenes."
    notes:
      - "MediaConvert cobra por minuto de salida, con multiplicadores por resolución, códec, frame rate y modo de calidad; el nivel Basic es más barato que Professional si te basta con H.264."
      - "MediaConvert emite cambios de estado de cada trabajo a EventBridge: no hace falta sondear la API para saber cuándo termina."
      - "Con volumen constante, las colas reservadas de MediaConvert dan un precio fijo mensual por slot con compromiso de 12 meses; no admiten algunas funciones como AV1 u 8K."
      - "La antigua Serverless Image Handler se llama ahora Dynamic Image Transformation for Amazon CloudFront: Lambda redimensiona con sharp y CloudFront cachea; la variante Lambda está pensada para imágenes de hasta unos 6 MB."
      - "Para DRM, MediaConvert cifra con claves obtenidas vía SPEKE de un proveedor de licencias; CloudFront firma con grupos de claves, no con la clave raíz de la cuenta."
  azure:
    summary: "Blob Storage con SAS de delegación de usuario, FFmpeg en trabajos de Container Apps lanzados por Event Grid, imgproxy en Container Apps y Azure Front Door para la entrega."
    notes:
      - "Azure Media Services se retiró el 30 de junio de 2024 y no tiene sustituto propio: Microsoft remite a socios para codificación, empaquetado y DRM. FFmpeg en Container Apps es la opción sin terceros."
      - "Usa trabajos de Container Apps disparados por eventos (escala con KEDA sobre una cola de Storage alimentada por Event Grid) en lugar de una app siempre encendida."
      - "Las GPU serverless de Container Apps son T4 y A100: la T4 tiene codificador NVENC, la A100 no, así que para transcodificar con GPU elige T4 o quédate en CPU."
      - "Front Door no tiene firma de URLs nativa (Microsoft la indica en su hoja de ruta): valida un token o una cookie en una función o en el origen, o pasa la SAS en la query sabiendo que fragmenta la caché."
      - "Desactiva la compresión de Front Door para segmentos `.m4s` y `.ts` y cachea los manifiestos de VOD; los de directo no."
  gcp:
    summary: "Cloud Storage con URLs firmadas, Transcoder API lanzada por Eventarc, Pub/Sub para el estado, imgproxy en Cloud Run y Media CDN con tokens firmados."
    notes:
      - "Transcoder API genera HLS y DASH, sprites de miniaturas y cifrado para Widevine, FairPlay y PlayReady, pero las claves y licencias vienen de un proveedor DRM externo y se guardan en Secret Manager."
      - "Cada trabajo de Transcoder puede publicar su estado en un topic de Pub/Sub: es la señal para marcar el vídeo como listo."
      - "Media CDN se activa a petición a través del equipo comercial de Google y está pensado para grandes volúmenes; para un catálogo modesto, Cloud CDN con URLs o cookies firmadas basta."
      - "Media CDN usa tokens firmados con Ed25519 (o HMAC) y admite autenticación de doble token; en DASH solo vía cookie."
      - "imgproxy en Cloud Run escala a cero; pon Cloud CDN delante y una caché larga para que cada tamaño se genere una sola vez."
tiers:
  - name: "Catálogo pequeño"
    when: "Formación interna, fichas de producto o un MVP con pocos cientos de vídeos y sin requisitos de DRM."
    cost: 1
    ops: 1
    onprem: "Un host con Docker Compose: MinIO o Ceph RGW, un worker de FFmpeg en CPU, imgproxy y Nginx con secure_link."
    aws: "S3, MediaConvert Basic con una escalera corta de H.264, Lambda para lanzar trabajos y CloudFront con URLs firmadas."
    azure: "Blob Storage, un trabajo de Container Apps con FFmpeg en CPU, imgproxy en Container Apps y Front Door Standard."
    gcp: "Cloud Storage, Transcoder API con un preset, imgproxy en Cloud Run y Cloud CDN con URLs firmadas."
    tradeoffs: "Sin DRM ni empaquetado dinámico: el contenido se puede descargar con algo de esfuerzo y cada cambio de formato obliga a retranscodificar."
  - name: "Vídeo bajo demanda profesional"
    when: "Plataforma de cursos o medios con miles de vídeos, reproducción en navegador, móvil y Smart TV y acceso por suscripción."
    cost: 2
    ops: 2
    onprem: "Kubernetes con workers de FFmpeg en GPU escalados por KEDA sobre la cola, Shaka Packager para CMAF y una caché Nginx delante del almacenamiento."
    aws: "MediaConvert Professional con escalera ABR automática, EventBridge, CloudFront con cookies firmadas y Origin Shield."
    azure: "Trabajos de Container Apps con perfil GPU T4, Event Grid, Front Door Premium con validación de token en el origen."
    gcp: "Transcoder API con plantillas propias, Pub/Sub para estados, Cloud CDN o Media CDN con tokens."
    tradeoffs: "Más formatos y más renditions por vídeo: el coste de transcodificación y almacenamiento crece con cada peldaño de la escalera."
  - name: "Contenido premium con DRM"
    when: "Estrenos, deportes o catálogos con contratos de licencia que exigen DRM multi-sistema y entrega a gran escala."
    cost: 4
    ops: 3
    onprem: "Granja de codificación GPU, empaquetado con cifrado CENC, servidor de licencias de un proveedor DRM y varias CDN comerciales delante."
    aws: "MediaConvert con SPEKE, AWS Elemental MediaPackage para empaquetado y DRM al vuelo, CloudFront y una segunda CDN."
    azure: "Codificación y DRM con un socio del catálogo de Azure, Blob Storage como origen y Front Door junto a otra CDN."
    gcp: "Transcoder API con cifrado y claves en Secret Manager, proveedor DRM externo y Media CDN."
    tradeoffs: "Licencias DRM por reproducción o por dispositivo, integración con proveedores y pruebas en cada familia de reproductores."
extensions:
  - name: "Análisis antimalware de subidas"
    when: "Cuando suben ficheros usuarios anónimos o externos antes de procesarlos."
    cost: "low"
    onprem: "ClamAV"
    aws: "GuardDuty Malware Protection for S3"
    azure: "Defender for Storage"
    gcp: "ClamAV en Cloud Run"
  - name: "Subtítulos automáticos"
    when: "Accesibilidad obligatoria o búsqueda dentro del vídeo."
    cost: "medium"
    onprem: "Whisper en GPU"
    aws: "Amazon Transcribe"
    azure: "Azure AI Speech"
    gcp: "Speech-to-Text"
  - name: "Etiquetado y moderación"
    when: "Contenido generado por usuarios que hay que revisar o catalogar."
    cost: "medium"
    onprem: "Modelos propios en GPU"
    aws: "Amazon Rekognition"
    azure: "Azure AI Video Indexer"
    gcp: "Video Intelligence API"
  - name: "Directo"
    when: "Eventos o clases en vivo además del catálogo bajo demanda."
    cost: "high"
    onprem: "SRS o Nginx RTMP"
    aws: "MediaLive + MediaPackage"
    azure: "Socio (no hay servicio propio)"
    gcp: "Live Stream API"
  - name: "Empaquetado al vuelo"
    when: "Cuando guardar HLS y DASH por separado duplica almacenamiento o hay que cambiar de DRM sin retranscodificar."
    cost: "medium"
    onprem: "nginx-vod-module"
    aws: "AWS Elemental MediaPackage"
    azure: "Empaquetador de un socio"
    gcp: "Segmentos CMAF comunes"
  - name: "Escudo de origen"
    when: "Cuando muchas regiones de la CDN piden lo mismo al almacenamiento a la vez."
    cost: "low"
    onprem: "Caché Nginx intermedia"
    aws: "CloudFront Origin Shield"
    azure: "Caché Nginx propia ante Blob"
    gcp: "Escudo de origen de Media CDN"
savings:
  - "Transcodifica solo lo que se ve: genera de entrada los peldaños más usados y produce los raros (4K, bitrates altos) la primera vez que alguien los pide."
  - "Usa el nivel Basic de MediaConvert para H.264 y reserva Professional (HEVC, AV1, HDR) para el contenido que lo necesita; con volumen estable, compara con las colas reservadas."
  - "Ejecuta los workers de FFmpeg en Spot, VMs de acceso puntual o nodos preemptibles: un trabajo de transcodificación se puede reintentar desde el principio."
  - "Mueve los originales a Glacier, Cold/Archive o Coldline tras publicar; solo hacen falta para retranscodificar, que es raro."
  - "La factura grande suele ser la salida de la CDN, no la transcodificación: HEVC o AV1 reducen GB servidos para los dispositivos que los soportan, y el peldaño más alto solo se sirve a quien tiene ancho de banda."
  - "En imágenes, normaliza los tamaños permitidos (una lista cerrada de anchos) para maximizar aciertos de caché y evitar que cada combinación genere una transformación nueva."
---

## Cuándo lo necesitas

Cuando tu producto recibe o sirve vídeo e imágenes a escala: una plataforma de cursos, un marketplace con fotos de producto, una red social interna, una televisión local que publica su archivo. Servir un MP4 desde un bucket funciona hasta que los usuarios están en móvil con mala cobertura, el vídeo pesa gigas o el contrato exige que nadie lo descargue. En ese punto necesitas transcodificar a streaming adaptativo, generar miniaturas, redimensionar imágenes sin guardar cien variantes y proteger la entrega.

## Escenarios

### Fotos de producto de un marketplace

Solo imágenes, muchas y de tamaños imprevisibles. Basta con subida firmada, un servicio de imágenes al vuelo con firma de URL y una CDN que cachee cada variante. Lo crítico es fijar una lista cerrada de tamaños y formatos (WebP, AVIF) y no dejar que el cliente pida cualquier combinación.

### Plataforma de formación

Miles de vídeos de duración media, reproducción en navegador y móvil, acceso por suscripción. Escalera de cuatro o cinco peldaños en H.264, HLS con segmentos CMAF, miniaturas para el reproductor y cookies firmadas para que el acceso se valide una vez por sesión y no por segmento.

### Medio con contenido de terceros bajo licencia

El contrato exige DRM: Widevine para Chrome y Android, FairPlay para Apple, PlayReady para Smart TV y Windows. La transcodificación cifra con claves que entrega un proveedor de licencias; el reproductor pide la licencia a ese proveedor. Cambia el coste (licencias por reproducción) y la complejidad de pruebas.

### Organismo que exige on-premises

FFmpeg, Shaka Packager, imgproxy y Nginx cubren todo el flujo sin servicios gestionados. La decisión real es la GPU: compensa con volumen sostenido; para subidas esporádicas, CPU y paciencia.

## Cómo encaja

El cliente pide a la API una URL firmada de subida y sube el original directamente al almacenamiento; la API nunca toca los bytes. Para ficheros grandes, la subida es multiparte y se puede reanudar.

La llegada del objeto genera un evento. Si es una imagen, no hace nada más: el servicio de imágenes al vuelo leerá el original cuando alguien pida un tamaño concreto, lo transformará y la CDN guardará el resultado. Si es un vídeo, el evento lanza un trabajo de transcodificación: decodifica el original, produce la escalera de bitrates (por ejemplo de 360p a 1080p, cada peldaño con su bitrate), segmenta en CMAF, escribe los manifiestos HLS y DASH, y extrae miniaturas y un sprite para el scrubbing del reproductor.

El trabajo publica sus cambios de estado (en cola, en progreso, completado, error) en el bus de eventos; un consumidor actualiza la base de datos del catálogo y marca el vídeo como publicable. Las renditions se escriben en otro prefijo o bucket, separado de los originales y con su propio ciclo de vida.

La CDN sirve manifiestos y segmentos con caché larga, porque en VOD no cambian. El control de acceso va en la CDN: URL firmada para el manifiesto y cookie o token firmado para los segmentos, con caducidad corta. Con DRM, los segmentos van cifrados y la clave solo llega al reproductor a través del servidor de licencias.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** MinIO o Ceph RGW (o un bucket externo), RabbitMQ, uno o dos contenedores worker con FFmpeg (con el runtime de NVIDIA si hay GPU), imgproxy y Nginx con `secure_link` y caché en disco. Copias solo de los originales; las renditions se regeneran.

**Kubernetes on-premises.** k3s o RKE2 con el NVIDIA GPU Operator para exponer las GPU, workers como Jobs o Deployments escalados por KEDA según la longitud de la cola de RabbitMQ (a cero cuando no hay trabajo), Ceph con Rook para el almacenamiento, imgproxy con HPA y cert-manager para TLS. Separa los nodos GPU con taints para que solo los workers los usen.

**Cloud sin Kubernetes.** El camino natural es un servicio gestionado por minuto (MediaConvert, Transcoder API) disparado por eventos; en Azure, trabajos de Container Apps con FFmpeg. Imágenes en Lambda, Container Apps o Cloud Run escalando a cero. Sin servidores que mantener y coste proporcional al volumen.

**Kubernetes gestionado.** EKS, AKS o GKE con grupos de nodos GPU en Spot y escalado por cola compensan con volumen alto y continuo, cuando el precio por minuto de un servicio gestionado supera lo que cuesta tener GPUs ocupadas, o si necesitas codificadores o filtros a medida.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Un host, quizá con GPU | Media | Manual | Catálogo pequeño on-premises |
| Kubernetes on-premises | Nodos GPU propios | Alta | KEDA por cola | Volumen sostenido on-premises |
| Servicio gestionado por minuto | Casi nulo | Baja | Automático | Opción por defecto en cloud |
| EKS, AKS, GKE con GPU | Nodos y plano de control | Alta | Por cola, nodos Spot | Volumen alto y continuo |

## Decisiones clave

- **Servicio gestionado o FFmpeg propio.** El gestionado cobra por minuto de salida y no tiene coste fijo; FFmpeg propio solo compensa con volumen alto y equipo que lo mantenga.
- **GPU o CPU.** La GPU codifica mucho más rápido y abarata el minuto con volumen; la CPU da mejor calidad por bit y no tiene coste ocioso. Mide con VMAF antes de elegir.
- **Empaquetado previo o al vuelo.** Guardar HLS y DASH ya empaquetados es simple; empaquetar al vuelo ahorra almacenamiento y permite cambiar DRM sin retranscodificar, a cambio de otro componente.
- **URL firmada o cookie firmada.** Firmar cada segmento fragmenta la caché y complica el reproductor; valida en el manifiesto y emite una cookie o un token de prefijo para los segmentos.
- **DRM solo si el contrato lo pide.** Las URLs firmadas frenan el enlace directo, no la copia; el DRM la dificulta pero añade licencias y pruebas por dispositivo.

## Errores habituales

- Subir los vídeos a través de la API y saturar memoria y tiempo de espera.
- Dejar imgproxy o el image handler sin firma de URL y abrir la puerta a un ataque de coste.
- Una escalera fija para todo el catálogo: una animación simple y un partido de fútbol no necesitan los mismos bitrates.
- Cachear los manifiestos de un directo como si fueran de VOD.
- Guardar originales y renditions en la misma clase de almacenamiento para siempre.
- Olvidar CORS en la CDN y descubrir que el reproductor web no carga los segmentos.
- No registrar el estado de cada trabajo y no saber qué vídeos fallaron hasta que un usuario lo reporta.
