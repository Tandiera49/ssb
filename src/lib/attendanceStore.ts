import type { App } from 'astro';
import { getDB } from './db';

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

function rowToAttendance(row: any): AttendanceRecord {
  return {
    id: String(row.id),
    playerId: String(row.player_id),
    playerName: String(row.player_name),
    date: String(row.date),
    status: row.status,
    note: String(row.note || ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listAttendance(locals: App.Locals): Promise<AttendanceRecord[]> {
  const db = getDB(locals);
  const result = await db
    .prepare(`
      SELECT id, player_id, player_name, date, status, note, created_at, updated_at
      FROM attendance
      ORDER BY date DESC, created_at DESC
    `)
    .all();

  return result.results.map(rowToAttendance);
}

export async function saveAttendance(
  locals: App.Locals,
  playerId: string,
  playerName: string,
  date: string,
  status: AttendanceRecord['status'],
  note = '',
): Promise<AttendanceRecord> {
  const db = getDB(locals);
  const now = new Date().toISOString();

  const existing = await db
    .prepare(`
      SELECT id, created_at
      FROM attendance
      WHERE player_id = ? AND date = ?
    `)
    .bind(playerId, date)
    .first<{ id: string; created_at: string }>();

  const id = existing?.id || crypto.randomUUID();
  const createdAt = existing?.created_at || now;

  await db
    .prepare(`
      INSERT INTO attendance (
        id, player_id, player_name, date, status, note, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(player_id, date) DO UPDATE SET
        player_name = excluded.player_name,
        status = excluded.status,
        note = excluded.note,
        updated_at = excluded.updated_at
    `)
    .bind(id, playerId, playerName, date, status, note, createdAt, now)
    .run();

  const saved = await db
    .prepare(`
      SELECT id, player_id, player_name, date, status, note, created_at, updated_at
      FROM attendance
      WHERE player_id = ? AND date = ?
    `)
    .bind(playerId, date)
    .first();

  if (!saved) throw new Error('Gagal menyimpan absensi.');

  return rowToAttendance(saved);
}

export async function deleteAttendance(
  locals: App.Locals,
  id: string,
): Promise<void> {
  const db = getDB(locals);

  await db
    .prepare(`DELETE FROM attendance WHERE id = ?`)
    .bind(id)
    .run();
}
