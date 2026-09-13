import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../../lib/adminAuth';
import { getRegistration, getRegistrationFile } from '../../../../../lib/registrationStore';

const contentTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
export const prerender = false;
export const GET: APIRoute = async ({ params, url, request, locals }) => {
  try {
    const auth = await requireAdmin(request, locals); if (auth.response) return auth.response;
    const nomor = params.nomor || ''; const dokumen = params.dokumen || '';
    if (!nomor || !['pas_foto', 'akta', 'kk', 'rapor'].includes(dokumen)) return new Response('Dokumen tidak valid.', { status: 400 });
    const registration = await getRegistration(locals, nomor); if (!registration) return new Response('Pendaftaran tidak ditemukan.', { status: 404 });
    const fileInfo = registration.files?.[dokumen]; if (!fileInfo) return new Response('Dokumen tidak ditemukan.', { status: 404 });
    const object = await getRegistrationFile(locals, nomor, fileInfo); if (!object) return new Response('Dokumen tidak ditemukan.', { status: 404 });
    const ext = String(fileInfo.stored_name || '').split('.').pop()?.toLowerCase() || '';
    const displayName = String(fileInfo.original_name || fileInfo.stored_name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const disposition = url.searchParams.get('download') === '1' ? `attachment; filename="${displayName}"` : `inline; filename="${displayName}"`;
    return new Response(object.body, { status: 200, headers: { 'Content-Type': object.httpMetadata?.contentType || contentTypes[ext] || 'application/octet-stream', 'Content-Disposition': disposition, 'Cache-Control': 'private, no-store' } });
  } catch (error) { console.error('DOCUMENT ERROR:', error); return new Response('Gagal membuka dokumen.', { status: 500 }); }
};
