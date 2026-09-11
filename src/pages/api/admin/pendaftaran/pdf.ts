import type { APIRoute } from 'astro';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { requireAdmin } from '../../../../lib/adminAuth';
import { generateFormPdf } from '../../../../lib/generateFormPdf';
import { getRegistration } from '../../../../lib/registrationStore';

export const prerender = false;

const allowedFiles = ['pas_foto', 'akta', 'kk', 'rapor'] as const;

export const GET: APIRoute = async ({ request, url }) => {
  const auth = await requireAdmin(request);

  if (auth.response) {
    return auth.response;
  }

  const nomor = String(url.searchParams.get('nomor') || '').trim();

  if (!nomor || !/^[a-zA-Z0-9_-]+$/.test(nomor)) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Nomor pendaftaran tidak valid.',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  try {
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

    const form = new FormData();

    const fields = [
      'nama_siswa',
      'tempat_lahir',
      'tanggal_lahir',
      'nisn',
      'alamat',
      'nama_ayah',
      'hp_ayah',
      'pekerjaan_ayah',
      'nama_ibu',
      'hp_ibu',
      'pekerjaan_ibu',
      'posisi',
      'ssb_sebelumnya',
      'prestasi',
      'tinggi',
      'berat',
      'golongan_darah',
      'penyakit_alergi',
      'riwayat_cedera',
      'persetujuan',
      'nama_wali',
    ];

    for (const field of fields) {
      form.set(field, String(registration[field] || ''));
    }

    form.set('nomor_pendaftaran', nomor);

    let files: Record<string, any> = {};

    if (typeof registration.files === 'string') {
      try {
        files = JSON.parse(registration.files);
      } catch {
        files = {};
      }
    } else if (
      registration.files &&
      typeof registration.files === 'object'
    ) {
      files = registration.files;
    }

    const folder = path.join(
      process.cwd(),
      'storage',
      'pendaftaran',
      nomor
    );

    for (const field of allowedFiles) {
      const metadata = files[field];

      if (!metadata?.stored_name) {
        continue;
      }

      const filePath = path.join(
        folder,
        path.basename(metadata.stored_name)
      );

      try {
        const bytes = await fs.readFile(filePath);

        const file = new File(
          [bytes],
          metadata.original_name || metadata.stored_name,
          {
            type:
              metadata.type ||
              'application/octet-stream',
          }
        );

        form.set(field, file);
      } catch (error) {
        console.warn(
          `Lampiran ${field} tidak dapat dibaca untuk ${nomor}:`,
          error
        );
      }
    }

    const pdf = await generateFormPdf(form);

    return new Response(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          `attachment; filename="Formulir-Pendaftaran-${nomor}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('ADMIN PDF ERROR:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Gagal membuat PDF pendaftaran.',
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
