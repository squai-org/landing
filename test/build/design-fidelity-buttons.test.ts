import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.join(import.meta.dirname, '../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const rulesFor = (css: string, selectorPattern: RegExp) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selector = '']) => selectorPattern.test(selector))
    .map(([, , body = '']) => body);

describe('hover de la tarjeta de Datos clave', () => {
  const css = read('src/styles/one-sections.css');
  const backgroundRules = rulesFor(css, /\.one-card-host:is\(:hover, :focus-within\) \.one-card-cta (:is\(\.btn-text, \.btn-arrow\) )?\.btn-bg/);

  it('scale y transform van en reglas de selector distinto para que el minificador no las funda', () => {
    const selectors = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, selector = '', body = '']) => /\.one-card-cta (:is\(\.btn-text, \.btn-arrow\) )?\.btn-bg/.test(selector) && /(^|\n)\s*(scale|transform):/.test(body))
      .map(([, selector = '']) => selector.trim());
    expect(new Set(selectors).size).toBe(2);
  });

  it('comprime el fondo del boton con scale individual', () => {
    expect(backgroundRules.some((body) => /scale:\s*0\.955 0\.925;/.test(body))).toBe(true);
  });

  it('el rebote final del fondo va en un bloque aparte con transform', () => {
    const withTransform = backgroundRules.filter((body) => /transform:\s*scale\(1\.047, 1\.081\);/.test(body));
    expect(withTransform).toHaveLength(1);
    expect(withTransform[0]).not.toMatch(/(^|\n)\s*(scale|translate|rotate):/);
  });

  it('usa las mismas curvas y tiempos que el boton del diseno', () => {
    const body = backgroundRules.join('\n');
    expect(body).toMatch(/scale 0\.15s var\(--ease-soft-overshoot\)/);
    expect(body).toMatch(/transform 0\.35s 0\.15s var\(--button-alt-ease-bounce\)/);
  });
});

describe('boton de envio del formulario', () => {
  const checkout = read('src/components/Checkout.astro');

  it('no estira el texto siempre', () => {
    expect(checkout).not.toMatch(/:global\(\.form-submit \.btn-text\) \{ flex: 1; \}/);
  });

  it('desde 640 px el texto del boton no se estira', () => {
    expect(checkout).toMatch(/@media \(min-width: 640px\) \{\s*:global\(\.form-submit \.btn-block \.btn-text\) \{ flex: initial; \}\s*\}/);
  });
});
