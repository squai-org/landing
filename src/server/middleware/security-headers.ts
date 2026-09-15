import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from '../types';

export const securityHeaders = (): MiddlewareHandler<AppBindings> => async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'same-origin');
};
