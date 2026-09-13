import type { MiddlewareHandler } from 'hono';
import { forbidden } from '../lib/http';
import type { AppBindings } from '../types';

/**
 * El front y la API comparten dominio, así que la API no emite cabeceras CORS
 * y además rechaza cualquier petición que declare un Origin distinto al host.
 * Eso corta los POST cross-site desde páginas de terceros.
 */
export const sameOrigin = (): MiddlewareHandler<AppBindings> => async (c, next) => {
  const origin = c.req.header('origin');

  if (origin) {
    // El host se toma de la URL de la petición, no de la cabecera Host: en el
    // runtime de Workers la URL siempre trae el host real de la petición.
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
