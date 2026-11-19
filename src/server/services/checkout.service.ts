import { boldIntegritySignature, verifyBoldWebhookSignature } from '../lib/bold';
import { badRequest, notFound, serviceUnavailable, unauthorized } from '../lib/http';
import { recordBoldTransaction } from '../repositories/bold-transaction.repository';
import { findActivePaymentPlan, type PaymentPlan } from '../repositories/payment-plan.repository';
import { boldWebhookEventSchema } from '../schemas/bold-webhook.schema';
import type { CheckoutSessionInput } from '../schemas/checkout.schema';
import { parseBody } from '../lib/validate';
import type { Env } from '../types';

export interface CheckoutSession {
  apiKey: string;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  integritySignature: string;
}

/**
 * Bold acepta en data-order-id letras, digitos, `_` y `-` hasta 60 caracteres,
 * y pide que sea unico por venta. Se antepone el plan para poder leer en el
 * panel de Bold que se vendio sin cruzar tablas.
 */
const newOrderId = (code: string) => `${code}-${crypto.randomUUID().replaceAll('-', '')}`.slice(0, 60);

export const loadPaymentPlan = async (env: Env, code: string): Promise<PaymentPlan> => {
  const plan = await findActivePaymentPlan(env.DB, code);

  if (!plan) throw notFound('plan_not_found', 'El plan solicitado no esta disponible.');

  return plan;
};

export const createCheckoutSession = async (
  env: Env,
  input: CheckoutSessionInput
): Promise<CheckoutSession> => {
  const apiKey = env.BOLD_IDENTITY_KEY;
  const secretKey = env.BOLD_SECRET_KEY;

  // Sin llaves no se puede cobrar. Se responde 503 y no 500 porque el codigo
  // esta bien: lo que falta es la configuracion del entorno.
  if (!apiKey || !secretKey) {
    console.error('BOLD_IDENTITY_KEY o BOLD_SECRET_KEY no configurados: no se puede abrir el checkout.');
    throw serviceUnavailable('bold_not_configured', 'Los pagos no estan disponibles en este momento.');
  }

  const plan = await loadPaymentPlan(env, input.plan);
  const orderId = newOrderId(plan.code);

  return {
    apiKey,
    orderId,
    amount: plan.amount,
    currency: plan.currency,
    description: plan.description,
    integritySignature: await boldIntegritySignature({
      orderId,
      amount: plan.amount,
      currency: plan.currency,
      secretKey,
    }),
  };
};

/**
 * Recibe una notificacion del webhook de Bold.
 *
 * Se trabaja sobre el cuerpo crudo porque la firma cubre esos bytes exactos, y
 * se verifica antes de mirar el contenido: sin firma valida el cuerpo no es
 * informacion, es una peticion anonima de internet.
 */
export const handleBoldWebhook = async (env: Env, rawBody: string, signature: string | undefined) => {
  const secretKey = env.BOLD_SECRET_KEY;

  if (!secretKey) {
    console.error('BOLD_SECRET_KEY no configurado: no se puede verificar el webhook de Bold.');
    throw serviceUnavailable('bold_not_configured', 'Los pagos no estan disponibles en este momento.');
  }

  if (!(await verifyBoldWebhookSignature(secretKey, rawBody, signature))) {
    console.warn('Webhook de Bold con firma invalida');
    throw unauthorized('invalid_signature', 'Firma no valida.');
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw badRequest('invalid_json', 'El cuerpo de la notificacion no es JSON valido.');
  }

  const parsed = parseBody(boldWebhookEventSchema, body);
  const { data } = parsed;

  await recordBoldTransaction(env.DB, {
    paymentId: data.payment_id,
    type: parsed.type,
    eventId: parsed.id ?? null,
    orderId: data.metadata?.reference ?? null,
    amount: data.amount?.total ?? null,
    currency: data.amount?.currency ?? null,
    paymentMethod: data.payment_method ?? null,
    payerEmail: data.payer_email ?? null,
    cardBrand: data.card?.brand ?? null,
    cardMaskedPan: data.card?.masked_pan ?? null,
    occurredAt: typeof parsed.time === 'number' ? new Date(parsed.time).toISOString() : null,
    payload: rawBody,
  });

  return { type: parsed.type, paymentId: data.payment_id };
};
