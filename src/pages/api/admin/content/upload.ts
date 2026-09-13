import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/adminAuth';
import { getUploads } from '../../../../lib/db';

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const cleanName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals); if (auth.response) return auth.response;
  try {
    const form = await request.formData(); const type = String(form.get('type') || 'gallery'); const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) return json({ success: false, message: 'Foto belum dipilih.' }, 400);
    if (!file.type.startsWith('image/')) return json({ success: false, message: 'File harus berupa gambar.' }, 400);
    if (file.size > 10 * 1024 * 1024) return json({ success: false, message: 'Ukuran foto maksimal 10 MB.' }, 400);
    const original = cleanName(file.name || 'foto.jpg'); const match = original.match(/\.[a-zA-Z0-9]+$/); const ext = (match?.[0] || '.jpg').toLowerCase();
    if (!allowedExtensions.has(ext)) return json({ success: false, message: 'Format foto harus JPG, PNG, WEBP, GIF, atau AVIF.' }, 400);
    const filename = `${type === 'hero' ? 'hero' : 'gallery'}-${crypto.randomUUID()}${ext}`; const key = `content/${filename}`;
    await getUploads(locals).put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    return json({ success: true, message: 'Foto berhasil diunggah.', filename, original_name: file.name, key, url: `/api/admin/content/image?file=${encodeURIComponent(filename)}` });
  } catch (error) { console.error('CONTENT UPLOAD ERROR:', error); return json({ success: false, message: 'Gagal mengunggah foto.' }, 500); }
};
