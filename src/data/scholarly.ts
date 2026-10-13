import { publications } from './site';

export type Publication = (typeof publications)[number];

let cache: Promise<Publication[]> | undefined;

/**
 * Refreshes per-article citation counts from Crossref at build time
 * (keeps the static values in site.ts when offline or rate-limited).
 */
export function getPublications(): Promise<Publication[]> {
  cache ??= Promise.all(
    publications.map(async (p) => {
      try {
        const res = await fetch(`https://api.crossref.org/works/${p.doi}`, {
          headers: { 'User-Agent': 'antoniopaya22.github.io (mailto:antoniopaya@outlook.com)' },
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return p;
        const d = await res.json();
        const count = d?.message?.['is-referenced-by-count'];
        return typeof count === 'number' ? { ...p, citations: count } : p;
      } catch {
        return p;
      }
    })
  );
  return cache;
}
