import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/translations';
import { caseCategory, categories, diagrams } from './architecture-data';

export * from './architecture-data';

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
  const rank = (c: ArchCase) => categories.indexOf(caseCategory[archSlug(c)] ?? 'operations');
  return all
    .filter((c) => archSlug(c) in diagrams)
    .sort((a, b) => rank(a) - rank(b) || a.data.order - b.data.order);
}


export type Guide = CollectionEntry<'guides'>;

const guideSection = { es: 'guias', en: 'guides' } as const;

export function guidePath(lang: Lang, slug: string): string {
  return `${archIndexPath(lang)}${guideSection[lang]}/${slug}/`;
}

export async function getGuides(lang: Lang): Promise<Guide[]> {
  const all = await getCollection('guides', (g) => g.id.startsWith(`${lang}/`));
  return all.sort((a, b) => a.data.order - b.data.order);
}
