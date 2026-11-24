---
title: "Red hub-and-spoke: conectividad híbrida, inspección central y DNS privado"
short: "Red hub-and-spoke"
summary: "Conectar oficinas, CPD y varias redes cloud a través de un hub común, con un firewall que inspecciona el tráfico entre entornos y hacia Internet, DNS privado que resuelve en ambos sentidos y servicios gestionados sin exposición pública."
description: "Red hub-and-spoke con VPN o enlace dedicado, firewall central, DNS híbrido y endpoints privados: referencia en AWS, Azure, GCP y on-premises."
order: 17
requirements:
  - "Producción y no producción están en redes separadas y solo se hablan por reglas explícitas."
  - "Todo el tráfico entre spokes y hacia Internet pasa por un punto de inspección con registro."
  - "Los nombres privados resuelven igual desde la oficina, el CPD y cualquier spoke."
  - "Los servicios gestionados (bases de datos, almacenamiento, secretos) se consumen por IP privada."
  - "Los rangos IP no se solapan entre CPD, oficinas y spokes, y están planificados antes de crear la primera red."
platforms:
  onprem:
    summary: "Un router de núcleo con VRFs separa producción y no producción, OPNsense hace de firewall entre VRFs y hacia Internet, PowerDNS resuelve las zonas internas y los túneles IPsec o WireGuard unen sedes y nube."
    notes:
      - "Cada VRF es una tabla de rutas independiente: aunque alguien configure mal una VLAN, prod y no-prod no se ven si el router no filtra rutas entre ellas. El salto entre VRFs se fuerza a pasar por OPNsense."
      - "OPNsense en pareja con CARP da alta disponibilidad; Suricata integrado añade IDS/IPS, pero la inspección TLS de todo el tráfico es cara en CPU y rara vez compensa salvo en la salida a Internet."
      - "PowerDNS separa el autoritativo (zonas internas) del recursor, que reenvía condicionalmente las zonas cloud a los resolvers de cada proveedor a través del túnel."
      - "Los «endpoints privados» on-premises suelen ser un proxy inverso interno que publica servicios compartidos por nombre, sin abrir las redes de origen."
      - "El coste es hardware redundante, licencias de soporte si las quieres y alguien que mantenga reglas y rutas; WireGuard simplifica mucho frente a IPsec cuando ambos extremos son Linux."
  aws:
    summary: "Transit Gateway actúa de hub entre VPCs, Site-to-Site VPN y Direct Connect; AWS Network Firewall se conecta de forma nativa al Transit Gateway para inspeccionar tráfico este-oeste y de salida, y Route 53 Resolver resuelve en ambos sentidos."
    notes:
      - "Desde 2025 Network Firewall puede adjuntarse directamente al Transit Gateway como network function attachment, sin VPC de inspección propia; las tablas de rutas del Transit Gateway siguen siendo tuyas y deben enviar el tráfico al firewall."
      - "Si mantienes el modelo clásico con VPC de inspección y endpoints del firewall, activa appliance mode en ese attachment o el tráfico de vuelta puede tomar otra zona y cortarse."
      - "Route 53 Resolver usa endpoints de entrada (la oficina pregunta a AWS) y de salida con reglas de reenvío (AWS pregunta al DNS interno); comparte reglas y zonas privadas con el resto de cuentas mediante RAM o Route 53 Profiles."
      - "PrivateLink y los VPC endpoints de interfaz se crean una vez en una VPC compartida o en cada spoke; los gateway endpoints de S3 y DynamoDB no cobran y evitan pasar por NAT."
      - "Se paga por hora de cada attachment y por GB procesado en Transit Gateway, por hora de endpoint y GB en Network Firewall, y por hora de cada endpoint de Resolver y de interfaz."
  azure:
    summary: "Un hub de Virtual WAN protegido con Azure Firewall y routing intent obliga a que el tráfico privado y el de Internet de las VNets spoke pasen por el firewall; VPN Gateway o ExpressRoute conectan las sedes y DNS Private Resolver resuelve en ambos sentidos."
    notes:
      - "Routing intent tiene dos políticas, tráfico privado y tráfico de Internet: con ambas activas, el este-oeste entre spokes, sedes y regiones pasa por Azure Firewall sin mantener tablas de rutas a mano."
      - "El hub de Virtual WAN es gestionado y no admite cualquier recurso: DNS Private Resolver se despliega en una VNet de servicios compartidos conectada al hub, con un conjunto de reglas de reenvío enlazado a los spokes."
      - "Las zonas `privatelink.*` de los Private Endpoints viven una sola vez en la suscripción de conectividad; Azure Policy crea los registros DNS al crear cada endpoint, para que ningún equipo monte zonas duplicadas."
      - "Azure Firewall Premium añade IDPS e inspección TLS; Standard suele bastar para filtrado por FQDN en la salida."
      - "El coste fijo está en la hora del hub, del firewall y de las puertas de enlace; el variable, en datos procesados por el hub y el firewall."
  gcp:
    summary: "Network Connectivity Center une VPCs spoke y spokes híbridos (Cloud VPN o Interconnect) en un hub global; Cloud NGFW aplica políticas jerárquicas en cada VPC, Cloud DNS resuelve en ambos sentidos y Private Service Connect publica servicios por IP privada."
    notes:
      - "Cloud NGFW es un firewall distribuido: las reglas se aplican en cada VM y no en un punto central. La «inspección central» se consigue con políticas jerárquicas en la organización o carpeta, no forzando el tráfico por un dispositivo."
      - "El nivel Enterprise añade IPS y filtrado de URL mediante endpoints de firewall zonales asociados a cada VPC; si necesitas un punto de paso único con un dispositivo de terceros, se monta con spokes de router appliance o con NVAs en una VPC hub."
      - "Las VPC spoke importan del hub las rutas dinámicas de los spokes híbridos, así que una sola VPN o Interconnect da servicio a todos los entornos; separar prod y no-prod se hace con grupos de spokes o hubs distintos."
      - "Lo habitual es una VPC compartida (Shared VPC) por entorno como spoke; Cloud DNS usa zonas de reenvío hacia el DNS interno y una server policy de entrada para que la oficina resuelva zonas privadas."
      - "Se paga por spoke y por datos que cruzan el hub, por túnel o adjunto de Interconnect y, en NGFW Enterprise, por hora de endpoint y GB inspeccionado."
tiers:
  - name: "Un solo hub con VPN"
    when: "Una sede o CPD, dos o tres redes cloud y un equipo de red pequeño."
    cost: 1
    ops: 1
    onprem: "Un OPNsense en pareja hace de router, firewall y extremo WireGuard o IPsec; PowerDNS en dos VMs."
    aws: "Transit Gateway con Site-to-Site VPN, grupos de seguridad y NACLs como filtrado y un NAT por spoke; Resolver con un endpoint de salida."
    azure: "Hub VNet clásico con peering a los spokes, VPN Gateway y NSGs; DNS Private Resolver en el hub."
    gcp: "Shared VPC por entorno, Cloud VPN de alta disponibilidad, Cloud NGFW Essentials con políticas jerárquicas y Cloud NAT."
    tradeoffs: "Sin inspección de capa 7 ni registro central de flujos entre entornos; el filtrado depende de reglas distribuidas que cuesta auditar."
  - name: "Hub con inspección central"
    when: "Varios entornos y equipos, requisitos de auditoría o datos regulados."
    cost: 2
    ops: 2
    onprem: "Router de núcleo con VRFs, OPNsense en CARP con Suricata entre VRFs y en la salida, PowerDNS autoritativo y recursor."
    aws: "Transit Gateway con Network Firewall adjunto de forma nativa, tablas de rutas separadas para prod y no-prod, salida a Internet centralizada y Route 53 Profiles."
    azure: "Virtual WAN con hub protegido por Azure Firewall y routing intent; DNS Private Resolver en una VNet de servicios compartidos."
    gcp: "NCC con VPC spokes y spokes híbridos, Cloud NGFW Standard con objetos FQDN y Secure Web Proxy en la salida."
    tradeoffs: "Coste fijo por hora del firewall y del hub, y todo el tráfico entre entornos paga procesamiento adicional."
  - name: "Multirregión con enlace dedicado"
    when: "Varias regiones, tráfico híbrido alto o latencia y ancho de banda garantizados."
    cost: 4
    ops: 3
    onprem: "Dos CPD con enlaces redundantes, BGP entre sedes y firewalls en cada salida."
    aws: "Direct Connect redundante a varias ubicaciones, Transit Gateways por región con peering o Cloud WAN, y Network Firewall en cada región."
    azure: "ExpressRoute en dos ubicaciones de peering, hubs de Virtual WAN por región con routing intent y Azure Firewall Premium."
    gcp: "Dedicated o Partner Interconnect redundante, NCC global y Cloud NGFW Enterprise con endpoints en cada zona usada."
    tradeoffs: "Plazos de aprovisionamiento de semanas, contratos con operadores y una complejidad de enrutamiento que exige un equipo de red dedicado."
extensions:
  - name: "IPS e inspección TLS"
    when: "Datos regulados o exigencia de detectar intrusiones en el tráfico entre entornos."
    cost: "high"
    onprem: "Suricata en OPNsense"
    aws: "Network Firewall (reglas Suricata, TLS)"
    azure: "Azure Firewall Premium"
    gcp: "Cloud NGFW Enterprise"
  - name: "Proxy de salida por FQDN"
    when: "Cuando las cargas solo deben llegar a una lista cerrada de dominios externos."
    cost: "medium"
    onprem: "Squid"
    aws: "Network Firewall (reglas de dominio)"
    azure: "Azure Firewall (reglas de aplicación)"
    gcp: "Secure Web Proxy"
  - name: "Firewall de DNS"
    when: "Para cortar exfiltración por DNS y bloquear dominios maliciosos conocidos."
    cost: "low"
    onprem: "PowerDNS Recursor + RPZ"
    aws: "Route 53 Resolver DNS Firewall"
    azure: "DNS security policy"
    gcp: "Cloud DNS response policies"
  - name: "Registros de flujo centralizados"
    when: "Siempre que haya que investigar incidentes o justificar reglas."
    cost: "medium"
    onprem: "ntopng / NetFlow a OpenSearch"
    aws: "VPC Flow Logs + TGW Flow Logs"
    azure: "VNet flow logs + Traffic Analytics"
    gcp: "VPC Flow Logs"
  - name: "Perímetro de servicios gestionados"
    when: "Para impedir que datos de servicios gestionados salgan a cuentas o proyectos ajenos."
    cost: "low"
    onprem: "Reglas de salida en OPNsense"
    aws: "Políticas de VPC endpoint + RCPs"
    azure: "Network Security Perimeter"
    gcp: "VPC Service Controls"
savings:
  - "Usa gateway endpoints de S3 y DynamoDB en AWS: no tienen coste y sacan ese tráfico del NAT y del firewall."
  - "Centraliza la salida a Internet en el hub con un único NAT o firewall en lugar de un NAT Gateway por VPC; en desarrollo basta un solo NAT en una zona."
  - "Excluye de la inspección el tráfico que no la necesita (copias de seguridad masivas, réplica de bases de datos entre zonas de un mismo entorno) con rutas o reglas específicas: el firewall cobra por GB procesado."
  - "No pongas un endpoint de interfaz por servicio en cada spoke: compártelos desde una VPC o VNet de servicios y resuelve por DNS central."
  - "Reduce la retención y el muestreo de los flow logs en no producción y envíalos a almacenamiento de objetos en lugar de a la herramienta de logs más cara."
  - "Elige el nivel del firewall por entorno: Azure Firewall Basic o Standard y Cloud NGFW Standard en no-prod, y deja IPS y TLS solo para producción."
---

## Cuándo lo necesitas

Cuando la nube deja de ser una VPC y pasa a ser diez: una por equipo y entorno, más la oficina, el CPD y algún proveedor. Si cada red se conecta con las demás por peering directo, el número de conexiones crece en cuadrado, nadie sabe qué ve a qué y no hay un sitio donde inspeccionar ni registrar. El patrón hub-and-spoke pone un hub de tránsito en el centro: los spokes solo se conectan al hub, el hub decide qué rutas existen y un firewall central ve el tráfico que cruza entre entornos y hacia Internet.

También es el momento de resolver el DNS híbrido: que `db.prod.interno` resuelva desde un portátil de la oficina y que `mi-bbdd.privatelink...` resuelva a una IP privada desde el CPD.

## Escenarios

- **Startup con dos entornos y sin sede.** No hay conectividad híbrida que resolver. Basta una red por entorno, sin conexión entre ellas, y una salida a Internet controlada por entorno. El hub aparece cuando llega el tercer entorno, una VPN con un cliente o la primera auditoría.
- **Empresa con CPD que migra por fases.** Aplicaciones en la nube que todavía hablan con bases de datos en el CPD. El hub con VPN o enlace dedicado es lo primero que se construye, junto al DNS híbrido; sin él, cada migración se bloquea por resolución de nombres.
- **Sector regulado con datos en la UE.** El auditor pedirá separación demostrable entre prod y no-prod, registro de flujos e inspección de la salida. Aquí compensa la inspección central con IPS y perímetros de servicio sobre los servicios gestionados.
- **Varias regiones o proveedores.** Un hub por región conectado entre sí (peering de Transit Gateway, hubs de Virtual WAN, NCC global) y rangos IP planificados para todo el grupo. El error caro es descubrir solapes cuando ya hay producción.
- **Filial o adquisición con rangos solapados.** No se integra en el hub: se publica lo necesario por endpoints privados (PrivateLink, Private Link Service, Private Service Connect) o con NAT entre redes, sin mezclar tablas de rutas.

## Cómo encaja

1. La oficina o el CPD se conectan por VPN o enlace dedicado a la conectividad híbrida, que intercambia rutas por BGP con el hub de tránsito.
2. El hub de tránsito es el único punto de unión: los spokes de producción y de no producción se conectan a él, nunca entre sí. Cada spoke se asocia a una tabla de rutas que decide a qué destinos llega.
3. Las rutas del hub envían el tráfico entre spokes, hacia las sedes y hacia Internet al firewall central para inspección. El firewall aplica reglas por entorno, registra cada flujo y devuelve el tráfico permitido al hub.
4. El DNS privado se apoya en el hub: un resolver con endpoint de entrada atiende las consultas de la oficina sobre zonas cloud, y reglas de reenvío mandan al DNS interno las consultas sobre zonas on-premises.
5. Los endpoints privados cuelgan del hub o de una red de servicios compartidos: los spokes consumen bases de datos, almacenamiento o secretos gestionados por IP privada, y el DNS central devuelve esa IP.

En GCP el paso 3 cambia: Cloud NGFW se aplica en cada VM con políticas jerárquicas heredadas de la organización, así que la inspección es central en la política pero distribuida en la ejecución.

## Despliegue: Docker, Kubernetes o serverless

La red no va en contenedores, pero lo que corre en cada spoke condiciona el diseño.

- **Hosts con Docker Compose.** Cada host vive en una subred privada del spoke, sin IP pública. El proxy inverso recibe tráfico solo del balanceador o del firewall, la salida va por el hub y las copias se envían al almacenamiento por endpoint privado.
- **Kubernetes on-premises (k3s, RKE2).** El clúster necesita rangos para pods y servicios que no se solapen con ninguna otra red. Con Cilium o Calico, las NetworkPolicies filtran dentro del clúster y el firewall central ve el tráfico que sale de él. cert-manager y external-dns hablan con el DNS interno.
- **Contenedores y funciones gestionados en cloud.** ECS Fargate en subredes privadas, Container Apps en un entorno integrado en VNet, Cloud Run con salida directa a la VPC y funciones con integración de red. Si se olvida esa integración, el servicio sale por la red pública del proveedor y se salta el hub.
- **Kubernetes gestionado (EKS, AKS, GKE).** Consume muchas IPs: planifica rangos secundarios o un CNI overlay. El plano de control debe ser privado, los nodos salen por el hub y las imágenes llegan por endpoint privado al registro.

| Opción | Coste fijo de red | Operación | Escala de IPs | Cuándo |
|---|---|---|---|---|
| Compose en hosts | Bajo | Baja | Pocas | Pocas cargas estables |
| Kubernetes propio | Medio | Alta | Muchas | Ya hay equipo de plataforma |
| PaaS o funciones con VPC | Bajo | Baja | Variables | Equipo pequeño, picos |
| Kubernetes gestionado | Medio | Media | Muchas | Muchos servicios y equipos |

## Decisiones clave

- **Firewall central o filtrado distribuido.** Un firewall en el hub da un único punto de registro y reglas por entorno, a cambio de coste por GB y de ser un posible cuello de botella. Grupos de seguridad, NSGs o Cloud NGFW distribuido son más baratos, pero cuestan más de auditar. Lo habitual es combinar ambos.
- **Hub gestionado o construido a mano.** Virtual WAN y la conexión nativa de Network Firewall al Transit Gateway ahorran tablas de rutas e infraestructura de inspección; un hub VNet clásico o una VPC de inspección dan más control sobre cada salto.
- **VPN o enlace dedicado.** La VPN se monta en horas y sirve para empezar. Direct Connect, ExpressRoute o Interconnect dan ancho de banda y latencia predecibles, pero tardan semanas y exigen redundancia en dos ubicaciones.
- **Segmentación por tablas de rutas o por hubs.** Separar prod y no-prod con tablas de rutas distintas en el mismo hub es suficiente para la mayoría; un hub por entorno solo compensa con requisitos regulatorios estrictos.
- **Dónde viven las zonas DNS privadas.** Centralizadas en la cuenta, suscripción o proyecto de conectividad, nunca por equipo: las zonas duplicadas son la causa más común de que un endpoint privado resuelva a una IP pública.

## Errores habituales

- Rangos IP solapados entre CPD, spokes y clústeres de Kubernetes. Se corrige en un plan de direccionamiento antes de la primera red, no después.
- Rutas asimétricas: el tráfico de ida pasa por el firewall y el de vuelta no, y las conexiones se cortan sin explicación. Revisa appliance mode y las rutas de retorno.
- Dejar un NAT o una IP pública en un spoke «solo para probar»: es una salida que no pasa por el firewall.
- Servicios gestionados con acceso público además del endpoint privado. El endpoint no cierra el acceso público por sí solo.
- Inspeccionar todo con TLS desde el primer día, y descubrir la factura y la latencia después.
- Montar DNS privado por equipo: cada nueva zona `privatelink` rompe la resolución de los demás.
