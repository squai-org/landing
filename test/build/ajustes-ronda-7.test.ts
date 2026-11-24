import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { footerBarOverlap } from '../../src/lib/float-lift';

const root = path.join(import.meta.dirname, '../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

describe('botones flotantes sobre la franja inferior del pie', () => {
  it('no suben mientras la franja no ha entrado en pantalla', () => {
    expect(footerBarOverlap(900, 1400)).toBe(0);
    expect(footerBarOverlap(900, 900)).toBe(0);
  });

  it('suben lo que asoma la franja, para no tapar su texto', () => {
    expect(footerBarOverlap(900, 832)).toBe(68);
    expect(footerBarOverlap(900, 767.6)).toBe(132);
  });

  const lift = 'translate: 0 calc(var(--footer-bar-overlap, 0px) * -1);'.replace(/[()*-]/g, '\\$&');

  it('el dock de pausa y volver arriba sube siempre: tapa el copyright, que empieza a 96px', () => {
    expect(read('src/styles/motion.css')).toMatch(new RegExp(`\\.float-dock \\{[^}]*${lift}`));
    expect(read('src/layouts/Layout.astro')).toContain('bindFloatLift()');
  });

  it('WhatsApp solo sube por debajo de 640px: desde ahi cabe en los 96px de margen derecho de la franja', () => {
    const whatsapp = read('src/components/WhatsAppButton.astro');
    expect(whatsapp).not.toMatch(new RegExp(`\\.whatsapp-float \\{\\s+position: fixed;[^}]*${lift}`));
    expect(whatsapp).toMatch(new RegExp(`@media \\(max-width: 639px\\) \\{\\s*\\.whatsapp-float \\{ ${lift} \\}`));
  });
});
