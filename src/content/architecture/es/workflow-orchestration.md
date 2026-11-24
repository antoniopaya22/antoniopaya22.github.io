---
title: "Orquestación durable y sagas"
short: "Orquestación y sagas"
summary: "Procesos de negocio de varios pasos que sobreviven a caídas y despliegues: un orquestador durable guarda el progreso, reintenta cada paso, espera días a una aprobación humana si hace falta y, si algo falla a mitad, deshace lo hecho con compensaciones."
description: "Orquestación durable y sagas: pasos, compensaciones, aprobación humana, idempotencia y versionado en AWS, Azure, GCP y on-premises."
order: 7
requirements:
  - "El progreso del flujo se guarda tras cada paso y sobrevive a reinicios, caídas y despliegues."
  - "Cada paso se reintenta con espera creciente y es idempotente: repetirlo no duplica efectos."
  - "Si un paso falla de forma definitiva, se ejecutan las compensaciones de los pasos ya completados."
  - "El flujo puede esperar horas o días a una decisión humana sin consumir cómputo y con un plazo máximo."
  - "Un despliegue nuevo no rompe las ejecuciones que ya están en curso."
  - "Cada ejecución se puede consultar: en qué paso está, qué entradas tuvo y por qué falló."
platforms:
  onprem:
    summary: "Temporal como orquestador, con PostgreSQL como persistencia; los pasos son actividades ejecutadas por workers en Kubernetes y la aprobación humana es una señal que el flujo espera con un temporizador."
    notes:
      - "El código del flujo debe ser determinista: nada de hora del sistema, aleatorios ni llamadas de red directas; todo efecto va en una actividad y el tiempo se pide al SDK."
      - "Los cambios en flujos con ejecuciones vivas se protegen con `patched`/`GetVersion` o con Worker Versioning, que fija cada ejecución a la versión de worker que la empezó."
      - "Temporal autogestionado necesita una base de datos (PostgreSQL, MySQL o Cassandra) y operar sus servicios internos; Temporal Cloud elimina esa parte y deja los workers en tu clúster."
      - "Las señales entregan la decisión humana al flujo; combínalas con un temporizador para que la espera tenga plazo y una rama de escalado o cancelación."
      - "El coste es el clúster, la base de datos y su crecimiento: fija la retención del namespace para que el historial de ejecuciones cerradas no crezca sin límite."
  aws:
    summary: "Step Functions Standard define el flujo en Amazon States Language, invoca cada paso en Lambda con `Retry` y `Catch`, y espera la aprobación con el patrón `.waitForTaskToken`."
    notes:
      - "Standard dura hasta un año, ejecuta cada estado una sola vez salvo que configures `Retry` y guarda el historial 90 días; se paga por transición de estado."
      - "Express dura como máximo cinco minutos, entrega al menos una vez (asíncrono) o como mucho una vez (síncrono) y no admite `.waitForTaskToken` ni `.sync`: la aprobación humana exige Standard."
      - "El token de tarea se envía al aprobador (correo, chat, API interna) y vuelve con `SendTaskSuccess` o `SendTaskFailure`; pon `TimeoutSeconds` o `HeartbeatSeconds` para que no espere para siempre."
      - "Las compensaciones se modelan con `Catch` en cada paso que desemboca en los estados que deshacen lo ya hecho, en orden inverso."
      - "Si el equipo prefiere escribir el flujo en código, las funciones durables de Lambda ofrecen ejecuciones de hasta un año con reproducción determinista y callbacks, sin un servicio aparte."
  azure:
    summary: "Durable Functions en modelo de worker aislado: un orquestador en código llama a funciones de actividad, espera la aprobación con `WaitForExternalEvent` y un temporizador durable, y guarda el estado en Durable Task Scheduler."
    notes:
      - "El orquestador se reproduce desde el historial en cada avance, así que debe ser determinista: usa la hora del contexto (`CurrentUtcDateTime`) y deja toda E/S en las actividades."
      - "Durable Task Scheduler es el backend recomendado: gestionado, con panel de ejecuciones, en SKU Dedicated o Consumption; el proveedor sobre Azure Storage sigue disponible."
      - "La compatibilidad con el modelo in-process terminó el 10 de noviembre de 2026: los proyectos nuevos y los existentes deben usar el modelo de worker aislado."
      - "Para cambios incompatibles, el versionado de orquestaciones integrado asigna una versión a cada instancia; la alternativa es desplegar en paralelo con otro task hub."
      - "La aprobación llega como evento externo (`RaiseEventAsync` o la API HTTP); combínalo con `CreateTimer` y `Task.WhenAny` para fijar el plazo."
  gcp:
    summary: "Workflows define el flujo en YAML, llama a Cloud Run functions por HTTP con autenticación OIDC, reintenta con `try`/`retry`/`except` y espera la aprobación con un endpoint de callback."
    notes:
      - "`events.create_callback_endpoint` crea una URL que el aprobador llama y `events.await_callback` espera; el plazo por defecto es de 12 horas y se puede ampliar."
      - "Una ejecución puede durar hasta un año, pero las variables comparten un límite de 512 KB: pasa referencias a Cloud Storage o Firestore, no documentos grandes."
      - "Se paga por paso ejecutado, distinguiendo pasos internos y llamadas externas; las esperas no cobran cómputo, los bucles de sondeo sí cobran pasos."
      - "Las compensaciones se escriben en el bloque `except` de cada paso, llamando a los endpoints que deshacen lo ya hecho."
      - "Workflows es declarativo y limitado como lenguaje; si la lógica del flujo es compleja, Temporal sobre GKE o Temporal Cloud encajan mejor."
tiers:
  - name: "Mínimo viable"
    when: "Pocos flujos, volumen bajo y un equipo pequeño que no quiere operar infraestructura."
    cost: 1
    ops: 1
    onprem: "Un host con Docker Compose: Temporal, PostgreSQL y la interfaz web, con los workers como contenedores en el mismo host y copias diarias de la base de datos."
    aws: "Step Functions Standard con pasos en Lambda arm64 y aprobación por token de tarea enviado por correo."
    azure: "Durable Functions en Flex Consumption con Durable Task Scheduler en SKU Consumption."
    gcp: "Workflows con pasos en Cloud Run functions y un callback para la aprobación."
    tradeoffs: "Sin redundancia on-premises y con poca separación entre entornos; en la nube el coste por transición o paso crece rápido si el volumen sube."
  - name: "Equilibrado"
    when: "Producción con varios flujos de negocio, despliegues frecuentes y necesidad de versionar sin romper ejecuciones."
    cost: 2
    ops: 2
    onprem: "Temporal en Kubernetes con su chart de Helm, PostgreSQL gestionado por CloudNativePG con réplica y workers escalados con HPA o KEDA."
    aws: "Step Functions Standard para el flujo de negocio y Express anidado para subflujos cortos de alto volumen; pasos largos en ECS Fargate con `.sync`."
    azure: "Durable Functions con Durable Task Scheduler en SKU Dedicated y versionado de orquestaciones activado."
    gcp: "Workflows disparado por Eventarc, pasos en Cloud Run y trabajos largos en Cloud Run jobs."
    tradeoffs: "Más piezas que vigilar y una disciplina de versionado obligatoria; el coste ya no es despreciable si hay millones de ejecuciones."
  - name: "Escala y alta disponibilidad"
    when: "Flujos críticos de alto volumen con requisitos de disponibilidad y varios equipos publicando flujos."
    cost: 4
    ops: 3
    onprem: "Temporal con servicios separados (frontend, history, matching), persistencia en Cassandra o PostgreSQL en alta disponibilidad y visibilidad avanzada; o Temporal Cloud con workers locales."
    aws: "Step Functions en varias regiones con Distributed Map para lotes masivos, o Temporal Cloud con workers en EKS si el flujo es muy complejo."
    azure: "Durable Task Scheduler Dedicated con más unidades de capacidad, varias apps de funciones por dominio y zonas de disponibilidad."
    gcp: "Workflows por dominio con cuotas revisadas, o Temporal Cloud con workers en GKE para lógica compleja y alto volumen."
    tradeoffs: "Coste fijo alto y un equipo de plataforma dedicado; la multirregión obliga a decidir qué pasa con las ejecuciones en curso si cae una región."
extensions:
  - name: "Cola delante del orquestador"
    when: "Cuando los inicios llegan en ráfagas y quieres limitar cuántos flujos arrancan por segundo."
    cost: "low"
    onprem: "RabbitMQ"
    aws: "Amazon SQS"
    azure: "Service Bus"
    gcp: "Pub/Sub"
  - name: "Almacén de idempotencia"
    when: "Cuando los pasos llaman a terceros que no aceptan claves de idempotencia y debes deduplicar tú."
    cost: "low"
    onprem: "PostgreSQL (restricción única)"
    aws: "DynamoDB (escritura condicional)"
    azure: "Cosmos DB"
    gcp: "Firestore"
  - name: "Pasos largos en contenedores"
    when: "Cuando un paso tarda más de lo que permite una función o necesita mucha memoria."
    cost: "medium"
    onprem: "Kubernetes Job"
    aws: "ECS Fargate (`.sync`)"
    azure: "Container Apps Jobs"
    gcp: "Cloud Run jobs"
  - name: "Fan-out masivo"
    when: "Cuando un flujo procesa miles de elementos en paralelo y espera a que terminen todos."
    cost: "medium"
    onprem: "Temporal child workflows"
    aws: "Distributed Map"
    azure: "Fan-out/fan-in"
    gcp: "Pasos `parallel`"
  - name: "Arranques programados"
    when: "Cuando el flujo debe empezar a horas fijas sin un cron externo frágil."
    cost: "low"
    onprem: "Temporal Schedules"
    aws: "EventBridge Scheduler"
    azure: "Timer trigger"
    gcp: "Cloud Scheduler"
  - name: "Trazas y búsqueda de ejecuciones"
    when: "Cuando soporte necesita encontrar la ejecución de un pedido concreto y ver dónde se paró."
    cost: "medium"
    onprem: "Temporal visibility + OTel"
    aws: "CloudWatch Logs + X-Ray"
    azure: "Application Insights + panel DTS"
    gcp: "Cloud Logging + Cloud Trace"
savings:
  - "En Step Functions, anida flujos Express para los subprocesos cortos, idempotentes y de alto volumen: Standard se paga por transición y Express por ejecución, duración y memoria."
  - "Reduce transiciones y pasos: transforma datos dentro del estado con JSONata o funciones intrínsecas en lugar de encadenar estados `Pass`, y agrupa en una sola actividad las operaciones triviales."
  - "Espera con callbacks, señales o temporizadores en lugar de bucles de sondeo: la espera no cobra cómputo y cada vuelta de un bucle sí cobra transiciones o pasos."
  - "Ejecuta los pasos en Lambda arm64 o en funciones que escalan a cero; el orquestador ya guarda el estado, así que los workers no necesitan estar encendidos."
  - "Ajusta el nivel de log de Step Functions a `ERROR` en flujos Express de alto volumen y fija la retención de los grupos de logs; en Temporal, reduce la retención del namespace."
  - "En Azure, empieza con Durable Task Scheduler Consumption y pasa a Dedicated solo cuando el volumen sea sostenido y lo hayas medido."
---

## Cuándo lo necesitas

Cuando un proceso de negocio tiene varios pasos que tocan sistemas distintos y no puede quedarse a medias: un pedido que reserva stock, cobra y envía; el alta de un cliente que verifica identidad, crea cuentas y espera la firma de un responsable; una solicitud de crédito que pasa por scoring, revisión manual y desembolso. Encadenar estas llamadas en una petición HTTP o con colas sueltas funciona hasta que un paso falla a mitad: el cobro se hizo pero el envío no, y nadie sabe en qué estado quedó el pedido. Un orquestador durable guarda el progreso de cada ejecución, reintenta lo que falla y deja escrito qué hacer cuando algo no tiene arreglo.

No lo necesitas para una tarea de un solo paso (eso es una cola con workers) ni cuando varios sistemas reaccionan de forma independiente al mismo hecho sin un resultado común (eso es coreografía con eventos).

## Escenarios

### Tienda online que empieza

Un flujo de pedido con tres pasos y poco volumen. Step Functions Standard, Durable Functions o Workflows con funciones como pasos cuestan casi nada y no hay nada que operar. La saga es corta: si el cobro falla, se libera el stock; si el envío falla, se reembolsa y se libera.

### Alta de clientes con revisión manual

Verificación de identidad que a veces requiere que una persona revise documentos y tarda días. Aquí la espera humana es el centro del diseño: el flujo debe dormir sin coste, tener un plazo, escalar a otro revisor si vence y registrar quién decidió. En AWS descarta Express; en Workflows, amplía el plazo del callback por encima de las 12 horas por defecto.

### Alto volumen de flujos cortos

Miles de ejecuciones por segundo de flujos de segundos (enriquecer eventos, validar transacciones). El coste por transición de Standard se dispara: usa Express o un flujo en código dentro del propio worker, y reserva el orquestador durable para lo que de verdad dura y no es idempotente.

### Banco que exige on-premises

Los datos no pueden salir del centro de datos y el flujo tiene lógica compleja. Temporal autogestionado en Kubernetes, con PostgreSQL en alta disponibilidad y workers en los mismos namespaces que los servicios que llaman. El equipo asume operar la base de datos y actualizar Temporal.

### Equipo .NET en Azure

Durable Functions permite escribir el flujo en C# con tests unitarios normales, lo que encaja con un equipo que no quiere un lenguaje declarativo. Exige disciplina con el determinismo y con el versionado de orquestaciones.

## Cómo encaja

Un inicio (una llamada a la API o un evento) arranca una ejecución en el orquestador con un identificador de negocio, por ejemplo el número de pedido, para que un segundo inicio con el mismo identificador no cree un duplicado. El orquestador llama al paso 1, reservar stock; guarda el resultado en su historial antes de seguir. Luego llama al paso 2, cobrar, y al paso 3, enviar. Cada paso es una función o un worker sin estado que recibe una clave de idempotencia derivada de la ejecución y del paso, de modo que un reintento tras un timeout no cobre dos veces.

Cuando el proceso necesita una decisión humana, el orquestador emite un token o un endpoint de callback, lo envía al aprobador y se queda esperando sin consumir cómputo. La respuesta (señal en Temporal, token en Step Functions, evento externo en Durable Functions, callback en Workflows) reanuda la ejecución en el punto exacto. Siempre con plazo: si vence, el flujo toma una rama de escalado o cancela.

Si el cobro falla de forma definitiva, tras agotar reintentos, el orquestador ejecuta las compensaciones en orden inverso: libera el stock reservado. Si falla el envío, reembolsa y libera. Las compensaciones también son pasos idempotentes con reintentos, porque fallar a mitad de deshacer es tan posible como fallar a mitad de hacer.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Contenedores de Temporal (servidor y UI), PostgreSQL con su volumen y tus workers, detrás de un proxy inverso con TLS (Traefik o Caddy) solo para la UI y la API de inicio. Copias diarias de PostgreSQL con `pg_dump` a almacenamiento externo. Sirve para un equipo pequeño o un entorno aislado, pero un fallo del host para todos los flujos (sin perderlos, si la base de datos sobrevive).

**Kubernetes on-premises.** k3s o RKE2 con el chart de Helm de Temporal, CloudNativePG para PostgreSQL con réplica y copias a almacenamiento de objetos, cert-manager para los certificados y HPA o KEDA para escalar los workers. Es la opción cuando hay requisitos de soberanía y un equipo que ya opera Kubernetes.

**Cloud sin Kubernetes.** El orquestador gestionado (Step Functions, Durable Functions con Durable Task Scheduler, Workflows) con pasos en funciones y los pasos largos en ECS Fargate, Container Apps Jobs o Cloud Run jobs. No hay nada que parchear y el coste es casi nulo sin tráfico.

**Kubernetes gestionado.** Temporal Cloud o Temporal autogestionado con workers en EKS, AKS o GKE. Compensa cuando los flujos son complejos, el equipo quiere escribirlos en código con su lenguaje habitual y ya existe una plataforma Kubernetes.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Bajo | Media | Manual, un host | Equipo pequeño, on-premises |
| Kubernetes on-premises | Medio | Alta | HPA/KEDA sobre workers | Soberanía, plataforma existente |
| Orquestador gestionado | Casi nulo | Baja | Automático | Mayoría de casos en cloud |
| Temporal en EKS/AKS/GKE | Medio-alto | Media-alta | HPA/KEDA | Flujos complejos en código |

## Decisiones clave

- **Orquestación o coreografía.** Un orquestador da un sitio donde ver el estado y decidir las compensaciones; la coreografía con eventos acopla menos, pero el estado del proceso queda repartido y es difícil de depurar.
- **Flujo declarativo o en código.** ASL y el YAML de Workflows se ven en un diagrama y no tienen problemas de determinismo; Temporal, Durable Functions y las funciones durables de Lambda se prueban como código, pero exigen determinismo y versionado cuidadoso.
- **Standard o Express.** Standard para flujos largos, no idempotentes o con espera humana; Express para flujos cortos, idempotentes y de mucho volumen.
- **Gestionado o autogestionado.** El orquestador gestionado ata a la nube pero no se opera; Temporal es portable y potente, a cambio de una base de datos crítica y actualizaciones propias.
- **Granularidad de los pasos.** Pasos demasiado finos encarecen y alargan el historial; demasiado gruesos hacen que un reintento repita trabajo y complican la compensación.

## Errores habituales

- Pasos no idempotentes: un timeout tras un cobro correcto provoca un segundo cobro en el reintento.
- Compensaciones que asumen que el paso original llegó a ejecutarse, o que nunca se han probado.
- Esperas humanas sin plazo que dejan miles de ejecuciones abiertas durante meses.
- Desplegar un cambio en el orden de los pasos sin versionado y romper las ejecuciones en curso con errores de no determinismo.
- Meter documentos grandes en el estado del flujo en lugar de referencias a almacenamiento de objetos.
- Usar el orquestador como cola de alto volumen para tareas de un solo paso y pagar transiciones sin necesidad.
