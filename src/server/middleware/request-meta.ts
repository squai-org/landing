import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from '../types';

/**
 * Recoge metadatos de la petición para auditar el origen del lead.
 * La IP solo viaja hacia Turnstile; en D1 se guarda únicamente el país que
 * Cloudflare añade en la cabecera CF-IPCountry.
 * https://developers.cloudflare.com/fundamentals/reference/http-headers/
 */
export const requestMeta = (): MiddlewareHandler<AppBindings> => async (c, next) => {
  c.set('requestMeta', {
    sourcePage: c.req.header('referer') ?? null,
    ipCountry: c.req.header('cf-ipcountry') ?? null,
    userAgent: c.req.header('user-agent')?.slice(0, 512) ?? null,
    ip: c.req.header('cf-connecting-ip') ?? null,
  });

  await next();
};
