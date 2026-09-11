import type { APIRoute } from 'astro';
import {
  authenticate,
  createSession,
} from '../../../lib/authStore';

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const username = String(
      body.username || ''
    ).trim();

    const password = String(
      body.password || ''
    );

    const forwarded = request.headers.get('x-forwarded-for');
    const clientKey = (forwarded?.split(',')[0] || 'unknown').trim();
    const now = Date.now();
    const attempt = loginAttempts.get(clientKey);
    if (attempt && attempt.resetAt <= now) loginAttempts.delete(clientKey);
    const currentAttempt = loginAttempts.get(clientKey);
    if (currentAttempt && currentAttempt.count >= MAX_ATTEMPTS) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((currentAttempt.resetAt - now) / 1000)),
          'Cache-Control': 'no-store',
        },
      });
    }

    if (!username || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Username dan password wajib diisi.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type':
              'application/json',
          },
        }
      );
    }

    const user = await authenticate(
      username,
      password
    );

    if (!user) {
      const existing = loginAttempts.get(clientKey);
      loginAttempts.set(clientKey, {
        count: (existing?.count || 0) + 1,
        resetAt: existing?.resetAt || now + WINDOW_MS,
      });
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Username atau password salah.',
        }),
        {
          status: 401,
          headers: {
            'Content-Type':
              'application/json',
          },
        }
      );
    }

    const session =
      await createSession(user.id);
    loginAttempts.delete(clientKey);

    const headers = new Headers({
      'Content-Type':
        'application/json',
    });

    headers.append(
      'Set-Cookie',
      [
        `ssb_session=${session.token}`,
        'Path=/',
        `HttpOnly`,
        'SameSite=Lax',
        'Max-Age=43200',
        ...(import.meta.env.PROD ? ['Secure'] : []),
      ].join('; ')
    );

    return new Response(
      JSON.stringify({
        success: true,
        user,
        redirect:
          user.role === 'admin'
            ? '/admin/pendaftaran'
            : user.role === 'pelatih'
              ? '/pelatih'
              : user.role === 'orang_tua'
                ? '/orang-tua'
                : user.role === 'siswa'
                  ? '/siswa'
                  : '/dashboard',
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    console.error(
      'LOGIN ERROR:',
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        message:
          'Terjadi kesalahan saat login.',
      }),
      {
        status: 500,
        headers: {
          'Content-Type':
            'application/json',
        },
      }
    );
  }
};
