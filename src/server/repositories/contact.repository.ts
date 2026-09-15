export interface ContactRecord {
  ecosystem: 'grow' | 'learn';
  fullName: string;
  email: string;
  organization: string;
  role: string | null;
  countryCode: string;
  phone: string;
  phoneE164: string;
  teamSize: string;
  message: string | null;
  sourcePage: string | null;
  ipCountry: string | null;
  userAgent: string | null;
}

const INSERT_SQL = `
  INSERT INTO contact_requests
    (ecosystem, full_name, email, organization, role, country_code, phone, phone_e164,
      team_size, message, source_page, ip_country, user_agent)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING id
`;

export const insertContactRequest = async (db: D1Database, record: ContactRecord): Promise<number> => {
  const row = await db
    .prepare(INSERT_SQL)
    .bind(
      record.ecosystem,
      record.fullName,
      record.email,
      record.organization,
      record.role,
      record.countryCode,
      record.phone,
      record.phoneE164,
      record.teamSize,
      record.message,
      record.sourcePage,
      record.ipCountry,
      record.userAgent
    )
    .first<{ id: number }>();

  if (!row) throw new Error('contact insert did not return a row');

  return row.id;
};
