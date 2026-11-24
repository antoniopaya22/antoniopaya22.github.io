---
title: "Acceso Zero Trust sin VPN"
short: "Zero Trust sin VPN"
summary: "Dar acceso a aplicaciones internas decidiendo en cada petición según quién es el usuario y en qué estado está su dispositivo, en lugar de confiar en que está dentro de la red."
description: "Acceso Zero Trust a aplicaciones internas sin VPN con identidad, MFA, postura del dispositivo y proxy: referencia en AWS, Azure, GCP y on-premises."
order: 6
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
---

## Cuándo lo necesitas

Cuando la respuesta a «necesito entrar en la aplicación interna» es «conéctate a la VPN». Una VPN autentica una vez y luego da acceso a una red entera: un portátil comprometido o unas credenciales robadas llegan a todo lo que haya en ese segmento. Zero Trust cambia la pregunta de «¿estás dentro?» a «¿quién eres, desde qué dispositivo y puedes usar esta aplicación ahora?», y la responde en cada petición.

## Cómo encaja

1. El usuario se autentica en el proveedor de identidad con MFA. En paralelo, un agente en el dispositivo informa de su postura (cifrado, parches, EDR) a un servicio de gestión.
2. El usuario pide la aplicación. La petición no llega a la aplicación, sino al punto de decisión y proxy, que combina la identidad (grupos, claims, tipo de MFA) con la postura y evalúa la política de esa aplicación concreta.
3. Si la política lo permite, el proxy reenvía la petición a la aplicación, que sigue en una red privada sin exposición directa. Si no, la petición muere en el proxy.

Cada decisión, permitida o denegada, se envía al SIEM con usuario, dispositivo y aplicación.

## Decisiones clave

- **Proxy web o acceso a nivel de red.** Un proxy con identidad para HTTP no necesita cliente y permite reglas por ruta. SSH, RDP, bases de datos o protocolos propios requieren un cliente o un túnel (Private Access, reenvío TCP de IAP, cliente de Verified Access, SDP).
- **Postura desde un MDM o EDR existente o agente propio.** Reutilizar Intune, Jamf o CrowdStrike es lo más fiable. Montarla con osquery es posible, pero las reglas pasan a ser tuyas.
- **Servicio gestionado o SDP propio.** Fuera de la nube, un Software-Defined Perimeter separa el controlador (decide) del gateway (aplica) y usa Single Packet Authorization para que los servicios ni siquiera respondan a quien no está autorizado. Es más operación que un servicio gestionado, a cambio de no depender de un proveedor.
- **Migración gradual.** Empieza por las aplicaciones web más usadas y deja la VPN para lo que queda, con fecha de retirada.

## Errores habituales

- Poner el proxy pero dejar la aplicación accesible también desde la red interna o la VPN antigua: el control se rodea.
- Evaluar la postura solo al iniciar sesión. Un dispositivo que deja de cumplir debe perder el acceso en la siguiente evaluación.
- Que la aplicación no valide la identidad que le pasa el proxy (cabecera o JWT firmados) y acepte cualquier petición que le llegue.
- MFA por SMS o push sin contexto: el phishing en tiempo real y la fatiga de MFA siguen funcionando. Prefiere FIDO2 y passkeys.
- Registrar solo los accesos permitidos. Los denegados son los que avisan de un ataque.
