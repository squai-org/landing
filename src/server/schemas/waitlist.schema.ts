import { z } from 'zod';
import { countryCodeField, emailField, nameField, phoneField, turnstileTokenField } from './common';

/** Campos del formulario de `src/components/Waitlist.astro`. */
export const waitlistSchema = z.object({
  full_name: nameField,
  email: emailField,
  country_code: countryCodeField,
  phone: phoneField,
  'cf-turnstile-response': turnstileTokenField,
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
