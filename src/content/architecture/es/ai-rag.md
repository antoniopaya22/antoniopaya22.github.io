---
title: "IA en producción con RAG"
short: "IA con RAG"
summary: "Un asistente que responde con los documentos de la organización, respeta los permisos de cada usuario, filtra lo que entra y lo que sale y deja trazas para explicar cada respuesta."
description: "RAG en producción con orquestador, guardrails, LLM, búsqueda vectorial y evaluación: arquitectura de referencia en AWS, Azure, GCP y on-premises."
order: 5
requirements:
  - "Las respuestas se basan en documentos propios y citan la fuente."
  - "Un usuario solo recupera fragmentos de documentos que tiene permiso para ver."
  - "Entradas y salidas pasan por guardrails: inyección de prompt, datos personales y contenido no permitido."
  - "Cada petición deja traza del prompt, el contexto recuperado, la respuesta, los tokens y la latencia."
  - "Ningún cambio de modelo, prompt o troceado llega a producción sin pasar un conjunto de evaluación."
platforms:
  onprem:
    summary: "Un orquestador en Kubernetes recupera contexto de PostgreSQL con pgvector, pasa entrada y salida por NeMo Guardrails, llama a un modelo abierto servido con vLLM y registra todo en Langfuse."
    notes:
      - "vLLM necesita GPU y el coste es fijo por nodo, se use o no; dimensiona por concurrencia y longitud de contexto, no por número de usuarios."
      - "pgvector con índice HNSW basta para la mayoría de corpus internos y permite filtrar por permisos y metadatos con SQL normal en la misma consulta."
      - "El modelo de embeddings también hay que servirlo y versionarlo (vLLM o Text Embeddings Inference): cambiarlo obliga a reindexar todo el corpus."
      - "Langfuse cubre trazas, versionado de prompts y evaluación con datasets; autoalojado necesita PostgreSQL, ClickHouse, Redis y almacenamiento de objetos."
  aws:
    summary: "Un orquestador en ECS Fargate recupera de Aurora con pgvector, invoca modelos de Amazon Bedrock, entre ellos Claude, y aplica Bedrock Guardrails a la entrada y a la salida."
    notes:
      - "Bedrock Guardrails se puede aplicar a cualquier texto con la API `ApplyGuardrail`, también a modelos que no estén en Bedrock; se paga por volumen de texto evaluado y por cada política activada."
      - "Si no quieres construir la ingesta, Bedrock Knowledge Bases trocea, genera embeddings y puede usar Aurora, OpenSearch Serverless o S3 Vectors como almacén."
      - "Lambda sirve para ingerir documentos sueltos; la carga inicial o documentos que necesitan OCR van mejor en Step Functions o en tareas de ECS."
      - "CloudWatch da trazas y métricas, no evaluación de calidad: activa el registro de invocaciones de Bedrock y evalúa con Bedrock Evaluations o con Langfuse."
      - "Se paga por token de entrada y de salida, y el contexto recuperado son tokens de entrada en cada pregunta: top-k y tamaño de fragmento son decisiones de coste."
  azure:
    summary: "Un orquestador en Container Apps recupera con Azure AI Search, llama a modelos desplegados en Microsoft Foundry, que también ofrece Claude, y filtra con Azure AI Content Safety."
    notes:
      - "Azure AI Foundry pasó a llamarse Microsoft Foundry a finales de 2025; Content Safety y Prompt Shields se configuran ahora como guardrails de cada despliegue."
      - "AI Search combina búsqueda vectorial, por palabras clave y reranking semántico; la búsqueda híbrida mejora mucho la recuperación de nombres propios, códigos y referencias."
      - "Guarda en el índice los grupos de Entra ID que pueden ver cada documento y filtra por ellos en la consulta."
      - "AI Search tiene coste fijo por unidades de búsqueda (réplicas por particiones) aunque no haya tráfico; los modelos se pagan por token o con capacidad reservada."
      - "Application Insights recoge las trazas vía OpenTelemetry; la evaluación de fidelidad y relevancia se hace con los evaluadores de Foundry."
  gcp:
    summary: "Un orquestador en Cloud Run recupera de Vertex AI Vector Search, llama a modelos de Vertex AI (Gemini, Claude o modelos abiertos) y sanea prompt y respuesta con Model Armor."
    notes:
      - "Model Armor no depende del modelo: expone una API para sanear prompts y otra para respuestas, con filtros de inyección, datos sensibles y URLs maliciosas."
      - "Vector Search se paga por nodo desplegado aunque no haya consultas; con corpus pequeños, AlloyDB o Cloud SQL con pgvector, o Vertex AI RAG Engine, son más baratos de arrancar."
      - "Cloud Run jobs encaja con la ingesta por lotes: reindexar el corpus es un job con tareas en paralelo, no una invocación por documento."
      - "Cloud Trace guarda las trazas de OpenTelemetry; para medir calidad usa el servicio de evaluación de IA generativa de Vertex AI o Langfuse."
---

## Cuándo lo necesitas

Cuando un modelo de lenguaje tiene que responder sobre información que no conoce: normativa interna, manuales, tickets, contratos. El fine-tuning no lo resuelve bien, porque el conocimiento cambia cada semana y no sabrías de dónde sale cada afirmación. RAG (retrieval-augmented generation) recupera en cada pregunta los fragmentos relevantes y se los da al modelo como contexto. Lo de «en producción» es todo lo demás: permisos, filtros, coste por token y poder explicar por qué una respuesta salió mal.

## Cómo encaja

Hay dos caminos. El de ingesta corre por detrás: los documentos fuente llegan al almacenamiento de objetos y un proceso los convierte a texto, los trocea, calcula los embeddings y los guarda en el índice vectorial con sus metadatos (origen, fecha, quién puede verlos).

El de consulta empieza en el usuario. El orquestador recibe la pregunta y la pasa por los guardrails de entrada. Calcula su embedding, pide al índice los top-k fragmentos filtrando por los permisos del usuario, monta el prompt con ese contexto y llama al LLM. La respuesta vuelve por los guardrails de salida antes de llegar al usuario. Cada paso deja traza: qué se recuperó, qué se envió, cuántos tokens y cuánto tardó.

## Decisiones clave

- **LLM gestionado o autoalojado.** Bedrock, Microsoft Foundry y Vertex AI dan acceso por API a modelos de varios proveedores (Claude, de Anthropic, está en los tres) y se pagan por token. Autoalojar un modelo abierto con vLLM tiene sentido por soberanía de datos o por volumen alto y sostenido; a cambio pagas GPUs por hora y operas la plataforma.
- **Vectores en tu base de datos o motor dedicado.** pgvector une vectores, permisos y metadatos en una sola consulta. Un motor dedicado escala mejor con corpus enormes y suele traer búsqueda híbrida, pero es un sistema más y casi siempre tiene coste fijo.
- **Ingesta propia o gestionada.** Bedrock Knowledge Bases o Vertex AI RAG Engine te ahorran troceado y embeddings, pero pierdes control sobre cómo se divide cada documento, que es donde más calidad se gana o se pierde.
- **Guardrails del proveedor y del negocio.** Los servicios gestionados cubren lo genérico; reglas como «no dar precios» o «no citar borradores» son código y tests tuyos.

## Errores habituales

- Filtrar permisos después de recuperar y no en la propia consulta: el top-k se llena de fragmentos que luego descartas o, peor, que no descartas.
- Tratar el contenido recuperado como confiable. Un documento puede llevar instrucciones (inyección indirecta) y el guardrail debe revisar también el contexto.
- Cambiar el modelo de embeddings sin reindexar, o mezclar vectores de dos modelos en el mismo índice.
- Tocar prompt, modelo o tamaño de fragmento sin un conjunto de preguntas con respuestas esperadas: sin eso no sabes si mejoras o empeoras.
- Meter veinte fragmentos «por si acaso»: más coste, más latencia y a menudo peores respuestas.
