---
title: "Microservicios en Kubernetes"
short: "Microservicios en K8s"
summary: "Varios servicios desplegados y escalados por separado en un clúster gestionado: un gateway de entrada, mTLS entre servicios con un service mesh, una base de datos por servicio, secretos fuera del clúster y despliegues que salen de Git."
description: "Microservicios en Kubernetes con gateway, HPA, mTLS con service mesh, BBDD por servicio, secretos externos y GitOps en AWS, Azure, GCP y on-premises."
order: 3
requirements:
  - "Cada servicio se despliega, escala y revierte sin tocar a los demás."
  - "El tráfico entre servicios va cifrado y autenticado con identidad de carga, no por IP."
  - "Ningún servicio lee la base de datos de otro: cada uno es dueño de sus datos."
  - "Los secretos viven en un gestor externo y no en el repositorio ni en los manifiestos."
  - "El estado del clúster se describe en Git y cualquier cambio manual se detecta y se corrige."
  - "Las imágenes salen de un registro privado, escaneadas y con versión inmutable."
platforms:
  onprem:
    summary: "RKE2 con Cluster API para el ciclo de vida de los clústeres, Envoy Gateway en la entrada, Linkerd o Istio para mTLS, PostgreSQL con Patroni por servicio, External Secrets Operator contra OpenBao, Harbor como registro y Argo CD para GitOps."
    notes:
      - "Cluster API trata los clústeres como recursos declarativos: crear, actualizar o reemplazar nodos pasa a ser un cambio en Git, no un runbook."
      - "Linkerd es más ligero y fácil de operar que Istio, pero el proyecto open source solo publica versiones edge; las versiones estables las distribuye Buoyant. Istio en modo ambient evita el sidecar por pod."
      - "ESO sincroniza secretos de OpenBao a `Secret` de Kubernetes; cifra etcd en reposo, porque el `Secret` sigue existiendo dentro del clúster."
      - "Harbor añade escaneo de vulnerabilidades, firma y replicación entre sitios; sin él, el registro es el punto único de fallo de cada despliegue."
      - "El coste es humano: actualizar Kubernetes, el mesh y los operadores cada pocos meses, con capacidad de sobra para los picos y las actualizaciones por rotación."
  aws:
    summary: "Amazon EKS con el AWS Load Balancer Controller creando un ALB, Istio en modo ambient para mTLS, Aurora PostgreSQL por servicio, External Secrets Operator contra Secrets Manager, Amazon ECR y Argo CD."
    notes:
      - "AWS App Mesh dejó de tener soporte el 30 de septiembre de 2026; por eso el mesh es Istio autogestionado. La alternativa nativa para tráfico entre servicios es Amazon VPC Lattice."
      - "El Load Balancer Controller crea ALB desde `Ingress` o, con soporte GA desde 2026, desde la Gateway API (`HTTPRoute`, `GRPCRoute`)."
      - "Usa EKS Pod Identity o IRSA para que ESO y cada servicio tengan su propio rol IAM; nunca credenciales estáticas en el clúster."
      - "Argo CD puede ser autogestionado o la capacidad gestionada de EKS (EKS Capabilities), que corre fuera de tus nodos y se paga por hora mientras está activa."
      - "Se paga una cuota por hora por clúster, los nodos (EC2 o Fargate), los ALB por hora y por uso, y cada instancia de Aurora: una base de datos por servicio multiplica ese último término."
  azure:
    summary: "AKS con Application Gateway for Containers en la entrada, el complemento de Istio de AKS para mTLS, Azure Database for PostgreSQL por servicio, Key Vault montado con el driver CSI, Azure Container Registry y Flux como extensión de GitOps."
    notes:
      - "Application Gateway for Containers es el sucesor de AGIC (GA desde 2024) y entiende tanto `Ingress` como Gateway API."
      - "El complemento de Istio de AKS solo funciona con sidecars (no ambient), no es multi-clúster y no se actualiza solo: actualiza su revisión antes de que bloquee la actualización del clúster."
      - "La extensión `microsoft.flux` no tiene coste en AKS y se puede imponer a escala con Azure Policy; Argo CD también funciona, pero lo operas tú."
      - "El driver CSI de Key Vault monta los secretos como ficheros con Workload Identity; la sincronización a `Secret` de Kubernetes es opcional y amplía la superficie."
      - "El plano de control tiene un nivel Free sin SLA y un nivel Standard con SLA; el resto del coste son los nodos, AGC por hora y uso, y cada servidor de PostgreSQL."
  gcp:
    summary: "GKE Autopilot con GKE Gateway en la entrada, Cloud Service Mesh para mTLS, Cloud SQL para PostgreSQL por servicio, el complemento de Secret Manager (CSI), Artifact Registry y Config Sync para GitOps."
    notes:
      - "Autopilot gestiona los nodos y se paga por los recursos que piden los pods: las `requests` mal dimensionadas son directamente factura."
      - "Cloud Service Mesh ofrece plano de control gestionado y usa las API de Istio en GKE, así que las políticas se escriben igual que en Istio."
      - "Config Sync forma parte de GKE estándar desde octubre de 2025 (antes exigía GKE Enterprise) y sincroniza desde Git, imágenes OCI o charts de Helm."
      - "El complemento de Secret Manager monta secretos con el driver CSI y Workload Identity; no sincroniza a `Secret` de Kubernetes, lo que obliga a leer ficheros pero reduce la exposición."
      - "Se paga la gestión del clúster, los recursos de los pods en Autopilot, el balanceador del Gateway y cada instancia de Cloud SQL."
tiers:
  - name: "Clúster de arranque"
    when: "Equipo pequeño con pocos servicios que quiere el modelo de Kubernetes sin operar todavía un mesh."
    cost: 2
    ops: 2
    onprem: "k3s en tres nodos, Traefik o Envoy Gateway en la entrada, NetworkPolicies en lugar de mesh y un PostgreSQL de CloudNativePG con una base de datos lógica por servicio."
    aws: "EKS con Auto Mode o un grupo de nodos gestionado, un ALB compartido, una instancia de Aurora con una base de datos por servicio y ESO contra Secrets Manager."
    azure: "AKS en nivel Free o Standard con un pool de nodos, AGC, un servidor flexible de PostgreSQL con varias bases de datos y Key Vault por CSI."
    gcp: "Un clúster GKE Autopilot, GKE Gateway, una instancia de Cloud SQL con una base de datos por servicio y el complemento de Secret Manager."
    tradeoffs: "Sin mTLS entre servicios y con un servidor de base de datos compartido: un servicio ruidoso afecta a los demás y el aislamiento depende de usuarios y permisos."
  - name: "Producción con mesh y GitOps"
    when: "Varios equipos desplegando a diario, con requisitos de cifrado interno y auditoría de cambios."
    cost: 3
    ops: 2
    onprem: "RKE2 en tres zonas o racks, Istio ambient o Linkerd, PostgreSQL con Patroni por servicio crítico, ESO con OpenBao, Harbor y Argo CD."
    aws: "EKS multi-AZ con Karpenter, Istio ambient, Aurora por servicio crítico, ECR con escaneo y Argo CD autogestionado o como capacidad de EKS."
    azure: "AKS Standard en zonas de disponibilidad, complemento de Istio, PostgreSQL flexible por servicio crítico con alta disponibilidad, ACR y Flux."
    gcp: "GKE Autopilot regional, Cloud Service Mesh gestionado, Cloud SQL con alta disponibilidad por servicio crítico, Artifact Registry y Config Sync."
    tradeoffs: "Más piezas que actualizar (mesh, operadores, gateway) y más instancias de base de datos que pagar; a cambio, cada servicio falla y escala por su cuenta."
  - name: "Multi-clúster y alta disponibilidad"
    when: "Plataforma crítica que debe sobrevivir a la pérdida de una región o separar cargas por cliente o por regulación."
    cost: 4
    ops: 3
    onprem: "Varios clústeres RKE2 creados con Cluster API en dos sitios, Istio multi-clúster, réplicas de PostgreSQL entre sitios y Argo CD con ApplicationSets."
    aws: "Clústeres EKS en dos regiones, Aurora Global Database para los servicios críticos, Route 53 con failover e Istio multi-clúster."
    azure: "Clústeres AKS en dos regiones con Azure Front Door delante, réplicas entre regiones de PostgreSQL y Flux impuesto por Azure Policy; el complemento de Istio no es multi-clúster, así que el mesh pasa a ser Istio autogestionado."
    gcp: "Varios clústeres GKE en una flota, Multi Cluster Gateway, Cloud Service Mesh multi-clúster y réplicas entre regiones de Cloud SQL."
    tradeoffs: "Coste y complejidad se multiplican: datos replicados entre regiones, consistencia más débil y un equipo de plataforma dedicado."
extensions:
  - name: "Autoescalado de nodos"
    when: "Cuando el HPA crea pods que no caben y los nodos deben aparecer y desaparecer solos."
    cost: "low"
    onprem: "Cluster Autoscaler + Cluster API"
    aws: "Karpenter / EKS Auto Mode"
    azure: "Node auto-provisioning (Karpenter)"
    gcp: "Incluido en Autopilot"
  - name: "Escalado por eventos"
    when: "Servicios que consumen colas o streams y deben escalar por backlog, incluso a cero."
    cost: "low"
    onprem: "KEDA"
    aws: "KEDA"
    azure: "Complemento KEDA de AKS"
    gcp: "KEDA"
  - name: "Bus de eventos entre servicios"
    when: "Cuando las llamadas síncronas encadenadas empiezan a propagar fallos y latencias."
    cost: "medium"
    onprem: "Apache Kafka (Strimzi)"
    aws: "Amazon MSK"
    azure: "Event Hubs"
    gcp: "Pub/Sub"
  - name: "Métricas y trazas distribuidas"
    when: "En cuanto hay más de un salto entre servicios y nadie sabe dónde se va la latencia."
    cost: "medium"
    onprem: "OTel + Prometheus + Grafana Tempo"
    aws: "Managed Prometheus + Managed Grafana"
    azure: "Azure Monitor managed Prometheus"
    gcp: "Managed Service for Prometheus"
  - name: "WAF en el gateway"
    when: "APIs públicas expuestas a bots, inyecciones o abuso de credenciales."
    cost: "medium"
    onprem: "Coraza en Envoy"
    aws: "AWS WAF en el ALB"
    azure: "WAF en AppGw for Containers"
    gcp: "Cloud Armor"
  - name: "Caché compartida"
    when: "Lecturas repetidas que cargan la base de datos de un servicio o sesiones compartidas."
    cost: "medium"
    onprem: "Valkey (operador)"
    aws: "ElastiCache (Valkey)"
    azure: "Azure Managed Redis"
    gcp: "Memorystore for Valkey"
savings:
  - "Ejecuta los servicios sin estado en capacidad Spot (Karpenter con Spot en EKS, pools de nodos Spot en AKS, Spot Pods en GKE) con varias réplicas y `PodDisruptionBudget`; deja en bajo demanda solo lo que no tolera interrupciones."
  - "Construye imágenes multiarquitectura y usa nodos ARM (Graviton en EKS, Cobalt o Ampere en AKS, Axion o Tau T2A en GKE), que suelen dar mejor precio por rendimiento."
  - "Ajusta `requests` con el VPA en modo recomendación: en Autopilot pagas lo que piden los pods, y en los demás los nodos se dimensionan por la suma de `requests`, no por el uso real."
  - "El modo ambient de Istio sustituye el sidecar de cada pod por un proxy por nodo y elimina la CPU y memoria que cada sidecar reserva."
  - "Cubre la capacidad base con Savings Plans en AWS, reservas en Azure o compromisos de uso (CUD) en GCP, y deja el pico en Spot o bajo demanda."
  - "En desarrollo, usa una sola instancia de base de datos con varias bases lógicas, el nivel Free de AKS o `az aks stop` fuera de horario, y políticas de ciclo de vida en el registro para borrar imágenes antiguas."
---

## Cuándo lo necesitas

Cuando varios equipos trabajan sobre el mismo producto y el monolito se ha convertido en el cuello de botella: un despliegue arrastra a todos, una parte necesita escalar diez veces más que el resto o un componente tiene requisitos de seguridad distintos (pagos, datos personales). Separar en servicios con su propio ciclo de vida y su propia base de datos permite desplegar a diario sin coordinar a toda la organización.

Si sois un solo equipo con un dominio pequeño, no lo necesitas todavía. Un monolito modular en un PaaS de contenedores es más barato y más fácil de depurar; Kubernetes y un mesh añaden una plataforma entera que alguien tiene que mantener.

## Escenarios

- **Startup que crece de 1 a 4 equipos.** Empieza con el clúster de arranque: un clúster gestionado, NetworkPolicies y un servidor de PostgreSQL con una base de datos por servicio. El mesh y las instancias separadas llegan cuando un servicio concreto lo justifica, no antes.
- **Banca o salud con datos en la UE.** El mTLS con identidad de carga pasa a ser requisito de auditoría, igual que los secretos en un gestor externo con registro de accesos y las imágenes firmadas. Clústeres en región europea, claves gestionadas por el cliente para las bases de datos y GitOps como evidencia de quién cambió qué.
- **Picos estacionales (rebajas, matrículas, campañas).** El HPA escala los servicios de la ruta crítica y el autoescalado de nodos (Karpenter, Autopilot) añade capacidad Spot. El cuello de botella suele ser la base de datos del servicio de pedidos: réplicas de lectura, pooler de conexiones y una cola para desacoplar lo que no tiene que ser síncrono.
- **Cliente que exige on-premises.** El mismo diseño con RKE2, Cluster API, Harbor, OpenBao y Argo CD. Lo que cambia es que el equipo opera el plano de control, el almacenamiento y las actualizaciones; conviene estandarizar con los mismos manifiestos que en la nube para no mantener dos productos.
- **Equipo sin experiencia en Kubernetes.** Usa GKE Autopilot o EKS Auto Mode, evita el mesh al principio y apóyate en GitOps desde el primer día: un `kubectl apply` manual es la forma más rápida de perder el control del estado del clúster.

## Cómo encaja

El cliente entra por el gateway de entrada, que termina TLS, aplica las rutas y reparte el tráfico entre los servicios. Cada servicio es un `Deployment` con su `HorizontalPodAutoscaler`, que añade o quita réplicas según CPU, memoria o métricas propias. Cuando pedidos llama a pagos, la llamada pasa por el service mesh: ambos extremos presentan certificados de corta duración ligados a su cuenta de servicio, el tráfico va cifrado y una política de autorización decide quién puede llamar a quién.

Pedidos escribe solo en su propia base de datos; pagos tiene la suya y nunca lee la de pedidos. Pagos obtiene sus credenciales del gestor de secretos externo, que las inyecta como fichero o `Secret` con la identidad de carga del pod, sin claves estáticas.

Debajo, el ciclo de entrega: la CI construye la imagen, la escanea y la sube al registro privado con una etiqueta inmutable; el controlador de GitOps ve el cambio en el repositorio de manifiestos y lo aplica al clúster gestionado, que también lleva instalados el mesh y los controladores.

## Despliegue: Docker, Kubernetes o serverless

**On-premises con Docker Compose.** Vale para desarrollo local y para despliegues muy pequeños: un contenedor por servicio, un PostgreSQL por servicio con su volumen, Traefik o Caddy como proxy inverso con certificados automáticos y copias con `pg_dump` o restic a otro host. No hay HPA, ni mTLS entre servicios, ni despliegues sin corte; si un host cae, cae todo.

**On-premises con Kubernetes.** RKE2 o k3s con Cluster API para el ciclo de vida, CloudNativePG con un `Cluster` por servicio, cert-manager para certificados, Envoy Gateway en la entrada, Istio o Linkerd, External Secrets Operator con OpenBao, Harbor, Argo CD, KEDA y Velero para las copias del estado del clúster. Es el diseño completo, con el coste de operarlo todo.

**Cloud sin Kubernetes.** ECS Fargate con Service Connect (que admite TLS con AWS Private CA), Azure Container Apps (con cifrado entre aplicaciones del entorno y Dapr opcional) o Cloud Run (con autenticación entre servicios mediante tokens de identidad de IAM). Pierdes el mesh y la portabilidad de los manifiestos, pero eliminas el clúster.

**Cloud con Kubernetes gestionado.** EKS, AKS o GKE con los servicios del diagrama. Compensa cuando hay muchos servicios, varios equipos y necesidades que un PaaS no cubre: políticas de red finas, operadores, cargas con estado o portabilidad entre nubes y on-premises.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Muy bajo | Baja, manual | Ninguno | Desarrollo, piloto |
| Kubernetes on-premises | Hardware y personas | Alta | HPA + nodos propios | Soberanía, cliente on-prem |
| PaaS de contenedores | Bajo, escala a cero | Baja | Automático | Pocos servicios, equipo pequeño |
| Kubernetes gestionado | Clúster + nodos | Media | HPA + autoescalado de nodos | Muchos servicios y equipos |

## Decisiones clave

- **Mesh sí o no.** Un mesh da mTLS, reintentos y métricas sin tocar el código, pero es otro sistema que actualizar. Con pocos servicios, NetworkPolicies y TLS en la aplicación pueden bastar; con requisitos de auditoría o muchos equipos, el mesh compensa. Ambient reduce el coste por pod frente a los sidecars.
- **Mesh gestionado o autogestionado.** Cloud Service Mesh y el complemento de Istio de AKS quitan el plano de control de tus manos, pero limitan versiones y personalización. En EKS no hay mesh gestionado desde la retirada de App Mesh: Istio lo operas tú.
- **Base de datos por servicio o compartida.** Por servicio da independencia real de esquema y de escalado, a cambio de más instancias y de consultas entre dominios por API o eventos. Un servidor compartido con bases separadas es el punto intermedio.
- **Argo CD o Flux.** Argo CD tiene interfaz y modelo de aplicaciones muy visual; Flux es más ligero y se integra como extensión nativa en AKS. Config Sync es la opción integrada en GKE. Lo importante es que Git sea la única vía de cambio.
- **Secretos como fichero o como `Secret`.** Montarlos por CSI evita copiarlos a etcd; sincronizarlos con ESO es más cómodo para aplicaciones que esperan variables de entorno.

## Errores habituales

- Microservicios que comparten base de datos: el acoplamiento sigue ahí, solo que ahora está distribuido.
- Cadenas largas de llamadas síncronas sin timeouts ni circuit breaker, donde un servicio lento tumba a todos los que dependen de él.
- HPA sin `requests` definidas, o con `requests` infladas que obligan a pagar nodos vacíos.
- Activar el mesh en modo permisivo y no pasar nunca a mTLS estricto.
- Actualizar Kubernetes sin revisar antes la compatibilidad del mesh, el gateway y los operadores.
- Imágenes con etiqueta `latest`: GitOps no puede saber qué versión corre ni revertir a la anterior.
