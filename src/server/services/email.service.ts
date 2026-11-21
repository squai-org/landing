import { checkout, resumeUrl, type Tax } from '../../config/checkout';
import { email } from '../../config/email';
import { legalPaths } from '../../config/legal';
import { SITE_URL } from '../../config/site';
import { sendBrevoTemplateEmail } from '../lib/brevo';
import { company, confirmationEmailCopy as copy } from '../lib/copy';
import { before, DAY_MS, HOUR_MS, MINUTE_MS } from '../lib/time';
import {
  claimEmailMessage,
  findConfirmationData,
  findConfirmationsToRetry,
  findRecoveriesToRetry,
  findRecoveriesToSend,
  reclaimEmailMessage,
  recordEmailResult,
  type ConfirmationData,
  type EmailKind,
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
export const RECOVERY_PARAMS = ['FIRST_NAME', 'PROGRAM_NAME', 'RESUME_URL', 'RESUME_EXPIRY_DAYS'] as const;

type RecoveryParams = Record<(typeof RECOVERY_PARAMS)[number], string>;

/** Primer nombre de lo que escribio el cliente en el formulario. */
const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || fullName;

/** Tasa de cada impuesto que se declara a Bold, incluido en el monto. */
const TAX_RATES: Record<Tax, number> = { 'vat-19': 0.19 };

/**
 * Desglose de un monto con IVA incluido, en enteros: base = round(total / (1 + tasa))
 * e IVA = total - base, asi base + IVA siempre suma el total cobrado. Una orden
 * sin impuesto declarado (anteriores a 0007) va completa como base.
 */
export const vatBreakdown = (total: number, tax: Tax | null) => {
  const rate = tax ? TAX_RATES[tax] : 0;
  const base = Math.round(total / (1 + rate));
  return { base, vat: total - base };
};

/** $440.000: separador de miles con punto, como se escribe en Colombia. */
const money = (amount: number) => `$${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/**
 * "12 de <mes> de 2027": los nombres de los meses los pone Intl (es-CO), no
 * este archivo. En UTC porque el dia viene sin hora y no debe correrse.
 */
const LONG_DATE = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** YYYY-MM-DD a fecha larga en espanol; sin fecha valida, null. */
const longDate = (day: string | null) =>
  day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? LONG_DATE.format(new Date(`${day}T00:00:00Z`)) : null;

/** Semanas entre inicio y fin, contando ambos dias. */
const duration = (startsOn: string | null, endsOn: string | null) => {
  if (!longDate(startsOn) || !longDate(endsOn)) return copy.pending;
  const days = (Date.parse(`${endsOn}T00:00:00Z`) - Date.parse(`${startsOn}T00:00:00Z`)) / DAY_MS + 1;
  const weeks = Math.ceil(days / 7);
  return (weeks === 1 ? copy.durationOne : copy.durationMany).replace('{weeks}', String(weeks));
};

/** Forma de pago que informa Bold, en palabras del cliente; una desconocida va tal cual. */
const paymentMethod = (method: string | null) => {
  if (!method) return copy.paymentMethodFallback;
  return Object.hasOwn(copy.paymentMethods, method)
    ? copy.paymentMethods[method as keyof typeof copy.paymentMethods]
    : method;
};

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
    START_DATE: start ?? copy.pending,
    END_DATE: longDate(data.endsOn) ?? copy.pending,
    SCHEDULE: data.schedule?.trim() || copy.pending,
    DURATION: duration(data.startsOn, data.endsOn),
    SESSIONS_LINK_INFO: start ? copy.sessionsLinkBefore.replace('{date}', start) : copy.sessionsLinkFallback,
    COMPANY_NAME: company.legalName,
    COMPANY_NIT: company.nit,
    COMPANY_ADDRESS: company.address,
    COMPANY_PHONE: company.phone,
    COMPANY_CONTACT: company.contact,
    TERMS_URL: `${SITE_URL}${legalPaths.terms}`,
  };
};


export const recoveryParams = (data: RecoveryData): RecoveryParams => ({
  FIRST_NAME: firstName(data.fullName),
  PROGRAM_NAME: data.programName,
  RESUME_URL: resumeUrl(SITE_URL, data.orderId),
  // El plazo sale de la configuracion que aplica /api/checkout/resume, no de la plantilla.
  RESUME_EXPIRY_DAYS: String(checkout.resumeExpiryDays),
});

/** Llave de Brevo y plantilla con que sale un tipo de correo. */
interface BrevoTemplate {
  apiKey: string;
  templateId: number;
}

/**
 * Sin BREVO_API_KEY o sin id de plantilla (null hasta subirla a Brevo) no se
 * envia ni se reclama nada: la fila no existe y el cron la toma cuando haya
 * configuracion. Es la unica comprobacion para los dos correos.
 */
const brevoTemplate = (env: Env, kind: EmailKind): BrevoTemplate | null => {
  const apiKey = env.BREVO_API_KEY;
  const templateId = email.templates[kind];

  if (!apiKey || !templateId) {
    console.error(`BREVO_API_KEY o la plantilla de ${kind} no configurados: no se envia ni se reclama ese correo.`);
    return null;
  }

  return { apiKey, templateId };
};

/**
 * Margen antes de dar por perdido un envio pendiente: el de waitUntil tarda
 * segundos, asi que una fila pendiente mas vieja que esto no tiene a nadie
 * enviandola. Vale para confirmaciones y recuperaciones.
 */
export const PENDING_GRACE_MINUTES = 10;

const staleBefore = (now: Date) => before(now, PENDING_GRACE_MINUTES * MINUTE_MS);

interface EmailMessageKey {
  orderId: string;
  customerId: number;
  programCode: string;
  kind: EmailKind;
}

/**
 * Reclama el envio antes de hacerlo. La primera vez crea la fila pendiente
 * (claimEmailMessage); un reintento la vuelve a dejar pendiente si estaba
 * fallida o atascada (reclaimEmailMessage). En los dos casos solo quien
 * cambio la fila envia, asi dos llamadas cruzadas no duplican el correo.
 */
const claim = async (
  db: D1Database,
  message: EmailMessageKey,
  templateId: number,
  retry: boolean,
  now: Date
): Promise<boolean> =>
  retry
    ? reclaimEmailMessage(db, { orderId: message.orderId, kind: message.kind }, templateId, staleBefore(now), now)
    : claimEmailMessage(db, { ...message, templateId }, now);

/**
 * Envia por Brevo un correo ya reclamado y anota el resultado (enviado o
 * fallido, con el error) en su fila de email_messages.
 *
 * Entrega al menos una vez: si Brevo acepta y falla la escritura en D1, la
 * fila queda pendiente y el cron la reenvia pasado PENDING_GRACE_MINUTES.
 */
const deliver = async (
  db: D1Database,
  template: BrevoTemplate,
  message: { orderId: string; kind: EmailKind; to: { email: string; name: string }; params: Record<string, string> },
  now: Date
): Promise<void> => {
  const key = { orderId: message.orderId, kind: message.kind };

  try {
    const { messageId } = await sendBrevoTemplateEmail(template.apiKey, {
      templateId: template.templateId,
      to: [message.to],
      sender: email.sender,
      replyTo: email.replyTo,
      params: message.params,
      tags: [message.kind],
    });

    await recordEmailResult(db, key, { status: 'sent', providerMessageId: messageId }, now);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Brevo no envio el correo ${message.kind} de ${message.orderId}: ${reason}`);
    await recordEmailResult(db, key, { status: 'failed', error: reason.slice(0, 500) }, now);
  }
};

/** Reclama y envia la confirmacion de una orden aprobada. */
const confirm = async (
  db: D1Database,
  template: BrevoTemplate,
  data: ConfirmationData,
  retry: boolean,
  now: Date
): Promise<void> => {
  const message = { orderId: data.orderId, customerId: data.customerId, programCode: data.programCode, kind: 'confirmation' as const };

  if (!(await claim(db, message, template.templateId, retry, now))) return;

  await deliver(
    db,
    template,
    { ...message, to: { email: data.email, name: data.fullName }, params: confirmationParams(data) },
    now
  );
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
  const template = brevoTemplate(env, 'confirmation');
  if (!template) return;

  const data = await findConfirmationData(env.DB, orderId);

  // Una anulacion pudo llegar antes de este envio.
  if (!data || data.status !== 'approved') return;

  await confirm(env.DB, template, data, false, now);
};

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
  const template = brevoTemplate(env, 'confirmation');
  if (!template) return;

  const candidates = await findConfirmationsToRetry(env.DB, staleBefore(now), RETRY_BATCH);

  for (const { orderId, hasMessage } of candidates) {
    try {
      const data = await findConfirmationData(env.DB, orderId);
      if (!data || data.status !== 'approved') continue;

      await confirm(env.DB, template, data, hasMessage, now);
    } catch (error) {
      // Un error de D1 con una orden no detiene las demas; la proxima ejecucion la retoma.
      console.error(`El cron no pudo reintentar la confirmacion de ${orderId}:`, error);
    }
  }
};

/** Recuperaciones por ejecucion del cron, para acotar su duracion. */
const RECOVERY_BATCH = 50;

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
  const template = brevoTemplate(env, 'recovery');
  if (!template) return;

  const createdBefore = before(now, checkout.recoveryDelayHours * HOUR_MS);
  const expiredBefore = before(now, checkout.resumeExpiryDays * DAY_MS);

  const retries = await findRecoveriesToRetry(env.DB, { staleBefore: staleBefore(now), expiredBefore }, RECOVERY_BATCH);
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

      const message = { orderId: data.orderId, customerId: data.customerId, programCode: data.programCode, kind: 'recovery' as const };

      if (!(await claim(env.DB, message, template.templateId, retry, now))) continue;

      await deliver(
        env.DB,
        template,
        { ...message, to: { email: data.email, name: data.fullName }, params: recoveryParams(data) },
        now
      );
    } catch (error) {
      // Un error de D1 con un cliente no detiene a los demas; la proxima ejecucion lo retoma.
      console.error(`El cron no pudo enviar la recuperacion de ${data.orderId}:`, error);
    }
  }
};
