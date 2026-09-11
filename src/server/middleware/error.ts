import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ApiError } from '../lib/http';
import type { AppBindings } from '../types';

const jsonError = (code: string, message: string, fields?: Record<string, string>) => ({
  ok: false as const,
  error: { code, message, ...(fields ? { fields } : {}) },
});

/**
 * Traduce cualquier fallo a una respuesta JSON estable. Los detalles internos
 * se quedan en los logs del Worker, no en la respuesta.
 * https://hono.dev/docs/api/hono#error-handling
 */
export const onError: ErrorHandler<AppBindings> = (err, c) => {
  if (err instanceof ApiError) {
    return c.json(jsonError(err.code, err.message, err.fields), err.status);
  }

  if (err instanceof HTTPException) {
    return c.json(jsonError('http_error', err.message), err.status);
  }

  console.error('Error no controlado en la API', err);

  return c.json(jsonError('internal_error', 'No pudimos procesar tu solicitud. Inténtalo de nuevo.'), 500);
};

export const onNotFound: NotFoundHandler<AppBindings> = (c) =>
  c.json(jsonError('not_found', 'Recurso no encontrado.'), 404);
