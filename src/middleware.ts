import { defineMiddleware } from 'astro:middleware';
import { getUserBySession } from './lib/authStore';

function getSessionToken(request: Request) {
  const cookie = request.headers.get('cookie') || '';

  const match = cookie.match(
    /(?:^|;\s*)ssb_session=([^;]+)/
  );

  return match?.[1] || '';
}

function jsonUnauthorized() {
  const response = new Response(
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
  );

  addSecurityHeaders(response);
  return response;
}

export const onRequest = defineMiddleware(
  async (context, next) => {
    const pathname = context.url.pathname;
    const method = context.request.method;

    /*
     * API content GET dan image tetap publik
     * karena dipakai oleh homepage.
     *
     * Semua API admin lainnya wajib login admin.
     */
    const isPublicAdminContent =
      pathname === '/api/admin/content' &&
      method === 'GET';

    const isPublicAdminImage =
      pathname === '/api/admin/content/image' &&
      method === 'GET';

    const isAdminApi =
      pathname.startsWith('/api/admin/');

    const isAdminPage =
      pathname === '/admin' ||
      pathname.startsWith('/admin/');

    const mustAuthenticate =
      isAdminPage ||
      (
        isAdminApi &&
        !isPublicAdminContent &&
        !isPublicAdminImage
      );

    if (!mustAuthenticate) {
      const response = await next();
      addSecurityHeaders(response);
      return response;
    }

    const token = getSessionToken(
      context.request
    );

    const user = token
      ? await getUserBySession(context.locals, token)
      : null;

    if (!user || user.role !== 'admin') {
      if (isAdminApi) {
        return jsonUnauthorized();
      }

      const redirect =
        `${pathname}${context.url.search}`;

      return context.redirect(
        `/login?redirect=${encodeURIComponent(redirect)}`
      );
    }

    context.locals.user = user;

    const response = await next();

    response.headers.set(
      'Cache-Control',
      'no-store'
    );

    addSecurityHeaders(response);

    return response;
  }
);

function addSecurityHeaders(response: Response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
}
