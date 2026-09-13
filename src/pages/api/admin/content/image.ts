import type { APIRoute } from 'astro';
import { getUploads } from '../../../../lib/db';

const mimeMap: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };
export const prerender = false;
export const GET: APIRoute = async ({ url, locals }) => {
  const filename = (url.searchParams.get('file') || '').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!filename) return new Response('File tidak ditemukan.', { status: 404 });
  const object = await getUploads(locals).get(`content/${filename}`);
  if (!object) return new Response('Foto tidak ditemukan.', { status: 404 });
  const ext = filename.match(/\.[a-zA-Z0-9]+$/)?.[0].toLowerCase() || '';
  const headers = new Headers({ 'Content-Type': object.httpMetadata?.contentType || mimeMap[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable', 'ETag': object.httpEtag });
  return new Response(object.body, { status: 200, headers });
};
