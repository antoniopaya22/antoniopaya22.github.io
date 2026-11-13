import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://antoniopaya22.github.io',
  integrations: [
    sitemap({
      // hreflang alternates between / and /en/ plus a lastmod for every URL
      i18n: { defaultLocale: 'es', locales: { es: 'es', en: 'en' } },
      lastmod: new Date(),
      // image sitemap entry: tells Google Images which photo belongs to the person
      serialize(item) {
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
