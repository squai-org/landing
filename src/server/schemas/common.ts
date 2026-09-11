import { z } from 'zod';
import { normalizeEmail } from '../lib/email';

/** Colapsa espacios repetidos para que "Juan   Pérez" no entre distinto. */
const collapseSpaces = (value: string) => value.trim().replace(/\s+/g, ' ');

export const nameField = z
  .string('El nombre es obligatorio.')
  .transform(collapseSpaces)
  .pipe(z.string().min(2, 'El nombre es demasiado corto.').max(120, 'El nombre es demasiado largo.'));

export const emailField = z
  .string('El correo es obligatorio.')
  .max(254, 'El correo es demasiado largo.')
  .transform(normalizeEmail)
  .pipe(z.email('El correo no tiene un formato válido.'));

/** Indicativo tal como lo escribe el usuario: "+57", "57". */
export const countryCodeField = z
  .string('El indicativo es obligatorio.')
  .transform((value) => value.trim())
  .pipe(z.string().regex(/^\+?\d{1,3}$/, 'El indicativo no es válido.'));

/** Número nacional; se aceptan espacios y separadores, se normalizan después. */
export const phoneField = z
  .string('El teléfono es obligatorio.')
  .transform((value) => value.trim())
  .pipe(z.string().regex(/^[\d\s().+-]{6,20}$/, 'El teléfono no es válido.'));

export const optionalText = (max: number) =>
  z
    .string()
    .transform(collapseSpaces)
    .pipe(z.string().max(max))
    .optional()
    .transform((value) => (value ? value : null));

/**
 * Nombre del campo que inyecta el widget de Turnstile en el formulario.
 * https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
 */
export const turnstileTokenField = z.string().max(2048).optional();
