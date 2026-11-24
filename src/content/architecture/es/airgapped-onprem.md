---
title: "Producto en un entorno sin internet (air-gapped)"
short: "Entorno sin internet"
summary: "Entregar, instalar, actualizar y diagnosticar un producto en una instalación que nunca se conecta a internet, con un paquete offline firmado que se transfiere a mano y se despliega en un solo host."
description: "Despliegue air-gapped con paquete offline firmado, SBOM, Docker Compose, copias cifradas y rollback: referencia en AWS, Azure, GCP y on-premises."
order: 20
requirements:
  - "Todo lo necesario para instalar o actualizar viaja en un único paquete versionado: imágenes, compose, migraciones y SBOM."
  - "El destino verifica firma y sumas SHA256 antes de cargar nada; un paquete alterado no se instala."
  - "Las migraciones se ejecutan como paso previo y separado, y existe un camino de vuelta probado."
  - "Las copias de la base de datos y los volúmenes se cifran y se restauran en un simulacro periódico."
  - "El cliente puede diagnosticar sin conectividad y exportar un paquete de soporte por el mismo canal controlado."
platforms:
  onprem:
    summary: "GitHub Actions construye y firma, Harbor guarda imágenes y SBOM, y el paquete (images.tar + SHA256SUMS firmado) se carga con `docker load` y se arranca con Docker Compose en un único host del cliente."
    notes:
      - "El compose referencia cada imagen por digest (`image: registro/app@sha256:…`), no por etiqueta: lo que se ejecuta es exactamente lo que se firmó."
      - "La clave pública de verificación (cosign, minisign o GPG) se instala una vez por un canal distinto al del paquete; si viajan juntos, la firma no demuestra nada."
      - "Harbor replica y conserva las versiones entregadas a cada cliente: cuando llega una incidencia sobre la 3.4.1, puedes reconstruir exactamente ese entorno."
      - "Grafana y Loki corren en el mismo host con retención acotada; un script de soporte empaqueta logs, versiones y estado en un tar que sale por el mismo canal controlado."
      - "El coste está en la operación de cada entrega: preparar, transferir y validar paquetes, y mantener varias versiones en soporte a la vez."
  aws:
    summary: "AWS se queda en el lado de construcción (Amazon ECR y firma); el destino es hardware del cliente con Docker Compose, porque Snowball Edge ya no está disponible para clientes nuevos."
    notes:
      - "Snowball Edge no es una opción para un diseño nuevo: AWS dejó de ofrecer dispositivos de la familia Snow a clientes nuevos y solo mantiene a los existentes."
      - "AWS Outposts (rack o servidor) es la alternativa que AWS propone para cómputo en el borde, pero depende de su región y solo tolera desconexiones temporales de hasta 7 días: sirve para sitios con conectividad intermitente, no para un entorno air-gapped."
      - "ECR guarda las imágenes de cada versión con escaneo; el pipeline las exporta con `docker save` o `skopeo` y genera el paquete desde los digests firmados."
      - "Coste en AWS: almacenamiento de ECR y minutos de CI. El hardware y su operación son del cliente."
  azure:
    summary: "Si el cliente ya opera Azure Local con operaciones desconectadas, el paquete se sube a su Azure Container Registry local y se ejecuta en una VM de Azure Local con Compose o en AKS sobre Azure Local; si no, el destino es un host propio como on-premises."
    notes:
      - "Las operaciones desconectadas de Azure Local ofrecen un plano de control local con portal, ARM, RBAC, VMs, AKS, Container Registry, Key Vault y Azure Policy, sin conexión a la nube pública."
      - "No es autoservicio: exige un contrato elegible (no MOSA), plan de soporte, una necesidad de negocio aprobada mediante formulario de precalificación, hardware Premier Solutions y un clúster de gestión dedicado."
      - "Para un único producto no compensa montarlo; tiene sentido cuando el cliente ya lo tiene como plataforma soberana y quiere que todo pase por su ACR y su Azure Policy."
      - "Key Vault local guarda los secretos y certificados de la instalación; la CA interna del cliente emite los certificados TLS."
  gcp:
    summary: "En un cliente con Google Distributed Cloud air-gapped, el producto se entrega como charts o manifiestos, las imágenes se suben a su Harbor gestionado y se despliegan en su Kubernetes; Artifact Registry queda en el lado de construcción."
    notes:
      - "GDC air-gapped es hardware y software diseñados por Google, entregados en racks (o en formato appliance) y sin conectividad con Google Cloud; lo contrata y opera el cliente con Google o un socio."
      - "El propio GDC recibe su software en almacenamiento portátil verificado con sumas de comprobación: es el mismo patrón que este caso, y el operador del cliente ya tiene el procedimiento."
      - "Las cargas corren en Kubernetes, así que el paquete incluye un chart de Helm o manifiestos en vez de un compose, y las imágenes se suben al Managed Harbor Service del entorno."
      - "Fuera de GDC, el destino vuelve a ser un host del cliente con Docker Compose; Google Cloud solo aporta Artifact Registry y el CI."
tiers:
  - name: "Un host con Compose"
    when: "Cliente con un servidor o VM dedicado, sin equipo de plataforma y con ventanas de mantenimiento aceptables."
    cost: 1
    ops: 1
    onprem: "Un host Linux con Docker Compose, Postgres en contenedor, restic a un disco o NAS separado, Grafana + Loki locales."
    aws: "CI y Amazon ECR en AWS; en destino, el mismo host del cliente con Compose. Snowball Edge no está disponible para clientes nuevos."
    azure: "CI y Container Registry en Azure; en destino, una VM del cliente (o de Azure Local desconectado si ya existe) con Compose."
    gcp: "CI y Artifact Registry en Google Cloud; en destino, un host del cliente con Compose."
    tradeoffs: "Sin alta disponibilidad: una actualización o un fallo de disco paran el servicio hasta restaurar."
  - name: "Activo-pasivo"
    when: "El servicio no puede esperar a reinstalar el host; el cliente aporta dos máquinas."
    cost: 2
    ops: 2
    onprem: "Dos hosts con Compose; Postgres con réplica en streaming al pasivo, IP flotante con keepalived y copias restic fuera de ambos."
    aws: "Igual que on-premises en el hardware del cliente; AWS solo construye y guarda las versiones."
    azure: "Dos VMs en Azure Local desconectado o dos hosts propios, con réplica de Postgres y la misma IP flotante."
    gcp: "Dos hosts propios, o dos réplicas en el Kubernetes de GDC air-gapped si el cliente lo tiene."
    tradeoffs: "La conmutación es manual o semiautomática; hay que probarla, y las actualizaciones siguen necesitando ventana."
  - name: "Kubernetes air-gapped"
    when: "Varias aplicaciones o varios sitios, equipo de plataforma en el cliente y necesidad de actualizaciones sin corte."
    cost: 3
    ops: 3
    onprem: "k3s o RKE2 instalado en modo air-gapped, Harbor local como registro, CloudNativePG para Postgres y despliegue con Helm."
    aws: "No hay plataforma air-gapped de AWS para clientes nuevos: k3s o RKE2 en hardware del cliente."
    azure: "AKS sobre Azure Local con operaciones desconectadas, imágenes en el ACR local."
    gcp: "Kubernetes de GDC air-gapped con su Managed Harbor Service."
    tradeoffs: "Más piezas que mantener y actualizar sin internet: el propio Kubernetes, el registro y los operadores también viajan en paquetes."
extensions:
  - name: "Diodo de datos"
    when: "Entornos clasificados o industriales donde un USB no está permitido y la entrada debe ser física y unidireccional."
    cost: "high"
    onprem: "Diodo de datos hardware"
    aws: "Diodo de datos hardware"
    azure: "Diodo de datos hardware"
    gcp: "Diodo de datos hardware"
  - name: "Registro local en destino"
    when: "Más de un host o Kubernetes en el cliente: cargar una vez y que todos tiren del registro."
    cost: "low"
    onprem: "Harbor o registry:2 local"
    aws: "Harbor o registry:2 local"
    azure: "ACR en Azure Local desconectado"
    gcp: "Managed Harbor Service (GDC)"
  - name: "Paquetes delta"
    when: "Imágenes grandes y actualizaciones frecuentes: solo viajan las capas que cambian."
    cost: "low"
    onprem: "skopeo + capas por digest"
    aws: "skopeo desde Amazon ECR"
    azure: "skopeo / oras desde ACR"
    gcp: "skopeo desde Artifact Registry"
  - name: "Escaneo de vulnerabilidades offline"
    when: "El cliente exige auditar el SBOM entregado contra CVE sin salir a internet."
    cost: "low"
    onprem: "Trivy / Grype con BD offline"
    aws: "Amazon Inspector (en origen)"
    azure: "Defender for Containers (origen)"
    gcp: "Artifact Analysis (en origen)"
  - name: "Licencia offline firmada"
    when: "Producto comercial: la licencia se valida en local contra una clave pública, sin servidor de licencias."
    cost: "low"
    onprem: "Fichero de licencia firmado"
    aws: "Fichero de licencia firmado"
    azure: "Fichero de licencia firmado"
    gcp: "Fichero de licencia firmado"
savings:
  - "Usa imágenes base mínimas (distroless, Alpine o Wolfi) y multi-stage builds: el paquete pesa menos, se transfiere antes y tiene menos CVE que justificar."
  - "Aplica políticas de ciclo de vida en Harbor, Amazon ECR, Container Registry o Artifact Registry para conservar solo las versiones que tienen algún cliente en soporte."
  - "Ejecuta el CI de empaquetado solo en etiquetas de versión, no en cada commit: generar y firmar un paquete de varios GB en cada push gasta minutos y almacenamiento."
  - "Fija la retención de Loki y Prometheus en el host del cliente (días, no meses): evita comprar disco y que un volumen lleno tumbe el servicio."
  - "Activa la deduplicación y la poda de restic (`forget --prune`) con una política de retención clara en lugar de guardar copias completas sin fin."
  - "No propongas Azure Local desconectado ni GDC air-gapped solo para tu producto: el hardware, las licencias y la operación los paga el cliente y solo compensan como plataforma compartida."
---

## Cuándo lo necesitas

Cuando el cliente es un hospital, una planta industrial, defensa, un laboratorio o una administración que no permite que el sistema salga a internet, ni siquiera para descargar una imagen. No hay `docker pull`, no hay telemetría, no hay soporte remoto y cada actualización es un procedimiento con firma de alguien. Si el producto se diseñó pensando en SaaS, la primera instalación desconectada revela todo lo que daba por supuesto: un registro público, un servidor de licencias, NTP, una CA pública para TLS o un instalador que descarga dependencias.

## Escenarios

- **Software para hospitales o laboratorios.** Red clínica aislada, un servidor virtual cedido por el cliente y sin equipo de plataforma. Un host con Compose, copias a un NAS del cliente y un procedimiento de actualización que puede ejecutar su técnico con una guía de una página.
- **Planta industrial con red OT.** La entrada es física y a menudo pasa por un diodo de datos o un puesto de descontaminación de USB. El paquete debe ser un único fichero con nombre versionado, firma y sumas, porque el operador no puede consultarte por chat si falla una capa.
- **Defensa o administración con nube soberana propia.** El cliente ya opera Azure Local con operaciones desconectadas o Google Distributed Cloud air-gapped. Aquí no entregas un compose sino imágenes para su registro local y un chart o plantilla que encaje con sus políticas.
- **Varias sedes sin conectividad.** Muchas instalaciones idénticas, cada una en su versión. Necesitas inventario de qué versión tiene cada sitio, paquetes delta y una matriz de compatibilidad de migraciones.
- **Sitio con conectividad intermitente, no nula.** Un barco o una mina que conecta de vez en cuando. No es air-gapped: AWS Outposts u otra plataforma conectada de forma intermitente encaja mejor que un paquete físico.

## Cómo encaja

1. **CI: build y firma.** El pipeline compila, ejecuta pruebas, genera el SBOM de cada imagen (Syft, en CycloneDX o SPDX) y firma las imágenes.
2. **Registro + SBOM.** Las imágenes y sus SBOM quedan en el registro (Harbor, Amazon ECR, Container Registry o Artifact Registry) como fuente de verdad de lo entregado a cada cliente.
3. **Paquete offline firmado.** Un job exporta las imágenes por digest a `images.tar`, añade el compose (o el chart), las migraciones, los SBOM y un `SHA256SUMS` firmado con la clave de entrega.
4. **Transferencia.** El paquete sale por un canal controlado: USB cifrado, soporte óptico o diodo de datos. Es un paso humano y documentado.
5. **Carga en el entorno sin internet.** En el host se verifica la firma con la clave pública ya instalada, se comprueban las sumas, se ejecuta `docker load` y se arranca primero el contenedor de migraciones; solo si termina bien se levanta la aplicación con `docker compose up -d`.
6. **Copias cifradas.** `pg_dump` y los volúmenes de ficheros van a un repositorio restic cifrado en un disco o NAS separado del host.
7. **Diagnóstico local.** Grafana y Loki muestran métricas y logs en local. Para soporte, un script genera un paquete con logs, versiones y estado que sale por el mismo canal controlado, revisado por el cliente.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host** es la base y lo que más clientes aceptan. Contenedores: proxy inverso (Caddy o Traefik con certificados de la CA interna del cliente), la aplicación, un worker si lo hay, Postgres con volumen nombrado, un servicio `migrate` de un solo uso del que depende la aplicación (`depends_on` con `condition: service_completed_successfully`), Grafana, Loki y un agente de logs. Volúmenes para datos de Postgres, ficheros subidos y la configuración de Grafana. Las copias las lanza un timer de systemd con restic.

**Kubernetes on-premises** compensa cuando hay varias aplicaciones o un equipo de plataforma. k3s y RKE2 documentan su instalación air-gapped: el binario, el tar de imágenes del sistema y un registro local (Harbor o `registry:2`) configurado como mirror. Postgres con CloudNativePG, certificados con cert-manager contra un emisor de la CA interna y despliegue con Helm. Todo eso también se actualiza a base de paquetes, así que tu entrega crece.

**Serverless** no existe en un entorno desconectado de verdad: no hay API de nube a la que llamar. Lo más parecido son las plataformas que traen su propio plano de control local: AKS y VMs en Azure Local con operaciones desconectadas, o el Kubernetes de GDC air-gapped. Snowball Edge, que cubría parte de este hueco en AWS, ya no se ofrece a clientes nuevos.

| Opción | Coste fijo | Operación | Actualizar sin corte | Cuándo |
|---|---|---|---|---|
| Compose en un host | Bajo | Baja | No | Un producto, un sitio, sin equipo de plataforma |
| k3s / RKE2 air-gapped | Medio | Alta | Sí | Varias aplicaciones o sitios, equipo de plataforma |
| Azure Local desconectado | Alto | Media (la plataforma la opera el cliente) | Sí con AKS | El cliente ya la tiene como plataforma soberana |
| GDC air-gapped | Alto | Media (con Google o un socio) | Sí | Cliente gubernamental o regulado que ya la contrató |

## Decisiones clave

- **Un paquete monolítico o paquetes delta.** El monolítico es más fácil de verificar y de explicar al operador; el delta ahorra transferencia pero exige saber exactamente qué capas tiene ya el destino. Empieza por el monolítico.
- **Compose o Kubernetes en destino.** Compose se instala y se entiende en una tarde; Kubernetes te da actualizaciones sin corte a cambio de tener que entregar y mantener también la plataforma. Elige según quién va a operar, no según lo que usas en tu nube.
- **Migraciones expand/contract.** Si cada versión solo añade columnas y tablas y las retira en la siguiente, el rollback es volver a las imágenes anteriores. Si una migración rompe compatibilidad, el rollback es restaurar la copia previa, y el procedimiento debe decirlo.
- **Cómo se confía en la clave.** La clave pública de verificación se entrega una vez por otro canal y se rota con un procedimiento propio. Si la clave viaja con el paquete, la firma solo detecta corrupción, no manipulación.
- **Plataforma del cliente o host propio.** Encajar en Azure Local o GDC air-gapped te obliga a entregar en su formato y bajo sus políticas, pero te ahorra discutir el hardware.

## Errores habituales

- Imágenes por etiqueta (`:latest`, `:3.4`) en el compose: en destino no puedes saber qué se ejecuta.
- Dependencias ocultas de internet: un servidor de licencias, fuentes web, un CDN de JavaScript, un `pip install` en el arranque o la comprobación de actualizaciones.
- Olvidar la hora y la confianza: sin NTP interno los certificados y los tokens fallan; sin la CA interna en el trust store, TLS no funciona.
- Copias que nunca se restauran. En un sitio sin soporte remoto, una restauración fallida se descubre el peor día.
- Borrar las imágenes anteriores al actualizar: sin ellas no hay rollback rápido.
- Contar con Snowball Edge en un diseño nuevo de AWS: ya no se ofrece a clientes nuevos, y Outposts necesita su región.
