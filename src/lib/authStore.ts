import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const AUTH_ROOT = path.join(process.cwd(), 'storage', 'auth');
const USERS_FILE = path.join(AUTH_ROOT, 'users.json');
const SESSIONS_FILE = path.join(AUTH_ROOT, 'sessions.json');

export type UserRole =
  | 'admin'
  | 'pelatih'
  | 'orang_tua'
  | 'siswa';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  active: boolean;
  playerId?: string;
}

interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}

async function ensureAuthFiles() {
  await fs.mkdir(AUTH_ROOT, { recursive: true });

  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(
      USERS_FILE,
      JSON.stringify([], null, 2),
      'utf8'
    );
  }

  try {
    await fs.access(SESSIONS_FILE);
  } catch {
    await fs.writeFile(
      SESSIONS_FILE,
      JSON.stringify([], null, 2),
      'utf8'
    );
  }
}

async function readUsers(): Promise<AuthUser[]> {
  await ensureAuthFiles();

  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeUsers(users: AuthUser[]) {
  await ensureAuthFiles();

  await fs.writeFile(
    USERS_FILE,
    JSON.stringify(users, null, 2),
    'utf8'
  );
}

async function readSessions(): Promise<Session[]> {
  await ensureAuthFiles();

  try {
    const raw = await fs.readFile(SESSIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeSessions(sessions: Session[]) {
  await ensureAuthFiles();

  await fs.writeFile(
    SESSIONS_FILE,
    JSON.stringify(sessions, null, 2),
    'utf8'
  );
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');

  const hash = crypto
    .pbkdf2Sync(
      password,
      salt,
      120000,
      64,
      'sha512'
    )
    .toString('hex');

  return `pbkdf2$120000$${salt}$${hash}`;
}

export function verifyPassword(
  password: string,
  stored: string
) {
  const parts = stored.split('$');

  if (parts.length !== 4) return false;
  if (parts[0] !== 'pbkdf2') return false;

  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = parts[3];

  if (!iterations || !salt || !expected) {
    return false;
  }

  const actual = crypto
    .pbkdf2Sync(
      password,
      salt,
      iterations,
      64,
      'sha512'
    )
    .toString('hex');

  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expected, 'hex');

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

export async function createUser(
  username: string,
  name: string,
  role: UserRole,
  password: string,
  playerId?: string
) {
  const users = await readUsers();

  const normalized = username
    .trim()
    .toLowerCase();

  if (!normalized || !password) {
    throw new Error('Username dan password wajib diisi.');
  }

  if (users.some((u) => u.username === normalized)) {
    throw new Error('Username sudah digunakan.');
  }

  const user: AuthUser = {
    id: crypto.randomUUID(),
    username: normalized,
    name: name.trim(),
    role,
    passwordHash: hashPassword(password),
    active: true,
    ...(playerId ? { playerId } : {}),
  };

  users.push(user);
  await writeUsers(users);

  return sanitizeUser(user);
}

export async function ensureAdmin(
  username: string,
  password: string
) {
  const users = await readUsers();

  const existing = users.find(
    (u) =>
      u.username === username
  );

  if (existing) {
    return sanitizeUser(existing);
  }

  return createUser(
    username,
    'Administrator',
    'admin',
    password
  );
}

export async function authenticate(
  username: string,
  password: string
) {
  const users = await readUsers();

  const normalized = username
    .trim()
    .toLowerCase();

  const user = users.find(
    (u) =>
      u.username.trim().toLowerCase() === normalized &&
      u.active
  );

  if (!user) return null;

  if (!verifyPassword(
    password,
    user.passwordHash
  )) {
    return null;
  }

  return sanitizeUser(user);
}

function sanitizeUser(user: AuthUser) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active,
    ...(user.playerId ? { playerId: user.playerId } : {}),
  };
}

function generateTemporaryPassword(length = 12) {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

  const bytes = crypto.randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    password += alphabet[bytes[i] % alphabet.length];
  }

  return password;
}

export async function getUsersByPlayerId(playerId: string) {
  const users = await readUsers();
  return users
    .filter((user) => user.playerId === playerId)
    .map(sanitizeUser);
}

export async function createParticipantAccounts(
  playerId: string,
  studentName: string,
  parentName: string
) {
  const normalizedPlayerId = playerId.trim();

  if (!normalizedPlayerId) {
    throw new Error('Nomor pendaftaran wajib diisi.');
  }

  const users = await readUsers();

  const studentUsername =
    `${normalizedPlayerId}-S`.toLowerCase();

  const parentUsername =
    `${normalizedPlayerId}-OT`.toLowerCase();

  const existingStudent = users.find(
    (user) => user.username === studentUsername
  );

  const existingParent = users.find(
    (user) => user.username === parentUsername
  );

  if (existingStudent || existingParent) {
    if (
      existingStudent?.playerId === normalizedPlayerId &&
      existingParent?.playerId === normalizedPlayerId
    ) {
      return {
        created: false,
        alreadyExists: true,
        accounts: [
          sanitizeUser(existingStudent),
          sanitizeUser(existingParent),
        ],
      };
    }

    throw new Error(
      'Sebagian akun peserta sudah ada. Tidak ada akun baru yang dibuat.'
    );
  }

  const studentPassword = generateTemporaryPassword();
  const parentPassword = generateTemporaryPassword();

  const student: AuthUser = {
    id: crypto.randomUUID(),
    username: studentUsername,
    name: studentName.trim() || 'Siswa',
    role: 'siswa',
    passwordHash: hashPassword(studentPassword),
    active: true,
    playerId: normalizedPlayerId,
  };

  const parent: AuthUser = {
    id: crypto.randomUUID(),
    username: parentUsername,
    name: parentName.trim() || 'Orang Tua/Wali',
    role: 'orang_tua',
    passwordHash: hashPassword(parentPassword),
    active: true,
    playerId: normalizedPlayerId,
  };

  users.push(student, parent);
  await writeUsers(users);

  return {
    created: true,
    alreadyExists: false,
    accounts: [
      {
        ...sanitizeUser(student),
        temporaryPassword: studentPassword,
      },
      {
        ...sanitizeUser(parent),
        temporaryPassword: parentPassword,
      },
    ],
  };
}

export async function createSession(
  userId: string
) {
  const sessions = await readSessions();

  const now = Date.now();

  const valid = sessions.filter(
    (session) =>
      session.expiresAt > now
  );

  const token =
    crypto.randomBytes(32).toString('hex');

  const expiresAt =
    now + 1000 * 60 * 60 * 12;

  valid.push({
    token,
    userId,
    expiresAt,
  });

  await writeSessions(valid);

  return {
    token,
    expiresAt,
  };
}

export async function getUserBySession(
  token: string
) {
  if (!token) return null;

  const sessions = await readSessions();
  const now = Date.now();

  const session = sessions.find(
    (item) =>
      item.token === token &&
      item.expiresAt > now
  );

  if (!session) return null;

  const users = await readUsers();

  const user = users.find(
    (item) =>
      item.id === session.userId &&
      item.active
  );

  if (!user) return null;

  return sanitizeUser(user);
}

export async function invalidateUserSessions(userId: string) {
  if (!userId) return;

  const sessions = await readSessions();
  const filtered = sessions.filter(
    (session) => session.userId !== userId
  );

  await writeSessions(filtered);
}

export async function changePasswordBySession(
  token: string,
  currentPassword: string,
  newPassword: string
) {
  if (!token) throw new Error('Sesi login tidak ditemukan.');
  if (!currentPassword) throw new Error('Password lama wajib diisi.');
  if (!newPassword) throw new Error('Password baru wajib diisi.');
  if (newPassword.length < 8) {
    throw new Error('Password baru minimal 8 karakter.');
  }

  const sessions = await readSessions();
  const now = Date.now();

  const session = sessions.find(
    (item) =>
      item.token === token &&
      item.expiresAt > now
  );

  if (!session) {
    throw new Error('Sesi login sudah tidak berlaku.');
  }

  const users = await readUsers();
  const index = users.findIndex(
    (user) =>
      user.id === session.userId &&
      user.active
  );

  if (index === -1) {
    throw new Error('Akun tidak ditemukan atau sudah nonaktif.');
  }

  const user = users[index];

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw new Error('Password lama salah.');
  }

  if (verifyPassword(newPassword, user.passwordHash)) {
    throw new Error('Password baru harus berbeda dari password lama.');
  }

  users[index] = {
    ...user,
    passwordHash: hashPassword(newPassword),
  };

  await writeUsers(users);

  // Password berubah -> seluruh sesi lama dibatalkan,
  // termasuk sesi yang sedang digunakan.
  await invalidateUserSessions(user.id);

  return sanitizeUser(users[index]);
}

export async function resetUserPassword(id: string) {
  const users = await readUsers();
  const index = users.findIndex((user) => user.id === id);

  if (index === -1) {
    throw new Error('Akun tidak ditemukan.');
  }

  const temporaryPassword = generateTemporaryPassword(12);

  users[index] = {
    ...users[index],
    passwordHash: hashPassword(temporaryPassword),
  };

  await writeUsers(users);

  // Reset password langsung memutus semua sesi lama.
  await invalidateUserSessions(users[index].id);

  return {
    user: sanitizeUser(users[index]),
    temporaryPassword,
  };
}

export async function destroySession(
  token: string
) {
  if (!token) return;

  const sessions = await readSessions();

  const filtered = sessions.filter(
    (item) =>
      item.token !== token
  );

  await writeSessions(filtered);
}

export async function listUsers() {
  const users = await readUsers();

  return users.map(sanitizeUser);
}

export async function getUserById(id: string) {
  const users = await readUsers();
  const user = users.find((item) => item.id === id);
  return user ? sanitizeUser(user) : null;
}



export async function updateUser(
  id: string,
  updates: {
    name?: string;
    username?: string;
    role?: UserRole;
    password?: string;
  }
) {
  const users = await readUsers();
  const index = users.findIndex((user) => user.id === id);

  if (index === -1) {
    throw new Error('Akun tidak ditemukan.');
  }

  const name = updates.name?.trim();
  const username = updates.username?.trim();

  if (name !== undefined && !name) {
    throw new Error('Nama wajib diisi.');
  }

  if (username !== undefined && !username) {
    throw new Error('Username wajib diisi.');
  }

  if (username !== undefined) {
    const duplicate = users.find(
      (user) =>
        user.id !== id &&
        user.username.toLowerCase() === username.toLowerCase()
    );

    if (duplicate) {
      throw new Error('Username sudah digunakan akun lain.');
    }
  }

  if (updates.role !== undefined) {
    const allowedRoles: UserRole[] = [
      'admin',
      'pelatih',
      'orang_tua',
      'siswa',
    ];

    if (!allowedRoles.includes(updates.role)) {
      throw new Error('Role akun tidak valid.');
    }
  }

  if (updates.password !== undefined && updates.password !== '') {
    if (updates.password.length < 8) {
      throw new Error('Password minimal 8 karakter.');
    }
  }

  const passwordChanged =
    updates.password !== undefined &&
    updates.password !== '';

  users[index] = {
    ...users[index],
    ...(name !== undefined ? { name } : {}),
    ...(username !== undefined ? { username: username.toLowerCase() } : {}),
    ...(updates.role !== undefined ? { role: updates.role } : {}),
    ...(passwordChanged
      ? { passwordHash: hashPassword(updates.password as string) }
      : {}),
  };

  await writeUsers(users);

  if (passwordChanged) {
    await invalidateUserSessions(users[index].id);
  }

  const { passwordHash: _passwordHash, ...safeUser } = users[index];
  return safeUser;
}

export async function deleteUser(id: string) {
  const users = await readUsers();
  const index = users.findIndex((user) => user.id === id);

  if (index === -1) {
    throw new Error('Akun tidak ditemukan.');
  }

  const target = users[index];

  if (target.role === 'admin') {
    const adminCount = users.filter(
      (user) => user.role === 'admin' && user.active
    ).length;

    if (adminCount <= 1) {
      throw new Error(
        'Akun admin terakhir tidak dapat dihapus. Buat admin pengganti terlebih dahulu.'
      );
    }
  }

  users.splice(index, 1);
  await writeUsers(users);

  await invalidateUserSessions(target.id);

  return sanitizeUser(target);
}

export async function updateUserActive(
  id: string,
  active: boolean
) {
  const users = await readUsers();

  const index = users.findIndex(
    (user) => user.id === id
  );

  if (index === -1) {
    throw new Error('Akun tidak ditemukan.');
  }

  users[index].active = active;

  await writeUsers(users);

  if (!active) {
    await invalidateUserSessions(users[index].id);
  }

  return sanitizeUser(users[index]);
}
