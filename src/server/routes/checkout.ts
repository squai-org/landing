import { Hono } from 'hono';
import { badRequest, ok } from '../lib/http';
import { parseBody } from '../lib/validate';
import { checkoutSessionSchema } from '../schemas/checkout.schema';
import {
  confirmOrder,
  createCheckoutSession,
  handleBoldWebhook,
  loadPaymentPlan,
} from '../services/checkout.service';
import type { AppBindings } from '../types';

export const checkoutRoute = new Hono<AppBindings>()
  /** Precio vigente para pintarlo en la pagina: es el mismo que se firma. */
  .get('/plan/:code', async (c) => {
    const plan = await loadPaymentPlan(c.env, c.req.param('code'));

    return ok(c, { plan });
  })
  /**
   * Verificacion de retorno. La pagina de gracias llega con el order-id en la
   * URL; el veredicto lo da Bold, no el parametro bold-tx-status.
   */
  .get('/status', async (c) => {
    const orderId = c.req.query('order_id')?.trim();

    if (!orderId) throw badRequest('order_id_missing', 'Falta el identificador de la compra.');

    return ok(c, { order: await confirmOrder(c.env, orderId) });
  })
  .post('/session', async (c) => {
    const raw = await c.req.json().catch(() => {
      throw badRequest('invalid_json', 'El cuerpo de la peticion no es JSON valido.');
    });

    const session = await createCheckoutSession(c.env, parseBody(checkoutSessionSchema, raw), c.get('requestMeta'));

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
