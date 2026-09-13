import { requireAdmin } from '../../../lib/adminAuth';
import type { APIRoute } from 'astro';
import {
  getContent,
  saveContent,
} from '../../../lib/contentStore';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const content = await getContent(locals);

    return new Response(
      JSON.stringify({
        success: true,
        data: content,
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
    console.error('CONTENT GET ERROR:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Gagal membaca konten.',
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

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Data konten tidak valid.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (JSON.stringify(body).length > 1_000_000) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Data konten terlalu besar.',
      }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    for (const key of ['schedule', 'tournaments', 'gallery', 'announcements']) {
      if (body[key] !== undefined &&
          (!Array.isArray(body[key]) || body[key].length > 100)) {
        return new Response(JSON.stringify({
          success: false,
          message: `Data ${key} tidak valid.`,
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const content = await saveContent(locals, body);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Konten berhasil disimpan.',
        data: content,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('CONTENT POST ERROR:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Gagal menyimpan konten.',
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
