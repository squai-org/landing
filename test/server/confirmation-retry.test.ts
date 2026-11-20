import { createExecutionContext, createScheduledController, env, waitOnExecutionContext } from 'cloudflare:test';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../../src/server/index';
import { email } from '../../src/config/email';

/**
 * Cron Trigger (#56): el handler scheduled reintenta las confirmaciones de
 * ordenes aprobadas que no tienen un envio exitoso. Se invoca directo, con D1
 * real y el fetch saliente a Brevo simulado.
 */

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const TEMPLATE_ID = 4242;
const NOW = new Date('2027-01-10T15:00:00.000Z');
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();

const withKeys = { ...env, BREVO_API_KEY: 'test_brevo_key' };

const placeholderTemplate = email.templates.confirmation;
beforeAll(() => {
  email.templates.confirmation = TEMPLATE_ID;
});
afterAll(() => {
  email.templates.confirmation = placeholderTemplate;
});

const brevoOk = () =>
  new Response(JSON.stringify({ messageId: '<202701101500.456@smtp-relay.mailin.fr>' }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });

const brevoDown = () =>
  new Response(JSON.stringify({ code: 'internal_error', message: 'Service unavailable' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });

/** Devuelve las llamadas a Brevo; cualquier otra URL es un error del test. */
const mockBrevo = (brevo: () => Promise<Response> | Response = brevoOk) => {
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== BREVO_URL) throw new Error(`fetch inesperado: ${url}`);
    return brevo();
  });
  return () => spy.mock.calls;
};

const runCron = async (bindings: typeof withKeys = withKeys, scheduledTime = NOW) => {
  const controller = createScheduledController({ scheduledTime, cron: '*/5 * * * *' });
  const ctx = createExecutionContext();
  await worker.scheduled(controller, bindings, ctx);
  await waitOnExecutionContext(ctx);
};

const emailRows = async () =>
  (await env.DB.prepare('SELECT * FROM email_messages ORDER BY id').all<Record<string, unknown>>()).results;

let customerId: number;

const insertOrder = async (orderId: string, status = 'approved') => {
  await env.DB.prepare(
    `INSERT INTO orders (order_id, customer_id, program_code, referral_source, amount, currency, tax, status, payment_method)
     VALUES (?, ?, 'squai-one', 'instagram', 440000, 'COP', 'vat-19', ?, 'CREDIT_CARD')`
  )
    .bind(orderId, customerId, status)
    .run();
};

const insertConfirmation = async (
  orderId: string,
  row: { status: string; attempts: number; lastError?: string | null; updatedAt: string; sentAt?: string | null }
) => {
  await env.DB.prepare(
    `INSERT INTO email_messages
       (order_id, customer_id, program_code, kind, template_id, status, attempts, last_error, sent_at, created_at, updated_at)
     VALUES (?1, ?2, 'squai-one', 'confirmation', ?3, ?4, ?5, ?6, ?7, ?8, ?8)`
  )
    .bind(orderId, customerId, TEMPLATE_ID, row.status, row.attempts, row.lastError ?? null, row.sentAt ?? null, row.updatedAt)
    .run();
};

beforeEach(async () => {
  await env.DB.exec('DELETE FROM email_messages');
  await env.DB.exec('DELETE FROM bold_transactions');
  await env.DB.exec('DELETE FROM orders');
  await env.DB.exec('DELETE FROM customers');

  const customer = await env.DB.prepare(
    `INSERT INTO customers (email, full_name, country_code, phone, phone_e164)
     VALUES ('ana@empresa.co', 'Ana Maria Rios', '+57', '3205551234', '+573205551234')
     RETURNING id`
  ).first<{ id: number }>();
  customerId = customer!.id;
});

afterEach(() => vi.restoreAllMocks());

describe('cron: reintento de confirmaciones', () => {
  it('reintenta una confirmacion fallida y anota el envio', async () => {
    await insertOrder('SQUAI-ONE-FAILED');
    await insertConfirmation('SQUAI-ONE-FAILED', {
      status: 'failed',
      attempts: 1,
      lastError: '503 internal_error: Service unavailable',
      updatedAt: minutesAgo(30),
    });
    const brevoCalls = mockBrevo();

    await runCron();

    expect(brevoCalls()).toHaveLength(1);
    const [, init] = brevoCalls()[0];
    expect(new Headers(init?.headers).get('api-key')).toBe('test_brevo_key');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      templateId: TEMPLATE_ID,
      to: [{ email: 'ana@empresa.co', name: 'Ana Maria Rios' }],
      tags: ['confirmation'],
      params: { ORDER_ID: 'SQUAI-ONE-FAILED', FIRST_NAME: 'Ana' },
    });
    expect(await emailRows()).toMatchObject([
      {
        order_id: 'SQUAI-ONE-FAILED',
        status: 'sent',
        attempts: 2,
        last_error: null,
        provider_message_id: '<202701101500.456@smtp-relay.mailin.fr>',
        sent_at: NOW.toISOString(),
        updated_at: NOW.toISOString(),
      },
    ]);
  });

  it('no reenvia una confirmacion ya enviada', async () => {
    await insertOrder('SQUAI-ONE-SENT');
    await insertConfirmation('SQUAI-ONE-SENT', {
      status: 'sent',
      attempts: 1,
      updatedAt: minutesAgo(60),
      sentAt: minutesAgo(60),
    });
    const brevoCalls = mockBrevo();

    await runCron();

    expect(brevoCalls()).toHaveLength(0);
    expect(await emailRows()).toMatchObject([{ status: 'sent', attempts: 1, updated_at: minutesAgo(60) }]);
  });

  it('dos ejecuciones seguidas no duplican el envio', async () => {
    await insertOrder('SQUAI-ONE-FAILED');
    await insertConfirmation('SQUAI-ONE-FAILED', { status: 'failed', attempts: 1, updatedAt: minutesAgo(30) });
    await insertOrder('SQUAI-ONE-UNCLAIMED');
    const brevoCalls = mockBrevo();

    await runCron();
    await runCron(withKeys, new Date(NOW.getTime() + 5 * 60_000));

    expect(brevoCalls()).toHaveLength(2);
    expect(await emailRows()).toMatchObject([
      { order_id: 'SQUAI-ONE-FAILED', status: 'sent', attempts: 2 },
      { order_id: 'SQUAI-ONE-UNCLAIMED', status: 'sent', attempts: 1 },
    ]);
  });

  it('dos ejecuciones a la vez no duplican el envio', async () => {
    await insertOrder('SQUAI-ONE-FAILED');
    await insertConfirmation('SQUAI-ONE-FAILED', { status: 'failed', attempts: 1, updatedAt: minutesAgo(30) });
    await insertOrder('SQUAI-ONE-UNCLAIMED');
    const brevoCalls = mockBrevo();

    await Promise.all([runCron(), runCron()]);

    expect(brevoCalls()).toHaveLength(2);
    expect(await emailRows()).toMatchObject([
      { order_id: 'SQUAI-ONE-FAILED', status: 'sent', attempts: 2 },
      { order_id: 'SQUAI-ONE-UNCLAIMED', status: 'sent', attempts: 1 },
    ]);
  });

  it('envia la confirmacion de una orden aprobada que nunca se reclamo', async () => {
    await insertOrder('SQUAI-ONE-UNCLAIMED');
    const brevoCalls = mockBrevo();

    await runCron();

    expect(brevoCalls()).toHaveLength(1);
    expect(await emailRows()).toMatchObject([
      {
        order_id: 'SQUAI-ONE-UNCLAIMED',
        customer_id: customerId,
        program_code: 'squai-one',
        kind: 'confirmation',
        template_id: TEMPLATE_ID,
        status: 'sent',
        attempts: 1,
      },
    ]);
  });

  it('respeta el margen de una confirmacion pendiente reciente y retoma la atascada', async () => {
    await insertOrder('SQUAI-ONE-IN-FLIGHT');
    await insertConfirmation('SQUAI-ONE-IN-FLIGHT', { status: 'pending', attempts: 0, updatedAt: minutesAgo(2) });
    await insertOrder('SQUAI-ONE-STUCK');
    await insertConfirmation('SQUAI-ONE-STUCK', { status: 'pending', attempts: 0, updatedAt: minutesAgo(11) });
    const brevoCalls = mockBrevo();

    await runCron();

    expect(brevoCalls()).toHaveLength(1);
    expect(JSON.parse(String(brevoCalls()[0][1]?.body)).params.ORDER_ID).toBe('SQUAI-ONE-STUCK');
    expect(await emailRows()).toMatchObject([
      { order_id: 'SQUAI-ONE-IN-FLIGHT', status: 'pending', attempts: 0, updated_at: minutesAgo(2) },
      { order_id: 'SQUAI-ONE-STUCK', status: 'sent', attempts: 1 },
    ]);
  });

  it('un nuevo fallo de Brevo suma el intento y guarda el error', async () => {
    await insertOrder('SQUAI-ONE-FAILED');
    await insertConfirmation('SQUAI-ONE-FAILED', {
      status: 'failed',
      attempts: 1,
      lastError: 'fetch failed',
      updatedAt: minutesAgo(30),
    });
    mockBrevo(brevoDown);

    await runCron();

    const [row] = await emailRows();
    expect(row).toMatchObject({ status: 'failed', attempts: 2, sent_at: null, updated_at: NOW.toISOString() });
    expect(row.last_error).toContain('503');
    expect(row.last_error).toContain('internal_error');
  });

  it('no envia confirmaciones de ordenes que no estan aprobadas', async () => {
    await insertOrder('SQUAI-ONE-PENDING', 'pending');
    await insertOrder('SQUAI-ONE-REJECTED', 'rejected');
    await insertOrder('SQUAI-ONE-VOIDED', 'voided');
    await insertConfirmation('SQUAI-ONE-VOIDED', { status: 'failed', attempts: 1, updatedAt: minutesAgo(30) });
    const brevoCalls = mockBrevo();

    await runCron();

    expect(brevoCalls()).toHaveLength(0);
    expect(await emailRows()).toMatchObject([{ order_id: 'SQUAI-ONE-VOIDED', status: 'failed', attempts: 1 }]);
  });

  it('sin plantilla de confirmacion no envia ni reclama nada', async () => {
    email.templates.confirmation = null;
    try {
      await insertOrder('SQUAI-ONE-FAILED');
      await insertConfirmation('SQUAI-ONE-FAILED', { status: 'failed', attempts: 1, updatedAt: minutesAgo(30) });
      await insertOrder('SQUAI-ONE-UNCLAIMED');
      const brevoCalls = mockBrevo();

      await runCron();

      expect(brevoCalls()).toHaveLength(0);
      expect(await emailRows()).toMatchObject([{ order_id: 'SQUAI-ONE-FAILED', status: 'failed', attempts: 1 }]);
    } finally {
      email.templates.confirmation = TEMPLATE_ID;
    }
  });

  it('sin BREVO_API_KEY no envia ni reclama nada', async () => {
    await insertOrder('SQUAI-ONE-UNCLAIMED');
    const brevoCalls = mockBrevo();

    await runCron({ ...withKeys, BREVO_API_KEY: undefined } as unknown as typeof withKeys);

    expect(brevoCalls()).toHaveLength(0);
    expect(await emailRows()).toEqual([]);
  });
});
