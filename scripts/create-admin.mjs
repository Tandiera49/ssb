import crypto from 'node:crypto';

const username = String(process.argv[2] || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || String(process.argv[3] || '');
if (!username || !password) {
  console.error('Pemakaian: ADMIN_PASSWORD="PasswordKuatMinimal8" npm run admin:create -- nama_admin');
  process.exit(1);
}
if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new Error('Username hanya boleh 3-40 karakter.');
if (password.length < 8) throw new Error('Password minimal 8 karakter.');
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
const passwordHash = `pbkdf2$120000$${salt}$${hash}`;
const id = crypto.randomUUID();
const esc = (value) => `'${String(value).replaceAll("'", "''")}'`;
console.log(`INSERT INTO users (id, username, name, role, password_hash, active, player_id, created_at) VALUES (${esc(id)}, ${esc(username)}, ${esc('Administrator')}, 'admin', ${esc(passwordHash)}, 1, NULL, ${esc(new Date().toISOString())});`);
console.error('SQL di atas siap dijalankan dengan: npx wrangler d1 execute ssb-db --remote --command "..."');
