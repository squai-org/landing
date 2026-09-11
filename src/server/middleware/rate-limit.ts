import type { MiddlewareHandler } from 'hono';
import { ApiError } from '../lib/http';
import type { AppBindings } from '../types';

/**
 * Rate limiting en el edge con el binding nativo de Workers: 5 peticiones por
 * minuto y por IP, configurado en `ratelimits` de wrangler.jsonc.
 * https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
 *
 * Va antes de leer el cuerpo y antes de tocar D1, para que un abuso no consuma
 * escrituras de la cuota diaria.
 */
export const rateLimit = (): MiddlewareHandler<AppBindings> => async (c, next) => {
  const limiter = c.env.API_RATE_LIMITER;

  // Sin binding (por ejemplo en un entorno de pruebas) no se bloquea nada.
  if (!limiter) {
    await next();
    return;
  }

  // Sin IP no hay forma de agrupar: se usa una clave común por ruta, que es
  // más estricta, nunca más laxa.
  const key = `${c.req.header('cf-connecting-ip') ?? 'sin-ip'}:${new URL(c.req.url).pathname}`;
  const { success } = await limiter.limit({ key });

  if (!success) {
    throw new ApiError(429, 'rate_limited', 'Demasiados envíos. Espera un minuto e inténtalo de nuevo.');
  }

  await next();
};
