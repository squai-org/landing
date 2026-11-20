import { createExecutionContext, createScheduledController, env, waitOnExecutionContext } from 'cloudflare:test';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../../src/server/index';
import { email } from '../../src/config/email';

/**
 * Correo de recuperacion (#58): el cron envia uno solo por cliente y programa
 * a quien dejo una orden sin pagar hace mas de 2 horas, no esta inscrito y el
 * programa sigue abierto. Se invoca el handler scheduled directo, con D1 real
 * y el fetch saliente a Brevo simulado.
 */

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const RECOVERY_TEMPLATE_ID = 5151;
// Squai One vende del 1 de diciembre al 22 de enero (hora de Colombia): abierto.
const NOW = new Date('2027-01-10T15:00:00.000Z');
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();
const hoursAgo = (hours: number) => minutesAgo(hours * 60);

const withKeys = { ...env, BREVO_API_KEY: 'test_brevo_key' };

const placeholderTemplates = { ...email.templates };
beforeAll(() => {
  // Sin plantilla de confirmacion el paso de reintento no hace nada y no
  // ensucia las llamadas a Brevo de estos tests.
  email.templates.confirmation = null;
  email.templates.recovery = RECOVERY_TEMPLATE_ID;
});
afterAll(() => {
  Object.assign(email.templates, placeholderTemplates);
});

const brevoOk = () =>
  new Response(JSON.stringify({ messageId: '<202701101500.789@smtp-relay.mailin.fr>' }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });

const brevoDown = () =>
  new Response(JSON.stringify({ code: 'internal_error', message: 'Service unavailable' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });

/** Devuelve los cuerpos enviados a Brevo; cualquier otra URL es un error del test. */
const mockBrevo = (brevo: () => Response = brevoOk) => {
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== BREVO_URL) throw new Error(`fetch inesperado: ${url}`);
    return brevo();
  });
  return () => spy.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
};

const runCron = async (bindings: typeof withKeys = withKeys, scheduledTime = NOW) => {
  const controller = createScheduledController({ scheduledTime, cron: '*/5 * * * *' });
  const ctx = createExecutionContext();
  await worker.scheduled(controller, bindings, ctx);
  await waitOnExecutionContext(ctx);
};

const recoveryRows = async () =>
  (
    await env.DB.prepare(`SELECT * FROM email_messages WHERE kind = 'recovery' ORDER BY id`).all<
      Record<string, unknown>
    >()
  ).results;

const insertCustomer = async (emailAddress: string, fullName: string) =>
  (await env.DB.prepare(
    `INSERT INTO customers (email, full_name, country_code, phone, phone_e164)
     VALUES (?, ?, '+57', '3205551234', '+573205551234')
     RETURNING id`
  )
    .bind(emailAddress, fullName)
    .first<{ id: number }>())!.id;

const insertOrder = async (orderId: string, customerId: number, status: string, createdAt: string) => {
  await env.DB.prepare(
    `INSERT INTO orders (order_id, customer_id, program_code, referral_source, amount, currency, tax, status, created_at)
     VALUES (?, ?, 'squai-one', 'instagram', 440000, 'COP', 'vat-19', ?, ?)`
  )
    .bind(orderId, customerId, status, createdAt)
    .run();
};

let ana: number;

beforeEach(async () => {
  await env.DB.exec('DELETE FROM email_messages');
  await env.DB.exec('DELETE FROM bold_transactions');
  await env.DB.exec('DELETE FROM orders');
  await env.DB.exec('DELETE FROM customers');
  await env.DB.exec(`UPDATE programs SET closed_manually = 0 WHERE code = 'squai-one'`);

  ana = await insertCustomer('ana@empresa.co', 'Ana Maria Rios');
});

afterEach(() => vi.restoreAllMocks());

describe('cron: correo de recuperacion', () => {
  it('envia la recuperacion a quien dejo una orden sin pagar hace mas de 2 horas', async () => {
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'pending', hoursAgo(3));
    const sent = mockBrevo();

    await runCron();

    expect(sent()).toEqual([
      {
        templateId: RECOVERY_TEMPLATE_ID,
        to: [{ email: 'ana@empresa.co', name: 'Ana Maria Rios' }],
        sender: { name: 'Squai', email: 'comunicaciones@squai.io' },
        replyTo: { name: 'Squai', email: 'team@squai.io' },
        params: {
          FIRST_NAME: 'Ana',
          PROGRAM_NAME: 'Fundamentos de Inteligencia Artificial Generativa',
          RESUME_URL: 'https://squai.io/retomar?order_id=SQUAI-ONE-ANA-1',
        },
        tags: ['recovery'],
      },
    ]);
    expect(await recoveryRows()).toMatchObject([
      {
        order_id: 'SQUAI-ONE-ANA-1',
        customer_id: ana,
        program_code: 'squai-one',
        template_id: RECOVERY_TEMPLATE_ID,
        status: 'sent',
        attempts: 1,
        provider_message_id: '<202701101500.789@smtp-relay.mailin.fr>',
        sent_at: NOW.toISOString(),
      },
    ]);
  });

  it('no envia antes de 2 horas', async () => {
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'pending', minutesAgo(119));
    const sent = mockBrevo();

    await runCron();

    expect(sent()).toEqual([]);
    expect(await recoveryRows()).toEqual([]);
  });

  it('un cliente con tres ordenes sin pagar recibe una, con el enlace de la mas reciente', async () => {
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'rejected', hoursAgo(30));
    await insertOrder('SQUAI-ONE-ANA-2', ana, 'failed', hoursAgo(10));
    await insertOrder('SQUAI-ONE-ANA-3', ana, 'pending', hoursAgo(3));
    const sent = mockBrevo();

    await runCron();

    expect(sent().map((body) => body.params.RESUME_URL)).toEqual([
      'https://squai.io/retomar?order_id=SQUAI-ONE-ANA-3',
    ]);
    expect(await recoveryRows()).toMatchObject([{ order_id: 'SQUAI-ONE-ANA-3', status: 'sent' }]);
  });

  it('espera 2 horas desde el ultimo intento, aunque haya ordenes anteriores mas viejas', async () => {
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'rejected', hoursAgo(5));
    await insertOrder('SQUAI-ONE-ANA-2', ana, 'pending', minutesAgo(30));
    const sent = mockBrevo();

    await runCron();

    expect(sent()).toEqual([]);
  });

  it('la siguiente ejecucion no reenvia, aunque el cliente abra otra orden', async () => {
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'pending', hoursAgo(3));
    const sent = mockBrevo();

    await runCron();
    await insertOrder('SQUAI-ONE-ANA-2', ana, 'pending', NOW.toISOString());
    await runCron(withKeys, new Date(NOW.getTime() + 5 * 60_000));
    await runCron(withKeys, new Date(NOW.getTime() + 3 * 60 * 60_000));

    expect(sent()).toHaveLength(1);
    expect(await recoveryRows()).toMatchObject([{ order_id: 'SQUAI-ONE-ANA-1', status: 'sent', attempts: 1 }]);
  });

  it('dos ejecuciones a la vez envian una sola', async () => {
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'pending', hoursAgo(3));
    const sent = mockBrevo();

    await Promise.all([runCron(), runCron()]);

    expect(sent()).toHaveLength(1);
    expect(await recoveryRows()).toHaveLength(1);
  });

  it('no envia a un cliente ya inscrito en el programa', async () => {
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'approved', hoursAgo(4));
    await insertOrder('SQUAI-ONE-ANA-2', ana, 'pending', hoursAgo(3));
    const sent = mockBrevo();

    await runCron();

    expect(sent()).toEqual([]);
    expect(await recoveryRows()).toEqual([]);
  });

  it('no envia con el programa cerrado, y tampoco reclama el envio', async () => {
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'pending', hoursAgo(3));
    await env.DB.exec(`UPDATE programs SET closed_manually = 1 WHERE code = 'squai-one'`);
    const sent = mockBrevo();

    await runCron();

    expect(sent()).toEqual([]);
    expect(await recoveryRows()).toEqual([]);
  });

  it('no envia despues del cierre de ventas', async () => {
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'pending', '2027-01-22T20:00:00.000Z');
    const sent = mockBrevo();

    await runCron(withKeys, new Date('2027-01-23T05:00:00.000Z'));

    expect(sent()).toEqual([]);
  });

  it('no envia si el enlace ya expiro (orden de hace mas de 7 dias)', async () => {
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'pending', hoursAgo(7 * 24 + 1));
    const sent = mockBrevo();

    await runCron();

    expect(sent()).toEqual([]);
    expect(await recoveryRows()).toEqual([]);
  });

  it('envia a cada cliente sin pagar, una por cliente', async () => {
    const luis = await insertCustomer('luis@empresa.co', 'Luis Perez');
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'pending', hoursAgo(3));
    await insertOrder('SQUAI-ONE-LUIS-1', luis, 'rejected', hoursAgo(4));
    await insertOrder('SQUAI-ONE-LUIS-2', luis, 'failed', hoursAgo(2.5));
    const sent = mockBrevo();

    await runCron();

    expect(sent().map((body) => body.to[0].email).sort()).toEqual(['ana@empresa.co', 'luis@empresa.co']);
    expect((await recoveryRows()).map((row) => row.order_id).sort()).toEqual(['SQUAI-ONE-ANA-1', 'SQUAI-ONE-LUIS-2']);
  });

  it('no envia por ordenes en proceso o anuladas', async () => {
    const luis = await insertCustomer('luis@empresa.co', 'Luis Perez');
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'processing', hoursAgo(3));
    await insertOrder('SQUAI-ONE-LUIS-1', luis, 'voided', hoursAgo(3));
    const sent = mockBrevo();

    await runCron();

    expect(sent()).toEqual([]);
  });

  it('un fallo de Brevo queda registrado y el cron lo reintenta', async () => {
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'pending', hoursAgo(3));
    mockBrevo(brevoDown);

    await runCron();

    const [failed] = await recoveryRows();
    expect(failed).toMatchObject({ order_id: 'SQUAI-ONE-ANA-1', status: 'failed', attempts: 1, sent_at: null });
    expect(failed.last_error).toContain('503');

    vi.restoreAllMocks();
    const sent = mockBrevo();
    const later = new Date(NOW.getTime() + 5 * 60_000);
    await runCron(withKeys, later);

    expect(sent()).toHaveLength(1);
    expect(await recoveryRows()).toMatchObject([
      { order_id: 'SQUAI-ONE-ANA-1', status: 'sent', attempts: 2, last_error: null, sent_at: later.toISOString() },
    ]);
  });

  it('no reintenta una recuperacion fallida si el cliente ya se inscribio', async () => {
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'pending', hoursAgo(3));
    mockBrevo(brevoDown);
    await runCron();
    vi.restoreAllMocks();

    await insertOrder('SQUAI-ONE-ANA-2', ana, 'approved', minutesAgo(1));
    const sent = mockBrevo();
    await runCron(withKeys, new Date(NOW.getTime() + 5 * 60_000));

    expect(sent()).toEqual([]);
    expect(await recoveryRows()).toMatchObject([{ status: 'failed', attempts: 1 }]);
  });

  it('sin plantilla de recuperacion no envia ni reclama nada', async () => {
    email.templates.recovery = null;
    try {
      await insertOrder('SQUAI-ONE-ANA-1', ana, 'pending', hoursAgo(3));
      const sent = mockBrevo();

      await runCron();

      expect(sent()).toEqual([]);
      expect(await recoveryRows()).toEqual([]);
    } finally {
      email.templates.recovery = RECOVERY_TEMPLATE_ID;
    }
  });

  it('sin BREVO_API_KEY no envia ni reclama nada', async () => {
    await insertOrder('SQUAI-ONE-ANA-1', ana, 'pending', hoursAgo(3));
    const sent = mockBrevo();

    await runCron({ ...withKeys, BREVO_API_KEY: undefined } as unknown as typeof withKeys);

    expect(sent()).toEqual([]);
    expect(await recoveryRows()).toEqual([]);
  });
});
