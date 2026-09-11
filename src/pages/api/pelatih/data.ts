import type { APIRoute } from 'astro';
import { getUserBySession } from '../../../lib/authStore';
import { getContent } from '../../../lib/contentStore';
import { listRegistrations } from '../../../lib/registrationStore';

export const prerender = false;

function getSessionToken(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|;\s*)ssb_session=([^;]+)/);
  return match?.[1] || '';
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const token = getSessionToken(request);
    const user = await getUserBySession(token);

    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Belum login.',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (user.role !== 'pelatih') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Akses khusus pelatih.',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [content, registrations] = await Promise.all([
      getContent(),
      listRegistrations(),
    ]);

    const accepted = registrations.filter((item: any) => {
      const status = String(
        item.status ||
        item.data?.status ||
        ''
      ).toLowerCase();

      return status === 'diterima' || status === 'accepted';
    });

    const players = accepted.map((item: any) => {
      const data = item.data || item;

      return {
        id: item.nomor_pendaftaran || item.id || '',
        nomor: item.nomor_pendaftaran || '',
        nama:
          data.nama ||
          data.name ||
          data.nama_siswa ||
          data.namaLengkap ||
          'Tanpa Nama',
        posisi:
          data.posisi ||
          data.position ||
          '-',
        tanggalLahir:
          data.tanggal_lahir ||
          data.tanggalLahir ||
          data.birth_date ||
          '-',
        status: item.status || data.status || 'diterima',
      };
    });

    const schedules = Array.isArray(content.schedule)
      ? content.schedule
      : [];

    return new Response(JSON.stringify({
      success: true,
      data: {
        user: {
          name: user.name,
          username: user.username,
        },
        statistics: {
          players: players.length,
          schedules: schedules.length,
          registrations: registrations.length,
        },
        schedules,
        players,
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PELATIH DATA ERROR:', error);

    return new Response(JSON.stringify({
      success: false,
      message: 'Gagal memuat data pelatih.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
