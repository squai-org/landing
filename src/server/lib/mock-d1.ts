interface ProgramRow {
  code: string;
  description: string;
  starts_on: string | null;
  ends_on: string | null;
  schedule: string | null;
  closed_manually: number;
}

interface ProgramPriceRow {
  program_code: string;
  currency: 'COP' | 'USD';
  amount: number;
  valid_from: string;
}

interface ProgramLimitRow {
  program_code: string;
  opens_at: string;
  closes_at: string;
  capacity: number;
}

interface ContactRow {
  id: number;
  ecosystem: string;
  full_name: string;
  email: string;
  organization: string;
  role: string | null;
  country_code: string;
  phone: string;
  phone_e164: string;
  team_size: string;
  referral_source: string;
  message: string | null;
  source_page: string | null;
  ip_country: string | null;
  user_agent: string | null;
}

interface CustomerRow {
  id: number;
  email: string;
  full_name: string;
  country_code: string;
  phone: string;
  phone_e164: string;
  updated_at: string;
}

interface OrderRow {
  id: number;
  order_id: string;
  customer_id: number;
  program_code: string;
  referral_source: string | null;
  status: string;
  amount: number;
  currency: string;
  tax: string | null;
  bold_transaction_id: string | null;
  payment_method: string | null;
  source_page: string | null;
  ip_country: string | null;
  user_agent: string | null;
  created_at: string;
  confirmed_at: string | null;
}

interface BoldTransactionRow {
  payment_id: string;
  type: string;
  event_id: string | null;
  order_id: string | null;
  amount: number | null;
  currency: string | null;
  payment_method: string | null;
  payer_email: string | null;
  card_brand: string | null;
  card_masked_pan: string | null;
  occurred_at: string | null;
  payload: string;
  received_at: string;
}

interface EmailMessageRow {
  id: number;
  order_id: string;
  customer_id: number;
  program_code: string;
  kind: string;
  template_id: number;
  status: string;
  attempts: number;
  provider_message_id: string | null;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

const makeMeta = (changes = 0, lastRowId = 0) => ({
  duration: 0,
  size_after: 0,
  rows_read: 0,
  rows_written: changes,
  last_row_id: lastRowId,
  changed_db: changes > 0,
  changes,
});

export function createMockD1(): D1Database {
  const programs = new Map<string, ProgramRow>([
    [
      'squai-one',
      {
        code: 'squai-one',
        description: 'Fundamentos de Inteligencia Artificial Generativa',
        starts_on: '2027-01-26',
        ends_on: '2027-02-18',
        schedule: 'Martes y jueves de 6:30 a 9:00 p. m. (hora de Colombia)',
        closed_manually: 0,
      },
    ],
  ]);

  const programPrices: ProgramPriceRow[] = [
    { program_code: 'squai-one', currency: 'COP', amount: 440000, valid_from: '2026-01-01T00:00:00.000Z' },
    { program_code: 'squai-one', currency: 'USD', amount: 147, valid_from: '2026-01-01T00:00:00.000Z' },
    { program_code: 'squai-one', currency: 'COP', amount: 550000, valid_from: '2027-01-01T05:00:00.000Z' },
    { program_code: 'squai-one', currency: 'USD', amount: 185, valid_from: '2027-01-01T05:00:00.000Z' },
  ];

  const programLimits = new Map<string, ProgramLimitRow>([
    [
      'squai-one',
      {
        program_code: 'squai-one',
        opens_at: '2026-12-01T05:00:00.000Z',
        closes_at: '2027-01-23T05:00:00.000Z',
        capacity: 30,
      },
    ],
  ]);

  let contactSeq = 0;
  let customerSeq = 0;
  let orderSeq = 0;
  let emailSeq = 0;

  const contacts: ContactRow[] = [];
  const customersByEmail = new Map<string, CustomerRow>();
  const customersById = new Map<number, CustomerRow>();
  const ordersById = new Map<string, OrderRow>();
  const boldTransactions = new Map<string, BoldTransactionRow>();
  const emailMessages = new Map<string, EmailMessageRow>();

  const execute = (sql: string, params: unknown[]) => {
    const q = sql.replace(/\s+/g, ' ').trim();

    if (q.includes('FROM programs WHERE code = ?')) {
      const code = String(params[0] ?? '');
      const p = programs.get(code);
      const rows = p
        ? [
            {
              code: p.code,
              description: p.description,
              closedManually: p.closed_manually,
              startsOn: p.starts_on,
              endsOn: p.ends_on,
              schedule: p.schedule,
            },
          ]
        : [];
      return { rows, changes: 0, lastRowId: 0 };
    }

    if (q.includes('FROM program_prices p')) {
      const code = String(params[0] ?? '');
      const nowIso = String(params[1] ?? '');
      const best = new Map<'COP' | 'USD', ProgramPriceRow>();
      for (const row of programPrices) {
        if (row.program_code === code && row.valid_from <= nowIso) {
          const prev = best.get(row.currency);
          if (!prev || row.valid_from > prev.valid_from) {
            best.set(row.currency, row);
          }
        }
      }
      const rows = [...best.values()]
        .sort((a, b) => a.currency.localeCompare(b.currency))
        .map(({ currency, amount }) => ({ currency, amount }));
      return { rows, changes: 0, lastRowId: 0 };
    }

    if (q.includes('FROM program_limits WHERE program_code = ?')) {
      const code = String(params[0] ?? '');
      const limit = programLimits.get(code);
      const rows = limit ? [{ opensAt: limit.opens_at, closesAt: limit.closes_at, capacity: limit.capacity }] : [];
      return { rows, changes: 0, lastRowId: 0 };
    }

    if (q.includes("SELECT COUNT(*) AS approved FROM orders WHERE program_code = ? AND status = 'approved'")) {
      const code = String(params[0] ?? '');
      let approved = 0;
      for (const order of ordersById.values()) {
        if (order.program_code === code && order.status === 'approved') approved += 1;
      }
      return { rows: [{ approved }], changes: 0, lastRowId: 0 };
    }

    if (q.startsWith('INSERT INTO contact_requests')) {
      const id = ++contactSeq;
      contacts.push({
        id,
        ecosystem: String(params[0] ?? ''),
        full_name: String(params[1] ?? ''),
        email: String(params[2] ?? ''),
        organization: String(params[3] ?? ''),
        role: (params[4] as string | null) ?? null,
        country_code: String(params[5] ?? ''),
        phone: String(params[6] ?? ''),
        phone_e164: String(params[7] ?? ''),
        team_size: String(params[8] ?? ''),
        referral_source: String(params[9] ?? ''),
        message: (params[10] as string | null) ?? null,
        source_page: (params[11] as string | null) ?? null,
        ip_country: (params[12] as string | null) ?? null,
        user_agent: (params[13] as string | null) ?? null,
      });
      return { rows: [{ id }], changes: 1, lastRowId: id };
    }

    if (q.startsWith('INSERT INTO customers')) {
      const email = String(params[0] ?? '');
      const now = new Date().toISOString();
      const existing = customersByEmail.get(email);
      if (existing) {
        existing.full_name = String(params[1] ?? '');
        existing.country_code = String(params[2] ?? '');
        existing.phone = String(params[3] ?? '');
        existing.phone_e164 = String(params[4] ?? '');
        existing.updated_at = now;
        return { rows: [{ id: existing.id }], changes: 1, lastRowId: existing.id };
      }
      const id = ++customerSeq;
      const row: CustomerRow = {
        id,
        email,
        full_name: String(params[1] ?? ''),
        country_code: String(params[2] ?? ''),
        phone: String(params[3] ?? ''),
        phone_e164: String(params[4] ?? ''),
        updated_at: now,
      };
      customersByEmail.set(email, row);
      customersById.set(id, row);
      return { rows: [{ id }], changes: 1, lastRowId: id };
    }

    if (q.startsWith('INSERT INTO orders')) {
      const id = ++orderSeq;
      const orderId = String(params[0] ?? '');
      const row: OrderRow = {
        id,
        order_id: orderId,
        customer_id: Number(params[1] ?? 0),
        program_code: String(params[2] ?? ''),
        referral_source: (params[3] as string | null) ?? null,
        status: 'pending',
        amount: Number(params[4] ?? 0),
        currency: String(params[5] ?? 'COP'),
        tax: (params[6] as string | null) ?? null,
        bold_transaction_id: null,
        payment_method: null,
        source_page: (params[7] as string | null) ?? null,
        ip_country: (params[8] as string | null) ?? null,
        user_agent: (params[9] as string | null) ?? null,
        created_at: new Date().toISOString(),
        confirmed_at: null,
      };
      ordersById.set(orderId, row);
      return { rows: [], changes: 1, lastRowId: id };
    }

    if (q.includes('FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.order_id = ?')) {
      const orderId = String(params[0] ?? '');
      const o = ordersById.get(orderId);
      const c = o ? customersById.get(o.customer_id) : undefined;
      if (!o || !c) return { rows: [], changes: 0, lastRowId: 0 };
      return {
        rows: [
          {
            id: o.id,
            orderId: o.order_id,
            customerId: o.customer_id,
            programCode: o.program_code,
            status: o.status,
            amount: o.amount,
            currency: o.currency,
            boldTransactionId: o.bold_transaction_id,
            paymentMethod: o.payment_method,
            createdAt: o.created_at,
            confirmedAt: o.confirmed_at,
            referralSource: o.referral_source,
            fullName: c.full_name,
            email: c.email,
          },
        ],
        changes: 0,
        lastRowId: 0,
      };
    }

    if (q.startsWith('UPDATE orders SET status = ?2')) {
      const orderId = String(params[0] ?? '');
      const status = String(params[1] ?? '');
      const txId = (params[2] as string | null) ?? null;
      const paymentMethod = (params[3] as string | null) ?? null;
      const o = ordersById.get(orderId);
      if (!o || (o.status === 'approved' && status !== 'voided')) {
        return { rows: [], changes: 0, lastRowId: 0 };
      }
      o.status = status;
      if (txId !== null) o.bold_transaction_id = txId;
      if (paymentMethod !== null) o.payment_method = paymentMethod;
      if (['approved', 'rejected', 'failed', 'voided'].includes(status)) {
        o.confirmed_at = new Date().toISOString();
      }
      return { rows: [], changes: 1, lastRowId: 0 };
    }

    if (q.includes('SELECT 1 AS enrolled FROM orders o JOIN customers c')) {
      const email = String(params[0] ?? '');
      const code = String(params[1] ?? '');
      const customer = customersByEmail.get(email);
      if (!customer) return { rows: [], changes: 0, lastRowId: 0 };
      for (const o of ordersById.values()) {
        if (o.customer_id === customer.id && o.program_code === code && o.status === 'approved') {
          return { rows: [{ enrolled: 1 }], changes: 0, lastRowId: 0 };
        }
      }
      return { rows: [], changes: 0, lastRowId: 0 };
    }

    if (q.startsWith('INSERT INTO bold_transactions')) {
      const paymentId = String(params[0] ?? '');
      const type = String(params[1] ?? '');
      const key = `${paymentId}:${type}`;
      boldTransactions.set(key, {
        payment_id: paymentId,
        type,
        event_id: (params[2] as string | null) ?? null,
        order_id: (params[3] as string | null) ?? null,
        amount: (params[4] as number | null) ?? null,
        currency: (params[5] as string | null) ?? null,
        payment_method: (params[6] as string | null) ?? null,
        payer_email: (params[7] as string | null) ?? null,
        card_brand: (params[8] as string | null) ?? null,
        card_masked_pan: (params[9] as string | null) ?? null,
        occurred_at: (params[10] as string | null) ?? null,
        payload: String(params[11] ?? ''),
        received_at: new Date().toISOString(),
      });
      return { rows: [], changes: 1, lastRowId: 0 };
    }

    if (q.includes('FROM orders o JOIN customers c ON c.id = o.customer_id JOIN programs p ON p.code = o.program_code WHERE o.order_id = ?')) {
      const orderId = String(params[0] ?? '');
      const o = ordersById.get(orderId);
      const c = o ? customersById.get(o.customer_id) : undefined;
      const p = o ? programs.get(o.program_code) : undefined;
      if (!o || !c || !p) return { rows: [], changes: 0, lastRowId: 0 };
      return {
        rows: [
          {
            orderId: o.order_id,
            customerId: o.customer_id,
            programCode: o.program_code,
            status: o.status,
            amount: o.amount,
            currency: o.currency,
            tax: o.tax,
            paymentMethod: o.payment_method,
            email: c.email,
            fullName: c.full_name,
            programName: p.description,
            startsOn: p.starts_on,
            endsOn: p.ends_on,
            schedule: p.schedule,
          },
        ],
        changes: 0,
        lastRowId: 0,
      };
    }

    if (q.startsWith('INSERT INTO email_messages')) {
      const orderId = String(params[0] ?? '');
      const kind = String(params[3] ?? '');
      const key = `${orderId}:${kind}`;
      if (emailMessages.has(key)) {
        return { rows: [], changes: 0, lastRowId: 0 };
      }
      const id = ++emailSeq;
      const nowIso = String(params[5] ?? new Date().toISOString());
      emailMessages.set(key, {
        id,
        order_id: orderId,
        customer_id: Number(params[1] ?? 0),
        program_code: String(params[2] ?? ''),
        kind,
        template_id: Number(params[4] ?? 0),
        status: 'pending',
        attempts: 0,
        provider_message_id: null,
        last_error: null,
        sent_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      });
      return { rows: [], changes: 1, lastRowId: id };
    }

    if (q.startsWith('UPDATE email_messages SET status = ?3')) {
      const orderId = String(params[0] ?? '');
      const kind = String(params[1] ?? '');
      const status = String(params[2] ?? '');
      const providerId = (params[3] as string | null) ?? null;
      const lastError = (params[4] as string | null) ?? null;
      const nowIso = String(params[5] ?? new Date().toISOString());
      const msg = emailMessages.get(`${orderId}:${kind}`);
      if (!msg) return { rows: [], changes: 0, lastRowId: 0 };
      msg.status = status;
      msg.attempts += 1;
      if (providerId !== null) msg.provider_message_id = providerId;
      msg.last_error = lastError;
      if (status === 'sent') msg.sent_at = nowIso;
      msg.updated_at = nowIso;
      return { rows: [], changes: 1, lastRowId: 0 };
    }

    return { rows: [], changes: 0, lastRowId: 0 };
  };

  const makeStatement = (sql: string, boundParams: unknown[] = []): D1PreparedStatement => ({
    bind(...values: unknown[]) {
      return makeStatement(sql, values);
    },
    async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
      const { rows } = execute(sql, boundParams);
      const row = rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;
      if (colName !== undefined) return (row[colName] ?? null) as T | null;
      return row as T;
    },
    async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
      const { rows, changes, lastRowId } = execute(sql, boundParams);
      return {
        results: rows as T[],
        success: true,
        meta: makeMeta(changes, lastRowId),
      };
    },
    async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
      const { rows } = execute(sql, boundParams);
      return {
        results: rows as T[],
        success: true,
        meta: makeMeta(),
      };
    },
    raw: (async <T = unknown[]>(): Promise<T[]> => {
      const { rows } = execute(sql, boundParams);
      return rows.map((r) => Object.values(r as Record<string, unknown>)) as T[];
    }) as D1PreparedStatement['raw'],
  });

  return {
    prepare(query: string) {
      return makeStatement(query);
    },
    async dump() {
      return new ArrayBuffer(0);
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const out: D1Result<T>[] = [];
      for (const stmt of statements) {
        out.push(await stmt.run<T>());
      }
      return out;
    },
    async exec() {
      return { count: 0, duration: 0 };
    },
    withSession() {
      return this;
    },
  } as unknown as D1Database;
}
