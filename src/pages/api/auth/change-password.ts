import type { APIRoute } from 'astro';
import { changePasswordBySession } from '../../../lib/authStore';
import { getSessionToken } from '../../../lib/adminAuth';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const token = getSessionToken(request);

    if (!token) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Sesi login tidak ditemukan.' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await request.json();

    const currentPassword =
      typeof body?.currentPassword === 'string'
        ? body.currentPassword
        : '';

    const newPassword =
      typeof body?.newPassword === 'string'
        ? body.newPassword
        : '';

    await changePasswordBySession(
      locals,
      token,
      currentPassword,
      newPassword
    );

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Password berhasil diubah. Silakan login kembali.',
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
    const message =
      error instanceof Error
        ? error.message
        : 'Gagal mengubah password.';

    return new Response(
      JSON.stringify({
        ok: false,
        message,
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
};
