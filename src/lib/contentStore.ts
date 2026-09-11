import { promises as fs } from 'node:fs';
import path from 'node:path';

const FILE = path.join(
  process.cwd(),
  'storage',
  'content',
  'content.json'
);

const DEFAULT_CONTENT = {
  hero: {
    title: 'SSB BHAYANGKARA JUNIOR 2018',
    subtitle: 'Membentuk Talenta. Membangun Karakter.',
    buttonText: 'Daftar Sekarang',
    buttonLink: '/pendaftaran',
  },

  vision: {
    title: 'Visi',
    text: 'Membentuk generasi muda yang berprestasi, berkarakter, disiplin, dan menjunjung tinggi sportivitas melalui sepak bola.',
  },

  mission: {
    title: 'Misi',
    items: [
      'Mengembangkan kemampuan teknik dan fisik pemain.',
      'Membangun karakter, disiplin, dan kerja sama.',
      'Memberikan pengalaman kompetisi yang positif.',
      'Mendorong pemain berkembang sesuai potensinya.',
    ],
  },

  contact: {
    whatsapp: '',
    instagram: '',
    address: '',
  },

  schedule: [],
  tournaments: [],
  gallery: [],
  announcements: [],
};

async function ensureFile() {
  await fs.mkdir(
    path.dirname(FILE),
    { recursive: true }
  );

  try {
    await fs.access(FILE);
  } catch {
    await fs.writeFile(
      FILE,
      JSON.stringify(DEFAULT_CONTENT, null, 2),
      'utf8'
    );
  }
}

export async function getContent() {
  await ensureFile();

  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      ...DEFAULT_CONTENT,
      ...parsed,
      hero: {
        ...DEFAULT_CONTENT.hero,
        ...(parsed.hero || {}),
      },
      vision: {
        ...DEFAULT_CONTENT.vision,
        ...(parsed.vision || {}),
      },
      mission: {
        ...DEFAULT_CONTENT.mission,
        ...(parsed.mission || {}),
      },
      contact: {
        ...DEFAULT_CONTENT.contact,
        ...(parsed.contact || {}),
      },
    };
  } catch {
    return DEFAULT_CONTENT;
  }
}

export async function saveContent(content: any) {
  await fs.mkdir(
    path.dirname(FILE),
    { recursive: true }
  );

  await fs.writeFile(
    FILE,
    JSON.stringify(content, null, 2),
    'utf8'
  );

  return content;
}
