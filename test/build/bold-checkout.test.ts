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
  tax: 'vat-19',
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

  it('declara a Bold el impuesto que firmo el Worker y cobra en la moneda elegida', () => {
    const usd = { ...session, amount: 147, currency: 'USD' };

    expect(boldCheckoutConfig(usd, 'https://squai.io/x')).toMatchObject({
      amount: '147',
      currency: 'USD',
      tax: 'vat-19',
    });
  });

  it('devuelve al comprador a la URL indicada', () => {
    expect(boldCheckoutConfig(session, 'https://squai.io/servicios/squai-one').redirectionUrl).toBe(
      'https://squai.io/servicios/squai-one'
    );
  });

  it('prellena el formulario de Bold con los datos del comprador, como texto JSON', () => {
    const customer = { fullName: 'Ana Perez', email: 'ana@example.com', phone: '3001234567', dialCode: '+57' };

    const config = boldCheckoutConfig(session, 'https://squai.io/gracias', customer);

    expect(JSON.parse(config.customerData as string)).toEqual(customer);
  });

  it('no manda customerData si no hay datos del comprador', () => {
    expect(boldCheckoutConfig(session, 'https://squai.io/gracias')).not.toHaveProperty('customerData');
  });
});
