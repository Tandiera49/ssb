import { getUserBySession } from './authStore';

export async function requireRole(
  request: Request,
  roles: string[]
) {
  const cookie = request.headers.get('cookie') || '';

  const match = cookie.match(
    /(?:^|;\s*)ssb_session=([^;]+)/
  );

  if (!match?.[1]) {
    return {
      user: null,
      response: new Response(
        JSON.stringify({
          success: false,
          message: 'Belum login.',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      ),
    };
  }

  const user = await getUserBySession(match[1]);

  if (!user) {
    return {
      user: null,
      response: new Response(
        JSON.stringify({
          success: false,
          message: 'Sesi login tidak valid.',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      ),
    };
  }

  if (!roles.includes(user.role)) {
    return {
      user: null,
      response: new Response(
        JSON.stringify({
          success: false,
          message: 'Akses ditolak.',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      ),
    };
  }

  return {
    user,
    response: null,
  };
}
