import { getDB } from './db';

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

type UserRow = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password_hash: string;
  active: number;
  player_id: string | null;
  created_at: string;
};

function toUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    passwordHash: row.password_hash,
    active: Boolean(row.active),
    ...(row.player_id ? { playerId: row.player_id } : {}),
  };
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

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

async function derivePasswordHash(
  password: string,
  saltHex: string,
  iterations = 120000
) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex),
      iterations,
      hash: 'SHA-512',
    },
    keyMaterial,
    512
  );

  return bytesToHex(new Uint8Array(bits));
}

export async function hashPassword(password: string) {
  const salt = bytesToHex(randomBytes(16));
  const hash = await derivePasswordHash(password, salt);

  return `pbkdf2$120000$${salt}$${hash}`;
}

export async function verifyPassword(
  password: string,
  stored: string
) {
  const parts = stored.split('$');

  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return false;
  }

  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = parts[3];

  if (!iterations || !salt || !expected) {
    return false;
  }

  try {
    const actual = await derivePasswordHash(
      password,
      salt,
      iterations
    );

    if (actual.length !== expected.length) {
      return false;
    }

    let difference = 0;

    for (let i = 0; i < actual.length; i++) {
      difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
    }

    return difference === 0;
  } catch {
    return false;
  }
}

function generateTemporaryPassword(length = 12) {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

  const bytes = randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    password += alphabet[bytes[i] % alphabet.length];
  }

  return password;
}

function generateId() {
  return crypto.randomUUID();
}

function generateSessionToken() {
  return bytesToHex(randomBytes(32));
}

async function getUserRow(
  locals: App.Locals,
  id: string
) {
  const db = getDB(locals);

  return db
    .prepare(
      `SELECT id, username, name, role, password_hash,
              active, player_id, created_at
       FROM users
       WHERE id = ?1
       LIMIT 1`
    )
    .bind(id)
    .first<UserRow>();
}

export async function createUser(
  locals: App.Locals,
  username: string,
  name: string,
  role: UserRole,
  password: string,
  playerId?: string
) {
  const db = getDB(locals);

  const normalized = username.trim().toLowerCase();

  if (!normalized || !password) {
    throw new Error('Username dan password wajib diisi.');
  }

  const existing = await db
    .prepare(
      `SELECT id
       FROM users
       WHERE username = ?1
       LIMIT 1`
    )
    .bind(normalized)
    .first<{ id: string }>();

  if (existing) {
    throw new Error('Username sudah digunakan.');
  }

  const user: AuthUser = {
    id: generateId(),
    username: normalized,
    name: name.trim(),
    role,
    passwordHash: await hashPassword(password),
    active: true,
    ...(playerId ? { playerId: playerId.trim() } : {}),
  };

  await db
    .prepare(
      `INSERT INTO users
       (id, username, name, role, password_hash, active, player_id, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    )
    .bind(
      user.id,
      user.username,
      user.name,
      user.role,
      user.passwordHash,
      1,
      user.playerId || null,
      new Date().toISOString()
    )
    .run();

  return sanitizeUser(user);
}

export async function ensureAdmin(
  locals: App.Locals,
  username: string,
  password: string
) {
  const db = getDB(locals);

  const existing = await db
    .prepare(
      `SELECT id, username, name, role, password_hash,
              active, player_id, created_at
       FROM users
       WHERE username = ?1
       LIMIT 1`
    )
    .bind(username.trim().toLowerCase())
    .first<UserRow>();

  if (existing) {
    return sanitizeUser(toUser(existing));
  }

  return createUser(
    locals,
    username,
    'Administrator',
    'admin',
    password
  );
}

export async function authenticate(
  locals: App.Locals,
  username: string,
  password: string
) {
  const db = getDB(locals);

  const normalized = username.trim().toLowerCase();

  const row = await db
    .prepare(
      `SELECT id, username, name, role, password_hash,
              active, player_id, created_at
       FROM users
       WHERE username = ?1
       AND active = 1
       LIMIT 1`
    )
    .bind(normalized)
    .first<UserRow>();

  if (!row) {
    return null;
  }

  const valid = await verifyPassword(
    password,
    row.password_hash
  );

  if (!valid) {
    return null;
  }

  return sanitizeUser(toUser(row));
}

export async function getUsersByPlayerId(
  locals: App.Locals,
  playerId: string
) {
  const db = getDB(locals);

  const result = await db
    .prepare(
      `SELECT id, username, name, role, password_hash,
              active, player_id, created_at
       FROM users
       WHERE player_id = ?1
       ORDER BY role, username`
    )
    .bind(playerId)
    .all<UserRow>();

  return result.results.map((row) =>
    sanitizeUser(toUser(row))
  );
}

export async function createParticipantAccounts(
  locals: App.Locals,
  playerId: string,
  studentName: string,
  parentName: string
) {
  const db = getDB(locals);
  const normalizedPlayerId = playerId.trim();

  if (!normalizedPlayerId) {
    throw new Error('Nomor pendaftaran wajib diisi.');
  }

  const studentUsername =
    `${normalizedPlayerId}-S`.toLowerCase();

  const parentUsername =
    `${normalizedPlayerId}-OT`.toLowerCase();

  const existing = await db
    .prepare(
      `SELECT id, username, name, role, password_hash,
              active, player_id, created_at
       FROM users
       WHERE username IN (?1, ?2)`
    )
    .bind(studentUsername, parentUsername)
    .all<UserRow>();

  const existingStudent =
    existing.results.find(
      (user) => user.username === studentUsername
    );

  const existingParent =
    existing.results.find(
      (user) => user.username === parentUsername
    );

  if (existingStudent || existingParent) {
    if (
      existingStudent?.player_id === normalizedPlayerId &&
      existingParent?.player_id === normalizedPlayerId
    ) {
      return {
        created: false,
        alreadyExists: true,
        accounts: [
          sanitizeUser(toUser(existingStudent)),
          sanitizeUser(toUser(existingParent)),
        ],
      };
    }

    throw new Error(
      'Sebagian akun peserta sudah ada. Tidak ada akun baru yang dibuat.'
    );
  }

  const studentPassword =
    generateTemporaryPassword();

  const parentPassword =
    generateTemporaryPassword();

  const student: AuthUser = {
    id: generateId(),
    username: studentUsername,
    name: studentName.trim() || 'Siswa',
    role: 'siswa',
    passwordHash: await hashPassword(studentPassword),
    active: true,
    playerId: normalizedPlayerId,
  };

  const parent: AuthUser = {
    id: generateId(),
    username: parentUsername,
    name: parentName.trim() || 'Orang Tua/Wali',
    role: 'orang_tua',
    passwordHash: await hashPassword(parentPassword),
    active: true,
    playerId: normalizedPlayerId,
  };

  const createdAt = new Date().toISOString();

  await db.batch([
    db
      .prepare(
        `INSERT INTO users
         (id, username, name, role, password_hash, active, player_id, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7)`
      )
      .bind(
        student.id,
        student.username,
        student.name,
        student.role,
        student.passwordHash,
        student.playerId,
        createdAt
      ),
    db
      .prepare(
        `INSERT INTO users
         (id, username, name, role, password_hash, active, player_id, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7)`
      )
      .bind(
        parent.id,
        parent.username,
        parent.name,
        parent.role,
        parent.passwordHash,
        parent.playerId,
        createdAt
      ),
  ]);

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
  locals: App.Locals,
  userId: string
) {
  const db = getDB(locals);

  const now = Date.now();
  const expiresAt =
    now + 1000 * 60 * 60 * 12;

  const token = generateSessionToken();

  await db
    .prepare(
      `DELETE FROM sessions
       WHERE expires_at <= ?1`
    )
    .bind(now)
    .run();

  await db
    .prepare(
      `INSERT INTO sessions
       (token, user_id, expires_at)
       VALUES (?1, ?2, ?3)`
    )
    .bind(token, userId, expiresAt)
    .run();

  return {
    token,
    expiresAt,
  };
}

export async function getUserBySession(
  locals: App.Locals,
  token: string
) {
  if (!token) {
    return null;
  }

  const db = getDB(locals);

  const row = await db
    .prepare(
      `SELECT u.id, u.username, u.name, u.role,
              u.password_hash, u.active, u.player_id, u.created_at
       FROM sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token = ?1
         AND s.expires_at > ?2
         AND u.active = 1
       LIMIT 1`
    )
    .bind(token, Date.now())
    .first<UserRow>();

  return row
    ? sanitizeUser(toUser(row))
    : null;
}

export async function invalidateUserSessions(
  locals: App.Locals,
  userId: string
) {
  if (!userId) return;

  const db = getDB(locals);

  await db
    .prepare(
      `DELETE FROM sessions
       WHERE user_id = ?1`
    )
    .bind(userId)
    .run();
}

export async function changePasswordBySession(
  locals: App.Locals,
  token: string,
  currentPassword: string,
  newPassword: string
) {
  if (!token) {
    throw new Error('Sesi login tidak ditemukan.');
  }

  if (!currentPassword) {
    throw new Error('Password lama wajib diisi.');
  }

  if (!newPassword) {
    throw new Error('Password baru wajib diisi.');
  }

  if (newPassword.length < 8) {
    throw new Error(
      'Password baru minimal 8 karakter.'
    );
  }

  const db = getDB(locals);

  const session = await db
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE token = ?1
         AND expires_at > ?2
       LIMIT 1`
    )
    .bind(token, Date.now())
    .first<{ user_id: string }>();

  if (!session) {
    throw new Error(
      'Sesi login sudah tidak berlaku.'
    );
  }

  const row = await getUserRow(
    locals,
    session.user_id
  );

  if (!row || !row.active) {
    throw new Error(
      'Akun tidak ditemukan atau sudah nonaktif.'
    );
  }

  if (
    !(await verifyPassword(
      currentPassword,
      row.password_hash
    ))
  ) {
    throw new Error('Password lama salah.');
  }

  if (
    await verifyPassword(
      newPassword,
      row.password_hash
    )
  ) {
    throw new Error(
      'Password baru harus berbeda dari password lama.'
    );
  }

  const passwordHash =
    await hashPassword(newPassword);

  await db
    .prepare(
      `UPDATE users
       SET password_hash = ?1
       WHERE id = ?2`
    )
    .bind(passwordHash, row.id)
    .run();

  await invalidateUserSessions(
    locals,
    row.id
  );

  const updated = await getUserRow(
    locals,
    row.id
  );

  return updated
    ? sanitizeUser(toUser(updated))
    : null;
}

export async function resetUserPassword(
  locals: App.Locals,
  id: string
) {
  const db = getDB(locals);

  const row = await getUserRow(
    locals,
    id
  );

  if (!row) {
    throw new Error('Akun tidak ditemukan.');
  }

  const temporaryPassword =
    generateTemporaryPassword(12);

  const passwordHash =
    await hashPassword(temporaryPassword);

  await db
    .prepare(
      `UPDATE users
       SET password_hash = ?1
       WHERE id = ?2`
    )
    .bind(passwordHash, id)
    .run();

  await invalidateUserSessions(
    locals,
    id
  );

  const updated = await getUserRow(
    locals,
    id
  );

  if (!updated) {
    throw new Error('Akun tidak ditemukan.');
  }

  return {
    user: sanitizeUser(toUser(updated)),
    temporaryPassword,
  };
}

export async function destroySession(
  locals: App.Locals,
  token: string
) {
  if (!token) return;

  const db = getDB(locals);

  await db
    .prepare(
      `DELETE FROM sessions
       WHERE token = ?1`
    )
    .bind(token)
    .run();
}

export async function listUsers(
  locals: App.Locals
) {
  const db = getDB(locals);

  const result = await db
    .prepare(
      `SELECT id, username, name, role, password_hash,
              active, player_id, created_at
       FROM users
       ORDER BY role, username`
    )
    .all<UserRow>();

  return result.results.map((row) =>
    sanitizeUser(toUser(row))
  );
}

export async function getUserById(
  locals: App.Locals,
  id: string
) {
  const row = await getUserRow(
    locals,
    id
  );

  return row
    ? sanitizeUser(toUser(row))
    : null;
}

export async function updateUser(
  locals: App.Locals,
  id: string,
  updates: {
    name?: string;
    username?: string;
    role?: UserRole;
    password?: string;
  }
) {
  const db = getDB(locals);

  const row = await getUserRow(
    locals,
    id
  );

  if (!row) {
    throw new Error('Akun tidak ditemukan.');
  }

  const name = updates.name?.trim();
  const username = updates.username?.trim().toLowerCase();

  if (name !== undefined && !name) {
    throw new Error('Nama wajib diisi.');
  }

  if (username !== undefined && !username) {
    throw new Error('Username wajib diisi.');
  }

  if (username !== undefined) {
    const duplicate = await db
      .prepare(
        `SELECT id
         FROM users
         WHERE username = ?1
           AND id != ?2
         LIMIT 1`
      )
      .bind(username, id)
      .first<{ id: string }>();

    if (duplicate) {
      throw new Error(
        'Username sudah digunakan akun lain.'
      );
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

  if (
    updates.password !== undefined &&
    updates.password !== '' &&
    updates.password.length < 8
  ) {
    throw new Error(
      'Password minimal 8 karakter.'
    );
  }

  const passwordChanged =
    updates.password !== undefined &&
    updates.password !== '';

  const passwordHash = passwordChanged
    ? await hashPassword(updates.password as string)
    : row.password_hash;

  await db
    .prepare(
      `UPDATE users
       SET name = ?1,
           username = ?2,
           role = ?3,
           password_hash = ?4
       WHERE id = ?5`
    )
    .bind(
      name !== undefined ? name : row.name,
      username !== undefined
        ? username
        : row.username,
      updates.role !== undefined
        ? updates.role
        : row.role,
      passwordHash,
      id
    )
    .run();

  if (passwordChanged) {
    await invalidateUserSessions(
      locals,
      id
    );
  }

  const updated = await getUserRow(
    locals,
    id
  );

  if (!updated) {
    throw new Error('Akun tidak ditemukan.');
  }

  return sanitizeUser(toUser(updated));
}

export async function deleteUser(
  locals: App.Locals,
  id: string
) {
  const db = getDB(locals);

  const row = await getUserRow(
    locals,
    id
  );

  if (!row) {
    throw new Error('Akun tidak ditemukan.');
  }

  if (row.role === 'admin') {
    const result = await db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM users
         WHERE role = 'admin'
           AND active = 1`
      )
      .first<{ count: number }>();

    if ((result?.count || 0) <= 1) {
      throw new Error(
        'Akun admin terakhir tidak dapat dihapus. Buat admin pengganti terlebih dahulu.'
      );
    }
  }

  await invalidateUserSessions(
    locals,
    id
  );

  await db
    .prepare(
      `DELETE FROM users
       WHERE id = ?1`
    )
    .bind(id)
    .run();

  return sanitizeUser(toUser(row));
}

export async function updateUserActive(
  locals: App.Locals,
  id: string,
  active: boolean
) {
  const db = getDB(locals);

  const row = await getUserRow(
    locals,
    id
  );

  if (!row) {
    throw new Error('Akun tidak ditemukan.');
  }

  await db
    .prepare(
      `UPDATE users
       SET active = ?1
       WHERE id = ?2`
    )
    .bind(active ? 1 : 0, id)
    .run();

  if (!active) {
    await invalidateUserSessions(
      locals,
      id
    );
  }

  const updated = await getUserRow(
    locals,
    id
  );

  if (!updated) {
    throw new Error('Akun tidak ditemukan.');
  }

  return sanitizeUser(toUser(updated));
}
