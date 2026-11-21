import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/server/index';
import { email } from '../../src/config/email';
import { company } from '../../src/server/lib/copy';
import {
  APPROVED_SALE_BODY,
  APPROVED_SALE_SIGNATURE,
  REJECTED_SALE_BODY,
  REJECTED_SALE_SIGNATURE,
  TEST_IDENTITY_KEY,
  TEST_SECRET_KEY,
} from '../fixtures/bold';

const ORDER_ID = 'SQUAI-ONE-TEST';
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const TEMPLATE_ID = 4242;

const withKeys = {
  ...env,
  BOLD_IDENTITY_KEY: TEST_IDENTITY_KEY,
  BOLD_SECRET_KEY: TEST_SECRET_KEY,
  BREVO_API_KEY: 'test_brevo_key',
};

const placeholderTemplate = email.templates.confirmation;
beforeAll(() => {
  email.templates.confirmation = TEMPLATE_ID;
});
afterAll(() => {
  email.templates.confirmation = placeholderTemplate;
});

const brevoOk = () =>
  new Response(JSON.stringify({ messageId: '<202611201200.123@smtp-relay.mailin.fr>' }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });

const boldVoucher = (payment_status: string) =>
  new Response(
    JSON.stringify({ payment_status, reference_id: ORDER_ID, transaction_id: 'TX-4111-APPROVED', payment_method: 'CREDIT_CARD' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );

const mockOutbound = (brevo: () => Promise<Response> | Response = brevoOk, boldStatus = 'APPROVED') => {
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    return url.startsWith('https://api.brevo.com') ? brevo() : boldVoucher(boldStatus);
  });
  return () =>
    spy.mock.calls.filter(([input]) => (input instanceof Request ? input.url : String(input)) === BREVO_URL);
};

const postWebhook = async (body: string, signature: string) => {
  const ctx = createExecutionContext();
  const res = await app.request(
    'https://squai.io/api/checkout/webhook',
    { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bold-signature': signature }, body },
    withKeys,
    ctx
  );
  return { res, ctx };
};

const getStatus = async () => {
  const ctx = createExecutionContext();
  const res = await app.request(
    `https://squai.io/api/checkout/status?order_id=${ORDER_ID}`,
    { headers: { Origin: 'https://squai.io' } },
    withKeys,
    ctx
  );
  return { res, ctx };
};

const run = async (call: Promise<{ res: Response; ctx: ExecutionContext }>) => {
  const { res, ctx } = await call;
  await waitOnExecutionContext(ctx);
  return res;
};

const emailRows = async () =>
  (await env.DB.prepare('SELECT * FROM email_messages ORDER BY id').all<Record<string, unknown>>()).results;

beforeEach(async () => {
  await env.DB.exec('DELETE FROM email_messages');
  await env.DB.exec('DELETE FROM bold_transactions');
  await env.DB.exec('DELETE FROM orders');
  await env.DB.exec('DELETE FROM customers');

  await env.DB.prepare(
    `UPDATE programs SET starts_on = '2027-01-12', ends_on = '2027-02-13',
       schedule = 'Martes y jueves, 7:00 a 9:00 p. m. (hora de Colombia)'
     WHERE code = 'squai-one'`
  ).run();

  const customer = await env.DB.prepare(
    `INSERT INTO customers (email, full_name, country_code, phone, phone_e164)
     VALUES ('ana@empresa.co', 'Ana Maria Rios', '+57', '3205551234', '+573205551234')
     RETURNING id`
  ).first<{ id: number }>();

  await env.DB.prepare(
    `INSERT INTO orders (order_id, customer_id, program_code, referral_source, amount, currency, tax)
     VALUES (?, ?, 'squai-one', 'instagram', 440000, 'COP', 'vat-19')`
  )
    .bind(ORDER_ID, customer?.id)
    .run();
});

afterEach(() => vi.restoreAllMocks());

describe('correo de confirmacion de inscripcion', () => {
  it('envia la confirmacion por Brevo cuando el webhook aprueba la orden', async () => {
    const brevoCalls = mockOutbound();

    const res = await run(postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE));

    expect(res.status).toBe(200);
    expect(brevoCalls()).toHaveLength(1);

    const [, init] = brevoCalls()[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(init?.method).toBe('POST');
    expect(headers.get('api-key')).toBe('test_brevo_key');
    expect(headers.get('content-type')).toBe('application/json');

    expect(JSON.parse(String(init?.body))).toEqual({
      templateId: TEMPLATE_ID,
      to: [{ email: 'ana@empresa.co', name: 'Ana Maria Rios' }],
      sender: { name: 'Squai', email: 'comunicaciones@squai.io' },
      replyTo: { email: 'team@squai.io', name: 'Squai' },
      tags: ['confirmation'],
      params: {
        FIRST_NAME: 'Ana',
        PROGRAM_NAME: 'Fundamentos de Inteligencia Artificial Generativa',
        ORDER_ID,
        AMOUNT_TOTAL: '$440.000',
        AMOUNT_BASE: '$369.748',
        AMOUNT_VAT: '$70.252',
        CURRENCY: 'COP',
        PAYMENT_METHOD: 'Tarjeta de crédito',
        START_DATE: '12 de enero de 2027',
        END_DATE: '13 de febrero de 2027',
        SCHEDULE: 'Martes y jueves, 7:00 a 9:00 p. m. (hora de Colombia)',
        DURATION: '5 semanas',
        SESSIONS_LINK_INFO: 'antes del 12 de enero de 2027',
        COMPANY_NAME: 'Squai S.A.S.',
        COMPANY_NIT: '902.071.792',
        COMPANY_ADDRESS: company.address,
        COMPANY_PHONE: company.phone,
        COMPANY_CONTACT: 'team@squai.io',
        TERMS_URL: 'https://squai.io/terminos-de-servicio',
      },
    });
  });

  it('registra en D1 que correo y que plantilla se envio', async () => {
    mockOutbound();

    await run(postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE));

    const rows = await emailRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      order_id: ORDER_ID,
      program_code: 'squai-one',
      kind: 'confirmation',
      template_id: TEMPLATE_ID,
      provider_message_id: '<202611201200.123@smtp-relay.mailin.fr>',
      status: 'sent',
      attempts: 1,
      last_error: null,
    });
    expect(rows[0]?.sent_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('el webhook responde sin esperar a Brevo', async () => {
    let release!: (res: Response) => void;
    const brevoCalls = mockOutbound(() => new Promise<Response>((resolve) => (release = resolve)));

    const { res, ctx } = await postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE);

    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(brevoCalls()).toHaveLength(1));

    release(brevoOk());
    await waitOnExecutionContext(ctx);
    expect(await emailRows()).toMatchObject([{ status: 'sent' }]);
  });

  it('webhook repetido y luego /status envian un solo correo', async () => {
    const brevoCalls = mockOutbound();

    await run(postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE));
    await run(postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE));
    const res = await run(getStatus());

    expect(res.status).toBe(200);
    expect(brevoCalls()).toHaveLength(1);
    expect(await emailRows()).toHaveLength(1);
  });

  it('/status repetido y luego el webhook envian un solo correo', async () => {
    const brevoCalls = mockOutbound();

    await run(getStatus());
    await run(getStatus());
    const res = await run(postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE));

    expect(res.status).toBe(200);
    expect(brevoCalls()).toHaveLength(1);
    expect(await emailRows()).toHaveLength(1);
  });

  it('webhook y /status a la vez envian un solo correo', async () => {
    const brevoCalls = mockOutbound();

    await Promise.all([
      run(postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE)),
      run(getStatus()),
      run(postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE)),
    ]);

    expect(brevoCalls()).toHaveLength(1);
    expect(await emailRows()).toHaveLength(1);
  });

  it('un fallo de Brevo queda registrado y no rompe la respuesta', async () => {
    mockOutbound(
      () =>
        new Response(JSON.stringify({ code: 'invalid_parameter', message: 'Template not found' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
    );

    const res = await run(postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE));

    expect(res.status).toBe(200);
    const rows = await emailRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'failed', attempts: 1, sent_at: null, provider_message_id: null });
    expect(rows[0]?.last_error).toContain('400');
    expect(rows[0]?.last_error).toContain('invalid_parameter');
  });

  it('un error de red con Brevo queda registrado y no rompe la respuesta', async () => {
    mockOutbound(() => Promise.reject(new TypeError('fetch failed')));

    const res = await run(getStatus());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ order: { status: 'approved' } });
    expect(await emailRows()).toMatchObject([{ status: 'failed', attempts: 1, last_error: expect.stringContaining('fetch failed') }]);
  });

  it('una orden rechazada no envia nada', async () => {
    const brevoCalls = mockOutbound(brevoOk, 'REJECTED');

    await run(postWebhook(REJECTED_SALE_BODY, REJECTED_SALE_SIGNATURE));
    await run(getStatus());

    expect(brevoCalls()).toHaveLength(0);
    expect(await emailRows()).toEqual([]);
  });

  it('sin BREVO_API_KEY no envia ni reclama el correo, y la orden se aprueba igual', async () => {
    const brevoCalls = mockOutbound();
    const ctx = createExecutionContext();

    const res = await app.request(
      'https://squai.io/api/checkout/webhook',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-bold-signature': APPROVED_SALE_SIGNATURE },
        body: APPROVED_SALE_BODY,
      },
      { ...withKeys, BREVO_API_KEY: undefined },
      ctx
    );
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(200);
    expect(brevoCalls()).toHaveLength(0);
    expect(await emailRows()).toEqual([]);
    const order = await env.DB.prepare('SELECT status FROM orders').first();
    expect(order).toMatchObject({ status: 'approved' });
  });
});
