import { z } from 'zod';

/**
 * Sobre CloudEvents que manda el webhook de Bold. Solo se exige lo que se
 * guarda: el resto del evento se conserva crudo en la columna payload, asi que
 * un campo nuevo de Bold no rompe la recepcion.
 * https://developers.bold.co/webhook
 */
const optionalString = z.string().max(512).nullish();

export const boldWebhookEventSchema = z.object({
  id: optionalString,
  type: z.string().min(1).max(64),
  /** POSIX en milisegundos en los ejemplos de Bold. */
  time: z.number().nullish(),
  data: z.object({
    payment_id: z.string().min(1).max(128),
    metadata: z.object({ reference: optionalString }).nullish(),
    amount: z
      .object({
        total: z.number().nullish(),
        currency: optionalString,
      })
      .nullish(),
    payment_method: optionalString,
    payer_email: optionalString,
    card: z
      .object({
        brand: optionalString,
        masked_pan: optionalString,
      })
      .nullish(),
  }),
});

export type BoldWebhookEvent = z.infer<typeof boldWebhookEventSchema>;
