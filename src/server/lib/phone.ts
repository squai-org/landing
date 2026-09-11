/**
 * Normalización a E.164: "+" seguido de máximo 15 dígitos, sin separadores.
 * https://www.itu.int/rec/T-REC-E.164
 *
 * Los formularios envían el indicativo y el número en campos separados
 * (`country_code` y `phone`), así que aquí se limpian y se concatenan.
 */
const DIGITS_ONLY = /\D+/g;

export interface NormalizedPhone {
  countryCode: string;
  nationalNumber: string;
  e164: string;
}

export const normalizePhone = (rawCountryCode: string, rawPhone: string): NormalizedPhone | null => {
  const countryDigits = rawCountryCode.replace(DIGITS_ONLY, '');
  const nationalDigits = rawPhone.replace(DIGITS_ONLY, '');

  if (countryDigits.length < 1 || countryDigits.length > 3) return null;
  if (nationalDigits.length < 6) return null;

  const e164 = `+${countryDigits}${nationalDigits}`;
  // 15 dígitos + el "+" inicial.
  if (e164.length > 16) return null;

  return { countryCode: `+${countryDigits}`, nationalNumber: nationalDigits, e164 };
};
