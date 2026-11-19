export type EnrollmentStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'failed' | 'voided';

export interface NewEnrollment {
  orderId: string;
  planCode: string;
  fullName: string;
  email: string;
  countryCode: string;
  phone: string;
  phoneE164: string;
  referralSource: string;
  amount: number;
  currency: string;
  sourcePage: string | null;
  ipCountry: string | null;
  userAgent: string | null;
}

export interface Enrollment extends NewEnrollment {
  id: number;
  status: EnrollmentStatus;
  boldTransactionId: string | null;
  paymentMethod: string | null;
  confirmedAt: string | null;
}

const INSERT_SQL = `
  INSERT INTO enrollments
    (order_id, plan_code, full_name, email, country_code, phone, phone_e164,
      referral_source, amount, currency, source_page, ip_country, user_agent)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export const insertEnrollment = async (db: D1Database, record: NewEnrollment): Promise<void> => {
  await db
    .prepare(INSERT_SQL)
    .bind(
      record.orderId,
      record.planCode,
      record.fullName,
      record.email,
      record.countryCode,
      record.phone,
      record.phoneE164,
      record.referralSource,
      record.amount,
      record.currency,
      record.sourcePage,
      record.ipCountry,
      record.userAgent
    )
    .run();
};

const SELECT_SQL = `
  SELECT id, order_id AS orderId, plan_code AS planCode, status, full_name AS fullName,
         email, amount, currency, bold_transaction_id AS boldTransactionId,
         payment_method AS paymentMethod, confirmed_at AS confirmedAt
  FROM enrollments
  WHERE order_id = ?
`;

export const findEnrollmentByOrderId = async (db: D1Database, orderId: string) =>
  db.prepare(SELECT_SQL).bind(orderId).first<Pick<Enrollment,
    'id' | 'orderId' | 'planCode' | 'status' | 'fullName' | 'email' | 'amount' | 'currency' |
    'boldTransactionId' | 'paymentMethod' | 'confirmedAt'
  >>();

/**
 * Aplica el veredicto de Bold sobre una inscripcion.
 *
 * Es idempotente y no degrada: una inscripcion ya aprobada solo cambia si
 * llega una anulacion. Asi la consulta sincrona y el webhook pueden llegar en
 * cualquier orden sin pisarse.
 */
const APPLY_SQL = `
  UPDATE enrollments
  SET status = ?2,
      bold_transaction_id = COALESCE(?3, bold_transaction_id),
      payment_method = COALESCE(?4, payment_method),
      confirmed_at = CASE
        WHEN ?2 IN ('approved', 'rejected', 'failed', 'voided')
          THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        ELSE confirmed_at
      END
  WHERE order_id = ?1
    AND (status <> 'approved' OR ?2 = 'voided')
`;

export const applyEnrollmentPayment = async (
  db: D1Database,
  orderId: string,
  payment: { status: EnrollmentStatus; transactionId?: string | null; paymentMethod?: string | null }
): Promise<void> => {
  await db
    .prepare(APPLY_SQL)
    .bind(orderId, payment.status, payment.transactionId ?? null, payment.paymentMethod ?? null)
    .run();
};
