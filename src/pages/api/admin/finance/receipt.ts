import type { APIRoute } from 'astro';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { requireAdmin } from '../../../../lib/adminAuth';
import { listRegistrations } from '../../../../lib/registrationStore';
import { getPlayerFinance } from '../../../../lib/financeStore';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const playerId = String(url.searchParams.get('playerId') || '').trim();
  const month = String(url.searchParams.get('month') || '').trim();
  if (!playerId || !month) return new Response('Parameter invoice tidak lengkap.', { status: 400 });
  const registration = (await listRegistrations()).find((item: any) => item.nomor_pendaftaran === playerId && item.status === 'diterima');
  if (!registration) return new Response('Peserta tidak ditemukan.', { status: 404 });
  const finance = await getPlayerFinance(playerId);
  const invoice = finance.invoices.find((item: any) => item.month === month);
  if (!invoice || invoice.status !== 'paid') return new Response('Invoice belum berstatus lunas.', { status: 400 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.03, 0.24, 0.16);
  const gold = rgb(0.82, 0.60, 0.10);
  page.drawRectangle({ x: 0, y: 760, width: 595, height: 82, color: green });
  page.drawText('SSB BHAYANGKARA JUNIOR 2018', { x: 42, y: 800, size: 18, font: bold, color: rgb(1,1,1) });
  page.drawText('TANDA TERIMA PEMBAYARAN', { x: 42, y: 778, size: 10, font: regular, color: rgb(0.82,0.92,0.86) });
  page.drawText('RECEIPT', { x: 455, y: 800, size: 11, font: bold, color: gold });
  page.drawText(`No. ${playerId}-${month}`, { x: 42, y: 710, size: 10, font: regular, color: rgb(0.35,0.42,0.38) });
  page.drawText('Diterima dari', { x: 42, y: 665, size: 10, font: regular, color: rgb(0.35,0.42,0.38) });
  page.drawText(String(registration.nama_wali || registration.nama_ayah || registration.nama_ibu || '-'), { x: 42, y: 642, size: 16, font: bold, color: green });
  page.drawText('Untuk peserta', { x: 42, y: 598, size: 10, font: regular, color: rgb(0.35,0.42,0.38) });
  page.drawText(String(registration.nama_siswa || '-'), { x: 42, y: 575, size: 16, font: bold, color: green });
  page.drawRectangle({ x: 42, y: 475, width: 511, height: 64, color: rgb(0.95,0.97,0.95), borderColor: rgb(0.84,0.89,0.85), borderWidth: 1 });
  page.drawText(invoice.label, { x: 60, y: 512, size: 12, font: bold, color: green });
  page.drawText(`Rp${Number(invoice.amount).toLocaleString('id-ID')}`, { x: 390, y: 505, size: 16, font: bold, color: green });
  page.drawText('Status pembayaran: LUNAS', { x: 60, y: 490, size: 10, font: regular, color: rgb(0.15,0.48,0.28) });
  page.drawText(`Dicatat pada ${new Date(invoice.paidAt || Date.now()).toLocaleDateString('id-ID', { dateStyle: 'long' })}`, { x: 42, y: 420, size: 10, font: regular, color: rgb(0.35,0.42,0.38) });
  page.drawText('Pembayaran diterima secara manual oleh Administrasi SSB.', { x: 42, y: 390, size: 10, font: regular, color: rgb(0.35,0.42,0.38) });
  page.drawText('Administrasi', { x: 415, y: 260, size: 10, font: regular, color: rgb(0.35,0.42,0.38) });
  page.drawLine({ start: { x: 400, y: 245 }, end: { x: 540, y: 245 }, thickness: 1, color: rgb(0.5,0.58,0.52) });
  page.drawText('SSB Bhayangkara Junior 2018', { x: 42, y: 65, size: 9, font: regular, color: rgb(0.45,0.55,0.49) });
  page.drawText('Dokumen ini dibuat oleh sistem administrasi SSB.', { x: 42, y: 49, size: 8, font: regular, color: rgb(0.55,0.62,0.57) });
  const bytes = await pdf.save();
  return new Response(bytes, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="Tanda-Terima-${playerId}-${month}.pdf"`, 'Cache-Control': 'private, no-store' } });
};
