import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.join(process.cwd(), 'storage', 'evaluations');
const FILE = path.join(ROOT, 'evaluations.json');

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

async function ensureFile() {
  await fs.mkdir(ROOT, { recursive: true });

  try {
    await fs.access(FILE);
  } catch {
    await fs.writeFile(FILE, '[]', 'utf8');
  }
}

async function readAll(): Promise<PlayerEvaluation[]> {
  await ensureFile();

  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeAll(data: PlayerEvaluation[]) {
  await ensureFile();
  await fs.writeFile(
    FILE,
    JSON.stringify(data, null, 2),
    'utf8'
  );
}

export async function listEvaluations(playerId?: string) {
  const data = await readAll();

  if (!playerId) return data;

  return data.filter(item => item.playerId === playerId);
}

export async function saveEvaluation(input: {
  playerId: string;
  playerName: string;
  period: string;
  technical: number;
  tactical: number;
  physical: number;
  mental: number;
  teamwork: number;
  notes: string;
}) {
  const data = await readAll();
  const now = new Date().toISOString();

  const evaluation: PlayerEvaluation = {
    id: crypto.randomUUID(),
    playerId: input.playerId,
    playerName: input.playerName.trim(),
    period: input.period.trim(),
    technical: input.technical,
    tactical: input.tactical,
    physical: input.physical,
    mental: input.mental,
    teamwork: input.teamwork,
    notes: input.notes.trim(),
    createdAt: now,
    updatedAt: now,
  };

  data.unshift(evaluation);
  await writeAll(data);

  return evaluation;
}

export async function deleteEvaluation(id: string) {
  const data = await readAll();
  const next = data.filter(item => item.id !== id);

  if (next.length === data.length) {
    throw new Error('Penilaian tidak ditemukan.');
  }

  await writeAll(next);
}
