---
title: "Colas y trabajos en segundo plano"
short: "Colas y workers"
summary: "Sacar del ciclo petición-respuesta todo lo lento o frágil: la API encola, los workers procesan a su ritmo y escalan con la cola, y lo que falla una y otra vez acaba aislado en una cola de mensajes fallidos."
description: "Colas, workers autoescalados, DLQ, tareas programadas, reintentos e idempotencia: arquitectura de referencia en AWS, Azure, GCP y on-premises."
order: 2
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
---

## Cuándo lo necesitas

Cuando una petición dispara algo que tarda más de lo que el usuario debe esperar o que depende de un tercero poco fiable: generar un PDF, enviar mil correos, recalcular un informe, llamar a una API externa con límites. También cuando hay trabajo periódico (cierres diarios, limpiezas, sincronizaciones). Si lo haces dentro de la petición, un pico o un tercero lento tumban la API; con una cola, el pico se convierte en retraso.

## Cómo encaja

La API valida la petición, registra el trabajo como pendiente en la base de datos, encola un mensaje con su identificador y devuelve `202 Accepted`. El planificador hace lo mismo a horas fijas. La cola absorbe la ráfaga y su profundidad es la señal de escalado: cuantos más mensajes esperan, más workers se arrancan.

Cada worker toma un mensaje, lo procesa, guarda el resultado pesado en almacenamiento de objetos, actualiza el estado del trabajo en la base de datos y solo entonces confirma el mensaje. Si falla, el mensaje vuelve a la cola tras el tiempo de visibilidad o bloqueo y se reintenta. Tras N intentos pasa a la cola de mensajes fallidos, donde alguien lo revisa y decide si reprocesarlo.

## Decisiones clave

- **Contenedores o funciones para los workers.** Las funciones escalan solas y cobran por uso, pero tienen límite de duración; los contenedores aguantan trabajos largos y dependencias pesadas.
- **Cola o bus.** Para trabajo que debe hacer exactamente un tipo de worker, una cola. Si varios sistemas reaccionan al mismo hecho, eso es un evento y va a un bus.
- **Push o pull.** Push simplifica el worker (es un endpoint HTTP) pero cede el control del ritmo; pull da control fino de concurrencia a cambio de gestionar el consumo.
- **Gestionado o autogestionado.** RabbitMQ ofrece flexibilidad de enrutado; una cola gestionada elimina la operación pero impone sus límites de tamaño y duración.

## Errores habituales

- Asumir entrega exactamente una vez. Todas estas colas entregan al menos una vez: el worker debe ser idempotente, por ejemplo con una clave de idempotencia y una restricción única en la base de datos.
- Reintentar sin espera ni límite, convirtiendo un fallo de un tercero en un ataque contra él.
- Tiempo de visibilidad menor que la duración del trabajo: dos workers procesan el mismo mensaje.
- Una DLQ sin alarma ni procedimiento de reproceso, que solo acumula.
- Meter el fichero entero en el mensaje en lugar de una referencia al objeto.
