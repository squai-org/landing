import { env } from 'cloudflare:test';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/server/index';
import { TEST_IDENTITY_KEY, TEST_SECRET_KEY } from '../fixtures/bold';

/**
 * Retomar una orden sin pagar (POST /api/checkout/resume). El enlace solo
 * lleva el order_id; el Worker consulta a Bold por la orden anterior y, si no
 * se pago, abre una orden nueva del mismo cliente con el precio vigente.
 */
const withKeys = { ...env, BOLD_IDENTITY_KEY: TEST_IDENTITY_KEY, BOLD_SECRET_KEY: TEST_SECRET_KEY };

let ipCounter = 0;
const nextIp = () => `198.51.100.${++ipCounter % 250}`;

/** Programas propios: abiertos de 2020 a 2100, y uno cerrado a mano. */
const PROGRAM = 'programa-retomar';
const CLOSED = 'programa-retomar-cerrado';
const PREVIOUS = `${PROGRAM}-orden-anterior`;
const DAY_MS = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO programs (code, description, closed_manually) VALUES (?1, 'Programa para retomar', 0), (?2, 'Programa cerrado', 1)
       ON CONFLICT (code) DO NOTHING`
    ).bind(PROGRAM, CLOSED),
    // El precio de USD cambio despues de la orden anterior: la nueva cobra el vigente.
    env.DB.prepare(
      `INSERT INTO program_prices (program_code, currency, amount, valid_from) VALUES
         (?1, 'COP', 250000, '2020-01-01T05:00:00.000Z'),
         (?1, 'USD', 80, '2020-01-01T05:00:00.000Z'),
         (?1, 'USD', 95, '2021-01-01T05:00:00.000Z'),
         (?2, 'COP', 250000, '2020-01-01T05:00:00.000Z')
       ON CONFLICT DO NOTHING`
    ).bind(PROGRAM, CLOSED),
    env.DB.prepare(
      `INSERT INTO program_limits (program_code, opens_at, closes_at, capacity) VALUES
         (?1, '2020-01-01T05:00:00.000Z', '2100-01-01T05:00:00.000Z', 1000),
         (?2, '2020-01-01T05:00:00.000Z', '2100-01-01T05:00:00.000Z', 1000)
       ON CONFLICT DO NOTHING`
    ).bind(PROGRAM, CLOSED),
  ]);
});

let customerId = 0;

/** Una orden anterior del cliente; por defecto pendiente, en USD y de hace 2 horas. */
const seedOrder = async ({
  orderId = PREVIOUS,
  program = PROGRAM,
  status = 'pending',
  currency = 'USD',
  amount = 80,
  createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
} = {}) => {
  await env.DB.prepare(
    `INSERT INTO orders (order_id, customer_id, program_code, status, referral_source, amount, currency, tax, created_at)
     VALUES (?, ?, ?, ?, 'linkedin', ?, ?, 'vat-19', ?)`
  )
    .bind(orderId, customerId, program, status, amount, currency, createdAt)
    .run();
};

beforeEach(async () => {
  await env.DB.exec('DELETE FROM orders');
  await env.DB.exec('DELETE FROM customers');
  const customer = await env.DB.prepare(
    `INSERT INTO customers (email, full_name, country_code, phone, phone_e164)
     VALUES ('ana@empresa.co', 'Ana Rios', '+57', '3205551234', '+573205551234') RETURNING id`
  ).first<{ id: number }>();
  customerId = customer!.id;
});

afterEach(() => vi.restoreAllMocks());

/** Respuesta del voucher de Bold para la orden anterior. */
const mockVoucher = (payment_status: string, extra: Record<string, unknown> = {}) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify({ payment_status, reference_id: PREVIOUS, ...extra }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );

const postResume = (body: unknown, headers: Record<string, string> = {}) =>
  app.request(
    'https://squai.io/api/checkout/resume',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://squai.io',
        'CF-Connecting-IP': nextIp(),
        ...headers,
      },
      body: JSON.stringify(body),
    },
    withKeys
  );

const orders = async () =>
  (
    await env.DB.prepare(
      'SELECT order_id, customer_id, program_code, status, amount, currency, tax, referral_source FROM orders ORDER BY id'
    ).all<Record<string, unknown>>()
  ).results;

describe('POST /api/checkout/resume', () => {
  it('responde 404 order_not_found con un order_id que no existe', async () => {
    const res = await postResume({ order_id: 'programa-retomar-no-existe' });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: { code: 'order_not_found' } });
  });

  it('sin pago en Bold abre una orden nueva del mismo cliente, al precio vigente en la moneda anterior', async () => {
    await seedOrder();
    const fetchMock = mockVoucher('NO_TRANSACTION_FOUND');

    const res = await postResume({ order_id: PREVIOUS });

    expect(res.status).toBe(201);
    const body = await res.text();
    const { session } = JSON.parse(body) as {
      session: { apiKey: string; orderId: string; amount: number; currency: string; tax: string; integritySignature: string };
    };

    // Se pregunto a Bold por la orden anterior, con la llave de identidad.
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`https://payments.api.bold.co/v2/payment-voucher/${PREVIOUS}`);

    expect(session).toMatchObject({ apiKey: TEST_IDENTITY_KEY, amount: 95, currency: 'USD', tax: 'vat-19' });
    expect(session.orderId).not.toBe(PREVIOUS);
    expect(session.orderId).toMatch(/^programa-retomar-[a-f0-9]+$/);
    // SHA-256 de `${orderId}95USD${secreto}`, calculado aparte de src/server/lib/bold.ts.
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${session.orderId}95USD${TEST_SECRET_KEY}`)
    );
    expect(session.integritySignature).toBe(
      [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    );
    expect(body).not.toContain(TEST_SECRET_KEY);
    // La respuesta no expone los datos de contacto: el enlace puede reenviarse.
    expect(body).not.toContain('ana@empresa.co');
    expect(body).not.toContain('3205551234');

    expect(await orders()).toEqual([
      expect.objectContaining({ order_id: PREVIOUS, status: 'pending', amount: 80 }),
      {
        order_id: session.orderId,
        customer_id: customerId,
        program_code: PROGRAM,
        status: 'pending',
        amount: 95,
        currency: 'USD',
        tax: 'vat-19',
        referral_source: 'linkedin',
      },
    ]);
    const { results: customers } = await env.DB.prepare('SELECT id FROM customers').all();
    expect(customers).toEqual([{ id: customerId }]);
  });

  it('si Bold aprobo la orden anterior la confirma y manda a /gracias sin abrir otra', async () => {
    await seedOrder();
    mockVoucher('APPROVED', { transaction_id: 'TXN-RETOMAR', payment_method: 'CREDIT_CARD' });

    const res = await postResume({ order_id: PREVIOUS });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, enrolled: true, orderId: PREVIOUS });

    expect(await orders()).toEqual([expect.objectContaining({ order_id: PREVIOUS, status: 'approved' })]);
    const row = await env.DB.prepare('SELECT bold_transaction_id FROM orders').first();
    expect(row).toEqual({ bold_transaction_id: 'TXN-RETOMAR' });
  });

  it('no pregunta a Bold si la orden anterior ya estaba aprobada', async () => {
    await seedOrder({ status: 'approved' });
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const res = await postResume({ order_id: PREVIOUS });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ enrolled: true, orderId: PREVIOUS });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await orders()).toHaveLength(1);
  });

  it('si Bold ya no responde por la orden anterior (mas de 24 h) usa el estado guardado y la trata como no pagada', async () => {
    await seedOrder({ createdAt: new Date(Date.now() - 3 * DAY_MS).toISOString() });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

    const res = await postResume({ order_id: PREVIOUS });

    expect(res.status).toBe(201);
    expect(await orders()).toEqual([
      expect.objectContaining({ order_id: PREVIOUS, status: 'pending' }),
      expect.objectContaining({ status: 'pending', currency: 'USD', amount: 95 }),
    ]);
  });

  it('una orden anterior rechazada no vuelve a pendiente ni se consulta, y se abre otra', async () => {
    await seedOrder({ status: 'rejected', currency: 'COP', amount: 250000 });
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const res = await postResume({ order_id: PREVIOUS });

    expect(res.status).toBe(201);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await orders()).toEqual([
      expect.objectContaining({ order_id: PREVIOUS, status: 'rejected' }),
      expect.objectContaining({ status: 'pending', currency: 'COP', amount: 250000 }),
    ]);
  });

  it('responde 410 resume_expired con un enlace de mas de 7 dias, sin consultar a Bold ni abrir orden', async () => {
    await seedOrder({ createdAt: new Date(Date.now() - 7 * DAY_MS - 60_000).toISOString() });
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const res = await postResume({ order_id: PREVIOUS });

    expect(res.status).toBe(410);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: { code: 'resume_expired' } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await orders()).toHaveLength(1);
  });

  it('acepta un enlace que todavia no cumple 7 dias', async () => {
    await seedOrder({ createdAt: new Date(Date.now() - 7 * DAY_MS + 60 * 60 * 1000).toISOString() });
    mockVoucher('NO_TRANSACTION_FOUND');

    const res = await postResume({ order_id: PREVIOUS });

    expect(res.status).toBe(201);
  });

  it('responde 409 program_not_open si el programa esta cerrado y no abre pago', async () => {
    await seedOrder({ program: CLOSED, currency: 'COP', amount: 250000 });
    mockVoucher('NO_TRANSACTION_FOUND');

    const res = await postResume({ order_id: PREVIOUS });

    expect(res.status).toBe(409);
    const body = await res.text();
    expect(JSON.parse(body)).toMatchObject({ ok: false, error: { code: 'program_not_open' } });
    expect(body).not.toContain('session');
    expect(await orders()).toHaveLength(1);
  });

  it('responde 409 already_enrolled si el cliente ya pago el programa con otra orden', async () => {
    await seedOrder({ orderId: `${PROGRAM}-ya-pagada`, status: 'approved' });
    await seedOrder();
    mockVoucher('NO_TRANSACTION_FOUND');

    const res = await postResume({ order_id: PREVIOUS });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: { code: 'already_enrolled' } });
    expect(await orders()).toHaveLength(2);
  });

  it('no exige Turnstile aunque haya secret configurado', async () => {
    await seedOrder();
    mockVoucher('NO_TRANSACTION_FOUND');

    const res = await app.request(
      'https://squai.io/api/checkout/resume',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://squai.io', 'CF-Connecting-IP': nextIp() },
        body: JSON.stringify({ order_id: PREVIOUS }),
      },
      { ...withKeys, TURNSTILE_SECRET_KEY: 'test-secret' }
    );

    expect(res.status).toBe(201);
  });

  it('bloquea peticiones de otro origen', async () => {
    const res = await postResume({ order_id: PREVIOUS }, { Origin: 'https://evil.example' });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'cross_origin_blocked' } });
  });

  it('aplica el limite por IP', async () => {
    const ip = '192.0.2.77';
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      statuses.push((await postResume({ order_id: 'programa-retomar-no-existe' }, { 'CF-Connecting-IP': ip })).status);
    }

    expect(statuses).toContain(429);
  });

  it('responde 400 si falta el order_id o no tiene el formato de Bold', async () => {
    expect((await postResume({})).status).toBe(400);
    expect((await postResume({ order_id: 'ana@empresa.co' })).status).toBe(400);
  });
});
