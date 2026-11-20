import { checkout } from '../../config/checkout';
import { email } from '../../config/email';
import { resumeUrl } from '../../lib/bold-checkout';
import { SITE_URL } from '../../lib/seo';
import { sendBrevoTemplateEmail } from '../lib/brevo';
import {
  claimEmailMessage,
  findConfirmationData,
  findConfirmationsToRetry,
  findRecoveriesToRetry,
  findRecoveriesToSend,
  reclaimEmailMessage,
  recordEmailResult,
  type ConfirmationData,
  type RecoveryData,
} from '../repositories/email-message.repository';
import type { Env } from '../types';
import { programStatus, type ProgramStatus } from './program.service';

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

/**
 * Parametros de la plantilla de recuperacion (src/emails/recovery.html); el
 * mismo test de build comprueba que coinciden.
 */
export const RECOVERY_PARAMS = ['FIRST_NAME', 'PROGRAM_NAME', 'RESUME_URL'] as const;

type RecoveryParams = Record<(typeof RECOVERY_PARAMS)[number], string>;

/** Primer nombre de lo que escribio el cliente en el formulario. */
const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || fullName;

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
    FIRST_NAME: firstName(data.fullName),
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

  await deliverConfirmation(env.DB, apiKey, templateId, data, now);
};

/**
 * Envia por Brevo una confirmacion ya reclamada y anota el resultado (enviado
 * o fallido, con el error) en su fila de email_messages.
 */
const deliverConfirmation = async (
  db: D1Database,
  apiKey: string,
  templateId: number,
  data: ConfirmationData,
  now: Date
): Promise<void> => {
  const key = { orderId: data.orderId, kind: 'confirmation' as const };

  try {
    const { messageId } = await sendBrevoTemplateEmail(apiKey, {
      templateId,
      to: [{ email: data.email, name: data.fullName }],
      sender: email.sender,
      replyTo: email.replyTo,
      params: confirmationParams(data),
      tags: ['confirmation'],
    });

    await recordEmailResult(db, key, { status: 'sent', providerMessageId: messageId }, now);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Brevo no envio la confirmacion de ${data.orderId}: ${message}`);
    await recordEmailResult(db, key, { status: 'failed', error: message.slice(0, 500) }, now);
  }
};

/**
 * Margen antes de dar por perdida una confirmacion pendiente: el envio de
 * waitUntil tarda segundos, asi que una fila pendiente mas vieja que esto no
 * tiene a nadie enviandola.
 */
export const PENDING_GRACE_MINUTES = 10;

/** Confirmaciones por ejecucion del cron, para acotar su duracion. */
const RETRY_BATCH = 50;

/**
 * Reintenta las confirmaciones de ordenes aprobadas sin envio exitoso: las
 * fallidas, las pendientes atascadas y las aprobadas que nunca se reclamaron
 * (por ejemplo, sin BREVO_API_KEY o sin plantilla en su momento). Cada una se
 * reclama antes de enviar, asi que dos ejecuciones seguidas o cruzadas no
 * duplican el correo. Sin BREVO_API_KEY o sin plantilla no hace nada, igual
 * que sendConfirmation.
 */
export const retryConfirmations = async (env: Env, now: Date): Promise<void> => {
  const apiKey = env.BREVO_API_KEY;
  const templateId = email.templates.confirmation;

  if (!apiKey || !templateId) {
    console.error('BREVO_API_KEY o la plantilla de confirmacion no configurados: el cron no reintenta confirmaciones.');
    return;
  }

  const staleBefore = new Date(now.getTime() - PENDING_GRACE_MINUTES * 60_000);
  const candidates = await findConfirmationsToRetry(env.DB, staleBefore, RETRY_BATCH);

  for (const { orderId, hasMessage } of candidates) {
    try {
      const data = await findConfirmationData(env.DB, orderId);
      if (!data || data.status !== 'approved') continue;

      const claimed = hasMessage
        ? await reclaimEmailMessage(env.DB, { orderId, kind: 'confirmation' }, templateId, staleBefore, now)
        : await claimEmailMessage(
            env.DB,
            { orderId, customerId: data.customerId, programCode: data.programCode, kind: 'confirmation', templateId },
            now
          );

      if (claimed) await deliverConfirmation(env.DB, apiKey, templateId, data, now);
    } catch (error) {
      // Un error de D1 con una orden no detiene las demas; la proxima ejecucion la retoma.
      console.error(`El cron no pudo reintentar la confirmacion de ${orderId}:`, error);
    }
  }
};

export const recoveryParams = (data: RecoveryData): RecoveryParams => ({
  FIRST_NAME: firstName(data.fullName),
  PROGRAM_NAME: data.programName,
  RESUME_URL: resumeUrl(SITE_URL, data.orderId),
});

/** Recuperaciones por ejecucion del cron, para acotar su duracion. */
const RECOVERY_BATCH = 50;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Envia el correo de recuperacion: uno solo por cliente y programa, a quien
 * dejo su ultima orden sin pagar hace mas de checkout.recoveryDelayHours, no
 * esta inscrito y el programa sigue abierto. El enlace retoma esa orden, asi
 * que tampoco se envia si ya paso checkout.resumeExpiryDays desde que se creo.
 *
 * Cada envio se reclama antes en email_messages; el indice unico de
 * recuperacion por cliente y programa hace que dos ejecuciones seguidas o
 * cruzadas no dupliquen el correo. Las fallidas y las pendientes atascadas se
 * reintentan con la misma orden mientras sigan valiendo. Con el programa no
 * abierto no se reclama nada: si reabre a tiempo, el cliente la recibe. Sin
 * BREVO_API_KEY o sin plantilla no envia ni reclama nada.
 */
export const sendRecoveries = async (env: Env, now: Date): Promise<void> => {
  const apiKey = env.BREVO_API_KEY;
  const templateId = email.templates.recovery;

  if (!apiKey || !templateId) {
    console.error('BREVO_API_KEY o la plantilla de recuperacion no configurados: el cron no envia recuperaciones.');
    return;
  }

  const createdBefore = new Date(now.getTime() - checkout.recoveryDelayHours * HOUR_MS);
  const expiredBefore = new Date(now.getTime() - checkout.resumeExpiryDays * DAY_MS);
  const staleBefore = new Date(now.getTime() - PENDING_GRACE_MINUTES * 60_000);

  const retries = await findRecoveriesToRetry(env.DB, { staleBefore, expiredBefore }, RECOVERY_BATCH);
  const fresh = await findRecoveriesToSend(env.DB, { createdBefore, expiredBefore }, RECOVERY_BATCH);

  // Un estado por programa y ejecucion.
  const statuses = new Map<string, Promise<ProgramStatus>>();
  const isOpen = async (code: string) => {
    if (!statuses.has(code)) statuses.set(code, programStatus(env, code, now));
    return (await statuses.get(code)) === 'open';
  };

  const attempts = [
    ...retries.map((data) => ({ data, retry: true })),
    ...fresh.map((data) => ({ data, retry: false })),
  ];

  for (const { data, retry } of attempts) {
    try {
      if (!(await isOpen(data.programCode))) continue;

      const key = { orderId: data.orderId, kind: 'recovery' as const };
      const claimed = retry
        ? await reclaimEmailMessage(env.DB, key, templateId, staleBefore, now)
        : await claimEmailMessage(
            env.DB,
            { ...key, customerId: data.customerId, programCode: data.programCode, templateId },
            now
          );

      if (claimed) await deliverRecovery(env.DB, apiKey, templateId, data, now);
    } catch (error) {
      // Un error de D1 con un cliente no detiene a los demas; la proxima ejecucion lo retoma.
      console.error(`El cron no pudo enviar la recuperacion de ${data.orderId}:`, error);
    }
  }
};

/** Envia por Brevo una recuperacion ya reclamada y anota el resultado. */
const deliverRecovery = async (
  db: D1Database,
  apiKey: string,
  templateId: number,
  data: RecoveryData,
  now: Date
): Promise<void> => {
  const key = { orderId: data.orderId, kind: 'recovery' as const };

  try {
    const { messageId } = await sendBrevoTemplateEmail(apiKey, {
      templateId,
      to: [{ email: data.email, name: data.fullName }],
      sender: email.sender,
      replyTo: email.replyTo,
      params: recoveryParams(data),
      tags: ['recovery'],
    });

    await recordEmailResult(db, key, { status: 'sent', providerMessageId: messageId }, now);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Brevo no envio la recuperacion de ${data.orderId}: ${message}`);
    await recordEmailResult(db, key, { status: 'failed', error: message.slice(0, 500) }, now);
  }
};
