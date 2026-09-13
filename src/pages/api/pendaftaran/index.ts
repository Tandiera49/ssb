import type { APIRoute } from 'astro';
import {
  getRegistration,
  saveRegistration,
} from '../../../lib/registrationStore';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const formData = await request.formData();

    const nama = String(
      formData.get('nama_siswa') || ''
    ).trim();

    const tempatLahir = String(
      formData.get('tempat_lahir') || ''
    ).trim();

    const tanggalLahir = String(
      formData.get('tanggal_lahir') || ''
    ).trim();

    const nisn = String(
      formData.get('nisn') || ''
    ).trim();

    if (!nama || !tempatLahir || !tanggalLahir) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Nama, tempat lahir, dan tanggal lahir wajib diisi.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (nama.length > 120 || tempatLahir.length > 80 || nisn.length > 30) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Panjang data pendaftaran melebihi batas.',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalLahir)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Format tanggal lahir tidak valid.',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let nomor = '';
    do {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      const suffix = Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      nomor = `BJ2018-${new Date().getFullYear()}-${suffix}`;
    } while (await getRegistration(locals, nomor));

    await saveRegistration(locals,
      nomor,
      formData
    );

    return new Response(
      JSON.stringify({
        success: true,
        nomor_pendaftaran: nomor,
        nama,
        tempat_lahir: tempatLahir,
        tanggal_lahir: tanggalLahir,
        nisn,
        message:
          'Data dan dokumen pendaftaran berhasil disimpan.',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error(
      'SAVE PENDAFTARAN ERROR:',
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        message:
          'Data pendaftaran gagal disimpan.',
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
