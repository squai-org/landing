/**
 * Dominios de correo personal. El formulario de contacto pide explícitamente
 * "Correo corporativo", así que se rechazan salvo que ALLOW_PERSONAL_EMAIL
 * esté en "true".
 */
const PERSONAL_EMAIL_DOMAINS = new Set([
  'aol.com',
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.es',
  'hotmail.co.uk',
  'icloud.com',
  'live.com',
  'live.com.mx',
  'mail.com',
  'me.com',
  'msn.com',
  'outlook.com',
  'outlook.es',
  'proton.me',
  'protonmail.com',
  'yahoo.com',
  'yahoo.es',
  'yahoo.com.mx',
  'ymail.com',
  'zoho.com',
]);

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const emailDomain = (email: string) => email.slice(email.lastIndexOf('@') + 1);

export const isPersonalEmail = (email: string) => PERSONAL_EMAIL_DOMAINS.has(emailDomain(email));
