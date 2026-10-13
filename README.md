# antoniopaya22.github.io

Personal website of **Antonio Payá González** — Software Architect at TheNextPangea, Professor at UNIR and PhD in Computer Engineering.

🌐 **Live:** [antoniopaya22.github.io](https://antoniopaya22.github.io) · [English](https://antoniopaya22.github.io/en/)

## Stack

- [Astro](https://astro.build) static site, bilingual (ES/EN) via `src/i18n/translations.ts`
- Playwright end-to-end + axe accessibility tests (`npm test`), run in CI before every deploy
- Editorial design: Instrument Serif, Schibsted Grotesk and IBM Plex Mono; light/dark themes
- SEO: JSON-LD (`Person`, `WebSite`), Open Graph, hreflang, sitemap
- Deployed to GitHub Pages with GitHub Actions on every push to `master`

## Development

```bash
npm ci
npm run dev      # http://localhost:4321
npm run build    # output in dist/
```

Requires Node.js 22.12+.

## Structure

```
src/
├── components/   # page sections (Hero, About, Experience, Teaching, Research, ...)
├── data/         # language-independent data (publications, profiles)
├── i18n/         # all copy in Spanish and English
├── layouts/      # base layout, meta tags and structured data
└── pages/        # / (es) and /en/
public/           # images, CV, favicon, robots.txt
```
