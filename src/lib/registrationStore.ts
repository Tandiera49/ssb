import { promises as fs } from 'node:fs';
import path from 'node:path';

const STORAGE_ROOT = path.join(
  process.cwd(),
  'storage',
  'pendaftaran'
);

const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
const SAFE_NUMBER = /^[A-Z0-9-]{6,40}$/i;
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.pdf',
]);

const cleanName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_');

export async function saveRegistration(
  nomor: string,
  formData: FormData
) {
  if (!SAFE_NUMBER.test(nomor)) {
    throw new Error('Nomor pendaftaran tidak valid.');
  }

  const folder = path.join(STORAGE_ROOT, nomor);

  await fs.mkdir(folder, { recursive: true });

  const data: Record<string, string> = {};

  const textFields = [
    'nama_siswa',
    'tempat_lahir',
    'tanggal_lahir',
    'nisn',
    'alamat',
    'nama_ayah',
    'hp_ayah',
    'pekerjaan_ayah',
    'nama_ibu',
    'hp_ibu',
    'pekerjaan_ibu',
    'posisi',
    'ssb_sebelumnya',
    'prestasi',
    'tinggi',
    'berat',
    'golongan_darah',
    'penyakit_alergi',
    'riwayat_cedera',
    'persetujuan',
    'nama_wali',
  ];

  for (const key of textFields) {
    data[key] = String(formData.get(key) || '').trim();
  }

  data.nomor_pendaftaran = nomor;
  data.tanggal_pendaftaran = new Date().toISOString();
  data.status = 'baru';

  const files = [
    ['pas_foto', 'pas_foto'],
    ['akta', 'akta'],
    ['kk', 'kk'],
    ['rapor', 'rapor'],
  ] as const;

  const uploadedFiles: Record<string, object> = {};

  for (const [fieldName, folderName] of files) {
    const value = formData.get(fieldName);

    if (!(value instanceof File) || value.size === 0) {
      continue;
    }

    if (value.size > MAX_DOCUMENT_SIZE) {
      throw new Error('Ukuran setiap dokumen maksimal 5 MB.');
    }

    const originalName = value.name || `${folderName}.bin`;
    const safeName = cleanName(originalName);

    const extension =
      path.extname(safeName) || '.bin';

    if (!ALLOWED_EXTENSIONS.has(extension.toLowerCase())) {
      throw new Error('Format dokumen harus JPG, PNG, WEBP, atau PDF.');
    }

    const finalName =
      `${folderName}${extension.toLowerCase()}`;

    const filePath = path.join(folder, finalName);

    const bytes = new Uint8Array(
      await value.arrayBuffer()
    );

    await fs.writeFile(filePath, bytes);

    uploadedFiles[fieldName] = {
      original_name: originalName,
      stored_name: finalName,
      size: value.size,
      type: value.type || 'application/octet-stream',
    };
  }

  data.files = JSON.stringify(uploadedFiles);

  await fs.writeFile(
    path.join(folder, 'data.json'),
    JSON.stringify(data, null, 2),
    'utf8'
  );

  return {
    nomor_pendaftaran: nomor,
    folder,
    files: uploadedFiles,
  };
}

export async function getRegistration(
  nomor: string
) {
  if (!SAFE_NUMBER.test(nomor)) return null;
  const file = path.join(
    STORAGE_ROOT,
    nomor,
    'data.json'
  );

  try {
    const content = await fs.readFile(
      file,
      'utf8'
    );

    return JSON.parse(content);
  } catch {
    return null;
  }
}


export async function listRegistrations() {
  const rootDir = path.join(process.cwd(), 'storage', 'pendaftaran');
  let entries: string[] = [];

  try {
    entries = await fs.readdir(rootDir);
  } catch {
    return [];
  }

  const result = [];

  for (const nomor of entries.sort().reverse()) {
    try {
      const data = await getRegistration(nomor);
      if (data) result.push(data);
    } catch {
      // Lewati data yang rusak.
    }
  }

  return result;
}


export async function updateRegistrationStatus(
  nomor: string,
  status: string
) {
  if (!SAFE_NUMBER.test(nomor)) {
    throw new Error('Nomor pendaftaran tidak valid.');
  }
  const allowed = [
    'baru',
    'diproses',
    'diterima',
    'ditolak',
  ];

  if (!allowed.includes(status)) {
    throw new Error('Status tidak valid.');
  }

  const current = await getRegistration(nomor);

  if (!current) {
    throw new Error('Data pendaftaran tidak ditemukan.');
  }

  current.status = status;

  await fs.writeFile(
    path.join(STORAGE_ROOT, nomor, 'data.json'),
    JSON.stringify(current, null, 2),
    'utf8'
  );

  return current;
}
