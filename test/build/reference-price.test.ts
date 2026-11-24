import { describe, expect, it } from 'vitest';
import { discountedReference } from '../../src/lib/reference-price';
import { fillTemplate } from '../../src/lib/template';

const reference = { COP: 499000, USD: 159 };

describe('Precio de referencia', () => {
  it('se muestra cuando el Precio vigente es menor', () => {
    expect(discountedReference(reference, { COP: 399000, USD: 129 }, 'COP')).toBe(499000);
    expect(discountedReference(reference, { COP: 399000, USD: 129 }, 'USD')).toBe(159);
  });

  it('se oculta cuando el Precio vigente es igual o mayor', () => {
    expect(discountedReference(reference, { COP: 499000 }, 'COP')).toBeUndefined();
    expect(discountedReference(reference, { COP: 599000 }, 'COP')).toBeUndefined();
  });

  it('se oculta si falta el de referencia o el vigente de esa moneda', () => {
    expect(discountedReference({}, { COP: 399000 }, 'COP')).toBeUndefined();
    expect(discountedReference({ COP: 499000 }, { COP: 399000 }, 'USD')).toBeUndefined();
    expect(discountedReference(reference, {}, 'COP')).toBeUndefined();
  });

  it('cada moneda se compara con su propio precio', () => {
    expect(discountedReference(reference, { COP: 399000, USD: 159 }, 'USD')).toBeUndefined();
    expect(discountedReference(reference, { COP: 399000, USD: 159 }, 'COP')).toBe(499000);
  });

  it('rellena las plantillas del contenido', () => {
    expect(fillTemplate('{percent} % de descuento', { percent: '20' })).toBe('20 % de descuento');
    expect(fillTemplate('Hasta el {date}', { date: '15 de diciembre' })).toBe('Hasta el 15 de diciembre');
  });
});
