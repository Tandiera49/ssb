import { requireAdmin } from '../../../lib/adminAuth';
import type { APIRoute } from 'astro';
import { updateRegistrationStatus } from '../../../lib/registrationStore';
import { setPayment, getPlayerFinance } from '../../../lib/financeStore';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();

    const nomor = String(body.nomor || '').trim();
    const status = String(body.status || '').trim();

    if (!nomor || !status) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Nomor pendaftaran dan status wajib diisi.',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const current = await import('../../../lib/registrationStore').then(
      ({ getRegistration }) => getRegistration(nomor)
    );

    if (!current) {
      throw new Error('Data pendaftaran tidak ditemukan.');
    }

    const previousStatus = String(current.status || '').trim();

    const data = await updateRegistrationStatus(
      nomor,
      status
    );

    // Status Diterima berarti pembayaran awal Rp500.000
    // sudah dikonfirmasi lunas oleh manajemen.
    if (status === 'diterima' && previousStatus !== 'diterima') {
      await setPayment({
        playerId: nomor,
        month: 'initial',
        paid: true,
        note: 'Pembayaran awal dikonfirmasi saat pendaftaran diterima.',
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('UPDATE STATUS ERROR:', error);

    return new Response(JSON.stringify({
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Gagal mengubah status.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
