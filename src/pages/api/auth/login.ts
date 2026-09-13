import type { APIRoute } from 'astro';
import {
  authenticate,
  createSession,
  verifyPassword,
} from '../../../lib/authStore';
import { getDB } from '../../../lib/db';

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
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
      locals,
      username,
      password
    );

    if (!user) {
      // TEMP DIAGNOSTIC: membedakan row user tidak ditemukan
      // dengan password hash yang tidak cocok.
      try {
        const db = getDB(locals);
        const diagnostic = await db
          .prepare(
            `SELECT username, active, password_hash
             FROM users
             WHERE username = ?1
             LIMIT 1`
          )
          .bind(username.toLowerCase())
          .first<{ username: string; active: number; password_hash: string }>();

        const found = !!diagnostic;
        const active = diagnostic?.active === 1;
        const hashValid = diagnostic
          ? await verifyPassword(password, diagnostic.password_hash)
          : false;

        return new Response(
          JSON.stringify({
            success: false,
            diagnostic: {
              userFound: found,
              active,
              passwordValid: hashValid,
            },
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
            },
          }
        );
      } catch (diagnosticError) {
        console.error('LOGIN DIAGNOSTIC ERROR:', diagnosticError);
      }
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
      await createSession(locals, user.id);
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
