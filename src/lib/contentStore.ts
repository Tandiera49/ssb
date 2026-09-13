import { getDB } from './db';

export const DEFAULT_CONTENT = {
  hero: { title: 'SSB BHAYANGKARA JUNIOR 2018', subtitle: 'Membentuk Talenta. Membangun Karakter.', buttonText: 'Daftar Sekarang', buttonLink: '/pendaftaran' },
  vision: { title: 'Visi', text: 'Membentuk generasi muda yang berprestasi, berkarakter, disiplin, dan menjunjung tinggi sportivitas melalui sepak bola.' },
  mission: { title: 'Misi', items: ['Mengembangkan kemampuan teknik dan fisik pemain.', 'Membangun karakter, disiplin, dan kerja sama.', 'Memberikan pengalaman kompetisi yang positif.', 'Mendorong pemain berkembang sesuai potensinya.'] },
  contact: { whatsapp: '', instagram: '', address: '' },
  schedule: [], tournaments: [], gallery: [], announcements: [],
};

function mergeContent(parsed: any) {
  return {
    ...DEFAULT_CONTENT, ...parsed,
    hero: { ...DEFAULT_CONTENT.hero, ...(parsed?.hero || {}) },
    vision: { ...DEFAULT_CONTENT.vision, ...(parsed?.vision || {}) },
    mission: { ...DEFAULT_CONTENT.mission, ...(parsed?.mission || {}) },
    contact: { ...DEFAULT_CONTENT.contact, ...(parsed?.contact || {}) },
  };
}

export async function getContent(locals: App.Locals) {
  const row = await getDB(locals).prepare('SELECT data_json FROM site_content WHERE id = 1').first<{ data_json: string }>();
  if (!row?.data_json) return DEFAULT_CONTENT;
  try { return mergeContent(JSON.parse(row.data_json)); } catch { return DEFAULT_CONTENT; }
}

export async function saveContent(locals: App.Locals, content: any) {
  const merged = mergeContent(content);
  await getDB(locals).prepare(`INSERT INTO site_content (id, data_json, updated_at) VALUES (1, ?1, ?2) ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`).bind(JSON.stringify(merged), new Date().toISOString()).run();
  return merged;
}
