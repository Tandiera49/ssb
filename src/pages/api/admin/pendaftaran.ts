import { requireAdmin } from '../../../lib/adminAuth';
import type { APIRoute } from 'astro';
import { listRegistrations } from '../../../lib/registrationStore';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals);
  if (auth.response) return auth.response;
  try {
    const data = await listRegistrations(locals);

    return new Response(JSON.stringify({
      success: true,
      total: data.length,
      data,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('ADMIN PENDAFTARAN ERROR:', error);

    return new Response(JSON.stringify({
      success: false,
      message: 'Gagal membaca data pendaftaran.',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
