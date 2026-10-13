import { featuredRepos } from './site';

export interface RepoStats {
  repo: string;
  key: string;
  url: string;
  stars: number;
  forks: number;
  language: string;
  pushedAt?: string;
  paper?: string;
  tags: readonly string[];
}

let cache: Promise<RepoStats[]> | undefined;

/**
 * Fetches live stars/forks/language from the GitHub API at build time.
 * Falls back to the static values in site.ts when offline or rate-limited.
 */
export function getFeaturedRepos(): Promise<RepoStats[]> {
  cache ??= Promise.all(
    featuredRepos.map(async (r) => {
      const base: RepoStats = {
        repo: r.repo,
        key: r.key,
        url: `https://github.com/${r.repo}`,
        paper: 'paper' in r ? r.paper : undefined,
        tags: r.tags,
        ...r.fallback,
      };
      try {
        const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
        const token = process.env.GITHUB_TOKEN;
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`https://api.github.com/repos/${r.repo}`, { headers, signal: AbortSignal.timeout(5000) });
        if (!res.ok) return base;
        const d = await res.json();
        return {
          ...base,
          stars: d.stargazers_count ?? base.stars,
          forks: d.forks_count ?? base.forks,
          language: d.language ?? base.language,
          pushedAt: d.pushed_at,
        };
      } catch {
        return base;
      }
    })
  );
  return cache;
}
