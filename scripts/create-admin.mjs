import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const username = String(process.argv[2] || '').trim().toLowerCase();
const password = String(process.argv[3] || '');

if (!username || !password) {
  console.error('Pemakaian: npm run admin:create -- nama_admin password_kuat');
  process.exit(1);
}

if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
  console.error('Username hanya boleh 3-40 karakter: huruf kecil, angka, titik, garis bawah, atau tanda minus.');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Password minimal 8 karakter.');
  process.exit(1);
}

const root = path.join(process.cwd(), 'storage', 'auth');
const usersFile = path.join(root, 'users.json');
const sessionsFile = path.join(root, 'sessions.json');
await fs.mkdir(root, { recursive: true });

async function readArray(file) {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hashPassword(value) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(value, salt, 120000, 64, 'sha512').toString('hex');
  return `pbkdf2$120000$${salt}$${hash}`;
}

const users = await readArray(usersFile);
if (users.some((user) => user.username === username)) {
  console.error(`Username ${username} sudah digunakan.`);
  process.exit(1);
}

const user = {
  id: crypto.randomUUID(),
  username,
  name: 'Administrator',
  role: 'admin',
  passwordHash: hashPassword(password),
  active: true,
};
users.push(user);
await fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8');
await fs.writeFile(sessionsFile, JSON.stringify(await readArray(sessionsFile), null, 2), 'utf8');
console.log(`Admin ${username} berhasil dibuat.`);
console.log('Login melalui /login. Jangan menyimpan password di riwayat shell production.');
