import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(path.join(import.meta.dirname, '../../src/components/Checkout.astro'), 'utf8').replace(/\r\n/g, '\n');
const styles = source.slice(source.indexOf('<style>'));

const desktop = () => {
  const start = styles.indexOf('@media (min-width: 1024px)');
  return styles.slice(start, styles.indexOf('@media (prefers-reduced-motion', start));
};

const rule = (css: string, selector: string) => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? '' : css.slice(start, css.indexOf('}', start));
};

describe('formulario de compra en escritorio', () => {
  it('fija las filas de dos campos con 10px entre grupos', () => {
    const css = desktop();

    expect(rule(css, '.checkout-card .one-signup-row')).toMatch(/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(rule(css, '.checkout-card form')).toContain('gap: 10px');
    expect(rule(css, '.checkout-card .one-signup-row')).toContain('gap: 10px');
  });

  it('pone el Turnstile justo despues de los checks, en la misma fila', () => {
    const css = desktop();
    const row = rule(css, '.checkout-consent-row');

    expect(row).toContain('display: grid');
    expect(row).toMatch(/grid-template-columns: minmax\(0, max-content\) auto/);
    expect(row).toContain('justify-content: start');
    expect(rule(css, '.checkout-consent-row :global(.turnstile-wrap)')).toContain('margin-top: 0');
  });

  it('pone el Precio de referencia a la derecha del vigente sin tocar sus tamanos', () => {
    const css = desktop();

    expect(rule(css, '.checkout-price-group')).toContain('grid-template-columns: auto minmax(0, 1fr)');
    expect(rule(css, '.checkout-reference-offer')).toContain('display: contents');
    expect(rule(css, '.checkout-discount-line')).toContain('grid-column: 1 / -1');
    expect(styles).toMatch(/\.checkout-price-line \{[^}]*font-size: clamp\(2\.5rem, 3\.8vw, 3\.5rem\)/);
    expect(styles).toMatch(/\.checkout-reference-line \{[^}]*font-size: max\(17px, calc\(var\(--u\) \* 20\)\)/);
  });

  it('en movil los checks y el Turnstile siguen apilados', () => {
    const base = styles.slice(0, styles.indexOf('@media (min-width: 1024px)'));

    expect(rule(base, '.checkout-consent-row')).toContain('flex-direction: column');
    expect(base).not.toMatch(/\.checkout-consent-row \{[^}]*display: grid/);
  });
});
