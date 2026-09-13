
import type { APIRoute } from 'astro';
import type { App } from 'astro';
import { getUserBySession } from '../../../lib/authStore';
import {
  listAttendance,
  saveAttendance,
  deleteAttendance,
} from '../../../lib/attendanceStore';
import { listRegistrations } from '../../../lib/registrationStore';

export const prerender = false;

function getToken(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|;\s*)ssb_session=([^;]+)/);
  return match?.[1] || '';
}

async function requireCoach(locals: App.Locals, request: Request) {
  const user = await getUserBySession(locals, getToken(request));

  if (!user) {
    return {
      user: null,
      response: new Response(
        JSON.stringify({
          success: false,
          message: 'Belum login.',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      ),
    };
  }

  if (user.role !== 'pelatih') {
    return {
      user: null,
      response: new Response(
        JSON.stringify({
          success: false,
          message: 'Akses khusus pelatih.',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      ),
    };
  }

  return {
    user,
    response: null,
  };
}

export const GET: APIRoute = async ({ request, locals }) => {
  const auth = await requireCoach(locals, request);
  if (auth.response) return auth.response;

  try {
    const data = await listAttendance(locals);

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
  } catch (error) {
    console.error('ABSENSI GET ERROR:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Gagal membaca data absensi.',
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
  const auth = await requireCoach(locals, request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();

    const playerId = String(body.playerId || '').trim();
    const playerName = String(body.playerName || '').trim();
    const date = String(body.date || '').trim();
    const status = String(body.status || '').trim();
    const note = String(body.note || '').trim();

    const allowed = [
      'hadir',
      'izin',
      'sakit',
      'alpa',
    ];

    if (!playerId || !playerName || !date) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Pemain dan tanggal wajib diisi.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || note.length > 500) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Tanggal atau catatan absensi tidak valid.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const registrations = await listRegistrations(locals);
    const player = registrations.find(
      (item: any) =>
        item.nomor_pendaftaran === playerId &&
        item.status === 'diterima'
    );

    if (!player) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Pemain tidak ditemukan atau belum diterima.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!allowed.includes(status)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Status absensi tidak valid.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const data = await saveAttendance(locals, 
      playerId,
      String(player.nama_siswa || playerName).slice(0, 120),
      date,
      status as 'hadir' | 'izin' | 'sakit' | 'alpa',
      note
    );

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
  } catch (error) {
    console.error('ABSENSI POST ERROR:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Gagal menyimpan absensi.',
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

export const DELETE: APIRoute = async ({ request, locals }) => {
  const auth = await requireCoach(locals, request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'ID absensi wajib diisi.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    await deleteAttendance(locals, id);

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('ABSENSI DELETE ERROR:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Gagal menghapus absensi.',
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
