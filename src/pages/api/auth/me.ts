import type { APIRoute } from 'astro';
import {
  getUserBySession,
} from '../../../lib/authStore';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const cookie =
    request.headers.get('cookie') || '';

  const match =
    cookie.match(
      /(?:^|;\s*)ssb_session=([^;]+)/
    );

  const user =
    match?.[1]
      ? await getUserBySession(locals, match[1])
      : null;

  return new Response(
    JSON.stringify({
      success: true,
      authenticated: Boolean(user),
      user,
    }),
    {
      status: 200,
      headers: {
        'Content-Type':
          'application/json',
        'Cache-Control':
          'no-store',
      },
    }
  );
};
