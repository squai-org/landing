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

export const RECOVERY_PARAMS = ['FIRST_NAME', 'PROGRAM_NAME', 'RESUME_URL', 'RESUME_EXPIRY_DAYS'] as const;

type RecoveryParams = Record<(typeof RECOVERY_PARAMS)[number], string>;

const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || fullName;

const TAX_RATES: Record<Tax, number> = { 'vat-19': 0.19 };

export const vatBreakdown = (total: number, tax: Tax | null) => {
  const rate = tax ? TAX_RATES[tax] : 0;
  const base = Math.round(total / (1 + rate));
  return { base, vat: total - base };
};

const money = (amount: number) => `$${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const LONG_DATE = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const longDate = (day: string | null) =>
  day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? LONG_DATE.format(new Date(`${day}T00:00:00Z`)) : null;

const duration = (startsOn: string | null, endsOn: string | null) => {
  if (!longDate(startsOn) || !longDate(endsOn)) return copy.pending;
  const days = (Date.parse(`${endsOn}T00:00:00Z`) - Date.parse(`${startsOn}T00:00:00Z`)) / DAY_MS + 1;
  const weeks = Math.ceil(days / 7);
  return (weeks === 1 ? copy.durationOne : copy.durationMany).replace('{weeks}', String(weeks));
};

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
  RESUME_EXPIRY_DAYS: String(checkout.resumeExpiryDays),
});

interface BrevoTemplate {
  apiKey: string;
  templateId: number;
}

const brevoTemplate = (env: Env, kind: EmailKind): BrevoTemplate | null => {
  const apiKey = env.BREVO_API_KEY;
  const templateId = email.templates[kind];

  if (!apiKey || !templateId) {
    console.error(`BREVO_API_KEY o la plantilla de ${kind} no configurados: no se envia ni se reclama ese correo.`);
    return null;
  }

  return { apiKey, templateId };
};

export const PENDING_GRACE_MINUTES = 10;

const staleBefore = (now: Date) => before(now, PENDING_GRACE_MINUTES * MINUTE_MS);

interface EmailMessageKey {
  orderId: string;
  customerId: number;
  programCode: string;
  kind: EmailKind;
}

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

export const sendConfirmation = async (env: Env, orderId: string, now: Date): Promise<void> => {
  const template = brevoTemplate(env, 'confirmation');
  if (!template) return;

  const data = await findConfirmationData(env.DB, orderId);

  if (!data || data.status !== 'approved') return;

  await confirm(env.DB, template, data, false, now);
};

const RETRY_BATCH = 50;

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
      console.error(`El cron no pudo reintentar la confirmacion de ${orderId}:`, error);
    }
  }
};

const RECOVERY_BATCH = 50;

export const sendRecoveries = async (env: Env, now: Date): Promise<void> => {
  const template = brevoTemplate(env, 'recovery');
  if (!template) return;

  const createdBefore = before(now, checkout.recoveryDelayHours * HOUR_MS);
  const expiredBefore = before(now, checkout.resumeExpiryDays * DAY_MS);

  const retries = await findRecoveriesToRetry(env.DB, { staleBefore: staleBefore(now), expiredBefore }, RECOVERY_BATCH);
  const fresh = await findRecoveriesToSend(env.DB, { createdBefore, expiredBefore }, RECOVERY_BATCH);

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
      console.error(`El cron no pudo enviar la recuperacion de ${data.orderId}:`, error);
    }
  }
};
