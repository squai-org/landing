import type { ZodType } from 'zod';
import { badRequest } from './http';

/**
 * Valida el cuerpo con Zod en el edge y traduce los errores a un mapa
 * campo -> mensaje, para que el front pueda señalar el input exacto.
 */
export const parseBody = <T>(schema: ZodType<T>, raw: unknown): T => {
  const result = schema.safeParse(raw);

  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    if (!fields[key]) fields[key] = issue.message;
  }

  throw badRequest('validation_failed', 'Revisa los campos del formulario.', fields);
};
