// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Dominio canónico. Sin `site` no hay URLs absolutas para canonical, Open
  // Graph ni sitemap. https://docs.astro.build/en/reference/configuration-reference/#site
  // Debe coincidir con SITE_URL de src/data/seo.ts.
  site: 'https://squai.io',

  // Una sola forma de URL para cada página: sin barra final. El canonical, los
  // enlaces internos y el sitemap tienen que coincidir exactamente o Google
  // trata /ruta y /ruta/ como duplicados.
  // https://docs.astro.build/en/reference/configuration-reference/#trailingslash
  trailingSlash: 'never',
  build: {
    // `file` emite /servicios/squai-one.html en vez de /servicios/squai-one/index.html,
    // que es lo coherente con trailingSlash: 'never'.
    // https://docs.astro.build/en/reference/configuration-reference/#buildformat
    format: 'file',
  },

  integrations: [
    // Genera /sitemap-index.xml + /sitemap-0.xml en build a partir de las
    // páginas de src/pages (incluidas las rutas dinámicas de servicios).
    // https://docs.astro.build/en/guides/integrations-guide/sitemap/
    sitemap(),
  ],
});
