import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/memberAuth';
import { getContent } from '../../../lib/contentStore';
import { listRegistrations } from '../../../lib/registrationStore';
import { listAttendance } from '../../../lib/attendanceStore';
import { listEvaluations } from '../../../lib/playerEvaluationStore';
import { getPlayerFinance } from '../../../lib/financeStore';

export const prerender = false;

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function registrationPlayer(item: any) {
  const data = item.data || item;

  return {
    id: item.registration_number || item.id || '',
    nomor: item.registration_number || '',
    nama:
      data.nama_siswa ||
      data.nama ||
      data.name ||
      data.namaLengkap ||
      'Tanpa Nama',
    tempatLahir: data.tempat_lahir || data.tempatLahir || '',
    tanggalLahir: data.tanggal_lahir || data.tanggalLahir || '',
    nisn: data.nisn || '',
    alamat: data.alamat || '',
    posisi: data.posisi || data.position || '-',
    tinggi: data.tinggi || '',
    berat: data.berat || '',
    golonganDarah: data.golongan_darah || '',
    penyakitAlergi: data.penyakit_alergi || '',
    riwayatCedera: data.riwayat_cedera || '',
    status: item.status || data.status || 'baru',
    tanggalPendaftaran: item.tanggal_pendaftaran || data.tanggal_pendaftaran || '',
    paymentStatus:
      data.payment_status ||
      data.status_pembayaran ||
      'Belum Lunas',
  };
}

export const GET: APIRoute = async ({ request, locals }) => {
  const auth = await requireRole(request, ['orang_tua', 'siswa'], locals);

  if (auth.response) return auth.response;

  try {
    const [content, registrations, attendance, evaluations] =
      await Promise.all([
        getContent(locals),
        listRegistrations(locals),
        listAttendance(locals),
        listEvaluations(locals),
      ]);

    const accepted = registrations
      .filter((item: any) => {
        const status = normalize(item.status || item.data?.status);
        return status === 'diterima' || status === 'accepted';
      })
      .map(registrationPlayer);

    /*
     * Hubungan akun -> pemain menggunakan playerId.
     * Jika belum tersedia, jangan pernah mengembalikan pemain lain.
     */
    const playerId = auth.user?.playerId
      ? String(auth.user.playerId)
      : '';

    let player = null;

    if (playerId) {
      player =
        accepted.find((item: any) => item.id === playerId) ||
        null;
    }

    const playerAttendance = player
      ? attendance.filter((item: any) => item.playerId === player.id)
      : [];

    const playerEvaluations = player
      ? evaluations.filter((item: any) => item.playerId === player.id)
      : [];

    const finance = player && auth.user?.role === 'orang_tua'
      ? await getPlayerFinance(locals, player.id, player.tanggalPendaftaran)
      : null;

    if (finance && player) {
      player.paymentStatus = finance.summary.currentStatus === 'paid'
        ? 'Lunas'
        : finance.summary.currentStatus === 'overdue'
          ? 'Tunggakan'
          : finance.summary.currentStatus === 'upcoming'
            ? 'Belum Jatuh Tempo'
            : 'Belum Lunas';
    }

    const latestEvaluation = playerEvaluations[0] || null;

    const attendanceSummary = {
      total: playerAttendance.length,
      hadir: playerAttendance.filter((x: any) => x.status === 'hadir').length,
      izin: playerAttendance.filter((x: any) => x.status === 'izin').length,
      sakit: playerAttendance.filter((x: any) => x.status === 'sakit').length,
      alpa: playerAttendance.filter((x: any) => x.status === 'alpa').length,
    };

    const schedules = Array.isArray(content.schedule)
      ? content.schedule
      : [];

    const tournaments = Array.isArray(content.tournaments)
      ? content.tournaments
      : [];

    const announcements = Array.isArray(content.announcements)
      ? content.announcements
      : [];

    return new Response(
      JSON.stringify({
        success: true,
        role: auth.user?.role,
        user: {
          id: auth.user?.id,
          username: auth.user?.username,
          name: auth.user?.name,
        },
        linked: Boolean(player),
        player,
        schedules,
        tournaments,
        announcements,
        attendance: {
          records: playerAttendance,
          summary: attendanceSummary,
        },
        evaluations: playerEvaluations,
        latestEvaluation,
        finance,
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
    console.error('MEMBER DASHBOARD ERROR:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Gagal memuat dashboard anggota.',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
};
