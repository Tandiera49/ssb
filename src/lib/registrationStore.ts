import { getDB, getUploads } from './db';

const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
const SAFE_NUMBER = /^[A-Z0-9-]{6,40}$/i;
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const TEXT_FIELDS = ['nama_siswa','tempat_lahir','tanggal_lahir','nisn','alamat','nama_ayah','hp_ayah','pekerjaan_ayah','nama_ibu','hp_ibu','pekerjaan_ibu','posisi','ssb_sebelumnya','prestasi','tinggi','berat','golongan_darah','penyakit_alergi','riwayat_cedera','persetujuan','nama_wali'];
const FILE_FIELDS = ['pas_foto', 'akta', 'kk', 'rapor'] as const;
type RegistrationRow = Record<string, any> & { files_json?: string | null };
const cleanName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');
const extensionOf = (name: string) => { const match = cleanName(name).match(/\.[a-zA-Z0-9]+$/); return (match?.[0] || '.bin').toLowerCase(); };
const keyFor = (nomor: string, name: string) => `pendaftaran/${nomor}/${name}`;

function toRegistration(row: RegistrationRow) {
  let files: any = {};
  try { files = row.files_json ? JSON.parse(row.files_json) : {}; } catch { files = {}; }
  const { files_json, ...data } = row;
  return { ...data, files };
}

export async function saveRegistration(locals: App.Locals, nomor: string, formData: FormData) {
  if (!SAFE_NUMBER.test(nomor)) throw new Error('Nomor pendaftaran tidak valid.');
  const db = getDB(locals); const bucket = getUploads(locals); const now = new Date().toISOString();
  const data: Record<string, string> = {};
  for (const key of TEXT_FIELDS) data[key] = String(formData.get(key) || '').trim();
  const playerId = nomor;
  const uploadedFiles: Record<string, any> = {};
  for (const field of FILE_FIELDS) {
    const value = formData.get(field);
    if (!(value instanceof File) || value.size === 0) continue;
    if (value.size > MAX_DOCUMENT_SIZE) throw new Error('Ukuran setiap dokumen maksimal 5 MB.');
    const originalName = value.name || `${field}.bin`; const ext = extensionOf(originalName);
    if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error('Format dokumen harus JPG, PNG, WEBP, atau PDF.');
    const storedName = `${field}${ext}`; const key = keyFor(nomor, storedName);
    await bucket.put(key, await value.arrayBuffer(), { httpMetadata: { contentType: value.type || 'application/octet-stream' } });
    uploadedFiles[field] = { original_name: cleanName(originalName), stored_name: storedName, key, size: value.size, type: value.type || 'application/octet-stream' };
  }
  const columns = ['id','registration_number','player_id', ...TEXT_FIELDS, 'tanggal_pendaftaran','status','files_json'];
  const values = [crypto.randomUUID(), nomor, playerId, ...TEXT_FIELDS.map((field) => data[field] || null), now, 'baru', JSON.stringify(uploadedFiles)];
  await db.prepare(`INSERT INTO players (id, registration_number, name, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(registration_number) DO NOTHING`).bind(playerId, nomor, data.nama_siswa, now).run();
  await db.prepare(`INSERT INTO registrations (${columns.join(', ')}) VALUES (${columns.map((_, i) => `?${i + 1}`).join(', ')})`).bind(...values).run();
  return { nomor_pendaftaran: nomor, files: uploadedFiles };
}

export async function getRegistration(locals: App.Locals, nomor: string) {
  if (!SAFE_NUMBER.test(nomor)) return null;
  const row = await getDB(locals).prepare('SELECT * FROM registrations WHERE registration_number = ?1 LIMIT 1').bind(nomor).first<RegistrationRow>();
  return row ? toRegistration(row) : null;
}

export async function listRegistrations(locals: App.Locals) {
  const rows = await getDB(locals).prepare('SELECT * FROM registrations ORDER BY tanggal_pendaftaran DESC').all<RegistrationRow>();
  return (rows.results || []).map(toRegistration);
}

export async function updateRegistrationStatus(locals: App.Locals, nomor: string, status: string) {
  if (!SAFE_NUMBER.test(nomor)) throw new Error('Nomor pendaftaran tidak valid.');
  if (!['baru','diproses','diterima','ditolak'].includes(status)) throw new Error('Status tidak valid.');
  const result = await getDB(locals).prepare('UPDATE registrations SET status = ?1 WHERE registration_number = ?2').bind(status, nomor).run();
  const current = await getRegistration(locals, nomor);
  if (!current || !result) throw new Error('Data pendaftaran tidak ditemukan.');
  return current;
}

export async function getRegistrationFile(locals: App.Locals, nomor: string, fileInfo: any) {
  if (!fileInfo?.key || !SAFE_NUMBER.test(nomor)) return null;
  return getUploads(locals).get(fileInfo.key);
}
