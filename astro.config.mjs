import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://antoniopaya22.github.io',
  integrations: [sitemap()],
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
