---
title: "Ahorrar en la nube sin perder lo importante"
short: "Ahorrar en la nube"
summary: "Dónde se va el dinero en una factura cloud, qué palancas de ahorro ofrece cada plataforma, tres presupuestos tipo para una aplicación web y una rutina FinOps mínima para que la factura no vuelva a sorprender."
description: "Costes ocultos, compromisos, Spot, ARM, escala a cero, logs, almacenamiento y egress: cómo reducir la factura en AWS, Azure y GCP sin perder fiabilidad."
order: 3
---

La mayoría de facturas cloud que reviso no son caras por el cómputo de producción, sino por lo que hay alrededor: recursos con coste por hora que nadie ve, entornos de desarrollo que replican producción, logs que nadie lee y tráfico que sale por el camino más caro. Recortar ahí no toca la fiabilidad. Recortar copias, alta disponibilidad o seguridad sí, y eso es lo que esta guía intenta evitar.

Orden de trabajo: primero **visibilidad** (saber qué cuesta qué), luego **eliminar desperdicio**, luego **ajustar tamaños** y solo al final **comprometer gasto**. Comprometerse durante tres años a pagar un sobredimensionamiento es la forma más eficaz de hacerlo permanente.

Los precios que aparecen son precios de lista en USD de regiones europeas (eu-west-1 en AWS, West Europe en Azure), consultados en noviembre de 2026 y orientativos: cambian por región y con el tiempo.

## Por qué la factura se dispara

| Coste | Por qué aparece | Qué hacer |
|---|---|---|
| NAT Gateway | En AWS, 0,048 USD/h más 0,048 USD por GB procesado en eu-west-1, y uno por zona en diseños multi-AZ. Por él pasa todo lo que sale de subredes privadas, incluido el tráfico a servicios del propio proveedor | Endpoints privados para almacenamiento, registro de imágenes y secretos; un único NAT en dev |
| Balanceadores | Coste fijo por hora más capacidad. En Kubernetes, cada `Service` de tipo `LoadBalancer` crea uno | Un balanceador o Gateway compartido con enrutado por host o ruta |
| IPv4 públicas | AWS cobra 0,005 USD/h por cada IPv4 pública, en uso o no (unos 3,65 USD/mes cada una) | Recursos en subredes privadas detrás del balanceador; IPv6 donde se pueda |
| Plano de control de Kubernetes | 0,10 USD/h por clúster en EKS, AKS Standard y GKE: unos 73 USD/mes cada uno | Menos clústeres, separados por namespace, o PaaS de contenedores |
| Logs | Se paga por GB ingerido y por retención; un `DEBUG` en producción puede costar más que el cómputo | Nivel `INFO`, muestreo, retención corta y archivo barato |
| Egress | Salida a Internet, entre zonas y entre regiones | CDN delante, tráfico interno dentro de la zona cuando se pueda |
| Entornos no productivos | Dev y staging con multi-AZ, réplicas y tamaños de producción, encendidos 24/7 | Tamaños pequeños, una zona, apagado fuera de horario |
| Huérfanos | Discos, instantáneas, IPs y balanceadores de recursos ya borrados | Revisión mensual y etiquetas obligatorias |

## Palancas de ahorro

### Compromisos de uso

Descuento a cambio de comprometer gasto o capacidad durante uno o tres años. Solo sobre la base estable de consumo y después de ajustar tamaños.

| | AWS | Azure | GCP |
|---|---|---|---|
| Flexible (por gasto) | Compute Savings Plans (EC2, Fargate, Lambda): hasta 66 % | Savings plan for compute: hasta 65 % | CUD flexibles por gasto: en torno al 28 % a 1 año y 46 % a 3 años |
| Específico (por recurso) | EC2 Instance Savings Plans: hasta 72 % | Reservations: hasta 72 % | CUD por recurso: hasta 55 % (70 % en memoria optimizada) |
| Bases de datos | Database Savings Plans (1 año): hasta 35 % en serverless y 20 % en instancias; Reserved Instances de RDS | Reservations de bases de datos | CUD de Cloud SQL |
| Automático | — | — | Descuento por uso sostenido: hasta 30 % en N1, 20 % en N2, N2D y C2; no en E2 ni en las series nuevas |

Empieza por el compromiso flexible y a un año: el específico rinde más, pero te ata a una familia y una región que quizá cambies.

### Capacidad Spot

Capacidad sobrante con gran descuento que el proveedor puede retirar con poco aviso. Para cargas que toleran interrupciones: workers de colas, CI, lotes, nodos de Kubernetes sin estado. Nunca para la base de datos ni para el único nodo de nada.

| | AWS | Azure | GCP |
|---|---|---|---|
| VMs | Spot Instances: hasta 90 %, aviso de 2 min | Spot VMs: hasta 90 %, aviso de 30 s | Spot VMs: hasta 91 %, apagado ordenado de hasta 30 s sin garantía |
| Contenedores | Fargate Spot (hasta 70 %); nodos Spot en EKS | Nodos Spot en AKS (solo pools de usuario) | Spot Pods en GKE Autopilot; nodos Spot en GKE |

### Procesadores ARM

Si la aplicación corre en Linux con un runtime interpretado o compilable para `arm64` (Node.js, Python, Java, Go, .NET), migrar suele ser cambiar la imagen base y el tipo de instancia.

| AWS | Azure | GCP |
|---|---|---|
| Graviton4 (M8g, C8g, R8g) y Graviton5 (M9g); AWS habla de hasta un 20 % menos coste que x86 comparable | Cobalt 100 (Dpsv6, Epsv6), Cobalt 200 (Dpsv7, Epsv7) y Ampere Altra (Dpsv5) | Axion (C4A, N4A) y Tau T2A (Ampere Altra) |
| Lambda y Fargate en `arm64` son un 20 % más baratos por unidad que en x86 | B-series v2 con ARM (B2pls v2, B2ps v2) | T2A solo en algunas regiones |

Construye las imágenes multiarquitectura en CI (`docker buildx --platform linux/amd64,linux/arm64`) y mide antes de decidir: el ahorro por hora solo cuenta si el rendimiento se mantiene.

### Escala a cero

| | AWS | Azure | GCP |
|---|---|---|---|
| Contenedores | — (Fargate no se despierta con una petición) | Container Apps, perfil Consumption | Cloud Run |
| Funciones | Lambda | Functions Flex Consumption | Cloud Run functions |
| Relacional | Aurora Serverless v2 con mínimo de 0 ACU: pausa tras 5 min a 24 h sin conexiones, reanuda en unos 15 s | Azure SQL Database serverless con pausa automática; PostgreSQL flexible solo se detiene a mano | Cloud SQL se puede detener, sin pausa automática |
| NoSQL | DynamoDB on-demand | Cosmos DB serverless | Firestore |

La reanudación tiene un coste en latencia: perfecto para dev, demos y herramientas internas; en producción con usuarios, mide antes.

### Red: endpoints privados frente a NAT

El tráfico de una carga privada hacia el almacenamiento de objetos, el registro de imágenes o el gestor de secretos no necesita pasar por el NAT. En AWS, los *gateway endpoints* de S3 y DynamoDB no tienen coste; los *interface endpoints* sí (por hora y zona, más por GB), así que compáralos con lo que procesa el NAT. En Azure, los *service endpoints* son gratuitos y los *private endpoints* se cobran por hora y GB. En GCP, Private Google Access deja llegar a las APIs de Google sin Cloud NAT. AWS ofrece además desde 2025 un NAT Gateway regional que no necesita subred pública por zona.

### Entornos de desarrollo

- Apagado fuera de horario: 12 horas al día y los fines de semana es apagar en torno al 65 % de las horas. Instance Scheduler en AWS, Start/Stop VMs en Azure, programaciones de instancias en GCP, o escala a cero si la plataforma lo permite.
- Una sola zona, sin réplicas, tamaños mínimos y un único NAT.
- Entornos efímeros por rama que se destruyen al cerrar el pull request.
- Bases de datos detenidas cuando no se usan: RDS, Aurora y PostgreSQL flexible permiten detenerlas hasta 7 días, después arrancan solas.

### Logs: retención y muestreo

| | AWS | Azure | GCP |
|---|---|---|---|
| Ingesta (lista, UE) | CloudWatch Logs: 0,57 USD/GB Standard, 0,285 USD/GB Infrequent Access | Log Analytics, plan Analytics: 2,99 USD/GB; planes Basic y Auxiliary más baratos | Cloud Logging: 0,50 USD/GiB, primeros 50 GiB por proyecto y mes gratis |
| Retención por defecto | Sin caducidad: configúrala en cada grupo | Según el plan de la tabla | 30 días incluidos |

Reglas: nivel `INFO` en producción, muestreo de trazas y de logs de acceso de éxito, retención corta en la herramienta cara (14–30 días) y exportación a almacenamiento de objetos para lo que haya que conservar por auditoría.

### Almacenamiento: niveles y ciclo de vida

| Acceso | AWS (S3) | Azure (Blob) | GCP (Cloud Storage) |
|---|---|---|---|
| Frecuente | Standard | Hot | Standard |
| Mensual | Standard-IA (mín. 30 días) | Cool (mín. 30 días) | Nearline (mín. 30 días) |
| Trimestral | Glacier Instant Retrieval (mín. 90 días) | Cold (mín. 90 días) | Coldline (mín. 90 días) |
| Archivo | Glacier Flexible (90 días), Deep Archive (180 días) | Archive (mín. 180 días) | Archive (mín. 365 días) |
| Automático | Intelligent-Tiering (sin mínimo) | Políticas de ciclo de vida; nivel Smart | Autoclass |

Las duraciones mínimas importan: borrar antes se cobra igual. Configura también la caducidad de versiones antiguas, cargas multiparte incompletas e instantáneas de discos.

### Egress y CDN

AWS y Azure regalan los primeros 100 GB/mes de salida a Internet; después, en AWS eu-west-1, 0,09 USD/GB. La transferencia desde orígenes de AWS (S3, ALB) a CloudFront no se cobra, CloudFront incluye 1 TB/mes gratis y tiene planes de tarifa plana desde 0 USD. Servir estáticos y descargas por la CDN casi siempre abarata la salida además de acelerarla.

### Licencias

Azure Hybrid Benefit permite usar licencias de Windows Server y SQL Server con Software Assurance, y suscripciones de RHEL y SLES, sin pagarlas de nuevo en la VM. Si tu organización ya las tiene, es el ahorro más rápido en Azure.

### Free tiers y créditos

| | AWS | Azure | GCP |
|---|---|---|---|
| Cuenta nueva | 100 USD de crédito más hasta 100 USD por completar actividades; plan gratuito de 6 meses | 200 USD durante 30 días y 12 meses de servicios populares | 300 USD durante 90 días; nivel Always Free |
| Startups | AWS Activate: hasta 5.000 USD (Founders) o hasta 200.000 USD vía aceleradoras e inversores | Microsoft for Startups: hasta 150.000 USD por fases | Google for Startups Cloud: hasta 200.000 USD, 350.000 USD para startups de IA |

Los créditos se acaban. Diseña como si pagaras desde el primer día, o el fin de los créditos se convierte en una migración urgente.

## Tres presupuestos tipo

Para una aplicación web con API, base de datos relacional y unos pocos miles de usuarios.

| | Mínimo | Equilibrado | Alta disponibilidad |
|---|---|---|---|
| Arquitectura | Una VM con Compose (API, PostgreSQL, Caddy) o serverless puro (funciones + BBDD de pago por uso) | PaaS de contenedores con 2 réplicas, balanceador gestionado y BBDD gestionada pequeña | Multi-AZ en todo, réplicas de lectura, WAF, caché gestionada, NAT por zona |
| Coste relativo | € | €€ | €€€€ |
| Ejemplo AWS (eu-west-1) | t4g.small 24/7: ~13 USD/mes, más 3,65 USD de su IPv4, disco y copias | 2 tareas Fargate ARM de 0,5 vCPU y 1 GB: ~29 USD; ALB: ~18 USD/mes fijo más LCU; RDS db.t4g.micro: ~12 USD más almacenamiento | El fijo se multiplica: 3 NAT Gateway ya suman ~105 USD/mes antes de procesar datos; RDS Multi-AZ duplica el precio de la instancia |
| Ejemplo Azure (West Europe) | B2pls v2: ~28 USD/mes | Container Apps con escala a cero y PostgreSQL flexible B1ms: ~15 USD/mes de cómputo de BBDD | Application Gateway WAF_v2: ~342 USD/mes solo de coste fijo |
| Operación | Tú: SO, copias, actualizaciones | Baja | Media: más piezas, pruebas de conmutación |
| Riesgo que aceptas | Caída del host; cortes en cada actualización | Caída de una zona si la BBDD no es multi-AZ | Poco, salvo caída regional |

Precios de lista, UE, noviembre de 2026, orientativos; cómputo calculado con 730 horas al mes, sin impuestos, tráfico ni almacenamiento salvo donde se indica. El salto de equilibrado a alta disponibilidad no viene del cómputo, sino de los costes fijos que se multiplican por zona y de los servicios de seguridad con cuota por hora. Antes de darlo, comprueba si el negocio lo necesita: muchas aplicaciones internas viven bien con «equilibrado» más una base de datos multi-AZ.

## FinOps: la rutina mínima

No hace falta un equipo FinOps para no llevarse sustos. Hace falta esto:

1. **Etiquetas obligatorias** (`app`, `env`, `owner`, `cost-center`) impuestas por política: SCP o Tag Policies en AWS, Azure Policy, políticas de organización y etiquetas en GCP. Sin etiquetas no hay reparto de costes.
2. **Presupuestos con alertas** por cuenta, suscripción o proyecto, al 50, 80 y 100 % y sobre el previsto. Recuerda que una alerta no detiene el gasto: en Azure el consumo no se para y en AWS solo las *budget actions* aplican políticas. GCP ofrece además presupuestos con tope de gasto que pausan servicios del proyecto.
3. **Detección de anomalías**: Cost Anomaly Detection en AWS, alertas de anomalías en Azure Cost Management, detección de anomalías en Cloud Billing.
4. **Exportación de costes** a un almacén consultable: Data Exports con CUR 2.0 o FOCUS en AWS, exportaciones de Cost Management (incluido FOCUS) en Azure, exportación de facturación a BigQuery en GCP. Con los datos en SQL puedes responder qué ha crecido y por qué.
5. **Revisión mensual de 30 minutos** con el responsable técnico: los cinco servicios que más crecen, recursos sin etiqueta, huérfanos, cobertura y uso de los compromisos, y recomendaciones de ajuste de tamaño (Compute Optimizer, Azure Advisor, Recommender).

El objetivo no es la factura más baja, sino que cada euro tenga dueño y razón de ser.
