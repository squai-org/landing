import {
  boldIntegritySignature,
  fetchBoldPaymentStatus,
  verifyBoldWebhookSignature,
  type BoldPaymentStatus,
  type BoldVoucher,
} from '../lib/bold';
import { assertHuman } from '../lib/human';
import { normalizePhone } from '../lib/phone';
import { badRequest, gone, notFound, serviceUnavailable, unauthorized } from '../lib/http';
import { DAY_MS } from '../lib/time';
import { recordBoldTransaction } from '../repositories/bold-transaction.repository';
import { upsertCustomer } from '../repositories/customer.repository';
import {
  applyOrderPayment,
  findOrderByOrderId,
  insertOrder,
  type OrderStatus,
} from '../repositories/order.repository';
import { boldWebhookEventSchema } from '../schemas/bold-webhook.schema';
import type { CheckoutResumeInput, CheckoutSessionInput } from '../schemas/checkout.schema';
import { parseBody } from '../lib/validate';
import { checkout, type Currency, type Tax } from '../../config/checkout';
import { assertOpenAndNotEnrolled, loadProgram, priceIn, type ProgramView } from './program.service';
import type { Env, RequestMeta } from '../types';

export interface CheckoutSession {
  apiKey: string;
  orderId: string;
  amount: number;
  currency: Currency;
  description: string;
  tax: Tax;
  integritySignature: string;
}

const newOrderId = (code: string) => `${code}-${crypto.randomUUID().replaceAll('-', '')}`.slice(0, 60);

const boldKeys = (env: Env) => {
  const apiKey = env.BOLD_IDENTITY_KEY;
  const secretKey = env.BOLD_SECRET_KEY;

  if (!apiKey || !secretKey) {
    console.error('BOLD_IDENTITY_KEY o BOLD_SECRET_KEY no configurados: no se puede abrir el checkout.');
    throw serviceUnavailable('bold_not_configured', 'Los pagos no estan disponibles en este momento.');
  }

  return { apiKey, secretKey };
};

const openOrder = async (
  env: Env,
  keys: ReturnType<typeof boldKeys>,
  order: { program: ProgramView; currency: Currency; customerId: number; referralSource: string | null },
  meta: RequestMeta
): Promise<CheckoutSession> => {
  const { program, currency } = order;
  const amount = priceIn(program, currency);
  const tax = checkout.tax;
  const orderId = newOrderId(program.code);

  await insertOrder(env.DB, {
    orderId,
    customerId: order.customerId,
    programCode: program.code,
    referralSource: order.referralSource,
    amount,
    currency,
    tax,
    sourcePage: meta.sourcePage,
    ipCountry: meta.ipCountry,
    userAgent: meta.userAgent,
  });

  return {
    apiKey: keys.apiKey,
    orderId,
    amount,
    currency,
    description: program.description,
    tax,
    integritySignature: await boldIntegritySignature({ orderId, amount, currency, secretKey: keys.secretKey }),
  };
};

export const createCheckoutSession = async (
  env: Env,
  input: CheckoutSessionInput,
  meta: RequestMeta,
  now: Date = new Date()
): Promise<CheckoutSession> => {
  const keys = boldKeys(env);

  await assertHuman(env, input['cf-turnstile-response'], 'checkout', meta);

  const phone = normalizePhone(input.country_code, input.phone);

  if (!phone) {
    throw badRequest('invalid_phone', 'Revisa los campos del formulario.', {
      phone: 'El número de teléfono no es válido.',
    });
  }

  const program = await loadProgram(env, input.program, now, meta.ipCountry);
  await assertOpenAndNotEnrolled(env, program, input.email);
  priceIn(program, input.currency);

  const customerId = await upsertCustomer(env.DB, {
    email: input.email,
    fullName: input.full_name,
    countryCode: phone.countryCode,
    phone: phone.nationalNumber,
    phoneE164: phone.e164,
  });

  return openOrder(
    env,
    keys,
    { program, currency: input.currency, customerId, referralSource: input.referral_source },
    meta
  );
};

export type OnApproved = (orderId: string) => void;

const applyPayment = async (
  env: Env,
  orderId: string,
  payment: Parameters<typeof applyOrderPayment>[2],
  onApproved: OnApproved
): Promise<void> => {
  const { becameApproved } = await applyOrderPayment(env.DB, orderId, payment);
  if (becameApproved) onApproved(orderId);
};

const WEBHOOK_STATUS: Record<string, OrderStatus | undefined> = {
  SALE_APPROVED: 'approved',
  SALE_REJECTED: 'rejected',
  VOID_APPROVED: 'voided',
};

/**
 * Recibe una notificacion del webhook de Bold.
 *
 * Se trabaja sobre el cuerpo crudo porque la firma cubre esos bytes exactos, y
 * se verifica antes de mirar el contenido: sin firma valida el cuerpo no es
 * informacion, es una peticion anonima de internet.
 */
export const handleBoldWebhook = async (
  env: Env,
  rawBody: string,
  signature: string | undefined,
  onApproved: OnApproved = () => {}
) => {
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

  // Red de seguridad: si el comprador cerro la pestana y nunca volvio a la
  const status = WEBHOOK_STATUS[parsed.type];
  const reference = data.metadata?.reference;

  if (status && reference) {
    await applyPayment(
      env,
      reference,
      { status, transactionId: data.payment_id, paymentMethod: data.payment_method },
      onApproved
    );
  }

  return { type: parsed.type, paymentId: data.payment_id };
};

const ORDER_STATUS: Record<BoldPaymentStatus, OrderStatus> = {
  NO_TRANSACTION_FOUND: 'pending',
  PENDING: 'pending',
  PROCESSING: 'processing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FAILED: 'failed',
  VOIDED: 'voided',
};

const FINAL_STATUSES: OrderStatus[] = ['approved', 'rejected', 'failed', 'voided'];

const voucherPayment = (voucher: BoldVoucher, status: OrderStatus) => ({
  status,
  transactionId: voucher.transactionId,
  paymentMethod: voucher.paymentMethod,
});

export interface OrderStatusView {
  status: OrderStatus;
  programCode: string;
  amount: number;
  currency: Currency;
  fullName: string;
}

export const confirmOrder = async (
  env: Env,
  orderId: string,
  onApproved: OnApproved = () => {}
): Promise<OrderStatusView> => {
  const order = await findOrderByOrderId(env.DB, orderId);

  if (!order) throw notFound('order_not_found', 'No encontramos esa orden.');

  const view: OrderStatusView = {
    status: order.status,
    programCode: order.programCode,
    amount: order.amount,
    currency: order.currency,
    fullName: order.fullName,
  };

  if (FINAL_STATUSES.includes(order.status)) return view;

  const identityKey = env.BOLD_IDENTITY_KEY;

  if (!identityKey) {
    console.error('BOLD_IDENTITY_KEY no configurado: no se puede consultar el estado del pago.');
    throw serviceUnavailable('bold_not_configured', 'Los pagos no estan disponibles en este momento.');
  }

  const voucher = await fetchBoldPaymentStatus(identityKey, orderId);
  const status = ORDER_STATUS[voucher.status];

  await applyPayment(env, orderId, voucherPayment(voucher, status), onApproved);

  return { ...view, status };
};

export type ResumeResult = { session: CheckoutSession } | { enrolled: true; orderId: string };

export const resumeOrder = async (
  env: Env,
  input: CheckoutResumeInput,
  meta: RequestMeta,
  now: Date = new Date(),
  onApproved: OnApproved = () => {}
): Promise<ResumeResult> => {
  const previous = await findOrderByOrderId(env.DB, input.order_id);

  if (!previous) throw notFound('order_not_found', 'No encontramos esa orden.');

  const keys = boldKeys(env);

  if (previous.status === 'approved') return { enrolled: true, orderId: previous.orderId };

  const expiresAt = Date.parse(previous.createdAt) + checkout.resumeExpiryDays * DAY_MS;
  if (now.getTime() > expiresAt) {
    throw gone('resume_expired', 'El enlace para retomar la compra expiro.');
  }

  const status = await refreshResumedStatus(env, keys.apiKey, previous, onApproved);

  if (status === 'approved') return { enrolled: true, orderId: previous.orderId };

  const program = await loadProgram(env, previous.programCode, now, meta.ipCountry);
  await assertOpenAndNotEnrolled(env, program, previous.email);

  return {
    session: await openOrder(
      env,
      keys,
      {
        program,
        currency: previous.currency,
        customerId: previous.customerId,
        referralSource: previous.referralSource,
      },
      meta
    ),
  };
};

const refreshResumedStatus = async (
  env: Env,
  identityKey: string,
  order: { orderId: string; status: OrderStatus },
  onApproved: OnApproved
): Promise<OrderStatus> => {
  if (FINAL_STATUSES.includes(order.status)) return order.status;

  let voucher: BoldVoucher;
  try {
    voucher = await fetchBoldPaymentStatus(identityKey, order.orderId);
  } catch (error) {
    console.warn('Bold no respondio por la orden a retomar; se usa el estado guardado.', error);
    return order.status;
  }

  if (voucher.status === 'NO_TRANSACTION_FOUND') return order.status;

  const status = ORDER_STATUS[voucher.status];
  await applyPayment(env, order.orderId, voucherPayment(voucher, status), onApproved);

  return status;
};
