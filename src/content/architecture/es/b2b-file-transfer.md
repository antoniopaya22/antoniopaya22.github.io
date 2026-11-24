---
title: "Intercambio de ficheros con partners y bancos"
short: "Ficheros B2B (SFTP/EDI)"
summary: "Un punto de entrada SFTP o AS2 para bancos, proveedores y clientes, con claves bajo control, zona de aterrizaje, validación y antimalware, transformación EDI o CSV, idempotencia y acuses de recibo auditables."
description: "SFTP, FTPS y AS2 con claves SSH y PGP, antimalware, EDI X12/EDIFACT e idempotencia para partners y bancos: arquitectura en AWS, Azure, GCP y on-premises."
order: 27
requirements:
  - "Cada partner entra con su propia identidad (clave SSH o certificado AS2) y solo ve sus carpetas."
  - "Ningún fichero llega a los sistemas internos sin pasar validación de formato y análisis antimalware."
  - "Un fichero reenviado o duplicado no se procesa dos veces: idempotencia por partner, nombre y hash del contenido."
  - "Todo intercambio genera un acuse (MDN, 997/999, CONTRL o fichero de respuesta) y queda registrado con quién, qué, cuándo y resultado."
  - "Las claves privadas SSH, PGP y AS2 viven en un almacén de secretos y se rotan sin cortar a los partners."
platforms:
  onprem:
    summary: "SFTPGo como servidor SFTP y FTPS sobre Ceph RGW, claves en OpenBao, ClamAV y un validador propio, workers en Kubernetes para la transformación y Wazuh para la auditoría."
    notes:
      - "SFTPGo cubre SFTP, FTP/S, WebDAV y un cliente web, guarda en S3 compatible y lanza acciones en cada subida; no habla AS2, que requiere algo como OpenAS2."
      - "Conserva la clave de host del servidor en cada migración: los partners la tienen fijada y una clave nueva les rompe la conexión con un aviso de posible ataque."
      - "Algunos bancos españoles siguen usando EDITRAN para el intercambio con empresas; no lo cubre ningún servicio gestionado y suele implicar su propio software."
      - "Publica una IP fija y estable: bancos y grandes proveedores trabajan con listas blancas y cambiarla supone semanas de coordinación."
      - "El coste es operación: parches del servidor expuesto a Internet, rotación de claves, alta de partners y vigilancia de intentos de acceso."
  aws:
    summary: "Transfer Family como endpoint SFTP, FTPS o AS2 sobre S3, claves en Secrets Manager, GuardDuty Malware Protection for S3, B2B Data Interchange para X12 y CloudTrail con CloudWatch para auditoría."
    notes:
      - "Un endpoint de VPC con IP elásticas da a los partners direcciones fijas que pueden poner en su lista blanca; con un proveedor de identidad propio (Lambda o API Gateway) validas contra tu directorio."
      - "Los flujos gestionados de Transfer Family pueden descifrar PGP con claves guardadas en Secrets Manager, copiar, etiquetar y llamar a Lambda tras cada subida."
      - "B2B Data Interchange solo admite X12, y lo transforma a JSON o XML y viceversa; para EDIFACT necesitas tu propio traductor en Lambda o contenedores."
      - "Transfer Family también ofrece aplicaciones web para que un partner sin cliente SFTP suba y descargue desde el navegador, y conectores SFTP para enviar a servidores del partner."
      - "Se paga por hora y protocolo habilitado en cada endpoint más el volumen transferido: habilitar SFTP, FTPS y AS2 en el mismo servidor triplica el coste fijo."
  azure:
    summary: "Blob Storage con SFTP habilitado como endpoint, Key Vault para claves, Defender for Storage para antimalware, Logic Apps con la Enterprise Integration Pack para EDI y Azure Monitor para auditoría."
    notes:
      - "SFTP en Blob Storage exige espacio de nombres jerárquico y usa usuarios locales con clave SSH o contraseña, no identidades de Entra; no ofrece FTPS ni AS2."
      - "El soporte SFTP se cobra por hora mientras está habilitado en la cuenta, se use o no: deshabilítalo en entornos que no lo necesitan."
      - "Logic Apps admite AS2, X12, EDIFACT y RosettaNet; partners y acuerdos viven en una cuenta de integración, que tiene coste fijo por hora según su nivel. En Standard, mapas y esquemas pueden ir en la propia aplicación."
      - "Defender for Storage analiza cada blob al subirlo y publica el resultado en etiquetas del índice y en Event Grid: el procesamiento debe esperar a ese veredicto."
      - "La IP pública de una cuenta de almacenamiento no está garantizada; si el banco exige IP fija, el patrón habitual es un endpoint privado detrás de Azure Firewall con IP estática."
  gcp:
    summary: "SFTPGo en GKE como endpoint (o Cloud FTP, el SFTP gestionado de Google), Secret Manager para claves, ClamAV en Cloud Run, Cloud Run functions para la transformación y Cloud Audit Logs."
    notes:
      - "Desde agosto de 2026 Google Cloud tiene un SFTP gestionado, Cloud FTP: solo SFTP con clave pública, cada usuario se asocia a una cuenta de servicio con permisos sobre el bucket y hay servidores externos o internos por Private Service Connect."
      - "Cloud FTP no está en todas las regiones (en noviembre de 2026 no incluye Madrid) ni cubre FTPS, contraseñas o AS2: en esos casos sigue haciendo falta SFTPGo u otro servidor en GKE o Compute Engine."
      - "No hay servicio gestionado de EDI: el parsing de X12 o EDIFACT es código tuyo en Cloud Run o un producto de terceros del Marketplace."
      - "El escaneo con ClamAV en Cloud Run sigue una solución de referencia de Google: un evento de Cloud Storage dispara el análisis y el fichero se mueve a un bucket limpio o de cuarentena."
      - "Los registros de acceso a datos de Cloud Storage no están activos por defecto y tienen coste por volumen: actívalos solo en los buckets de intercambio."
tiers:
  - name: "Unos pocos partners"
    when: "Empresa que recibe extractos bancarios y pedidos en CSV de un puñado de partners, sin EDI ni AS2."
    cost: 1
    ops: 1
    onprem: "Un host con Docker Compose: SFTPGo, MinIO o un sistema de ficheros con copias, ClamAV y un worker que valida y carga en el ERP."
    aws: "Un servidor Transfer Family solo con SFTP y usuarios gestionados por el servicio, S3 con prefijos por partner, GuardDuty para S3 y una Lambda de validación."
    azure: "Una cuenta de almacenamiento con SFTP y usuarios locales, Defender for Storage y una Function que se dispara con Event Grid."
    gcp: "Un servidor Cloud FTP externo en una región que lo ofrezca, buckets por partner, ClamAV en Cloud Run y una Cloud Run function."
    tradeoffs: "Una sola instancia y transformación ad hoc por partner; el alta de cada partner es manual y la disponibilidad depende de un endpoint."
  - name: "Producción con PGP y acuses"
    when: "Decenas de partners y bancos, ficheros cifrados con PGP, acuses obligatorios y auditoría para clientes o reguladores."
    cost: 2
    ops: 2
    onprem: "Kubernetes con SFTPGo en dos réplicas tras un balanceador L4 con IP fija, Ceph RGW, OpenBao para claves, cola de trabajos y registro de envíos en PostgreSQL."
    aws: "Transfer Family en endpoint de VPC con IP elásticas en dos zonas, flujos gestionados con descifrado PGP, Step Functions para validar, transformar y generar acuses."
    azure: "SFTP en Blob Storage tras Azure Firewall, Logic Apps Standard para orquestar y generar acuses, Key Vault y Defender for Storage."
    gcp: "SFTPGo en GKE detrás de un balanceador de red con IP estática o Cloud FTP, Workflows para orquestar y ClamAV en Cloud Run."
    tradeoffs: "Más coste fijo por endpoint y orquestador; a cambio, alta de partners repetible y trazabilidad de cada fichero."
  - name: "EDI completo y AS2"
    when: "Cadena de suministro o retail con cientos de partners, X12 o EDIFACT, AS2 con MDN firmados y acuerdos de nivel de servicio."
    cost: 4
    ops: 3
    onprem: "SFTPGo y OpenAS2 en clúster, un traductor EDI comercial u open source y un portal de alta de partners; dos CPD si el negocio no tolera paradas."
    aws: "Transfer Family con SFTP y AS2, B2B Data Interchange para X12 y traducción propia de EDIFACT, con eventos de EventBridge hacia el ERP."
    azure: "Logic Apps Standard con cuenta de integración para AS2, X12 y EDIFACT, acuerdos por partner y seguimiento B2B en Azure Monitor."
    gcp: "Endpoint SFTP y AS2 en GKE, un traductor EDI de terceros del Marketplace o propio en Cloud Run y Pub/Sub hacia los sistemas internos."
    tradeoffs: "Coste fijo alto y conocimiento EDI escaso en el mercado; la configuración por partner (versiones, separadores, acuerdos) es el grueso del trabajo."
extensions:
  - name: "Envío saliente a servidores del partner"
    when: "Cuando eres tú quien deposita ficheros en el SFTP del banco o del cliente."
    cost: "low"
    onprem: "Acciones de SFTPGo o rclone"
    aws: "Conectores SFTP de Transfer Family"
    azure: "Conector SFTP de Logic Apps"
    gcp: "Job de Cloud Run con cliente SFTP"
  - name: "Portal web para partners"
    when: "Partners pequeños sin cliente SFTP que suben ficheros ocasionalmente."
    cost: "medium"
    onprem: "Cliente web de SFTPGo"
    aws: "Transfer Family web apps"
    azure: "App propia con SAS de delegación"
    gcp: "App en Cloud Run con URL firmadas"
  - name: "IP fija para listas blancas"
    when: "Bancos y grandes cuentas que solo aceptan conexiones desde o hacia IP declaradas."
    cost: "low"
    onprem: "VIP con keepalived"
    aws: "Endpoint de VPC con IP elásticas"
    azure: "Azure Firewall con IP estática"
    gcp: "IP externa estática en el balanceador"
  - name: "Cuarentena y reproceso"
    when: "Cuando un fichero falla validación y hay que corregirlo y relanzarlo sin pedirlo otra vez."
    cost: "low"
    onprem: "Bucket de cuarentena + cola"
    aws: "Prefijo de cuarentena + Step Functions"
    azure: "Contenedor de cuarentena + Logic Apps"
    gcp: "Bucket de cuarentena + Workflows"
  - name: "Retención inmutable de ficheros"
    when: "Cuando contratos o auditoría exigen conservar el original sin alteraciones durante años."
    cost: "medium"
    onprem: "Object Lock en Ceph RGW"
    aws: "S3 Object Lock"
    azure: "Almacenamiento inmutable de Blob"
    gcp: "Bucket Lock de Cloud Storage"
  - name: "Alta de partners automatizada"
    when: "A partir de unas decenas de partners: claves, carpetas, permisos y acuerdos desde un formulario o un PR."
    cost: "low"
    onprem: "Terraform + API de SFTPGo"
    aws: "Terraform o CloudFormation"
    azure: "Bicep o Terraform"
    gcp: "Terraform"
savings:
  - "Habilita en cada endpoint solo los protocolos que usa algún partner: en Transfer Family cada protocolo suma su propio coste por hora."
  - "Apaga o elimina los endpoints de desarrollo y preproducción fuera de uso: Transfer Family, SFTP en Blob Storage y Cloud FTP cobran por hora encendidos aunque no entre ni un fichero."
  - "Mueve los originales a clases de almacenamiento frías con reglas de ciclo de vida (S3 Glacier, nivel Cool o Archive, Coldline) tras el periodo de reproceso."
  - "Activa los registros de acceso a datos solo en los buckets o contenedores de intercambio y fija su retención; registrarlo todo en todas partes se paga por volumen."
  - "En Azure, elige el nivel más bajo de cuenta de integración que cubra tus partners y acuerdos, y no crees una por entorno si no la necesitas: tiene coste fijo por hora."
  - "Comprime antes de cifrar y transferir: reduce el volumen cobrado por GB y el tiempo de análisis antimalware."
---

## Cuándo lo necesitas

Cuando el mundo exterior no habla tu API. Los bancos devuelven extractos (Norma 43, camt.053) y aceptan remesas (pain.001) por SFTP o EDITRAN; los grandes clientes de retail mandan pedidos en EDI X12 o EDIFACT por AS2; los proveedores pequeños suben un CSV cada noche. Durante años esto ha sido un servidor SFTP olvidado en una DMZ, con usuarios compartidos y scripts de cron. Este caso lo convierte en una pieza de integración con identidad por partner, controles de seguridad, idempotencia y trazabilidad de extremo a extremo.

## Escenarios

### Pyme con extractos bancarios

Uno o dos bancos y unos pocos proveedores. Un SFTP gestionado con usuarios por partner, prefijos separados, antimalware y una función que valida el formato y carga en el ERP. La parte que más se olvida es el reproceso: guarda el original y un registro de qué se cargó, porque el banco reenviará el fichero de ayer el día que algo falle.

### Retail con EDI

Pedidos (850 en X12, ORDERS en EDIFACT), avisos de expedición y facturas con cientos de partners, cada uno con su versión y particularidades. Aquí se justifica un traductor EDI y la gestión de acuerdos por partner. AS2 aporta firma, cifrado y acuse firmado (MDN) que tiene valor de prueba de entrega; el acuse funcional (997, 999 o CONTRL) confirma además que el contenido se entendió.

### Entidad financiera regulada

Ficheros de pagos con datos personales y bancarios, auditoría externa y DORA. Cifrado PGP de extremo a extremo, claves en HSM o almacén gestionado con rotación, retención inmutable de originales y acuses, y registro de quién accedió a qué. El endpoint en una región de la UE y los registros en la misma jurisdicción.

### Partners sin capacidad técnica

Un transportista pequeño no tiene cliente SFTP ni sabe qué es una clave SSH. Un portal web con usuario y MFA que deja los ficheros en la misma zona de aterrizaje evita el correo electrónico con adjuntos, que es lo que acabaría pasando.

## Cómo encaja

El partner se conecta al endpoint SFTP (o envía por AS2) con su clave SSH o certificado. El endpoint toma su propia clave de host y las claves de descifrado del almacén de secretos, autentica al partner y lo confina en su carpeta de entrada. El fichero aterriza en la zona de aterrizaje, un almacenamiento de objetos con prefijos por partner y dirección (entrada, salida, cuarentena, procesado).

Cada subida dispara el análisis: antimalware y validación (formato, tamaño, estructura, nombre esperado). Si el fichero viene cifrado con PGP, primero se descifra en un área aislada: un fichero cifrado no se puede analizar. Solo los ficheros limpios pasan a la transformación, que calcula el hash del contenido y lo compara con un registro de ficheros ya procesados por partner; un duplicado se marca y no se carga. Después se parsea el EDI o el CSV, se convierte al formato interno y se entrega al ERP o a la base de datos. El resultado genera el acuse que vuelve al partner por el mismo canal.

En paralelo, la zona de aterrizaje y el endpoint emiten registros a la auditoría: conexiones, subidas, descargas, resultados del análisis y acuses enviados, con la retención que exijan contratos y normativa.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** SFTPGo con su base de datos de usuarios, MinIO o un volumen con copias, `clamd` con actualización de firmas por `freshclam`, un worker de validación y transformación, y un proxy L4 o la IP del host publicada en el puerto 22 o 2222. El puerto de administración de SFTPGo nunca se expone. Copias de la configuración, las claves de host y los ficheros.

**Kubernetes on-premises.** k3s o RKE2 con SFTPGo en varias réplicas compartiendo un almacenamiento S3 (Ceph RGW), un Service de tipo LoadBalancer con MetalLB para la IP fija, OpenBao con External Secrets Operator para las claves y KEDA para escalar los workers según la cola de ficheros pendientes.

**Cloud sin Kubernetes.** Es el diseño del diagrama en AWS y Azure: Transfer Family o SFTP en Blob Storage, eventos del almacenamiento y funciones u orquestadores (Step Functions, Logic Apps). En GCP, Cloud FTP cubre el SFTP si tu región lo ofrece, con Cloud Run para análisis y transformación.

**Kubernetes gestionado.** EKS, AKS o GKE compensan cuando necesitas protocolos que el servicio gestionado no da (FTPS en Azure o GCP, AS2 fuera de AWS, EDITRAN) o ya tienes la plataforma. Es la opción del diagrama en GCP.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Un host | Media | Vertical | Pocos partners, on-premises |
| Kubernetes on-premises | Tres o más nodos | Alta | Réplicas y KEDA | Exigencia on-premises con HA |
| Servicio SFTP gestionado | Por hora de endpoint | Baja | Gestionado | Opción por defecto en cloud |
| EKS, AKS, GKE | Plano de control y nodos | Media-alta | Réplicas | Protocolos no gestionados |

## Decisiones clave

- **Gestionado o autoalojado.** El servicio gestionado quita parches y disponibilidad del servidor expuesto; el autoalojado da protocolos y opciones que el gestionado no tiene. Compara también la facilidad para fijar IP.
- **Traductor EDI propio o de producto.** Un parser propio funciona para un par de mensajes con un par de partners; a partir de ahí, las variantes por partner justifican B2B Data Interchange, Logic Apps o un traductor comercial.
- **Idempotencia por hash, no solo por nombre.** Muchos partners reutilizan nombres (`extracto.txt`) o reenvían el mismo contenido con otro nombre: guarda ambos.
- **Push o pull.** Que el partner deposite en tu SFTP es más sencillo de controlar; recoger tú del suyo exige gestionar sus credenciales y su disponibilidad.
- **Cifrado de transporte frente a cifrado de contenido.** SFTP protege el trayecto; PGP o AS2 protegen el fichero en reposo y demuestran origen. Los bancos suelen pedir ambos.

## Errores habituales

- Usuarios compartidos entre partners o una contraseña común: imposible auditar o revocar a uno solo.
- Procesar el fichero en cuanto aparece, antes de que termine de subirse o de que el antimalware dé su veredicto.
- Analizar ficheros cifrados y darlos por limpios.
- Perder la clave de host al migrar el servidor y que todos los partners vean una alerta de seguridad.
- No guardar el original: sin él no hay reproceso ni prueba ante una reclamación.
- Responder con acuse positivo antes de validar el contenido.
- Dejar abierto el puerto 22 al mundo sin límite de intentos ni lista de IP cuando el partner tiene direcciones fijas.
