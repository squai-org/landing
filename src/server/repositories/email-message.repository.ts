import type { OrderStatus } from './order.repository';

export type EmailKind = 'confirmation' | 'recovery';

/** Lo que necesita el correo de confirmacion: orden, cliente y programa. */
export interface ConfirmationData {
  orderId: string;
  customerId: number;
  programCode: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  tax: string | null;
  paymentMethod: string | null;
  email: string;
  fullName: string;
  programName: string;
  startsOn: string | null;
  endsOn: string | null;
  schedule: string | null;
}

const CONFIRMATION_DATA_SQL = `
  SELECT o.order_id AS orderId, o.customer_id AS customerId, o.program_code AS programCode,
         o.status, o.amount, o.currency, o.tax, o.payment_method AS paymentMethod,
         c.email, c.full_name AS fullName,
         p.description AS programName, p.starts_on AS startsOn, p.ends_on AS endsOn, p.schedule
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN programs p ON p.code = o.program_code
  WHERE o.order_id = ?
`;

export const findConfirmationData = async (db: D1Database, orderId: string) =>
  db.prepare(CONFIRMATION_DATA_SQL).bind(orderId).first<ConfirmationData>();

/**
 * Reclama el envio: crea la fila pendiente si no existe. Devuelve true solo a
 * quien la creo; ese es el unico que envia. La unicidad (order_id, kind) y la
 * de recuperacion por cliente y programa hacen que un segundo intento, aunque
 * sea concurrente, no cambie nada.
 */
const CLAIM_SQL = `
  INSERT INTO email_messages (order_id, customer_id, program_code, kind, template_id, created_at, updated_at)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
  ON CONFLICT DO NOTHING
`;

export const claimEmailMessage = async (
  db: D1Database,
  message: { orderId: string; customerId: number; programCode: string; kind: EmailKind; templateId: number },
  now: Date
): Promise<boolean> => {
  const { meta } = await db
    .prepare(CLAIM_SQL)
    .bind(message.orderId, message.customerId, message.programCode, message.kind, message.templateId, now.toISOString())
    .run();

  return meta.changes > 0;
};

/** Anota el resultado de un intento de envio. */
const RESULT_SQL = `
  UPDATE email_messages
  SET status = ?3,
      attempts = attempts + 1,
      provider_message_id = COALESCE(?4, provider_message_id),
      last_error = ?5,
      sent_at = CASE WHEN ?3 = 'sent' THEN ?6 ELSE sent_at END,
      updated_at = ?6
  WHERE order_id = ?1 AND kind = ?2
`;

export const recordEmailResult = async (
  db: D1Database,
  key: { orderId: string; kind: EmailKind },
  result: { status: 'sent'; providerMessageId: string | null } | { status: 'failed'; error: string },
  now: Date
): Promise<void> => {
  await db
    .prepare(RESULT_SQL)
    .bind(
      key.orderId,
      key.kind,
      result.status,
      result.status === 'sent' ? result.providerMessageId : null,
      result.status === 'failed' ? result.error : null,
      now.toISOString()
    )
    .run();
};
