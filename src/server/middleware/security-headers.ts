import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from '../types';

/** Las respuestas de la API nunca se cachean ni se interpretan como otro tipo. */
export const securityHeaders = (): MiddlewareHandler<AppBindings> => async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'same-origin');
};
