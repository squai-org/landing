import copies from '../../content/copies.json';

/**
 * Textos que el Worker pone en los correos, del mismo contenido que se edita en
 * Pages CMS (src/content/copies.json). El Worker no importa src/content/schema.ts
 * para no cargar una segunda copia de zod (la de Astro): el contrato lo valida
 * `astro build`, que corre antes de cada despliegue del Worker, y TypeScript
 * comprueba aqui que las claves existen.
 */
export const confirmationEmailCopy = copies.site.ui.checkout.confirmationEmail;

/** Datos de Squai del acuse de recibo (Ley 1480 art. 50). */
export const company = copies.site.company;
