import { requireAdmin } from '../../../../../lib/adminAuth';
import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getRegistration } from '../../../../../lib/registrationStore';

export const prerender = false;

const contentTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

export const GET: APIRoute = async ({ params, url, request }) => {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const nomor = params.nomor || '';
    const dokumen = params.dokumen || '';

    if (!nomor || !dokumen) {
      return new Response('Dokumen tidak valid.', {
        status: 400,
      });
    }

    const registration = await getRegistration(nomor);

    if (!registration) {
      return new Response('Pendaftaran tidak ditemukan.', {
        status: 404,
      });
    }

    let files = registration.files || {};

    if (typeof files === 'string') {
      files = JSON.parse(files);
    }

    const allowedDocuments = new Set(['pas_foto', 'akta', 'kk', 'rapor']);
    if (!allowedDocuments.has(dokumen)) {
      return new Response('Dokumen tidak valid.', { status: 400 });
    }

    const fileInfo = files[dokumen];

    if (!fileInfo || !fileInfo.stored_name) {
      return new Response('Dokumen tidak ditemukan.', {
        status: 404,
      });
    }

    const filePath = path.join(
      process.cwd(),
      'storage',
      'pendaftaran',
      nomor,
      fileInfo.stored_name
    );

    const bytes = await readFile(filePath);

    const extension = path.extname(
      fileInfo.stored_name
    ).replace('.', '').toLowerCase();

    const contentType =
      contentTypes[extension] ||
      fileInfo.type ||
      'application/octet-stream';

    const download =
      url.searchParams.get('download') === '1';

    const displayName = String(
      fileInfo.original_name || fileInfo.stored_name
    ).replace(/[^a-zA-Z0-9._-]/g, '_');
    const disposition = download
      ? `attachment; filename="${displayName}"`
      : `inline; filename="${displayName}"`;

    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': 'private, no-store',
      },
    });

  } catch (error) {
    console.error('DOCUMENT ERROR:', error);

    return new Response('Gagal membuka dokumen.', {
      status: 500,
    });
  }
};
