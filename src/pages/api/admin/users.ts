import type { APIRoute } from 'astro';
import {
  createUser,
  listUsers,
  updateUser,
  updateUserActive,
  deleteUser,
  getUserById,
} from '../../../lib/authStore';
import { requireAdmin } from '../../../lib/adminAuth';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals);
  if (auth.response) return auth.response;

  try {
    const users = await listUsers(locals);

    return new Response(
      JSON.stringify({
        success: true,
        data: users,
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
    console.error('ADMIN USERS GET ERROR:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Gagal membaca daftar akun.',
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

    const username = String(body.username || '').trim();
    const name = String(body.name || '').trim();
    const role = String(body.role || '').trim();
    const password = String(body.password || '');

    const allowedRoles = ['admin', 'pelatih'];

    if (!username || !name || !password || !role) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Nama, username, role, dan password wajib diisi.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!allowedRoles.includes(role)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Role akun tidak valid.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Password minimal 8 karakter.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const user = await createUser(
      locals,
      username,
      name,
      role as
        | 'admin'
        | 'pelatih'
        | 'orang_tua'
        | 'siswa',
      password
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: user,
      }),
      {
        status: 201,
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
        : 'Gagal membuat akun.';

    return new Response(
      JSON.stringify({
        success: false,
        message,
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'ID akun wajib diisi.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const action = String(body.action || '').trim();

    if (action === 'status') {
      const active = Boolean(body.active);

      const user = await updateUserActive(locals, id, active);

      return new Response(
        JSON.stringify({
          success: true,
          data: user,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const role = body.role !== undefined
      ? String(body.role || '').trim()
      : undefined;

    const existingUser = await getUserById(locals, id);
    if (!existingUser) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Akun tidak ditemukan.',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const allowedRoles = existingUser.role === 'siswa' || existingUser.role === 'orang_tua'
      ? ['admin', 'pelatih', 'orang_tua', 'siswa'] as const
      : ['admin', 'pelatih'] as const;

    if (
      role !== undefined &&
      !allowedRoles.includes(
        role as (typeof allowedRoles)[number]
      )
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Role akun tidak valid.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const password =
      body.password !== undefined
        ? String(body.password || '')
        : undefined;

    if (password !== undefined && password !== '' && password.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Password minimal 8 karakter.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const user = await updateUser(locals, id, {
      name:
        body.name !== undefined
          ? String(body.name || '').trim()
          : undefined,
      username:
        body.username !== undefined
          ? String(body.username || '').trim()
          : undefined,
      role: role as
        | 'admin'
        | 'pelatih'
        | 'orang_tua'
        | 'siswa'
        | undefined,
      password,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: user,
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
        : 'Gagal mengubah akun.';

    return new Response(
      JSON.stringify({
        success: false,
        message,
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};


export const DELETE: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'ID akun wajib diisi.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (auth.user?.id === id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Akun yang sedang digunakan tidak dapat dihapus.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const user = await deleteUser(locals, id);

    return new Response(
      JSON.stringify({
        success: true,
        data: user,
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
        : 'Gagal menghapus akun.';

    return new Response(
      JSON.stringify({
        success: false,
        message,
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
