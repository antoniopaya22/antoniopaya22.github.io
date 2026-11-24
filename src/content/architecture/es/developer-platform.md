---
title: "Plataforma interna de desarrollo"
short: "Plataforma interna"
summary: "Un portal con catálogo de servicios y plantillas golden path, módulos de IaC aprobados, entornos efímeros por pull request que se borran solos y coste atribuido a cada equipo."
description: "Backstage, plantillas golden path, módulos IaC aprobados, entornos por PR con TTL y coste por equipo: arquitectura en AWS, Azure, GCP y on-premises."
order: 32
requirements:
  - "Crear un servicio nuevo con CI, observabilidad y despliegue funcionando lleva minutos y no requiere abrir tickets."
  - "Toda la infraestructura sale de módulos versionados y revisados; nadie copia y pega Terraform de otro repositorio."
  - "Cada pull request puede tener su entorno de previsualización con URL propia, aislado de producción."
  - "Ningún entorno efímero sobrevive a su PR ni a su tiempo de vida máximo."
  - "Cada recurso lleva etiquetas de equipo y servicio y su coste aparece en el informe de ese equipo."
  - "El catálogo dice quién es dueño de cada servicio, de qué depende y si cumple los mínimos de la organización."
platforms:
  onprem:
    summary: "Backstage con GitLab o GitHub Enterprise, módulos de OpenTofu en un registro interno, GitLab CI y Argo CD, entornos por PR en namespaces o vCluster, OpenCost para el coste y limpieza por TTL."
    notes:
      - "El generador de pull requests de los ApplicationSet de Argo CD crea una aplicación por PR abierta y la borra al cerrarse: es la limpieza principal; el TTL cubre lo que se escapa."
      - "kube-janitor borra recursos con la anotación `janitor/ttl`, pero el proyecto original (hjacobs, en Codeberg) no tiene commits desde julio de 2023; webdevops publicó en diciembre de 2025 una reimplementación activa. Revisa cuál usas."
      - "Un namespace por PR basta si la aplicación no instala CRDs ni recursos de clúster; si los instala, vCluster da a cada PR un plano de control virtual dentro del mismo clúster."
      - "OpenCost reparte el coste de nodos por namespace, etiqueta y despliegue; on-premises tienes que darle tus propios precios por CPU, memoria y disco."
      - "OpenTofu es el fork con licencia MPL de Terraform y lee los mismos módulos; elige uno y fija la versión en la plantilla."
  aws:
    summary: "Backstage en ECS Fargate, GitHub Actions con OIDC hacia AWS, módulos Terraform en un registro privado, un servicio ECS por PR detrás de un ALB compartido, etiquetas de asignación de costes y EventBridge Scheduler para el TTL."
    notes:
      - "AWS Proton dejó de admitir clientes nuevos el 7 de octubre de 2025 y terminó su soporte el 7 de octubre de 2026: no hay portal de plataforma propio de AWS. AWS Service Catalog sigue disponible para publicar productos aprobados."
      - "Un ALB compartido con una regla por cabecera `Host` (`pr-123.preview.ejemplo.com`) evita pagar un balanceador por PR; las reglas por listener tienen cuota, vigílala si hay muchas PR abiertas."
      - "EventBridge Scheduler admite programaciones de una sola ejecución que se borran al completarse: créala en el despliegue con la fecha de caducidad y que invoque la limpieza."
      - "Las etiquetas de asignación de costes hay que activarlas en Billing; para repartir un clúster ECS o EKS entre equipos, activa los datos de asignación de costes divididos."
      - "GitHub Actions entra en AWS con un rol federado por OIDC, restringido por repositorio y rama en la política de confianza; sin claves de larga duración."
  azure:
    summary: "Backstage en Container Apps, GitHub Actions con identidad federada, módulos Terraform aprobados, revisiones etiquetadas de Container Apps por PR, Cost Management por etiquetas y una Function con temporizador para el TTL."
    notes:
      - "Azure Deployment Environments está en modo mantenimiento y se retira el 22 de febrero de 2027 (anunciado en octubre de 2026) sin sucesor: no construyas la plataforma sobre él."
      - "En modo de revisiones múltiples, cada PR despliega una revisión con la etiqueta `pr-123` y obtiene una URL estable sin recibir tráfico de producción. Existe además un modo de etiquetas de despliegue en preview."
      - "Las revisiones comparten la configuración de aplicación (secretos, ingress, Dapr): si una PR cambia secretos o necesita aislamiento real, crea una Container App por PR en un entorno compartido."
      - "Las revisiones inactivas no se cobran y Container Apps conserva hasta 100; la Function con temporizador quita etiquetas caducadas y desactiva sus revisiones."
      - "Cost Management agrupa por etiquetas y puede heredar etiquetas de la suscripción y del grupo de recursos, lo que rellena recursos que los equipos olvidan etiquetar."
  gcp:
    summary: "Backstage en Cloud Run, Cloud Build con disparadores por PR, módulos Terraform aprobados, revisiones etiquetadas de Cloud Run por PR, exportación de facturación con etiquetas y Cloud Scheduler para el TTL."
    notes:
      - "`gcloud run deploy --no-traffic --tag pr-123` crea una revisión con URL propia, cuyo subdominio empieza por el nombre de la etiqueta, que no recibe tráfico de producción."
      - "Las revisiones etiquetadas no heredan las instancias mínimas del servicio, así que escalan a cero; quita las etiquetas caducadas para no acumular revisiones accesibles."
      - "Application Design Center (GA en diciembre de 2025) ofrece un catálogo gobernado de plantillas Terraform conectado a App Hub; no es un Backstage gestionado, pero cubre parte de las plantillas aprobadas."
      - "Para ver el coste por equipo, exporta la facturación a BigQuery: las etiquetas de los recursos llegan como columnas y se consultan o se muestran en un panel."
      - "Si el código vive en GitHub, GitHub Actions con Workload Identity Federation es igual de válido que Cloud Build; elige uno para toda la organización."
tiers:
  - name: "Plantillas y catálogo"
    when: "Entre cinco y quince equipos que quieren dejar de copiar repositorios y saber de quién es cada servicio."
    cost: 1
    ops: 1
    onprem: "Backstage con catálogo y plantillas en un contenedor con PostgreSQL, módulos OpenTofu etiquetados en Git y CI existente."
    aws: "Backstage en una tarea Fargate con RDS PostgreSQL pequeño, plantillas que crean el repositorio con su workflow de GitHub Actions."
    azure: "Backstage en Container Apps con PostgreSQL Flexible Burstable, plantillas que crean repositorio, pipeline e identidad federada."
    gcp: "Backstage en Cloud Run con Cloud SQL pequeño, plantillas que crean repositorio y disparador de Cloud Build."
    tradeoffs: "Sin entornos por PR: las pruebas de integración siguen haciéndose en un staging compartido que se convierte en cuello de botella."
  - name: "Entornos efímeros por PR"
    when: "Equipos que revisan cambios en un entorno real antes de fusionar y producto que quiere probar cada rama."
    cost: 2
    ops: 2
    onprem: "Argo CD con ApplicationSet por PR, un namespace por PR con cuotas, base de datos sembrada por PR y limpieza por TTL."
    aws: "Servicio ECS por PR en Fargate Spot tras un ALB compartido, base de datos de previsualización compartida con un esquema por PR y EventBridge Scheduler."
    azure: "Revisión etiquetada o Container App por PR en un entorno compartido, esquema por PR y Function con temporizador."
    gcp: "Revisión etiquetada de Cloud Run por PR, esquema por PR en Cloud SQL y Cloud Scheduler que retira etiquetas caducadas."
    tradeoffs: "Cada PR consume recursos y los datos de prueba hay que mantenerlos; sin TTL la factura crece en silencio."
  - name: "Plataforma a escala"
    when: "Decenas de equipos, varios clústeres o cuentas y un equipo de plataforma dedicado con su propio roadmap."
    cost: 3
    ops: 3
    onprem: "Backstage con scorecards, vCluster por PR, política como código en los módulos, OpenCost con precios internos y varios clústeres gestionados por Argo CD."
    aws: "Backstage en EKS o ECS, cuentas por equipo en Organizations, módulos con Conftest y SCP, informes de coste por equipo y entornos por PR."
    azure: "Backstage en AKS o Container Apps, suscripciones por equipo, Azure Policy, Cost Management por etiqueta y entornos por PR."
    gcp: "Backstage en GKE o Cloud Run, proyectos por equipo, Organization Policy, exportación de facturación a BigQuery y entornos por PR."
    tradeoffs: "Backstage es un producto que hay que mantener (actualizaciones mensuales, plugins, migraciones): sin equipo dedicado, se degrada."
extensions:
  - name: "Scorecards de madurez"
    when: "Cuando quieres medir qué servicios cumplen los mínimos (dueño, alertas, SBOM, versión soportada)."
    cost: "low"
    onprem: "Tech Insights de Backstage"
    aws: "Tech Insights + Security Hub"
    azure: "Tech Insights + Defender for Cloud"
    gcp: "Tech Insights + Security Command Center"
  - name: "Política como código en IaC"
    when: "Cuando los módulos aprobados no bastan y hay que impedir configuraciones prohibidas en cualquier plan."
    cost: "low"
    onprem: "OPA y Conftest"
    aws: "Conftest + SCP"
    azure: "Conftest + Azure Policy"
    gcp: "Conftest + Organization Policy"
  - name: "Base de datos por PR"
    when: "Cuando las migraciones de una PR rompen el esquema compartido de previsualización."
    cost: "medium"
    onprem: "CloudNativePG por namespace"
    aws: "Clonado rápido de Aurora"
    azure: "Restauración PITR en Flexible Server"
    gcp: "Clon de Cloud SQL"
  - name: "Secretos para entornos efímeros"
    when: "Siempre que el entorno de PR necesite credenciales: deben ser propias y caducar con él."
    cost: "low"
    onprem: "OpenBao + External Secrets"
    aws: "Secrets Manager"
    azure: "Key Vault"
    gcp: "Secret Manager"
  - name: "Portal gestionado"
    when: "Cuando quieres el catálogo y las plantillas sin operar Backstage tú mismo."
    cost: "medium"
    onprem: "Red Hat Developer Hub"
    aws: "Roadie o Spotify Portal (SaaS)"
    azure: "Roadie o Spotify Portal (SaaS)"
    gcp: "Application Design Center"
savings:
  - "Borra el entorno al cerrar la PR desde el propio pipeline y deja el TTL como red de seguridad: la mayoría de entornos huérfanos vienen de PR abandonadas, no cerradas."
  - "Comparte la infraestructura cara entre todas las PR: un ALB, un entorno de Container Apps o un clúster con un namespace por PR, nunca un balanceador o un clúster por rama."
  - "Ejecuta los entornos de PR en Fargate Spot o escalando a cero (revisiones etiquetadas de Cloud Run, Container Apps con mínimo cero): casi nadie los usa fuera del horario de revisión."
  - "Usa un esquema por PR en una base de datos de previsualización compartida en lugar de una instancia por PR; reserva los clones para las PR que cambian migraciones."
  - "Haz obligatorias las etiquetas `team`, `service` y `pr` en los módulos aprobados y rechaza en CI los planes sin ellas: lo que no se etiqueta no se puede atribuir ni limpiar."
  - "Usa runners de CI en ARM o Spot y cachea dependencias e imágenes: con muchas PR, los minutos de CI pesan tanto como los entornos."
---

## Cuándo lo necesitas

Cuando el número de equipos crece más rápido que la capacidad del equipo de operaciones de atender tickets. Los síntomas son conocidos: cada servicio nuevo copia el repositorio de otro con sus errores, nadie sabe quién es dueño del servicio que falla a las tres de la mañana, staging está siempre roto porque lo comparten diez equipos y la factura de cloud crece sin que se pueda atribuir. Una plataforma interna convierte las buenas prácticas en el camino más fácil: plantillas que ya traen CI, observabilidad y despliegue, módulos de infraestructura revisados y entornos que aparecen y desaparecen con cada PR.

Si tienes tres equipos y un solo producto, un repositorio de plantillas y un buen README dan el 80 % del valor: no montes Backstage todavía.

## Escenarios

### Scale-up que pasa de 3 a 15 equipos

El problema es la divergencia: cada equipo despliega a su manera. Empieza por el catálogo (un `catalog-info.yaml` en cada repositorio con dueño y sistema) y dos o tres plantillas golden path para los tipos de servicio más comunes. Los entornos por PR vienen después, cuando staging ya sea el cuello de botella.

### Empresa regulada

Lo importante es que nadie pueda crear infraestructura fuera de los módulos aprobados. Los módulos llevan cifrado, logs y etiquetas por defecto; la CI ejecuta política como código sobre cada plan y bloquea lo que no cumple; los entornos efímeros usan datos sintéticos, nunca copias de producción. El catálogo sirve además de inventario para auditoría.

### Muchos equipos y entornos de PR caros

Cuando cada PR levanta media docena de servicios y una base de datos, el coste se dispara. Comparte todo lo que se pueda (un balanceador, un clúster, una instancia de base de datos con esquemas por PR), escala a cero fuera de horario y aplica TTL cortos. Mide el coste de previsualización por equipo para que se vea.

### Organización on-premises con Kubernetes

Argo CD con el generador de PR, un namespace por PR con cuotas y políticas de red, vCluster cuando la aplicación instala operadores propios, OpenCost con precios internos y una limpieza por TTL como red de seguridad.

## Cómo encaja

Un desarrollador entra en el portal y elige una plantilla. La plantilla de Backstage (Software Template) pide unos pocos parámetros, genera el código a partir de un esqueleto, crea el repositorio en GitHub o GitLab con el pipeline ya configurado y registra el componente en el catálogo con su dueño. Desde ahí, el desarrollador trabaja en Git como siempre.

Cada push dispara la CI, que construye, prueba y aplica infraestructura usando solo los módulos de IaC aprobados, versionados y referenciados por etiqueta. Cuando se abre una PR, la CI despliega además un entorno efímero: un namespace o vCluster, un servicio ECS, una revisión etiquetada de Container Apps o de Cloud Run, con una URL propia que se publica como comentario en la PR. El entorno lleva etiquetas de equipo, servicio y número de PR.

Dos procesos cierran el ciclo. El coste: las etiquetas llevan cada recurso al informe de su equipo (OpenCost, Cost Explorer, Cost Management o la exportación a BigQuery), y ese dato se puede mostrar en la ficha del servicio en Backstage. Y la limpieza: al cerrar la PR, la CI destruye el entorno; si eso falla o la PR queda abandonada, un proceso programado borra todo lo que supera su TTL.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Backstage es una aplicación Node.js con PostgreSQL: un contenedor de Backstage, PostgreSQL con volumen y copias, y un proxy inverso con TLS y SSO por OIDC. Suficiente para el catálogo y las plantillas en una organización mediana; los entornos por PR no caben aquí.

**Kubernetes on-premises.** Backstage con su chart de Helm, PostgreSQL con CloudNativePG, Argo CD con ApplicationSet para los entornos por PR, vCluster cuando haga falta aislamiento de clúster, cert-manager y ExternalDNS para las URLs de previsualización, OpenCost y la limpieza por TTL.

**Cloud sin Kubernetes.** Backstage en Fargate, Container Apps o Cloud Run con PostgreSQL gestionado; entornos por PR como servicios ECS, revisiones etiquetadas o Container Apps independientes; limpieza con EventBridge Scheduler, una Function con temporizador o Cloud Scheduler. Es lo más barato si tus servicios ya son contenedores sin Kubernetes.

**Kubernetes gestionado.** EKS, AKS o GKE compensan si tus servicios ya corren en Kubernetes: los entornos por PR se parecen a producción, Argo CD y vCluster funcionan igual que on-premises y OpenCost reparte el coste del clúster.

| Opción | Coste fijo | Operación | Entornos por PR | Cuándo |
|---|---|---|---|---|
| Docker Compose | Un host | Baja | No | Solo catálogo y plantillas |
| Kubernetes on-premises | Clúster propio | Alta | Namespaces y vCluster | Plataforma on-premises |
| PaaS de contenedores | Bajo, escala a cero | Baja | Servicios o revisiones | Servicios en PaaS |
| EKS, AKS, GKE | Clúster gestionado | Media-alta | Namespaces y vCluster | Servicios ya en Kubernetes |

## Decisiones clave

- **Backstage propio o portal gestionado.** Ningún gran proveedor cloud ofrece Backstage gestionado: AWS Proton terminó en octubre de 2026 y Azure Deployment Environments se retira en febrero de 2027. Las opciones gestionadas son SaaS como Roadie o Spotify Portal; la autoalojada con soporte, Red Hat Developer Hub.
- **Namespace o vCluster por PR.** El namespace es barato y rápido; vCluster aísla CRDs y recursos de clúster a cambio de un plano de control por PR.
- **Revisión etiquetada o servicio por PR.** Las etiquetas de Container Apps y Cloud Run son lo más barato, pero comparten configuración con el servicio; un servicio por PR aísla secretos y escalado.
- **Datos de previsualización.** Un esquema por PR sobre datos sintéticos cubre casi todo; los clones de base de datos solo para PR que tocan migraciones.
- **Plantillas vivas, no fotocopias.** Si la plantilla solo genera código una vez, los servicios divergen al día siguiente: complementa con módulos versionados y scorecards que detecten desviaciones.

## Errores habituales

- Montar Backstage con cuarenta plugins antes de tener el catálogo completo y con dueños reales.
- Plantillas que nadie mantiene: el golden path se queda en una versión de runtime sin soporte.
- Entornos de PR sin TTL y sin etiqueta: aparecen en la factura meses después y nadie sabe de quién son.
- Copiar datos de producción a entornos efímeros.
- Dar a la CI permisos de administrador en la cuenta en lugar de un rol por repositorio y entorno.
- Medir el éxito por plugins instalados y no por el tiempo que tarda un equipo en poner un servicio nuevo en producción.
