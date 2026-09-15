import { z } from 'zod';
import { normalizeEmail } from '../lib/email';

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

export const countryCodeField = z
  .string('El indicativo es obligatorio.')
  .transform((value) => value.trim())
  .pipe(z.string().regex(/^\+?\d{1,3}$/, 'El indicativo no es válido.'));

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
    .transform((value) => (value || null));

export const turnstileTokenField = z.string().max(2048).optional();
