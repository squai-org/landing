import { badRequest } from '../lib/http';
import { assertHuman } from '../lib/human';
import { normalizePhone } from '../lib/phone';
import { insertContactRequest } from '../repositories/contact.repository';
import type { ContactInput } from '../schemas/contact.schema';
import type { Env, RequestMeta } from '../types';

const requirePhone = (countryCode: string, phone: string) => {
  const normalized = normalizePhone(countryCode, phone);

  if (!normalized) {
    throw badRequest('invalid_phone', 'Revisa los campos del formulario.', {
      phone: 'El número de teléfono no es válido.',
    });
  }

  return normalized;
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
    referralSource: input.referral_source,
    message: input.message,
    sourcePage: meta.sourcePage,
    ipCountry: meta.ipCountry,
    userAgent: meta.userAgent,
  });
};
