import { normalizeEmail } from '../lib/email';

export type OrderStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'failed' | 'voided';

export interface NewOrder {
  orderId: string;
  customerId: number;
  programCode: string;
  /** NULL solo en ordenes anteriores al formulario con ese campo. */
  referralSource: string | null;
  amount: number;
  currency: string;
  /** Impuesto declarado a Bold (p. ej. vat-19); se congela con el monto. */
  tax: string;
  sourcePage: string | null;
  ipCountry: string | null;
  userAgent: string | null;
}

export interface Order extends Omit<NewOrder, 'tax'> {
  /** NULL en las ordenes anteriores a 0007. */
  tax: string | null;
  id: number;
  status: OrderStatus;
  boldTransactionId: string | null;
  paymentMethod: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

const INSERT_SQL = `
  INSERT INTO orders
    (order_id, customer_id, program_code, referral_source, amount, currency, tax,
      source_page, ip_country, user_agent)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export const insertOrder = async (db: D1Database, record: NewOrder): Promise<void> => {
  await db
    .prepare(INSERT_SQL)
    .bind(
      record.orderId,
      record.customerId,
      record.programCode,
      record.referralSource,
      record.amount,
      record.currency,
      record.tax,
      record.sourcePage,
      record.ipCountry,
      record.userAgent
    )
    .run();
};

/**
 * La orden con el nombre de su cliente, que es lo que muestra la pagina de
 * gracias. El correo sirve para saber si el cliente ya esta inscrito al
 * retomar; ninguna respuesta de la API lo devuelve.
 */
const SELECT_SQL = `
  SELECT o.id, o.order_id AS orderId, o.customer_id AS customerId, o.program_code AS programCode,
         o.status, o.amount, o.currency, o.bold_transaction_id AS boldTransactionId,
         o.payment_method AS paymentMethod, o.created_at AS createdAt, o.confirmed_at AS confirmedAt,
         o.referral_source AS referralSource,
         c.full_name AS fullName, c.email
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  WHERE o.order_id = ?
`;

export const findOrderByOrderId = async (db: D1Database, orderId: string) =>
  db.prepare(SELECT_SQL).bind(orderId).first<Pick<Order,
    'id' | 'orderId' | 'customerId' | 'programCode' | 'status' | 'amount' | 'currency' |
    'boldTransactionId' | 'paymentMethod' | 'createdAt' | 'confirmedAt' | 'referralSource'
  > & { fullName: string; email: string }>();

/**
 * Aplica el veredicto de Bold sobre una orden.
 *
 * Es idempotente y no degrada: una orden ya aprobada solo cambia si llega una
 * anulacion. Asi la consulta sincrona y el webhook pueden llegar en cualquier
 * orden sin pisarse. Es la unica escritura del estado de pago.
 */
const APPLY_SQL = `
  UPDATE orders
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

/**
 * `becameApproved` dice si esta llamada fue la que aprobo la orden: una orden
 * ya aprobada no vuelve a cumplir el WHERE con 'approved', asi que solo la
 * transicion escribe una fila con ese estado. pending -> pending tambien
 * escribe, por eso se mira el estado y no solo el conteo.
 */
export const applyOrderPayment = async (
  db: D1Database,
  orderId: string,
  payment: { status: OrderStatus; transactionId?: string | null; paymentMethod?: string | null }
): Promise<{ becameApproved: boolean }> => {
  const { meta } = await db
    .prepare(APPLY_SQL)
    .bind(orderId, payment.status, payment.transactionId ?? null, payment.paymentMethod ?? null)
    .run();

  return { becameApproved: payment.status === 'approved' && meta.changes > 0 };
};

/**
 * Inscripcion (ver GLOSSARY.md): el cliente con ese correo tiene una orden
 * aprobada en el programa. No hay tabla propia; una anulada deja de contar.
 */
const ENROLLED_SQL = `
  SELECT 1 AS enrolled
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  WHERE c.email = ? AND o.program_code = ? AND o.status = 'approved'
  LIMIT 1
`;

export const isEnrolled = async (db: D1Database, email: string, programCode: string): Promise<boolean> =>
  (await db.prepare(ENROLLED_SQL).bind(normalizeEmail(email), programCode).first()) !== null;
