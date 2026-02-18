import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://antoniopaya22.github.io',
  integrations: [sitemap()],
});
