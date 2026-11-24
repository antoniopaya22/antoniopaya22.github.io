---
title: "CI/CD y cadena de suministro de software"
short: "CI/CD y supply chain"
summary: "Que solo llegue a producción una imagen construida por tu pipeline a partir de código revisado, escaneada, firmada y con procedencia verificable, y que el pipeline no guarde ninguna clave que robar."
description: "CI/CD seguro: acciones fijadas por SHA, OIDC sin claves, SBOM, escaneo, firma, SLSA y admisión de imágenes firmadas en AWS, Azure, GCP y on-premises."
order: 21
requirements:
  - "Todo cambio entra por pull request a una rama protegida con revisión y comprobaciones obligatorias."
  - "Las acciones de terceros están fijadas a un commit y el token del workflow tiene los permisos mínimos."
  - "El pipeline obtiene credenciales de corta duración por OIDC; no hay claves cloud guardadas como secretos."
  - "Cada imagen tiene SBOM, resultado de escaneo, firma y procedencia asociados a su digest."
  - "El entorno de ejecución rechaza imágenes sin firma válida o de un registro no autorizado."
  - "Las dependencias y las acciones se actualizan de forma continua y revisada."
platforms:
  onprem:
    summary: "GitHub Actions construye y genera el SBOM, Harbor guarda las imágenes y las escanea con Trivy, cosign firma con transparencia en Rekor y Kyverno solo admite en Kubernetes imágenes firmadas por la identidad del pipeline."
    notes:
      - "Harbor puede impedir el pull de imágenes sin firma de cosign o con vulnerabilidades por encima de una severidad, por proyecto: es una segunda barrera además de la admisión."
      - "cosign en modo sin claves usa la identidad OIDC del workflow como firmante; la política de Kyverno comprueba el emisor y el `subject` (repositorio y workflow), no una clave pública."
      - "En una red aislada no hay Rekor ni Fulcio públicos: o despliegas los tuyos o firmas con una clave guardada en OpenBao o un HSM y verificas con esa clave."
      - "Trivy en el pipeline corta pronto; el escaneo del registro detecta los CVE publicados después de la build."
      - "El coste es operación: Harbor con su base de datos y almacenamiento, actualizar la base de vulnerabilidades y mantener las políticas de Kyverno."
  aws:
    summary: "GitHub Actions entra por el proveedor OIDC de IAM, sube a Amazon ECR, Amazon Inspector escanea de forma continua, AWS Signer firma con Notation y Kyverno en EKS verifica la firma antes de admitir el pod."
    notes:
      - "La firma de contenedores de AWS Signer usa Notation (CLI más el plugin de AWS Signer); desde noviembre de 2025, la firma gestionada de ECR firma automáticamente al hacer push con un perfil de Signer."
      - "La verificación no es nativa de EKS: hace falta Kyverno (o Ratify con Gatekeeper) configurado con la confianza de AWS Signer, incluida la comprobación de revocación."
      - "El escaneo mejorado de ECR es Amazon Inspector: vuelve a evaluar las imágenes cuando aparecen CVE nuevos y se paga por imagen escaneada y reescaneada."
      - "ECS y Lambda no tienen admisión por firma de imágenes (la firma de código de Lambda solo cubre paquetes zip): allí la verificación va en el pipeline, antes de desplegar por digest."
      - "El rol de CI que sube imágenes solo necesita escribir en su repositorio de ECR; firmar y desplegar pueden ser roles distintos."
  azure:
    summary: "GitHub Actions entra con credenciales federadas, sube a Azure Container Registry, firma con Notation y un certificado en Key Vault, Defender for Containers escanea y bloquea por vulnerabilidades y AKS verifica firmas con Ratify."
    notes:
      - "Notation firma con el plugin de Azure Key Vault; el certificado y su clave privada no salen de Key Vault y la identidad de CI solo necesita permiso para firmar."
      - "Image Integrity de AKS (Ratify gestionado mediante Azure Policy) sigue en preview, solo admite el efecto Audit y Microsoft no lo recomienda para producción: registra, no bloquea."
      - "Para bloquear de verdad, instala tú Ratify con Gatekeeper o Kyverno con verificación de Notary, apuntando a los certificados de Key Vault."
      - "La implantación controlada (gated deployment) de Defender for Containers es GA y puede denegar imágenes según sus hallazgos de vulnerabilidades, en modo auditoría primero; exige Kubernetes 1.31 o superior y no verifica firmas."
      - "Defender for Containers se paga por núcleo de los clústeres protegidos; la retención de manifiestos sin etiqueta en ACR requiere el nivel Premium."
  gcp:
    summary: "GitHub Actions entra por Workload Identity Federation, sube a Artifact Registry, Artifact Analysis escanea al subir y de forma continua, el pipeline crea una atestación firmada con Cloud KMS y Binary Authorization solo admite en GKE y Cloud Run imágenes atestadas."
    notes:
      - "Binary Authorization se aplica en el despliegue en GKE y en Cloud Run: la política exige atestaciones de uno o varios attestors, y cada attestor verifica con una clave de Cloud KMS."
      - "El job de CI firma la atestación del digest con la clave de KMS; su identidad necesita solo el rol de firmante sobre esa clave y el de adjuntar ocurrencias."
      - "La comprobación SLSA de la validación continua solo confía en Cloud Build como constructor: con GitHub Actions usa atestaciones propias, no esa comprobación."
      - "Artifact Analysis cobra por imagen escaneada; las políticas de limpieza de Artifact Registry reducen tanto almacenamiento como escaneos."
      - "Usa el modo dry run de la política para ver qué rechazaría antes de activarlo."
tiers:
  - name: "Pipeline endurecido"
    when: "Equipo pequeño que despliega en un PaaS o en un host y quiere cerrar lo más explotable sin montar infraestructura nueva."
    cost: 1
    ops: 1
    onprem: "Acciones fijadas por SHA, Trivy en CI que falla con críticos, SBOM como artefacto y despliegue por digest con Compose desde Harbor."
    aws: "OIDC con rol limitado al repositorio, escaneo básico de ECR y despliegue en ECS o Lambda por digest."
    azure: "Credenciales federadas, Trivy en CI, ACR y despliegue en Container Apps por digest."
    gcp: "Workload Identity Federation, escaneo de Artifact Analysis y despliegue en Cloud Run por digest."
    tradeoffs: "Nada impide que alguien con permisos despliegue una imagen que no salió del pipeline; dependes de que el acceso al despliegue esté bien cerrado."
  - name: "Firma y admisión"
    when: "Varios equipos y un clúster de producción donde solo deben correr imágenes del pipeline oficial."
    cost: 2
    ops: 2
    onprem: "cosign sin claves con Rekor, Harbor con firma obligatoria y Kyverno en modo enforce en producción."
    aws: "AWS Signer con firma gestionada de ECR, Inspector y Kyverno en EKS verificando la confianza de Signer."
    azure: "Notation con certificado en Key Vault, Defender for Containers y Ratify con Gatekeeper instalados en AKS."
    gcp: "Atestaciones con Cloud KMS y Binary Authorization en modo enforce en GKE y Cloud Run."
    tradeoffs: "Una política mal escrita detiene los despliegues; hace falta una vía de emergencia documentada (break-glass) y empezar en auditoría."
  - name: "Cadena verificable completa"
    when: "Sector regulado o software que distribuyes a terceros y que debe demostrar cómo se construyó."
    cost: 3
    ops: 3
    onprem: "Build en workflow reutilizable aislado, atestaciones de procedencia y SBOM verificadas por Kyverno, espejo propio de dependencias y Fulcio y Rekor internos."
    aws: "Lo anterior más ECR pull-through cache, CodeArtifact como espejo y reescaneo continuo de lo que corre en EKS."
    azure: "Lo anterior más caché de artefactos de ACR, Azure Artifacts y gated deployment en modo deny."
    gcp: "Lo anterior más repositorios remotos de Artifact Registry y attestors separados para build, escaneo y aprobación."
    tradeoffs: "Más tiempo de pipeline y más piezas que mantener; compensa cuando un cliente o un auditor pide la procedencia de cada versión."
extensions:
  - name: "Espejo de dependencias"
    when: "Cuando no quieres que una build dependa de Docker Hub, npm o PyPI en el momento de ejecutarse."
    cost: "medium"
    onprem: "Harbor proxy cache + Nexus"
    aws: "ECR pull-through + CodeArtifact"
    azure: "Caché de artefactos de ACR"
    gcp: "Artifact Registry (repos remotos)"
  - name: "Bloqueo por vulnerabilidades"
    when: "Cuando además de la firma quieres impedir que se despliegue una imagen con CVE críticos conocidos."
    cost: "medium"
    onprem: "Harbor: bloqueo por severidad"
    aws: "Kyverno + atestación de escaneo"
    azure: "Defender gated deployment"
    gcp: "Attestor tras Artifact Analysis"
  - name: "Análisis de código y secretos"
    when: "Siempre que el repositorio tenga código propio; corta fugas de credenciales antes del merge."
    cost: "low"
    onprem: "Semgrep + gitleaks"
    aws: "CodeQL + secret scanning"
    azure: "CodeQL + secret scanning"
    gcp: "CodeQL + secret scanning"
  - name: "Runners autoalojados efímeros"
    when: "Cuando la build necesita red privada, máquinas grandes o no puede salir a runners compartidos."
    cost: "medium"
    onprem: "Actions Runner Controller (k3s)"
    aws: "Runners de CodeBuild o ARC en EKS"
    azure: "Container Apps jobs o ARC en AKS"
    gcp: "ARC en GKE"
  - name: "Reescaneo de lo que está corriendo"
    when: "Cuando necesitas saber qué contenedores en ejecución están afectados por un CVE publicado hoy."
    cost: "low"
    onprem: "Trivy Operator"
    aws: "Inspector (escaneo continuo)"
    azure: "Defender: contenedores en ejecución"
    gcp: "Artifact Analysis continuo"
savings:
  - "Construye una vez y promueve el mismo digest entre entornos en lugar de reconstruir por entorno: ahorras minutos de runner y garantizas que lo firmado es lo que se despliega."
  - "Aplica políticas de ciclo de vida (lifecycle policies de ECR, retención y purga de ACR, políticas de limpieza de Artifact Registry) a imágenes sin etiqueta y antiguas; además del almacenamiento, Inspector y Artifact Analysis cobran por imagen escaneada."
  - "Limita el escaneo mejorado de ECR con filtros de repositorio a las imágenes que se despliegan y deja Trivy en CI, que no tiene coste de licencia, para los pull requests."
  - "Usa `concurrency` con `cancel-in-progress` y filtros de rutas para no ejecutar pipelines repetidos ni de partes que no cambiaron; los minutos de runners alojados se pagan en repositorios privados."
  - "Cachea capas de Docker y dependencias (`actions/cache`, caché de buildx) y agrupa las actualizaciones de Dependabot para que no disparen un pipeline completo por cada librería."
  - "Activa Defender for Containers solo en las suscripciones con clústeres que lo necesitan: se factura por núcleo protegido."
---

## Cuándo lo necesitas

Cuando el pipeline tiene más poder que cualquier persona del equipo. Construye el código, guarda credenciales de despliegue y decide qué llega a producción, pero suele estar montado con acciones de terceros referenciadas por etiqueta, un token con permisos de escritura por defecto y claves cloud guardadas como secretos. Los ataques recientes a la cadena de suministro no rompen la aplicación: comprometen una acción, una dependencia o el runner, y desde ahí publican una imagen que parece legítima.

Este caso cierra tres puertas: qué código entra en la build, qué credenciales tiene el pipeline y cómo sabe el entorno de ejecución que una imagen salió de ese pipeline.

## Escenarios

- **Startup que despliega en un PaaS.** Con el nivel «Pipeline endurecido» elimina la mayor parte del riesgo en una tarde: acciones fijadas por SHA, `permissions: contents: read` arriba, OIDC en vez de claves y despliegue por digest. La firma puede esperar a que haya un clúster.
- **Empresa con varios equipos y Kubernetes compartido.** La admisión por firma se vuelve imprescindible: cualquiera con acceso al clúster podría desplegar una imagen de Docker Hub. Cada equipo firma con la identidad de su pipeline y la política de admisión exige esa identidad por namespace.
- **Sector regulado.** El auditor pedirá saber qué dependencias tenía la versión desplegada en una fecha y quién aprobó el cambio. SBOM y procedencia adjuntos al digest, retención de atestaciones y bloqueo por vulnerabilidades críticas.
- **Producto que se entrega al cliente.** Firmas y SBOM viajan con el producto; el cliente verifica con tu clave pública o tu identidad de firma antes de instalar. Encaja con el caso de despliegue sin internet.
- **Proyecto open source.** Las atestaciones de artefactos de GitHub y la firma sin claves de cosign dejan a cualquier usuario verificar la procedencia sin que gestiones claves.

## Cómo encaja

1. **Pull request a la rama protegida.** Revisión obligatoria y comprobaciones requeridas. Dependabot abre pull requests para dependencias, imágenes base y acciones; en las acciones actualiza el SHA y el comentario de versión.
2. **CI: tests y SBOM.** El workflow usa acciones fijadas por SHA completo (una política de la organización puede exigirlo desde agosto de 2025, y los lockfiles de workflow, GA desde octubre de 2026, fijan también las dependencias transitivas de las acciones compuestas). El token arranca con `contents: read` y solo el job que lo necesita recibe `id-token: write`. Genera el SBOM y lanza el escaneo; un CVE crítico corta aquí.
3. **Credenciales efímeras.** El job pide un token OIDC y la federación de la nube (o OpenBao) le devuelve credenciales de minutos, limitadas al repositorio y a la rama.
4. **Registro.** La imagen se sube y se identifica por digest. El registro vuelve a escanearla cuando aparecen CVE nuevos.
5. **Firma y procedencia.** Se firma el digest y se adjuntan las atestaciones: procedencia SLSA (las atestaciones de artefactos de GitHub alcanzan SLSA Build nivel 2, nivel 3 si la build va en un workflow reutilizable aislado) y SBOM.
6. **Admisión.** Antes de crear el pod, la política verifica firma y emisor. Solo entonces el entorno descarga la imagen del registro y la ejecuta.

## Despliegue: Docker, Kubernetes o serverless

- **Docker Compose en un host.** No hay controlador de admisión: el script de despliegue ejecuta `cosign verify` (o `notation verify`) sobre el digest, y solo si pasa actualiza el `compose.yaml` con ese digest y lanza `docker compose pull` y `up -d`. Harbor con firma obligatoria añade una segunda barrera.
- **Kubernetes on-premises.** Kyverno con reglas `verifyImages` en modo enforce para los namespaces de producción, comprobando firma, emisor y atestaciones; Trivy Operator reescanea lo que corre. Empieza en Audit y revisa los informes antes de bloquear.
- **Cloud sin Kubernetes.** Cloud Run admite Binary Authorization igual que GKE. ECS y Container Apps no verifican firmas al desplegar: la verificación va en el pipeline, el despliegue usa siempre digest y el permiso de desplegar solo lo tiene la identidad de CI.
- **Kubernetes gestionado.** EKS con Kyverno o Ratify y la confianza de AWS Signer; AKS con Ratify y Gatekeeper o Kyverno instalados por ti (Image Integrity solo audita) y gated deployment de Defender para vulnerabilidades; GKE con Binary Authorization.

| Opción | Dónde se verifica | ¿Bloquea? | Cuándo |
|---|---|---|---|
| Compose en un host | Script de despliegue | Sí, si el script falla | Un servidor o producto on-premises |
| Kubernetes propio | Kyverno | Sí | Clústeres compartidos fuera de la nube |
| PaaS / funciones | Pipeline (Cloud Run: Binary Authorization) | Solo en Cloud Run | Sin Kubernetes |
| Kubernetes gestionado | Kyverno, Ratify o Binary Authorization | Sí | EKS, AKS o GKE |

## Decisiones clave

- **Firma con clave o sin claves.** Sin claves (cosign con OIDC) evita gestionar secretos y liga la firma al workflow, pero depende de Fulcio y Rekor. Con clave en KMS, Key Vault o Signer funciona en redes aisladas y encaja con Notation; la clave es otro activo a proteger y rotar.
- **Cosign o Notation.** Cosign domina en Kubernetes y open source; Notation es el camino nativo de AWS Signer y de Azure. Kyverno verifica ambos, así que la elección la marca el servicio de firma de tu nube.
- **Dónde cortar por vulnerabilidades.** En CI corta pronto pero solo conoce los CVE de hoy; en admisión protege despliegues nuevos de imágenes antiguas. No bloquees en ambos con umbrales distintos.
- **Qué fijar.** SHA para acciones, digest para imágenes y lockfile para dependencias. Una etiqueta se puede mover; un SHA no.

## Errores habituales

- Fijar las acciones de primer nivel y olvidar que una acción compuesta puede llamar a otras por etiqueta.
- Dejar el permiso por defecto del `GITHUB_TOKEN` en escritura o dar `id-token: write` a todo el workflow.
- Firmar la etiqueta en lugar del digest, o desplegar por etiqueta después de verificar el digest.
- Activar Image Integrity en AKS creyendo que bloquea: solo audita.
- Políticas de admisión sin excepción para las imágenes del sistema del clúster: el siguiente upgrade se queda atascado.
- Generar SBOM y no guardarlo junto al digest: cuando sale un CVE nadie sabe qué versiones lo contienen.
