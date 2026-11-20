export type Currency = 'COP' | 'USD';

export interface Program {
  code: string;
  description: string;
}

export interface ProgramPrice {
  currency: Currency;
  amount: number;
}

const PROGRAM_SQL = `
  SELECT code, description
  FROM programs
  WHERE code = ?
`;

export const findProgram = async (db: D1Database, code: string): Promise<Program | null> =>
  db.prepare(PROGRAM_SQL).bind(code).first<Program>();

/**
 * Precio vigente por moneda: el de mayor valid_from que ya llego. `now` es
 * ISO-8601 UTC (Date#toISOString), el mismo formato de valid_from, asi que
 * comparar textos es comparar instantes.
 */
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
