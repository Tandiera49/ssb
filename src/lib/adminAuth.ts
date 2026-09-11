import { getUserBySession } from './authStore';

export function getSessionToken(request: Request) {
  const cookie = request.headers.get('cookie') || '';

  const match = cookie.match(
    /(?:^|;\s*)ssb_session=([^;]+)/
  );

  return match?.[1] || '';
}

export async function getAdminFromRequest(
  request: Request
) {
  const token = getSessionToken(request);

  if (!token) return null;

  const user = await getUserBySession(token);

  if (!user || user.role !== 'admin') {
    return null;
  }

  return user;
}

export async function requireAdmin(
  request: Request
) {
  const user = await getAdminFromRequest(request);

  if (user) {
    return {
      user,
      response: null,
    };
  }

  return {
    user: null,
    response: new Response(
      JSON.stringify({
        success: false,
        message: 'Login admin diperlukan.',
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
