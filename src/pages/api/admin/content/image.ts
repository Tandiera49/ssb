import type { APIRoute } from 'astro';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const UPLOAD_ROOT = path.join(
  process.cwd(),
  'storage',
  'content',
  'uploads'
);

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const filename = path.basename(
      url.searchParams.get('file') || ''
    );

    if (!filename) {
      return new Response('File tidak ditemukan.', {
        status: 404,
      });
    }

    const filepath = path.join(
      UPLOAD_ROOT,
      filename
    );

    const bytes = await fs.readFile(filepath);

    const ext = path
      .extname(filename)
      .toLowerCase();

    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.avif': 'image/avif',
    };

    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type':
          mimeMap[ext] || 'application/octet-stream',
        'Cache-Control':
          'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response(
      'Foto tidak ditemukan.',
      { status: 404 }
    );
  }
};
