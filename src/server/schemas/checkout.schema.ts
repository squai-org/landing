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
 * Datos de quien se inscribe mas el programa que paga y la moneda en que
 * quiere pagar. El monto NO esta aqui a proposito: sale de la base para esa
 * moneda. Si llegara en el cuerpo, quien paga podria firmar su propio precio.
 *
 * `privacy_consent` lo exige el formulario en el navegador, igual que en
 * /api/contact; el servidor no lo revalida para no duplicar el contrato.
 */
export const checkoutSessionSchema = z.object({
  program: z
    .string('Falta el programa a pagar.')
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.string().regex(/^[a-z0-9-]{2,60}$/, 'El programa no es valido.')),
  currency: z
    .string('Falta la moneda.')
    .transform((value) => value.trim().toUpperCase())
    .pipe(z.enum(['COP', 'USD'], 'La moneda no es valida.')),
  full_name: nameField,
  email: emailField,
  country_code: countryCodeField,
  phone: phoneField,
  referral_source: referralSourceField,
  'cf-turnstile-response': turnstileTokenField,
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;

/**
 * Retomar una orden: el enlace solo lleva el order_id, que es opaco y no tiene
 * datos personales. Mismo alfabeto que acepta Bold en data-order-id.
 */
export const checkoutResumeSchema = z.object({
  order_id: z
    .string('Falta el identificador de la compra.')
    .trim()
    .regex(/^[A-Za-z0-9_-]{1,60}$/, 'El identificador de la compra no es valido.'),
});

export type CheckoutResumeInput = z.infer<typeof checkoutResumeSchema>;
