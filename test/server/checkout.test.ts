import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../../src/server/index';
import { TEST_IDENTITY_KEY, TEST_SECRET_KEY } from '../fixtures/bold';

/** Las llaves de Bold son secretos del Worker, no variables de wrangler.jsonc. */
const withKeys = { ...env, BOLD_IDENTITY_KEY: TEST_IDENTITY_KEY, BOLD_SECRET_KEY: TEST_SECRET_KEY };

let ipCounter = 0;
const nextIp = () => `203.0.113.${++ipCounter % 250}`;

const get = (path: string) =>
  app.request(`https://squai.io${path}`, { headers: { Origin: 'https://squai.io' } }, withKeys);

/** Datos de la persona que se inscribe: sin ellos no se abre el pago. */
const orderPayload = {
  plan: 'squai-one',
  full_name: 'Ana  Rios',
  email: ' ANA@Empresa.CO ',
  country_code: '+57',
  phone: '320 555 1234',
  referral_source: 'instagram',
};

const postSession = (body: unknown, bindings: typeof withKeys = withKeys) =>
  app.request(
    'https://squai.io/api/checkout/session',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://squai.io',
        'CF-Connecting-IP': nextIp(),
      },
      body: JSON.stringify(body),
    },
    bindings
  );

/** Las ordenes apuntan a su cliente: se borran antes que los clientes. */
const clearOrders = async () => {
  await env.DB.exec('DELETE FROM orders');
  await env.DB.exec('DELETE FROM customers');
};

/**
 * SHA-256 hexadecimal calculado con crypto.subtle directamente, sin pasar por
 * src/server/lib/bold.ts: si la ruta firmara otra cadena, este valor no
 * coincidiria aunque la funcion de firma siguiera siendo coherente consigo misma.
 */
const sha256Hex = async (text: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

describe('GET /api/checkout/plan/:code', () => {
  it('devuelve el precio vigente del plan desde la base', async () => {
    const res = await get('/api/checkout/plan/squai-one');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      plan: { code: 'squai-one', amount: 399000, currency: 'COP' },
    });
  });

  it('responde 404 cuando el plan no existe', async () => {
    const res = await get('/api/checkout/plan/no-existe');

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: { code: 'plan_not_found' } });
  });

  it('responde 404 cuando el plan esta desactivado', async () => {
    await env.DB.prepare('UPDATE payment_plans SET active = 0 WHERE code = ?').bind('squai-one').run();

    try {
      const res = await get('/api/checkout/plan/squai-one');
      expect(res.status).toBe(404);
    } finally {
      await env.DB.prepare('UPDATE payment_plans SET active = 1 WHERE code = ?').bind('squai-one').run();
    }
  });
});

describe('POST /api/checkout/session', () => {
  it('firma el monto del plan y nunca devuelve la llave secreta', async () => {
    const res = await postSession(orderPayload);

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      session: { apiKey: string; orderId: string; amount: number; currency: string; integritySignature: string };
    };
    const { session } = body;

    expect(session.apiKey).toBe(TEST_IDENTITY_KEY);
    expect(session.amount).toBe(399000);
    expect(session.currency).toBe('COP');
    // Bold acepta letras, digitos, _ y - hasta 60 caracteres en data-order-id.
    expect(session.orderId).toMatch(/^[A-Za-z0-9_-]{1,60}$/);
    expect(session.integritySignature).toBe(
      await sha256Hex(`${session.orderId}${session.amount}${session.currency}${TEST_SECRET_KEY}`)
    );
    expect(JSON.stringify(body)).not.toContain(TEST_SECRET_KEY);
  });

  it('usa como descripcion de la venta el nombre del plan que hay en D1', async () => {
    // Bold muestra esta descripcion al comprador: tiene que salir de la tabla y
    // no de un texto fijo en el codigo, para poder cambiarla sin desplegar.
    await env.DB.prepare('UPDATE payment_plans SET description = ? WHERE code = ?')
      .bind('Plan de prueba desde D1', 'squai-one')
      .run();

    try {
      const res = await postSession(orderPayload);

      expect(res.status).toBe(201);
      const { session } = (await res.json()) as { session: { description: string } };
      expect(session.description).toBe('Plan de prueba desde D1');
    } finally {
      await env.DB.prepare('UPDATE payment_plans SET description = ? WHERE code = ?')
        .bind('Fundamentos de Inteligencia Artificial Generativa', 'squai-one')
        .run();
    }
  });

  it('ignora el monto que mande el navegador y cobra el de la base', async () => {
    const res = await postSession({ ...orderPayload, amount: 1000, currency: 'USD' });

    expect(res.status).toBe(201);
    const { session } = (await res.json()) as { session: { amount: number; currency: string } };
    expect(session).toMatchObject({ amount: 399000, currency: 'COP' });
  });

  it('da un orderId distinto a cada sesion', async () => {
    const [first, second] = await Promise.all([
      postSession(orderPayload),
      postSession(orderPayload),
    ]);
    const ids = await Promise.all(
      [first, second].map(async (res) => ((await res.json()) as { session: { orderId: string } }).session.orderId)
    );

    expect(ids[0]).not.toBe(ids[1]);
  });

  it('responde 404 si el plan no existe', async () => {
    const res = await postSession({ ...orderPayload, plan: 'no-existe' });
    expect(res.status).toBe(404);
  });

  it('responde 400 si falta el plan', async () => {
    const res = await postSession({ ...orderPayload, plan: undefined });
    expect(res.status).toBe(400);
  });

  it('guarda la orden como pendiente, ligada al orderId firmado y a su cliente', async () => {
    await clearOrders();
    const res = await postSession(orderPayload);

    expect(res.status).toBe(201);
    const { session } = (await res.json()) as { session: { orderId: string } };

    const row = await env.DB.prepare(
      `SELECT o.*, c.full_name, c.email, c.phone_e164
       FROM orders o JOIN customers c ON c.id = o.customer_id`
    ).first<Record<string, unknown>>();
    expect(row).toMatchObject({
      order_id: session.orderId,
      program_code: 'squai-one',
      status: 'pending',
      full_name: 'Ana Rios',
      email: 'ana@empresa.co',
      phone_e164: '+573205551234',
      referral_source: 'instagram',
      amount: 399000,
      currency: 'COP',
    });
  });

  it('reutiliza al cliente con el mismo correo en otro formato y actualiza su contacto', async () => {
    await clearOrders();
    await postSession(orderPayload);
    const res = await postSession({
      ...orderPayload,
      full_name: 'Ana Maria Rios',
      email: 'ana@empresa.co',
      country_code: '+1',
      phone: '202 555 0100',
      referral_source: 'linkedin',
    });

    expect(res.status).toBe(201);

    const { results: customers } = await env.DB.prepare(
      'SELECT email, full_name, country_code, phone, phone_e164 FROM customers'
    ).all();
    expect(customers).toEqual([
      {
        email: 'ana@empresa.co',
        full_name: 'Ana Maria Rios',
        country_code: '+1',
        phone: '2025550100',
        phone_e164: '+12025550100',
      },
    ]);

    const { results: orders } = await env.DB.prepare(
      'SELECT o.referral_source FROM orders o JOIN customers c ON c.id = o.customer_id ORDER BY o.id'
    ).all();
    expect(orders).toEqual([{ referral_source: 'instagram' }, { referral_source: 'linkedin' }]);
  });

  it('rechaza un correo invalido senalando el campo y no deja fila', async () => {
    await clearOrders();
    const res = await postSession({ ...orderPayload, email: 'ana(at)empresa.co' });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: 'validation_failed', fields: { email: expect.any(String) } },
    });

    const { results } = await env.DB.prepare('SELECT order_id FROM orders').all();
    expect(results).toEqual([]);
  });

  it('exige el token de Turnstile cuando hay secret configurado', async () => {
    const res = await postSession(orderPayload, {
      ...withKeys,
      TURNSTILE_SECRET_KEY: 'test-secret',
    } as typeof withKeys);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'turnstile_missing' } });
  });

  it('responde 503 cuando las llaves de Bold no estan configuradas', async () => {
    const res = await postSession(orderPayload, {
      ...env,
      BOLD_IDENTITY_KEY: undefined,
      BOLD_SECRET_KEY: undefined,
    } as typeof withKeys);

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: { code: 'bold_not_configured' } });
  });
});
