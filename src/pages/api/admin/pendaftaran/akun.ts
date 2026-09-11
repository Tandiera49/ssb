import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/adminAuth';
import { getRegistration } from '../../../../lib/registrationStore';
import { createParticipantAccounts } from '../../../../lib/authStore';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);

  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const nomor = String(body.nomor || '').trim();

    if (!nomor) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Nomor pendaftaran wajib diisi.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const registration = await getRegistration(nomor);

    if (!registration) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Data pendaftaran tidak ditemukan.',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (registration.status !== 'diterima') {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Akun peserta hanya dapat dibuat untuk pendaftaran dengan status Diterima.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const studentName =
      String(registration.nama_siswa || '').trim();

    const parentName =
      String(
        registration.nama_wali ||
        registration.nama_ayah ||
        registration.nama_ibu ||
        ''
      ).trim();

    if (!studentName) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Nama siswa pada pendaftaran tidak tersedia.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const result = await createParticipantAccounts(
      nomor,
      studentName,
      parentName
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
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
    console.error(
      'GENERATE PARTICIPANT ACCOUNTS ERROR:',
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Gagal membuat akun peserta.',
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
