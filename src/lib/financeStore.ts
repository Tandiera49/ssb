import type { App } from 'astro';
import { getDB } from './db';

export interface FinanceConfig {
  administration: number;
  jersey: number;
  initialTuition: number;
  monthlyTuition: number;
  dueDay: number;
}

export interface PaymentRecord {
  id: string;
  playerId: string;
  month: string;
  amount: number;
  status: 'paid';
  paidAt: string;
  note: string;
}

const DEFAULT_CONFIG: FinanceConfig = {
  administration: 100000,
  jersey: 250000,
  initialTuition: 150000,
  monthlyTuition: 150000,
  dueDay: 10,
};

function rowToConfig(row: any): FinanceConfig {
  return {
    administration: Number(row.administration),
    jersey: Number(row.jersey),
    initialTuition: Number(row.initial_tuition),
    monthlyTuition: Number(row.monthly_tuition),
    dueDay: Number(row.due_day),
  };
}

function rowToPayment(row: any): PaymentRecord {
  return {
    id: String(row.id),
    playerId: String(row.player_id),
    month: String(row.month),
    amount: Number(row.amount),
    status: 'paid',
    paidAt: String(row.paid_at),
    note: String(row.note || ''),
  };
}

export async function getFinanceConfig(
  locals: App.Locals,
): Promise<FinanceConfig> {
  const db = getDB(locals);

  const row = await db
    .prepare(`
      SELECT administration, jersey, initial_tuition,
             monthly_tuition, due_day
      FROM finance_config
      WHERE id = 1
    `)
    .first();

  if (!row) {
    await db
      .prepare(`
        INSERT INTO finance_config (
          id, administration, jersey, initial_tuition,
          monthly_tuition, due_day
        )
        VALUES (1, ?, ?, ?, ?, ?)
      `)
      .bind(
        DEFAULT_CONFIG.administration,
        DEFAULT_CONFIG.jersey,
        DEFAULT_CONFIG.initialTuition,
        DEFAULT_CONFIG.monthlyTuition,
        DEFAULT_CONFIG.dueDay,
      )
      .run();

    return DEFAULT_CONFIG;
  }

  return rowToConfig(row);
}

export async function updateFinanceConfig(
  locals: App.Locals,
  input: Partial<FinanceConfig>,
): Promise<FinanceConfig> {
  const current = await getFinanceConfig(locals);

  const next: FinanceConfig = {
    administration:
      input.administration === undefined
        ? current.administration
        : Number(input.administration),
    jersey:
      input.jersey === undefined
        ? current.jersey
        : Number(input.jersey),
    initialTuition:
      input.initialTuition === undefined
        ? current.initialTuition
        : Number(input.initialTuition),
    monthlyTuition:
      input.monthlyTuition === undefined
        ? current.monthlyTuition
        : Number(input.monthlyTuition),
    dueDay:
      input.dueDay === undefined
        ? current.dueDay
        : Number(input.dueDay),
  };

  for (const value of [
    next.administration,
    next.jersey,
    next.initialTuition,
    next.monthlyTuition,
  ]) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Nominal biaya tidak valid.');
    }
  }

  if (!Number.isInteger(next.dueDay) || next.dueDay < 1 || next.dueDay > 28) {
    throw new Error('Tanggal jatuh tempo harus 1 sampai 28.');
  }

  const db = getDB(locals);

  await db
    .prepare(`
      INSERT INTO finance_config (
        id, administration, jersey, initial_tuition,
        monthly_tuition, due_day
      )
      VALUES (1, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        administration = excluded.administration,
        jersey = excluded.jersey,
        initial_tuition = excluded.initial_tuition,
        monthly_tuition = excluded.monthly_tuition,
        due_day = excluded.due_day
    `)
    .bind(
      next.administration,
      next.jersey,
      next.initialTuition,
      next.monthlyTuition,
      next.dueDay,
    )
    .run();

  return next;
}

export async function listPayments(
  locals: App.Locals,
  playerId?: string,
): Promise<PaymentRecord[]> {
  const db = getDB(locals);

  const result = playerId
    ? await db
        .prepare(`
          SELECT id, player_id, month, amount, status, paid_at, note
          FROM payments
          WHERE player_id = ?
          ORDER BY paid_at DESC
        `)
        .bind(playerId)
        .all()
    : await db
        .prepare(`
          SELECT id, player_id, month, amount, status, paid_at, note
          FROM payments
          ORDER BY paid_at DESC
        `)
        .all();

  return result.results.map(rowToPayment);
}

export async function setPayment(
  locals: App.Locals,
  input: {
    playerId: string;
    month: string;
    paid: boolean;
    note?: string;
  },
): Promise<PaymentRecord | null> {
  const db = getDB(locals);
  const playerId = String(input.playerId || '').trim();
  const month = String(input.month || '').trim();

  if (!playerId || !month) {
    throw new Error('Pemain dan periode pembayaran wajib diisi.');
  }

  const config = await getFinanceConfig(locals);

  if (!input.paid) {
    await db
      .prepare(`
        DELETE FROM payments
        WHERE player_id = ? AND month = ?
      `)
      .bind(playerId, month)
      .run();

    return null;
  }

  const amount =
    month === 'initial'
      ? config.administration + config.jersey + config.initialTuition
      : config.monthlyTuition;

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db
    .prepare(`
      INSERT INTO payments (
        id, player_id, month, amount, status, paid_at, note
      )
      VALUES (?, ?, ?, ?, 'paid', ?, ?)
      ON CONFLICT(player_id, month) DO UPDATE SET
        amount = excluded.amount,
        status = 'paid',
        paid_at = excluded.paid_at,
        note = excluded.note
    `)
    .bind(
      id,
      playerId,
      month,
      amount,
      now,
      String(input.note || ''),
    )
    .run();

  const saved = await db
    .prepare(`
      SELECT id, player_id, month, amount, status, paid_at, note
      FROM payments
      WHERE player_id = ? AND month = ?
    `)
    .bind(playerId, month)
    .first();

  return saved ? rowToPayment(saved) : null;
}

export async function getPlayerFinance(
  locals: App.Locals,
  playerId: string,
  registrationDate?: string,
) {
  const config = await getFinanceConfig(locals);
  const payments = await listPayments(locals, playerId);

  const registrationMonth =
    registrationDate && /^\d{4}-\d{2}/.test(registrationDate)
      ? registrationDate.slice(0, 7)
      : new Date().toISOString().slice(0, 7);

  const initialTotal =
    config.administration +
    config.jersey +
    config.initialTuition;

  const paymentMap = new Map(
    payments.map((payment) => [payment.month, payment]),
  );

  const start = new Date(`${registrationMonth}-01T00:00:00Z`);
  const now = new Date();

  const invoices: any[] = [
    {
      month: 'initial',
      label: 'Pembayaran Awal',
      amount: initialTotal,
      status: paymentMap.has('initial') ? 'paid' : 'unpaid',
      paidAt: paymentMap.get('initial')?.paidAt || null,
      note: paymentMap.get('initial')?.note || '',
    },
  ];

  for (let i = 0; i < 12; i++) {
    const date = new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth() + i,
        1,
      ),
    );

    const month = date.toISOString().slice(0, 7);
    const payment = paymentMap.get(month);

    let status: 'paid' | 'upcoming' | 'overdue' = 'upcoming';

    if (payment) {
      status = 'paid';
    } else {
      const due = new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          config.dueDay,
          23,
          59,
          59,
        ),
      );

      status = due.getTime() < now.getTime()
        ? 'overdue'
        : 'upcoming';
    }

    invoices.push({
      month,
      label: `SPP ${month}`,
      amount: config.monthlyTuition,
      status,
      paidAt: payment?.paidAt || null,
      note: payment?.note || '',
    });
  }

  const paidInvoices = invoices.filter(
    (invoice) => invoice.status === 'paid',
  );

  const currentMonthly = invoices.find(
    (invoice) =>
      invoice.month === now.toISOString().slice(0, 7),
  );

  const hasOverdue = invoices.some(
    (invoice) => invoice.status === 'overdue',
  );

  const currentStatus = hasOverdue
    ? 'overdue'
    : currentMonthly?.status === 'paid'
      ? 'paid'
      : 'upcoming';

  return {
    config,
    invoices,
    summary: {
      paidCount: paidInvoices.length,
      totalInvoices: invoices.length,
      outstanding: invoices
        .filter(
          (invoice) =>
            invoice.month === new Date().toISOString().slice(0, 7) &&
            (invoice.status === 'unpaid' || invoice.status === 'overdue'),
        )
        .reduce(
          (sum, invoice) => sum + Number(invoice.amount || 0),
          0,
        ),
      currentStatus,
    },
  };
}

export function financeStatusLabel(
  status: string,
): string {
  switch (status) {
    case 'paid':
      return 'Lunas';
    case 'overdue':
      return 'Tunggakan';
    case 'upcoming':
      return 'Belum Jatuh Tempo';
    default:
      return 'Belum Lunas';
  }
}
