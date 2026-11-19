import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBoldPaymentStatus } from '../../src/server/lib/bold';
import { TEST_IDENTITY_KEY } from '../fixtures/bold';

/**
 * Consulta de transacciones del Boton de pagos. El identificador de la ruta es
 * el mismo data-order-id que se firmo, y la cabecera lleva la LLAVE DE
 * IDENTIDAD, no la secreta.
 * https://developers.bold.co/pagos-en-linea/boton-de-pagos/consulta-de-transacciones
 */
const mockJson = (body: unknown, status = 200) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  );

afterEach(() => vi.restoreAllMocks());

describe('fetchBoldPaymentStatus', () => {
  it('consulta el voucher con la llave de identidad y devuelve el pago aprobado', async () => {
    const fetchMock = mockJson({
      link_id: 'BTN_BJDNPZZDC5',
      transaction_id: 'TXN0987654321',
      total: 399000,
      subtotal: 399000,
      description: 'Fundamentos de Inteligencia Artificial Generativa',
      reference_id: 'squai-one-abc123',
      payment_method: 'CREDIT_CARD',
      payer_email: 'comprador@squai.io',
      transaction_date: '2026-11-19 17:27:16-05:00',
      payment_status: 'APPROVED',
    });

    const voucher = await fetchBoldPaymentStatus(TEST_IDENTITY_KEY, 'squai-one-abc123');

    expect(voucher).toMatchObject({
      status: 'APPROVED',
      transactionId: 'TXN0987654321',
      total: 399000,
      paymentMethod: 'CREDIT_CARD',
      payerEmail: 'comprador@squai.io',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://payments.api.bold.co/v2/payment-voucher/squai-one-abc123');
    expect(new Headers(init.headers).get('Authorization')).toBe(`x-api-key ${TEST_IDENTITY_KEY}`);
  });

  it('devuelve NO_TRANSACTION_FOUND cuando todavia no hay intento de pago', async () => {
    mockJson({ link_id: 'BTN_X', total: 399000, subtotal: 399000, reference_id: 'squai-one-abc123', payment_status: 'NO_TRANSACTION_FOUND' });

    await expect(fetchBoldPaymentStatus(TEST_IDENTITY_KEY, 'squai-one-abc123')).resolves.toMatchObject({
      status: 'NO_TRANSACTION_FOUND',
      transactionId: null,
    });
  });

  it('escapa el identificador en la URL', async () => {
    const fetchMock = mockJson({ payment_status: 'NO_TRANSACTION_FOUND' });

    await fetchBoldPaymentStatus(TEST_IDENTITY_KEY, 'orden rara/../otra');

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://payments.api.bold.co/v2/payment-voucher/orden%20rara%2F..%2Fotra'
    );
  });

  it('lanza cuando Bold rechaza la llave', async () => {
    mockJson({ message: 'Unauthorized' }, 401);

    await expect(fetchBoldPaymentStatus(TEST_IDENTITY_KEY, 'squai-one-abc123')).rejects.toThrow(/401/);
  });
});
