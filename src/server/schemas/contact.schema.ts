import { z } from 'zod';
import {
  countryCodeField,
  emailField,
  nameField,
  optionalText,
  phoneField,
  turnstileTokenField,
} from './common';

export const TEAM_SIZES = ['menos-10', '10-30', '30-100', 'mas-100'] as const;
export const ECOSYSTEMS = ['grow', 'learn'] as const;

export const contactSchema = z.object({
  full_name: nameField,
  email: emailField,
  organization: z
    .string('La organización es obligatoria.')
    .transform((value) => value.trim())
    .pipe(z.string().min(2, 'La organización es demasiado corta.').max(160)),
  role: optionalText(120),
  country_code: countryCodeField,
  phone: phoneField,
  team_size: z.enum(TEAM_SIZES, 'Selecciona cuántas personas se formarían.'),
  message: optionalText(2000),
  ecosystem: z.enum(ECOSYSTEMS).default('grow'),
  'cf-turnstile-response': turnstileTokenField,
});

export type ContactInput = z.infer<typeof contactSchema>;
