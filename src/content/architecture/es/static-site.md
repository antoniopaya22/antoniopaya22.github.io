---
title: "Web estática y Jamstack"
short: "Web estática"
summary: "Webs, documentación y landings generadas en el build y servidas desde una CDN, con un poco de lógica en el borde y una función para los formularios: el caso más barato y con menos operación de todo el catálogo."
description: "Web estática o Jamstack con SSG, CDN, lógica en el borde, formularios con funciones y previews por PR: arquitectura en AWS, Azure, GCP y on-premises."
order: 22
requirements:
  - "Todo el HTML se genera en el build; en tiempo de petición no se ejecuta código salvo en el borde y en los formularios."
  - "El origen no es público: solo la CDN puede leer los ficheros."
  - "Cada despliegue es atómico y se puede revertir publicando la versión anterior."
  - "Los recursos con hash se cachean durante mucho tiempo y el HTML se revalida en cada despliegue."
  - "Los formularios validan en servidor, tienen protección anti-bots y no exponen secretos en el cliente."
platforms:
  onprem:
    summary: "Caddy termina TLS con certificados ACME y sirve y cachea los ficheros del disco, PowerDNS resuelve y un contenedor pequeño atiende los formularios; Coolify lo empaqueta todo."
    notes:
      - "Para ficheros estáticos en disco Caddy basta: Varnish solo aporta algo si delante hay un origen lento o dinámico."
      - "Un servidor propio no es una CDN: si tus visitantes están repartidos por el mundo, pon una CDN externa delante y deja el servidor como origen."
      - "Publica en un directorio nuevo por versión y cambia un enlace simbólico: el despliegue es atómico y revertir es volver a apuntar al anterior."
      - "El coste es el host y su mantenimiento; el tráfico de salida de tu proveedor de conectividad suele ser el límite real."
  aws:
    summary: "CloudFront con Origin Access Control delante de un bucket S3 privado, CloudFront Functions para redirecciones y cabeceras, Route 53 y ACM, y Lambda para los formularios; Amplify Hosting como alternativa todo en uno."
    notes:
      - "Los planes de tarifa plana de CloudFront (desde noviembre de 2025) incluyen CDN, WAF, DNS de Route 53, certificado y CloudFront Functions por una cuota mensual fija sin excesos; el plan Free cubre un sitio pequeño."
      - "El certificado de ACM para CloudFront tiene que estar en `us-east-1`, aunque el bucket esté en Europa."
      - "CloudFront Functions resuelve reescrituras, redirecciones y cabeceras de seguridad; Lambda@Edge solo si necesitas red o más tiempo de ejecución, y se cobra aparte por invocación."
      - "Enruta `/api/*` a una URL de función de Lambda protegida con OAC: mismo dominio, sin CORS y sin API Gateway."
      - "Amplify Hosting cobra por minuto de build, almacenamiento y GB servidos; el WAF de Amplify tiene un cargo fijo por app."
  azure:
    summary: "Front Door sirve un Storage con sitio web estático, con su motor de reglas para redirecciones, Azure DNS y certificado gestionado, y Azure Functions para los formularios; Static Web Apps es la alternativa todo en uno y la más barata."
    notes:
      - "Front Door Standard y Premium tienen una cuota base por hora: para una web pequeña cuesta más que todo lo demás junto. Static Web Apps incluye CDN, certificados y funciones gestionadas sin ese fijo."
      - "Static Web Apps Free no tiene SLA y deja de servir el sitio al agotar el ancho de banda incluido; para producción, el plan Standard."
      - "Static Web Apps crea un entorno de staging por pull request (más en Standard que en Free) y lo borra al cerrarlo."
      - "Front Door Standard solo admite reglas WAF personalizadas; las reglas gestionadas exigen Premium. Edge Actions permite JavaScript en el borde si el motor de reglas no llega."
  gcp:
    summary: "Un balanceador de aplicaciones externo con Cloud CDN sirve un bucket de Cloud Storage, con Service Extensions para lógica en el borde, Cloud DNS y Certificate Manager, y Cloud Run functions para los formularios; Firebase Hosting es la alternativa todo en uno."
    notes:
      - "Cloud CDN no existe sin el balanceador de aplicaciones externo, que tiene coste por regla de reenvío además de la salida de caché: para un sitio pequeño, Firebase Hosting sale mucho más barato."
      - "Los plugins de Service Extensions son módulos WebAssembly que se ejecutan en el balanceador; para redirecciones y cabeceras basta con las reglas de rutas del propio balanceador."
      - "Firebase Hosting da CDN, certificados, canales de preview y reescrituras hacia Cloud Run o funciones sin configurar balanceador."
      - "El plan gratuito de Firebase (Spark) desactiva el sitio al superar la transferencia mensual incluida; con tráfico real, pasa a Blaze con alertas de presupuesto."
tiers:
  - name: "Gratuito"
    when: "Web personal, documentación de un proyecto o landing con tráfico modesto y sin SLA."
    cost: 1
    ops: 1
    estimate: "≈ 0 €/mes más el dominio, dentro de los planes gratuitos (precios de lista, nov 2026, orientativo)"
    onprem: "Un VPS con Caddy sirviendo el directorio generado por el CI; los formularios, un contenedor pequeño en el mismo host."
    aws: "S3 privado con CloudFront en el plan de tarifa plana Free, Route 53 y una URL de función de Lambda para el formulario."
    azure: "Static Web Apps Free con funciones gestionadas para el formulario y dominio propio."
    gcp: "Firebase Hosting en el plan Spark, con un canal de preview por pull request."
    tradeoffs: "Sin SLA ni soporte, y los planes gratuitos cortan el servicio al agotar la cuota en lugar de cobrar el exceso."
  - name: "Producción"
    when: "Web corporativa o de producto con SLA, dominio propio, WAF y previews por PR."
    cost: 2
    ops: 1
    onprem: "Dos hosts con Caddy detrás de una CDN externa, despliegue atómico por enlace simbólico y monitorización sintética."
    aws: "CloudFront en plan Pro con WAF y CloudFront Functions, S3 versionado y entornos de preview desde el CI o con Amplify Hosting."
    azure: "Static Web Apps Standard con SLA, autenticación personalizada y entornos de staging por PR."
    gcp: "Firebase Hosting en Blaze con alertas de presupuesto, o el balanceador con Cloud CDN y Cloud Armor si ya lo tienes."
    tradeoffs: "Aparece un coste fijo mensual pequeño a cambio de SLA y WAF; sigue siendo una sola región de origen."
  - name: "Gran escala y multiorigen"
    when: "Sitio de alto tráfico, campañas con picos enormes o requisitos de disponibilidad del origen."
    cost: 3
    ops: 2
    onprem: "CDN comercial delante de dos orígenes en sitios distintos con DNS con comprobación de salud."
    aws: "CloudFront en plan Business o Premium con grupo de orígenes S3 en dos regiones, WAF con gestión de bots y Origin Shield."
    azure: "Front Door Premium con WAF gestionado, Private Link al Storage y orígenes en dos regiones."
    gcp: "Balanceador global con Cloud CDN, Cloud Armor y backend buckets en dos regiones."
    tradeoffs: "Más piezas y una cuota fija relevante; casi siempre lo justifica el WAF y la protección ante bots, no el ancho de banda."
extensions:
  - name: "WAF y limitación por IP"
    when: "Cuando el formulario recibe spam o el sitio sufre scraping agresivo."
    cost: "low"
    onprem: "Coraza en Caddy"
    aws: "AWS WAF (incluido en tarifa plana)"
    azure: "WAF de Front Door"
    gcp: "Cloud Armor"
  - name: "Anti-bots en formularios"
    when: "Siempre que haya un formulario público."
    cost: "low"
    onprem: "Captcha propio (ALTCHA, mCaptcha)"
    aws: "AWS WAF CAPTCHA o Challenge"
    azure: "CAPTCHA del WAF de Front Door"
    gcp: "reCAPTCHA"
  - name: "Previews por pull request"
    when: "Cuando revisores no técnicos tienen que ver los cambios antes de publicarlos."
    cost: "low"
    onprem: "Coolify (preview deployments)"
    aws: "Amplify Hosting (web previews)"
    azure: "Static Web Apps (staging)"
    gcp: "Firebase Hosting (preview channels)"
  - name: "Autenticación en el borde"
    when: "Documentación interna o zona privada sin montar un backend."
    cost: "low"
    onprem: "oauth2-proxy"
    aws: "Lambda@Edge con Cognito"
    azure: "Autenticación de Static Web Apps"
    gcp: "IAP (sitio servido desde Cloud Run)"
  - name: "Búsqueda en el sitio"
    when: "Documentación con cientos de páginas."
    cost: "low"
    onprem: "Pagefind (índice estático)"
    aws: "Pagefind (índice estático)"
    azure: "Pagefind (índice estático)"
    gcp: "Pagefind (índice estático)"
  - name: "Imágenes optimizadas"
    when: "Cuando las imágenes son la mayor parte del peso servido."
    cost: "medium"
    onprem: "imgproxy"
    aws: "Optimización en el build + CloudFront"
    azure: "Optimización en el build + Front Door"
    gcp: "Optimización en el build + Cloud CDN"
savings:
  - "Empieza en el plan gratuito de la plataforma todo en uno (Static Web Apps Free, Firebase Spark, Amplify Hosting) o en el plan Free de tarifa plana de CloudFront: para una web pequeña la factura es cero o casi."
  - "En Azure no pongas Front Door delante de una web pequeña: su cuota base por hora supera el resto del coste; Static Web Apps ya incluye distribución global."
  - "En Google Cloud, Cloud CDN obliga a pagar el balanceador; si no necesitas Cloud Armor ni el balanceador para otra cosa, Firebase Hosting es más barato."
  - "Nombra los recursos con hash y cachéalos un año con `immutable`; así solo se revalida el HTML, la tasa de acierto sube y apenas necesitas invalidar."
  - "Optimiza imágenes en el build (AVIF o WebP, tamaños responsivos) en lugar de transformarlas en cada petición: el ancho de banda es la partida que crece."
  - "Usa CloudFront Functions o reglas de la CDN para redirecciones y cabeceras en lugar de Lambda@Edge o funciones: es más barato por petición y, en tarifa plana, va incluido."
---

## Cuándo lo necesitas

Cuando el contenido cambia al publicar y no en cada visita: la web de una empresa, la documentación de un producto, un blog, una landing de campaña o la web personal de un profesional. Un generador estático (Astro, Hugo, Eleventy, Next en modo export) produce HTML, CSS y JS en el CI, y la CDN los sirve sin servidores de aplicación detrás. Es el diseño con menos superficie de ataque, menos operación y menor factura que existe; muchas aplicaciones que hoy corren en un servidor podrían ser esto con un par de funciones.

Si cada página depende del usuario (paneles, carritos, contenido personalizado), no es este caso: es [Frontend, backend y base de datos](/arquitectura/web-app/), aunque puedas reutilizar la CDN y el origen estático para la SPA.

## Escenarios

### Web de un profesional o de un proyecto open source

Plan gratuito de una plataforma todo en uno, dominio propio y el formulario de contacto en una función. No hay nada que operar; el riesgo es el límite de cuota del plan gratuito, que corta el servicio en lugar de facturar. Configura alertas y ten claro a qué plan pasarías.

### Web corporativa con equipo de marketing

El contenido lo editan personas no técnicas: un CMS headless (Strapi, Directus, Payload o uno SaaS) dispara un webhook que lanza el build. Las previews por pull request son imprescindibles para que marketing revise antes de publicar. El WAF y el anti-bots del formulario se pagan solos con el primer ataque de spam.

### Campaña con picos enormes

Un anuncio en televisión o una salida a bolsa multiplican el tráfico por mil durante una hora. La parte estática aguanta sin cambios si todo está en caché; lo que cae es el formulario o la API mínima. Pon una cola entre la función y el destino, limita la concurrencia y prueba la carga antes. Con tarifa plana de CloudFront el pico no dispara la factura.

### Organismo con datos en la UE o exigencia on-premises

La CDN global sirve desde nodos de todo el mundo; si el contenido es público rara vez es un problema, pero los logs del borde incluyen IPs. Revisa dónde se almacenan y su retención. Si el cliente exige on-premises, un par de hosts con Caddy y despliegue por enlace simbólico es suficiente; la CDN externa es opcional y se puede limitar a nodos europeos en varios proveedores.

## Cómo encaja

El build en el CI genera el sitio y lo publica en el almacenamiento de origen: sube primero los recursos con hash y después el HTML, para que ninguna página apunte a un fichero que aún no existe. El visitante resuelve el dominio en el DNS, que apunta a la CDN; el certificado lo emite y renueva la propia plataforma.

La CDN termina TLS y responde desde caché. Antes, la lógica en el borde aplica redirecciones, reescrituras de rutas (`/blog/` a `/blog/index.html`), cabeceras de seguridad (CSP, HSTS) y, si hace falta, idioma o pruebas A/B. Si no está en caché, la CDN lee el origen, que es privado y solo acepta a la CDN. Las peticiones a `/api` van a la función que procesa el formulario: valida, comprueba el anti-bots y envía el correo o lo guarda.

La alternativa todo en uno (Amplify Hosting, Static Web Apps, Firebase Hosting, Coolify) empaqueta build, CDN, certificados, previews y funciones en un servicio. Fuera de las tres nubes, Cloudflare (Workers con recursos estáticos o Pages) y Netlify cumplen el mismo papel y son una opción razonable si no necesitas que la web viva en tu cuenta de nube.

## Despliegue: Docker, Kubernetes o serverless

**Docker Compose en un host.** Un contenedor de Caddy con el directorio del sitio montado como volumen de solo lectura, otro con la función del formulario y, si quieres, Coolify para gestionar builds y previews. Las copias son triviales: el sitio se regenera desde Git; solo hay que guardar la configuración y los secretos del formulario.

**Kubernetes on-premises.** Solo si ya tienes clúster: una imagen de Nginx o Caddy con el sitio dentro, un Ingress o Gateway con cert-manager y el formulario como Deployment pequeño. Montar un clúster para una web estática es sobreingeniería.

**Cloud sin Kubernetes.** Es la opción natural: almacenamiento y CDN, o la plataforma todo en uno, con el formulario en una función. No hay nada que escalar ni parchear.

**Kubernetes gestionado.** No compensa para servir estáticos; como mucho, el formulario puede vivir en el clúster si ya existe.

| Opción | Coste fijo | Operación | Escalado | Cuándo |
|---|---|---|---|---|
| Docker Compose | Un VPS | Baja | Vertical | On-premises o soberanía |
| Kubernetes on-premises | Clúster existente | Media | HPA | Solo si el clúster ya existe |
| Almacenamiento + CDN o todo en uno | Cero o cuota mínima | Casi nula | Automático en la CDN | Opción por defecto |
| EKS, AKS, GKE | Plano de control y nodos | Media-alta | HPA | No recomendado para esto |

## Decisiones clave

- **Todo en uno o piezas sueltas.** Static Web Apps, Firebase Hosting o Amplify dan previews y funciones sin configurar nada; almacenamiento más CDN da control fino de caché, WAF y orígenes múltiples. Empieza con lo primero y migra cuando un requisito concreto lo pida.
- **Qué va en el borde.** Redirecciones, cabeceras e idioma sí; lógica de negocio no. Las funciones de borde tienen límites estrictos de tiempo y tamaño, y depurarlas es más difícil que una función normal.
- **Invalidar o versionar.** Con recursos con hash solo cambia el HTML; invalida el HTML (o dale una caché corta) en cada despliegue y no invalides todo con `/*` por costumbre.
- **Formulario propio o servicio.** Una función de veinte líneas con anti-bots basta; un servicio externo de formularios ahorra código pero envía los datos de tus usuarios a un tercero.
- **Un CDN de la nube o uno independiente.** Si el resto de tu sistema está en una nube, su CDN simplifica permisos y facturación; si no, Cloudflare o Netlify suelen ser más baratos y sencillos.

## Errores habituales

- Dejar el bucket o la cuenta de almacenamiento públicos además de la CDN: se saltan la caché, el WAF y las cabeceras.
- Cachear el HTML durante días sin invalidar al desplegar: los usuarios ven la versión antigua apuntando a recursos que ya no existen.
- Subir el HTML antes que los recursos con hash, o borrar los recursos antiguos en el mismo despliegue: páginas rotas durante minutos.
- Poner la clave del servicio de correo en el JavaScript del cliente para «no necesitar backend».
- Elegir Front Door o Cloud CDN con balanceador para una web de diez páginas y descubrir que la cuota fija es lo único que se paga.
- Olvidar que el plan gratuito corta el servicio al superar la cuota: justo el día del pico.
- No configurar la página 404 ni las reescrituras de rutas, y que las URLs sin barra final devuelvan errores.
