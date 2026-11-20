import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/server/index';
import { TEST_IDENTITY_KEY, TEST_SECRET_KEY } from '../fixtures/bold';

/** Las llaves de Bold son secretos del Worker, no variables de wrangler.jsonc. */
const withKeys = { ...env, BOLD_IDENTITY_KEY: TEST_IDENTITY_KEY, BOLD_SECRET_KEY: TEST_SECRET_KEY };

let ipCounter = 0;
const nextIp = () => `203.0.113.${++ipCounter % 250}`;

const get = (path: string, headers: Record<string, string> = {}) =>
  app.request(`https://squai.io${path}`, { headers: { Origin: 'https://squai.io', ...headers } }, withKeys);

/**
 * Programas propios del test, con precios vigentes desde 2020 y sin cambios
 * futuros, y ventas abiertas de 2020 a 2100: asi los montos y el estado no
 * dependen del dia en que corra la suite. El cambio de precio y los limites
 * en una fecha se prueban con `now` fijo en program-prices.test.ts y
 * program-limits.test.ts.
 */
const PROGRAM = 'programa-prueba';
const COP_ONLY = 'programa-solo-cop';
/** Programa que abre en 2099: siempre proximamente. */
const UPCOMING = 'programa-proximo';

beforeAll(async () => {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO programs (code, description) VALUES (?, 'Programa de prueba'), (?, 'Programa solo en pesos')
       ON CONFLICT (code) DO NOTHING`
    ).bind(PROGRAM, COP_ONLY),
    env.DB.prepare(
      `INSERT INTO program_prices (program_code, currency, amount, valid_from) VALUES
         (?1, 'COP', 250000, '2020-01-01T05:00:00.000Z'),
         (?1, 'USD', 80, '2020-01-01T05:00:00.000Z'),
         (?2, 'COP', 300000, '2020-01-01T05:00:00.000Z')
       ON CONFLICT DO NOTHING`
    ).bind(PROGRAM, COP_ONLY),
    env.DB.prepare(
      `INSERT INTO programs (code, description) VALUES (?, 'Programa que abre en el futuro')
       ON CONFLICT (code) DO NOTHING`
    ).bind(UPCOMING),
    env.DB.prepare(
      `INSERT INTO program_prices (program_code, currency, amount, valid_from)
       VALUES (?, 'COP', 250000, '2020-01-01T05:00:00.000Z') ON CONFLICT DO NOTHING`
    ).bind(UPCOMING),
    env.DB.prepare(
      `INSERT INTO program_limits (program_code, opens_at, closes_at, capacity) VALUES
         (?1, '2020-01-01T05:00:00.000Z', '2100-01-01T05:00:00.000Z', 1000),
         (?2, '2020-01-01T05:00:00.000Z', '2100-01-01T05:00:00.000Z', 1000),
         (?3, '2099-01-01T05:00:00.000Z', '2100-01-01T05:00:00.000Z', 30)
       ON CONFLICT DO NOTHING`
    ).bind(PROGRAM, COP_ONLY, UPCOMING),
  ]);
});

/** Datos de la persona que se inscribe: sin ellos no se abre el pago. */
const orderPayload = {
  program: PROGRAM,
  currency: 'COP',
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

describe('GET /api/checkout/program/:code', () => {
  it('devuelve los precios vigentes por moneda y COP por defecto en Colombia', async () => {
    const res = await get(`/api/checkout/program/${PROGRAM}`, { 'CF-IPCountry': 'CO' });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      program: {
        code: PROGRAM,
        description: 'Programa de prueba',
        prices: { COP: 250000, USD: 80 },
        defaultCurrency: 'COP',
        status: 'open',
      },
    });
  });

  it('expone el estado calculado: proximamente antes de la apertura', async () => {
    const res = await get(`/api/checkout/program/${UPCOMING}`);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ program: { code: UPCOMING, status: 'upcoming' } });
  });

  it('propone USD fuera de Colombia', async () => {
    const res = await get(`/api/checkout/program/${PROGRAM}`, { 'CF-IPCountry': 'MX' });

    await expect(res.json()).resolves.toMatchObject({ program: { defaultCurrency: 'USD' } });
  });

  it('propone USD si no se conoce el pais', async () => {
    const res = await get(`/api/checkout/program/${PROGRAM}`);

    await expect(res.json()).resolves.toMatchObject({ program: { defaultCurrency: 'USD' } });
  });

  it('propone la moneda que tenga precio si la del pais no lo tiene', async () => {
    const res = await get(`/api/checkout/program/${COP_ONLY}`, { 'CF-IPCountry': 'US' });

    await expect(res.json()).resolves.toMatchObject({
      program: { prices: { COP: 300000 }, defaultCurrency: 'COP' },
    });
  });

  it('responde 404 cuando el programa no existe', async () => {
    const res = await get('/api/checkout/program/no-existe');

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: { code: 'program_not_found' } });
  });

  it('ya no expone la ruta del plan', async () => {
    const res = await get(`/api/checkout/plan/${PROGRAM}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/checkout/session', () => {
  it('firma el monto del programa y nunca devuelve la llave secreta', async () => {
    const res = await postSession(orderPayload);

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      session: { apiKey: string; orderId: string; amount: number; currency: string; integritySignature: string };
    };
    const { session } = body;

    expect(session.apiKey).toBe(TEST_IDENTITY_KEY);
    expect(session.amount).toBe(250000);
    expect(session.currency).toBe('COP');
    // Bold acepta letras, digitos, _ y - hasta 60 caracteres en data-order-id.
    expect(session.orderId).toMatch(/^[A-Za-z0-9_-]{1,60}$/);
    expect(session.integritySignature).toBe(
      await sha256Hex(`${session.orderId}${session.amount}${session.currency}${TEST_SECRET_KEY}`)
    );
    expect(JSON.stringify(body)).not.toContain(TEST_SECRET_KEY);
  });

  it('firma en la moneda elegida y declara el IVA del 19% a Bold', async () => {
    const res = await postSession({ ...orderPayload, currency: 'USD' });

    expect(res.status).toBe(201);
    const { session } = (await res.json()) as {
      session: { orderId: string; amount: number; currency: string; tax: string; integritySignature: string };
    };

    expect(session).toMatchObject({ amount: 80, currency: 'USD', tax: 'vat-19' });
    // El impuesto no entra en la firma: Bold firma solo orden, monto y moneda.
    expect(session.integritySignature).toBe(await sha256Hex(`${session.orderId}80USD${TEST_SECRET_KEY}`));
  });

  it('responde 400 si la moneda elegida no tiene precio vigente', async () => {
    await clearOrders();
    const res = await postSession({ ...orderPayload, program: COP_ONLY, currency: 'USD' });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: { code: 'currency_not_available' } });

    const { results } = await env.DB.prepare('SELECT order_id FROM orders').all();
    expect(results).toEqual([]);
  });

  it('rechaza una moneda que no se cobra, senalando el campo', async () => {
    const res = await postSession({ ...orderPayload, currency: 'EUR' });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: 'validation_failed', fields: { currency: expect.any(String) } },
    });
  });

  it('responde 400 si falta la moneda', async () => {
    const res = await postSession({ ...orderPayload, currency: undefined });
    expect(res.status).toBe(400);
  });

  it('usa como descripcion de la venta la del programa que hay en D1', async () => {
    // Bold muestra esta descripcion al comprador: tiene que salir de la tabla y
    // no de un texto fijo en el codigo, para poder cambiarla sin desplegar.
    await env.DB.prepare('UPDATE programs SET description = ? WHERE code = ?')
      .bind('Programa de prueba desde D1', PROGRAM)
      .run();

    try {
      const res = await postSession(orderPayload);

      expect(res.status).toBe(201);
      const { session } = (await res.json()) as { session: { description: string } };
      expect(session.description).toBe('Programa de prueba desde D1');
    } finally {
      await env.DB.prepare('UPDATE programs SET description = ? WHERE code = ?')
        .bind('Programa de prueba', PROGRAM)
        .run();
    }
  });

  it('ignora el monto que mande el navegador y cobra el de la base', async () => {
    const res = await postSession({ ...orderPayload, amount: 1000, currency: 'USD' });

    expect(res.status).toBe(201);
    const { session } = (await res.json()) as { session: { amount: number; currency: string } };
    expect(session).toMatchObject({ amount: 80, currency: 'USD' });
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

  it('responde 404 si el programa no existe', async () => {
    const res = await postSession({ ...orderPayload, program: 'no-existe' });
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'program_not_found' } });
  });

  it('responde 400 si falta el programa', async () => {
    const res = await postSession({ ...orderPayload, program: undefined });
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
      program_code: PROGRAM,
      status: 'pending',
      full_name: 'Ana Rios',
      email: 'ana@empresa.co',
      phone_e164: '+573205551234',
      referral_source: 'instagram',
      amount: 250000,
      currency: 'COP',
      tax: 'vat-19',
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

  it('responde 409 program_not_open si el programa no esta abierto y no deja orden', async () => {
    await clearOrders();
    const res = await postSession({ ...orderPayload, program: UPCOMING });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: { code: 'program_not_open' } });

    const { results } = await env.DB.prepare('SELECT order_id FROM orders').all();
    expect(results).toEqual([]);
  });

  describe('cliente ya inscrito', () => {
    const ENROLLED_ORDER = `${PROGRAM}-ya-inscrito`;

    /** Inscripcion = una orden aprobada del cliente en el programa. */
    const enroll = async (status = 'approved') => {
      await clearOrders();
      const customer = await env.DB.prepare(
        `INSERT INTO customers (email, full_name, country_code, phone, phone_e164)
         VALUES ('ana@empresa.co', 'Ana Rios', '+57', '3205551234', '+573205551234') RETURNING id`
      ).first<{ id: number }>();
      await env.DB.prepare(
        `INSERT INTO orders (order_id, customer_id, program_code, status, amount, currency)
         VALUES (?, ?, ?, ?, 250000, 'COP')`
      )
        .bind(ENROLLED_ORDER, customer!.id, PROGRAM, status)
        .run();
    };

    it('responde 409 already_enrolled, distinto de programa cerrado, sin revelar su orden', async () => {
      await enroll();
      // El mismo correo en otro formato es el mismo cliente.
      const res = await postSession(orderPayload);

      expect(res.status).toBe(409);
      const text = await res.text();
      expect(JSON.parse(text)).toMatchObject({ ok: false, error: { code: 'already_enrolled' } });
      expect(text).not.toContain(ENROLLED_ORDER);

      const { results } = await env.DB.prepare('SELECT order_id FROM orders').all();
      expect(results).toEqual([{ order_id: ENROLLED_ORDER }]);
    });

    it('deja pagar a quien solo tiene ordenes no aprobadas en el programa', async () => {
      await enroll('rejected');
      const res = await postSession(orderPayload);

      expect(res.status).toBe(201);
    });

    it('deja pagar a quien esta inscrito en otro programa', async () => {
      await enroll();
      const res = await postSession({ ...orderPayload, program: COP_ONLY });

      expect(res.status).toBe(201);
    });
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
