import { requireAdmin } from '../../../../lib/adminAuth';
import type { APIRoute } from 'astro';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const UPLOAD_ROOT = path.join(
  process.cwd(),
  'storage',
  'content',
  'uploads'
);

const cleanName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_');
const allowedExtensions = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif',
]);

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const form = await request.formData();

    const type = String(form.get('type') || 'gallery');
    const file = form.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Foto belum dipilih.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!file.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'File harus berupa gambar.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Ukuran foto maksimal 10 MB.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    await fs.mkdir(UPLOAD_ROOT, { recursive: true });

    const original = cleanName(
      file.name || 'foto.jpg'
    );

    const ext =
      path.extname(original).toLowerCase() || '.jpg';

    if (!allowedExtensions.has(ext)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Format foto harus JPG, PNG, WEBP, GIF, atau AVIF.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const prefix =
      type === 'hero' ? 'hero' : 'gallery';

    const filename =
      `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}${ext}`;

    const filepath = path.join(
      UPLOAD_ROOT,
      filename
    );

    const bytes = new Uint8Array(
      await file.arrayBuffer()
    );

    await fs.writeFile(filepath, bytes);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Foto berhasil diunggah.',
        filename,
        original_name: file.name,
        url: `/api/admin/content/image?file=${encodeURIComponent(filename)}`,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('CONTENT UPLOAD ERROR:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Gagal mengunggah foto.',
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
