import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/adminAuth';
import { generateFormPdf } from '../../../../lib/generateFormPdf';
import { getRegistration, getRegistrationFile } from '../../../../lib/registrationStore';
export const prerender = false;
const allowedFiles = ['pas_foto', 'akta', 'kk', 'rapor'] as const;
export const GET: APIRoute = async ({ request, url, locals }) => {
  const auth = await requireAdmin(request, locals); if (auth.response) return auth.response;
  const nomor = String(url.searchParams.get('nomor') || '').trim();
  if (!nomor || !/^[a-zA-Z0-9_-]+$/.test(nomor)) return new Response(JSON.stringify({ success: false, message: 'Nomor pendaftaran tidak valid.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  try {
    const registration = await getRegistration(locals, nomor); if (!registration) return new Response(JSON.stringify({ success: false, message: 'Data pendaftaran tidak ditemukan.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    const form = new FormData();
    for (const field of ['nama_siswa','tempat_lahir','tanggal_lahir','nisn','alamat','nama_ayah','hp_ayah','pekerjaan_ayah','nama_ibu','hp_ibu','pekerjaan_ibu','posisi','ssb_sebelumnya','prestasi','tinggi','berat','golongan_darah','penyakit_alergi','riwayat_cedera','persetujuan','nama_wali']) form.set(field, String(registration[field] || ''));
    form.set('nomor_pendaftaran', nomor);
    for (const field of allowedFiles) { const metadata = registration.files?.[field]; if (!metadata) continue; const object = await getRegistrationFile(locals, nomor, metadata); if (object) form.set(field, new File([await object.arrayBuffer()], metadata.original_name || metadata.stored_name, { type: metadata.type || object.httpMetadata?.contentType || 'application/octet-stream' })); }
    const pdf = await generateFormPdf(form, locals);
    return new Response(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="Formulir-Pendaftaran-${nomor}.pdf"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) { console.error('ADMIN PDF ERROR:', error); return new Response(JSON.stringify({ success: false, message: 'Gagal membuat PDF pendaftaran.' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};
