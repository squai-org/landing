import { describe, expect, it } from 'vitest';
import { verifyBoldWebhookSignature } from '../../src/server/lib/bold';
import { APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE, TEST_SECRET_KEY } from '../fixtures/bold';

/**
 * Bold firma el webhook asi: base64 del cuerpo crudo, HMAC-SHA256 de esa
 * cadena con la llave secreta, salida en hexadecimal, y lo manda en la
 * cabecera x-bold-signature.
 * https://developers.bold.co/webhook
 */
describe('verifyBoldWebhookSignature', () => {
  it('acepta la firma que calcula Bold', async () => {
    await expect(
      verifyBoldWebhookSignature(TEST_SECRET_KEY, APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE)
    ).resolves.toBe(true);
  });

  it('rechaza un cuerpo alterado con la firma original', async () => {
    const tampered = APPROVED_SALE_BODY.replace('"total":399000', '"total":1000');

    await expect(
      verifyBoldWebhookSignature(TEST_SECRET_KEY, tampered, APPROVED_SALE_SIGNATURE)
    ).resolves.toBe(false);
  });

  it('rechaza una firma ausente o de otra longitud sin lanzar', async () => {
    await expect(verifyBoldWebhookSignature(TEST_SECRET_KEY, APPROVED_SALE_BODY, undefined)).resolves.toBe(false);
    await expect(verifyBoldWebhookSignature(TEST_SECRET_KEY, APPROVED_SALE_BODY, 'abc')).resolves.toBe(false);
  });
});
