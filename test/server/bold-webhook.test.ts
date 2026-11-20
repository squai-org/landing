import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/server/index';
import {
  APPROVED_SALE_BODY,
  APPROVED_SALE_SIGNATURE,
  PSE_APPROVED_BODY,
  PSE_APPROVED_SIGNATURE,
  REJECTED_SALE_BODY,
  REJECTED_SALE_SIGNATURE,
  TEST_SECRET_KEY,
  VOID_APPROVED_BODY,
  VOID_APPROVED_SIGNATURE,
} from '../fixtures/bold';

const withKeys = { ...env, BOLD_SECRET_KEY: TEST_SECRET_KEY };

/**
 * Bold llama sin cabecera Origin y con el cuerpo crudo que firmo. Se manda tal
 * cual: volver a serializar el JSON invalidaria la firma.
 */
const postWebhook = (body: string, signature?: string) =>
  app.request(
    'https://squai.io/api/checkout/webhook',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signature ? { 'x-bold-signature': signature } : {}),
      },
      body,
    },
    withKeys
  );

/** Las notificaciones de prueba referencian esta orden. */
const seedOrder = async (orderId: string) => {
  const customer = await env.DB.prepare(
    `INSERT INTO customers (email, full_name, country_code, phone, phone_e164)
     VALUES ('ana@empresa.co', 'Ana Rios', '+57', '3205551234', '+573205551234')
     ON CONFLICT (email) DO UPDATE SET full_name = excluded.full_name
     RETURNING id`
  ).first<{ id: number }>();

  await env.DB.prepare(
    `INSERT INTO orders (order_id, customer_id, program_code, referral_source, amount, currency)
     VALUES (?, ?, 'squai-one', 'instagram', 399000, 'COP')`
  )
    .bind(orderId, customer?.id)
    .run();
};

beforeEach(async () => {
  await env.DB.exec('DELETE FROM bold_transactions');
  await env.DB.exec('DELETE FROM orders');
  await env.DB.exec('DELETE FROM customers');
  await seedOrder('SQUAI-ONE-TEST');
});

describe('POST /api/checkout/webhook', () => {
  it('guarda una venta aprobada y responde 200', async () => {
    const res = await postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE);

    expect(res.status).toBe(200);

    const row = await env.DB.prepare('SELECT * FROM bold_transactions').first<Record<string, unknown>>();
    expect(row).toMatchObject({
      payment_id: 'TX-4111-APPROVED',
      type: 'SALE_APPROVED',
      order_id: 'SQUAI-ONE-TEST',
      amount: 399000,
      currency: 'COP',
      payer_email: 'comprador@squai.io',
      card_brand: 'VISA',
      card_masked_pan: '411111******1111',
    });
  });

  it('rechaza con 401 un cuerpo alterado y no guarda nada', async () => {
    const tampered = APPROVED_SALE_BODY.replace('"total":399000', '"total":1000');
    const res = await postWebhook(tampered, APPROVED_SALE_SIGNATURE);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: { code: 'invalid_signature' } });

    const { results } = await env.DB.prepare('SELECT payment_id FROM bold_transactions').all();
    expect(results).toEqual([]);
  });

  it('rechaza con 401 cuando no llega la cabecera x-bold-signature', async () => {
    const res = await postWebhook(APPROVED_SALE_BODY);

    expect(res.status).toBe(401);
    const { results } = await env.DB.prepare('SELECT payment_id FROM bold_transactions').all();
    expect(results).toEqual([]);
  });

  it('no duplica filas cuando Bold reenvia el mismo evento', async () => {
    await postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE);
    const res = await postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE);

    expect(res.status).toBe(200);
    const row = await env.DB.prepare('SELECT COUNT(*) AS total FROM bold_transactions').first<{ total: number }>();
    expect(row?.total).toBe(1);
  });

  it('guarda la anulacion como evento aparte del mismo pago', async () => {
    await postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE);
    const res = await postWebhook(VOID_APPROVED_BODY, VOID_APPROVED_SIGNATURE);

    expect(res.status).toBe(200);
    const { results } = await env.DB.prepare(
      'SELECT type FROM bold_transactions WHERE payment_id = ? ORDER BY type'
    )
      .bind('TX-4111-APPROVED')
      .all();
    expect(results).toEqual([{ type: 'SALE_APPROVED' }, { type: 'VOID_APPROVED' }]);
  });

  it('guarda una venta rechazada con la tarjeta de rechazo de pruebas', async () => {
    const res = await postWebhook(REJECTED_SALE_BODY, REJECTED_SALE_SIGNATURE);

    expect(res.status).toBe(200);
    const row = await env.DB.prepare('SELECT type, card_masked_pan FROM bold_transactions').first();
    expect(row).toMatchObject({ type: 'SALE_REJECTED', card_masked_pan: '497011******0062' });
  });

  it('acepta un pago por PSE, que no trae datos de tarjeta', async () => {
    const res = await postWebhook(PSE_APPROVED_BODY, PSE_APPROVED_SIGNATURE);

    expect(res.status).toBe(200);
    const row = await env.DB.prepare('SELECT payment_method, card_brand FROM bold_transactions').first();
    expect(row).toMatchObject({ payment_method: 'PSE', card_brand: null });
  });

  it('confirma la orden aunque el comprador nunca vuelva a la pagina', async () => {
    const res = await postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE);

    expect(res.status).toBe(200);
    const row = await env.DB.prepare('SELECT status, bold_transaction_id FROM orders').first();
    expect(row).toMatchObject({ status: 'approved', bold_transaction_id: 'TX-4111-APPROVED' });
  });

  it('marca la orden como rechazada con SALE_REJECTED', async () => {
    await postWebhook(REJECTED_SALE_BODY, REJECTED_SALE_SIGNATURE);

    const row = await env.DB.prepare('SELECT status FROM orders').first();
    expect(row).toMatchObject({ status: 'rejected' });
  });

  it('una anulacion si revierte una orden ya aprobada', async () => {
    await postWebhook(APPROVED_SALE_BODY, APPROVED_SALE_SIGNATURE);
    await postWebhook(VOID_APPROVED_BODY, VOID_APPROVED_SIGNATURE);

    const row = await env.DB.prepare('SELECT status FROM orders').first();
    expect(row).toMatchObject({ status: 'voided' });
  });

  it('acepta una notificacion cuya referencia no corresponde a ninguna orden', async () => {
    const res = await postWebhook(PSE_APPROVED_BODY, PSE_APPROVED_SIGNATURE);

    expect(res.status).toBe(200);
    const stored = await env.DB.prepare('SELECT payment_id FROM bold_transactions').first();
    expect(stored).toMatchObject({ payment_id: 'TX-PSE-APPROVED' });
  });
});
