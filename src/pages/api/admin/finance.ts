import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/adminAuth';
import { listRegistrations } from '../../../lib/registrationStore';
import {
  getFinanceConfig,
  getPlayerFinance,
  setPayment,
  setPayments,
  updateFinanceConfig,
} from '../../../lib/financeStore';

export const prerender = false;

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export const GET: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals);
  if (auth.response) return auth.response;
  try {
    const registrations = (await listRegistrations(locals)).filter((item: any) => item.status === 'diterima');
    const records = await Promise.all(registrations.map(async (item: any) => ({
      playerId: item.registration_number,
      playerName: item.nama_siswa || 'Tanpa Nama',
      parentName: item.nama_wali || item.nama_ayah || item.nama_ibu || '-',
      finance: await getPlayerFinance(locals, item.registration_number, item.tanggal_pendaftaran),
    })));
    return json({ success: true, config: await getFinanceConfig(locals), data: records });
  } catch (error) {
    console.error('ADMIN FINANCE GET ERROR:', error);
    return json({ success: false, message: 'Gagal membaca laporan keuangan.' }, 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = await requireAdmin(request, locals);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const action = String(body.action || '').trim();
    if (action === 'config') {
      const config = await updateFinanceConfig(locals, body.config || {});
      return json({ success: true, config });
    }
    if (action === 'payment') {
      const playerId = String(body.playerId || '').trim();
      const month = String(body.month || '').trim();
      const months = Array.isArray(body.months)
        ? body.months.map((value: unknown) => String(value || '').trim()).filter(Boolean)
        : [];

      const registration = (await listRegistrations(locals)).find((item: any) => item.registration_number === playerId && ['diterima', 'accepted'].includes(String(item.status || '').toLowerCase()));
      if (!registration) return json({ success: false, message: 'Pemain tidak ditemukan atau belum diterima.' }, 404);

      if (months.length > 0) {
        const payments = await setPayments(locals, {
          playerId,
          months,
          paid: Boolean(body.paid),
          note: body.note,
        });

        return json({
          success: true,
          payments,
          total: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
          finance: await getPlayerFinance(locals, playerId, registration.tanggal_pendaftaran),
        });
      }

      const payment = await setPayment(locals, {
        playerId,
        month,
        paid: Boolean(body.paid),
        note: body.note,
      });

      return json({
        success: true,
        payment,
        total: payment ? Number(payment.amount || 0) : 0,
        finance: await getPlayerFinance(locals, playerId, registration.tanggal_pendaftaran),
      });
    }
    return json({ success: false, message: 'Aksi finance tidak valid.' }, 400);
  } catch (error) {
    return json({ success: false, message: error instanceof Error ? error.message : 'Gagal menyimpan data keuangan.' }, 400);
  }
};
