import { email } from '../../config/email';
import { SITE_URL } from '../../lib/seo';
import { sendBrevoTemplateEmail } from '../lib/brevo';
import {
  claimEmailMessage,
  findConfirmationData,
  recordEmailResult,
  type ConfirmationData,
} from '../repositories/email-message.repository';
import type { Env } from '../types';

/**
 * Parametros que el Worker envia a la plantilla de confirmacion. Cada uno es
 * un placeholder {{ params.NOMBRE }} de src/emails/confirmation.html; un test
 * de build comprueba que coinciden.
 */
export const CONFIRMATION_PARAMS = [
  'FIRST_NAME',
  'PROGRAM_NAME',
  'ORDER_ID',
  'AMOUNT_TOTAL',
  'AMOUNT_BASE',
  'AMOUNT_VAT',
  'CURRENCY',
  'PAYMENT_METHOD',
  'START_DATE',
  'END_DATE',
  'SCHEDULE',
  'DURATION',
  'SESSIONS_LINK_INFO',
  'COMPANY_NAME',
  'COMPANY_NIT',
  'COMPANY_ADDRESS',
  'COMPANY_PHONE',
  'COMPANY_CONTACT',
  'TERMS_URL',
] as const;

type ConfirmationParams = Record<(typeof CONFIRMATION_PARAMS)[number], string>;

/** Tasa de cada impuesto que se declara a Bold, incluido en el monto. */
const TAX_RATES: Record<string, number> = { 'vat-19': 0.19 };

/**
 * Desglose de un monto con IVA incluido, en enteros: base = round(total / (1 + tasa))
 * e IVA = total - base, asi base + IVA siempre suma el total cobrado. Una orden
 * sin impuesto declarado (anteriores a 0007) va completa como base.
 */
export const vatBreakdown = (total: number, tax: string | null) => {
  const rate = (tax && TAX_RATES[tax]) || 0;
  const base = Math.round(total / (1 + rate));
  return { base, vat: total - base };
};

/** $440.000: separador de miles con punto, como se escribe en Colombia. */
const money = (amount: number) => `$${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const PENDING = 'Por confirmar';

/** YYYY-MM-DD a "12 de enero de 2027"; sin fecha, "Por confirmar". */
const longDate = (day: string | null) => {
  const match = day?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return `${Number(match[3])} de ${MONTHS[Number(match[2]) - 1]} de ${match[1]}`;
};

/** Semanas entre inicio y fin, contando ambos dias. */
const duration = (startsOn: string | null, endsOn: string | null) => {
  if (!longDate(startsOn) || !longDate(endsOn)) return PENDING;
  const days = (Date.parse(`${endsOn}T00:00:00Z`) - Date.parse(`${startsOn}T00:00:00Z`)) / 86_400_000 + 1;
  const weeks = Math.ceil(days / 7);
  return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
};

/** Forma de pago que informa Bold, en palabras del cliente. */
const PAYMENT_METHODS: Record<string, string> = {
  CREDIT_CARD: 'Tarjeta de crédito',
  DEBIT_CARD: 'Tarjeta débito',
  PSE: 'PSE',
  NEQUI: 'Nequi',
  BOTON_BANCOLOMBIA: 'Botón Bancolombia',
};

const paymentMethod = (method: string | null) => (method ? (PAYMENT_METHODS[method] ?? method) : 'Pago en línea con Bold');

export const confirmationParams = (data: ConfirmationData): ConfirmationParams => {
  const { base, vat } = vatBreakdown(data.amount, data.tax);
  const start = longDate(data.startsOn);

  return {
    FIRST_NAME: data.fullName.trim().split(/\s+/)[0] ?? data.fullName,
    PROGRAM_NAME: data.programName,
    ORDER_ID: data.orderId,
    AMOUNT_TOTAL: money(data.amount),
    AMOUNT_BASE: money(base),
    AMOUNT_VAT: money(vat),
    CURRENCY: data.currency,
    PAYMENT_METHOD: paymentMethod(data.paymentMethod),
    START_DATE: start ?? PENDING,
    END_DATE: longDate(data.endsOn) ?? PENDING,
    SCHEDULE: data.schedule?.trim() || PENDING,
    DURATION: duration(data.startsOn, data.endsOn),
    SESSIONS_LINK_INFO: start ? `antes del ${start}` : 'antes de la primera sesión',
    COMPANY_NAME: email.company.name,
    COMPANY_NIT: email.company.nit,
    COMPANY_ADDRESS: email.company.address,
    COMPANY_PHONE: email.company.phone,
    COMPANY_CONTACT: email.company.contact,
    TERMS_URL: `${SITE_URL}${email.termsPath}`,
  };
};

/**
 * Envia el correo de confirmacion de una orden aprobada (acuse de recibo).
 *
 * Primero reclama la fila en email_messages y solo envia quien la creo: el
 * webhook y /status pueden llegar juntos o repetirse y sale un solo correo.
 * El resultado (enviado o fallido, con el error) queda en la misma fila para
 * que el cron reintente los fallidos. Sin BREVO_API_KEY o sin plantilla no se
 * reclama nada: la orden queda aprobada y sin fila, y el cron la toma despues.
 */
export const sendConfirmation = async (env: Env, orderId: string, now: Date): Promise<void> => {
  const apiKey = env.BREVO_API_KEY;
  const templateId = email.templates.confirmation;

  if (!apiKey || !templateId) {
    console.error('BREVO_API_KEY o la plantilla de confirmacion no configurados: no se envia la confirmacion.');
    return;
  }

  const data = await findConfirmationData(env.DB, orderId);

  // Una anulacion pudo llegar antes de este envio.
  if (!data || data.status !== 'approved') return;

  const claimed = await claimEmailMessage(
    env.DB,
    { orderId, customerId: data.customerId, programCode: data.programCode, kind: 'confirmation', templateId },
    now
  );

  if (!claimed) return;

  const key = { orderId, kind: 'confirmation' as const };

  try {
    const { messageId } = await sendBrevoTemplateEmail(apiKey, {
      templateId,
      to: [{ email: data.email, name: data.fullName }],
      sender: email.sender,
      replyTo: email.replyTo,
      params: confirmationParams(data),
      tags: ['confirmation'],
    });

    await recordEmailResult(env.DB, key, { status: 'sent', providerMessageId: messageId }, now);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Brevo no envio la confirmacion de ${orderId}: ${message}`);
    await recordEmailResult(env.DB, key, { status: 'failed', error: message.slice(0, 500) }, now);
  }
};
