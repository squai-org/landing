/**
 * Dominio canonico. Debe coincidir con `site` en astro.config.mjs. Vive en
 * src/config para que lo lean el sitio (src/lib/seo.ts lo reexporta) y el
 * Worker (enlaces de los correos) sin importar codigo del front.
 */
export const SITE_URL = 'https://squai.io';
