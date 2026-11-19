import { z } from 'zod';

/**
 * El navegador solo elige el plan. El monto y la divisa salen de la base: si
 * llegaran en el cuerpo, quien pague podria firmar su propio precio.
 */
export const checkoutSessionSchema = z.object({
  plan: z
    .string('Falta el plan a pagar.')
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.string().regex(/^[a-z0-9-]{2,60}$/, 'El plan no es valido.')),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
