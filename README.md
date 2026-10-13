# antoniopaya22.github.io

Personal website of **Antonio Payá González** — Software Architect at TheNextPangea, Lecturer at UNIR and PhD in Computer Engineering.

🌐 **Live:** [antoniopaya22.github.io](https://antoniopaya22.github.io) · [English](https://antoniopaya22.github.io/en/)

## Stack

- [Astro](https://astro.build) static site, bilingual (ES/EN) via `src/i18n/translations.ts`
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
├── components/   # page sections (Hero, About, Experience, Teaching, ...)
├── i18n/         # all copy in Spanish and English
├── layouts/      # base layout, meta tags and structured data
└── pages/        # / (es) and /en/
public/           # images, CV, favicon, robots.txt
```
