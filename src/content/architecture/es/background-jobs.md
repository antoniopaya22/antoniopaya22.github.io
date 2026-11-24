---
title: "Colas y trabajos en segundo plano"
short: "Colas y workers"
summary: "Sacar del ciclo petición-respuesta todo lo lento o frágil: la API encola, los workers procesan a su ritmo y escalan con la cola, y lo que falla una y otra vez acaba aislado en una cola de mensajes fallidos."
description: "Colas, workers autoescalados, DLQ, tareas programadas, reintentos e idempotencia: arquitectura de referencia en AWS, Azure, GCP y on-premises."
order: 5
requirements:
  - "La API responde en cuanto el trabajo queda encolado, sin esperar al resultado."
  - "Un trabajo puede ejecutarse más de una vez sin producir efectos duplicados."
  - "Los fallos transitorios se reintentan con espera creciente; los persistentes van a una DLQ."
  - "Los workers escalan con la profundidad de la cola y bajan al mínimo cuando no hay trabajo."
  - "El estado de cada trabajo se puede consultar en todo momento."
  - "Las tareas programadas no se solapan ni se pierden en silencio."
platforms:
  onprem:
    summary: "RabbitMQ como cola con su dead-letter exchange, workers en Kubernetes escalados por KEDA según la longitud de la cola y `CronJob` para lo periódico."
    notes:
      - "Usa colas quorum: replican los mensajes y tienen límite de entregas, así un mensaje envenenado acaba en el DLX en lugar de reencolarse para siempre."
      - "KEDA lee la longitud de la cola y escala el `Deployment` (o lanza `Job`s), incluso a cero."
      - "En el `CronJob`, `concurrencyPolicy: Forbid` evita solapes y `startingDeadlineSeconds` decide qué pasa con las ejecuciones perdidas."
      - "RabbitMQ no trae reintento con retardo: se monta con colas de espera con TTL que devuelven el mensaje a la cola original, o con el plugin de mensajes retrasados."
      - "El coste es operar el clúster de RabbitMQ (réplicas, discos, actualizaciones) y la capacidad de nodos para los picos."
  aws:
    summary: "La API y EventBridge Scheduler publican en SQS; los workers son tareas de ECS Fargate escaladas por backlog o funciones Lambda con mapeo de origen de eventos, y la DLQ es otra cola SQS con política de redrive."
    notes:
      - "El tiempo de visibilidad de SQS debe superar la duración del trabajo; con Lambda, AWS recomienda al menos seis veces el timeout de la función."
      - "Con Lambda, activa `ReportBatchItemFailures` para que un mensaje malo no obligue a reintentar el lote entero."
      - "Lambda encaja con trabajos de minutos; para trabajos largos o con mucha memoria, Fargate con autoescalado sobre el backlog por tarea."
      - "SQS estándar entrega al menos una vez y sin orden; FIFO añade orden por grupo y deduplicación a cambio de menos rendimiento."
      - "SQS se paga por petición y Lambda por invocación y duración; Fargate por tiempo de tarea, así que bajar a cero o al mínimo importa."
  azure:
    summary: "Colas de Service Bus con su subcola de mensajes fallidos, workers en Container Apps escalados por el scaler de KEDA para Service Bus y Container Apps Jobs para lo programado."
    notes:
      - "Cada cola de Service Bus incluye su subcola de mensajes fallidos; un mensaje llega allí al superar el número máximo de entregas o al expirar, si lo activas."
      - "Recibe en modo peek-lock y renueva el bloqueo en trabajos largos: si caduca, otro worker recibe el mismo mensaje."
      - "Container Apps admite reglas de escala KEDA en apps y también jobs disparados por eventos, útiles cuando cada mensaje es un trabajo largo."
      - "Los mensajes programados de Service Bus sirven para reintentos con retardo sin infraestructura adicional."
      - "El nivel Standard se paga por operación; Premium tiene coste fijo por unidad de mensajería a cambio de aislamiento y rendimiento predecible."
  gcp:
    summary: "La API y Cloud Scheduler publican en Pub/Sub; una suscripción push entrega cada mensaje a Cloud Run y una política de dead-letter aparta los que fallan."
    notes:
      - "Con push, Cloud Run escala por peticiones entrantes, no por profundidad: Pub/Sub ajusta el ritmo según las respuestas. Para consumir en pull continuo existen los worker pools de Cloud Run."
      - "Si necesitas limitar el ritmo, programar cada tarea o deduplicar por nombre, Cloud Tasks encaja mejor que Pub/Sub como cola de trabajos."
      - "El dead-letter se configura en la suscripción y requiere permisos de la cuenta de servicio de Pub/Sub sobre el tema destino; el recuento de intentos es aproximado."
      - "El plazo de confirmación y el timeout de la petición en Cloud Run deben cubrir la duración del trabajo; para lotes largos, mejor Cloud Run jobs."
      - "Pub/Sub se paga por volumen de datos; Cloud Run, por CPU y memoria mientras atiende peticiones."
tiers:
  - name: "Cola local o serverless"
    when: "Un producto pequeño con trabajos de segundos o pocos minutos, volumen modesto y un equipo que no quiere operar un broker."
    cost: 1
    ops: 1
    onprem: "Un host con Docker Compose: Celery con Valkey (Redis) como broker, un único `celery beat` para lo programado y PostgreSQL para el estado; RabbitMQ si no aceptas perder mensajes al reiniciar."
    aws: "SQS con su DLQ, Lambda con mapeo de origen de eventos como worker y EventBridge Scheduler para lo periódico."
    azure: "Service Bus Standard, Container Apps con mínimo cero réplicas escalado por KEDA y Container Apps Jobs con disparador programado."
    gcp: "Pub/Sub con suscripción push hacia Cloud Run con mínimo cero instancias, política de dead-letter y Cloud Scheduler."
    tradeoffs: "Límites de duración (15 minutos en Lambda, el timeout de la petición en push) y poco control del ritmo; en Celery con Redis, la entrega depende de la persistencia que configures."
  - name: "Workers autoescalados"
    when: "Volumen sostenido, trabajos de hasta horas y varios tipos de trabajo con prioridades distintas."
    cost: 2
    ops: 2
    onprem: "RabbitMQ con colas quorum en tres nodos, workers en Kubernetes escalados por KEDA (incluso a cero) y `CronJob` con `concurrencyPolicy: Forbid`."
    aws: "SQS y tareas de ECS Fargate escaladas por backlog por tarea, con Fargate Spot para la capacidad que se puede interrumpir."
    azure: "Service Bus con colas por tipo de trabajo, Container Apps con el scaler de KEDA para Service Bus y jobs disparados por eventos para lo largo."
    gcp: "Pub/Sub con worker pools de Cloud Run en pull, o Cloud Tasks cuando hace falta limitar el ritmo, y Cloud Run jobs para lotes."
    tradeoffs: "Hay que ajustar visibilidad, bloqueos, concurrencia y límites de escalado; el coste base sube si mantienes workers calientes."
  - name: "Ejecutor batch para trabajos largos y GPU"
    when: "Renderizado, transcodificación, inferencia por lotes o cálculos de horas que necesitan GPU, mucha memoria o máquinas Spot."
    cost: 3
    ops: 2
    onprem: "Kubernetes con Kueue para encolar y repartir `Job`s entre nodos con GPU (NVIDIA GPU Operator), con cuotas por equipo."
    aws: "AWS Batch con entornos de cómputo EC2 (GPU y Spot) o Fargate; EventBridge Pipes lleva los mensajes de SQS a la cola de Batch."
    azure: "Azure Batch con pools de VM con GPU y VM de acceso puntual, alimentado desde Service Bus por un despachador."
    gcp: "Batch de Google Cloud con GPU y VM Spot, lanzado por un despachador en Cloud Run a partir de Pub/Sub."
    tradeoffs: "Arranques de minutos (aprovisionar VM y descargar la imagen), otra pieza que operar y facturas que crecen deprisa si no limitas vCPU y GPU."
extensions:
  - name: "Reintento con retardo"
    when: "Cuando los fallos son de terceros que se recuperan solos y reintentar al instante solo empeora la situación."
    cost: "low"
    onprem: "Colas de espera con TTL o plugin delayed"
    aws: "Cambio de visibilidad en SQS"
    azure: "Mensajes programados de Service Bus"
    gcp: "Cloud Tasks con hora programada"
  - name: "Control de ritmo hacia terceros"
    when: "Cuando una API externa tiene cuota y el autoescalado de workers la desbordaría."
    cost: "low"
    onprem: "Token bucket en Valkey"
    aws: "Concurrencia máxima del mapeo SQS-Lambda"
    azure: "Máximo de réplicas en Container Apps"
    gcp: "Límites de ritmo de Cloud Tasks"
  - name: "Prioridades"
    when: "Cuando los trabajos interactivos no pueden esperar detrás de un lote nocturno."
    cost: "low"
    onprem: "Una cola por prioridad en RabbitMQ"
    aws: "Una cola SQS por prioridad"
    azure: "Una cola de Service Bus por prioridad"
    gcp: "Un tema y suscripción por prioridad"
  - name: "Ejecutor batch con GPU"
    when: "Cuando algunos trabajos duran horas, necesitan GPU o pueden correr en Spot con reintento."
    cost: "high"
    onprem: "Kueue + Jobs en nodos GPU"
    aws: "AWS Batch"
    azure: "Azure Batch"
    gcp: "Batch (Google Cloud)"
  - name: "Flujos de varios pasos"
    when: "Cuando un trabajo encadena pasos con esperas, compensaciones o aprobación humana."
    cost: "medium"
    onprem: "Temporal"
    aws: "Step Functions"
    azure: "Durable Functions"
    gcp: "Workflows"
  - name: "Aviso de finalización"
    when: "Cuando el cliente no debe sondear el estado y prefiere recibir un webhook o una notificación en vivo."
    cost: "low"
    onprem: "SSE desde la API + webhooks"
    aws: "Amazon SNS"
    azure: "Event Grid"
    gcp: "Pub/Sub (tema de resultados)"
savings:
  - "Ejecuta los workers idempotentes en capacidad interrumpible: Fargate Spot, Spot en AWS Batch, VM de acceso puntual en Azure Batch y VM Spot en Batch de Google Cloud. Un worker idempotente tolera la interrupción sin perder trabajo."
  - "Escala a cero fuera de horas: KEDA en Kubernetes, Container Apps con mínimo cero, Cloud Run y Lambda no cobran cómputo con la cola vacía; el coste fijo queda en el broker."
  - "En SQS usa long polling (`WaitTimeSeconds` hasta 20 s) y envío y recepción por lotes: se paga por petición, y las recepciones vacías también son peticiones."
  - "Lambda en `arm64` y Fargate en Graviton tienen menor precio por unidad de cómputo que x86; las imágenes de workers suelen compilar para ARM sin cambios."
  - "Aplica reglas de ciclo de vida a los resultados en almacenamiento de objetos: caducidad automática para lo temporal y clases infrecuentes o de archivo para lo que se guarda por obligación."
  - "Mantén Service Bus en Standard mientras el volumen lo permita; Premium tiene coste fijo por unidad de mensajería y solo compensa cuando necesitas aislamiento o rendimiento predecible."
---

## Cuándo lo necesitas

Cuando una petición dispara algo que tarda más de lo que el usuario debe esperar o que depende de un tercero poco fiable: generar un PDF, enviar mil correos, recalcular un informe, llamar a una API externa con límites. También cuando hay trabajo periódico (cierres diarios, limpiezas, sincronizaciones). Si lo haces dentro de la petición, un pico o un tercero lento tumban la API; con una cola, el pico se convierte en retraso.

## Escenarios

### MVP con Celery y Redis

Un equipo Python con un solo servidor no necesita un broker gestionado el primer día. Celery con Valkey (o Redis) como broker y `celery beat` para lo periódico resuelven el caso en un `docker-compose.yml`. Dos condiciones: activa la persistencia AOF del broker o acepta que un reinicio pierde mensajes, y ajusta `visibility_timeout` por encima del trabajo más largo, porque con Redis un trabajo sin confirmar se reentrega a otro worker al vencer. Si esas garantías importan, cambia el broker a RabbitMQ; el código de las tareas no cambia.

### Trabajos largos o con GPU

Transcodificar vídeo, renderizar o lanzar inferencia por lotes no encaja en una función ni en un worker siempre encendido. Aquí el ejecutor cambia: la API sigue encolando igual, pero un despachador entrega esos trabajos a AWS Batch (o Azure Batch, Batch de Google Cloud, Kueue on-premises), que aprovisiona máquinas con GPU o Spot, ejecuta el contenedor y las apaga. Batch aporta reintentos por intento, timeout por trabajo y trabajos en array.

### Tareas programadas críticas

Un cierre contable o una facturación mensual no pueden ejecutarse dos veces ni saltarse. El planificador solo encola un mensaje con una clave del periodo (`cierre:2026-11-24`) y una restricción única en la tabla de trabajos impide el duplicado. Programa en UTC o en una zona explícita (EventBridge Scheduler y Cloud Scheduler admiten zona horaria; el `CronJob`, `timeZone`), vigila los cambios de hora y alerta si la ejecución esperada no ha terminado a tiempo.

### Integración con un tercero limitado

Si el proveedor admite cien peticiones por minuto, el autoescalado es tu enemigo. Limita la concurrencia de los workers de esa cola o usa una cola con control de ritmo (Cloud Tasks), respeta `Retry-After` y aparta los mensajes de ese tercero en su propia cola para que su caída no bloquee el resto.

## Cómo encaja

La API valida la petición, registra el trabajo como pendiente en la base de datos, encola un mensaje con su identificador y devuelve `202 Accepted` con la URL de estado. El planificador hace lo mismo a horas fijas: nunca ejecuta el trabajo, solo lo encola, así hereda reintentos, DLQ y escalado. La cola absorbe la ráfaga y su profundidad es la señal de escalado.

Cada worker toma un mensaje, lo procesa, guarda el resultado pesado en almacenamiento de objetos, actualiza el estado en la base de datos y solo entonces confirma el mensaje. Si falla, el mensaje vuelve a la cola tras el tiempo de visibilidad o bloqueo y se reintenta. Tras N intentos pasa a la cola de mensajes fallidos, donde alguien lo revisa y decide si reprocesarlo.

El ejecutor es intercambiable si el contrato es estable: un mensaje con `job_id`, tipo, clave de idempotencia y referencias a los datos (nunca los datos), y una imagen de contenedor con un punto de entrada del tipo `run-job <job_id>`. Esa misma imagen corre como worker de Celery, como tarea de Fargate o como trabajo de AWS Batch; lo que cambia es quién la arranca. Los eventos de cambio de estado de Batch actualizan la misma tabla de trabajos.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Contenedores `api`, `worker` (con `--concurrency` acorde a la CPU), un único `beat`, el broker (Valkey con AOF o RabbitMQ) con volumen persistente y PostgreSQL para el estado. Los resultados van a un almacenamiento S3 compatible (Ceph RGW si ya existe; en un solo host, Garage o SeaweedFS). Copia la base de datos; el broker solo contiene trabajo pendiente, pero su volumen evita perderlo al reiniciar.

**Kubernetes on-premises.** El operador de RabbitMQ crea el clúster con colas quorum, KEDA escala el `Deployment` de workers con un `ScaledObject` o lanza un `Job` por mensaje con `ScaledJob`, y los `CronJob` cubren lo periódico. CloudNativePG o Patroni para el estado. Para GPU, NVIDIA GPU Operator y Kueue, que encola `Job`s hasta que hay cuota y nodos.

**Cloud sin Kubernetes.** Es el diseño del diagrama: SQS con Lambda o Fargate, Service Bus con Container Apps y Container Apps Jobs, Pub/Sub con Cloud Run y Cloud Scheduler. Para trabajos largos o con GPU, AWS Batch, Azure Batch o Batch de Google Cloud.

**Kubernetes gestionado.** EKS, AKS o GKE compensan si ya ejecutan la API y quieres un único modelo para servicios, workers y lotes. KEDA viene como complemento en AKS y se instala con Helm en los demás; en EKS, Karpenter aprovisiona nodos Spot o con GPU solo mientras hay trabajos.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Compose + Celery | Un host | Media | Manual | MVP, volumen bajo |
| Kubernetes + KEDA | Clúster y broker | Alta | Por profundidad de cola, a cero | On-premises, muchos tipos de trabajo |
| Cola gestionada + serverless | Casi nulo | Baja | Automático | Opción por defecto en cloud |
| Servicio batch | Nulo sin trabajos | Media | Por trabajo, con Spot y GPU | Trabajos de horas o con GPU |

## Decisiones clave

- **Contenedores o funciones para los workers.** Las funciones escalan solas y cobran por uso, pero tienen límite de duración; los contenedores aguantan trabajos largos y dependencias pesadas.
- **Ejecutor según el tipo de trabajo.** Cola con workers para lo corto y frecuente; servicio batch para lo largo, con GPU o en Spot. Con un contrato común, mover un tipo de trabajo de uno a otro es configuración.
- **Cola o bus.** Para trabajo que debe hacer exactamente un tipo de worker, una cola. Si varios sistemas reaccionan al mismo hecho, eso es un evento y va a un bus.
- **Push o pull.** Push simplifica el worker (es un endpoint HTTP) pero cede el control del ritmo; pull da control fino de concurrencia a cambio de gestionar el consumo.
- **Gestionado o autogestionado.** RabbitMQ ofrece flexibilidad de enrutado; una cola gestionada elimina la operación pero impone sus límites de tamaño y duración.

## Errores habituales

- Asumir entrega exactamente una vez. Todas estas colas entregan al menos una vez: el worker debe ser idempotente, por ejemplo con una clave de idempotencia y una restricción única en la base de datos.
- Reintentar sin espera ni límite, convirtiendo un fallo de un tercero en un ataque contra él.
- Tiempo de visibilidad menor que la duración del trabajo: dos workers procesan el mismo mensaje.
- Arrancar dos `celery beat` (o dos réplicas de un planificador casero): cada tarea programada se ejecuta dos veces.
- Una DLQ sin alarma ni procedimiento de reproceso, que solo acumula.
- Meter el fichero entero en el mensaje en lugar de una referencia al objeto.
