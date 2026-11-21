/**
 * Rutas de las paginas legales. Son los nombres de archivo en src/pages
 * (terminos-de-servicio.astro, politica-de-privacidad.astro): si uno cambia,
 * cambia aqui. Las usan los formularios, el footer, llms.txt y el correo de
 * confirmacion (el enlace al derecho de retracto).
 */
export const legalPaths = {
  terms: '/terminos-de-servicio',
  privacy: '/politica-de-privacidad',
} as const;
