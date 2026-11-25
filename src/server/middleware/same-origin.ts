import type { MiddlewareHandler } from 'hono';
import { forbidden } from '../lib/http';
import type { AppBindings } from '../types';

export const sameOrigin = (): MiddlewareHandler<AppBindings> => async (c, next) => {
  const origin = c.req.header('origin');

  if (origin) {
    const requestHost = new URL(c.req.url).host;
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }

    if (originHost !== requestHost) {
      throw forbidden('cross_origin_blocked', 'Origen no permitido.');
    }
  }

  await next();
};
