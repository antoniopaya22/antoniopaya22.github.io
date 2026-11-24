import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const link = z.object({ label: z.string(), href: z.url() });

/**
 * One Markdown file per project and language:
 *   src/content/projects/es/<slug>.md  →  /proyectos/<slug>/
 *   src/content/projects/en/<slug>.md  →  /en/projects/<slug>/
 * Both files of a project share the same <slug>.
 */
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    /** one line under the title */
    tagline: z.string(),
    /** meta description, at most 160 characters */
    description: z.string().max(160),
    kind: z.enum(['research', 'oss', 'product']),
    year: z.number().int(),
    /** e.g. "Computers & Security, 2024" or "En producción" */
    status: z.string(),
    repo: z.url().optional(),
    site: z.url().optional(),
    paper: z.url().optional(),
    stack: z.array(z.string()),
    /** 2–4 headline facts taken from the project site, never invented */
    facts: z.array(z.object({ value: z.string(), label: z.string() })).max(4),
    /** deep links into the project's own site */
    links: z.array(link),
    /** lower comes first */
    order: z.number().int(),
  }),
});

const platformNotes = z.object({
  /** one sentence: how this platform solves the case */
  summary: z.string(),
  /** 3–5 bullets: why these services, gotchas, what drives the cost */
  notes: z.array(z.string()).min(2).max(6),
});

const perPlatform = { onprem: z.string(), aws: z.string(), azure: z.string(), gcp: z.string() };

const tier = z.object({
  name: z.string(),
  /** who it is for: scale, team, constraints */
  when: z.string(),
  /** relative monthly cost, 1 (€) to 4 (€€€€) */
  cost: z.number().int().min(1).max(4),
  /** operational effort, 1 (low) to 3 (high) */
  ops: z.number().int().min(1).max(3),
  /** optional indicative figure, only when checked against official list prices */
  estimate: z.string().optional(),
  /** how this option is built on each platform */
  ...perPlatform,
  tradeoffs: z.string(),
});

const extension = z.object({
  name: z.string(),
  when: z.string(),
  /** effect on the bill */
  cost: z.enum(['low', 'medium', 'high']),
  ...perPlatform,
});

/**
 * One Markdown file per case and language:
 *   src/content/architecture/es/<slug>.md  →  /arquitectura/<slug>/
 *   src/content/architecture/en/<slug>.md  →  /en/architecture/<slug>/
 * The diagram and the service per platform live in src/data/architecture.ts (shared by both languages).
 */
const architecture = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/architecture' }),
  schema: z.object({
    title: z.string(),
    /** short label for the sidebar */
    short: z.string(),
    /** one or two sentences under the title */
    summary: z.string(),
    description: z.string().max(160),
    order: z.number().int(),
    /** what the solution has to guarantee */
    requirements: z.array(z.string()).min(3).max(6),
    platforms: z.object({ onprem: platformNotes, aws: platformNotes, azure: platformNotes, gcp: platformNotes }),
    /** 3 options from cheapest/smallest to largest/most resilient, compared in one table */
    tiers: z.array(tier).min(3).max(4).optional(),
    /** add-ons that extend the base design: cache, load balancing, replicas … */
    extensions: z.array(extension).min(3).max(8).optional(),
    /** case-specific ways to cut the bill */
    savings: z.array(z.string()).min(3).max(8).optional(),
  }),
});

/** Cross-cutting guides shown above the cases: long-form Markdown with tables. */
const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    short: z.string(),
    summary: z.string(),
    description: z.string().max(160),
    order: z.number().int(),
  }),
});

export const collections = { projects, architecture, guides };
