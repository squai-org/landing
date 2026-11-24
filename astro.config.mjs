import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cspHeaders from './src/integrations/csp-headers.mjs';

const PRODUCTION_BRANCH = 'main';
const branch = process.env.WORKERS_CI_BRANCH;
const testSiteKey = process.env.PUBLIC_TURNSTILE_SITE_KEY_TEST;
const useTestSiteKey = Boolean(branch && branch !== PRODUCTION_BRANCH && testSiteKey);

export default defineConfig({
  site: 'https://squai.io',
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  vite: useTestSiteKey
    ? { define: { 'import.meta.env.PUBLIC_TURNSTILE_SITE_KEY': JSON.stringify(testSiteKey) } }
    : {},
  trailingSlash: 'never',
  build: {
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
    sitemap({ filter: (page) => !page.endsWith('/gracias') && !page.endsWith('/retomar') }),

    // Escribe la Content-Security-Policy en dist/_headers con los hashes de
    // los scripts que Astro incrusta en el HTML. El resto de cabeceras de
    // seguridad vive en public/_headers, que no depende del build.
    cspHeaders(),
  ],
});
