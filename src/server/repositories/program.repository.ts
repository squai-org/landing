import type { Currency } from '../../config/checkout';

export interface Program {
  code: string;
  description: string;
  closedManually: boolean;
  startsOn: string | null;
  endsOn: string | null;
  schedule: string | null;
}

export interface ProgramPrice {
  currency: Currency;
  amount: number;
}

const PROGRAM_SQL = `
  SELECT code, description, closed_manually AS closedManually,
    starts_on AS startsOn, ends_on AS endsOn, schedule
  FROM programs
  WHERE code = ?
`;

export const findProgram = async (db: D1Database, code: string): Promise<Program | null> => {
  const row = await db
    .prepare(PROGRAM_SQL)
    .bind(code)
    .first<Omit<Program, 'closedManually'> & { closedManually: number }>();

  return row && { ...row, closedManually: row.closedManually === 1 };
};

const CURRENT_PRICES_SQL = `
  SELECT p.currency, p.amount
  FROM program_prices p
  WHERE p.program_code = ?1
    AND p.valid_from = (
      SELECT max(q.valid_from)
      FROM program_prices q
      WHERE q.program_code = p.program_code
        AND q.currency = p.currency
        AND q.valid_from <= ?2
    )
  ORDER BY p.currency
`;

export const findCurrentPrices = async (db: D1Database, code: string, now: Date): Promise<ProgramPrice[]> => {
  const { results } = await db.prepare(CURRENT_PRICES_SQL).bind(code, now.toISOString()).all<ProgramPrice>();
  return results;
};

export interface ProgramLimits {
  opensAt: string;
  closesAt: string;
  capacity: number;
}

const LIMITS_SQL = `
  SELECT opens_at AS opensAt, closes_at AS closesAt, capacity
  FROM program_limits
  WHERE program_code = ?
`;

export const findProgramLimits = async (db: D1Database, code: string): Promise<ProgramLimits | null> =>
  db.prepare(LIMITS_SQL).bind(code).first<ProgramLimits>();

const APPROVED_COUNT_SQL = `
  SELECT COUNT(*) AS approved
  FROM orders
  WHERE program_code = ? AND status = 'approved'
`;

export const countApprovedOrders = async (db: D1Database, code: string): Promise<number> =>
  (await db.prepare(APPROVED_COUNT_SQL).bind(code).first<{ approved: number }>())?.approved ?? 0;
