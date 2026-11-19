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
    const res = await postSession({ plan: 'squai-one' });

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

  it('ignora el monto que mande el navegador y cobra el de la base', async () => {
    const res = await postSession({ plan: 'squai-one', amount: 1000, currency: 'USD' });

    expect(res.status).toBe(201);
    const { session } = (await res.json()) as { session: { amount: number; currency: string } };
    expect(session).toMatchObject({ amount: 399000, currency: 'COP' });
  });

  it('da un orderId distinto a cada sesion', async () => {
    const [first, second] = await Promise.all([
      postSession({ plan: 'squai-one' }),
      postSession({ plan: 'squai-one' }),
    ]);
    const ids = await Promise.all(
      [first, second].map(async (res) => ((await res.json()) as { session: { orderId: string } }).session.orderId)
    );

    expect(ids[0]).not.toBe(ids[1]);
  });

  it('responde 404 si el plan no existe', async () => {
    const res = await postSession({ plan: 'no-existe' });
    expect(res.status).toBe(404);
  });

  it('responde 400 si falta el plan', async () => {
    const res = await postSession({});
    expect(res.status).toBe(400);
  });

  it('responde 503 cuando las llaves de Bold no estan configuradas', async () => {
    const res = await postSession({ plan: 'squai-one' }, {
      ...env,
      BOLD_IDENTITY_KEY: undefined,
      BOLD_SECRET_KEY: undefined,
    } as typeof withKeys);

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: { code: 'bold_not_configured' } });
  });
});
