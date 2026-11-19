import { env } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/server/index';
import { TEST_IDENTITY_KEY, TEST_SECRET_KEY } from '../fixtures/bold';

const withKeys = { ...env, BOLD_IDENTITY_KEY: TEST_IDENTITY_KEY, BOLD_SECRET_KEY: TEST_SECRET_KEY };

const ORDER_ID = 'squai-one-0123456789abcdef0123456789abcdef';

/** Respuesta del voucher de Bold, el unico veredicto que cuenta. */
const mockVoucher = (payment_status: string, extra: Record<string, unknown> = {}) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify({ payment_status, reference_id: ORDER_ID, ...extra }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );

const getStatus = (orderId: string) =>
  app.request(
    `https://squai.io/api/checkout/status?order_id=${encodeURIComponent(orderId)}`,
    { headers: { Origin: 'https://squai.io' } },
    withKeys
  );

const seedEnrollment = () =>
  env.DB.prepare(
    `INSERT INTO enrollments
      (order_id, plan_code, full_name, email, country_code, phone, phone_e164, referral_source, amount, currency)
     VALUES (?, 'squai-one', 'Ana Rios', 'ana@empresa.co', '+57', '3205551234', '+573205551234', 'instagram', 399000, 'COP')`
  )
    .bind(ORDER_ID)
    .run();

beforeEach(async () => {
  await env.DB.exec('DELETE FROM enrollments');
  await seedEnrollment();
});

afterEach(() => vi.restoreAllMocks());

describe('GET /api/checkout/status', () => {
  it('confirma la inscripcion cuando Bold responde APPROVED', async () => {
    mockVoucher('APPROVED', { transaction_id: 'TXN123', payment_method: 'CREDIT_CARD' });

    const res = await getStatus(ORDER_ID);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      enrollment: { status: 'approved', fullName: 'Ana Rios', amount: 399000, currency: 'COP' },
    });

    const row = await env.DB.prepare('SELECT status, bold_transaction_id, confirmed_at FROM enrollments').first<
      Record<string, unknown>
    >();
    expect(row).toMatchObject({ status: 'approved', bold_transaction_id: 'TXN123' });
    expect(row?.confirmed_at).toEqual(expect.any(String));
  });

  it('no confia en lo que diga la URL: con REJECTED no aprueba nada', async () => {
    mockVoucher('REJECTED');

    const res = await app.request(
      `https://squai.io/api/checkout/status?order_id=${ORDER_ID}&bold-tx-status=approved`,
      { headers: { Origin: 'https://squai.io' } },
      withKeys
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ enrollment: { status: 'rejected' } });

    const row = await env.DB.prepare('SELECT status FROM enrollments').first();
    expect(row).toMatchObject({ status: 'rejected' });
  });

  it('deja la inscripcion pendiente mientras Bold no ve el intento', async () => {
    mockVoucher('NO_TRANSACTION_FOUND');

    await expect((await getStatus(ORDER_ID)).json()).resolves.toMatchObject({
      enrollment: { status: 'pending' },
    });
  });

  it('traduce PROCESSING sin darlo por pagado', async () => {
    mockVoucher('PROCESSING');

    await expect((await getStatus(ORDER_ID)).json()).resolves.toMatchObject({
      enrollment: { status: 'processing' },
    });
  });

  it('no vuelve a preguntar a Bold si ya esta confirmada', async () => {
    mockVoucher('APPROVED', { transaction_id: 'TXN123' });
    await getStatus(ORDER_ID);

    // spyOn reutiliza el espia ya instalado, asi que arrastra la llamada
    // anterior: se limpia el historial para medir solo la segunda consulta.
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockClear();
    const res = await getStatus(ORDER_ID);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ enrollment: { status: 'approved' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('responde 404 con un order id desconocido', async () => {
    const res = await getStatus('squai-one-noexiste');

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'enrollment_not_found' } });
  });

  it('responde 400 si no llega order_id', async () => {
    const res = await app.request('https://squai.io/api/checkout/status', { headers: { Origin: 'https://squai.io' } }, withKeys);
    expect(res.status).toBe(400);
  });

  it('nunca devuelve datos de contacto de la persona', async () => {
    mockVoucher('APPROVED', { transaction_id: 'TXN123' });

    const body = await (await getStatus(ORDER_ID)).text();

    expect(body).not.toContain('ana@empresa.co');
    expect(body).not.toContain('3205551234');
  });
});
