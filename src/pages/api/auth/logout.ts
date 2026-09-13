import type { APIRoute } from 'astro';
import {
  destroySession,
} from '../../../lib/authStore';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const cookie =
    request.headers.get('cookie') || '';

  const match =
    cookie.match(
      /(?:^|;\s*)ssb_session=([^;]+)/
    );

  if (match?.[1]) {
    await destroySession(locals, match[1]);
  }

  const headers = new Headers({
    'Content-Type':
      'application/json',
  });

  headers.append(
    'Set-Cookie',
    [
      'ssb_session=',
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=0',
      ...(import.meta.env.PROD ? ['Secure'] : []),
    ].join('; ')
  );

  return new Response(
    JSON.stringify({
      success: true,
    }),
    {
      status: 200,
      headers,
    }
  );
};
