import { badRequest, forbidden } from '../lib/http';
import { normalizePhone } from '../lib/phone';
import { verifyTurnstileToken } from '../lib/turnstile';
import { insertContactRequest } from '../repositories/contact.repository';
import { upsertWaitlistSignup, type WaitlistUpsertResult } from '../repositories/waitlist.repository';
import type { ContactInput } from '../schemas/contact.schema';
import type { WaitlistInput } from '../schemas/waitlist.schema';
import type { Env, RequestMeta } from '../types';

const assertHuman = async (
  env: Env,
  token: string | undefined,
  expectedAction: 'contact' | 'waitlist',
  meta: RequestMeta
) => {
  const secret = env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.warn('TURNSTILE_SECRET_KEY no configurado: se omite la verificación de bot.');
    return;
  }

  if (!token) {
    throw badRequest('turnstile_missing', 'Completa la verificación de seguridad.');
  }

  const verification = await verifyTurnstileToken(secret, token, meta.ip);

  if (!verification.success) {
    console.warn('Turnstile rechazó el envío', verification['error-codes']);
    throw forbidden('turnstile_failed', 'No pudimos verificar que eres una persona. Recarga e inténtalo de nuevo.');
  }

  if (verification.action !== expectedAction) {
    console.warn('Turnstile devolvió una acción inesperada', verification.action);
    throw forbidden('turnstile_action_mismatch', 'No pudimos verificar que eres una persona. Recarga e inténtalo de nuevo.');
  }

  if (env.TURNSTILE_HOSTNAME && verification.hostname !== env.TURNSTILE_HOSTNAME) {
    console.warn('Turnstile devolvió un hostname inesperado', verification.hostname);
    throw forbidden('turnstile_hostname_mismatch', 'No pudimos verificar que eres una persona. Recarga e inténtalo de nuevo.');
  }
};

const requirePhone = (countryCode: string, phone: string) => {
  const normalized = normalizePhone(countryCode, phone);

  if (!normalized) {
    throw badRequest('invalid_phone', 'Revisa los campos del formulario.', {
      phone: 'El número de teléfono no es válido.',
    });
  }

  return normalized;
};

export const submitWaitlist = async (
  env: Env,
  input: WaitlistInput,
  meta: RequestMeta
): Promise<WaitlistUpsertResult> => {
  await assertHuman(env, input['cf-turnstile-response'], 'waitlist', meta);

  const phone = requirePhone(input.country_code, input.phone);

  return upsertWaitlistSignup(env.DB, {
    fullName: input.full_name,
    email: input.email,
    countryCode: phone.countryCode,
    phone: phone.nationalNumber,
    phoneE164: phone.e164,
    sourcePage: meta.sourcePage,
    ipCountry: meta.ipCountry,
    userAgent: meta.userAgent,
  });
};

export const submitContactRequest = async (
  env: Env,
  input: ContactInput,
  meta: RequestMeta
): Promise<number> => {
  await assertHuman(env, input['cf-turnstile-response'], 'contact', meta);

  const phone = requirePhone(input.country_code, input.phone);

  return insertContactRequest(env.DB, {
    ecosystem: input.ecosystem,
    fullName: input.full_name,
    email: input.email,
    organization: input.organization,
    role: input.role,
    countryCode: phone.countryCode,
    phone: phone.nationalNumber,
    phoneE164: phone.e164,
    teamSize: input.team_size,
    message: input.message,
    sourcePage: meta.sourcePage,
    ipCountry: meta.ipCountry,
    userAgent: meta.userAgent,
  });
};
