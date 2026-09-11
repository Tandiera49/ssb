
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.join(process.cwd(), 'storage', 'attendance');
const FILE = path.join(ROOT, 'attendance.json');

export interface AttendanceRecord {
  id: string;
  playerId: string;
  playerName: string;
  date: string;
  status: 'hadir' | 'izin' | 'sakit' | 'alpa';
  note: string;
  createdAt: string;
  updatedAt: string;
}

async function ensureFile() {
  await fs.mkdir(ROOT, { recursive: true });

  try {
    await fs.access(FILE);
  } catch {
    await fs.writeFile(FILE, '[]', 'utf8');
  }
}

async function readRecords(): Promise<AttendanceRecord[]> {
  await ensureFile();

  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeRecords(records: AttendanceRecord[]) {
  await ensureFile();

  await fs.writeFile(
    FILE,
    JSON.stringify(records, null, 2),
    'utf8'
  );
}

export async function listAttendance() {
  return readRecords();
}

export async function saveAttendance(
  playerId: string,
  playerName: string,
  date: string,
  status: AttendanceRecord['status'],
  note = ''
) {
  const records = await readRecords();

  const existing = records.find(
    item =>
      item.playerId === playerId &&
      item.date === date
  );

  const now = new Date().toISOString();

  if (existing) {
    existing.playerName = playerName;
    existing.status = status;
    existing.note = note.trim();
    existing.updatedAt = now;

    await writeRecords(records);
    return existing;
  }

  const record: AttendanceRecord = {
    id: crypto.randomUUID(),
    playerId,
    playerName,
    date,
    status,
    note: note.trim(),
    createdAt: now,
    updatedAt: now,
  };

  records.push(record);
  await writeRecords(records);

  return record;
}

export async function deleteAttendance(id: string) {
  const records = await readRecords();

  const filtered = records.filter(
    item => item.id !== id
  );

  await writeRecords(filtered);

  return filtered.length !== records.length;
}
