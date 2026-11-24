---
title: "Piezas para escalar: cachés, balanceadores y compañía"
short: "Piezas para escalar"
summary: "CDN, caché, balanceadores, autoescalado, réplicas, poolers, colas y limitación de ritmo: qué resuelve cada pieza, cuándo no merece la pena y qué servicio la implementa en cada plataforma."
description: "CDN, caché, balanceadores, autoescalado, réplicas, pooler de conexiones, colas y rate limiting: cuándo usar cada pieza en AWS, Azure, GCP y on-prem."
order: 2
---

Casi todos los problemas de escala de una aplicación web acaban en la base de datos. Las piezas de esta guía sirven, sobre todo, para que le lleguen menos peticiones, menos conexiones o peticiones mejor repartidas. Ninguna es gratis: cada una añade un componente que operar y un modo de fallo nuevo.

Antes de añadir cualquiera, **mide**: con trazas y latencia por endpoint sabes si el cuello está en la CPU, en consultas lentas, en conexiones agotadas o en un tercero. Y el requisito previo de todo lo que sigue es una API **sin estado**, sin sesiones en memoria ni ficheros en disco local.

## CDN y caché HTTP

La CDN guarda copias de las respuestas cerca del usuario. Para estáticos con nombre versionado (`app.3f9c2a.js`) es la optimización más barata que existe.

Lo que decide qué se cachea es la cabecera `Cache-Control` del origen:

| Directiva | Efecto | Uso típico |
|---|---|---|
| `public, max-age=31536000, immutable` | Navegador y CDN guardan un año sin revalidar | Estáticos con hash en el nombre |
| `public, max-age=60, s-maxage=300` | Navegador 1 min, CDN 5 min | Páginas o API pública que cambian poco |
| `stale-while-revalidate=30` | Sirve la copia caducada mientras refresca en segundo plano | Evitar picos de latencia al expirar |
| `private, no-store` | Nadie intermedio guarda nada | Respuestas con datos de usuario |
| `Vary: Accept-Encoding` | Una copia por variante | Compresión; evita `Vary: Cookie` |

La **invalidación** es la parte delicada: purgar rutas tarda en propagarse y puede tener coste por ruta. Lo robusto es no necesitarla: nombres versionados para estáticos, TTL cortos para lo dinámico y `no-cache` en el `index.html`.

**Cuándo:** siempre que sirvas estáticos o contenido público; también para absorber picos de tráfico anónimo.

**Cuándo no:** para respuestas personalizadas, salvo que domines las claves de caché. Un `Cache-Control` mal puesto en una respuesta con datos de usuario es una fuga de datos, no un fallo de rendimiento.

| On-prem | AWS | Azure | GCP |
|---|---|---|---|
| Varnish o Nginx con `proxy_cache`; CDN comercial delante | CloudFront (pago por uso o planes de tarifa plana) | Front Door Standard/Premium | Cloud CDN sobre el balanceador de aplicaciones externo global; Media CDN para vídeo |

En Azure, no empieces nada con Azure CDN Standard from Microsoft (classic), que se retira el 30 de septiembre de 2027, ni con Front Door (classic), que se retira el 31 de marzo de 2027. CloudFront ofrece desde noviembre de 2025 planes de tarifa plana mensual sin excedentes, compatibles con el pago por uso en otras distribuciones.

## Caché de aplicación

Una caché en memoria (Valkey o Redis) entre la API y la base de datos para resultados caros o muy repetidos: perfiles, catálogos, permisos calculados, contadores de uso.

| Patrón | Cómo funciona | Riesgo principal |
|---|---|---|
| Cache-aside | La app lee de caché; si falla, lee de BBDD y escribe en caché | Datos obsoletos hasta que expira el TTL |
| Write-through | La app escribe en BBDD y actualiza la caché en la misma operación | Escrituras más lentas; cachea cosas que nadie lee |
| Write-behind | La app escribe en caché y otro proceso vuelca a BBDD | Pérdida de datos si la caché cae: evítalo salvo casos muy concretos |

Cache-aside con TTL es el punto de partida razonable. Los detalles que marcan la diferencia:

- **TTL con jitter** (un 10–20 % aleatorio), para que las claves creadas a la vez no caduquen a la vez.
- **Estampidas.** Cuando una clave muy pedida caduca, cien peticiones van a la base de datos. Usa un bloqueo por clave (solo una recalcula), refresco anticipado o sirve el valor caducado mientras se recalcula.
- **Claves con tenant y versión:** `t:{tenant}:user:{id}:v3`. El prefijo evita servir datos de un cliente a otro; la versión invalida un esquema entero.
- **Borrar la clave al escribir**, además del TTL.
- **Caché negativa** con TTL corto para «no existe», o pedir IDs inexistentes tumba la base de datos.
- **`maxmemory-policy` explícita:** `allkeys-lru` para caché pura.

**Cuándo:** lecturas repetidas de datos que toleran segundos o minutos de retraso, y cuando ya has optimizado consultas e índices.

**Cuándo no:** para tapar una consulta sin índice, para datos que deben ser exactos al instante (saldos, stock en el momento de pagar) o cuando la tasa de acierto esperada es baja. Si la API no funciona con la caché caída, la caché se ha convertido en base de datos y necesita sus mismas garantías.

| On-prem | AWS | Azure | GCP |
|---|---|---|---|
| Valkey (Sentinel o clúster) | ElastiCache (Valkey, Redis OSS, Memcached), también en modo Serverless | Azure Managed Redis | Memorystore for Valkey / for Redis Cluster |

ElastiCache Serverless para Valkey factura un mínimo de 100 MB de datos por caché (1 GB en los otros motores), lo que lo hace viable para cargas pequeñas. Azure Cache for Redis está en retirada: los niveles Basic, Standard y Premium se retiran el 30 de septiembre de 2028 y Enterprise en marzo de 2027; lo nuevo va en Azure Managed Redis.

## Balanceadores de carga

| | L4 (transporte) | L7 (aplicación) |
|---|---|---|
| Ve | IP, puerto, TCP/UDP | Host, ruta, cabeceras, cookies |
| Termina TLS | Opcional | Sí, normalmente |
| Enruta por ruta o host | No | Sí |
| WAF | No | Sí, integrado o delante |
| Latencia añadida | Mínima | Algo mayor |
| Uso típico | Bases de datos, MQTT, gRPC sin inspección, tráfico no HTTP | APIs y webs HTTP |

La segunda decisión es **regional o global**. Un balanceador regional reparte entre zonas de una región; uno global (anycast) recibe al usuario en el punto de presencia más cercano y lo lleva a la región sana más próxima. Global solo tiene sentido si tienes backends en varias regiones o quieres terminar TLS en el borde.

| Rol | On-prem | AWS | Azure | GCP |
|---|---|---|---|---|
| L7 regional | HAProxy, Envoy, Nginx, Traefik | Application Load Balancer | Application Gateway v2 | Balanceador de aplicaciones externo regional |
| L4 regional | HAProxy (TCP), MetalLB + kube-proxy, Keepalived | Network Load Balancer | Load Balancer Standard | Balanceador de red (proxy o passthrough) |
| L7 global | CDN comercial delante | CloudFront con orígenes por región | Front Door | Balanceador de aplicaciones externo global |
| L4 global | Anycast propio (BGP) | Global Accelerator | Load Balancer de nivel global (cross-region) | Balanceador de red proxy externo global |

En Azure, el Load Balancer Basic se retiró el 30 de septiembre de 2025 y Application Gateway v1 el 28 de abril de 2026: usa Standard y v2.

**Health checks.** *Liveness* dice si el proceso vive (si falla, se reinicia); *readiness*, si puede atender tráfico ahora (si falla, deja de recibirlo). No metas la base de datos en el liveness: un mal momento de la base de datos reiniciaría todas las réplicas a la vez. Configura también el *draining* para que las réplicas que salen terminen sus peticiones.

**Sticky sessions.** Todos los L7 las ofrecen (cookies en ALB y Application Gateway, afinidad en Container Apps y, como «mejor esfuerzo», en Cloud Run). Evítalas para estado de la aplicación: reparten mal la carga, el autoescalado y los despliegues rompen la afinidad y un nodo caído se lleva las sesiones. Lleva la sesión a la caché o a un token; resérvalas para WebSockets o aplicaciones heredadas.

**Cuándo:** en cuanto hay dos réplicas o necesitas despliegues sin corte.

**Cuándo no:** si usas un PaaS de contenedores o funciones, el balanceo ya viene incluido; añadir otro balanceador delante solo se justifica para WAF, dominios propios o enrutar varios servicios bajo un dominio.

## Autoescalado

| Señal | Bueno para | Cuidado con |
|---|---|---|
| CPU | APIs con carga de cálculo uniforme | Cargas que esperan E/S: la CPU no sube y la latencia sí |
| Peticiones o concurrencia por réplica | APIs HTTP | Necesita un objetivo realista medido con pruebas de carga |
| Longitud o antigüedad de la cola | Workers | Escala a cero y arranque en frío del primer mensaje |
| Horario | Picos previsibles (apertura, cierre de mes) | Calendario que se queda obsoleto |

Reglas que aplico siempre: un **mínimo** que aguante el tráfico base sin arranques en frío en producción, un **máximo** que actúe de fusible para la factura y para la base de datos (cada réplica abre conexiones), y escalado hacia abajo más lento que hacia arriba para evitar oscilaciones.

| On-prem | AWS | Azure | GCP |
|---|---|---|---|
| HPA, KEDA para colas y escala a cero; Cluster Autoscaler (con Cluster API) para nodos | ECS Service Auto Scaling (seguimiento de CPU o `ALBRequestCountPerTarget`), Lambda por concurrencia | Container Apps con reglas HTTP y escaladores KEDA | Cloud Run por concurrencia y CPU; en GKE, HPA y autoaprovisionamiento de nodos |

**Cuándo:** tráfico variable o con picos.

**Cuándo no:** cuando el cuello de botella está aguas abajo. Escalar la API contra una base de datos saturada solo multiplica las conexiones y empeora el problema.

## Réplicas de lectura

Copias asíncronas que atienden lecturas que toleran segundos de retraso: informes, búsquedas, listados. El problema clásico es **leer lo que acabas de escribir**: si la pantalla siguiente lee de una réplica retrasada, el usuario ve el dato antiguo. Envía al primario las lecturas que siguen a una escritura del mismo usuario.

| On-prem | AWS | Azure | GCP |
|---|---|---|---|
| Réplicas de Patroni o CloudNativePG (servicio `-ro`) | Aurora: hasta 15 réplicas con endpoint de lectura | PostgreSQL flexible: hasta 5 réplicas (más en cascada) con endpoints virtuales | Cloud SQL: réplicas de lectura; *read pools* con un único endpoint en Enterprise Plus |

En Azure Database for PostgreSQL las réplicas no están disponibles en el nivel Burstable.

**Cuándo:** la carga es mayoritariamente de lectura y el primario está limitado por CPU o E/S de consultas.

**Cuándo no:** si el problema son las escrituras (una réplica no las alivia) o si antes no has revisado índices y consultas. Una réplica no es una copia de seguridad: replica también un `DELETE` erróneo.

## Pooler de conexiones

PostgreSQL crea un proceso por conexión. Con decenas de réplicas de API o cientos de funciones, cada una con su pool, se agotan `max_connections` y la memoria mucho antes que la CPU. Un pooler multiplexa miles de conexiones de cliente sobre unas pocas al servidor.

El modo **transacción** es el que aporta, y tiene restricciones: nada de `SET` de sesión, bloqueos asesores de sesión, `LISTEN/NOTIFY` ni tablas temporales que sobrevivan a la transacción. Las sentencias preparadas a nivel de protocolo funcionan en PgBouncer moderno con `max_prepared_statements` activado.

| On-prem | AWS | Azure | GCP |
|---|---|---|---|
| PgBouncer; en Kubernetes, el `Pooler` de CloudNativePG | RDS Proxy (Aurora y RDS) | PgBouncer integrado en PostgreSQL flexible, puerto `6432` | Managed Connection Pooling de Cloud SQL |

RDS Proxy deja de multiplexar (*pinning*) cuando detecta estado de sesión. El PgBouncer de Azure no existe en el nivel Burstable. El Managed Connection Pooling de Cloud SQL (PostgreSQL y MySQL) exige Enterprise Plus, y activarlo en una instancia existente la reinicia.

**Cuándo:** muchas réplicas de cómputo, funciones serverless o conexiones de vida corta.

**Cuándo no:** pocas réplicas con pools bien dimensionados en la aplicación. Ahí el pooler solo añade un salto y un componente más.

## Colas como amortiguador

Una cola convierte un pico en un retraso en lugar de en una caída: la API responde `202 Accepted` y los workers consumen al ritmo que la base de datos aguanta, escalando con la longitud de la cola. Es la pieza que más estabilidad da por euro. El caso «Colas y trabajos en segundo plano» lo desarrolla.

| On-prem | AWS | Azure | GCP |
|---|---|---|---|
| RabbitMQ (colas quorum), Kafka para streams | SQS | Service Bus | Pub/Sub, Cloud Tasks para tareas HTTP con ritmo controlado |

**Cuándo:** trabajo lento, frágil o con dependencias externas: emails, PDFs, integraciones, importaciones.

**Cuándo no:** cuando el usuario necesita la respuesta en la misma petición: esperar el resultado de una cola añade latencia sin ganar nada.

## Limitación de ritmo y contrapresión

Autoescalar no basta: alguien tiene que decir que no. La limitación de ritmo frena a clientes abusivos o con bugs; la contrapresión rechaza pronto el trabajo que el sistema saturado no podrá terminar.

- Limita por clave de API, usuario o tenant, no solo por IP. Responde `429` con `Retry-After`.
- Pon **timeouts** en todas las llamadas salientes y reintentos con espera exponencial y jitter, con un máximo.
- Usa **circuit breakers** hacia dependencias que fallan, para no saturarlas mientras se recuperan.
- Separa recursos (*bulkheads*): un pool de conexiones o una cola por tipo de trabajo, para que un cliente pesado no agote los de todos.

| On-prem | AWS | Azure | GCP |
|---|---|---|---|
| Envoy o Envoy Gateway (rate limit local y global), HAProxy *stick tables*, Nginx `limit_req` | Reglas por ritmo de AWS WAF; throttling de API Gateway por etapa y ruta | Reglas de rate limit del WAF de Front Door; `rate-limit-by-key` en API Management | Cloud Armor (`throttle` y `rate_based_ban`); cuotas en API Gateway o Apigee |

Las reglas por ritmo de AWS WAF admiten límites desde 10 peticiones por ventana, con ventanas de 1, 2, 5 o 10 minutos; no son exactas, sirven para frenar abusos, no para facturar cuotas.

## Multi-AZ frente a multirregión

| | Multi-AZ | Multirregión |
|---|---|---|
| Protege de | Fallo de un centro de datos o zona | Caída de una región entera, desastre regional |
| Complejidad | Baja: la mayoría de servicios gestionados lo ofrecen con una opción | Alta: replicación de datos, DNS o balanceo global, pruebas de conmutación |
| Coherencia | Réplica síncrona habitual en bases de datos gestionadas | Asíncrona: aceptas perder segundos de datos (RPO > 0) |
| Coste | Recursos duplicados en otra zona y tráfico entre zonas | Duplicar el entorno, más egress entre regiones |
| Para quién | Cualquier producción que importe | Requisitos regulatorios, RTO de minutos ante caída regional, usuarios en varios continentes |

Multi-AZ debería ser el estándar en producción: Aurora replica el almacenamiento en tres zonas, Azure tiene servicios con redundancia de zona y Cloud SQL ofrece alta disponibilidad regional. Ten en cuenta el tráfico entre zonas: en AWS se cobra 0,01 USD/GB en cada sentido entre EC2, RDS o ElastiCache de zonas distintas, y con mucho tráfico interno se nota.

Multirregión es otra liga. Antes, escribe qué RTO y RPO necesitas de verdad y cuánto cuesta una hora de caída. Para la mayoría de productos, multi-AZ más copias restaurables en otra región es el equilibrio correcto.

## En qué orden

Para una aplicación web que empieza a sufrir, el orden que suele dar más por menos: índices y consultas; CDN para estáticos; API sin estado con dos réplicas y health checks bien separados; pooler si el cómputo escala en horizontal o es serverless; colas para lo que no necesita respuesta inmediata; caché de aplicación para lecturas caras y medidas; réplicas de lectura. La limitación de ritmo en el borde va desde el primer día de exposición pública. Multirregión y *sharding*, después de agotar todo lo anterior.
