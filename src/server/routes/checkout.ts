import { Hono } from 'hono';
import { badRequest, ok } from '../lib/http';
import { parseBody } from '../lib/validate';
import { checkoutSessionSchema } from '../schemas/checkout.schema';
import { createCheckoutSession, handleBoldWebhook, loadPaymentPlan } from '../services/checkout.service';
import type { AppBindings } from '../types';

export const checkoutRoute = new Hono<AppBindings>()
  /** Precio vigente para pintarlo en la pagina: es el mismo que se firma. */
  .get('/plan/:code', async (c) => {
    const plan = await loadPaymentPlan(c.env, c.req.param('code'));

    return ok(c, { plan });
  })
  .post('/session', async (c) => {
    const raw = await c.req.json().catch(() => {
      throw badRequest('invalid_json', 'El cuerpo de la peticion no es JSON valido.');
    });

    const session = await createCheckoutSession(c.env, parseBody(checkoutSessionSchema, raw));

    return ok(c, { session }, 201);
  })
  /**
   * Notificaciones de Bold. No pasa por jsonRequest ni por rateLimit: Bold no
   * es un navegador y espera un 200 en menos de 2 segundos, asi que un limite
   * por IP tiraria notificaciones legitimas en una rafaga de ventas.
   */
  .post('/webhook', async (c) => {
    const rawBody = await c.req.text();
    const event = await handleBoldWebhook(c.env, rawBody, c.req.header('x-bold-signature'));

    return ok(c, event);
  });
