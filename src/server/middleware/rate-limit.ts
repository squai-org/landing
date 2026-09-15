import type { MiddlewareHandler } from 'hono';
import { ApiError } from '../lib/http';
import type { AppBindings } from '../types';

export const rateLimit = (): MiddlewareHandler<AppBindings> => async (c, next) => {
  const limiter = c.env.API_RATE_LIMITER;

  if (!limiter) {
    await next();
    return;
  }

  const key = `${c.req.header('cf-connecting-ip') ?? 'sin-ip'}:${new URL(c.req.url).pathname}`;
  const { success } = await limiter.limit({ key });

  if (!success) {
    throw new ApiError(429, 'rate_limited', 'Demasiados envíos. Espera un minuto e inténtalo de nuevo.');
  }

  await next();
};
