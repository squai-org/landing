import { describe, expect, it } from 'vitest';
import { boldCheckoutConfig } from '../../src/lib/bold-checkout';

/**
 * El boton de pagos es del sitio y la libreria de Bold solo abre el modal, con
 * la "integracion personalizada": new BoldCheckout(config).open(), donde la
 * config usa camelCase en vez de los atributos data-* del script.
 * https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-personalizada
 */
const session = {
  apiKey: 'identity-key',
  orderId: 'squai-one-123',
  amount: 399000,
  currency: 'COP',
  description: 'Squai One',
  integritySignature: 'abc123',
};

describe('boldCheckoutConfig', () => {
  it('abre el checkout embebido (modal) y no redirige', () => {
    expect(boldCheckoutConfig(session, 'https://squai.io/servicios/squai-one').renderMode).toBe('embedded');
  });

  it('pasa a Bold lo que firmo el Worker, con el monto como texto', () => {
    expect(boldCheckoutConfig(session, 'https://squai.io/x')).toMatchObject({
      apiKey: 'identity-key',
      orderId: 'squai-one-123',
      amount: '399000',
      currency: 'COP',
      description: 'Squai One',
      integritySignature: 'abc123',
    });
  });

  it('devuelve al comprador a la URL indicada', () => {
    expect(boldCheckoutConfig(session, 'https://squai.io/servicios/squai-one').redirectionUrl).toBe(
      'https://squai.io/servicios/squai-one'
    );
  });
});
