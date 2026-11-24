---
title: "Landing zone multicuenta y FinOps"
short: "Landing zone y FinOps"
summary: "Preparar la organización cloud antes de que lleguen los equipos: jerarquía de cuentas, guardarraíles que nadie puede saltarse, seguridad y logs centralizados, acceso de personas por grupos y costes visibles desde el primer día."
description: "Landing zone multicuenta con guardarraíles, cuenta de seguridad y de logs, acceso por grupos y FinOps: referencia en AWS, Azure, GCP y on-premises."
order: 16
requirements:
  - "Cada entorno y cada equipo vive en su propia cuenta, suscripción o proyecto, nunca mezclado con producción."
  - "Los guardarraíles preventivos se aplican desde la jerarquía y ningún administrador de una cuenta puede desactivarlos."
  - "Los logs de auditoría de todas las cuentas acaban en una cuenta aparte, inmutable y fuera del alcance de quien opera las cargas."
  - "Las personas acceden mediante grupos del IdP, sin usuarios locales ni claves de larga duración."
  - "Cada cuenta tiene presupuesto, alertas y etiquetas de coste, y el detalle de facturación se exporta a un almacén consultable."
  - "Hay un camino definido para crear cuentas sandbox y para suspender y cerrar las que ya no se usan."
platforms:
  onprem:
    summary: "Rancher gestiona varios clústeres (producción y no producción) como unidades de aislamiento, Kyverno o Gatekeeper aplican las políticas, Keycloak da acceso por grupos, Wazuh y Loki u OpenSearch centralizan seguridad y logs, y OpenCost reparte el coste."
    notes:
      - "El equivalente a una cuenta es un clúster (aislamiento fuerte) o un proyecto de Rancher con sus namespaces (aislamiento débil); para producción, clúster propio."
      - "Kyverno y Gatekeeper admiten modo auditoría y modo bloqueo: empieza auditando, revisa los informes de políticas y pasa a bloqueo por política, no todas a la vez."
      - "Keycloak federa con el directorio corporativo y sus grupos se mapean a roles de Rancher y a RBAC de Kubernetes; los usuarios locales quedan solo para emergencias."
      - "Loki u OpenSearch deben vivir fuera de los clústeres que vigilan, con retención y permisos propios, o un administrador de clúster podrá borrar su propio rastro."
      - "OpenCost no conoce tu factura: hay que darle el coste real de nodos, almacenamiento y red del CPD para que el reparto por namespace tenga sentido."
  aws:
    summary: "AWS Organizations organiza las cuentas en OU, las SCP y RCP fijan el máximo de permisos, GuardDuty y Security Hub vigilan desde una cuenta de seguridad, un trail de organización escribe en S3 de una cuenta de logs, IAM Identity Center da acceso por grupos y Budgets más CUR 2.0 cubren el coste."
    notes:
      - "Las SCP limitan a los principales de las cuentas miembro y las RCP limitan los recursos (S3, KMS, STS, SQS, Secrets Manager y otros servicios compatibles) frente a principales externos; ninguna de las dos afecta a la cuenta de administración ni a los roles vinculados a servicios, así que en la cuenta de administración no se despliega nada."
      - "AWS Control Tower monta la estructura habitual (OU Security con las cuentas Log Archive y Audit) y añade controles detectivos basados en AWS Config; Config se paga por elemento de configuración registrado y por evaluación de reglas."
      - "Delega la administración de GuardDuty y Security Hub en la cuenta de seguridad. Desde diciembre de 2025, Security Hub es el servicio que correlaciona hallazgos y el antiguo pasa a llamarse Security Hub CSPM (los controles de buenas prácticas)."
      - "CUR 2.0 se crea en Data Exports y se consulta con Athena; si necesitas comparar con otras nubes, la misma herramienta exporta en formato FOCUS."
      - "Con la gestión centralizada del acceso root puedes eliminar las credenciales root de las cuentas miembro y guardar solo las de la cuenta de administración, con MFA físico."
  azure:
    summary: "Los management groups ordenan las suscripciones, Azure Policy aplica guardarraíles heredados, Defender for Cloud evalúa la postura, Log Analytics centraliza logs, Entra ID con PIM da acceso temporal por grupos y Cost Management cubre presupuestos y exportaciones."
    notes:
      - "La jerarquía de Azure Landing Zones separa Platform (gestión, conectividad, identidad), Landing zones (corp y online), Sandbox y Decommissioned; en Terraform, el módulo caf-enterprise-scale está sustituido por los Azure Verified Modules de plataforma (AVM)."
      - "Azure Policy hace de guardarraíl preventivo (`Deny`), detectivo (`Audit`) y correctivo (`DeployIfNotExists`, `Modify`); las asignaciones con remediación necesitan una identidad administrada con permisos en el ámbito."
      - "Defender for Cloud incluye una postura básica gratuita; los planes de pago se facturan por recurso protegido, así que actívalos por suscripción, no en bloque."
      - "PIM convierte los roles de Azure y la pertenencia a grupos en asignaciones elegibles con activación temporal y aprobación; exige licencia Entra ID P2 o Entra ID Governance."
      - "Log Analytics se paga por GB ingerido y por retención: el destino de los diagnósticos de toda la organización suele ser el mayor coste de la plataforma."
  gcp:
    summary: "El nodo de organización y sus carpetas (production, non-production) ordenan los proyectos, las organization policies fijan guardarraíles, Security Command Center vigila, un sink de organización agrega logs, Cloud Identity con IAM da acceso por grupos y los presupuestos de facturación avisan del gasto."
    notes:
      - "Usa la API v2 de organization policies (`google_org_policy_policy` en Terraform, que sustituye a `google_organization_policy`): admite condiciones por tags, `dry_run_spec` para probar antes de aplicar y restricciones personalizadas."
      - "Los permisos se conceden a grupos de Cloud Identity en la carpeta, no a usuarios en cada proyecto; los roles básicos (Owner, Editor) no deberían aparecer fuera de sandbox."
      - "El sink agregado de organización (con `include_children`) envía los logs de auditoría a un bucket de logs o a BigQuery en un proyecto de logging que solo lee el equipo de seguridad."
      - "Security Command Center tiene niveles Standard, Premium y Enterprise; el nivel decide qué detecciones (Security Health Analytics, amenazas) tienes de verdad."
      - "Los presupuestos solo avisan: para actuar, publícalos en Pub/Sub y reacciona con una función; la exportación de facturación a BigQuery es la base de cualquier análisis FinOps."
tiers:
  - name: "Base mínima"
    when: "Una empresa pequeña con uno o dos equipos que pasa de una sola cuenta a varias."
    cost: 1
    ops: 1
    onprem: "Un clúster k3s o RKE2 con namespaces por entorno, Kyverno en auditoría, Keycloak para el acceso y Loki en un host aparte."
    aws: "Organizations con OU Prod, NonProd y Security, unas pocas SCP, trail de organización a S3 en la cuenta de logs, Identity Center y Budgets por cuenta."
    azure: "Un management group intermedio, suscripciones prod y no-prod, iniciativas de Azure Policy integradas, un Log Analytics y presupuestos de Cost Management."
    gcp: "Organización con carpetas production y non-production, organization policies básicas, sink de organización a un bucket de logs y exportación de facturación a BigQuery."
    tradeoffs: "Seguridad y logs comparten cuenta, la detección es básica y crear cuentas sigue siendo manual."
  - name: "Plataforma estándar"
    when: "Varios equipos de producto, auditoría externa o clientes que piden evidencias de control."
    cost: 2
    ops: 2
    onprem: "Rancher con clústeres separados de producción y no producción, Kyverno en bloqueo, Wazuh, OpenSearch y OpenCost con el coste real del CPD."
    aws: "Control Tower con Log Archive y Audit, GuardDuty y Security Hub delegados, Account Factory, OU Sandbox y Suspended y CUR 2.0 consultado con Athena."
    azure: "Azure Landing Zones con AVM, Defender for Cloud en suscripciones de producción, PIM para roles privilegiados y exportaciones de coste a Storage."
    gcp: "Carpetas por entorno y unidad, Security Command Center, fábrica de proyectos en Terraform, restricciones personalizadas y presupuestos con Pub/Sub."
    tradeoffs: "Más piezas que mantener y un equipo de plataforma que las posea; los cambios en guardarraíles pasan por revisión."
  - name: "Organización regulada"
    when: "Sector regulado, varias unidades de negocio o regiones y obligación de conservar evidencias durante años."
    cost: 3
    ops: 3
    onprem: "Varios clústeres por zona de seguridad, logs WORM en almacenamiento de objetos, Wazuh conectado a un SIEM y acceso privilegiado con aprobación."
    aws: "RCP de perímetro de datos, logs con S3 Object Lock, Security Lake o SIEM externo, acceso temporal con aprobación y compromisos de ahorro compartidos."
    azure: "Management groups por unidad, Microsoft Sentinel, almacenamiento inmutable para logs, PIM con aprobación y revisiones de acceso periódicas."
    gcp: "VPC Service Controls, Assured Workloads si aplica, Google SecOps, Bucket Lock en los logs y Privileged Access Manager."
    tradeoffs: "Coste fijo alto en SIEM y retención, y cada excepción a un guardarraíl necesita un proceso formal."
extensions:
  - name: "Fábrica de cuentas"
    when: "Cuando se crean cuentas o proyectos cada semana y el alta manual ya no escala."
    cost: "low"
    onprem: "Rancher + plantillas de clúster"
    aws: "Account Factory for Terraform"
    azure: "Subscription vending (AVM)"
    gcp: "Project factory en Terraform"
  - name: "Perímetro de datos"
    when: "Cuando hay que garantizar que los datos solo se leen desde identidades y redes de la organización."
    cost: "low"
    onprem: "NetworkPolicies + Kyverno"
    aws: "RCPs + políticas de VPC endpoint"
    azure: "Azure Policy + Private Link"
    gcp: "VPC Service Controls"
  - name: "Acceso privilegiado temporal"
    when: "Cuando nadie debería tener permisos de administración permanentes."
    cost: "low"
    onprem: "Keycloak + grupos con caducidad"
    aws: "Identity Center + TEAM"
    azure: "Entra PIM"
    gcp: "Privileged Access Manager"
  - name: "SIEM central"
    when: "Cuando hay un equipo que investiga incidentes y necesita correlacionar todas las cuentas."
    cost: "high"
    onprem: "Wazuh + OpenSearch"
    aws: "Amazon Security Lake + SIEM"
    azure: "Microsoft Sentinel"
    gcp: "Google SecOps"
  - name: "Logs inmutables"
    when: "Cuando una auditoría o una norma exige que nadie, ni siquiera un administrador, pueda borrar los logs."
    cost: "medium"
    onprem: "MinIO o Ceph con object lock"
    aws: "S3 Object Lock"
    azure: "Blob Storage inmutable"
    gcp: "Bucket Lock"
  - name: "Showback por equipo"
    when: "Cuando varios equipos comparten factura y nadie sabe qué parte es suya."
    cost: "low"
    onprem: "OpenCost por namespace"
    aws: "Tag policies + Cost Categories"
    azure: "Herencia de etiquetas con Policy"
    gcp: "Labels + BigQuery billing export"
savings:
  - "Compra los compromisos (Savings Plans, reservas, CUD) una sola vez para toda la organización y comparte el descuento: en AWS el reparto entre cuentas está activo por defecto, en Azure usa ámbito compartido o de management group y en GCP activa el reparto de CUD en la cuenta de facturación."
  - "Mantén un único trail de organización para eventos de gestión (la primera copia es gratuita) y activa eventos de datos solo en los buckets o tablas que lo necesiten."
  - "Reduce el coste de la detección: AWS Config con registro periódico en cuentas de no producción, planes de pago de Defender for Cloud y protecciones extra de GuardDuty solo donde haya datos de producción."
  - "Controla el volumen de logs centralizados: excluye en el sink los logs ruidosos que nadie consulta, usa el plan de tabla Basic de Log Analytics para logs de depuración y mueve el archivo a almacenamiento frío."
  - "Pon a las cuentas sandbox un presupuesto con acción automática (una SCP de denegación en AWS, una automatización desde el action group en Azure, una función vía Pub/Sub en GCP) y una fecha de caducidad."
  - "Mueve las cuentas sin dueño a Suspended, ciérralas tras el periodo de retención y en on-premises usa OpenCost para encontrar namespaces que reservan mucho más de lo que usan."
---

## Cuándo lo necesitas

Cuando la segunda o tercera aplicación llega a la misma cuenta cloud que la primera. Todo funciona hasta que un desarrollador con permisos de administrador en desarrollo borra un recurso de producción, una auditoría pregunta quién cambió qué hace seis meses o la factura sube un 40 % y nadie sabe qué equipo fue. Una landing zone es el andamiaje que se monta antes que las cargas: dónde vive cada cosa, qué no se puede hacer nunca, quién entra y cómo y cuánto cuesta cada parte. Montarla a posteriori, con cien recursos ya desplegados, cuesta mucho más que empezar con ella.

## Escenarios

- **Startup que pasa de una cuenta a varias.** Basta con la jerarquía, separar producción y desarrollo, un trail de organización, acceso por SSO y presupuestos con alertas. Nada de Control Tower ni SIEM todavía: el objetivo es que el crecimiento no rompa el aislamiento.
- **Empresa regulada con datos en la UE.** Los guardarraíles preventivos restringen regiones y servicios, los logs van a almacenamiento inmutable con retención de años y el acceso privilegiado es temporal y con aprobación. El perímetro de datos (RCP, VPC Service Controls, Private Link) pasa de opcional a obligatorio.
- **Grupo con varias unidades de negocio.** Cada unidad tiene su rama en la jerarquía y sus presupuestos, pero seguridad, logs y compras de compromisos son centrales. El showback por etiquetas es lo que evita discusiones a fin de mes.
- **Cliente que exige on-premises.** La misma idea se traslada a clústeres: Rancher como organización, clústeres o proyectos como cuentas, Kyverno como SCP y OpenCost como factura interna.
- **Formación o hackathons.** Muchas cuentas sandbox de vida corta, con presupuesto pequeño, acción automática al superarlo y cierre programado.

## Cómo encaja

1. En la raíz está la organización: AWS Organizations, el árbol de management groups, el nodo de organización de GCP o Rancher en on-premises. De ella cuelgan tres piezas comunes.
2. Los guardarraíles se aplican desde la jerarquía hacia abajo. Los preventivos (SCP y RCP, Azure Policy con `Deny`, organization policies, Kyverno en bloqueo) impiden la acción; los detectivos (AWS Config y Security Hub CSPM, `Audit`, Security Health Analytics, informes de Kyverno) la detectan y avisan.
3. La seguridad central (GuardDuty y Security Hub, Defender for Cloud, Security Command Center, Wazuh) recibe los hallazgos de todas las cuentas en una cuenta de seguridad delegada.
4. El archivo de logs recibe la auditoría de toda la organización en una cuenta aparte, que solo lee el equipo de seguridad.
5. Debajo de los guardarraíles cuelgan las cargas, separadas en producción y no producción. Las personas entran a ellas mediante grupos del IdP, con más restricciones en producción, y cada cuenta reporta su gasto a presupuestos y a la exportación de costes.

## Despliegue: Docker, Kubernetes o serverless

Una landing zone es sobre todo configuración declarada como código (Terraform o el acelerador de cada nube), pero tiene piezas que ejecutar.

**Docker Compose en un host.** Para una organización pequeña on-premises: Keycloak con su PostgreSQL, Loki y Grafana, y el gestor de Wazuh, cada uno con su volumen, detrás de un proxy inverso con TLS (Traefik o Caddy). Ese host vigila uno o dos clústeres k3s y se copia con restic a otra máquina. Es barato, pero es un punto único de fallo: si cae, se pierde el acceso y la auditoría a la vez.

**Kubernetes on-premises.** Rancher sobre un clúster RKE2 propio de gestión, que crea y gobierna los clústeres de carga. En cada uno: Kyverno o Gatekeeper, cert-manager, el agente de Wazuh y el de logs hacia Loki u OpenSearch, y OpenCost. Keycloak puede ir en el clúster de gestión con su operador y una base de datos gestionada por CloudNativePG.

**Cloud sin Kubernetes.** Es la forma natural: todo son servicios gestionados configurados con Terraform. Lo que se ejecuta son automatismos pequeños: una función que reacciona a un presupuesto, la canalización que crea cuentas o una remediación disparada por un hallazgo (Lambda, Azure Functions o Automation, Cloud Run functions).

**Kubernetes gestionado.** La landing zone no necesita EKS, AKS ni GKE, pero debe prepararlos: guardarraíles en el clúster (Kyverno o Gatekeeper; en AKS, el complemento de Azure Policy), logs de plano de control enviados al archivo central y acceso por grupos del IdP mapeados a RBAC.

| Opción | Coste fijo | Operación | Cuándo |
|---|---|---|---|
| Compose en un host | Muy bajo | Media, todo manual | On-premises pequeño, un equipo |
| Kubernetes on-premises | Medio (hardware y gestión) | Alta | Varios clústeres y equipos en CPD propio |
| Servicios gestionados + funciones | Bajo, crece con logs y detección | Baja | Cualquier organización en cloud |
| Gestionado + Kubernetes | Medio | Media | Cuando las cargas ya corren en EKS, AKS o GKE |

## Decisiones clave

- **Herramienta propia o acelerador.** Control Tower, Azure Landing Zones y las fundaciones de Google dan una estructura probada en días, a cambio de aceptar sus convenciones. Terraform propio da control total, pero cada pieza es tuya.
- **Granularidad de las cuentas.** Una cuenta por entorno y aplicación aísla mejor y reparte el coste sin etiquetas, pero multiplica accesos, redes y presupuestos. Una por entorno y equipo es el punto medio habitual.
- **Preventivo frente a detectivo.** Bloquea solo lo que nunca debe ocurrir (desactivar el trail, regiones prohibidas, recursos públicos en producción); el resto, detéctalo. Un exceso de denegaciones lleva a pedir excepciones y luego a ignorarlas.
- **Quién posee la plataforma.** Sin un equipo responsable de guardarraíles, logs y fábrica de cuentas, la landing zone se degrada en meses.

## Errores habituales

- Desplegar cargas en la cuenta de administración, donde las SCP y RCP no se aplican.
- Dejar los logs de auditoría en la misma cuenta que vigilan, con permisos para que su administrador los borre.
- Activar guardarraíles preventivos en la raíz sin probarlos antes en una OU o en modo `dry_run` y bloquear despliegues en producción.
- Usuarios IAM o cuentas locales para personas «solo por ahora», que siguen ahí dos años después.
- Confiar en que un presupuesto para el gasto: solo avisa, salvo que le conectes una acción.
- No tener una cuenta de emergencia probada, o tenerla sin alertas cuando se usa.
