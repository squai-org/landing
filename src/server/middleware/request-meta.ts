import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from '../types';

export const requestMeta = (): MiddlewareHandler<AppBindings> => async (c, next) => {
  c.set('requestMeta', {
    sourcePage: c.req.header('referer') ?? null,
    ipCountry: c.req.header('cf-ipcountry') ?? null,
    userAgent: c.req.header('user-agent')?.slice(0, 512) ?? null,
    ip: c.req.header('cf-connecting-ip') ?? null,
  });

  await next();
};
