import { Hono, type Context } from 'hono';
import { defer } from '../lib/background';
import { badRequest, ok } from '../lib/http';
import { parseBody } from '../lib/validate';
import { checkoutResumeSchema, checkoutSessionSchema } from '../schemas/checkout.schema';
import { confirmOrder, createCheckoutSession, handleBoldWebhook, resumeOrder } from '../services/checkout.service';
import { sendConfirmation } from '../services/email.service';
import { loadProgram } from '../services/program.service';
import type { AppBindings } from '../types';

/**
 * Cuando una orden pasa a aprobada, el correo de confirmacion sale con
 * waitUntil: la respuesta (y el 200 que Bold espera en menos de 2 s) no
 * espera a Brevo.
 */
const confirmInBackground = (c: Context<AppBindings>) => (orderId: string) =>
  defer(c)(sendConfirmation(c.env, orderId, new Date()));

export const checkoutRoute = new Hono<AppBindings>()
  /**
   * Precios vigentes por moneda para pintarlos en la pagina: son los mismos que
   * se firman. La moneda por defecto sale del pais que informa Cloudflare.
   */
  .get('/program/:code', async (c) => {
    const program = await loadProgram(c.env, c.req.param('code'), new Date(), c.get('requestMeta').ipCountry);

    return ok(c, { program });
  })
  /**
   * Verificacion de retorno. La pagina de gracias llega con el order-id en la
   * URL; el veredicto lo da Bold, no el parametro bold-tx-status.
   */
  .get('/status', async (c) => {
    const orderId = c.req.query('order_id')?.trim();

    if (!orderId) throw badRequest('order_id_missing', 'Falta el identificador de la compra.');

    return ok(c, { order: await confirmOrder(c.env, orderId, confirmInBackground(c)) });
  })
  .post('/session', async (c) => {
    const raw = await c.req.json().catch(() => {
      throw badRequest('invalid_json', 'El cuerpo de la peticion no es JSON valido.');
    });

    const session = await createCheckoutSession(
      c.env,
      parseBody(checkoutSessionSchema, raw),
      c.get('requestMeta'),
      new Date()
    );

    return ok(c, { session }, 201);
  })
  /**
   * Retomar una orden sin pagar desde el enlace de /retomar. No pide Turnstile:
   * quien llega ya lleno el formulario y trae un order_id; lo frenan el mismo
   * origen y el limite por IP.
   */
  .post('/resume', async (c) => {
    const raw = await c.req.json().catch(() => {
      throw badRequest('invalid_json', 'El cuerpo de la peticion no es JSON valido.');
    });

    const result = await resumeOrder(
      c.env,
      parseBody(checkoutResumeSchema, raw),
      c.get('requestMeta'),
      new Date(),
      confirmInBackground(c)
    );

    return 'session' in result ? ok(c, result, 201) : ok(c, result);
  })
  /**
   * Notificaciones de Bold. No pasa por jsonRequest ni por rateLimit: Bold no
   * es un navegador y espera un 200 en menos de 2 segundos, asi que un limite
   * por IP tiraria notificaciones legitimas en una rafaga de ventas.
   */
  .post('/webhook', async (c) => {
    const rawBody = await c.req.text();
    const event = await handleBoldWebhook(
      c.env,
      rawBody,
      c.req.header('x-bold-signature'),
      confirmInBackground(c)
    );

    return ok(c, event);
  });
