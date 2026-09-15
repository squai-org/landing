/* ---------------------------------------------------------------------------
   Genera los recursos de imagen que no puede producir el build de Astro:

     public/og/squai-og.png    1200x630  tarjeta de Open Graph / Twitter
     public/og/squai-logo.png  1200x400  logo sobre fondo claro, para el
                                          campo `logo` de la Organization
     public/apple-touch-icon.png 180x180

   Todo sale del lockup vectorial de marca (scripts/logo-lockup.svg), así que
   no hace falta ninguna fuente instalada en la máquina que corra el script.
   Fondo `--canvas` (#F4F6FF) en los tres: es el fondo de la marca. La imagen
   social no puede ser transparente — cada red la compone sobre su propio
   color y el wordmark en tinta desaparecería en los temas oscuros.

   Tamaño 1200x630: es el que recomiendan Open Graph y las tarjetas grandes de
   X para que la imagen no se recorte.
   https://developers.facebook.com/docs/sharing/webmasters/images/
   https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image

   Uso: pnpm og
--------------------------------------------------------------------------- */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const CANVAS = '#F4F6FF';
const LIGHT_INK = '#F0F2FF';

const lockup = await readFile(join(here, 'logo-lockup.svg'), 'utf8');

/** El lockup trae el wordmark en tinta oscura; sobre fondo oscuro va en claro. */
const lockupOn = (background) =>
  background === 'dark' ? lockup.replaceAll('fill:#0a0c1a', `fill:${LIGHT_INK}`) : lockup;

/** Renderiza un SVG a PNG al tamaño pedido. */
const render = async (svg, out) => {
  await mkdir(dirname(out), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log('✓', out.replace(`${root}/`, ''));
};

/* --- Tarjeta social 1200x630 ---------------------------------------------- */

const LOCKUP_W = 620;
const LOCKUP_H = (LOCKUP_W * 75) / 225;

const ogCard = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${CANVAS}" />
  <g transform="translate(${(1200 - LOCKUP_W) / 2}, ${(630 - LOCKUP_H) / 2}) scale(${LOCKUP_W / 225})">
    ${lockupOn('light').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}
  </g>
</svg>`;

await render(ogCard, join(root, 'public/og/squai-og.png'));

/* --- Logo para schema.org (fondo claro, proporción cercana a 1200x400) ----- */

const LOGO_W = 780;
const LOGO_H = (LOGO_W * 75) / 225;

const logoCard = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400">
  <rect width="1200" height="400" fill="${CANVAS}" />
  <g transform="translate(${(1200 - LOGO_W) / 2}, ${(400 - LOGO_H) / 2}) scale(${LOGO_W / 225})">
    ${lockupOn('light').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}
  </g>
</svg>`;

await render(logoCard, join(root, 'public/og/squai-logo.png'));

/* --- Apple touch icon: solo el isotipo, sobre el fondo de marca ------------ */

const favicon = await readFile(join(root, 'public/favicon.svg'), 'utf8');
const mark = favicon.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const touchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="38" fill="${CANVAS}" />
  <svg x="26" y="26" width="128" height="128" viewBox="278 283 452 459">${mark}</svg>
</svg>`;

await render(touchIcon, join(root, 'public/apple-touch-icon.png'));
