import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(path.join(import.meta.dirname, '../../src/components/Checkout.astro'), 'utf8').replace(/\r\n/g, '\n');
const styles = source.slice(source.indexOf('<style>'));
const markup = source.slice(0, source.indexOf('<style>'));

const desktopStart = styles.indexOf('@media (min-width: 1024px)');
const base = styles.slice(0, desktopStart);
const desktop = styles.slice(desktopStart, styles.indexOf('@media (prefers-reduced-motion', desktopStart));

const rule = (css: string, selector: string) => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? '' : css.slice(start, css.indexOf('}', start));
};

describe('orden de la seccion de compra', () => {
  it('en movil no reordena con CSS: sin order ni flex-direction inverso', () => {
    expect(base).not.toMatch(/\border:\s*-?\d/);
    expect(base).not.toMatch(/column-reverse|row-reverse/);
  });

  it('en el marcado el formulario va antes que lo que incluye y las fechas', () => {
    const form = markup.indexOf('class="checkout-form-column');
    expect(form).toBeGreaterThan(markup.indexOf('checkout-seats'));
    expect(form).toBeLessThan(markup.indexOf('checkout-summary'));
  });

  it('en escritorio la tarjeta ocupa la columna derecha y el resumen queda a la izquierda', () => {
    expect(rule(desktop, '.checkout-form-column')).toMatch(/grid-column: 6 \/ -1/);
    expect(rule(desktop, '.checkout-form-column')).toMatch(/grid-row: 1 \/ span 2/);
    expect(rule(desktop, '.checkout-summary')).toMatch(/grid-column: 1 \/ span 5/);
  });
});
