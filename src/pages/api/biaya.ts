import type { APIRoute } from 'astro';
import { getFinanceConfig } from '../../lib/financeStore';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const config = await getFinanceConfig(locals);

    const administration = Number(config.administration || 0);
    const jerseyAndSocks = Number(config.jersey || 0);
    const initialSpp = Number(config.initialTuition || 0);
    const monthlySpp = Number(config.monthlyTuition || 0);

    return new Response(JSON.stringify({
      success: true,
      administration,
      jerseyAndSocks,
      initialSpp,
      initialTotal: administration + jerseyAndSocks + initialSpp,
      monthlySpp,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PUBLIC COST GET ERROR:', error);

    return new Response(JSON.stringify({
      success: false,
      message: 'Gagal membaca konfigurasi biaya.',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
};
