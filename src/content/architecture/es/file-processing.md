---
title: "Subida y procesamiento de ficheros"
short: "Subida de ficheros"
summary: "Recibir ficheros de los usuarios sin que pasen por la API, comprobar que no traen malware y extraer su contenido de forma asíncrona, con un estado que el usuario puede consultar."
description: "Subida directa con URL firmada, antimalware, OCR y procesamiento por eventos: arquitectura de referencia en AWS, Azure, GCP y on-premises."
order: 4
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
      - "Textract tiene API síncrona y asíncrona; para PDFs de varias páginas usa la asíncrona con aviso por SNS en vez de esperar dentro de la Lambda, que tiene un límite de 15 minutos."
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
---

## Cuándo lo necesitas

Cuando los usuarios suben ficheros (facturas, contratos, documentos de identidad, fotos) y hay que hacer algo con ellos. Mandar el fichero a través de la API es la versión que funciona en la demo: ocupa memoria y conexiones del backend, choca con los límites de tamaño de petición del balanceador o de la plataforma serverless y mezcla en una sola petición la subida, el análisis y la respuesta. Este patrón separa las tres cosas y deja que el almacenamiento de objetos haga lo que mejor sabe hacer.

## Cómo encaja

1. El cliente pide permiso a la API. La API autentica, valida el tipo y el tamaño declarados, crea un registro en estado `pendiente` y devuelve una URL firmada de corta duración para una clave de objeto que decide ella.
2. El cliente sube el fichero directamente al almacenamiento de objetos. La API no ve los bytes.
3. Al crearse el objeto, el antimalware lo analiza.
4. Si está limpio, se emite un evento «fichero limpio» (el resultado de GuardDuty o Defender, o la copia al bucket de limpios en GCP).
5. El procesador recibe ese evento, descarga el fichero, llama al OCR o al servicio de extracción y guarda el resultado y el nuevo estado en la base de datos.

El cliente consulta el estado o recibe un aviso cuando termina; nunca espera con la conexión abierta.

## Decisiones clave

- **Escaneo como puerta o en paralelo.** El diagrama pone el antimalware delante del procesador: el trabajo arranca con el veredicto, no con la subida. Añade algo de latencia y evita procesar un fichero infectado. Escanear en paralelo solo compensa si el procesado es inocuo y la latencia manda.
- **Funciones o contenedores.** Las funciones encajan con ficheros pequeños y OCR por API. Si el procesamiento es largo, usa librerías pesadas o necesita GPU, pasa a workers en contenedores que leen de una cola.
- **OCR gestionado o autoalojado.** Textract, Document Intelligence y Document AI traen modelos para tablas, formularios y facturas, y se pagan por página. Tesseract o PaddleOCR no tienen coste por uso, pero sí cómputo, y la calidad con documentos difíciles pasa a ser problema tuyo.
- **Un bucket con prefijos o varios buckets.** Separar subida, limpios y cuarentena simplifica permisos y ciclo de vida; un solo bucket es más sencillo de montar, pero las políticas acaban siendo frágiles.

## Errores habituales

- Firmar URLs de larga duración o dejar que el cliente elija la clave del objeto: abre la puerta a sobrescribir ficheros ajenos.
- Fiarse de la extensión o del `Content-Type` que declara el cliente. Comprueba el tipo real por su contenido en el procesador.
- Procesador no idempotente. Los eventos se entregan al menos una vez: deduplica por clave de objeto y versión o ETag.
- Servir el fichero original desde el dominio de la aplicación sin forzar `Content-Disposition: attachment`, lo que permite colar HTML o SVG con scripts.
- Olvidar el ciclo de vida: subidas que nunca se confirmaron y cuarentenas que crecen sin límite.
