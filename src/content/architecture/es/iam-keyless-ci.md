---
title: "Identidad y acceso: personas, cargas de trabajo y CI sin claves"
short: "Identidad sin claves"
summary: "Que personas, pipelines y aplicaciones accedan a la nube con identidades federadas y credenciales de corta duración, sin claves estáticas guardadas en ningún sitio, con privilegios temporales y todo auditado."
description: "Identidad sin claves para personas, CI con OIDC y cargas de trabajo: SSO, MFA, acceso temporal y auditoría en AWS, Azure, GCP y on-premises."
order: 14
requirements:
  - "Ninguna persona, pipeline ni aplicación usa claves de acceso de larga duración."
  - "Las personas entran por SSO con MFA y reciben permisos por grupo; los privilegios de producción son temporales."
  - "El pipeline solo obtiene credenciales para su repositorio, su rama y su workflow, y la identidad de despliegue no puede ampliar sus propios permisos."
  - "Cada carga de trabajo tiene su propia identidad con los permisos que usa, y los secretos se leen en tiempo de ejecución."
  - "Existe un acceso de emergencia probado que no depende del IdP, y su uso dispara una alerta."
  - "Toda acción sobre los recursos queda en un registro de auditoría que los administradores de las cargas no pueden borrar."
platforms:
  onprem:
    summary: "Keycloak es el IdP con MFA, los grupos se mapean a RBAC de Kubernetes, OpenBao acepta los tokens OIDC de GitHub Actions y emite secretos dinámicos, SPIFFE/SPIRE da identidad a las cargas y Wazuh centraliza la auditoría."
    notes:
      - "OpenBao (el fork abierto de Vault) valida el token de GitHub con su método `jwt` contra el emisor `token.actions.githubusercontent.com`; las condiciones van en `bound_claims` (repositorio, rama, entorno)."
      - "Los secretos dinámicos (motor de bases de datos, PKI) caducan solos: una credencial filtrada deja de servir en minutos u horas, no meses."
      - "SPIRE emite SVID X.509 o JWT por carga; OpenBao puede aceptar los JWT-SVID para entregar secretos sin ningún secreto inicial en el contenedor."
      - "No hay acceso temporal nativo: se aproxima con grupos de Keycloak que se conceden por un tiempo y credenciales de OpenBao con TTL corto."
      - "El coste es operación: Keycloak y OpenBao en alta disponibilidad, desellado de OpenBao, rotación de la CA de SPIRE y alguien que mantenga las políticas."
  aws:
    summary: "IAM Identity Center federa con el IdP corporativo y asigna permission sets por grupo, GitHub Actions asume roles IAM mediante el proveedor OIDC, EKS Pod Identity da rol a cada pod y CloudTrail de organización registra todo."
    notes:
      - "Los permission sets son asignaciones fijas, no acceso temporal. Para elevación temporal con aprobación, AWS remite a socios integrados con Identity Center o a su solución abierta TEAM (Temporary Elevated Access Management)."
      - "El rol de `plan` confía solo en el evento `pull_request` del repositorio (por nombre e ID inmutable) y solo lee; el de `apply` exige el entorno protegido, la rama `main` y el fichero de workflow (`job_workflow_ref`), y lleva un permissions boundary que le impide tocar los roles de CI, el proveedor OIDC y el bucket de estado."
      - "EKS Pod Identity no usa proveedores OIDC por clúster y la misma relación de confianza sirve para varios clústeres; no funciona en Fargate, Windows, Outposts ni EKS Anywhere, donde se sigue usando IRSA."
      - "Con la gestión centralizada de root puedes eliminar las credenciales de root de las cuentas miembro; el acceso de emergencia queda en pocas identidades con MFA física y alarma en cada uso."
      - "Identity Center y los roles IAM no tienen coste; se paga Secrets Manager por secreto y por llamadas, y CloudTrail a partir de la primera copia de eventos de gestión y por los eventos de datos."
  azure:
    summary: "Microsoft Entra ID es el IdP con Acceso condicional, Entra PIM convierte los roles de Azure en elegibles con activación temporal, GitHub Actions entra con credenciales federadas sobre identidades administradas y AKS usa Workload Identity con Key Vault."
    notes:
      - "PIM requiere licencias Microsoft Entra ID P2 o Entra ID Governance para quienes usan la elevación o la aprueban; permite duración máxima, justificación, aprobación y MFA al activar."
      - "Cada credencial federada valida un `subject` concreto (`repo:org/repo:pull_request`, `repo:org/repo:environment:prod`), así que plan y apply son dos identidades administradas distintas con roles distintos."
      - "La identidad de apply no debe tener `Owner` ni `User Access Administrator` sin restricciones: si tiene que asignar roles, usa `Role Based Access Control Administrator` con condiciones que limiten qué roles puede asignar y a quién."
      - "Workload Identity de AKS federa la service account de Kubernetes con una identidad administrada; el pod obtiene tokens de Entra sin secretos montados."
      - "El Activity Log se guarda 90 días sin coste; enviarlo a Log Analytics o a Storage para conservarlo más tiempo se paga por ingesta y almacenamiento."
  gcp:
    summary: "Cloud Identity (o federación con el IdP corporativo) autentica a las personas, Privileged Access Manager concede roles temporales, Workload Identity Federation cambia el token de GitHub por una service account y GKE da identidad propia a cada pod."
    notes:
      - "Privileged Access Manager funciona con entitlements a nivel de organización, carpeta o proyecto: la concesión añade un binding IAM condicionado que caduca solo, con aprobación opcional y registro en Cloud Audit Logs."
      - "El proveedor de Workload Identity Federation debe llevar una condición de atributo sobre `repository_id` y `repository_owner_id`; sin ella, cualquier repositorio de GitHub podría presentar un token válido."
      - "Workload Identity Federation for GKE (antes GKE Workload Identity) permite dar roles directamente al principal de la service account de Kubernetes, sin service account de Google intermedia."
      - "Para que apply no se amplíe a sí mismo, las service accounts de CI viven en un proyecto aparte donde apply no tiene roles de IAM; una política de denegación de IAM refuerza el límite."
      - "Los registros de Admin Activity son gratuitos y siempre activos; los de Data Access están desactivados por defecto (salvo BigQuery) y se pagan por volumen al activarlos."
tiers:
  - name: "Equipo pequeño"
    when: "Una o dos cuentas o suscripciones, un repositorio de infraestructura y un puñado de administradores."
    cost: 1
    ops: 1
    onprem: "Keycloak con WebAuthn, grupos mapeados a RBAC de Kubernetes y OpenBao en un solo nodo con método JWT para GitHub Actions."
    aws: "IAM Identity Center con dos o tres permission sets, proveedor OIDC de GitHub con roles de plan y apply, y task roles o Pod Identity para las cargas."
    azure: "Entra ID con Acceso condicional y MFA, dos identidades administradas con credenciales federadas para plan y apply, y Key Vault."
    gcp: "Cloud Identity con grupos, un pool de Workload Identity Federation con dos service accounts y Secret Manager."
    tradeoffs: "Los administradores tienen privilegios permanentes y la auditoría se queda en el servicio nativo sin correlación; aceptable mientras el equipo es pequeño y se conoce."
  - name: "Organización con entornos separados"
    when: "Varios equipos, producción en cuentas o suscripciones propias y obligación de demostrar quién tocó qué."
    cost: 2
    ops: 2
    onprem: "Keycloak en alta disponibilidad federado con el directorio, OpenBao en clúster con secretos dinámicos y SPIRE para las cargas."
    aws: "Identity Center con grupos del IdP por SCIM, acceso temporal con TEAM o un socio, roles de CI por cuenta y CloudTrail de organización en la cuenta de logs."
    azure: "Entra PIM para roles de producción, Workload Identity en AKS y Activity Log de todas las suscripciones en un Log Analytics central."
    gcp: "Privileged Access Manager para producción, Workload Identity Federation por entorno y un sink de logs de organización."
    tradeoffs: "Más piezas y licencias (PIM pide P2 o Governance); el acceso temporal añade fricción en incidentes si las aprobaciones no están bien pensadas."
  - name: "Entorno regulado"
    when: "Datos sensibles, auditorías externas y exigencia de MFA resistente al phishing y de revisiones de acceso."
    cost: 3
    ops: 3
    onprem: "Passkeys o llaves FIDO2 obligatorias en Keycloak, OpenBao con HSM, SPIRE federado entre clústeres y Wazuh enviando a un SIEM con retención inmutable."
    aws: "Lo anterior más llaves FIDO2 en el IdP, IAM Access Analyzer para permisos no usados, GuardDuty y logs en S3 con Object Lock."
    azure: "Lo anterior más passkeys obligatorias, Access Reviews de ID Governance, Entra ID Protection y Microsoft Sentinel."
    gcp: "Lo anterior más llaves de seguridad obligatorias, recomendaciones de IAM, Security Command Center y buckets de logs con bloqueo de retención."
    tradeoffs: "Coste de licencias y de SIEM, y un proceso de revisiones que alguien debe ejecutar cada trimestre; a cambio, la auditoría deja de ser una búsqueda manual."
extensions:
  - name: "Acceso temporal con aprobación"
    when: "Cuando nadie debería tener permisos de escritura en producción fuera de un cambio o incidente."
    cost: "medium"
    onprem: "Grupos temporales + OpenBao con TTL"
    aws: "TEAM o socio con Identity Center"
    azure: "Entra PIM con aprobación"
    gcp: "Privileged Access Manager"
  - name: "MFA resistente al phishing"
    when: "Siempre para administradores; para todos en cuanto haya datos sensibles."
    cost: "low"
    onprem: "Keycloak WebAuthn / passkeys"
    aws: "FIDO2 en el IdP o Identity Center"
    azure: "Passkeys (FIDO2) en Entra ID"
    gcp: "Llaves de seguridad / passkeys"
  - name: "Credenciales de base de datos sin contraseña"
    when: "Cuando las aplicaciones guardan hoy un usuario y contraseña de la base de datos en un secreto."
    cost: "low"
    onprem: "OpenBao, motor de bases de datos"
    aws: "Autenticación IAM en Aurora"
    azure: "Autenticación Entra en PostgreSQL"
    gcp: "Autenticación IAM en Cloud SQL"
  - name: "Identidad para máquinas fuera de la nube"
    when: "Servidores en el CPD o en otra nube que hoy usan claves estáticas para llamar a la nube."
    cost: "low"
    onprem: "Agentes SPIRE en las VMs"
    aws: "IAM Roles Anywhere"
    azure: "Servidores habilitados para Azure Arc"
    gcp: "Workload Identity Fed. con X.509"
  - name: "Detección de abuso de identidades"
    when: "Cuando necesitas enterarte de un inicio de sesión imposible o de un rol usado desde una IP rara sin revisar logs a mano."
    cost: "medium"
    onprem: "Reglas de Wazuh + SIEM"
    aws: "Amazon GuardDuty"
    azure: "Entra ID Protection"
    gcp: "Security Command Center"
  - name: "Revisión de permisos no usados"
    when: "Cuando los roles crecen por acumulación y nadie sabe qué permisos siguen haciendo falta."
    cost: "low"
    onprem: "Informe de grupos de Keycloak"
    aws: "IAM Access Analyzer"
    azure: "Access Reviews (ID Governance)"
    gcp: "Recomendaciones de IAM"
savings:
  - "Centraliza el acceso humano en IAM Identity Center, Entra ID o Cloud Identity y elimina usuarios IAM y cuentas locales: el SSO no se paga aparte y cada usuario local es un secreto más que rotar."
  - "Asigna licencias Entra ID P2 o ID Governance solo a quienes tienen roles elegibles en PIM o los aprueban, no a toda la plantilla."
  - "Usa identidad de carga contra el servicio de destino (autenticación IAM en la base de datos, identidad administrada contra Storage) en vez de guardar secretos: Secrets Manager y Secret Manager cobran por secreto y por acceso, Key Vault por operación."
  - "Cachea los secretos en la aplicación o con el agente de OpenBao en lugar de leerlos en cada petición; el coste por llamada y la latencia bajan a la vez."
  - "Activa solo los eventos de datos de CloudTrail y los registros Data Access de Cloud Audit Logs que vayas a mirar (buckets de estado, secretos, datos sensibles); activarlos para todo multiplica el volumen."
  - "Mueve los logs de auditoría antiguos a almacenamiento frío (S3 Glacier, nivel de archivo de Blob Storage, clase Archive de Cloud Storage) y deja en el SIEM solo la ventana de investigación."
---

## Cuándo lo necesitas

Cuando alguien encuentra una clave de acceso en un `.env`, en un secreto de GitHub que nadie recuerda haber creado o en el portátil de un exempleado. Las claves de larga duración no caducan, no dicen quién las usa y suelen tener más permisos de los necesarios. Este caso sustituye todas ellas por tres flujos con credenciales de minutos u horas: personas por SSO con MFA, pipelines por federación OIDC y cargas de trabajo por la identidad de la plataforma.

Es también la pieza que hace seguro el resto de casos: si la identidad que despliega puede darse más permisos a sí misma, cualquier cambio fusionado en `main` puede convertirse en administrador.

## Escenarios

- **Startup con una cuenta y un repositorio.** Empieza por lo que más riesgo quita: SSO con MFA para el equipo y OIDC para GitHub Actions. Un rol de plan y otro de apply bastan; el acceso temporal puede esperar mientras haya tres administradores que se conocen.
- **Empresa con varios equipos y producción separada.** Cada entorno vive en su cuenta, suscripción o proyecto, con su par de identidades de CI. Los permisos de producción pasan a ser elegibles (PIM, Privileged Access Manager o TEAM en AWS) y el SOC recibe la auditoría de todos los entornos.
- **Sector regulado con datos en la UE.** MFA resistente al phishing obligatoria, revisiones de acceso trimestrales, logs con retención inmutable y la cuenta de emergencia probada y documentada. El auditor querrá ver quién aprobó cada elevación.
- **Cliente que exige on-premises.** Keycloak, OpenBao y SPIRE cubren los mismos tres flujos. OpenBao valida el token OIDC de GitHub Actions igual que lo haría AWS, siempre que alcance las claves públicas del emisor.
- **Cargas fuera de la nube que llaman a la nube.** Servidores en el CPD que suben ficheros a S3 o a Blob Storage dejan de usar claves con IAM Roles Anywhere, Azure Arc o Workload Identity Federation con certificados X.509.

## Cómo encaja

El diagrama tiene tres filas, una por tipo de identidad, y todas acaban en los mismos recursos y en la misma auditoría.

1. **Personas.** El usuario se autentica en el IdP con MFA. El IdP le da acceso de lectura por grupo y, si necesita escribir en producción, pide una elevación temporal: un permiso elegible que se activa con justificación (y aprobación, si la política lo exige) y caduca solo.
2. **CI.** El job de GitHub Actions pide a GitHub un token OIDC firmado que describe repositorio, rama, evento, entorno y workflow. La federación lo valida contra sus condiciones y devuelve credenciales de la identidad que corresponde: la de **plan**, de solo lectura, para pull requests; la de **apply**, solo para la rama protegida y el entorno con revisores. La identidad de apply tiene un límite (permissions boundary, condiciones de RBAC o un proyecto aparte) que le impide modificar las identidades de CI, su propia confianza y la protección del almacenamiento de estado. Esas identidades las crea una persona con un stack de bootstrap independiente.
3. **Cargas de trabajo.** El pod, la función o la VM obtiene un token de la plataforma (service account proyectada, identidad administrada, metadatos) y lo cambia por credenciales cloud o por un secreto del gestor de secretos. Ningún secreto inicial viaja en la imagen.

Todos los accesos a los recursos, aceptados o denegados, terminan en el registro de auditoría central, fuera del alcance de quienes administran las cargas.

## Despliegue: Docker, Kubernetes o serverless

La identidad de las cargas es lo que más cambia según dónde se ejecuten:

- **Docker Compose en un host.** No hay plataforma que emita identidad por contenedor. Lo habitual es un agente de OpenBao (o un agente SPIRE con el atestador de Docker) en el host que se autentica una vez y escribe los secretos en un volumen `tmpfs` que el contenedor monta en solo lectura. El host es la raíz de confianza: si se compromete, caen todos sus contenedores.
- **Kubernetes on-premises (k3s, RKE2).** Las service accounts con tokens proyectados son la identidad. OpenBao las valida con su método `kubernetes`, o SPIRE emite SVID por pod. External Secrets Operator o el inyector de OpenBao llevan los secretos al pod, y cert-manager emite los certificados internos.
- **Cloud sin Kubernetes.** Es lo más sencillo: el task role de ECS, la identidad administrada de Container Apps, la service account de Cloud Run o el rol de ejecución de Lambda ya son identidad de carga. Solo hay que dar una identidad distinta a cada servicio y no reutilizar la de la plataforma (el execution role de ECS no es el task role).
- **Kubernetes gestionado.** EKS Pod Identity, Workload Identity de AKS y Workload Identity Federation for GKE asocian una service account de Kubernetes con permisos cloud. En EKS sobre Fargate hay que seguir usando IRSA.

| Opción | Identidad de carga | Operación | Cuándo |
|---|---|---|---|
| Compose en un host | Agente OpenBao o SPIRE en el host | Media | Producto on-premises o un solo servidor |
| Kubernetes propio | Service accounts + OpenBao o SPIRE | Alta | Muchos servicios fuera de la nube |
| PaaS / funciones | Nativa del servicio | Baja | Por defecto en la nube |
| Kubernetes gestionado | Pod Identity / Workload Identity | Media | Ya tienes EKS, AKS o GKE |

## Decisiones clave

- **Una identidad de CI o dos.** Separar plan y apply cuesta poco y cambia mucho: un pull request malicioso puede modificar el workflow, así que lo único que lo hace inofensivo es que la identidad de plan solo lee. La de apply depende de que la rama y el entorno estén protegidos con revisores.
- **Qué claims comprobar.** Comprobar solo `aud` deja entrar a cualquier repositorio de GitHub. El mínimo es `sub` con repositorio y rama o entorno; mejor añadir los ID inmutables de repositorio y organización (sobreviven a un renombrado y evitan que alguien recree un repositorio con el mismo nombre) y el fichero de workflow.
- **Elevación temporal o privilegios permanentes.** La elevación reduce la ventana en la que una sesión robada sirve para algo, pero añade fricción. Pon duraciones cortas, aprobación solo para lo más crítico y un camino rápido para incidentes.
- **Secretos dinámicos o rotación.** Un secreto dinámico nace por petición y caduca solo; una rotación programada deja el secreto válido semanas. Si la base de datos admite autenticación por identidad, ni siquiera hace falta secreto.
- **Cuenta de emergencia.** Dos identidades cloud-only, fuera de la federación, con llave FIDO2 guardada físicamente, excluidas solo de las políticas que dependen del IdP y con alerta en cada inicio de sesión. Se prueban cada pocos meses.

## Errores habituales

- Confiar en el proveedor OIDC sin condición sobre el repositorio, o con comodines como `repo:org/*`.
- Dar a la identidad de apply permisos de administrador sin límite: puede crear un rol nuevo con más privilegios y asumirlo.
- Usar `pull_request_target` con un checkout del código del pull request: ejecuta código ajeno con los secretos y permisos de la rama base.
- Mantener las claves antiguas «por si acaso» después de migrar a OIDC.
- Que la cuenta de emergencia dependa del mismo IdP o del mismo Acceso condicional que falla en la emergencia.
- No activar ni revisar los logs de acceso a datos de los recursos sensibles (estado de Terraform, secretos): la auditoría de gestión no dice quién leyó el estado.
