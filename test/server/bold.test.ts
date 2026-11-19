import { describe, expect, it } from 'vitest';
import { boldIntegritySignature } from '../../src/server/lib/bold';

/**
 * El vector de prueba sale del manual de integracion de Bold: la cadena que se
 * firma es {Identificador}{Monto}{Divisa}{LlaveSecreta} sin separadores, y el
 * ejemplo publicado es inv0334 + 39400 + COP + kgfq2nN0o52XqnuXZWIN2F.
 * https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-manual
 *
 * El hash esperado se calculo aparte con node:crypto sobre esa cadena, no con
 * esta implementacion: si el orden de concatenacion o la codificacion cambian,
 * el valor deja de coincidir.
 */
describe('boldIntegritySignature', () => {
  it('reproduce el ejemplo publicado por Bold', async () => {
    await expect(
      boldIntegritySignature({
        orderId: 'inv0334',
        amount: 39400,
        currency: 'COP',
        secretKey: 'kgfq2nN0o52XqnuXZWIN2F',
      })
    ).resolves.toBe('620a64c6eab8858d0f96d4f818a1d77be5e9b9eb9dc681f527de1af54fc1b739');
  });

  /**
   * Bold exige el monto como entero sin decimales. Un 39400.5 se convertiria
   * en la cadena "39400.5", Bold firmaria otra cosa y el checkout abriria con
   * "firma invalida" sin decir por que: mejor fallar aqui.
   */
  it('rechaza montos con decimales', async () => {
    await expect(
      boldIntegritySignature({
        orderId: 'inv0334',
        amount: 39400.5,
        currency: 'COP',
        secretKey: 'kgfq2nN0o52XqnuXZWIN2F',
      })
    ).rejects.toThrow(/entero/i);
  });
});
