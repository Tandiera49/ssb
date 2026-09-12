import type { App } from 'astro';
import { getDB } from './db';

export interface PlayerEvaluation {
  id: string;
  playerId: string;
  playerName: string;
  period: string;
  technical: number;
  tactical: number;
  physical: number;
  mental: number;
  teamwork: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

function rowToEvaluation(row: any): PlayerEvaluation {
  return {
    id: String(row.id),
    playerId: String(row.player_id),
    playerName: String(row.player_name),
    period: String(row.period),
    technical: Number(row.technical),
    tactical: Number(row.tactical),
    physical: Number(row.physical),
    mental: Number(row.mental),
    teamwork: Number(row.teamwork),
    notes: String(row.notes || ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listEvaluations(
  locals: App.Locals,
  playerId?: string,
): Promise<PlayerEvaluation[]> {
  const db = getDB(locals);

  const result = playerId
    ? await db.prepare(`
        SELECT id, player_id, player_name, period,
               technical, tactical, physical, mental, teamwork,
               notes, created_at, updated_at
        FROM evaluations
        WHERE player_id = ?
        ORDER BY updated_at DESC, created_at DESC
      `).bind(playerId).all()
    : await db.prepare(`
        SELECT id, player_id, player_name, period,
               technical, tactical, physical, mental, teamwork,
               notes, created_at, updated_at
        FROM evaluations
        ORDER BY updated_at DESC, created_at DESC
      `).all();

  return result.results.map(rowToEvaluation);
}

export async function saveEvaluation(
  locals: App.Locals,
  input: {
    playerId: string;
    playerName: string;
    period: string;
    technical: number;
    tactical: number;
    physical: number;
    mental: number;
    teamwork: number;
    notes: string;
  },
): Promise<PlayerEvaluation> {
  const db = getDB(locals);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO evaluations (
      id, player_id, player_name, period,
      technical, tactical, physical, mental, teamwork,
      notes, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.playerId,
    input.playerName,
    input.period,
    input.technical,
    input.tactical,
    input.physical,
    input.mental,
    input.teamwork,
    input.notes,
    now,
    now,
  ).run();

  const saved = await db.prepare(`
    SELECT id, player_id, player_name, period,
           technical, tactical, physical, mental, teamwork,
           notes, created_at, updated_at
    FROM evaluations
    WHERE id = ?
  `).bind(id).first();

  if (!saved) throw new Error('Gagal menyimpan penilaian.');

  return rowToEvaluation(saved);
}

export async function deleteEvaluation(
  locals: App.Locals,
  id: string,
): Promise<void> {
  const db = getDB(locals);

  const existing = await db.prepare(`
    SELECT id FROM evaluations WHERE id = ?
  `).bind(id).first();

  if (!existing) throw new Error('Data penilaian tidak ditemukan.');

  await db.prepare(`
    DELETE FROM evaluations WHERE id = ?
  `).bind(id).run();
}
