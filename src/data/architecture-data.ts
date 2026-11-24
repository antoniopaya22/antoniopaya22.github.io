/**
 * Reference architectures: diagram topology and the service that fills each role on every platform.
 * Shared by both languages; the prose lives in src/content/architecture/<lang>/<slug>.md.
 */


export const platforms = ['onprem', 'aws', 'azure', 'gcp'] as const;
export type Platform = (typeof platforms)[number];

export const platformLabel: Record<Platform, string> = {
  onprem: 'On-premises',
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'Google Cloud',
};

type L = { es: string; en: string };
/** a service name, translated only when it is descriptive text rather than a product name */
export type SvcName = string | L;
type Svc = Record<Platform, SvcName>;

export const svcText = (v: SvcName, lang: 'es' | 'en'): string => (typeof v === 'string' ? v : v[lang]);

export type NodeKind = 'client' | 'edge' | 'compute' | 'data' | 'queue' | 'ai' | 'security';

export interface ArchNode {
  id: string;
  x: number;
  y: number;
  kind: NodeKind;
  role: L;
  svc: Svc;
}

export interface ArchEdge {
  from: string;
  to: string;
  label?: L;
  dashed?: boolean;
}

export interface Diagram {
  height: number;
  nodes: ArchNode[];
  edges: ArchEdge[];
}

/** canvas width and node size, in SVG units */
export const W = 1000;
export const NODE_W = 210;
export const NODE_H = 66;

const same = (v: SvcName): Svc => ({ onprem: v, aws: v, azure: v, gcp: v });

// services that repeat across cases
const compute: Svc = { onprem: 'Kubernetes (RKE2/k3s)', aws: 'ECS Fargate', azure: 'Container Apps', gcp: 'Cloud Run' };
const functions: Svc = { onprem: { es: 'Workers en Kubernetes', en: 'Workers on Kubernetes' }, aws: 'AWS Lambda', azure: 'Azure Functions', gcp: 'Cloud Run functions' };
const postgres: Svc = { onprem: 'PostgreSQL + Patroni', aws: 'Aurora PostgreSQL', azure: 'Azure DB for PostgreSQL', gcp: 'Cloud SQL (PostgreSQL)' };
const objects: Svc = { onprem: 'Ceph RGW', aws: 'Amazon S3', azure: 'Blob Storage', gcp: 'Cloud Storage' };

export const diagrams: Record<string, Diagram> = {
  'web-app': {
    height: 506,
    nodes: [
      { id: 'client', x: 20, y: 180, kind: 'client', role: { es: 'Cliente', en: 'Client' }, svc: same({ es: 'SPA · móvil', en: 'SPA · mobile' }) },
      { id: 'cdn', x: 270, y: 60, kind: 'edge', role: { es: 'CDN + estáticos', en: 'CDN + static assets' }, svc: { onprem: { es: 'Nginx + caché', en: 'Nginx + cache' }, aws: 'CloudFront + S3', azure: 'Front Door + Storage', gcp: 'Cloud CDN + Storage' } },
      { id: 'lb', x: 270, y: 300, kind: 'edge', role: { es: 'Balanceador + WAF', en: 'Load balancer + WAF' }, svc: { onprem: 'HAProxy + Coraza WAF', aws: 'ALB + AWS WAF', azure: 'Front Door Private Link', gcp: 'Cloud LB + Cloud Armor' } },
      { id: 'idp', x: 520, y: 60, kind: 'security', role: { es: 'Identidad (OIDC)', en: 'Identity (OIDC)' }, svc: { onprem: 'Keycloak', aws: 'Amazon Cognito', azure: 'Entra External ID', gcp: 'Identity Platform' } },
      { id: 'api', x: 520, y: 300, kind: 'compute', role: { es: 'API en contenedores', en: 'Containerised API' }, svc: compute },
      { id: 'cache', x: 770, y: 180, kind: 'data', role: { es: 'Caché / sesiones', en: 'Cache / sessions' }, svc: { onprem: 'Valkey (Redis)', aws: 'ElastiCache', azure: 'Azure Managed Redis', gcp: 'Memorystore' } },
      { id: 'db', x: 770, y: 300, kind: 'data', role: { es: 'Base de datos relacional', en: 'Relational database' }, svc: postgres },
      { id: 'secrets', x: 770, y: 420, kind: 'security', role: { es: 'Secretos', en: 'Secrets' }, svc: { onprem: 'OpenBao / Vault', aws: 'Secrets Manager', azure: 'Key Vault', gcp: 'Secret Manager' } },
    ],
    edges: [
      { from: 'client', to: 'cdn', label: { es: 'estáticos', en: 'static' } },
      { from: 'client', to: 'lb', label: { es: '/api', en: '/api' } },
      { from: 'lb', to: 'api' },
      { from: 'api', to: 'idp', label: { es: 'valida JWT', en: 'validates JWT' }, dashed: true },
      { from: 'api', to: 'cache' },
      { from: 'api', to: 'db' },
      { from: 'api', to: 'secrets', dashed: true },
    ],
  },

  'background-jobs': {
    height: 506,
    nodes: [
      { id: 'api', x: 20, y: 160, kind: 'compute', role: { es: 'API (productor)', en: 'API (producer)' }, svc: compute },
      { id: 'cron', x: 20, y: 340, kind: 'compute', role: { es: 'Planificador (cron)', en: 'Scheduler (cron)' }, svc: { onprem: { es: 'CronJob de Kubernetes', en: 'Kubernetes CronJob' }, aws: 'EventBridge Scheduler', azure: 'Container Apps Jobs', gcp: 'Cloud Scheduler' } },
      { id: 'queue', x: 270, y: 250, kind: 'queue', role: { es: 'Cola de trabajos', en: 'Job queue' }, svc: { onprem: 'RabbitMQ', aws: 'Amazon SQS', azure: { es: 'Service Bus (colas)', en: 'Service Bus (queues)' }, gcp: 'Pub/Sub' } },
      { id: 'dlq', x: 270, y: 420, kind: 'queue', role: { es: 'Cola de mensajes fallidos', en: 'Dead-letter queue' }, svc: { onprem: 'RabbitMQ DLX', aws: 'SQS DLQ', azure: 'Service Bus DLQ', gcp: 'Pub/Sub dead-letter' } },
      { id: 'workers', x: 520, y: 250, kind: 'compute', role: { es: 'Workers autoescalados', en: 'Autoscaled workers' }, svc: { onprem: 'Kubernetes + KEDA', aws: 'ECS Fargate / Lambda', azure: 'Container Apps (KEDA)', gcp: 'Cloud Run (push)' } },
      { id: 'objects', x: 770, y: 140, kind: 'data', role: { es: 'Resultados (objetos)', en: 'Results (objects)' }, svc: objects },
      { id: 'db', x: 770, y: 360, kind: 'data', role: { es: 'Estado de los trabajos', en: 'Job status' }, svc: postgres },
    ],
    edges: [
      { from: 'api', to: 'queue', label: { es: 'encola', en: 'enqueue' } },
      { from: 'cron', to: 'queue' },
      { from: 'queue', to: 'workers' },
      { from: 'queue', to: 'dlq', label: { es: 'tras N reintentos', en: 'after N retries' }, dashed: true },
      { from: 'workers', to: 'objects' },
      { from: 'workers', to: 'db' },
    ],
  },

  'event-driven': {
    height: 486,
    nodes: [
      { id: 'orders', x: 20, y: 100, kind: 'compute', role: { es: 'Servicio de pedidos', en: 'Orders service' }, svc: compute },
      { id: 'ordersdb', x: 20, y: 300, kind: 'data', role: { es: 'BBDD + tabla outbox', en: 'DB + outbox table' }, svc: postgres },
      { id: 'bus', x: 270, y: 200, kind: 'queue', role: { es: 'Bus de eventos', en: 'Event bus' }, svc: { onprem: 'Apache Kafka', aws: 'Amazon EventBridge', azure: 'Service Bus (topics)', gcp: 'Pub/Sub' } },
      { id: 'billing', x: 520, y: 60, kind: 'compute', role: { es: 'Consumidor: facturación', en: 'Consumer: billing' }, svc: functions },
      { id: 'notify', x: 520, y: 200, kind: 'compute', role: { es: 'Consumidor: avisos', en: 'Consumer: notifications' }, svc: functions },
      { id: 'analytics', x: 520, y: 340, kind: 'compute', role: { es: 'Consumidor: analítica', en: 'Consumer: analytics' }, svc: { onprem: 'Kafka Connect', aws: 'Data Firehose', azure: 'Azure Functions', gcp: 'BigQuery subscription' } },
      { id: 'email', x: 770, y: 200, kind: 'edge', role: { es: 'Envío de email', en: 'Email delivery' }, svc: { onprem: 'Postfix (SMTP)', aws: 'Amazon SES', azure: 'Communication Services', gcp: 'SendGrid (Marketplace)' } },
      { id: 'dwh', x: 770, y: 340, kind: 'data', role: { es: 'Almacén analítico', en: 'Analytics warehouse' }, svc: { onprem: 'ClickHouse', aws: 'S3 + Athena', azure: 'Microsoft Fabric', gcp: 'BigQuery' } },
    ],
    edges: [
      { from: 'orders', to: 'ordersdb', label: { es: 'misma transacción', en: 'same transaction' } },
      { from: 'ordersdb', to: 'bus', label: { es: 'relay outbox', en: 'outbox relay' } },
      { from: 'bus', to: 'billing' },
      { from: 'bus', to: 'notify' },
      { from: 'bus', to: 'analytics' },
      { from: 'notify', to: 'email' },
      { from: 'analytics', to: 'dwh' },
    ],
  },

  'file-processing': {
    height: 506,
    nodes: [
      { id: 'client', x: 20, y: 180, kind: 'client', role: { es: 'Cliente', en: 'Client' }, svc: same({ es: 'Navegador · app', en: 'Browser · app' }) },
      { id: 'api', x: 270, y: 40, kind: 'compute', role: { es: 'API: emite URL firmada', en: 'API: issues signed URL' }, svc: compute },
      { id: 'objects', x: 270, y: 300, kind: 'data', role: { es: 'Almacenamiento de objetos', en: 'Object storage' }, svc: { onprem: 'Ceph RGW (presigned)', aws: 'S3 (presigned URL)', azure: 'Blob Storage (SAS)', gcp: 'Cloud Storage (signed)' } },
      { id: 'event', x: 520, y: 300, kind: 'queue', role: { es: 'Evento «fichero limpio»', en: '"File clean" event' }, svc: { onprem: 'RabbitMQ', aws: 'Amazon EventBridge', azure: 'Event Grid', gcp: 'Eventarc' } },
      { id: 'scan', x: 520, y: 420, kind: 'security', role: { es: 'Antimalware', en: 'Malware scanning' }, svc: { onprem: 'ClamAV', aws: 'GuardDuty (S3)', azure: 'Defender for Storage', gcp: { es: 'ClamAV en Cloud Run', en: 'ClamAV on Cloud Run' } } },
      { id: 'proc', x: 770, y: 300, kind: 'compute', role: { es: 'Procesador', en: 'Processor' }, svc: functions },
      { id: 'ocr', x: 770, y: 420, kind: 'ai', role: { es: 'OCR / extracción', en: 'OCR / extraction' }, svc: { onprem: 'PaddleOCR / Tesseract', aws: 'Amazon Textract', azure: 'Document Intelligence', gcp: 'Document AI' } },
      { id: 'db', x: 770, y: 160, kind: 'data', role: { es: 'Resultados', en: 'Results' }, svc: postgres },
    ],
    edges: [
      { from: 'client', to: 'api', label: { es: '1 · pide URL', en: '1 · asks for URL' } },
      { from: 'client', to: 'objects', label: { es: '2 · sube directo', en: '2 · direct upload' } },
      { from: 'objects', to: 'scan', label: { es: '3 · escaneo', en: '3 · scan' } },
      { from: 'scan', to: 'event', label: { es: '4 · limpio', en: '4 · clean' } },
      { from: 'event', to: 'proc', label: { es: '5', en: '5' } },
      { from: 'proc', to: 'ocr' },
      { from: 'proc', to: 'db' },
    ],
  },

  'ai-rag': {
    height: 506,
    nodes: [
      { id: 'client', x: 20, y: 180, kind: 'client', role: { es: 'Usuario', en: 'User' }, svc: same('Chat · app') },
      { id: 'api', x: 270, y: 180, kind: 'compute', role: { es: 'Backend / orquestador', en: 'Backend / orchestrator' }, svc: compute },
      { id: 'guard', x: 520, y: 40, kind: 'security', role: { es: 'Guardrails', en: 'Guardrails' }, svc: { onprem: 'NeMo Guardrails', aws: 'Bedrock Guardrails', azure: 'AI Content Safety', gcp: 'Model Armor' } },
      { id: 'llm', x: 520, y: 180, kind: 'ai', role: { es: 'LLM', en: 'LLM' }, svc: { onprem: { es: 'vLLM + modelo abierto', en: 'vLLM + open model' }, aws: 'Amazon Bedrock', azure: 'Microsoft Foundry', gcp: 'Agent Platform (Vertex)' } },
      { id: 'vector', x: 520, y: 320, kind: 'data', role: { es: 'Búsqueda vectorial', en: 'Vector search' }, svc: { onprem: 'PostgreSQL + pgvector', aws: 'Aurora + pgvector', azure: 'Azure AI Search', gcp: 'Vector Search (Vertex)' } },
      { id: 'docs', x: 20, y: 420, kind: 'data', role: { es: 'Documentos fuente', en: 'Source documents' }, svc: objects },
      { id: 'ingest', x: 270, y: 420, kind: 'compute', role: { es: 'Ingesta + embeddings', en: 'Ingestion + embeddings' }, svc: { onprem: { es: 'Jobs en Kubernetes', en: 'Kubernetes jobs' }, aws: 'AWS Lambda', azure: 'Azure Functions', gcp: 'Cloud Run jobs' } },
      { id: 'traces', x: 770, y: 180, kind: 'edge', role: { es: 'Trazas y evaluación', en: 'Tracing & evaluation' }, svc: { onprem: 'Langfuse', aws: 'CloudWatch', azure: 'Application Insights', gcp: 'Cloud Trace' } },
    ],
    edges: [
      { from: 'client', to: 'api' },
      { from: 'api', to: 'guard', label: { es: 'entrada / salida', en: 'input / output' } },
      { from: 'api', to: 'llm' },
      { from: 'api', to: 'vector', label: { es: 'top-k', en: 'top-k' } },
      { from: 'docs', to: 'ingest' },
      { from: 'ingest', to: 'vector', label: { es: 'embeddings', en: 'embeddings' } },
      { from: 'llm', to: 'traces', dashed: true },
    ],
  },

  'zero-trust-access': {
    height: 486,
    nodes: [
      { id: 'user', x: 20, y: 200, kind: 'client', role: { es: 'Usuario + dispositivo', en: 'User + device' }, svc: same({ es: 'Portátil · móvil', en: 'Laptop · mobile' }) },
      { id: 'idp', x: 270, y: 60, kind: 'security', role: { es: 'Identidad + MFA', en: 'Identity + MFA' }, svc: { onprem: 'Keycloak', aws: 'IAM Identity Center', azure: 'Microsoft Entra ID', gcp: 'Cloud Identity' } },
      { id: 'posture', x: 270, y: 340, kind: 'security', role: { es: 'Postura del dispositivo', en: 'Device posture' }, svc: { onprem: 'osquery / Wazuh', aws: 'Jamf / CrowdStrike', azure: 'Microsoft Intune', gcp: 'Endpoint Verification' } },
      { id: 'broker', x: 520, y: 200, kind: 'edge', role: { es: 'Decisión + proxy de acceso', en: 'Policy decision + proxy' }, svc: { onprem: 'SDP: controlador + SPA', aws: 'AWS Verified Access', azure: 'Entra Private Access', gcp: 'Identity-Aware Proxy' } },
      { id: 'app', x: 770, y: 200, kind: 'compute', role: { es: 'Aplicación interna', en: 'Internal application' }, svc: { onprem: { es: 'Red privada', en: 'Private network' }, aws: { es: 'VPC privada', en: 'Private VPC' }, azure: { es: 'VNet privada', en: 'Private VNet' }, gcp: { es: 'VPC privada', en: 'Private VPC' } } },
      { id: 'siem', x: 770, y: 380, kind: 'data', role: { es: 'Registro / SIEM', en: 'Logging / SIEM' }, svc: { onprem: 'Wazuh', aws: 'Security Lake + SIEM', azure: 'Microsoft Sentinel', gcp: 'Google SecOps' } },
    ],
    edges: [
      { from: 'user', to: 'idp', label: { es: '1 · login', en: '1 · sign-in' } },
      { from: 'user', to: 'posture', dashed: true },
      { from: 'user', to: 'broker', label: { es: '2 · petición', en: '2 · request' } },
      { from: 'idp', to: 'broker', label: { es: 'identidad', en: 'identity' } },
      { from: 'posture', to: 'broker', label: { es: 'postura', en: 'posture' } },
      { from: 'broker', to: 'app', label: { es: '3', en: '3' } },
      { from: 'broker', to: 'siem', dashed: true },
    ],
  },

  'serverless-api': {
    height: 406,
    nodes: [
      { id: 'client', x: 20, y: 180, kind: 'client', role: { es: 'Cliente', en: 'Client' }, svc: same({ es: 'App · móvil', en: 'App · mobile' }) },
      { id: 'authz', x: 270, y: 40, kind: 'security', role: { es: 'Autorizador JWT', en: 'JWT authorizer' }, svc: { onprem: 'Keycloak', aws: 'Cognito / JWT authorizer', azure: 'Entra ID (validate-jwt)', gcp: 'Identity Platform' } },
      { id: 'gw', x: 270, y: 180, kind: 'edge', role: { es: 'API gateway', en: 'API gateway' }, svc: { onprem: 'Istio + Knative', aws: 'API Gateway HTTP API', azure: 'API Management', gcp: 'API Gateway' } },
      { id: 'fn', x: 520, y: 180, kind: 'compute', role: { es: 'Función', en: 'Function' }, svc: { onprem: 'Knative Service', aws: 'AWS Lambda', azure: 'Functions (Flex)', gcp: 'Cloud Run functions' } },
      { id: 'obs', x: 520, y: 320, kind: 'edge', role: { es: 'Trazas y logs', en: 'Traces & logs' }, svc: { onprem: 'OTel + Grafana', aws: 'X-Ray + CloudWatch', azure: 'Application Insights', gcp: 'Cloud Trace + Logging' } },
      { id: 'db', x: 770, y: 180, kind: 'data', role: { es: 'Base de datos', en: 'Database' }, svc: { onprem: 'PostgreSQL (CNPG)', aws: 'DynamoDB on-demand', azure: 'Cosmos DB serverless', gcp: 'Firestore' } },
      { id: 'kms', x: 770, y: 320, kind: 'security', role: { es: 'Clave de cifrado', en: 'Encryption key' }, svc: { onprem: 'OpenBao transit', aws: 'AWS KMS', azure: 'Key Vault keys', gcp: 'Cloud KMS' } },
    ],
    edges: [
      { from: 'client', to: 'gw' },
      { from: 'gw', to: 'authz', label: { es: 'valida token', en: 'validates token' }, dashed: true },
      { from: 'gw', to: 'fn' },
      { from: 'fn', to: 'db' },
      { from: 'fn', to: 'obs', dashed: true },
      { from: 'db', to: 'kms', label: { es: 'cifra', en: 'encrypts' }, dashed: true },
    ],
  },

  'microservices-k8s': {
    height: 466,
    nodes: [
      { id: 'client', x: 20, y: 140, kind: 'client', role: { es: 'Cliente', en: 'Client' }, svc: same({ es: 'Web · móvil · B2B', en: 'Web · mobile · B2B' }) },
      { id: 'ingress', x: 270, y: 140, kind: 'edge', role: { es: 'Gateway de entrada', en: 'Ingress gateway' }, svc: { onprem: 'Envoy Gateway', aws: 'ALB (LB Controller)', azure: 'AppGw for Containers', gcp: 'GKE Gateway' } },
      { id: 'svca', x: 520, y: 60, kind: 'compute', role: { es: 'Servicio: pedidos', en: 'Service: orders' }, svc: same('Deployment + HPA') },
      { id: 'svcb', x: 520, y: 220, kind: 'compute', role: { es: 'Servicio: pagos', en: 'Service: payments' }, svc: same('Deployment + HPA') },
      { id: 'db', x: 770, y: 60, kind: 'data', role: { es: 'BBDD por servicio', en: 'Database per service' }, svc: postgres },
      { id: 'secrets', x: 770, y: 220, kind: 'security', role: { es: 'Secretos', en: 'Secrets' }, svc: { onprem: 'ESO + OpenBao', aws: 'ESO + Secrets Manager', azure: 'Key Vault (CSI)', gcp: 'Secret Manager (CSI)' } },
      { id: 'gitops', x: 20, y: 380, kind: 'edge', role: { es: 'GitOps', en: 'GitOps' }, svc: { onprem: 'Argo CD', aws: 'Argo CD', azure: 'Flux (AKS GitOps)', gcp: 'Config Sync' } },
      { id: 'registry', x: 270, y: 380, kind: 'data', role: { es: 'Registro de imágenes', en: 'Image registry' }, svc: { onprem: 'Harbor', aws: 'Amazon ECR', azure: 'Container Registry', gcp: 'Artifact Registry' } },
      { id: 'mesh', x: 520, y: 380, kind: 'security', role: { es: 'Service mesh (mTLS)', en: 'Service mesh (mTLS)' }, svc: { onprem: 'Istio / Linkerd', aws: 'Istio (ambient)', azure: 'Istio add-on (AKS)', gcp: 'Cloud Service Mesh' } },
      { id: 'cluster', x: 770, y: 380, kind: 'compute', role: { es: 'Clúster', en: 'Cluster' }, svc: { onprem: 'RKE2 + Cluster API', aws: 'Amazon EKS', azure: 'AKS', gcp: 'GKE Autopilot' } },
    ],
    edges: [
      { from: 'client', to: 'ingress' },
      { from: 'ingress', to: 'svca' },
      { from: 'ingress', to: 'svcb' },
      { from: 'svca', to: 'svcb', label: { es: 'mTLS', en: 'mTLS' } },
      { from: 'svca', to: 'db' },
      { from: 'svcb', to: 'db' },
      { from: 'svcb', to: 'secrets', dashed: true },
    ],
  },

  'multi-tenant-saas': {
    height: 466,
    nodes: [
      { id: 'client', x: 20, y: 180, kind: 'client', role: { es: 'Usuarios de cada tenant', en: 'Users of each tenant' }, svc: same('acme.app · beta.app') },
      { id: 'idp', x: 270, y: 40, kind: 'security', role: { es: 'Identidad por organización', en: 'Identity per organisation' }, svc: { onprem: 'Keycloak (organizations)', aws: 'Amazon Cognito', azure: 'Entra External ID', gcp: 'Identity Platform' } },
      { id: 'edge', x: 270, y: 180, kind: 'edge', role: { es: 'Dominios + WAF', en: 'Domains + WAF' }, svc: { onprem: 'Traefik + Coraza', aws: 'CloudFront + WAF', azure: 'Front Door + WAF', gcp: 'Cloud LB + Cloud Armor' } },
      { id: 'api', x: 520, y: 180, kind: 'compute', role: { es: 'API con contexto de tenant', en: 'Tenant-aware API' }, svc: compute },
      { id: 'keys', x: 520, y: 340, kind: 'security', role: { es: 'Clave por tenant', en: 'Key per tenant' }, svc: { onprem: 'OpenBao transit', aws: 'AWS KMS', azure: 'Key Vault', gcp: 'Cloud KMS' } },
      { id: 'pool', x: 770, y: 100, kind: 'data', role: { es: 'BBDD compartida + RLS', en: 'Shared DB + RLS' }, svc: postgres },
      { id: 'silo', x: 770, y: 240, kind: 'data', role: { es: 'Silo dedicado', en: 'Dedicated silo' }, svc: { onprem: { es: 'Namespace + BBDD propia', en: 'Namespace + own DB' }, aws: { es: 'Cuenta AWS dedicada', en: 'Dedicated AWS account' }, azure: { es: 'Suscripción dedicada', en: 'Dedicated subscription' }, gcp: { es: 'Proyecto dedicado', en: 'Dedicated project' } } },
      { id: 'usage', x: 770, y: 380, kind: 'queue', role: { es: 'Medición de uso', en: 'Usage metering' }, svc: { onprem: 'Apache Kafka', aws: 'Kinesis Data Streams', azure: 'Event Hubs', gcp: 'Pub/Sub' } },
    ],
    edges: [
      { from: 'client', to: 'idp', label: { es: 'login', en: 'sign-in' } },
      { from: 'client', to: 'edge' },
      { from: 'edge', to: 'api' },
      { from: 'api', to: 'pool', label: { es: 'tenant_id', en: 'tenant_id' } },
      { from: 'api', to: 'silo', dashed: true },
      { from: 'api', to: 'keys' },
      { from: 'api', to: 'usage', dashed: true },
    ],
  },

  'workflow-orchestration': {
    height: 446,
    nodes: [
      { id: 'trigger', x: 20, y: 180, kind: 'client', role: { es: 'Inicio', en: 'Start' }, svc: same({ es: 'API · evento', en: 'API · event' }) },
      { id: 'orch', x: 270, y: 180, kind: 'queue', role: { es: 'Orquestador durable', en: 'Durable orchestrator' }, svc: { onprem: 'Temporal', aws: 'Step Functions', azure: 'Durable Functions', gcp: 'Workflows' } },
      { id: 'human', x: 270, y: 360, kind: 'client', role: { es: 'Aprobación humana', en: 'Human approval' }, svc: { onprem: 'Temporal signal', aws: 'Task token', azure: 'External event', gcp: 'Workflows callback' } },
      { id: 's1', x: 520, y: 40, kind: 'compute', role: { es: 'Paso: reservar stock', en: 'Step: reserve stock' }, svc: functions },
      { id: 's2', x: 520, y: 180, kind: 'compute', role: { es: 'Paso: cobrar', en: 'Step: charge' }, svc: functions },
      { id: 's3', x: 520, y: 320, kind: 'compute', role: { es: 'Paso: enviar', en: 'Step: ship' }, svc: functions },
      { id: 'comp', x: 270, y: 40, kind: 'compute', role: { es: 'Compensaciones (saga)', en: 'Compensations (saga)' }, svc: functions },
    ],
    edges: [
      { from: 'trigger', to: 'orch' },
      { from: 'orch', to: 's1', label: { es: '1', en: '1' } },
      { from: 'orch', to: 's2', label: { es: '2', en: '2' } },
      { from: 'orch', to: 's3', label: { es: '3', en: '3' } },
      { from: 'orch', to: 'human', label: { es: 'espera', en: 'waits' }, dashed: true },
      { from: 'orch', to: 'comp', label: { es: 'si un paso falla', en: 'if a step fails' }, dashed: true },
    ],
  },

  'webhooks-integrations': {
    height: 406,
    nodes: [
      { id: 'ext', x: 20, y: 180, kind: 'client', role: { es: 'Proveedor externo', en: 'External provider' }, svc: same({ es: 'Pagos · Git · ERP', en: 'Payments · Git · ERP' }) },
      { id: 'hmac', x: 20, y: 320, kind: 'security', role: { es: 'Secreto de firma', en: 'Signing secret' }, svc: { onprem: 'OpenBao / Vault', aws: 'Secrets Manager', azure: 'Key Vault', gcp: 'Secret Manager' } },
      { id: 'inbox', x: 270, y: 40, kind: 'data', role: { es: 'Inbox de eventos crudos', en: 'Raw event inbox' }, svc: { onprem: 'PostgreSQL (inbox)', aws: 'Amazon DynamoDB', azure: 'Cosmos DB', gcp: 'Firestore' } },
      { id: 'recv', x: 270, y: 180, kind: 'compute', role: { es: 'Receptor de webhooks', en: 'Webhook receiver' }, svc: { onprem: { es: 'API en Kubernetes', en: 'API on Kubernetes' }, aws: 'API Gateway + Lambda', azure: 'Azure Functions', gcp: 'Cloud Run' } },
      { id: 'queue', x: 520, y: 180, kind: 'queue', role: { es: 'Cola', en: 'Queue' }, svc: { onprem: 'RabbitMQ', aws: 'Amazon SQS', azure: 'Service Bus', gcp: 'Pub/Sub' } },
      { id: 'dlq', x: 520, y: 320, kind: 'queue', role: { es: 'Mensajes fallidos', en: 'Dead letters' }, svc: { onprem: 'RabbitMQ DLX', aws: 'SQS DLQ', azure: 'Service Bus DLQ', gcp: 'Pub/Sub dead-letter' } },
      { id: 'worker', x: 770, y: 180, kind: 'compute', role: { es: 'Procesador idempotente', en: 'Idempotent processor' }, svc: functions },
      { id: 'out', x: 770, y: 40, kind: 'client', role: { es: 'API de terceros', en: 'Third-party API' }, svc: same({ es: 'Llamadas salientes', en: 'Outbound calls' }) },
    ],
    edges: [
      { from: 'ext', to: 'recv', label: { es: 'firma HMAC', en: 'HMAC signature' } },
      { from: 'hmac', to: 'recv', dashed: true },
      { from: 'recv', to: 'inbox', label: { es: 'guarda y 2xx', en: 'store, 2xx' } },
      { from: 'recv', to: 'queue' },
      { from: 'queue', to: 'worker' },
      { from: 'queue', to: 'dlq', dashed: true },
      { from: 'worker', to: 'out', label: { es: 'timeout + reintentos', en: 'timeout + retries' } },
    ],
  },

  'data-lakehouse': {
    height: 486,
    nodes: [
      { id: 'src', x: 20, y: 100, kind: 'client', role: { es: 'Fuentes', en: 'Sources' }, svc: same({ es: 'BBDD · APIs · ficheros', en: 'DBs · APIs · files' }) },
      { id: 'ingest', x: 270, y: 100, kind: 'queue', role: { es: 'Ingesta / CDC', en: 'Ingestion / CDC' }, svc: { onprem: 'Airbyte / Debezium', aws: 'AWS Glue / DMS', azure: 'Data Factory', gcp: 'Datastream' } },
      { id: 'catalog', x: 270, y: 260, kind: 'security', role: { es: 'Catálogo y permisos', en: 'Catalogue & access' }, svc: { onprem: 'Lakekeeper / Polaris', aws: 'Lake Formation', azure: 'Microsoft Purview', gcp: 'Knowledge Catalog' } },
      { id: 'orch', x: 270, y: 400, kind: 'compute', role: { es: 'Orquestación', en: 'Orchestration' }, svc: { onprem: 'Airflow / Dagster', aws: 'Amazon MWAA', azure: 'Fabric Data Factory', gcp: 'Cloud Composer' } },
      { id: 'lake', x: 520, y: 100, kind: 'data', role: { es: 'Data lake (Iceberg)', en: 'Data lake (Iceberg)' }, svc: { onprem: 'Ceph RGW + Iceberg', aws: 'S3 Tables (Iceberg)', azure: 'OneLake / ADLS Gen2', gcp: 'GCS + Lakehouse' } },
      { id: 'transform', x: 520, y: 260, kind: 'compute', role: { es: 'Transformación', en: 'Transformation' }, svc: { onprem: 'Spark + dbt', aws: 'Glue Spark + dbt', azure: 'Fabric Spark + dbt', gcp: 'Dataproc + dbt' } },
      { id: 'query', x: 770, y: 100, kind: 'data', role: { es: 'Motor SQL', en: 'SQL engine' }, svc: { onprem: 'Trino / DuckDB', aws: 'Amazon Athena', azure: 'Fabric Warehouse', gcp: 'BigQuery' } },
      { id: 'bi', x: 770, y: 260, kind: 'client', role: { es: 'BI', en: 'BI' }, svc: { onprem: 'Apache Superset', aws: 'Amazon Quick Sight', azure: 'Power BI', gcp: 'Looker' } },
    ],
    edges: [
      { from: 'src', to: 'ingest' },
      { from: 'ingest', to: 'lake', label: { es: 'bronce', en: 'bronze' } },
      { from: 'lake', to: 'transform', label: { es: 'plata → oro', en: 'silver → gold' } },
      { from: 'catalog', to: 'lake', dashed: true },
      { from: 'orch', to: 'transform', dashed: true },
      { from: 'lake', to: 'query' },
      { from: 'query', to: 'bi' },
    ],
  },

  'iot-telemetry': {
    height: 406,
    nodes: [
      { id: 'device', x: 20, y: 180, kind: 'client', role: { es: 'Dispositivo / gateway', en: 'Device / gateway' }, svc: same('Raspberry Pi · PLC') },
      { id: 'registry', x: 270, y: 40, kind: 'security', role: { es: 'Registro y estado deseado', en: 'Registry & desired state' }, svc: { onprem: 'EMQX + PostgreSQL', aws: 'IoT Core shadows', azure: 'IoT Hub device twins', gcp: { es: 'Firestore (twin propio)', en: 'Firestore (own twin)' } } },
      { id: 'broker', x: 270, y: 180, kind: 'edge', role: { es: 'Broker MQTT (X.509)', en: 'MQTT broker (X.509)' }, svc: { onprem: 'EMQX / Mosquitto', aws: 'AWS IoT Core', azure: 'Azure IoT Hub', gcp: { es: 'EMQX en GKE', en: 'EMQX on GKE' } } },
      { id: 'files', x: 270, y: 320, kind: 'data', role: { es: 'Ficheros del dispositivo', en: 'Device files' }, svc: { onprem: 'Ceph RGW', aws: 'S3 (role alias)', azure: 'Blob Storage (SAS)', gcp: 'Cloud Storage' } },
      { id: 'stream', x: 520, y: 180, kind: 'queue', role: { es: 'Stream', en: 'Stream' }, svc: { onprem: 'Apache Kafka', aws: 'Kinesis Data Streams', azure: 'Event Hubs', gcp: 'Pub/Sub' } },
      { id: 'ingest', x: 770, y: 180, kind: 'compute', role: { es: 'Ingesta idempotente', en: 'Idempotent ingestion' }, svc: functions },
      { id: 'tsdb', x: 770, y: 320, kind: 'data', role: { es: 'Series temporales', en: 'Time series' }, svc: { onprem: 'TimescaleDB', aws: 'Timestream (InfluxDB)', azure: 'Azure Data Explorer', gcp: 'Bigtable' } },
    ],
    edges: [
      { from: 'device', to: 'broker', label: { es: 'MQTT + mTLS', en: 'MQTT + mTLS' } },
      { from: 'device', to: 'files', label: { es: 'credencial temporal', en: 'temporary credential' }, dashed: true },
      { from: 'broker', to: 'registry', label: { es: 'shadow', en: 'shadow' } },
      { from: 'broker', to: 'stream' },
      { from: 'stream', to: 'ingest' },
      { from: 'ingest', to: 'tsdb' },
    ],
  },

  'ml-serving': {
    height: 446,
    nodes: [
      { id: 'features', x: 270, y: 40, kind: 'data', role: { es: 'Feature store', en: 'Feature store' }, svc: { onprem: 'Feast', aws: 'SageMaker Feature Store', azure: 'Azure ML feature store', gcp: 'Agent Platform features' } },
      { id: 'data', x: 20, y: 180, kind: 'data', role: { es: 'Datos de entrenamiento', en: 'Training data' }, svc: objects },
      { id: 'train', x: 270, y: 180, kind: 'ai', role: { es: 'Entrenamiento (GPU)', en: 'Training (GPU)' }, svc: { onprem: 'Kubeflow + GPU', aws: 'SageMaker Pipelines', azure: 'Azure ML pipelines', gcp: 'Agent Platform Pipelines' } },
      { id: 'registry', x: 520, y: 180, kind: 'ai', role: { es: 'Registro de modelos', en: 'Model registry' }, svc: { onprem: 'MLflow', aws: 'SageMaker registry', azure: 'Azure ML registry', gcp: 'Agent Platform registry' } },
      { id: 'monitor', x: 520, y: 340, kind: 'edge', role: { es: 'Deriva y calidad', en: 'Drift & quality' }, svc: { onprem: 'Evidently', aws: 'SageMaker Model Monitor', azure: 'Azure ML monitoring', gcp: 'Model Monitoring' } },
      { id: 'online', x: 770, y: 100, kind: 'compute', role: { es: 'Endpoint en línea', en: 'Online endpoint' }, svc: { onprem: 'KServe', aws: 'SageMaker endpoint', azure: 'Azure ML endpoint', gcp: 'Agent Platform endpoint' } },
      { id: 'batch', x: 770, y: 240, kind: 'compute', role: { es: 'Inferencia por lotes', en: 'Batch inference' }, svc: { onprem: 'Jobs K8s + GPU', aws: 'AWS Batch (GPU)', azure: 'Azure ML batch', gcp: 'Agent Platform batch' } },
    ],
    edges: [
      { from: 'features', to: 'train', label: { es: 'features', en: 'features' } },
      { from: 'data', to: 'train' },
      { from: 'train', to: 'registry' },
      { from: 'registry', to: 'online', label: { es: 'promoción', en: 'promotion' } },
      { from: 'registry', to: 'batch' },
      { from: 'online', to: 'monitor', dashed: true },
      { from: 'monitor', to: 'train', label: { es: 'reentrena', en: 'retrain' }, dashed: true },
    ],
  },

  'iam-keyless-ci': {
    height: 466,
    nodes: [
      { id: 'people', x: 20, y: 60, kind: 'client', role: { es: 'Personas', en: 'People' }, svc: same({ es: 'Equipo · admins', en: 'Team · admins' }) },
      { id: 'idp', x: 270, y: 60, kind: 'security', role: { es: 'IdP + SSO', en: 'IdP + SSO' }, svc: { onprem: 'Keycloak', aws: 'IAM Identity Center', azure: 'Microsoft Entra ID', gcp: 'Cloud Identity' } },
      { id: 'jit', x: 520, y: 60, kind: 'security', role: { es: 'Acceso temporal', en: 'Just-in-time access' }, svc: { onprem: 'Grupos + RBAC', aws: 'Identity Center + TEAM', azure: 'Entra PIM', gcp: 'Privileged Access Mgr' } },
      { id: 'ci', x: 20, y: 220, kind: 'client', role: { es: 'CI/CD', en: 'CI/CD' }, svc: same('GitHub Actions') },
      { id: 'fed', x: 270, y: 220, kind: 'security', role: { es: 'Federación OIDC', en: 'OIDC federation' }, svc: { onprem: 'OpenBao JWT auth', aws: 'IAM OIDC provider', azure: 'Federated credentials', gcp: 'Workload Identity Fed.' } },
      { id: 'ciid', x: 520, y: 220, kind: 'security', role: { es: 'Identidades plan / apply', en: 'Plan / apply identities' }, svc: { onprem: { es: 'Políticas OpenBao', en: 'OpenBao policies' }, aws: 'IAM roles', azure: 'Managed identities', gcp: 'Service accounts' } },
      { id: 'workload', x: 20, y: 380, kind: 'compute', role: { es: 'Carga de trabajo', en: 'Workload' }, svc: same({ es: 'Pod · función · VM', en: 'Pod · function · VM' }) },
      { id: 'wid', x: 270, y: 380, kind: 'security', role: { es: 'Identidad de carga', en: 'Workload identity' }, svc: { onprem: 'SPIFFE / SPIRE', aws: 'EKS Pod Identity', azure: 'Workload Identity', gcp: 'GKE Workload Identity' } },
      { id: 'secrets', x: 520, y: 380, kind: 'security', role: { es: 'Secretos', en: 'Secrets' }, svc: { onprem: { es: 'OpenBao (dinámicos)', en: 'OpenBao (dynamic)' }, aws: 'Secrets Manager', azure: 'Key Vault', gcp: 'Secret Manager' } },
      { id: 'res', x: 770, y: 220, kind: 'data', role: { es: 'Recursos', en: 'Resources' }, svc: { onprem: 'Kubernetes / VMs', aws: { es: 'Cuentas AWS', en: 'AWS accounts' }, azure: { es: 'Suscripciones', en: 'Subscriptions' }, gcp: { es: 'Proyectos', en: 'Projects' } } },
      { id: 'audit', x: 770, y: 380, kind: 'data', role: { es: 'Auditoría', en: 'Audit' }, svc: { onprem: 'Wazuh', aws: 'AWS CloudTrail', azure: 'Activity Log', gcp: 'Cloud Audit Logs' } },
    ],
    edges: [
      { from: 'people', to: 'idp', label: { es: 'MFA', en: 'MFA' } },
      { from: 'idp', to: 'jit' },
      { from: 'jit', to: 'res' },
      { from: 'ci', to: 'fed', label: { es: 'token OIDC', en: 'OIDC token' } },
      { from: 'fed', to: 'ciid' },
      { from: 'ciid', to: 'res' },
      { from: 'workload', to: 'wid' },
      { from: 'wid', to: 'secrets' },
      { from: 'res', to: 'audit', dashed: true },
    ],
  },

  'landing-zone': {
    height: 426,
    nodes: [
      { id: 'root', x: 20, y: 200, kind: 'security', role: { es: 'Organización', en: 'Organisation' }, svc: { onprem: { es: 'Rancher + clústeres', en: 'Rancher + clusters' }, aws: 'AWS Organizations', azure: 'Management groups', gcp: 'Organization node' } },
      { id: 'guard', x: 270, y: 60, kind: 'security', role: { es: 'Guardarraíles', en: 'Guardrails' }, svc: { onprem: 'Kyverno / Gatekeeper', aws: 'SCPs + RCPs', azure: 'Azure Policy', gcp: 'Organization policies' } },
      { id: 'sec', x: 270, y: 200, kind: 'security', role: { es: 'Seguridad central', en: 'Central security' }, svc: { onprem: 'Wazuh', aws: 'GuardDuty + Security Hub', azure: 'Defender for Cloud', gcp: 'Security Command Center' } },
      { id: 'logs', x: 270, y: 340, kind: 'data', role: { es: 'Archivo de logs', en: 'Log archive' }, svc: { onprem: 'Loki / OpenSearch', aws: 'Org CloudTrail + S3', azure: 'Log Analytics', gcp: 'Org log sink' } },
      { id: 'prod', x: 520, y: 120, kind: 'compute', role: { es: 'Cargas: producción', en: 'Workloads: production' }, svc: { onprem: { es: 'Clúster prod', en: 'Prod cluster' }, aws: 'OU Workloads/Prod', azure: { es: 'Suscripciones prod', en: 'Prod subscriptions' }, gcp: 'Folder production' } },
      { id: 'nonprod', x: 520, y: 280, kind: 'compute', role: { es: 'Cargas: no producción', en: 'Workloads: non-prod' }, svc: { onprem: { es: 'Clúster no-prod', en: 'Non-prod cluster' }, aws: 'OU Workloads/NonProd', azure: { es: 'Suscripciones no-prod', en: 'Non-prod subscriptions' }, gcp: 'Folder non-production' } },
      { id: 'sso', x: 770, y: 120, kind: 'security', role: { es: 'Acceso de personas', en: 'Human access' }, svc: { onprem: 'Keycloak + RBAC', aws: 'IAM Identity Center', azure: 'Entra ID + PIM', gcp: 'Cloud Identity + IAM' } },
      { id: 'cost', x: 770, y: 280, kind: 'data', role: { es: 'Presupuestos y FinOps', en: 'Budgets & FinOps' }, svc: { onprem: 'OpenCost', aws: 'Budgets + CUR 2.0', azure: 'Cost Management', gcp: 'Billing budgets' } },
    ],
    edges: [
      { from: 'root', to: 'guard' },
      { from: 'root', to: 'sec' },
      { from: 'root', to: 'logs' },
      { from: 'guard', to: 'prod' },
      { from: 'guard', to: 'nonprod' },
      { from: 'prod', to: 'sso', dashed: true },
      { from: 'nonprod', to: 'cost', dashed: true },
    ],
  },

  'network-hub-spoke': {
    height: 426,
    nodes: [
      { id: 'site', x: 20, y: 180, kind: 'client', role: { es: 'Oficina / CPD', en: 'Office / data centre' }, svc: same('Router · VPN') },
      { id: 'dns', x: 270, y: 40, kind: 'edge', role: { es: 'DNS privado', en: 'Private DNS' }, svc: { onprem: 'PowerDNS', aws: 'Route 53 Resolver', azure: 'Private DNS Resolver', gcp: 'Cloud DNS' } },
      { id: 'hybrid', x: 270, y: 180, kind: 'edge', role: { es: 'Conectividad híbrida', en: 'Hybrid connectivity' }, svc: { onprem: 'IPsec / WireGuard', aws: 'Site-to-Site VPN / DX', azure: 'VPN Gw / ExpressRoute', gcp: 'Cloud VPN / Interconnect' } },
      { id: 'fw', x: 520, y: 40, kind: 'security', role: { es: 'Firewall central', en: 'Central firewall' }, svc: { onprem: 'OPNsense', aws: 'AWS Network Firewall', azure: 'Azure Firewall', gcp: 'Cloud NGFW' } },
      { id: 'hub', x: 520, y: 180, kind: 'edge', role: { es: 'Hub de tránsito', en: 'Transit hub' }, svc: { onprem: 'Core router + VRFs', aws: 'Transit Gateway', azure: 'Virtual WAN hub', gcp: 'Network Connectivity Ctr' } },
      { id: 'pe', x: 520, y: 330, kind: 'security', role: { es: 'Endpoints privados', en: 'Private endpoints' }, svc: { onprem: { es: 'Proxy interno', en: 'Internal proxy' }, aws: 'PrivateLink', azure: 'Private Endpoint', gcp: 'Private Service Connect' } },
      { id: 'spokea', x: 770, y: 100, kind: 'compute', role: { es: 'Spoke: producción', en: 'Spoke: production' }, svc: { onprem: 'VLAN prod', aws: 'VPC prod', azure: 'VNet prod', gcp: 'VPC prod' } },
      { id: 'spokeb', x: 770, y: 260, kind: 'compute', role: { es: 'Spoke: no producción', en: 'Spoke: non-prod' }, svc: { onprem: { es: 'VLAN no-prod', en: 'Non-prod VLAN' }, aws: { es: 'VPC no-prod', en: 'Non-prod VPC' }, azure: { es: 'VNet no-prod', en: 'Non-prod VNet' }, gcp: { es: 'VPC no-prod', en: 'Non-prod VPC' } } },
    ],
    edges: [
      { from: 'site', to: 'hybrid' },
      { from: 'hybrid', to: 'hub' },
      { from: 'hub', to: 'fw', label: { es: 'inspección', en: 'inspection' } },
      { from: 'dns', to: 'hub', dashed: true },
      { from: 'hub', to: 'spokea' },
      { from: 'hub', to: 'spokeb' },
      { from: 'hub', to: 'pe', dashed: true },
    ],
  },

  observability: {
    height: 486,
    nodes: [
      { id: 'apps', x: 20, y: 180, kind: 'compute', role: { es: 'Servicios', en: 'Services' }, svc: same('SDK OpenTelemetry') },
      { id: 'otel', x: 270, y: 180, kind: 'edge', role: { es: 'Colector OpenTelemetry', en: 'OpenTelemetry collector' }, svc: { onprem: 'OTel Collector / Alloy', aws: 'ADOT Collector', azure: 'OTel Collector', gcp: 'OTel Collector' } },
      { id: 'probe', x: 270, y: 400, kind: 'edge', role: { es: 'Sondas sintéticas', en: 'Synthetic probes' }, svc: { onprem: 'Blackbox exporter', aws: 'CloudWatch Synthetics', azure: 'Availability tests', gcp: 'Uptime checks' } },
      { id: 'metrics', x: 520, y: 60, kind: 'data', role: { es: 'Métricas', en: 'Metrics' }, svc: { onprem: 'Prometheus / Mimir', aws: 'Managed Prometheus', azure: 'Managed Prometheus', gcp: 'Managed Prometheus' } },
      { id: 'logs', x: 520, y: 180, kind: 'data', role: { es: 'Logs', en: 'Logs' }, svc: { onprem: 'Grafana Loki', aws: 'CloudWatch Logs', azure: 'Log Analytics', gcp: 'Cloud Logging' } },
      { id: 'traces', x: 520, y: 300, kind: 'data', role: { es: 'Trazas', en: 'Traces' }, svc: { onprem: 'Grafana Tempo', aws: 'AWS X-Ray', azure: 'Application Insights', gcp: 'Cloud Trace' } },
      { id: 'dash', x: 770, y: 120, kind: 'client', role: { es: 'Paneles', en: 'Dashboards' }, svc: { onprem: 'Grafana', aws: 'Managed Grafana', azure: 'Managed Grafana', gcp: 'Cloud Monitoring' } },
      { id: 'alerts', x: 770, y: 300, kind: 'security', role: { es: 'Alertas y guardias', en: 'Alerts & on-call' }, svc: { onprem: 'Alertmanager', aws: 'CloudWatch alarms', azure: 'Azure Monitor alerts', gcp: 'Alerting policies' } },
    ],
    edges: [
      { from: 'apps', to: 'otel', label: { es: 'OTLP', en: 'OTLP' } },
      { from: 'otel', to: 'metrics' },
      { from: 'otel', to: 'logs' },
      { from: 'otel', to: 'traces' },
      { from: 'metrics', to: 'dash' },
      { from: 'traces', to: 'alerts' },
      { from: 'probe', to: 'alerts', dashed: true },
    ],
  },

  'disaster-recovery': {
    height: 426,
    nodes: [
      { id: 'users', x: 20, y: 200, kind: 'client', role: { es: 'Usuarios', en: 'Users' }, svc: same('Web · API') },
      { id: 'dns', x: 270, y: 200, kind: 'edge', role: { es: 'DNS con failover', en: 'Failover DNS' }, svc: { onprem: 'PowerDNS + checks', aws: 'Route 53 ARC', azure: 'Front Door / Traffic Mgr', gcp: 'Cloud DNS failover' } },
      { id: 'pri', x: 520, y: 60, kind: 'compute', role: { es: 'Región primaria', en: 'Primary region' }, svc: compute },
      { id: 'vault', x: 520, y: 200, kind: 'security', role: { es: 'Copias inmutables', en: 'Immutable backups' }, svc: { onprem: 'restic + WORM', aws: 'Backup Vault Lock', azure: 'Immutable vault', gcp: 'Backup vault (DR)' } },
      { id: 'sec', x: 520, y: 340, kind: 'compute', role: { es: 'Región secundaria (warm)', en: 'Secondary region (warm)' }, svc: compute },
      { id: 'pdb', x: 770, y: 60, kind: 'data', role: { es: 'BBDD primaria', en: 'Primary database' }, svc: { onprem: { es: 'PostgreSQL primario', en: 'PostgreSQL primary' }, aws: 'Aurora Global (primary)', azure: { es: 'PG Flexible primario', en: 'PG Flexible primary' }, gcp: { es: 'Cloud SQL primaria', en: 'Cloud SQL primary' } } },
      { id: 'sdb', x: 770, y: 340, kind: 'data', role: { es: 'Réplica entre regiones', en: 'Cross-region replica' }, svc: { onprem: { es: 'Réplica streaming', en: 'Streaming replica' }, aws: 'Aurora Global replica', azure: { es: 'Réplica geo', en: 'Geo replica' }, gcp: { es: 'Réplica cross-region', en: 'Cross-region replica' } } },
    ],
    edges: [
      { from: 'users', to: 'dns' },
      { from: 'dns', to: 'pri' },
      { from: 'dns', to: 'sec', label: { es: 'failover', en: 'failover' }, dashed: true },
      { from: 'pri', to: 'pdb' },
      { from: 'sec', to: 'sdb' },
      { from: 'pdb', to: 'sdb', label: { es: 'replicación asíncrona', en: 'async replication' }, dashed: true },
      { from: 'pdb', to: 'vault', label: { es: 'snapshots', en: 'snapshots' } },
    ],
  },

  'airgapped-onprem': {
    height: 406,
    nodes: [
      { id: 'ci', x: 20, y: 180, kind: 'client', role: { es: 'CI: build + firma', en: 'CI: build + sign' }, svc: same('GitHub Actions') },
      { id: 'registry', x: 270, y: 180, kind: 'data', role: { es: 'Registro + SBOM', en: 'Registry + SBOM' }, svc: { onprem: 'Harbor', aws: 'Amazon ECR', azure: 'Container Registry', gcp: 'Artifact Registry' } },
      { id: 'bundle', x: 520, y: 180, kind: 'security', role: { es: 'Paquete offline firmado', en: 'Signed offline bundle' }, svc: same('images.tar + SHA256SUMS') },
      { id: 'transfer', x: 520, y: 40, kind: 'client', role: { es: 'Transferencia', en: 'Transfer' }, svc: same({ es: 'USB · diodo de datos', en: 'USB · data diode' }) },
      { id: 'host', x: 770, y: 180, kind: 'compute', role: { es: 'Entorno sin internet', en: 'Disconnected site' }, svc: { onprem: 'Docker Compose', aws: { es: 'Hardware del cliente', en: 'Customer hardware' }, azure: 'Azure Local', gcp: 'GDC air-gapped' } },
      { id: 'diag', x: 520, y: 320, kind: 'edge', role: { es: 'Diagnóstico local', en: 'Local diagnostics' }, svc: same('Grafana + Loki') },
      { id: 'backup', x: 770, y: 320, kind: 'data', role: { es: 'Copias cifradas', en: 'Encrypted backups' }, svc: same('pg_dump + restic') },
    ],
    edges: [
      { from: 'ci', to: 'registry' },
      { from: 'registry', to: 'bundle' },
      { from: 'bundle', to: 'transfer', dashed: true },
      { from: 'bundle', to: 'host', label: { es: 'carga', en: 'load' } },
      { from: 'host', to: 'backup' },
      { from: 'host', to: 'diag', dashed: true },
    ],
  },

  'cicd-supply-chain': {
    height: 426,
    nodes: [
      { id: 'pr', x: 20, y: 180, kind: 'client', role: { es: 'Pull request', en: 'Pull request' }, svc: same({ es: 'Rama protegida', en: 'Protected branch' }) },
      { id: 'scan', x: 270, y: 40, kind: 'security', role: { es: 'Escaneo de imágenes', en: 'Image scanning' }, svc: { onprem: 'Harbor + Trivy', aws: 'ECR + Inspector', azure: 'Defender for Containers', gcp: 'Artifact Analysis' } },
      { id: 'ci', x: 270, y: 180, kind: 'compute', role: { es: 'CI: tests + SBOM', en: 'CI: tests + SBOM' }, svc: same('GitHub Actions') },
      { id: 'oidc', x: 270, y: 330, kind: 'security', role: { es: 'Credenciales efímeras', en: 'Short-lived credentials' }, svc: { onprem: 'OpenBao JWT auth', aws: 'IAM OIDC provider', azure: 'Federated credentials', gcp: 'Workload Identity Fed.' } },
      { id: 'sign', x: 520, y: 40, kind: 'security', role: { es: 'Firma y procedencia', en: 'Signing & provenance' }, svc: { onprem: 'cosign + Rekor', aws: 'AWS Signer', azure: 'Notation + Key Vault', gcp: 'Binary Authorization' } },
      { id: 'registry', x: 520, y: 180, kind: 'data', role: { es: 'Registro de artefactos', en: 'Artifact registry' }, svc: { onprem: 'Harbor', aws: 'Amazon ECR', azure: 'Container Registry', gcp: 'Artifact Registry' } },
      { id: 'policy', x: 770, y: 40, kind: 'security', role: { es: 'Admisión: solo firmadas', en: 'Admission: signed only' }, svc: { onprem: 'Kyverno', aws: 'Kyverno (EKS)', azure: 'Ratify + Gatekeeper', gcp: 'Binary Authorization' } },
      { id: 'deploy', x: 770, y: 180, kind: 'compute', role: { es: 'Entorno de ejecución', en: 'Runtime' }, svc: { onprem: 'Kubernetes', aws: 'Amazon EKS', azure: 'AKS', gcp: 'GKE' } },
    ],
    edges: [
      { from: 'pr', to: 'ci' },
      { from: 'ci', to: 'scan' },
      { from: 'oidc', to: 'ci', label: { es: 'sin claves', en: 'no keys' } },
      { from: 'ci', to: 'registry' },
      { from: 'registry', to: 'sign' },
      { from: 'sign', to: 'policy' },
      { from: 'registry', to: 'deploy' },
      { from: 'policy', to: 'deploy', label: { es: 'verifica', en: 'verifies' } },
    ],
  },

  'static-site': {
    height: 426,
    nodes: [
      { id: 'client', x: 20, y: 180, kind: 'client', role: { es: 'Visitantes', en: 'Visitors' }, svc: { onprem: { es: 'Navegador', en: 'Browser' }, aws: { es: 'Navegador', en: 'Browser' }, azure: { es: 'Navegador', en: 'Browser' }, gcp: { es: 'Navegador', en: 'Browser' } } },
      { id: 'dns', x: 20, y: 330, kind: 'edge', role: { es: 'DNS + certificados', en: 'DNS + certificates' }, svc: { onprem: 'PowerDNS + ACME', aws: 'Route 53 + ACM', azure: 'Azure DNS + managed cert', gcp: 'Cloud DNS + Cert Manager' } },
      { id: 'edge', x: 270, y: 40, kind: 'compute', role: { es: 'Lógica en el borde', en: 'Edge logic' }, svc: { onprem: { es: 'Reglas del proxy', en: 'Proxy rules' }, aws: 'CloudFront Functions', azure: 'Front Door rules engine', gcp: 'Service Extensions' } },
      { id: 'cdn', x: 270, y: 180, kind: 'edge', role: { es: 'CDN + TLS', en: 'CDN + TLS' }, svc: { onprem: 'Caddy', aws: 'Amazon CloudFront', azure: 'Azure Front Door', gcp: 'Cloud CDN' } },
      { id: 'build', x: 520, y: 40, kind: 'client', role: { es: 'Build y publicación', en: 'Build & publish' }, svc: same('CI: Astro · Hugo · Next') },
      { id: 'origin', x: 520, y: 180, kind: 'data', role: { es: 'Ficheros estáticos', en: 'Static files' }, svc: { onprem: { es: 'Disco del servidor', en: 'Server disk' }, aws: 'S3 (OAC)', azure: 'Storage static website', gcp: 'Cloud Storage' } },
      { id: 'forms', x: 520, y: 330, kind: 'compute', role: { es: 'Formularios / API mínima', en: 'Forms / minimal API' }, svc: { onprem: { es: 'Contenedor pequeño', en: 'Small container' }, aws: 'AWS Lambda', azure: 'Azure Functions', gcp: 'Cloud Run functions' } },
      { id: 'allin', x: 770, y: 180, kind: 'edge', role: { es: 'Alternativa todo en uno', en: 'All-in-one alternative' }, svc: { onprem: 'Coolify', aws: 'Amplify Hosting', azure: 'Static Web Apps', gcp: 'Firebase Hosting' } },
    ],
    edges: [
      { from: 'client', to: 'cdn' },
      { from: 'dns', to: 'cdn', dashed: true },
      { from: 'cdn', to: 'edge', dashed: true },
      { from: 'build', to: 'origin', label: { es: 'publica', en: 'publishes' } },
      { from: 'cdn', to: 'origin' },
      { from: 'cdn', to: 'forms', label: { es: '/api', en: '/api' } },
    ],
  },

  realtime: {
    height: 426,
    nodes: [
      { id: 'clients', x: 20, y: 180, kind: 'client', role: { es: 'Clientes conectados', en: 'Connected clients' }, svc: same({ es: 'Web · móvil', en: 'Web · mobile' }) },
      { id: 'ws', x: 270, y: 180, kind: 'edge', role: { es: 'Conexiones WebSocket', en: 'WebSocket connections' }, svc: { onprem: 'Centrifugo / Socket.IO', aws: 'API Gateway WebSocket', azure: 'Azure Web PubSub', gcp: 'Cloud Run (WebSocket)' } },
      { id: 'push', x: 270, y: 330, kind: 'edge', role: { es: 'Push si está desconectado', en: 'Push when offline' }, svc: { onprem: 'Gorush (FCM / APNs)', aws: 'SNS mobile push', azure: 'Notification Hubs', gcp: 'Firebase Cloud Messaging' } },
      { id: 'backend', x: 520, y: 40, kind: 'compute', role: { es: 'Lógica de negocio', en: 'Business logic' }, svc: functions },
      { id: 'conn', x: 520, y: 180, kind: 'data', role: { es: 'Conexiones y presencia', en: 'Connections & presence' }, svc: { onprem: 'Valkey pub/sub', aws: 'DynamoDB', azure: { es: 'Gestionado (Web PubSub)', en: 'Managed (Web PubSub)' }, gcp: 'Memorystore (Valkey)' } },
      { id: 'state', x: 770, y: 40, kind: 'data', role: { es: 'Historial y estado', en: 'History & state' }, svc: { onprem: 'PostgreSQL', aws: 'Amazon DynamoDB', azure: 'Cosmos DB', gcp: 'Firestore' } },
      { id: 'events', x: 770, y: 180, kind: 'queue', role: { es: 'Eventos de dominio', en: 'Domain events' }, svc: { onprem: 'NATS', aws: 'Amazon EventBridge', azure: 'Event Grid', gcp: 'Pub/Sub' } },
    ],
    edges: [
      { from: 'clients', to: 'ws', label: { es: 'WebSocket', en: 'WebSocket' } },
      { from: 'ws', to: 'backend', label: { es: 'mensajes', en: 'messages' } },
      { from: 'ws', to: 'conn' },
      { from: 'backend', to: 'state' },
      { from: 'backend', to: 'events' },
      { from: 'events', to: 'conn', label: { es: 'difunde', en: 'fan-out' } },
      { from: 'backend', to: 'push', label: { es: 'sin conexión', en: 'offline' }, dashed: true },
    ],
  },

  'public-api-platform': {
    height: 426,
    nodes: [
      { id: 'consumers', x: 20, y: 180, kind: 'client', role: { es: 'Consumidores de la API', en: 'API consumers' }, svc: same({ es: 'Partners · apps', en: 'Partners · apps' }) },
      { id: 'portal', x: 20, y: 330, kind: 'client', role: { es: 'Portal de desarrolladores', en: 'Developer portal' }, svc: { onprem: 'Gravitee portal', aws: 'API Portal', azure: 'APIM developer portal', gcp: 'Apigee portal' } },
      { id: 'auth', x: 270, y: 40, kind: 'security', role: { es: 'OAuth 2.0 entre máquinas', en: 'Machine-to-machine OAuth' }, svc: { onprem: 'Keycloak', aws: 'Cognito (M2M)', azure: 'Microsoft Entra ID', gcp: 'Apigee OAuth' } },
      { id: 'gw', x: 270, y: 180, kind: 'edge', role: { es: 'Gateway con cuotas', en: 'Gateway with quotas' }, svc: { onprem: 'Gravitee / Kong', aws: 'API Gateway (REST)', azure: 'API Management', gcp: 'Apigee' } },
      { id: 'cache', x: 520, y: 40, kind: 'data', role: { es: 'Caché de respuestas', en: 'Response cache' }, svc: { onprem: 'Kong proxy cache', aws: 'API Gateway cache', azure: 'APIM cache', gcp: 'Apigee cache' } },
      { id: 'meter', x: 520, y: 330, kind: 'data', role: { es: 'Analítica y facturación', en: 'Analytics & billing' }, svc: { onprem: 'OpenMeter', aws: 'Usage plans + CloudWatch', azure: 'APIM analytics', gcp: 'Apigee monetization' } },
      { id: 'backend', x: 770, y: 180, kind: 'compute', role: { es: 'Servicios internos', en: 'Internal services' }, svc: compute },
    ],
    edges: [
      { from: 'consumers', to: 'gw', label: { es: 'token + clave', en: 'token + key' } },
      { from: 'portal', to: 'auth', label: { es: 'alta de apps', en: 'app sign-up' }, dashed: true },
      { from: 'gw', to: 'auth', dashed: true },
      { from: 'gw', to: 'cache' },
      { from: 'gw', to: 'backend' },
      { from: 'gw', to: 'meter', dashed: true },
    ],
  },

  'legacy-modernization': {
    height: 426,
    nodes: [
      { id: 'users', x: 20, y: 180, kind: 'client', role: { es: 'Usuarios', en: 'Users' }, svc: same({ es: 'Web · clientes', en: 'Web · clients' }) },
      { id: 'router', x: 270, y: 180, kind: 'edge', role: { es: 'Fachada (strangler fig)', en: 'Facade (strangler fig)' }, svc: { onprem: 'Nginx / Envoy', aws: 'ALB (path rules)', azure: 'Application Gateway', gcp: 'Cloud Load Balancing' } },
      { id: 'mono', x: 520, y: 60, kind: 'compute', role: { es: 'Monolito (lift & shift)', en: 'Monolith (lift & shift)' }, svc: { onprem: 'VMs (Proxmox / VMware)', aws: 'EC2 (Transform MGN)', azure: 'Azure VMs (Catalyst)', gcp: 'Compute Engine (M2VM)' } },
      { id: 'newsvc', x: 520, y: 300, kind: 'compute', role: { es: 'Servicios nuevos', en: 'New services' }, svc: compute },
      { id: 'olddb', x: 770, y: 60, kind: 'data', role: { es: 'BBDD heredada', en: 'Legacy database' }, svc: { onprem: 'SQL Server / Oracle', aws: 'RDS for SQL Server', azure: 'Azure SQL Managed Inst.', gcp: 'Cloud SQL (SQL Server)' } },
      { id: 'cdc', x: 770, y: 180, kind: 'queue', role: { es: 'Sincronización CDC', en: 'CDC sync' }, svc: { onprem: 'Debezium', aws: 'AWS DMS', azure: 'Debezium + Event Hubs', gcp: 'Database Migration Svc' } },
      { id: 'newdb', x: 770, y: 300, kind: 'data', role: { es: 'BBDD nueva', en: 'New database' }, svc: postgres },
    ],
    edges: [
      { from: 'users', to: 'router' },
      { from: 'router', to: 'mono', label: { es: 'rutas antiguas', en: 'legacy routes' } },
      { from: 'router', to: 'newsvc', label: { es: 'rutas migradas', en: 'migrated routes' } },
      { from: 'mono', to: 'olddb' },
      { from: 'newsvc', to: 'newdb' },
      { from: 'olddb', to: 'cdc' },
      { from: 'cdc', to: 'newdb' },
    ],
  },

  notifications: {
    height: 426,
    nodes: [
      { id: 'producers', x: 20, y: 180, kind: 'compute', role: { es: 'Servicios emisores', en: 'Sending services' }, svc: same({ es: 'Pedidos · cuentas · alertas', en: 'Orders · accounts · alerts' }) },
      { id: 'queue', x: 270, y: 180, kind: 'queue', role: { es: 'Cola de envíos', en: 'Send queue' }, svc: { onprem: 'RabbitMQ', aws: 'Amazon SQS', azure: 'Service Bus', gcp: 'Pub/Sub' } },
      { id: 'prefs', x: 520, y: 40, kind: 'data', role: { es: 'Preferencias y plantillas', en: 'Preferences & templates' }, svc: postgres },
      { id: 'dispatch', x: 520, y: 180, kind: 'compute', role: { es: 'Enrutador de canales', en: 'Channel router' }, svc: functions },
      { id: 'inapp', x: 520, y: 330, kind: 'client', role: { es: 'Avisos en la app', en: 'In-app notices' }, svc: same({ es: 'Tabla + SSE', en: 'Table + SSE' }) },
      { id: 'email', x: 770, y: 40, kind: 'edge', role: { es: 'Email', en: 'Email' }, svc: { onprem: 'Postfix', aws: 'Amazon SES', azure: { es: 'ACS Email (hasta 2028)', en: 'ACS Email (until 2028)' }, gcp: 'SendGrid (Marketplace)' } },
      { id: 'sms', x: 770, y: 180, kind: 'edge', role: { es: 'SMS', en: 'SMS' }, svc: { onprem: { es: 'API de un operador', en: 'Carrier API' }, aws: 'End User Messaging SMS', azure: { es: 'Partner del Marketplace', en: 'Marketplace partner' }, gcp: 'Twilio (Marketplace)' } },
      { id: 'push', x: 770, y: 330, kind: 'edge', role: { es: 'Push móvil', en: 'Mobile push' }, svc: { onprem: 'FCM / APNs', aws: 'SNS mobile push', azure: 'Notification Hubs', gcp: 'Firebase Cloud Messaging' } },
    ],
    edges: [
      { from: 'producers', to: 'queue' },
      { from: 'queue', to: 'dispatch' },
      { from: 'dispatch', to: 'prefs' },
      { from: 'dispatch', to: 'email' },
      { from: 'dispatch', to: 'sms' },
      { from: 'dispatch', to: 'push' },
      { from: 'dispatch', to: 'inapp' },
    ],
  },

  'b2b-file-transfer': {
    height: 426,
    nodes: [
      { id: 'partner', x: 20, y: 180, kind: 'client', role: { es: 'Partners', en: 'Partners' }, svc: same({ es: 'Bancos · proveedores', en: 'Banks · suppliers' }) },
      { id: 'sftp', x: 270, y: 180, kind: 'edge', role: { es: 'Endpoint SFTP / AS2', en: 'SFTP / AS2 endpoint' }, svc: { onprem: 'SFTPGo', aws: 'Transfer Family', azure: 'Blob Storage SFTP', gcp: 'Cloud FTP / SFTPGo' } },
      { id: 'keys', x: 270, y: 330, kind: 'security', role: { es: 'Claves SSH / PGP', en: 'SSH / PGP keys' }, svc: { onprem: 'OpenBao', aws: 'Secrets Manager', azure: 'Key Vault', gcp: 'Secret Manager' } },
      { id: 'scan', x: 520, y: 40, kind: 'security', role: { es: 'Validación + antimalware', en: 'Validation + malware scan' }, svc: { onprem: 'ClamAV + validador', aws: 'GuardDuty (S3)', azure: 'Defender for Storage', gcp: 'ClamAV en Cloud Run' } },
      { id: 'landing', x: 520, y: 180, kind: 'data', role: { es: 'Zona de aterrizaje', en: 'Landing zone' }, svc: objects },
      { id: 'audit', x: 520, y: 330, kind: 'data', role: { es: 'Auditoría de transferencias', en: 'Transfer audit' }, svc: { onprem: 'Wazuh', aws: 'CloudTrail + CloudWatch', azure: 'Azure Monitor logs', gcp: 'Cloud Audit Logs' } },
      { id: 'transform', x: 770, y: 180, kind: 'compute', role: { es: 'Transformación EDI / CSV', en: 'EDI / CSV transformation' }, svc: { onprem: { es: 'Workers en Kubernetes', en: 'Workers on Kubernetes' }, aws: 'B2B Data Interchange', azure: 'Logic Apps (EDI)', gcp: 'Cloud Run functions' } },
      { id: 'erp', x: 770, y: 330, kind: 'client', role: { es: 'Sistemas internos', en: 'Internal systems' }, svc: same({ es: 'ERP · BBDD', en: 'ERP · DB' }) },
    ],
    edges: [
      { from: 'partner', to: 'sftp', label: { es: 'clave SSH', en: 'SSH key' } },
      { from: 'keys', to: 'sftp', dashed: true },
      { from: 'sftp', to: 'landing' },
      { from: 'landing', to: 'scan' },
      { from: 'landing', to: 'transform', label: { es: 'limpio', en: 'clean' } },
      { from: 'transform', to: 'erp' },
      { from: 'landing', to: 'audit', dashed: true },
    ],
  },

  search: {
    height: 426,
    nodes: [
      { id: 'users', x: 20, y: 180, kind: 'client', role: { es: 'Usuarios', en: 'Users' }, svc: same({ es: 'Buscador · filtros', en: 'Search box · filters' }) },
      { id: 'api', x: 270, y: 180, kind: 'compute', role: { es: 'API de búsqueda', en: 'Search API' }, svc: compute },
      { id: 'srcdb', x: 270, y: 330, kind: 'data', role: { es: 'BBDD fuente de verdad', en: 'Source-of-truth DB' }, svc: postgres },
      { id: 'cache', x: 520, y: 40, kind: 'data', role: { es: 'Caché de consultas', en: 'Query cache' }, svc: { onprem: 'Valkey', aws: 'ElastiCache', azure: 'Azure Managed Redis', gcp: 'Memorystore' } },
      { id: 'index', x: 520, y: 180, kind: 'data', role: { es: 'Motor de búsqueda', en: 'Search engine' }, svc: { onprem: 'OpenSearch / Meilisearch', aws: 'OpenSearch Service', azure: 'Azure AI Search', gcp: 'Agent Search' } },
      { id: 'indexer', x: 520, y: 330, kind: 'queue', role: { es: 'CDC + indexador', en: 'CDC + indexer' }, svc: { onprem: 'Debezium + worker', aws: 'OpenSearch Ingestion', azure: { es: 'Worker (API push)', en: 'Worker (push API)' }, gcp: { es: 'Worker en Cloud Run', en: 'Cloud Run worker' } } },
      { id: 'analytics', x: 770, y: 180, kind: 'edge', role: { es: 'Analítica de búsqueda', en: 'Search analytics' }, svc: { onprem: 'OpenSearch Dashboards', aws: 'OpenSearch Dashboards', azure: 'Application Insights', gcp: 'Search analytics' } },
    ],
    edges: [
      { from: 'users', to: 'api' },
      { from: 'api', to: 'cache' },
      { from: 'api', to: 'index' },
      { from: 'srcdb', to: 'indexer', label: { es: 'cambios', en: 'changes' } },
      { from: 'indexer', to: 'index', label: { es: 'reindexa', en: 'reindexes' } },
      { from: 'index', to: 'analytics', dashed: true },
    ],
  },

  'streaming-analytics': {
    height: 426,
    nodes: [
      { id: 'src', x: 20, y: 180, kind: 'client', role: { es: 'Fuentes de eventos', en: 'Event sources' }, svc: same({ es: 'Clics · pagos · sensores', en: 'Clicks · payments · sensors' }) },
      { id: 'schema', x: 270, y: 40, kind: 'security', role: { es: 'Registro de esquemas', en: 'Schema registry' }, svc: { onprem: 'Apicurio Registry', aws: 'Glue Schema Registry', azure: 'Event Hubs schemas', gcp: 'Pub/Sub schemas' } },
      { id: 'stream', x: 270, y: 180, kind: 'queue', role: { es: 'Stream', en: 'Stream' }, svc: { onprem: 'Apache Kafka', aws: 'Kinesis Data Streams', azure: 'Event Hubs', gcp: 'Pub/Sub' } },
      { id: 'proc', x: 520, y: 180, kind: 'compute', role: { es: 'Procesado en streaming', en: 'Stream processing' }, svc: { onprem: 'Apache Flink', aws: 'Managed Flink', azure: 'Fabric Eventstream', gcp: 'Dataflow' } },
      { id: 'dash', x: 520, y: 330, kind: 'client', role: { es: 'Paneles en vivo', en: 'Live dashboards' }, svc: { onprem: 'Grafana', aws: 'Managed Grafana', azure: 'Real-Time Dashboard', gcp: 'Grafana (BigQuery)' } },
      { id: 'act', x: 770, y: 40, kind: 'compute', role: { es: 'Acciones (fraude, alertas)', en: 'Actions (fraud, alerts)' }, svc: functions },
      { id: 'olap', x: 770, y: 180, kind: 'data', role: { es: 'OLAP en tiempo real', en: 'Real-time OLAP' }, svc: { onprem: 'ClickHouse', aws: 'Amazon Redshift', azure: 'Fabric Eventhouse', gcp: 'BigQuery' } },
      { id: 'lake', x: 770, y: 330, kind: 'data', role: { es: 'Archivo en el lake', en: 'Lake archive' }, svc: objects },
    ],
    edges: [
      { from: 'src', to: 'stream' },
      { from: 'stream', to: 'schema', dashed: true },
      { from: 'stream', to: 'proc' },
      { from: 'proc', to: 'act', label: { es: 'ventanas', en: 'windows' } },
      { from: 'proc', to: 'olap' },
      { from: 'proc', to: 'lake', dashed: true },
      { from: 'olap', to: 'dash' },
    ],
  },

  'media-processing': {
    height: 426,
    nodes: [
      { id: 'creators', x: 20, y: 180, kind: 'client', role: { es: 'Quien sube', en: 'Uploaders' }, svc: same({ es: 'App · creadores', en: 'App · creators' }) },
      { id: 'upload', x: 270, y: 180, kind: 'data', role: { es: 'Originales (URL firmada)', en: 'Originals (signed URL)' }, svc: objects },
      { id: 'images', x: 520, y: 40, kind: 'compute', role: { es: 'Imágenes al vuelo', en: 'On-the-fly images' }, svc: { onprem: 'imgproxy', aws: 'Dynamic Image Transform.', azure: 'imgproxy (ACA)', gcp: 'imgproxy (Cloud Run)' } },
      { id: 'transcode', x: 520, y: 180, kind: 'compute', role: { es: 'Transcodificación', en: 'Transcoding' }, svc: { onprem: 'FFmpeg (workers GPU)', aws: 'MediaConvert', azure: 'ACA jobs + FFmpeg', gcp: 'Transcoder API' } },
      { id: 'jobs', x: 520, y: 330, kind: 'queue', role: { es: 'Trabajos y estados', en: 'Jobs & status' }, svc: { onprem: 'RabbitMQ', aws: 'Amazon EventBridge', azure: 'Event Grid', gcp: 'Pub/Sub' } },
      { id: 'out', x: 770, y: 180, kind: 'data', role: { es: 'Renditions HLS / DASH', en: 'HLS / DASH renditions' }, svc: objects },
      { id: 'cdn', x: 770, y: 330, kind: 'edge', role: { es: 'Entrega (URLs firmadas)', en: 'Delivery (signed URLs)' }, svc: { onprem: 'Nginx secure_link', aws: 'CloudFront (signed)', azure: 'Front Door + token', gcp: 'Cloud CDN / Media CDN' } },
    ],
    edges: [
      { from: 'creators', to: 'upload' },
      { from: 'upload', to: 'images', dashed: true },
      { from: 'upload', to: 'transcode', label: { es: 'evento', en: 'event' } },
      { from: 'transcode', to: 'jobs', dashed: true },
      { from: 'transcode', to: 'out' },
      { from: 'out', to: 'cdn' },
    ],
  },

  'compliance-sovereignty': {
    height: 426,
    nodes: [
      { id: 'users', x: 20, y: 180, kind: 'client', role: { es: 'Ciudadanos / clientes', en: 'Citizens / customers' }, svc: same({ es: 'Datos personales', en: 'Personal data' }) },
      { id: 'region', x: 270, y: 180, kind: 'edge', role: { es: 'Región UE / nube soberana', en: 'EU region / sovereign cloud' }, svc: { onprem: { es: 'CPD propio (ENS)', en: 'Own data centre (ENS)' }, aws: 'European Sovereign Cloud', azure: 'EU Data Boundary', gcp: 'Data Boundary + partner' } },
      { id: 'keys', x: 520, y: 40, kind: 'security', role: { es: 'Claves bajo tu control', en: 'Keys under your control' }, svc: { onprem: { es: 'HSM propio', en: 'Own HSM' }, aws: 'KMS External Key Store', azure: 'Azure Managed HSM', gcp: 'Cloud External Key Mgr' } },
      { id: 'workload', x: 520, y: 180, kind: 'compute', role: { es: 'Carga regulada', en: 'Regulated workload' }, svc: compute },
      { id: 'policy', x: 520, y: 330, kind: 'security', role: { es: 'Residencia por política', en: 'Residency by policy' }, svc: { onprem: 'OPA', aws: 'SCP (region deny)', azure: 'Allowed locations', gcp: 'Resource locations' } },
      { id: 'audit', x: 770, y: 40, kind: 'data', role: { es: 'Registro inmutable', en: 'Immutable audit log' }, svc: { onprem: 'WORM + Wazuh', aws: 'Trail + S3 Object Lock', azure: { es: 'Logs → Blob inmutable', en: 'Logs → immutable Blob' }, gcp: 'Log bucket (locked)' } },
      { id: 'data', x: 770, y: 180, kind: 'data', role: { es: 'Datos cifrados', en: 'Encrypted data' }, svc: postgres },
      { id: 'dlp', x: 770, y: 330, kind: 'security', role: { es: 'Clasificación / DLP', en: 'Classification / DLP' }, svc: { onprem: 'Microsoft Presidio', aws: 'Amazon Macie', azure: 'Microsoft Purview', gcp: 'Sensitive Data Prot.' } },
    ],
    edges: [
      { from: 'users', to: 'region' },
      { from: 'region', to: 'workload' },
      { from: 'policy', to: 'workload', dashed: true },
      { from: 'workload', to: 'data' },
      { from: 'keys', to: 'data', label: { es: 'cifra', en: 'encrypts' }, dashed: true },
      { from: 'data', to: 'audit', dashed: true },
      { from: 'data', to: 'dlp', dashed: true },
    ],
  },

  'developer-platform': {
    height: 426,
    nodes: [
      { id: 'dev', x: 20, y: 180, kind: 'client', role: { es: 'Equipos de desarrollo', en: 'Development teams' }, svc: same({ es: 'Desarrolladores', en: 'Developers' }) },
      { id: 'portal', x: 270, y: 40, kind: 'client', role: { es: 'Portal interno', en: 'Internal portal' }, svc: same('Backstage') },
      { id: 'git', x: 270, y: 180, kind: 'data', role: { es: 'Git + plantillas', en: 'Git + templates' }, svc: same('GitHub · GitLab') },
      { id: 'iac', x: 520, y: 40, kind: 'security', role: { es: 'Módulos IaC aprobados', en: 'Approved IaC modules' }, svc: same('Terraform / OpenTofu') },
      { id: 'ci', x: 520, y: 180, kind: 'compute', role: { es: 'CI/CD', en: 'CI/CD' }, svc: { onprem: 'GitLab CI / Argo', aws: 'GitHub Actions', azure: 'GitHub Actions', gcp: 'Cloud Build' } },
      { id: 'cost', x: 770, y: 40, kind: 'data', role: { es: 'Coste por equipo', en: 'Cost per team' }, svc: { onprem: 'OpenCost', aws: 'Cost allocation tags', azure: 'Cost Management', gcp: 'Billing labels' } },
      { id: 'preview', x: 770, y: 180, kind: 'compute', role: { es: 'Entorno efímero por PR', en: 'Ephemeral env per PR' }, svc: { onprem: 'vCluster / namespace', aws: { es: 'Servicio ECS por PR', en: 'ECS service per PR' }, azure: 'Container Apps labels', gcp: 'Cloud Run tags' } },
      { id: 'ttl', x: 770, y: 330, kind: 'edge', role: { es: 'Limpieza automática', en: 'Automatic clean-up' }, svc: { onprem: 'Argo CD ApplicationSet', aws: 'EventBridge Scheduler', azure: 'Functions (timer)', gcp: 'Cloud Scheduler' } },
    ],
    edges: [
      { from: 'dev', to: 'portal', label: { es: 'nuevo servicio', en: 'new service' } },
      { from: 'dev', to: 'git' },
      { from: 'portal', to: 'git', label: { es: 'plantilla', en: 'template' } },
      { from: 'git', to: 'ci' },
      { from: 'ci', to: 'iac' },
      { from: 'ci', to: 'preview', label: { es: 'PR', en: 'PR' } },
      { from: 'preview', to: 'cost', dashed: true },
      { from: 'preview', to: 'ttl', dashed: true },
    ],
  },
};


export const categories = ['apps', 'integration', 'data', 'ai', 'security', 'operations'] as const;
export type Category = (typeof categories)[number];

export const categoryLabel: Record<Category, { es: string; en: string }> = {
  apps: { es: 'Aplicaciones', en: 'Applications' },
  integration: { es: 'Integración', en: 'Integration' },
  data: { es: 'Datos e IoT', en: 'Data & IoT' },
  ai: { es: 'IA', en: 'AI' },
  security: { es: 'Identidad y seguridad', en: 'Identity & security' },
  operations: { es: 'Operación', en: 'Operations' },
};

/** case → category, in sidebar order */
export const caseCategory: Record<string, Category> = {
  'web-app': 'apps', 'serverless-api': 'apps', 'microservices-k8s': 'apps', 'multi-tenant-saas': 'apps',
  'background-jobs': 'integration', 'event-driven': 'integration', 'workflow-orchestration': 'integration', 'webhooks-integrations': 'integration',
  'file-processing': 'data', 'data-lakehouse': 'data', 'iot-telemetry': 'data',
  'ai-rag': 'ai', 'ml-serving': 'ai',
  'iam-keyless-ci': 'security', 'zero-trust-access': 'security', 'landing-zone': 'security', 'network-hub-spoke': 'security',
  observability: 'operations', 'disaster-recovery': 'operations', 'airgapped-onprem': 'operations', 'cicd-supply-chain': 'operations',
  'static-site': 'apps', realtime: 'apps', 'public-api-platform': 'apps', 'legacy-modernization': 'apps',
  notifications: 'integration', 'b2b-file-transfer': 'integration',
  search: 'data', 'streaming-analytics': 'data', 'media-processing': 'data',
  'compliance-sovereignty': 'security',
  'developer-platform': 'operations',
};

/** where the Terraform for each case lives */
export const repoUrl = 'https://github.com/antoniopaya22/cloud-reference-architectures';

export interface Path { d: string; lx: number; ly: number; anchor: 'start' | 'middle' }

/** Orthogonal route between two nodes plus a spot for its label */
export function route(a: ArchNode, b: ArchNode): Path {
  const acx = a.x + NODE_W / 2;
  const bcx = b.x + NODE_W / 2;
  if (b.x >= a.x + NODE_W) {
    // left to right
    const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2;
    const x2 = b.x, y2 = b.y + NODE_H / 2;
    const mx = (x1 + x2) / 2;
    if (y1 === y2) return { d: `M${x1} ${y1} H${x2}`, lx: mx, ly: y1 - 8, anchor: 'middle' };
    return { d: `M${x1} ${y1} H${mx} V${y2} H${x2}`, lx: mx + 6, ly: (y1 + y2) / 2 + 4, anchor: 'start' };
  }
  if (b.x + NODE_W <= a.x) {
    // right to left
    const x1 = a.x, y1 = a.y + NODE_H / 2;
    const x2 = b.x + NODE_W, y2 = b.y + NODE_H / 2;
    const mx = (x1 + x2) / 2;
    if (y1 === y2) return { d: `M${x1} ${y1} H${x2}`, lx: mx, ly: y1 - 8, anchor: 'middle' };
    return { d: `M${x1} ${y1} H${mx} V${y2} H${x2}`, lx: mx + 6, ly: (y1 + y2) / 2 + 4, anchor: 'start' };
  }
  // same column: vertical
  const down = b.y > a.y;
  const y1 = down ? a.y + NODE_H : a.y;
  const y2 = down ? b.y : b.y + NODE_H;
  const x = acx === bcx ? acx : (acx + bcx) / 2;
  return { d: `M${x} ${y1} V${y2}`, lx: x + 8, ly: (y1 + y2) / 2 + 4, anchor: 'start' };
}


export const archStrings = {
  es: {
    section: 'Arquitectura',
    indexTitle: 'Arquitecturas de referencia en AWS, Azure, GCP y on-premises',
    indexLead: 'Problemas que se repiten en casi todos los sistemas y cómo los resuelvo en cada plataforma: el mismo diseño, con los servicios de AWS, Azure, Google Cloud o con software libre en tu propio centro de datos.',
    indexDescription: 'Arquitecturas de referencia de Antonio Payá González: web, colas, eventos, ficheros, RAG y Zero Trust, resueltos en AWS, Azure, GCP y on-premises.',
    howTo: 'Cada caso tiene un diagrama común. Cambia de plataforma con las pestañas y verás qué servicio ocupa cada pieza, qué notas importan y qué alternativas hay.',
    cases: 'Casos',
    platform: 'Plataforma',
    requirements: 'Qué debe garantizar',
    notes: 'En detalle',
    mapping: 'Equivalencias por plataforma',
    role: 'Pieza',
    diagramLabel: 'Diagrama de arquitectura',
    prev: 'Anterior',
    next: 'Siguiente',
    open: 'Ver caso',
    legend: { client: 'Cliente', edge: 'Red / borde', compute: 'Cómputo', data: 'Datos', queue: 'Mensajería', ai: 'IA', security: 'Seguridad' },
    disclaimer: 'Son puntos de partida, no recetas: tamaño, coste y requisitos de cumplimiento cambian la elección.',
    repo: 'Código y estructura en GitHub',
    toc: 'En esta página',
    tiers: 'Opciones por coste y alcance',
    tiersHint: 'De la opción más barata a la más resiliente. La columna «Cómo se monta» cambia con la plataforma elegida.',
    tierCols: { option: 'Opción', when: 'Para quién', cost: 'Coste', ops: 'Operación', how: 'Cómo se monta', tradeoffs: 'Qué sacrificas' },
    extensions: 'Ampliaciones',
    extensionsHint: 'Piezas que se añaden al diseño base cuando hacen falta.',
    extCols: { name: 'Ampliación', when: 'Cuándo', service: 'Servicio', cost: 'Impacto en coste' },
    costLevel: { low: 'Bajo', medium: 'Medio', high: 'Alto' },
    savings: 'Cómo ahorrar',
    detail: 'Explicación detallada',
    costScale: 'coste mensual relativo',
    opsScale: 'esfuerzo de operación',
    guides: 'Guías',
    guideLabel: 'guía',
    repoAll: 'Repositorio con Terraform',
  },
  en: {
    section: 'Architecture',
    indexTitle: 'Reference architectures on AWS, Azure, GCP and on-premises',
    indexLead: 'Problems that show up in almost every system and how I solve them on each platform: one design, built with AWS, Azure or Google Cloud services, or with open source in your own data centre.',
    indexDescription: 'Reference architectures by Antonio Payá González: web apps, queues, events, files, RAG and Zero Trust on AWS, Azure, GCP and on-premises.',
    howTo: 'Every case has one shared diagram. Switch platform with the tabs to see which service fills each piece, what to watch out for and which alternatives exist.',
    cases: 'Cases',
    platform: 'Platform',
    requirements: 'What it must guarantee',
    notes: 'In detail',
    mapping: 'Equivalents by platform',
    role: 'Piece',
    diagramLabel: 'Architecture diagram',
    prev: 'Previous',
    next: 'Next',
    open: 'View case',
    legend: { client: 'Client', edge: 'Network / edge', compute: 'Compute', data: 'Data', queue: 'Messaging', ai: 'AI', security: 'Security' },
    disclaimer: 'These are starting points, not recipes: size, cost and compliance requirements change the choice.',
    repo: 'Code and layout on GitHub',
    toc: 'On this page',
    tiers: 'Options by cost and scope',
    tiersHint: 'From the cheapest option to the most resilient. The "How it is built" column follows the selected platform.',
    tierCols: { option: 'Option', when: 'For whom', cost: 'Cost', ops: 'Operations', how: 'How it is built', tradeoffs: 'What you give up' },
    extensions: 'Extensions',
    extensionsHint: 'Pieces you add to the base design when you need them.',
    extCols: { name: 'Extension', when: 'When', service: 'Service', cost: 'Cost impact' },
    costLevel: { low: 'Low', medium: 'Medium', high: 'High' },
    savings: 'How to save',
    detail: 'In depth',
    costScale: 'relative monthly cost',
    opsScale: 'operational effort',
    guides: 'Guides',
    guideLabel: 'guide',
    repoAll: 'Repository with Terraform',
  },
} as const;
