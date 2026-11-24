---
title: "Cumplimiento y soberanía del dato en España y la UE"
short: "Cumplimiento y soberanía"
summary: "Cómo desplegar una carga con datos personales o regulados de forma que la residencia, el control de las claves, el acceso del proveedor y las evidencias de auditoría se garanticen por diseño y por política, no por buena voluntad."
description: "ENS, RGPD, NIS2 y DORA en la nube: residencia por política, claves externas, registros inmutables y DLP. Arquitectura en AWS, Azure, GCP y on-premises."
order: 31
requirements:
  - "Datos, copias y registros permanecen en las regiones permitidas, y lo impide una política, no un acuerdo verbal."
  - "Las claves de cifrado de los datos regulados están bajo control de la organización, con rotación y separación de funciones."
  - "Todo acceso y cambio, incluido el del personal del proveedor, queda en un registro que nadie puede alterar ni borrar antes de su plazo."
  - "Los datos personales se descubren y clasifican de forma continua, también donde nadie esperaba que estuvieran."
  - "Las evidencias para auditorías (ENS, RGPD, contratos) se generan de forma continua a partir de la configuración real."
platforms:
  onprem:
    summary: "CPD propio con certificación ENS, HSM propio para las claves, OPA para imponer políticas de ubicación y configuración, almacenamiento WORM con Wazuh para la auditoría y Microsoft Presidio para detectar datos personales."
    notes:
      - "Es la opción con más control y más trabajo: la certificación ENS del sistema, la seguridad física, la continuidad y la custodia de claves son tuyas de principio a fin."
      - "OPA (con Gatekeeper o Kyverno en Kubernetes y conftest en el pipeline de Terraform) impide desplegar fuera de los clústeres y ubicaciones permitidos."
      - "El HSM debe estar duplicado y sus claves respaldadas en otro HSM; perder el HSM sin copia equivale a perder los datos cifrados."
      - "Presidio detecta entidades como nombres, DNI, IBAN o teléfonos con reconocedores configurables; ajusta los de formatos españoles y mide falsos positivos."
      - "Un almacenamiento de objetos con Object Lock en modo cumplimiento sirve como WORM para registros y copias."
  aws:
    summary: "Región UE o AWS European Sovereign Cloud, cargas en ECS Fargate, SCP que deniegan regiones no permitidas, KMS con External Key Store, Aurora cifrado, Macie para descubrir datos personales y un registro inmutable de auditoría."
    notes:
      - "AWS European Sovereign Cloud está disponible desde el 15 de enero de 2026 con su primera región en Brandenburgo (Alemania): partición separada, operada desde la UE, con cuentas propias y un catálogo de servicios más reducido. Para muchos casos españoles basta la región de España (Aragón) con controles."
      - "CloudTrail Lake, el servicio del diagrama, no admite clientes nuevos desde el 31 de mayo de 2026. Usa un trail de organización hacia S3 con Object Lock en modo cumplimiento y validación de integridad, o los registros de CloudTrail en CloudWatch, que AWS propone como sustituto."
      - "Con External Key Store las claves no salen de tu HSM y cada operación pasa por tu proxy: si el proxy o el HSM caen, los datos dejan de poder descifrarse. Resérvalo para lo que de verdad lo exige."
      - "Macie analiza objetos en S3, no bases de datos: para revisar Aurora hay que exportar instantáneas a S3 en Parquet y analizarlas allí."
      - "AWS tiene certificación ENS categoría alta para un amplio catálogo de servicios y regiones; el certificado se descarga de AWS Artifact y cubre su parte, no tu sistema."
  azure:
    summary: "Regiones UE bajo el EU Data Boundary (o la oferta Microsoft Sovereign Cloud), Container Apps, Azure Policy con ubicaciones permitidas, Managed HSM para claves, PostgreSQL cifrado, registros exportados a almacenamiento inmutable y Microsoft Purview para protección de la información."
    notes:
      - "El EU Data Boundary, completado en febrero de 2025, compromete almacenamiento y tratamiento en la UE y la AELC para la mayoría de servicios; no es una nube separada. Sovereign Public Cloud añade Data Guardian (supervisión europea del acceso remoto de ingenieros, en despliegue) y Sovereign Private Cloud corre sobre Azure Local en tu CPD."
      - "Azure Policy incluye la iniciativa de cumplimiento normativo del ENS y la política de ubicaciones permitidas; asígnalas en el grupo de administración raíz, no por suscripción."
      - "Log Analytics permite purgar pero no modificar datos: para inmutabilidad real exporta a una cuenta de almacenamiento con política de retención por tiempo y escrituras anexadas protegidas habilitadas."
      - "Las capacidades de gobierno del dato de Purview (Data Map y Unified Catalog) están en retirada: no admiten cuentas nuevas desde noviembre de 2026. Las de seguridad (DLP, etiquetas de confidencialidad) siguen; para clasificar PostgreSQL valora Presidio en un job."
      - "Customer Lockbox exige tu aprobación cuando un ingeniero de Microsoft necesita acceder a datos del cliente para resolver una incidencia de soporte."
  gcp:
    summary: "Google Cloud Data Boundary con Assured Workloads (o Sovereign Controls by Partners), Cloud Run, la restricción de ubicaciones de recursos, Cloud External Key Manager, Cloud SQL cifrado, Access Transparency y Sensitive Data Protection."
    notes:
      - "Los paquetes de control de Assured Workloads incluyen una frontera de datos UE y Sovereign Controls by Partners; en España el socio es SIA/Minsait, en la región de Madrid. Google Cloud Dedicated (operado por un socio, como S3NS en Francia) es el escalón superior."
      - "Access Transparency registra el acceso del personal de Google, y Access Approval permite aprobarlo antes; ninguno de los dos es un registro inmutable de tu actividad. Para eso, un bucket de Cloud Logging con retención bloqueada o Cloud Storage con Bucket Lock."
      - "Cloud EKM con Key Access Justifications deja que tu gestor de claves externo deniegue cada petición según el motivo declarado por Google."
      - "Sensitive Data Protection descubre y perfila datos en BigQuery, Cloud SQL y Cloud Storage, y también desidentifica (enmascarado, tokenización)."
      - "Google Cloud y Workspace tienen certificación ENS categoría alta; la política `gcp.resourceLocations` impone las ubicaciones en toda la organización."
tiers:
  - name: "Región UE con controles base"
    when: "Empresa o administración con datos personales ordinarios y ENS categoría básica o media."
    cost: 1
    ops: 1
    onprem: "CPD propio o housing en España, cifrado de disco y de base de datos con claves en un gestor (OpenBao), registros centralizados en Wazuh y copias WORM."
    aws: "Región de España o de la UE, SCP de denegación de regiones, KMS con claves gestionadas por el cliente, trail de organización en S3 con Object Lock y Security Hub con controles."
    azure: "Spain Central u otra región UE, iniciativa ENS y ubicaciones permitidas en Azure Policy, Key Vault con claves del cliente y exportación de registros a almacenamiento inmutable."
    gcp: "Región de Madrid u otra UE, `gcp.resourceLocations`, Cloud KMS con claves del cliente, buckets de registros con retención bloqueada y Sensitive Data Protection."
    tradeoffs: "El proveedor custodia la infraestructura de claves y su personal podría acceder en casos excepcionales de soporte; suficiente para la mayoría, no para todos."
  - name: "Claves externas y acceso del proveedor controlado"
    when: "Datos de categoría alta, sector salud o financiero, o contratos que exigen que el proveedor no pueda descifrar sin tu intervención."
    cost: 2
    ops: 2
    onprem: "HSM dedicados en dos CPD, separación de funciones entre custodios de claves y administradores, y Presidio para clasificación continua."
    aws: "KMS External Key Store contra un HSM propio o de un socio, Macie con descubrimiento automatizado y registros con Object Lock en una cuenta separada."
    azure: "Managed HSM (o gestión externa de claves con Managed HSM), Customer Lockbox, claves del cliente en todos los servicios con datos y Purview para DLP."
    gcp: "Assured Workloads con frontera UE de nivel premium, Cloud EKM con Key Access Justifications, Access Approval y VPC Service Controls."
    tradeoffs: "Más latencia y una nueva dependencia crítica: si tu infraestructura de claves falla, la aplicación deja de leer sus datos."
  - name: "Nube soberana u operada por socio"
    when: "Sector público con ENS alta y requisitos de soberanía operativa, defensa o infraestructuras críticas con exigencias de inmunidad frente a leyes extranjeras."
    cost: 4
    ops: 3
    onprem: "CPD propio o nube privada nacional certificada, sin dependencia de servicios externos para operar, con plan de continuidad entre dos sedes."
    aws: "AWS European Sovereign Cloud, con cuentas, IAM y facturación separadas de la partición global y operación por personal residente en la UE."
    azure: "Sovereign Public Cloud con Data Guardian, Sovereign Private Cloud sobre Azure Local o una nube de socio nacional donde exista."
    gcp: "Sovereign Controls by SIA/Minsait en Madrid, Google Cloud Dedicated operado por un socio o Google Distributed Cloud air-gapped en tu CPD."
    tradeoffs: "Catálogo de servicios más corto, novedades más tarde, precios más altos y, en las variantes de socio, otro contrato y otro soporte."
extensions:
  - name: "Computación confidencial"
    when: "Cuando también quieres proteger los datos en uso frente al operador de la infraestructura."
    cost: "medium"
    onprem: "Hosts con AMD SEV-SNP o Intel TDX"
    aws: "Nitro Enclaves"
    azure: "Azure confidential VMs"
    gcp: "Confidential VMs"
  - name: "Perímetro contra exfiltración"
    when: "Para que ni una credencial robada pueda copiar datos a una cuenta o proyecto ajeno."
    cost: "low"
    onprem: "Proxy de salida con lista blanca"
    aws: "SCP, RCP y políticas de endpoint de VPC"
    azure: "Network Security Perimeter"
    gcp: "VPC Service Controls"
  - name: "Evidencias de cumplimiento continuas"
    when: "Cuando una auditoría ENS o de cliente pide pruebas de configuración de forma periódica."
    cost: "low"
    onprem: "Wazuh SCA u OpenSCAP"
    aws: "Security Hub y Config"
    azure: "Cumplimiento normativo de Azure Policy"
    gcp: "Security Command Center"
  - name: "Desidentificación y tokenización"
    when: "Para entornos de pruebas, analítica o proveedores que no necesitan el dato real."
    cost: "low"
    onprem: "Presidio (anonimizador)"
    aws: "Job propio con Presidio"
    azure: "Job propio con Presidio"
    gcp: "Desidentificación de SDP"
  - name: "Copias en una segunda región UE"
    when: "Cuando la continuidad exige recuperar ante la caída de una región sin salir de la jurisdicción."
    cost: "medium"
    onprem: "Segundo CPD en España"
    aws: "AWS Backup entre regiones UE"
    azure: "Azure Backup entre regiones UE"
    gcp: "Backup and DR entre regiones UE"
savings:
  - "Aplica claves externas (External Key Store, Cloud EKM, Managed HSM) solo a los datos que las exigen: añaden coste de HSM, latencia por operación y un punto de fallo. El resto, con claves gestionadas por el cliente en el KMS estándar."
  - "Lleva a la nube soberana o al CPD dedicado solo las cargas que lo requieren; lo demás puede vivir en una región UE estándar con políticas, a menor coste y con todo el catálogo."
  - "Escalona la retención de registros: pocos meses consultables y el resto en clases de archivo con bloqueo (S3 Glacier con Object Lock, nivel Archive con inmutabilidad, Cloud Storage Archive con Bucket Lock)."
  - "Configura Macie y Sensitive Data Protection con descubrimiento por muestreo y perfiles periódicos en vez de análisis completos recurrentes de todo el almacenamiento."
  - "Reutiliza las certificaciones del proveedor (ENS alta, ISO 27001) desde AWS Artifact, Service Trust Portal o Compliance Reports Manager: tu auditoría cubre tu parte, no la suya."
  - "Filtra los eventos de datos que registras (por ejemplo, solo buckets con datos regulados): registrar cada lectura de cada objeto multiplica el coste de auditoría."
---

## Cuándo lo necesitas

Cuando la carga trata datos personales a escala, sirve a una administración pública o pertenece a un sector regulado. En España eso significa casi siempre el Esquema Nacional de Seguridad (Real Decreto 311/2022, con categorías básica, media y alta según el impacto de un incidente), el RGPD y, según el sector, NIS2 o DORA. La arquitectura no sustituye al análisis jurídico ni a la evaluación de riesgos: describe controles técnicos que suelen pedir esos marcos. **Qué controles necesitas y si tu sistema es conforme depende del análisis de cada organización, de su DPD y de sus asesores; esto no es asesoramiento legal.**

## Escenarios

### Ayuntamiento o universidad con ENS media

Una sede electrónica con datos de ciudadanos. Región de España o UE, cifrado con claves del cliente, registros centralizados con retención acorde a la categoría y la iniciativa de controles ENS activa para generar evidencias. Los tres proveedores tienen certificación ENS alta para su parte; el sistema de la organización necesita su propia declaración o certificación de conformidad, y las guías CCN-STIC específicas de cada nube ayudan a configurarlo.

### Entidad financiera bajo DORA

DORA se aplica desde el 17 de enero de 2025 y exige gestionar el riesgo de los proveedores TIC: registro de información de contratos, estrategias de salida, pruebas de resiliencia y análisis de concentración. Técnicamente se traduce en infraestructura como código que se pueda desplegar en otro sitio, copias fuera del proveedor principal, claves bajo tu control y simulacros de recuperación documentados.

### Empresa sujeta a NIS2

NIS2 amplía los sectores obligados y endurece la notificación de incidentes y la responsabilidad de la dirección. En España, a finales de 2026, la ley de transposición seguía en tramitación y continuaba vigente el Real Decreto-ley 12/2018. Los controles técnicos de este caso (registro inmutable, gestión de claves, control de la cadena de suministro) son útiles se apruebe como se apruebe.

### Datos sensibles con exigencia de soberanía

Salud, defensa o infraestructura crítica, con un cliente que pregunta qué pasa si un gobierno extranjero requiere los datos al proveedor. El dato en la UE no basta: se busca que el proveedor no pueda descifrar sin tu intervención (claves externas), que su personal no acceda sin aprobación y registro, y, en el extremo, operación por una entidad europea o en tu propio CPD.

## Cómo encaja

Los ciudadanos o clientes entregan datos personales que solo entran por la región UE o nube soberana elegida. Ahí vive la carga regulada, y una política de residencia aplicada a nivel de organización (SCP, Azure Policy, restricción de ubicaciones, OPA) impide crear recursos fuera de las ubicaciones permitidas, también las copias y los registros.

La carga escribe en la base de datos cifrada. Las claves que protegen esos datos no las controla la aplicación ni el equipo de operación habitual: viven en un gestor bajo control de la organización, desde un KMS con claves del cliente hasta un HSM externo al proveedor, con separación de funciones entre quien administra claves y quien administra datos.

Cada acceso y cambio sobre los datos y la infraestructura se envía a un registro inmutable en una cuenta o proyecto separado, con retención bloqueada que ni un administrador puede acortar. A ese registro se suman, donde existen, los registros de acceso del personal del proveedor. En paralelo, la clasificación y DLP recorre periódicamente el almacenamiento y las bases de datos buscando datos personales donde no deberían estar: una exportación olvidada, un log con DNI, una tabla de pruebas copiada de producción.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Solo para entornos pequeños o de pruebas del modelo: el ENS de categoría media o alta pide redundancia, segregación y registros que un único host difícilmente cumple. Si se usa, cifrado de disco, secretos en OpenBao, registros enviados fuera del host a almacenamiento WORM y copias cifradas.

**Kubernetes on-premises.** RKE2 (orientado a cumplimiento, con perfil CIS) o k3s endurecido, Kyverno u OPA Gatekeeper para políticas, cert-manager, cifrado de secretos de etcd con KMS respaldado por HSM, CloudNativePG con cifrado y copias a Ceph RGW con Object Lock, y Wazuh recogiendo auditoría de Kubernetes y del sistema operativo.

**Cloud sin Kubernetes.** Es el diseño del diagrama: Fargate, Container Apps o Cloud Run en la región permitida, con identidad de carga de trabajo, base de datos gestionada con claves del cliente y políticas de organización. Comprueba que cada servicio que uses está en el alcance de la certificación ENS del proveedor y disponible en la oferta soberana elegida.

**Kubernetes gestionado.** EKS, AKS o GKE cuando necesitas portabilidad real hacia on-premises o hacia otra nube como estrategia de salida, o controles de red y admisión que la PaaS no da. Añade el cifrado de secretos con la clave del cliente y la auditoría del plano de control al registro central.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Un host | Media | Manual | Pruebas o categoría básica |
| Kubernetes on-premises | Tres o más nodos y HSM | Alta | HPA | Soberanía máxima o CPD propio |
| PaaS en región UE | Casi nulo | Baja | Automático | Opción por defecto |
| EKS, AKS, GKE | Plano de control y nodos | Media-alta | HPA y nodos | Estrategia de salida y portabilidad |

## Decisiones clave

- **Región UE con controles o nube soberana.** La región estándar tiene todo el catálogo y el mejor precio; la oferta soberana reduce la exposición jurídica y operativa a cambio de catálogo y coste. Decide por carga, no para toda la organización.
- **Quién guarda las claves.** Claves del cliente en el KMS del proveedor cubren la mayoría de casos; claves externas (HYOK) dan control real de descifrado a cambio de disponibilidad y operación propias.
- **Transferencias internacionales.** Soporte, telemetría y subencargados pueden tratar datos fuera de la UE aunque la región sea europea. Revisa el acuerdo de encargo, el mecanismo de transferencia (decisión de adecuación, cláusulas tipo) y qué cubre el compromiso de frontera de datos del proveedor.
- **Estrategia de salida desde el principio.** DORA y la Ley de Datos de la UE empujan a poder cambiar de proveedor: infraestructura como código, formatos abiertos y copias exportables.
- **Clasificar antes de proteger.** Sin saber dónde están los datos personales, cualquier control se aplica en el sitio equivocado.

## Errores habituales

- Elegir una región europea y dar por resuelta la residencia, sin restringir por política dónde se crean recursos, copias y registros.
- Guardar los registros de auditoría en la misma cuenta que administran los mismos que deberían ser auditados.
- Activar claves externas sin plan de alta disponibilidad del HSM y del proxy: una caída de claves es una caída del servicio.
- Asumir que la certificación ENS del proveedor certifica tu sistema.
- Copiar producción a preproducción con datos personales reales.
- Confundir Access Transparency o Customer Lockbox con tu propio registro de auditoría: registran al proveedor, no a tus administradores.
- Construir sobre servicios en retirada (CloudTrail Lake para clientes nuevos, el gobierno de datos de Purview) sin plan de migración.
