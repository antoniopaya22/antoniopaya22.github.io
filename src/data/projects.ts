import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/translations';

export type Project = CollectionEntry<'projects'>;

export const siteUrl = 'https://antoniopaya22.github.io';

/** URL segment of the project section per language */
const section = { es: 'proyectos', en: 'projects' } as const;

/** "es/apollon" → "apollon" */
export const slugOf = (p: Project) => p.id.split('/').slice(1).join('/');

export function projectsIndexPath(lang: Lang): string {
  return lang === 'es' ? `/${section.es}/` : `/en/${section.en}/`;
}

export function projectPath(lang: Lang, slug: string): string {
  return `${projectsIndexPath(lang)}${slug}/`;
}

/** Projects of one language, in display order */
export async function getProjects(lang: Lang): Promise<Project[]> {
  const all = await getCollection('projects', (p) => p.id.startsWith(`${lang}/`));
  return all.sort((a, b) => a.data.order - b.data.order);
}

/** Slugs that have a page in both languages (used by the home cards) */
export async function projectSlugs(): Promise<Set<string>> {
  const [es, en] = await Promise.all([getProjects('es'), getProjects('en')]);
  const enSlugs = new Set(en.map(slugOf));
  return new Set(es.map(slugOf).filter((s) => enSlugs.has(s)));
}

export const projectStrings = {
  es: {
    section: 'Proyectos',
    indexTitle: 'Proyectos — Antonio Payá González',
    indexLead: 'Software que he diseñado y construido: implementaciones reproducibles de mi investigación en Zero Trust y detección de intrusiones, plantillas open source y productos propios.',
    indexDescription: 'Proyectos de Antonio Payá González: Software-Defined Perimeter, defensa frente a adversarial ML en IDS, plantillas Go open source y productos web.',
    kind: { research: 'Investigación', oss: 'Open source', product: 'Producto' },
    site: 'Web del proyecto',
    app: 'Abrir la app',
    repo: 'Repositorio',
    paper: 'Paper',
    stack: 'Stack',
    docs: 'En su web',
    facts: 'En cifras',
    more: 'Más proyectos',
    all: 'Todos los proyectos',
    home: 'Inicio',
    details: 'Ficha',
    open: 'Ver ficha',
  },
  en: {
    section: 'Projects',
    indexTitle: 'Projects — Antonio Payá González',
    indexLead: 'Software I have designed and built: reproducible implementations of my Zero Trust and intrusion detection research, open source templates and my own products.',
    indexDescription: 'Projects by Antonio Payá González: Software-Defined Perimeter, adversarial ML defence for IDS, open source Go templates and web products.',
    kind: { research: 'Research', oss: 'Open source', product: 'Product' },
    site: 'Project website',
    app: 'Open the app',
    repo: 'Repository',
    paper: 'Paper',
    stack: 'Stack',
    docs: 'On its website',
    facts: 'At a glance',
    more: 'More projects',
    all: 'All projects',
    home: 'Home',
    details: 'Details',
    open: 'View project',
  },
} as const;
