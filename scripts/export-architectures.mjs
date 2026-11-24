#!/usr/bin/env node
// Writes architectures/<case>/README.md and architectures/README.md in the
// cloud-reference-architectures repository from this site's English content,
// so the website and the repository describe each case the same way.
//
//   node scripts/export-architectures.mjs ../cloud-reference-architectures

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { caseCategory, categories, categoryLabel, diagrams, platformLabel, platforms, svcText } from '../src/data/architecture-data.ts';

const repo = process.argv[2];
if (!repo || !existsSync(repo)) {
  console.error('usage: node scripts/export-architectures.mjs <path to cloud-reference-architectures>');
  process.exit(1);
}

const site = 'https://antoniopaya22.github.io';
const contentDir = new URL('../src/content/architecture/en/', import.meta.url);
const lang = 'en';

function readCase(slug) {
  const raw = readFileSync(new URL(`${slug}.md`, contentDir), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`no frontmatter in ${slug}.md`);
  return { data: parse(m[1]), body: m[2].trim() };
}

const mermaidText = (t) => t.replace(/"/g, '#quot;');

function mermaid(slug) {
  const dg = diagrams[slug];
  const lines = ['flowchart LR'];
  for (const n of dg.nodes) lines.push(`  ${n.id.replace(/\W/g, '_')}["${mermaidText(n.role[lang])}"]`);
  for (const e of dg.edges) {
    const a = e.from.replace(/\W/g, '_');
    const b = e.to.replace(/\W/g, '_');
    const arrow = e.dashed ? '-.->' : '-->';
    lines.push(e.label ? `  ${a} ${arrow}|"${mermaidText(e.label[lang])}"| ${b}` : `  ${a} ${arrow} ${b}`);
  }
  return lines.join('\n');
}

function status(slug, platform) {
  const dir = join(repo, 'architectures', slug, platform);
  if (!existsSync(dir)) return { label: 'docs', link: false };
  const hasTf = existsSync(join(dir, 'stack')) || existsSync(join(dir, 'environments'));
  return { label: hasTf ? 'validated' : 'manifests', link: true };
}

const cell = (s) => String(s).replace(/\|/g, '\\|');

const slugs = Object.keys(diagrams).filter((s) => existsSync(new URL(`${s}.md`, contentDir)));
slugs.sort((a, b) => readCase(a).data.order - readCase(b).data.order);

for (const slug of slugs) {
  const { data, body } = readCase(slug);
  const dg = diagrams[slug];
  const out = [];
  out.push(`<!-- Generated from ${site}/en/architecture/${slug}/ content. Edit the website source, then re-export. -->`);
  out.push(`# ${data.title}`, '', data.summary, '');
  out.push(`Interactive diagram with a platform switcher: <${site}/en/architecture/${slug}/>`, '');
  out.push('## Diagram', '', '```mermaid', mermaid(slug), '```', '');
  out.push('## Requirements', '', ...data.requirements.map((r) => `- ${r}`), '');
  out.push('## Services by platform', '');
  out.push(`| Piece | ${platforms.map((p) => platformLabel[p]).join(' | ')} |`);
  out.push(`|---|${platforms.map(() => '---').join('|')}|`);
  for (const n of dg.nodes.filter((x) => x.kind !== 'client')) {
    out.push(`| ${cell(n.role[lang])} | ${platforms.map((p) => cell(svcText(n.svc[p], lang))).join(' | ')} |`);
  }
  out.push('');
  out.push('## Implementation', '');
  out.push('| Platform | Folder | Status |', '|---|---|---|');
  for (const p of platforms) {
    const st = status(slug, p);
    out.push(`| ${platformLabel[p]} | ${st.link ? `[\`${p}/\`](${p}/)` : '—'} | \`${st.label}\` |`);
  }
  out.push('', 'Status labels are defined in [docs/conventions.md](../../docs/conventions.md#status-labels).', '');
  if (data.tiers) {
    out.push('## Options by cost and scope', '');
    out.push('Cost is relative monthly cost (€ to €€€€); operations is the effort to run it (● to ●●●).', '');
    out.push(`| Option | For whom | Cost | Ops | ${platforms.map((p) => platformLabel[p]).join(' | ')} | Trade-offs |`);
    out.push(`|---|---|---|---|${platforms.map(() => '---').join('|')}|---|`);
    for (const t of data.tiers) {
      const cost = '€'.repeat(t.cost) + (t.estimate ? `<br><sub>${cell(t.estimate)}</sub>` : '');
      out.push(`| **${cell(t.name)}** | ${cell(t.when)} | ${cost} | ${'●'.repeat(t.ops)} | ${platforms.map((p) => cell(t[p])).join(' | ')} | ${cell(t.tradeoffs)} |`);
    }
    out.push('');
  }
  if (data.extensions) {
    const lvl = { low: 'low', medium: 'medium', high: 'high' };
    out.push('## Extensions', '');
    out.push(`| Extension | When | ${platforms.map((p) => platformLabel[p]).join(' | ')} | Cost impact |`);
    out.push(`|---|---|${platforms.map(() => '---').join('|')}|---|`);
    for (const e of data.extensions) {
      out.push(`| **${cell(e.name)}** | ${cell(e.when)} | ${platforms.map((p) => cell(e[p])).join(' | ')} | ${lvl[e.cost]} |`);
    }
    out.push('');
  }
  if (data.savings) {
    out.push('## How to save', '', ...data.savings.map((x) => `- ${x}`), '');
  }
  out.push(body, '');
  out.push('## Notes by platform', '');
  for (const p of platforms) {
    const pn = data.platforms[p];
    out.push(`### ${platformLabel[p]}`, '', pn.summary, '', ...pn.notes.map((n) => `- ${n}`), '');
  }
  const dir = join(repo, 'architectures', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'README.md'), out.join('\n').replace(/\n{3,}/g, '\n\n'));
}

// catalogue
const cat = [];
cat.push('<!-- Generated by the website export script. -->', '# Architecture catalogue', '');
cat.push('| # | Case | ' + platforms.map((p) => platformLabel[p]).join(' | ') + ' |');
cat.push('|---|---|' + platforms.map(() => '---').join('|') + '|');
let i = 0;
for (const c of categories) {
  const inCat = slugs.filter((s) => caseCategory[s] === c);
  if (!inCat.length) continue;
  cat.push(`| | **${categoryLabel[c][lang]}** |${platforms.map(() => ' |').join('')}`);
  for (const s of inCat) {
    i += 1;
    const { data } = readCase(s);
    const marks = platforms.map((p) => {
      const st = status(s, p);
      return st.label === 'docs' ? '·' : `[${st.label === 'validated' ? '✅' : '📄'}](${s}/${p}/)`;
    });
    cat.push(`| ${String(i).padStart(2, '0')} | [${cell(data.title)}](${s}/) | ${marks.join(' | ')} |`);
  }
}
cat.push('', '✅ Terraform validated · 📄 manifests (compose / Kubernetes) · · design only, code pending', '');
writeFileSync(join(repo, 'architectures', 'README.md'), cat.join('\n'));

// guides
const guidesDir = new URL('../src/content/guides/en/', import.meta.url);
let nGuides = 0;
if (existsSync(guidesDir)) {
  const outDir = join(repo, 'docs', 'guides');
  mkdirSync(outDir, { recursive: true });
  for (const file of readdirSync(guidesDir).filter((x) => x.endsWith('.md')).sort()) {
    const raw = readFileSync(new URL(file, guidesDir), 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    const g = parse(m[1]);
    const slug = file.replace(/\.md$/, '');
    const text = [
      `<!-- Generated from ${site}/en/architecture/guides/${slug}/ content. Edit the website source, then re-export. -->`,
      `# ${g.title}`, '', g.summary, '', m[2].trim(), '',
    ].join('\n');
    writeFileSync(join(outDir, file), text);
    nGuides += 1;
  }
}

console.log(`exported ${slugs.length} cases and ${nGuides} guides to ${repo}`);
