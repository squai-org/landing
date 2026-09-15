import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://squai.io',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },

  integrations: [
    sitemap(),
  ],
});
