import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** Error de negocio que el manejador de errores traduce a una respuesta JSON. */
export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const badRequest = (code: string, message: string, fields?: Record<string, string>) =>
  new ApiError(400, code, message, fields);

export const forbidden = (code: string, message: string) => new ApiError(403, code, message);

/** Respuesta de éxito uniforme para todos los endpoints. */
export const ok = <T extends Record<string, unknown>>(c: Context, data: T, status: 200 | 201 = 200) =>
  c.json({ ok: true, ...data }, status);
