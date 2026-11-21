import { normalizeEmail } from '../lib/email';

export interface CustomerContact {
  email: string;
  fullName: string;
  countryCode: string;
  phone: string;
  phoneE164: string;
}

const UPSERT_SQL = `
  INSERT INTO customers (email, full_name, country_code, phone, phone_e164)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT (email) DO UPDATE SET
    full_name = excluded.full_name,
    country_code = excluded.country_code,
    phone = excluded.phone,
    phone_e164 = excluded.phone_e164,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  RETURNING id
`;

export const upsertCustomer = async (db: D1Database, contact: CustomerContact): Promise<number> => {
  const row = await db
    .prepare(UPSERT_SQL)
    .bind(normalizeEmail(contact.email), contact.fullName, contact.countryCode, contact.phone, contact.phoneE164)
    .first<{ id: number }>();

  if (!row) throw new Error('upsertCustomer no devolvio id');

  return row.id;
};
