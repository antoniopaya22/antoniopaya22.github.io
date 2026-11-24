---
title: "Entrenar y servir modelos de ML"
short: "ML en producción"
summary: "Llevar un modelo de aprendizaje automático del notebook a producción: features coherentes entre entrenamiento y servicio, entrenamiento reproducible con GPU, registro con aprobación, endpoint en línea, inferencia por lotes y reentrenamiento cuando los datos derivan."
description: "MLOps con feature store, pipeline de entrenamiento con GPU, registro de modelos, endpoint, batch y control de deriva en AWS, Azure, GCP y on-premises."
order: 13
requirements:
  - "Las features se calculan igual al entrenar y al servir, sin reimplementarlas en dos sitios."
  - "Cada modelo es reproducible: código, datos, parámetros y métricas quedan registrados."
  - "Ningún modelo llega a producción sin pasar evaluación y una aprobación explícita en el registro."
  - "El endpoint en línea despliega versiones nuevas sin cortar el servicio y puede volver atrás."
  - "La deriva de datos y de calidad se mide en producción y dispara el reentrenamiento."
  - "Las GPU solo se pagan mientras se usan."
platforms:
  onprem:
    summary: "Feast sirve features, Kubeflow Pipelines entrena en nodos con GPU, MLflow registra modelos, KServe sirve en línea, Jobs de Kubernetes hacen inferencia por lotes y Evidently mide la deriva."
    notes:
      - "El NVIDIA GPU Operator instala drivers, runtime y plugin de dispositivos; sin él, cada actualización del sistema operativo rompe los nodos con GPU."
      - "Feast necesita un almacén en línea (Redis o PostgreSQL) y uno fuera de línea (Parquet en el lago, Trino o un almacén); la materialización entre ambos es un trabajo programado."
      - "En MLflow usa alias (`champion`, `challenger`) en lugar de las etapas antiguas; KServe despliega lo que apunta el alias y admite canary por porcentaje de tráfico."
      - "Kueue reparte las GPU entre equipos con colas y cuotas; sin colas, el primero que lanza un trabajo grande bloquea a todos."
      - "El coste es fijo: GPU compradas que se amortizan aunque estén paradas. Mide su ocupación antes de comprar más."
  aws:
    summary: "SageMaker AI cubre el ciclo: Feature Store, Pipelines para entrenar en instancias con GPU, Model Registry con aprobación, endpoints en tiempo real y Model Monitor; la inferencia por lotes corre en AWS Batch con GPU."
    notes:
      - "Desde diciembre de 2024 el servicio de ML clásico se llama Amazon SageMaker AI; «Amazon SageMaker» es ahora la plataforma unificada de datos e IA que lo incluye."
      - "Model Monitor necesita captura de datos activada en el endpoint y una línea base calculada con los datos de entrenamiento; para medir calidad del modelo, además, etiquetas reales que llegan después."
      - "Para batch, SageMaker Batch Transform evita gestionar contenedores; AWS Batch con GPU compensa cuando ya tienes la imagen de inferencia y quieres instancias Spot y colas propias."
      - "Los endpoints en tiempo real cobran por hora de instancia aunque no reciban tráfico; Serverless Inference (solo CPU) o Asynchronous Inference con escalado a cero sirven para tráfico esporádico."
      - "El entrenamiento con Managed Spot Training reduce el coste si el código guarda checkpoints y tolera interrupciones."
  azure:
    summary: "Azure Machine Learning aporta feature store gestionado, pipelines en clústeres con GPU, registros compartidos entre workspaces, managed online endpoints, batch endpoints y monitorización de modelos."
    notes:
      - "Microsoft Foundry (antes Azure AI Foundry) es la plataforma para IA generativa y agentes; el entrenamiento de modelos propios y el MLOps clásico siguen en Azure Machine Learning."
      - "Los registros de Azure ML guardan modelos, entornos y componentes para varios workspaces: entrena en el de desarrollo y despliega en el de producción desde el mismo registro."
      - "Un managed online endpoint admite varios despliegues con reparto de tráfico y tráfico espejo, lo que permite canary y pruebas en sombra sin infraestructura extra."
      - "Las GPU requieren cuota por familia de VM y región; pídela antes del proyecto, no el día del primer entrenamiento."
      - "Los clústeres de cómputo escalan a cero nodos cuando no hay trabajos; las compute instances de los notebooks no, salvo que actives el apagado por inactividad."
  gcp:
    summary: "Vertex AI, integrado desde abril de 2026 en Gemini Enterprise Agent Platform, ofrece Feature Store, Pipelines, Model Registry, endpoints en línea, inferencia por lotes y Model Monitoring."
    notes:
      - "La documentación ya usa los nombres nuevos (Agent Platform Pipelines, Model Registry, Feature Store); APIs, SDK y recursos existentes siguen funcionando."
      - "Feature Store usa BigQuery como almacén fuera de línea y sirve en línea desde una tienda dedicada; la versión Legacy está obsoleta y no debe usarse en proyectos nuevos."
      - "Pipelines ejecuta definiciones de Kubeflow Pipelines (KFP), así que lo que construyes on-premises se puede portar con pocos cambios."
      - "Los endpoints en línea cobran por nodo desplegado mientras esté activo; la inferencia por lotes solo mientras dura el trabajo."
      - "El entrenamiento personalizado admite VM Spot y reservas de GPU; sin reserva, la disponibilidad de ciertas GPU en una región no está garantizada."
tiers:
  - name: "Un modelo, por lotes"
    when: "Un científico de datos, un modelo y predicciones que se pueden calcular cada noche."
    cost: 1
    ops: 1
    onprem: "Un host con GPU y Docker Compose: MLflow con PostgreSQL y MinIO, un contenedor de entrenamiento lanzado por cron y un trabajo batch que escribe predicciones en la base."
    aws: "Un trabajo de entrenamiento de SageMaker AI programado, registro en Model Registry y Batch Transform que deja resultados en S3."
    azure: "Un pipeline de Azure ML programado en un clúster que escala a cero y un batch endpoint."
    gcp: "Un pipeline programado, Model Registry e inferencia por lotes que escribe en BigQuery."
    tradeoffs: "Sin endpoint en línea ni feature store: no sirve para decisiones en tiempo real y las features se recalculan en cada pipeline."
  - name: "MLOps completo"
    when: "Varios modelos, alguno en línea con latencia baja, y un equipo que despliega cada semana."
    cost: 2
    ops: 2
    onprem: "Kubernetes con GPU Operator, Kubeflow Pipelines, Feast con Redis, MLflow, KServe y Evidently, como en el diagrama."
    aws: "El diseño del diagrama: Feature Store, Pipelines, Model Registry, endpoint con autoescalado, Batch con GPU y Model Monitor."
    azure: "El diseño del diagrama con feature store gestionado, registro compartido, managed online endpoint con canary y monitorización."
    gcp: "El diseño del diagrama: Feature Store sobre BigQuery, Pipelines, Model Registry, endpoint, batch y Model Monitoring."
    tradeoffs: "El endpoint en línea y el almacén de features en línea tienen coste fijo; necesitas a alguien que sea dueño de la plataforma."
  - name: "Plataforma de ML multiequipo"
    when: "Decenas de modelos, varios equipos compartiendo GPU y requisitos de auditoría de modelos."
    cost: 4
    ops: 3
    onprem: "Clúster de GPU con Kueue y MIG, varios espacios de nombres por equipo, MLflow central con permisos y KServe con ModelMesh para muchos modelos pequeños."
    aws: "Cuentas por entorno, registro central compartido entre cuentas, endpoints multimodelo y planes de ahorro de SageMaker AI."
    azure: "Workspaces por equipo con registro común, cuotas y clústeres por equipo, y endpoints con red privada."
    gcp: "Proyectos por equipo, Model Registry central, reservas de GPU y endpoints privados."
    tradeoffs: "Coste y gobierno altos; el valor está en reutilizar features y en que cada equipo no reinvente su pipeline."
extensions:
  - name: "Registro de experimentos"
    when: "Cuando hay que comparar cientos de ejecuciones y saber qué dio cada métrica."
    cost: "low"
    onprem: "MLflow Tracking"
    aws: "MLflow gestionado en SageMaker AI"
    azure: "Azure ML (compatible con MLflow)"
    gcp: "Vertex AI Experiments"
  - name: "Colas de GPU y Spot"
    when: "Cuando varios equipos compiten por GPU o el entrenamiento es largo y tolera interrupciones."
    cost: "low"
    onprem: "Kueue + MIG"
    aws: "Managed Spot Training"
    azure: "VM de baja prioridad en clústeres"
    gcp: "VM Spot en entrenamiento"
  - name: "Despliegue canary o en sombra"
    when: "Cuando un modelo nuevo puede empeorar el negocio aunque mejore las métricas fuera de línea."
    cost: "medium"
    onprem: "Canary de KServe"
    aws: "Shadow tests de SageMaker AI"
    azure: "Tráfico espejo en endpoints"
    gcp: "Reparto de tráfico del endpoint"
  - name: "Explicabilidad y sesgo"
    when: "Cuando el modelo decide sobre personas (crédito, selección, salud) y hay que justificarlo."
    cost: "low"
    onprem: "SHAP + Evidently"
    aws: "SageMaker Clarify"
    azure: "Panel de IA responsable"
    gcp: "Vertex Explainable AI"
  - name: "Muchos modelos pequeños"
    when: "Cuando hay un modelo por cliente o por tienda y un endpoint por modelo no es viable."
    cost: "medium"
    onprem: "KServe ModelMesh"
    aws: "Endpoints multimodelo"
    azure: "Varios despliegues por endpoint"
    gcp: "Despliegue compartido de recursos"
savings:
  - "Entrena en capacidad Spot o de baja prioridad (Managed Spot Training, VM de baja prioridad, VM Spot) guardando checkpoints para reanudar tras una interrupción."
  - "Si la decisión no es en tiempo real, usa inferencia por lotes: paga solo mientras corre el trabajo, en lugar de un endpoint encendido 24 horas."
  - "Sirve modelos pequeños en CPU (incluido ARM/Graviton) y reserva las GPU para modelos que de verdad las necesitan; mide latencia antes de decidir."
  - "Activa el apagado por inactividad de notebooks y compute instances: suelen ser el mayor gasto oculto de un equipo de ciencia de datos."
  - "Configura autoescalado del endpoint por invocaciones y bájalo a mínimo fuera de horario si el tráfico lo permite."
  - "Con uso estable, los Savings Plans de SageMaker AI, las reservas de Azure o los descuentos por compromiso de Google rebajan el coste del cómputo de entrenamiento y servicio."
---

## Cuándo lo necesitas

Cuando un modelo deja de ser un experimento y otros sistemas dependen de sus predicciones: puntuación de riesgo en cada pedido, previsión de demanda cada noche, recomendaciones en la web. A partir de ahí aparecen preguntas que un notebook no responde: con qué datos se entrenó la versión que está en producción, quién aprobó el cambio, por qué las predicciones de hoy son peores que las del mes pasado y cómo volver a la versión anterior en cinco minutos.

No lo necesitas si el modelo se reentrena dos veces al año y se usa en un informe. Sí cuando hay varios modelos, despliegues frecuentes o decisiones automáticas sobre clientes.

## Escenarios

- **Startup con un modelo de puntuación.** Batch primero: entrenamiento programado, registro con aprobación manual y predicciones calculadas cada noche en una tabla. El endpoint en línea llega cuando producto necesita la predicción en el momento de la petición.
- **Banco o aseguradora regulados.** El registro de modelos es la pieza de auditoría: cada versión con su dataset, métricas, informe de sesgo y aprobación firmada. Explicabilidad obligatoria y despliegue en sombra antes de afectar a clientes. Todo en región de la UE y con endpoints privados.
- **Comercio con picos de campaña.** El endpoint escala por invocaciones; la previsión de demanda se reentrena con más frecuencia en temporada porque los patrones cambian. La deriva se vigila a diario.
- **Cliente que exige on-premises.** Kubeflow, MLflow, Feast y KServe sobre Kubernetes con GPU propias. El cuello de botella no es el software, sino conseguir y repartir las GPU.
- **Muchos modelos pequeños.** Un modelo por tienda o por cliente: endpoints multimodelo o ModelMesh y pipelines parametrizados, no un pipeline por modelo.

## Cómo encaja

Los datos de entrenamiento salen del almacenamiento de objetos o del lakehouse. Las features que también se usan al servir (importe medio del cliente en 30 días, número de pedidos este mes) se definen una sola vez en el feature store: su almacén fuera de línea da datos históricos con corrección temporal para entrenar, y su almacén en línea da el último valor con baja latencia al endpoint.

El pipeline de entrenamiento lee datos y features, entrena en instancias con GPU, evalúa contra un conjunto de prueba fijo y contra el modelo actual, y si mejora registra la nueva versión con sus métricas y su linaje. El registro es la frontera: una versión pasa a producción solo cuando alguien (o una regla automática) la aprueba.

La **promoción** despliega la versión aprobada en el endpoint en línea, idealmente primero con una parte del tráfico. El mismo modelo registrado alimenta la **inferencia por lotes**, que puntúa millones de filas de una vez y escribe el resultado donde lo leen otros sistemas.

El endpoint registra entradas y salidas. La monitorización compara su distribución con la del entrenamiento (deriva de datos) y, cuando llegan las etiquetas reales, mide la calidad. Si se cruzan umbrales, lanza el pipeline de **reentrenamiento** y el ciclo vuelve a empezar.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host con GPU.** Para un equipo de una o dos personas: MLflow con PostgreSQL y MinIO para artefactos, un contenedor de entrenamiento con el NVIDIA Container Toolkit, un servidor de inferencia (BentoML, FastAPI o Triton) detrás de Caddy, y Evidently generando informes desde los registros de predicciones. Copias de PostgreSQL y del bucket de artefactos; sin ellos, el registro no vale nada.

**Kubernetes on-premises (k3s o RKE2).** NVIDIA GPU Operator, Kubeflow Pipelines o Argo Workflows, Kueue para colas de GPU, KServe con Knative para escalar a cero los modelos poco usados, Feast con Redis, CloudNativePG para MLflow y cert-manager para TLS. Es la opción con más piezas; justifícala con varios equipos o con requisitos de soberanía.

**Cloud sin Kubernetes.** SageMaker AI, Azure Machine Learning o Vertex AI: cómputo gestionado para entrenar, registro y endpoints sin clúster propio. Es la opción por defecto en cloud. Un modelo pequeño en CPU también puede servirse en Cloud Run, Container Apps o Lambda con la imagen generada desde el registro.

**Kubernetes gestionado (EKS, AKS, GKE).** Compensa si quieres la misma pila (Kubeflow, KServe) en cloud y on-premises, o si sirves muchos modelos y el coste por endpoint gestionado se dispara.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose con GPU | Bajo | Media | Un host | Equipo pequeño, prototipo |
| Kubernetes on-prem | Alto (GPU) | Alta | Por nodos de GPU | Soberanía, GPU propias |
| Plataforma ML gestionada | Por uso | Baja | Automático | Opción por defecto |
| Kubernetes gestionado | Medio | Media | Horizontal | Portabilidad, muchos modelos |

## Decisiones clave

- **En línea o por lotes.** Batch es más barato, más simple de monitorizar y tolera fallos; en línea solo cuando la predicción depende de datos del momento de la petición.
- **Feature store sí o no.** Con un modelo y features sencillas, una tabla bien versionada basta. Cuando varias features se usan en línea y en entrenamiento, el feature store evita el desajuste entre ambos, que es la causa más común de modelos que funcionan en pruebas y fallan en producción.
- **Plataforma gestionada o pila abierta.** La gestionada reduce operación y da GPU bajo demanda; la abierta (Kubeflow, MLflow, KServe) es portable y evita depender de nombres de producto que cambian, como muestran los renombrados de SageMaker AI y Vertex AI.
- **Aprobación humana o automática.** Automática para modelos de bajo riesgo con buenas métricas de control; humana, con evidencia en el registro, cuando el modelo decide sobre personas.

## Errores habituales

- Calcular las features de una forma en el notebook y de otra en el servicio en línea.
- Evaluar con datos que se solapan en el tiempo con el entrenamiento y sobreestimar la calidad.
- Desplegar directamente desde el pipeline sin pasar por el registro ni dejar una versión anterior a la que volver.
- Monitorizar latencia y errores, pero no la distribución de entradas ni la calidad de las predicciones.
- Dejar endpoints y notebooks con GPU encendidos durante semanas sin uso.
- Reentrenar automáticamente con datos corruptos y promocionar el modelo resultante sin evaluación.
