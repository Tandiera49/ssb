import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.join(process.cwd(), 'storage', 'finance');
const FILE = path.join(ROOT, 'finance.json');

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

interface FinanceData {
  config: FinanceConfig;
  payments: PaymentRecord[];
}

const DEFAULT_CONFIG: FinanceConfig = {
  administration: 100000,
  jersey: 250000,
  initialTuition: 150000,
  monthlyTuition: 150000,
  dueDay: 10,
};

async function ensureFile() {
  await fs.mkdir(ROOT, { recursive: true });
  try { await fs.access(FILE); } catch {
    await fs.writeFile(FILE, JSON.stringify({ config: DEFAULT_CONFIG, payments: [] }, null, 2), 'utf8');
  }
}

async function readData(): Promise<FinanceData> {
  await ensureFile();
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, 'utf8'));
    return {
      config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) },
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    };
  } catch {
    return { config: DEFAULT_CONFIG, payments: [] };
  }
}

async function writeData(data: FinanceData) {
  await ensureFile();
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), 'utf8');
}

function validMonth(month: string) {
  return month === 'initial' || /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

function monthDate(month: string, day: number) {
  const [year, value] = month.split('-').map(Number);
  return new Date(year, value - 1, Math.min(Math.max(day, 1), 28));
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
    .format(monthDate(month, 1));
}

function monthOffset(month: string, offset: number) {
  const date = monthDate(month, 1);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getFinanceConfig() {
  return (await readData()).config;
}

export async function updateFinanceConfig(input: Partial<FinanceConfig>) {
  const data = await readData();
  const next = { ...data.config };
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof FinanceConfig)[]) {
    if (input[key] !== undefined) {
      const value = Number(input[key]);
      if (!Number.isFinite(value) || value < 0 || (key === 'dueDay' && value > 28)) {
        throw new Error('Konfigurasi biaya tidak valid.');
      }
      next[key] = Math.round(value);
    }
  }
  data.config = next;
  await writeData(data);
  return next;
}

export async function listPayments(playerId?: string) {
  const data = await readData();
  return playerId ? data.payments.filter((payment) => payment.playerId === playerId) : data.payments;
}

export async function setPayment(input: { playerId: string; month: string; paid: boolean; note?: string }) {
  if (!input.playerId || !validMonth(input.month)) throw new Error('Pemain dan bulan pembayaran wajib valid.');
  const data = await readData();
  const index = data.payments.findIndex((payment) => payment.playerId === input.playerId && payment.month === input.month);
  if (!input.paid) {
    if (index >= 0) data.payments.splice(index, 1);
    await writeData(data);
    return null;
  }
  const payment: PaymentRecord = {
    id: index >= 0 ? data.payments[index].id : crypto.randomUUID(),
    playerId: input.playerId,
    month: input.month,
    amount: input.month === 'initial'
      ? data.config.administration + data.config.jersey + data.config.initialTuition
      : data.config.monthlyTuition,
    status: 'paid',
    paidAt: new Date().toISOString(),
    note: String(input.note || '').slice(0, 240),
  };
  if (index >= 0) data.payments[index] = payment; else data.payments.push(payment);
  await writeData(data);
  return payment;
}

export async function getPlayerFinance(playerId: string, registrationDate?: string) {
  const data = await readData();
  const now = currentMonth();
  const payments = data.payments.filter((payment) => payment.playerId === playerId);
  const registrationMonth = registrationDate && !Number.isNaN(Date.parse(registrationDate))
    ? (() => {
        const date = new Date(registrationDate);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      })()
    : now;
  // SPP awal Rp150.000 sudah termasuk dalam pembayaran awal Rp500.000.
  // Karena itu invoice SPP bulanan dimulai dari bulan setelah pendaftaran.
  const months = Array.from({ length: 12 }, (_, index) => monthOffset(registrationMonth, index + 1));
  const initialTotal = data.config.administration + data.config.jersey + data.config.initialTuition;
  const initialPaid = payments.find((payment) => payment.month === 'initial');
  const invoices = [{
    month: 'initial',
    label: 'Biaya awal pendaftaran',
    amount: initialTotal,
    dueDate: null,
    status: initialPaid ? 'paid' : 'unpaid',
    paidAt: initialPaid?.paidAt || null,
    note: initialPaid?.note || '',
  }, ...months.map((month) => {
    const paid = payments.find((payment) => payment.month === month);
    const dueDate = monthDate(month, data.config.dueDay);
    const dueDateKey = dueDate.toISOString().slice(0, 10);
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let status: 'paid' | 'unpaid' | 'upcoming' | 'overdue';
    if (paid) {
      status = 'paid';
    } else if (todayKey > dueDateKey) {
      status = 'overdue';
    } else if (todayKey >= month + '-01' && todayKey <= dueDateKey) {
      status = 'unpaid';
    } else {
      status = 'upcoming';
    }
    return {
      month,
      label: monthLabel(month),
      amount: data.config.monthlyTuition,
      dueDate: dueDate.toISOString().slice(0, 10),
      status,
      paidAt: paid?.paidAt || null,
      note: paid?.note || '',
    };
  })];
  const paidCount = invoices.filter((invoice) => invoice.status === 'paid').length;
  const outstanding = invoices.filter((invoice) => invoice.status === 'unpaid' || invoice.status === 'overdue')
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  return {
    config: data.config,
    initialTotal,
    invoices,
    payments,
    summary: {
      paidCount,
      outstanding,
      currentStatus: invoices.find((invoice) => invoice.month === now)?.status || (now < registrationMonth ? 'upcoming' : 'unpaid'),
    },
  };
}

export function financeStatusLabel(status: string) {
  return ({ paid: 'Lunas', unpaid: 'Belum Lunas', upcoming: 'Belum Jatuh Tempo', overdue: 'Tunggakan' } as Record<string, string>)[status] || status;
}
