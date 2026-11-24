import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://antoniopaya22.github.io';
// project and architecture pages live under a translated segment, so the i18n option cannot pair them
const translated = [['proyectos', 'projects'], ['arquitectura', 'architecture']];
const projectPair = (url) => {
  for (const [es, en] of translated) {
    const m = url.match(new RegExp(`^https://[^/]+/(?:${es}|en/${en})/(.*)$`));
    if (m) return [
      { lang: 'es', url: `${SITE}/${es}/${m[1]}` },
      { lang: 'en', url: `${SITE}/en/${en}/${m[1]}` },
    ];
  }
  return undefined;
};

export default defineConfig({
  site: 'https://antoniopaya22.github.io',
  integrations: [
    sitemap({
      // hreflang alternates between / and /en/ plus a lastmod for every URL
      i18n: { defaultLocale: 'es', locales: { es: 'es', en: 'en' } },
      lastmod: new Date(),
      // image sitemap entry: tells Google Images which photo belongs to the person
      serialize(item) {
        const pair = projectPair(item.url);
        if (pair) item.links = pair;
        if (/\.io\/(en\/)?$/.test(item.url)) {
          item.img = [{
            url: 'https://antoniopaya22.github.io/images/antonio-paya-gonzalez.jpg',
            title: 'Antonio Payá González',
            caption: 'Antonio Payá González — Software Architect, Professor at UNIR and PhD',
          }];
        }
        return item;
      },
    }),
  ],
  markdown: {
    // both palettes are emitted as CSS variables; Layout picks one per theme
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false },
  },
  build: {
    // inline CSS to avoid render-blocking stylesheet requests
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      // emit every script as an external file so the CSP can stay strict (script-src 'self')
      assetsInlineLimit: 0,
    },
  },
});
