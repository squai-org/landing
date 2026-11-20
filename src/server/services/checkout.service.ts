import {
  boldIntegritySignature,
  fetchBoldPaymentStatus,
  verifyBoldWebhookSignature,
  type BoldPaymentStatus,
  type BoldVoucher,
} from '../lib/bold';
import { assertHuman } from '../lib/human';
import { normalizePhone } from '../lib/phone';
import { ApiError, badRequest, notFound, serviceUnavailable, unauthorized } from '../lib/http';
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
import { checkout } from '../../config/checkout';
import {
  assertOpenAndNotEnrolled,
  loadProgram,
  priceIn,
  type Currency,
  type ProgramView,
} from './program.service';
import type { Env, RequestMeta } from '../types';

export interface CheckoutSession {
  apiKey: string;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  /** Impuesto incluido en el monto que se declara a Bold (data-tax). No entra en la firma. */
  tax: string;
  integritySignature: string;
}

/**
 * Bold acepta en data-order-id letras, digitos, `_` y `-` hasta 60 caracteres,
 * y pide que sea unico por venta. Se antepone el programa para poder leer en
 * el panel de Bold que se vendio sin cruzar tablas.
 */
const newOrderId = (code: string) => `${code}-${crypto.randomUUID().replaceAll('-', '')}`.slice(0, 60);

/**
 * `now` decide que precio rige; la ruta pasa el reloj del Worker y los tests
 * un instante fijo.
 */
/**
 * Sin llaves no se puede cobrar. Se responde 503 y no 500 porque el codigo
 * esta bien: lo que falta es la configuracion del entorno.
 */
const boldKeys = (env: Env) => {
  const apiKey = env.BOLD_IDENTITY_KEY;
  const secretKey = env.BOLD_SECRET_KEY;

  if (!apiKey || !secretKey) {
    console.error('BOLD_IDENTITY_KEY o BOLD_SECRET_KEY no configurados: no se puede abrir el checkout.');
    throw serviceUnavailable('bold_not_configured', 'Los pagos no estan disponibles en este momento.');
  }

  return { apiKey, secretKey };
};

/**
 * Guarda una orden pendiente y la firma para Bold. La orden congela monto,
 * moneda e impuesto: un cambio de precio posterior no la toca.
 */
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
  // Antes de tocar la base: una moneda sin precio no deja cliente ni orden.
  priceIn(program, input.currency);

  // La orden se guarda antes de abrir el pago: es lo que liga el order-id con
  // el cliente, y deja rastro de quien empieza y no termina. El cliente se
  // reutiliza por correo y queda con los datos de este formulario.
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

/**
 * Tipos de evento del webhook traducidos a estado de orden.
 * VOID_REJECTED (una anulacion que fallo) no cambia nada: el pago sigue como
 * estaba. https://developers.bold.co/webhook
 */
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

  // Red de seguridad: si el comprador cerro la pestana y nunca volvio a la
  // pagina de gracias, la venta queda registrada igual. applyOrderPayment es
  // idempotente, asi que no importa quien llegue primero.
  const status = WEBHOOK_STATUS[parsed.type];
  const reference = data.metadata?.reference;

  if (status && reference) {
    await applyOrderPayment(env.DB, reference, {
      status,
      transactionId: data.payment_id,
      paymentMethod: data.payment_method,
    });
  }

  return { type: parsed.type, paymentId: data.payment_id };
};

/**
 * Estados de Bold traducidos a los de una orden. NO_TRANSACTION_FOUND y
 * PENDING (que solo usa PSE) son "todavia no hay veredicto", no un rechazo.
 */
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

export interface OrderStatusView {
  status: OrderStatus;
  programCode: string;
  amount: number;
  currency: string;
  fullName: string;
}

/**
 * Verificacion de retorno: la pagina de gracias pregunta por un order-id y el
 * Worker le pregunta a Bold. Los parametros que Bold anade a la URL
 * (bold-tx-status) no entran aqui: cualquiera puede escribirlos a mano.
 *
 * Si la orden ya tiene un estado final no se vuelve a llamar a Bold: ahorra
 * la llamada saliente y hace inofensivo que la pagina reintente.
 */
export const confirmOrder = async (env: Env, orderId: string): Promise<OrderStatusView> => {
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

  await applyOrderPayment(env.DB, orderId, {
    status,
    transactionId: voucher.transactionId,
    paymentMethod: voucher.paymentMethod,
  });

  return { ...view, status };
};

const DAY_MS = 24 * 60 * 60 * 1000;

export type ResumeResult ={ session: CheckoutSession } | { enrolled: true; orderId: string };

/**
 * Retomar una orden sin pagar desde el enlace de /retomar (y el origin-url de
 * Bold). Ver docs/bold-checkout.md.
 */
export const resumeOrder = async (
  env: Env,
  input: CheckoutResumeInput,
  meta: RequestMeta,
  now: Date = new Date()
): Promise<ResumeResult> => {
  const previous = await findOrderByOrderId(env.DB, input.order_id);

  if (!previous) throw notFound('order_not_found', 'No encontramos esa orden.');

  const keys = boldKeys(env);

  // Quien ya pago y abre un enlace viejo va a /gracias, no a "expirado".
  if (previous.status === 'approved') return { enrolled: true, orderId: previous.orderId };

  // created_at es ISO-8601 UTC (Date#toISOString), igual que `now`.
  const expiresAt = Date.parse(previous.createdAt) + checkout.resumeExpiryDays * DAY_MS;
  if (now.getTime() > expiresAt) {
    throw new ApiError(410, 'resume_expired', 'El enlace para retomar la compra expiro.');
  }

  const status = await refreshResumedStatus(env, keys.apiKey, previous);

  if (status === 'approved') return { enrolled: true, orderId: previous.orderId };

  // Orden nueva y no la misma: Bold pide un order-id unico por venta, y la
  // anterior pudo quedar a medias en su modal. Mismo cliente, sin volver a
  // pedir sus datos, y el precio vigente hoy en la moneda que eligio.
  const program = await loadProgram(env, previous.programCode, now, meta.ipCountry);
  await assertOpenAndNotEnrolled(env, program, previous.email);

  return {
    session: await openOrder(
      env,
      keys,
      {
        program,
        currency: previous.currency as Currency,
        customerId: previous.customerId,
        referralSource: previous.referralSource,
      },
      meta
    ),
  };
};

/**
 * Estado de la orden anterior segun Bold, aplicado con applyOrderPayment.
 *
 * Bold solo responde por una orden durante unas 24 horas, y el enlace vive 7
 * dias: si no contesta, o contesta NO_TRANSACTION_FOUND, vale lo guardado en
 * D1 y la orden cuenta como no pagada. NO_TRANSACTION_FOUND no se aplica para
 * no devolver a pendiente una orden ya rechazada.
 */
const refreshResumedStatus = async (
  env: Env,
  identityKey: string,
  order: { orderId: string; status: OrderStatus }
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
  await applyOrderPayment(env.DB, order.orderId, {
    status,
    transactionId: voucher.transactionId,
    paymentMethod: voucher.paymentMethod,
  });

  return status;
};
