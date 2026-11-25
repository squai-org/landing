import { z } from 'zod';
import { CURRENCIES } from '../../config/checkout';
import {
  countryCodeField,
  emailField,
  nameField,
  phoneField,
  referralSourceField,
  turnstileTokenField,
} from './common';

export const checkoutSessionSchema = z.object({
  program: z
    .string('Falta el programa a pagar.')
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.string().regex(/^[a-z0-9-]{2,60}$/, 'El programa no es valido.')),
  currency: z
    .string('Falta la moneda.')
    .transform((value) => value.trim().toUpperCase())
    .pipe(z.enum(CURRENCIES, 'La moneda no es valida.')),
  full_name: nameField,
  email: emailField,
  country_code: countryCodeField,
  phone: phoneField,
  referral_source: z.preprocess((value) => (value === '' ? undefined : value), referralSourceField.optional()),
  'cf-turnstile-response': turnstileTokenField,
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;

export const checkoutResumeSchema = z.object({
  order_id: z
    .string('Falta el identificador de la compra.')
    .trim()
    .regex(/^[A-Za-z0-9_-]{1,60}$/, 'El identificador de la compra no es valido.'),
});

export type CheckoutResumeInput = z.infer<typeof checkoutResumeSchema>;
