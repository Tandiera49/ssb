import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import { getFinanceConfig } from './financeStore';

const GREEN = rgb(0.02, 0.16, 0.10);
const GOLD = rgb(0.95, 0.68, 0.04);
const DARK = rgb(0.05, 0.08, 0.06);
const WHITE = rgb(1, 1, 1);
const MUTED = rgb(0.35, 0.40, 0.37);
const LIGHT = rgb(0.94, 0.95, 0.93);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 42;
const CONTENT_W = PAGE_W - MARGIN * 2;

function text(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color = DARK
) {
  page.drawText(String(value || '-'), {
    x,
    y,
    size,
    font,
    color,
  });
}

function wrapText(
  value: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = String(value || '-').split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;

    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : ['-'];
}

function paragraph(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  size = 9,
  lineHeight = 13
): number {
  const lines = wrapText(value, font, size, width);

  for (const line of lines) {
    text(page, line, x, y, size, font);
    y -= lineHeight;
  }

  return y;
}

function header(
  page: PDFPage,
  pageNumber: number,
  bold: PDFFont,
  regular: PDFFont
) {
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 76,
    width: PAGE_W,
    height: 76,
    color: GREEN,
  });

  text(
    page,
    'SSB BHAYANGKARA JUNIOR 2018',
    MARGIN,
    PAGE_H - 35,
    15,
    bold,
    WHITE
  );

  text(
    page,
    'FORMULIR PENDAFTARAN PESERTA DIDIK',
    MARGIN,
    PAGE_H - 55,
    8,
    regular,
    rgb(0.88, 0.92, 0.88)
  );

  text(
    page,
    `Halaman ${pageNumber}`,
    PAGE_W - MARGIN - 55,
    PAGE_H - 45,
    8,
    regular,
    WHITE
  );
}

function title(
  page: PDFPage,
  value: string,
  y: number,
  bold: PDFFont
) {
  page.drawRectangle({
    x: MARGIN,
    y: y - 7,
    width: 5,
    height: 24,
    color: GOLD,
  });

  text(page, value, MARGIN + 14, y, 15, bold, GREEN);
  return y - 30;
}

function field(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  bold: PDFFont,
  regular: PDFFont
) {
  text(page, label, x, y, 8, bold, GREEN);
  y -= 13;

  const lines = wrapText(value || '-', regular, 9, width);

  for (const line of lines.slice(0, 3)) {
    text(page, line, x, y, 9, regular);
    page.drawLine({
      start: { x, y: y - 3 },
      end: { x: x + width, y: y - 3 },
      thickness: 0.5,
      color: rgb(0.78, 0.80, 0.77),
    });
    y -= 17;
  }

  return y;
}

function sectionBox(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  bold: PDFFont,
  regular: PDFFont
) {
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: LIGHT,
    borderColor: rgb(0.78, 0.80, 0.77),
    borderWidth: 0.7,
  });

  text(page, label, x + 10, y - 17, 10, bold, GREEN);

  return y - 34;
}

function ruleList(
  page: PDFPage,
  rules: string[],
  x: number,
  y: number,
  width: number,
  regular: PDFFont,
  bold: PDFFont
) {
  for (let i = 0; i < rules.length; i++) {
    const lines = wrapText(
      `${i + 1}. ${rules[i]}`,
      regular,
      8.5,
      width - 8
    );

    for (let j = 0; j < lines.length; j++) {
      text(
        page,
        lines[j],
        x + (j === 0 ? 0 : 10),
        y,
        8.5,
        regular
      );
      y -= 12;
    }

    y -= 3;

    if (y < 65) {
      page.drawLine({
        start: { x, y: 50 },
        end: { x: x + width, y: 50 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
      text(page, 'Bersambung', x, 35, 7, bold, MUTED);
      return y;
    }
  }

  return y;
}

function fileExtension(file: File): string {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (type === 'image/png' || name.endsWith('.png')) return 'png';
  if (
    type === 'image/jpeg' ||
    type === 'image/jpg' ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg')
  ) {
    return 'jpg';
  }

  return '';
}

async function appendImage(
  pdf: PDFDocument,
  file: File,
  bold: PDFFont,
  regular: PDFFont,
  label: string
) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = fileExtension(file);

  let image;

  if (ext === 'jpg') {
    image = await pdf.embedJpg(bytes);
  } else if (ext === 'png') {
    image = await pdf.embedPng(bytes);
  } else {
    throw new Error(
      `Format file "${file.name}" tidak didukung. Gunakan JPG, PNG, atau PDF.`
    );
  }

  const page = pdf.addPage([PAGE_W, PAGE_H]);

  page.drawRectangle({
    x: 0,
    y: PAGE_H - 78,
    width: PAGE_W,
    height: 78,
    color: GREEN,
  });

  text(
    page,
    'LAMPIRAN DOKUMEN',
    MARGIN,
    PAGE_H - 30,
    17,
    bold,
    WHITE
  );

  text(
    page,
    label,
    MARGIN,
    PAGE_H - 52,
    10,
    regular,
    rgb(0.9, 0.93, 0.9)
  );

  text(
    page,
    file.name,
    MARGIN,
    PAGE_H - 69,
    7.5,
    regular,
    rgb(0.85, 0.88, 0.85)
  );

  const maxW = PAGE_W - 70;
  const maxH = PAGE_H - 115;
  const scale = Math.min(
    maxW / image.width,
    maxH / image.height
  );

  const w = image.width * scale;
  const h = image.height * scale;

  page.drawImage(image, {
    x: (PAGE_W - w) / 2,
    y: Math.max(35, (PAGE_H - h) / 2 - 20),
    width: w,
    height: h,
  });
}

async function appendPdf(
  pdf: PDFDocument,
  file: File
) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const source = await PDFDocument.load(bytes);
  const pages = await pdf.copyPages(
    source,
    source.getPageIndices()
  );

  for (const copiedPage of pages) {
    pdf.addPage(copiedPage);
  }
}

async function appendAttachment(
  pdf: PDFDocument,
  file: File | null,
  label: string,
  bold: PDFFont,
  regular: PDFFont
) {
  if (!file || file.size === 0) return;

  const ext = fileExtension(file);

  if (ext === 'pdf') {
    await appendPdf(pdf, file);
    return;
  }

  await appendImage(
    pdf,
    file,
    bold,
    regular,
    label
  );
}

export async function generateFormPdf(
  formData: FormData,
  locals: App.Locals
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const finance = await getFinanceConfig(locals);

  const regular = await pdf.embedFont(
    StandardFonts.Helvetica
  );
  const bold = await pdf.embedFont(
    StandardFonts.HelveticaBold
  );

  const get = (name: string) =>
    String(formData.get(name) || '').trim();

  const nama = get('nama_siswa');
  const nomor = get('nomor_pendaftaran') || 'Belum tersedia';

  // ==========================================================
  // HALAMAN 1 - DATA SISWA
  // ==========================================================
  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    header(page, 1, bold, regular);

    let y = PAGE_H - 110;

    y = title(
      page,
      'FORMULIR PENDAFTARAN',
      y,
      bold
    );

    text(
      page,
      'SEKOLAH SEPAK BOLA (SSB) BHAYANGKARA JUNIOR 2018',
      MARGIN,
      y,
      10,
      bold,
      DARK
    );

    y -= 28;

    page.drawRectangle({
      x: MARGIN,
      y: y - 52,
      width: CONTENT_W,
      height: 52,
      color: GREEN,
    });

    text(
      page,
      'NOMOR PENDAFTARAN',
      MARGIN + 14,
      y - 20,
      8,
      regular,
      rgb(0.8, 0.86, 0.82)
    );

    text(
      page,
      nomor,
      MARGIN + 14,
      y - 40,
      13,
      bold,
      WHITE
    );

    y -= 75;

    y = title(page, '01  DATA SISWA', y, bold);

    y = field(
      page,
      'Nama Lengkap Siswa',
      nama,
      MARGIN,
      y,
      CONTENT_W,
      bold,
      regular
    );

    y -= 4;

    const col = (CONTENT_W - 20) / 2;

    field(
      page,
      'Tempat Lahir',
      get('tempat_lahir'),
      MARGIN,
      y,
      col,
      bold,
      regular
    );

    field(
      page,
      'Tanggal Lahir',
      get('tanggal_lahir'),
      MARGIN + col + 20,
      y,
      col,
      bold,
      regular
    );

    y -= 50;

    y = field(
      page,
      'NISN',
      get('nisn'),
      MARGIN,
      y,
      col,
      bold,
      regular
    );

    y -= 3;

    y = field(
      page,
      'Alamat Rumah',
      get('alamat'),
      MARGIN,
      y,
      CONTENT_W,
      bold,
      regular
    );

    y -= 8;

    y = title(
      page,
      'BIAYA PENDAFTARAN',
      y,
      bold
    );

    const rupiah = (value: number) =>
      `Rp${Number(value || 0).toLocaleString('id-ID')}`;
    const biaya = [
      `Administrasi pendaftaran: ${rupiah(finance.administration)}`,
      `Jersey + kaos kaki: ${rupiah(finance.jersey)}`,
      `SPP awal: ${rupiah(finance.initialTuition)}`,
      `Total biaya awal: ${rupiah(finance.administration + finance.jersey + finance.initialTuition)}`,
      `SPP bulanan: ${rupiah(finance.monthlyTuition)}, dibayarkan sebelum tanggal ${finance.dueDay} setiap bulan`,
      'Pembayaran dilakukan secara manual kepada Admin sesuai informasi resmi manajemen SSB',
    ];

    y = ruleList(
      page,
      biaya,
      MARGIN,
      y,
      CONTENT_W,
      regular,
      bold
    );

    text(
      page,
      'Catatan: rincian biaya di atas mengikuti konfigurasi Finance Desk yang berlaku saat PDF dibuat.',
      MARGIN,
      55,
      7.5,
      regular,
      MUTED
    );
  }

  // ==========================================================
  // HALAMAN 2 - ORANG TUA + PROFIL + KESEHATAN
  // ==========================================================
  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    header(page, 2, bold, regular);

    let y = PAGE_H - 110;

    y = title(
      page,
      '02  DATA ORANG TUA / WALI',
      y,
      bold
    );

    const col = (CONTENT_W - 20) / 2;

    field(
      page,
      'Nama Ayah',
      get('nama_ayah'),
      MARGIN,
      y,
      col,
      bold,
      regular
    );

    field(
      page,
      'Nomor HP Ayah',
      get('hp_ayah'),
      MARGIN + col + 20,
      y,
      col,
      bold,
      regular
    );

    y -= 50;

    field(
      page,
      'Pekerjaan Ayah',
      get('pekerjaan_ayah'),
      MARGIN,
      y,
      col,
      bold,
      regular
    );

    field(
      page,
      'Nama Ibu',
      get('nama_ibu'),
      MARGIN + col + 20,
      y,
      col,
      bold,
      regular
    );

    y -= 50;

    field(
      page,
      'Nomor HP Ibu',
      get('hp_ibu'),
      MARGIN,
      y,
      col,
      bold,
      regular
    );

    field(
      page,
      'Pekerjaan Ibu',
      get('pekerjaan_ibu'),
      MARGIN + col + 20,
      y,
      col,
      bold,
      regular
    );

    y -= 50;

    y = title(
      page,
      '03  PROFIL SEPAK BOLA',
      y,
      bold
    );

    field(
      page,
      'Posisi Bermain',
      get('posisi'),
      MARGIN,
      y,
      col,
      bold,
      regular
    );

    field(
      page,
      'Riwayat SSB Sebelumnya',
      get('ssb_sebelumnya'),
      MARGIN + col + 20,
      y,
      col,
      bold,
      regular
    );

    y -= 50;

    y = field(
      page,
      'Prestasi',
      get('prestasi'),
      MARGIN,
      y,
      CONTENT_W,
      bold,
      regular
    );

    y -= 4;

    field(
      page,
      'Tinggi Badan (cm)',
      get('tinggi'),
      MARGIN,
      y,
      col,
      bold,
      regular
    );

    field(
      page,
      'Berat Badan (kg)',
      get('berat'),
      MARGIN + col + 20,
      y,
      col,
      bold,
      regular
    );

    y -= 50;

    field(
      page,
      'Golongan Darah',
      get('golongan_darah'),
      MARGIN,
      y,
      col,
      bold,
      regular
    );

    field(
      page,
      'Riwayat Penyakit / Alergi',
      get('penyakit_alergi'),
      MARGIN + col + 20,
      y,
      col,
      bold,
      regular
    );

    y -= 50;

    field(
      page,
      'Riwayat Cedera',
      get('riwayat_cedera'),
      MARGIN,
      y,
      CONTENT_W,
      bold,
      regular
    );

    text(
      page,
      'Mohon seluruh data diisi dengan lengkap dan jelas untuk kepentingan administrasi dan pembinaan peserta didik.',
      MARGIN,
      55,
      7.5,
      regular,
      MUTED
    );
  }

  // ==========================================================
  // HALAMAN 3 - TATA TERTIB SISWA
  // ==========================================================
  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    header(page, 3, bold, regular);

    let y = PAGE_H - 110;

    y = title(page, '04  TATA TERTIB SISWA', y, bold);

    const rules = [
      'Para siswa wajib menjaga nama baik SSB, baik di dalam maupun di luar lapangan.',
      'Para siswa wajib mengikuti semua pelatihan dan belajar dengan sungguh-sungguh di bawah asuhan pelatih dan asisten pelatih.',
      'Para siswa tidak diperkenankan merokok, meminum minuman keras atau NARKOBA, membawa senjata tajam, serta tidak terlibat perkelahian di dalam maupun di luar lingkungan SSB.',
      'Para siswa dianjurkan berpakaian sopan dan rapi.',
      'Para siswa harus belajar dengan sungguh-sungguh agar sukses dalam sekolah dan sukses dalam peningkatan prestasi olahraga sepak bola.',
      'Para siswa SSB Bhayangkara Junior 2018 tidak diperbolehkan berlatih, bermain dan bertanding sepak bola atas nama tim lain, atau di tempat lain di luar lingkungan SSB Bhayangkara Junior 2018 tanpa izin dan sepengetahuan pelatih dan manajemen SSB.',
      'Manajemen berikut jajarannya akan melakukan evaluasi setiap enam bulan kepada semua siswa peserta didik.',
      'Para siswa wajib mengikuti dengan sungguh-sungguh ketentuan-ketentuan serta petunjuk-petunjuk para pelatih.',
      'Para siswa wajib membantu menyiapkan peralatan latihan dan mengembalikan ke tempat penyimpanan semula dengan baik.',
      'Para siswa wajib memelihara dan menjaga semua perlengkapan serta peralatan agar tahan lama dan awet.',
      'Apabila ada keperluan atau sakit sehingga tidak bisa mengikuti pelatihan, maka sebaiknya memberi kabar kepada pihak pelatih yang bersangkutan.',
      'Bila merasa tidak enak badan atau sakit pada saat di lapangan, segera melapor kepada pengurus atau pelatih.',
      'Para siswa wajib mematuhi tata tertib dengan penuh rasa tanggung jawab.',
    ];

    ruleList(
      page,
      rules,
      MARGIN,
      y,
      CONTENT_W,
      regular,
      bold
    );
  }

  // ==========================================================
  // HALAMAN 4 - TATA TERTIB ORANG TUA + SANKSI
  // ==========================================================
  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    header(page, 4, bold, regular);

    let y = PAGE_H - 110;

    y = title(
      page,
      '05  TATA TERTIB ORANG TUA / WALI',
      y,
      bold
    );

    const rules = [
      'Orang tua siswa tidak diperkenankan untuk mengatur pelatih dalam mengambil keputusan di dalam lapangan.',
      'Orang tua siswa pada saat melakukan latihan maupun bertanding diminta untuk menjaga jarak dari lapangan.',
      'Orang tua siswa tidak boleh memberi instruksi kepada anak pada saat bertanding.',
      'Orang tua siswa wajib memberikan kepercayaan kepada pelatih untuk mengembangkan potensi siswa.',
      'Orang tua siswa diperkenankan untuk memberikan motivasi dan tidak boleh menyalahkan anak tersebut pada saat latihan maupun pada saat pertandingan.',
      'Orang tua siswa diperbolehkan bertukar pikiran dengan pelatih atas tumbuh kembangnya anak.',
      'Orang tua siswa dipersilakan mencari sponsor di kuota masing-masing dan terkait pemberian benefit untuk sponsor wajib dikoordinasikan dengan manajemen SSB Bhayangkara Junior 2018.',
      'Orang tua siswa diwajibkan membayar biaya iuran bulanan.',
      'Orang tua siswa diwajibkan membayarkan biaya-biaya yang berhubungan dengan pertandingan yang telah disepakati bersama.',
      'Orang tua siswa adalah pendukung, penggemar utama, mitra pelatih di dalam SSB Bhayangkara Junior 2018.',
      'Bagi orang tua siswa yang hendak mengundurkan diri karena mendapat tawaran atau ajakan dari SSB atau akademi lain, harus meminta izin tertulis kepada SSB Bhayangkara Junior 2018 dan menyepakati kompensasi tertentu atas jerih payah SSB Bhayangkara Junior 2018.',
    ];

    y = ruleList(
      page,
      rules,
      MARGIN,
      y,
      CONTENT_W,
      regular,
      bold
    );

    y -= 15;

    y = title(page, 'SANKSI', y, bold);

    paragraph(
      page,
      'Apabila ada siswa SSB Bhayangkara Junior 2018 yang mengabaikan tata tertib ini, akan diberi peringatan secara lisan maupun tulisan, dan kalau dipandang perlu ada sanksi-sanksi yang lain akan diputuskan oleh Dewan Pengurus SSB Bhayangkara Junior 2018.',
      MARGIN,
      y,
      CONTENT_W,
      regular,
      9,
      14
    );
  }

  // ==========================================================
  // HALAMAN 5 - PERSETUJUAN
  // ==========================================================
  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    header(page, 5, bold, regular);

    let y = PAGE_H - 110;

    y = title(
      page,
      '06  PERSETUJUAN ORANG TUA / WALI',
      y,
      bold
    );

    page.drawRectangle({
      x: MARGIN,
      y: y - 115,
      width: CONTENT_W,
      height: 115,
      color: LIGHT,
      borderColor: GOLD,
      borderWidth: 1.2,
    });

    let py = y - 28;

    py = paragraph(
      page,
      'Dengan mengisi dan mengirimkan formulir ini, orang tua/wali menyatakan telah membaca, memahami, dan menyetujui tata tertib siswa dan orang tua/wali yang tercantum dalam formulir pendaftaran SSB Bhayangkara Junior 2018.',
      MARGIN + 18,
      py,
      CONTENT_W - 36,
      regular,
      10,
      15
    );

    py -= 10;

    paragraph(
      page,
      `Nama Siswa: ${nama || '-'}`,
      MARGIN + 18,
      py,
      CONTENT_W - 36,
      bold,
      9,
      13
    );

    y -= 155;

    const wali = get('nama_wali');

    text(
      page,
      'Nama Orang Tua / Wali',
      MARGIN,
      y,
      9,
      bold,
      GREEN
    );

    text(
      page,
      wali || '-',
      MARGIN,
      y - 20,
      10,
      regular
    );

    page.drawLine({
      start: { x: MARGIN, y: y - 24 },
      end: { x: MARGIN + 220, y: y - 24 },
      thickness: 0.7,
      color: MUTED,
    });

    y -= 80;

    text(
      page,
      'Pernyataan ini dibuat secara sadar dan tanpa paksaan untuk kepentingan administrasi serta pembinaan peserta didik.',
      MARGIN,
      y,
      8.5,
      regular,
      MUTED
    );

    y -= 55;

    text(
      page,
      'Orang Tua / Wali',
      MARGIN,
      y,
      9,
      bold
    );

    text(
      page,
      'Peserta Didik',
      PAGE_W / 2 + 20,
      y,
      9,
      bold
    );

    text(
      page,
      '________________________',
      MARGIN,
      y - 65,
      9,
      regular
    );

    text(
      page,
      '________________________',
      PAGE_W / 2 + 20,
      y - 65,
      9,
      regular
    );

    text(
      page,
      wali || 'Nama Orang Tua / Wali',
      MARGIN,
      y - 82,
      8,
      regular
    );

    text(
      page,
      nama || 'Nama Siswa',
      PAGE_W / 2 + 20,
      y - 82,
      8,
      regular
    );

    text(
      page,
      'Dokumen dibuat secara digital dari data pendaftaran online.',
      MARGIN,
      55,
      7.5,
      regular,
      MUTED
    );
  }

  // ==========================================================
  // LAMPIRAN
  // ==========================================================
  const attachments: Array<[
    string,
    string
  ]> = [
    ['pas_foto', 'Pas Foto 3x4 - 1 lembar online'],
    ['akta', 'Akta Kelahiran'],
    ['kk', 'Kartu Keluarga'],
    ['rapor', 'Rapor Bagian Depan'],
  ];

  for (const [name, label] of attachments) {
    const value = formData.get(name);

    if (value instanceof File) {
      await appendAttachment(
        pdf,
        value,
        label,
        bold,
        regular
      );
    }
  }

  return await pdf.save();
}
