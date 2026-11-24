---
title: "IA en producción con RAG"
short: "IA con RAG"
summary: "Un asistente que responde con los documentos de la organización, respeta los permisos de cada usuario, filtra lo que entra y lo que sale y deja trazas para explicar cada respuesta."
description: "RAG en producción con orquestador, guardrails, LLM, búsqueda vectorial y evaluación: arquitectura de referencia en AWS, Azure, GCP y on-premises."
order: 12
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
    summary: "Un orquestador en Cloud Run recupera de Vertex AI Vector Search (desde abril de 2026, parte de Gemini Enterprise Agent Platform), llama a modelos de Vertex AI (Gemini, Claude o modelos abiertos) y sanea prompt y respuesta con Model Armor."
    notes:
      - "Model Armor no depende del modelo: expone una API para sanear prompts y otra para respuestas, con filtros de inyección, datos sensibles y URLs maliciosas."
      - "Vector Search se paga por nodo desplegado aunque no haya consultas; con corpus pequeños, AlloyDB o Cloud SQL con pgvector, o Vertex AI RAG Engine, son más baratos de arrancar."
      - "Cloud Run jobs encaja con la ingesta por lotes: reindexar el corpus es un job con tareas en paralelo, no una invocación por documento."
      - "Cloud Trace guarda las trazas de OpenTelemetry; para medir calidad usa el servicio de evaluación de IA generativa de Vertex AI o Langfuse."
tiers:
  - name: "Todo en PostgreSQL + API gestionada"
    when: "Asistente interno o primer producto con IA: corpus de miles a cientos de miles de fragmentos y un equipo que ya opera PostgreSQL."
    cost: 1
    ops: 1
    onprem: "Docker Compose con el orquestador, PostgreSQL con pgvector y pg_trgm, Text Embeddings Inference en CPU y Langfuse; el LLM es una API gestionada si la política de datos lo permite o vLLM con un modelo pequeño en una sola GPU."
    aws: "Orquestador en ECS Fargate, Aurora Serverless v2 con pgvector y pg_trgm, modelos de Bedrock bajo demanda y Bedrock Guardrails."
    azure: "Orquestador en Container Apps, Azure Database for PostgreSQL con pgvector en lugar de AI Search, modelos de Microsoft Foundry de pago por uso y Content Safety."
    gcp: "Orquestador en Cloud Run, Cloud SQL o AlloyDB con pgvector en lugar de Vector Search, modelos de Vertex AI y Model Armor."
    tradeoffs: "La búsqueda léxica de PostgreSQL no es BM25 ni trae reranking semántico de serie; con corpus muy grandes o mucha concurrencia, la base de datos compite con la aplicación."
  - name: "Búsqueda dedicada y reranking"
    when: "Corpus grande y heterogéneo, muchas fuentes, consultas con nombres y códigos, y la calidad de recuperación como prioridad."
    cost: 3
    ops: 2
    onprem: "OpenSearch o Elasticsearch con búsqueda híbrida, un reranker cross-encoder servido con Text Embeddings Inference y la ingesta como jobs en Kubernetes."
    aws: "Amazon OpenSearch Service con búsqueda híbrida o Bedrock Knowledge Bases, reranking con la API de rerank de Bedrock y modelos bajo demanda."
    azure: "Azure AI Search con búsqueda híbrida y semantic ranker, como en el diagrama, más modelos de Foundry y Content Safety."
    gcp: "Vertex AI Vector Search con búsqueda híbrida densa y dispersa, como en el diagrama, más la API de ranking de Vertex AI."
    tradeoffs: "Un sistema más que sincronizar con la fuente de verdad de los permisos y un coste fijo por nodo o unidad de búsqueda aunque no haya tráfico."
  - name: "Modelos propios con GPU"
    when: "Soberanía de datos, modelos ajustados propios o un volumen de tokens alto y sostenido que hace más barata la GPU que el pago por token."
    cost: 4
    ops: 3
    onprem: "Kubernetes con nodos GPU, NVIDIA GPU Operator, vLLM detrás de KServe o del vLLM production stack, KEDA y Langfuse en alta disponibilidad."
    aws: "EKS con nodos GPU gestionados por Karpenter, ECS sobre instancias con GPU o endpoints de SageMaker AI; Fargate no ofrece GPU."
    azure: "AKS con node pools de GPU, o Container Apps con GPU sin servidor para cargas intermitentes que pueden escalar a cero."
    gcp: "GKE con node pools de GPU, o Cloud Run con GPU para cargas intermitentes que pueden escalar a cero."
    tradeoffs: "Pagas GPU por hora, la uses o no, y asumes actualizar modelos, medir su calidad y gestionar capacidad; los modelos abiertos que caben en tu hardware no siempre igualan a los mejores de API."
extensions:
  - name: "Caché semántica"
    when: "Cuando muchas preguntas se repiten con otras palabras (soporte, FAQ internas) y las respuestas no dependen del usuario."
    cost: "low"
    onprem: "Valkey o Redis con búsqueda vectorial"
    aws: "ElastiCache for Valkey"
    azure: "Azure Managed Redis (RediSearch)"
    gcp: "Memorystore for Valkey"
  - name: "Reranking"
    when: "Cuando el top-k trae fragmentos parecidos pero no los mejores y quieres enviar menos contexto al LLM."
    cost: "low"
    onprem: "Cross-encoder en TEI"
    aws: "Bedrock Rerank"
    azure: "Semantic ranker de AI Search"
    gcp: "Vertex AI ranking API"
  - name: "Motor de búsqueda híbrida dedicado"
    when: "Cuando PostgreSQL ya no da la latencia o la calidad léxica que necesitas con tu volumen."
    cost: "high"
    onprem: "OpenSearch"
    aws: "Amazon OpenSearch Service"
    azure: "Azure AI Search"
    gcp: "Vertex AI Vector Search (híbrida)"
  - name: "Caché de prompt del proveedor"
    when: "Cuando el prompt de sistema, las instrucciones o un documento largo se repiten en muchas llamadas."
    cost: "low"
    onprem: "Prefix caching de vLLM"
    aws: "Prompt caching de Bedrock"
    azure: "Prompt caching en Foundry"
    gcp: "Context caching de Vertex AI"
  - name: "Gateway de LLM con cuotas"
    when: "Cuando varios equipos o aplicaciones comparten modelos y necesitas cuotas de tokens, enrutado y un único punto de registro."
    cost: "medium"
    onprem: "LiteLLM proxy"
    aws: "LiteLLM en ECS"
    azure: "API Management (AI gateway)"
    gcp: "Apigee"
savings:
  - "Enruta por dificultad: un modelo pequeño para clasificar, reescribir la pregunta o resumir, y el grande solo para la respuesta final; Bedrock ofrece Intelligent Prompt Routing para hacerlo dentro de una familia de modelos."
  - "Activa la caché de prompt del proveedor para el prompt de sistema y las instrucciones fijas, y pon esa parte estable al principio del prompt para que se reutilice."
  - "Reduce el contexto: menos fragmentos y más pequeños tras un reranker cuestan menos tokens de entrada que veinte fragmentos sin ordenar, y suelen dar mejores respuestas."
  - "No pagues un motor de búsqueda con coste fijo para un corpus pequeño: pgvector en la base de datos que ya tienes, Aurora Serverless v2 o el nivel más bajo de AI Search bastan hasta que la evaluación diga lo contrario."
  - "Pasa a inferencia por lotes (Bedrock batch inference, Batch en Foundry, batch inference de Vertex AI) el enriquecimiento de la ingesta y las ejecuciones de evaluación, que no necesitan respuesta inmediata."
  - "Con GPU propia, apaga o escala a cero los entornos de desarrollo (KEDA, Cloud Run o Container Apps con GPU), usa Spot para calcular embeddings por lotes y reserva capacidad solo para la carga base sostenida."
---

## Cuándo lo necesitas

Cuando un modelo de lenguaje tiene que responder sobre información que no conoce: normativa interna, manuales, tickets, contratos. El fine-tuning no lo resuelve bien, porque el conocimiento cambia cada semana y no sabrías de dónde sale cada afirmación. RAG (retrieval-augmented generation) recupera en cada pregunta los fragmentos relevantes y se los da al modelo como contexto. Lo de «en producción» es todo lo demás: permisos, filtros, coste por token y poder explicar por qué una respuesta salió mal.

## Escenarios

- **Asistente interno de una empresa mediana.** Unos miles de documentos en SharePoint o un gestor documental, decenas de usuarios. Todo en PostgreSQL: `tsvector` para búsqueda por palabras con el diccionario del idioma, `pg_trgm` para nombres y códigos con erratas y pgvector con HNSW para similitud semántica, combinados en una sola consulta con Reciprocal Rank Fusion y con el filtro de permisos en el mismo `WHERE`. El LLM, por API gestionada. Es barato, se opera con lo que ya sabes y la consulta híbrida ya resuelve buena parte de lo que aporta un motor dedicado.
- **Base de conocimiento grande con muchas fuentes.** Millones de fragmentos, varios idiomas, referencias de producto. Aquí compensa un motor de búsqueda dedicado (AI Search, OpenSearch, Vector Search) con BM25 real, búsqueda híbrida y reranking, a cambio de coste fijo y de sincronizar permisos desde las fuentes.
- **Sector público o salud con soberanía de datos.** Ningún dato sale de tu infraestructura o de una región concreta: modelo abierto servido con vLLM en GPU propia o en Kubernetes gestionado de la región, embeddings con Text Embeddings Inference y guardrails autoalojados. Más operación, y la evaluación pasa a ser imprescindible para comparar modelos abiertos.
- **Chatbot de soporte con mucho tráfico.** Muchas preguntas son la misma con otras palabras. Una caché semántica delante del LLM devuelve respuestas ya validadas si la similitud supera un umbral, y la caché de prompt del proveedor abarata el resto. Solo vale para respuestas que no dependen de quién pregunta.
- **Equipo sin experiencia en IA.** Ingesta gestionada (Bedrock Knowledge Bases, Vertex AI RAG Engine o el indexador de AI Search) para llegar rápido, con un conjunto de evaluación desde el primer día para saber cuándo hay que tomar el control del troceado.

## Cómo encaja

Hay dos caminos. El de ingesta corre por detrás: los documentos fuente llegan al almacenamiento de objetos y un proceso los convierte a texto, los trocea, calcula los embeddings y los guarda en el índice con sus metadatos (origen, fecha, quién puede verlos). En la variante todo en PostgreSQL, la misma fila guarda el texto, su `tsvector`, el vector y los grupos con acceso.

El de consulta empieza en el usuario. El orquestador recibe la pregunta y la pasa por los guardrails de entrada. Si hay caché semántica, la consulta primero. Calcula el embedding, pide al índice los top-k fragmentos con búsqueda híbrida filtrando por los permisos del usuario, opcionalmente los reordena con un reranker, monta el prompt con ese contexto y llama al LLM. La respuesta vuelve por los guardrails de salida antes de llegar al usuario. Cada paso deja traza: qué se recuperó, qué se envió, cuántos tokens y cuánto tardó.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Orquestador, PostgreSQL con pgvector y pg_trgm, Text Embeddings Inference, NeMo Guardrails y Langfuse con sus dependencias (PostgreSQL, ClickHouse, Redis y almacenamiento de objetos). Si el modelo es propio, vLLM en el mismo host con la GPU expuesta al contenedor. Volúmenes para la base de datos, la caché de modelos y Langfuse; Caddy o Traefik delante. Vale para un piloto o un departamento.

**Kubernetes on-premises.** CloudNativePG para PostgreSQL, NVIDIA GPU Operator, vLLM con KServe o el vLLM production stack, KEDA para escalar el orquestador y los jobs de ingesta, cert-manager y el Helm chart de Langfuse. Separa los nodos GPU con taints para que nada más los ocupe.

**Cloud sin Kubernetes.** Orquestador en ECS Fargate, Container Apps o Cloud Run, LLM por API gestionada e ingesta en Lambda, Functions o Cloud Run jobs. Si necesitas un modelo propio con GPU sin clúster, Cloud Run y Container Apps ofrecen GPU con escalado a cero; en AWS, ECS sobre instancias con GPU (Fargate no las tiene) o SageMaker AI.

**Kubernetes gestionado.** EKS, AKS o GKE cuando sirves modelos propios con carga sostenida, necesitas varios modelos compartiendo GPU o ya tienes la plataforma.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Compose en un host | Bajo (alto con GPU) | Media | Manual | Piloto, departamento |
| Kubernetes on-premises | Alto | Alta | KEDA, nodos GPU fijos | Soberanía, volumen sostenido |
| PaaS + API gestionada | Casi nulo | Baja | Automático | Por defecto en cloud |
| EKS / AKS / GKE con GPU | Alto | Alta | Nodos GPU + KEDA | Modelos propios a escala |

## Decisiones clave

- **LLM gestionado o modelo propio en contenedor con GPU.** Bedrock, Microsoft Foundry y Vertex AI dan acceso por API a modelos de varios proveedores (Claude, de Anthropic, está en los tres) y se pagan por token, sin coste en reposo. Un modelo abierto con vLLM tiene sentido por soberanía o por volumen alto y sostenido; pagas GPU por hora y operas la plataforma.
- **Todo en PostgreSQL o motor de búsqueda dedicado.** PostgreSQL une texto, vectores, permisos y metadatos en una consulta transaccional. Un motor dedicado escala mejor con corpus enormes, trae BM25 y reranking integrados, pero es un sistema más con coste fijo.
- **Ingesta propia o gestionada.** Bedrock Knowledge Bases o Vertex AI RAG Engine te ahorran troceado y embeddings, pero pierdes control sobre cómo se divide cada documento, que es donde más calidad se gana o se pierde.
- **Guardrails del proveedor y del negocio.** Los servicios gestionados cubren lo genérico; reglas como «no dar precios» o «no citar borradores» son código y tests tuyos.

## Errores habituales

- Filtrar permisos después de recuperar y no en la propia consulta: el top-k se llena de fragmentos que luego descartas o, peor, que no descartas. Con pgvector, activa los escaneos iterativos del índice (desde la versión 0.8) para que el filtro no deje el resultado corto.
- Tratar el contenido recuperado como confiable. Un documento puede llevar instrucciones (inyección indirecta) y el guardrail debe revisar también el contexto.
- Cambiar el modelo de embeddings sin reindexar, o mezclar vectores de dos modelos en el mismo índice.
- Cachear respuestas que dependen de los permisos del usuario en una caché semántica compartida.
- Tocar prompt, modelo o tamaño de fragmento sin un conjunto de preguntas con respuestas esperadas: sin eso no sabes si mejoras o empeoras.
