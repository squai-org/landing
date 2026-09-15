// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cspHeaders from './src/integrations/csp-headers.mjs';

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

    // El CSS viaja dentro del HTML en vez de en peticiones aparte. La home
    // cargaba tres hojas (index, Footer, ContactModal) antes de poder pintar,
    // y el elemento LCP es texto del hero, asi que esa cadena de peticiones
    // era lo que gobernaba la metrica.
    //
    // Medido con Slow 4G (1.6 Mbps, 150 ms de RTT) y CPU 4x, mediana de 7
    // ejecuciones sobre el build: LCP 1276 ms -> 680 ms, FCP 1276 ms -> 656 ms,
    // 16 -> 13 peticiones, con los bytes transferidos practicamente iguales
    // (207.7 -> 206.7 kB): el CSS no desaparece, cambia de sitio.
    //
    // El coste es que cada pagina lleva su propio CSS y deja de compartirlo en
    // cache entre navegaciones. Para una landing, donde la mayoria de visitas
    // son primeras visitas, la primera pintura pesa mas.
    // https://docs.astro.build/en/reference/configuration-reference/#buildinlinestylesheets
    inlineStylesheets: 'always',
  },

  integrations: [
    // Genera /sitemap-index.xml + /sitemap-0.xml en build a partir de las
    // páginas de src/pages (incluidas las rutas dinámicas de servicios).
    // https://docs.astro.build/en/guides/integrations-guide/sitemap/
    sitemap(),

    // Escribe la Content-Security-Policy en dist/_headers con los hashes de
    // los scripts que Astro incrusta en el HTML. El resto de cabeceras de
    // seguridad vive en public/_headers, que no depende del build.
    cspHeaders(),
  ],
});
