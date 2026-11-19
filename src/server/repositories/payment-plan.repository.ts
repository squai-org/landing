export interface PaymentPlan {
  code: string;
  amount: number;
  currency: string;
  description: string;
}

const SELECT_SQL = `
  SELECT code, amount, currency, description
  FROM payment_plans
  WHERE code = ? AND active = 1
`;

export const findActivePaymentPlan = async (db: D1Database, code: string): Promise<PaymentPlan | null> =>
  db.prepare(SELECT_SQL).bind(code).first<PaymentPlan>();
