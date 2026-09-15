export interface WaitlistRecord {
  fullName: string;
  email: string;
  countryCode: string;
  phone: string;
  phoneE164: string;
  sourcePage: string | null;
  ipCountry: string | null;
  userAgent: string | null;
}

export interface WaitlistUpsertResult {
  id: number;
  isNew: boolean;
}

const UPSERT_SQL = `
  INSERT INTO waitlist_signups
    (full_name, email, country_code, phone, phone_e164, source_page, ip_country, user_agent)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (email) DO UPDATE SET
    full_name    = excluded.full_name,
    country_code = excluded.country_code,
    phone        = excluded.phone,
    phone_e164   = excluded.phone_e164,
    source_page  = excluded.source_page,
    ip_country   = excluded.ip_country,
    user_agent   = excluded.user_agent,
    updated_at   = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  RETURNING id, (created_at = updated_at) AS is_new
`;

export const upsertWaitlistSignup = async (
  db: D1Database,
  record: WaitlistRecord
): Promise<WaitlistUpsertResult> => {
  const row = await db
    .prepare(UPSERT_SQL)
    .bind(
      record.fullName,
      record.email,
      record.countryCode,
      record.phone,
      record.phoneE164,
      record.sourcePage,
      record.ipCountry,
      record.userAgent
    )
    .first<{ id: number; is_new: number }>();

  if (!row) throw new Error('waitlist upsert did not return a row');

  return { id: row.id, isNew: row.is_new === 1 };
};
