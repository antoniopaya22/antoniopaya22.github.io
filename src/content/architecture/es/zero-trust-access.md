---
title: "Acceso Zero Trust sin VPN"
short: "Zero Trust sin VPN"
summary: "Dar acceso a aplicaciones internas decidiendo en cada petición según quién es el usuario y en qué estado está su dispositivo, en lugar de confiar en que está dentro de la red."
description: "Acceso Zero Trust a aplicaciones internas sin VPN con identidad, MFA, postura del dispositivo y proxy: referencia en AWS, Azure, GCP y on-premises."
order: 15
requirements:
  - "Ninguna aplicación interna queda expuesta directamente a Internet ni a una red plana."
  - "Cada sesión exige MFA, preferiblemente resistente al phishing."
  - "El acceso se concede por aplicación, nunca a un segmento de red completo."
  - "La postura del dispositivo se vuelve a evaluar durante la sesión, no solo al conectar."
  - "Cada decisión, permitida o denegada, queda registrada en el SIEM."
platforms:
  onprem:
    summary: "Keycloak autentica con MFA, osquery o Wazuh aportan la postura del dispositivo y un Software-Defined Perimeter (controlador más gateway con Single Packet Authorization) mantiene la aplicación invisible hasta que la política la abre."
    notes:
      - "Con SPA (por ejemplo, `fwknop`) el gateway descarta todo por defecto y solo abre el puerto a la IP que envía un paquete autenticado: un escaneo no encuentra nada que atacar. Esta combinación de SDP, SPA y Keycloak es la línea de investigación del autor (SecureSDP, IJIS 2024; iam-ids-sdp, IJIS 2025)."
      - "Keycloak hace de IdP con OTP o WebAuthn y passkeys; el controlador del SDP consume sus tokens OIDC para decidir qué servicios abre a cada usuario."
      - "La postura sale de agentes (osquery, Wazuh) y hay que reducirla a señales simples para la política: disco cifrado, parches al día, EDR activo."
      - "Si prefieres algo con más ecosistema, OpenZiti ofrece una red overlay Zero Trust y Pomerium un proxy con identidad para aplicaciones web."
      - "El coste es operación: controlador y gateways en alta disponibilidad, agentes en cada equipo y reglas de postura que alguien mantiene."
  aws:
    summary: "AWS Verified Access evalúa cada petición con la identidad de IAM Identity Center (u otro IdP OIDC) y la postura que aportan Jamf o CrowdStrike antes de dejarla llegar a la aplicación en una VPC privada."
    notes:
      - "Las políticas se escriben en Cedar y combinan claims del usuario con datos del dispositivo; además de HTTP, Verified Access admite aplicaciones TCP (SSH, RDP, bases de datos) mediante su cliente."
      - "IAM Identity Center como proveedor de confianza exige una instancia de organización en la misma región; en la práctica suele federar con el IdP corporativo."
      - "Los proveedores de postura admitidos son Jamf, CrowdStrike y JumpCloud; para aplicaciones web necesitan la extensión de Verified Access en el navegador."
      - "Security Lake normaliza a OCSF pero no es un SIEM: los logs de Verified Access (ya en OCSF) van a S3, CloudWatch Logs o Firehose, entran como fuente personalizada y la detección la hace otra herramienta encima."
      - "Verified Access se paga por hora de cada aplicación asociada y por volumen de datos procesado."
  azure:
    summary: "Microsoft Entra Private Access publica las aplicaciones internas a través de conectores, con Acceso condicional de Entra ID exigiendo MFA y dispositivo conforme en Intune."
    notes:
      - "Forma parte de Global Secure Access: el cliente del dispositivo enruta solo el tráfico de las aplicaciones publicadas y un conector de red privada en la VNet o el CPD abre conexiones salientes, sin puertos de entrada."
      - "La decisión la toma Acceso condicional: por aplicación, exige MFA resistente al phishing y que Intune marque el dispositivo como conforme."
      - "Cubre TCP y UDP, no solo web; para una aplicación web sencilla, el proxy de aplicación de Entra sigue siendo una opción más ligera."
      - "El coste son licencias por usuario de Entra (Private Access o Entra Suite) e Intune, no infraestructura por aplicación."
      - "Microsoft Sentinel ingiere los registros de Entra ID y de Global Secure Access con conectores propios."
  gcp:
    summary: "Identity-Aware Proxy autentica con Cloud Identity y aplica niveles de acceso de Access Context Manager, alimentados por Endpoint Verification, antes de dejar pasar a la aplicación en la VPC."
    notes:
      - "IAP protege aplicaciones HTTPS detrás de un balanceador y también TCP (SSH, RDP) mediante reenvío; la aplicación no necesita IP pública."
      - "Endpoint Verification recoge cifrado, sistema operativo y bloqueo de pantalla; Access Context Manager convierte esas señales en niveles de acceso que IAP exige por aplicación."
      - "Las condiciones de dispositivo forman parte de Chrome Enterprise Premium (antes BeyondCorp Enterprise): revisa la licencia antes de diseñar las políticas."
      - "Cloud Identity puede federar con un IdP externo por SSO; el MFA se aplica allí donde el usuario se autentica de verdad."
      - "Google SecOps ingiere los registros de auditoría de IAP desde Cloud Logging; el coste está sobre todo en las licencias y en el volumen ingerido en el SIEM."
tiers:
  - name: "Proxy con identidad para web"
    when: "Pocas aplicaciones web internas, sin MDM y con el objetivo de sacarlas de la VPN cuanto antes."
    cost: 1
    ops: 1
    onprem: "Docker Compose con Keycloak (WebAuthn y passkeys) y Pomerium u oauth2-proxy delante de cada aplicación, con el firewall aceptando tráfico solo desde el proxy."
    aws: "Verified Access con IAM Identity Center u otro IdP OIDC y sin proveedor de postura; para herramientas internas de bajo riesgo, un ALB con autenticación OIDC."
    azure: "Proxy de aplicación de Microsoft Entra, incluido en Entra ID P1, con Acceso condicional exigiendo MFA resistente al phishing."
    gcp: "Identity-Aware Proxy con Cloud Identity, sin condiciones de dispositivo; para recursos de Google Cloud no tiene coste propio, solo el del balanceador."
    tradeoffs: "Solo HTTP y sin postura del dispositivo: unas credenciales robadas desde un equipo cualquiera siguen entrando si superan el MFA."
  - name: "Identidad, postura y TCP"
    when: "Empresa con MDM o EDR, aplicaciones web y también SSH, RDP o bases de datos, y la VPN con fecha de retirada."
    cost: 2
    ops: 2
    onprem: "Keycloak, osquery o Wazuh para la postura y OpenZiti o un SDP con SPA para web y TCP, todo en Kubernetes."
    aws: "Verified Access con Jamf, CrowdStrike o JumpCloud como proveedor de confianza del dispositivo y su cliente para aplicaciones TCP."
    azure: "Entra Private Access con conectores de red privada, Intune marcando el cumplimiento y Acceso condicional por aplicación."
    gcp: "IAP para web y reenvío TCP, Endpoint Verification y niveles de acceso con atributos de dispositivo, que requieren Chrome Enterprise Premium."
    tradeoffs: "Licencias por usuario y agentes en cada equipo; las reglas de postura necesitan dueño y excepciones bien gestionadas."
  - name: "SDP completo y regulado"
    when: "Entorno regulado o crítico, varias sedes o CPD, acceso privilegiado controlado y correlación en el SIEM."
    cost: 4
    ops: 3
    onprem: "SDP con controlador en alta disponibilidad y gateways SPA por sede, Keycloak en clúster, Teleport para acceso privilegiado con grabación de sesiones y Wazuh en clúster."
    aws: "Verified Access en varias cuentas y regiones, IAM Identity Center federado, Security Lake con un SIEM encima y Session Manager para acceso administrativo."
    azure: "Microsoft Entra Suite (Private Access, Internet Access, ID Governance), PIM, evaluación continua de acceso y Microsoft Sentinel."
    gcp: "Chrome Enterprise Premium con IAP, Privileged Access Manager para elevación temporal y Google SecOps."
    tradeoffs: "Es el escalón con más licencias y más operación; solo compensa si el regulador o el riesgo lo justifican."
extensions:
  - name: "SSH y RDP sin bastión expuesto"
    when: "Cuando administradores o proveedores necesitan entrar en servidores y hoy lo hacen por VPN o con un bastión con IP pública."
    cost: "low"
    onprem: "Teleport"
    aws: "Systems Manager Session Manager"
    azure: "Azure Bastion"
    gcp: "Reenvío TCP de IAP"
  - name: "Acceso privilegiado just-in-time"
    when: "Cuando los permisos de administración no deben estar activos siempre y cada elevación necesita aprobación y registro."
    cost: "low"
    onprem: "Teleport (solicitudes de acceso)"
    aws: "Identity Center + aprobación"
    azure: "Entra Privileged Identity Management"
    gcp: "Privileged Access Manager"
  - name: "Microsegmentación este-oeste"
    when: "Cuando quieres que una aplicación comprometida no pueda hablar con las demás aunque esté en la misma red."
    cost: "low"
    onprem: "Cilium NetworkPolicy"
    aws: "Security groups por servicio"
    azure: "NSG + grupos de seguridad de aplicación"
    gcp: "Políticas de firewall con etiquetas"
  - name: "Salida a Internet filtrada"
    when: "Cuando además del acceso a lo interno tienes que controlar a qué sitios salen los equipos sin volver a enrutar por la VPN."
    cost: "medium"
    onprem: "Squid con listas y SSL Bump"
    aws: "AWS Network Firewall"
    azure: "Microsoft Entra Internet Access"
    gcp: "Secure Web Proxy"
  - name: "Detección de riesgo de identidad"
    when: "Cuando quieres que inicios de sesión anómalos o credenciales filtradas suban el nivel de exigencia o corten la sesión."
    cost: "medium"
    onprem: "Reglas de Wazuh sobre Keycloak"
    aws: "Amazon GuardDuty"
    azure: "Microsoft Entra ID Protection"
    gcp: "Google SecOps (UEBA)"
savings:
  - "Elige el escalón por aplicación, no para toda la empresa: las aplicaciones web van por el proxy sin cliente y solo las que necesitan SSH, RDP o protocolos propios justifican cliente y licencias de acceso a red."
  - "En Azure, comprueba si el proxy de aplicación de Entra, incluido en Entra ID P1, cubre tus aplicaciones web antes de licenciar Private Access o Entra Suite para todos los usuarios."
  - "En Google Cloud, IAP no tiene coste propio para recursos de Google Cloud; paga Chrome Enterprise Premium solo si necesitas condiciones de dispositivo o proteger recursos fuera de Google Cloud."
  - "En AWS, Verified Access se paga por hora de cada aplicación asociada: no dejes endpoints de entornos temporales vivos y usa un ALB con autenticación OIDC para herramientas internas de bajo riesgo."
  - "Reutiliza el MDM o EDR que ya pagas (Intune, Jamf, CrowdStrike) como fuente de postura en lugar de desplegar otro agente."
  - "Envía al SIEM las decisiones de acceso y los eventos de identidad, y deja los registros de tráfico detallados en niveles baratos (registros auxiliares o el data lake de Sentinel, S3 con ciclo de vida bajo Security Lake) con retención acotada; retirar los concentradores VPN y sus licencias suele compensar buena parte del coste."
---

## Cuándo lo necesitas

Cuando la respuesta a «necesito entrar en la aplicación interna» es «conéctate a la VPN». Una VPN autentica una vez y luego da acceso a una red entera: un portátil comprometido o unas credenciales robadas llegan a todo lo que haya en ese segmento. Zero Trust cambia la pregunta de «¿estás dentro?» a «¿quién eres, desde qué dispositivo y puedes usar esta aplicación ahora?», y la responde en cada petición.

## Escenarios

- **Startup con todo en SaaS y un par de herramientas internas.** Un panel de administración y un Grafana. No hace falta red overlay ni agentes: un proxy con identidad (IAP, Verified Access, proxy de aplicación de Entra o Pomerium) con passkeys resuelve el caso en un día y elimina la VPN.
- **Empresa mediana con portátiles gestionados.** Ya hay Intune, Jamf o CrowdStrike. La postura del dispositivo entra en la política: disco cifrado, sistema al día y EDR activo para entrar en el ERP o en las bases de datos. Las aplicaciones TCP pasan por el cliente del servicio y la VPN se retira por fases.
- **Contratistas y proveedores externos.** No controlas sus equipos, así que no hay postura fiable. Acceso solo web, sin cliente, con MFA resistente al phishing, a una lista corta de aplicaciones, con sesiones cortas y grabación si es acceso administrativo.
- **Entorno regulado o infraestructura crítica on-premises.** El servicio no puede depender de un proveedor cloud. Un Software-Defined Perimeter con Keycloak y Single Packet Authorization deja los servicios invisibles a escaneos; la postura sale de osquery o Wazuh y todo acaba en un SIEM propio. Es más operación, pero el control es completo.
- **Fusión o multicloud.** Dos IdP y aplicaciones en varias nubes. Federa las identidades en un IdP principal y usa un broker por entorno con la misma política expresada en cada uno, o una overlay como OpenZiti que no dependa de la nube.

## Cómo encaja

1. El usuario se autentica en el proveedor de identidad con MFA. En paralelo, un agente en el dispositivo informa de su postura (cifrado, parches, EDR) a un servicio de gestión.
2. El usuario pide la aplicación. La petición no llega a la aplicación, sino al punto de decisión y proxy, que combina la identidad (grupos, claims, tipo de MFA) con la postura y evalúa la política de esa aplicación concreta.
3. Si la política lo permite, el proxy reenvía la petición a la aplicación, que sigue en una red privada sin exposición directa y acepta tráfico solo desde el proxy. Si no, la petición muere en el proxy.

Cada decisión, permitida o denegada, se envía al SIEM con usuario, dispositivo y aplicación. Si la postura o el riesgo cambian, la siguiente evaluación corta el acceso.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Keycloak con su PostgreSQL, Pomerium u oauth2-proxy como proxy y, si usas SPA, el gateway con `fwknop` en el propio host (necesita controlar el firewall, así que mejor fuera de contenedor o con red del host). Wazuh tiene despliegue de un solo nodo con Docker (manager, indexer y dashboard). Volúmenes para la base de datos de Keycloak y los índices de Wazuh; copias de la configuración de realms. Es un punto único de fallo: sirve para un piloto o una sede pequeña.

**Kubernetes on-premises.** Operador de Keycloak con CloudNativePG, Pomerium Ingress Controller u OpenZiti con sus Helm charts, cert-manager y Wazuh desplegado en el clúster. Los gateways SPA conviene ejecutarlos en nodos o máquinas dedicados en el borde, no mezclados con las cargas.

**Cloud sin Kubernetes.** Aquí el broker es un servicio gestionado (Verified Access, Entra Private Access, IAP) y las aplicaciones corren donde ya estén: ECS Fargate o EC2 tras un balanceador interno, Container Apps en un entorno interno, Cloud Run detrás de IAP. Lo único que operas es la política.

**Kubernetes gestionado.** Igual, pero con los servicios del clúster expuestos mediante un balanceador interno (AWS Load Balancer Controller para Verified Access, Gateway o Ingress de GKE con IAP, balanceador interno de AKS alcanzable por el conector de Private Access).

| Opción | Coste fijo | Operación | Cuándo |
|---|---|---|---|
| Compose en un host | Bajo | Media | Piloto, sede pequeña |
| Kubernetes on-premises | Medio | Alta | Soberanía, SDP propio |
| Broker gestionado + PaaS | Licencias o por aplicación | Baja | Por defecto en cloud |
| Broker gestionado + EKS / AKS / GKE | Medio | Media | Aplicaciones ya en clúster |

## Decisiones clave

- **Proxy web o acceso a nivel de red.** Un proxy con identidad para HTTP no necesita cliente y permite reglas por ruta. SSH, RDP, bases de datos o protocolos propios requieren un cliente o un túnel (Private Access, reenvío TCP de IAP, cliente de Verified Access, SDP).
- **Postura desde un MDM o EDR existente o agente propio.** Reutilizar Intune, Jamf o CrowdStrike es lo más fiable. Montarla con osquery es posible, pero las reglas pasan a ser tuyas.
- **Servicio gestionado o SDP propio.** Un Software-Defined Perimeter separa el controlador (decide) del gateway (aplica) y usa Single Packet Authorization para que los servicios ni siquiera respondan a quien no está autorizado. Es más operación que un servicio gestionado, a cambio de no depender de un proveedor.
- **Migración gradual.** Empieza por las aplicaciones web más usadas y deja la VPN para lo que queda, con fecha de retirada.

## Errores habituales

- Poner el proxy pero dejar la aplicación accesible también desde la red interna o la VPN antigua: el control se rodea.
- Evaluar la postura solo al iniciar sesión. Un dispositivo que deja de cumplir debe perder el acceso en la siguiente evaluación.
- Que la aplicación no valide la identidad que le pasa el proxy (cabecera o JWT firmados) y acepte cualquier petición que le llegue.
- MFA por SMS o push sin contexto: el phishing en tiempo real y la fatiga de MFA siguen funcionando. Prefiere FIDO2 y passkeys.
- Registrar solo los accesos permitidos. Los denegados son los que avisan de un ataque.
