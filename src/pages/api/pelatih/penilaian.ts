import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/memberAuth';
import {
  listEvaluations,
  saveEvaluation,
  deleteEvaluation,
} from '../../../lib/playerEvaluationStore';
import { listRegistrations } from '../../../lib/registrationStore';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const auth = await requireRole(request, ['pelatih'], locals);

  if (auth.response) return auth.response;

  try {
    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId') || undefined;

    const data = await listEvaluations(locals, playerId);

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Gagal membaca penilaian.',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = await requireRole(request, ['pelatih'], locals);

  if (auth.response) return auth.response;

  try {
    const body = await request.json();

    const number = (value: unknown) => {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 1 || n > 10) {
        throw new Error('Nilai harus antara 1 sampai 10.');
      }
      return n;
    };

    const playerId = String(body.playerId || '').trim();
    const playerName = String(body.playerName || '').trim();
    const period = String(body.period || '').trim();

    if (!playerId || !playerName || !period) {
      throw new Error(
        'Pemain dan periode penilaian wajib diisi.'
      );
    }

    if (period.length > 80 || String(body.notes || '').length > 1000) {
      throw new Error('Periode atau catatan penilaian terlalu panjang.');
    }

    const registrations = await listRegistrations(locals);
    const player = registrations.find(
      (item: any) =>
        item.registration_number === playerId &&
        item.status === 'diterima'
    );

    if (!player) {
      throw new Error('Pemain tidak ditemukan atau belum diterima.');
    }

    const data = await saveEvaluation(locals, {
      playerId,
      playerName: String(player.nama_siswa || playerName).slice(0, 120),
      period,
      technical: number(body.technical),
      tactical: number(body.tactical),
      physical: number(body.physical),
      mental: number(body.mental),
      teamwork: number(body.teamwork),
      notes: String(body.notes || '').slice(0, 1000),
    });

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Gagal menyimpan penilaian.',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const auth = await requireRole(request, ['pelatih'], locals);

  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();

    if (!id) {
      throw new Error('ID penilaian wajib diisi.');
    }

    await deleteEvaluation(locals, id);

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Gagal menghapus penilaian.',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
