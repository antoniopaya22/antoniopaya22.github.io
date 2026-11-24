/**
 * Reference architectures: diagram topology and the service that fills each role on every platform.
 * Shared by both languages; the prose lives in src/content/architecture/<lang>/<slug>.md.
 */

import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/translations';

export const platforms = ['onprem', 'aws', 'azure', 'gcp'] as const;
export type Platform = (typeof platforms)[number];

export const platformLabel: Record<Platform, string> = {
  onprem: 'On-premises',
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'Google Cloud',
};

type L = { es: string; en: string };
type Svc = Record<Platform, string>;

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

const same = (v: string): Svc => ({ onprem: v, aws: v, azure: v, gcp: v });

// services that repeat across cases
const compute: Svc = { onprem: 'Kubernetes (RKE2/k3s)', aws: 'ECS Fargate', azure: 'Container Apps', gcp: 'Cloud Run' };
const functions: Svc = { onprem: 'Workers en Kubernetes', aws: 'AWS Lambda', azure: 'Azure Functions', gcp: 'Cloud Run functions' };
const postgres: Svc = { onprem: 'PostgreSQL + Patroni', aws: 'Aurora PostgreSQL', azure: 'Azure DB for PostgreSQL', gcp: 'Cloud SQL (PostgreSQL)' };
const objects: Svc = { onprem: 'Ceph RGW', aws: 'Amazon S3', azure: 'Blob Storage', gcp: 'Cloud Storage' };

export const diagrams: Record<string, Diagram> = {
  'web-app': {
    height: 506,
    nodes: [
      { id: 'client', x: 20, y: 180, kind: 'client', role: { es: 'Cliente', en: 'Client' }, svc: same('SPA · móvil') },
      { id: 'cdn', x: 270, y: 60, kind: 'edge', role: { es: 'CDN + estáticos', en: 'CDN + static assets' }, svc: { onprem: 'Nginx + caché', aws: 'CloudFront + S3', azure: 'Front Door + Storage', gcp: 'Cloud CDN + Storage' } },
      { id: 'lb', x: 270, y: 300, kind: 'edge', role: { es: 'Balanceador + WAF', en: 'Load balancer + WAF' }, svc: { onprem: 'HAProxy + Coraza WAF', aws: 'ALB + AWS WAF', azure: 'App Gateway + WAF', gcp: 'Cloud LB + Cloud Armor' } },
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
      { id: 'cron', x: 20, y: 340, kind: 'compute', role: { es: 'Planificador (cron)', en: 'Scheduler (cron)' }, svc: { onprem: 'CronJob de Kubernetes', aws: 'EventBridge Scheduler', azure: 'Container Apps Jobs', gcp: 'Cloud Scheduler' } },
      { id: 'queue', x: 270, y: 250, kind: 'queue', role: { es: 'Cola de trabajos', en: 'Job queue' }, svc: { onprem: 'RabbitMQ', aws: 'Amazon SQS', azure: 'Service Bus (colas)', gcp: 'Pub/Sub' } },
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
      { id: 'client', x: 20, y: 180, kind: 'client', role: { es: 'Cliente', en: 'Client' }, svc: same('Navegador · app') },
      { id: 'api', x: 270, y: 40, kind: 'compute', role: { es: 'API: emite URL firmada', en: 'API: issues signed URL' }, svc: compute },
      { id: 'objects', x: 270, y: 300, kind: 'data', role: { es: 'Almacenamiento de objetos', en: 'Object storage' }, svc: { onprem: 'Ceph RGW (presigned)', aws: 'S3 (presigned URL)', azure: 'Blob Storage (SAS)', gcp: 'Cloud Storage (signed)' } },
      { id: 'event', x: 520, y: 300, kind: 'queue', role: { es: 'Evento «fichero limpio»', en: '"File clean" event' }, svc: { onprem: 'RabbitMQ', aws: 'Amazon EventBridge', azure: 'Event Grid', gcp: 'Eventarc' } },
      { id: 'scan', x: 520, y: 420, kind: 'security', role: { es: 'Antimalware', en: 'Malware scanning' }, svc: { onprem: 'ClamAV', aws: 'GuardDuty (S3)', azure: 'Defender for Storage', gcp: 'ClamAV en Cloud Run' } },
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
      { id: 'llm', x: 520, y: 180, kind: 'ai', role: { es: 'LLM', en: 'LLM' }, svc: { onprem: 'vLLM + modelo abierto', aws: 'Amazon Bedrock', azure: 'Microsoft Foundry', gcp: 'Vertex AI' } },
      { id: 'vector', x: 520, y: 320, kind: 'data', role: { es: 'Búsqueda vectorial', en: 'Vector search' }, svc: { onprem: 'PostgreSQL + pgvector', aws: 'Aurora + pgvector', azure: 'Azure AI Search', gcp: 'Vertex AI Vector Search' } },
      { id: 'docs', x: 20, y: 420, kind: 'data', role: { es: 'Documentos fuente', en: 'Source documents' }, svc: objects },
      { id: 'ingest', x: 270, y: 420, kind: 'compute', role: { es: 'Ingesta + embeddings', en: 'Ingestion + embeddings' }, svc: { onprem: 'Jobs en Kubernetes', aws: 'AWS Lambda', azure: 'Azure Functions', gcp: 'Cloud Run jobs' } },
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
      { id: 'user', x: 20, y: 200, kind: 'client', role: { es: 'Usuario + dispositivo', en: 'User + device' }, svc: same('Portátil · móvil') },
      { id: 'idp', x: 270, y: 60, kind: 'security', role: { es: 'Identidad + MFA', en: 'Identity + MFA' }, svc: { onprem: 'Keycloak', aws: 'IAM Identity Center', azure: 'Microsoft Entra ID', gcp: 'Cloud Identity' } },
      { id: 'posture', x: 270, y: 340, kind: 'security', role: { es: 'Postura del dispositivo', en: 'Device posture' }, svc: { onprem: 'osquery / Wazuh', aws: 'Jamf / CrowdStrike', azure: 'Microsoft Intune', gcp: 'Endpoint Verification' } },
      { id: 'broker', x: 520, y: 200, kind: 'edge', role: { es: 'Decisión + proxy de acceso', en: 'Policy decision + proxy' }, svc: { onprem: 'SDP: controlador + SPA', aws: 'AWS Verified Access', azure: 'Entra Private Access', gcp: 'Identity-Aware Proxy' } },
      { id: 'app', x: 770, y: 200, kind: 'compute', role: { es: 'Aplicación interna', en: 'Internal application' }, svc: { onprem: 'Red privada', aws: 'VPC privada', azure: 'VNet privada', gcp: 'VPC privada' } },
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
};

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
  // same column: vertical
  const down = b.y > a.y;
  const y1 = down ? a.y + NODE_H : a.y;
  const y2 = down ? b.y : b.y + NODE_H;
  const x = acx === bcx ? acx : (acx + bcx) / 2;
  return { d: `M${x} ${y1} V${y2}`, lx: x + 8, ly: (y1 + y2) / 2 + 4, anchor: 'start' };
}


export type ArchCase = CollectionEntry<'architecture'>;

const archSection = { es: 'arquitectura', en: 'architecture' } as const;

export const archSlug = (c: ArchCase) => c.id.split('/').slice(1).join('/');

export function archIndexPath(lang: Lang): string {
  return lang === 'es' ? `/${archSection.es}/` : `/en/${archSection.en}/`;
}

export function archPath(lang: Lang, slug: string): string {
  return `${archIndexPath(lang)}${slug}/`;
}

export async function getCases(lang: Lang): Promise<ArchCase[]> {
  const all = await getCollection('architecture', (c) => c.id.startsWith(`${lang}/`));
  return all.filter((c) => archSlug(c) in diagrams).sort((a, b) => a.data.order - b.data.order);
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
  },
} as const;
