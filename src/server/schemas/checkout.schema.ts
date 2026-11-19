import { z } from 'zod';
import {
  countryCodeField,
  emailField,
  nameField,
  phoneField,
  referralSourceField,
  turnstileTokenField,
} from './common';

/**
 * Datos de quien se inscribe mas el plan que paga. El monto y la divisa NO
 * estan aqui a proposito: salen de la base. Si llegaran en el cuerpo, quien
 * paga podria firmar su propio precio.
 *
 * `privacy_consent` lo exige el formulario en el navegador, igual que en
 * /api/contact; el servidor no lo revalida para no duplicar el contrato.
 */
export const checkoutSessionSchema = z.object({
  plan: z
    .string('Falta el plan a pagar.')
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.string().regex(/^[a-z0-9-]{2,60}$/, 'El plan no es valido.')),
  full_name: nameField,
  email: emailField,
  country_code: countryCodeField,
  phone: phoneField,
  referral_source: referralSourceField,
  'cf-turnstile-response': turnstileTokenField,
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
