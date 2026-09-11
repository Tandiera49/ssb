import type { APIRoute } from 'astro';
import { generateFormPdf } from '../../../lib/generateFormPdf';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await request.formData();

    const pdf = await generateFormPdf(form);

    return new Response(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          'attachment; filename="Formulir-Pendaftaran-SSB-Bhayangkara-Junior-2018.pdf"',
      },
    });
  } catch (error) {
    console.error('PDF ERROR:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Gagal membuat PDF pendaftaran.',
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
