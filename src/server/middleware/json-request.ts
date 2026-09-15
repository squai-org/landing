import type { MiddlewareHandler } from 'hono';
import { badRequest } from '../lib/http';
import type { AppBindings } from '../types';

const MAX_BODY_BYTES = 16 * 1024;

export const jsonRequest = (): MiddlewareHandler<AppBindings> => async (c, next) => {
  const contentType = c.req.header('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw badRequest('unsupported_content_type', 'El cuerpo debe ser application/json.');
  }

  const declaredLength = Number(c.req.header('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw badRequest('payload_too_large', 'El cuerpo de la petición es demasiado grande.');
  }

  await next();
};
