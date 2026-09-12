CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  registration_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  registration_number TEXT NOT NULL UNIQUE,
  player_id TEXT NOT NULL,
  nama_siswa TEXT NOT NULL,
  tempat_lahir TEXT,
  tanggal_lahir TEXT,
  nisn TEXT,
  alamat TEXT,
  nama_ayah TEXT,
  hp_ayah TEXT,
  pekerjaan_ayah TEXT,
  nama_ibu TEXT,
  hp_ibu TEXT,
  pekerjaan_ibu TEXT,
  posisi TEXT,
  ssb_sebelumnya TEXT,
  prestasi TEXT,
  tinggi TEXT,
  berat TEXT,
  golongan_darah TEXT,
  penyakit_alergi TEXT,
  riwayat_cedera TEXT,
  persetujuan TEXT,
  nama_wali TEXT,
  tanggal_pendaftaran TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'baru',
  files_json TEXT,
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  player_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(player_id, date),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  period TEXT NOT NULL,
  technical REAL,
  tactical REAL,
  physical REAL,
  mental REAL,
  teamwork REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS finance_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  administration INTEGER NOT NULL,
  jersey INTEGER NOT NULL,
  initial_tuition INTEGER NOT NULL,
  monthly_tuition INTEGER NOT NULL,
  due_day INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  month TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid',
  paid_at TEXT NOT NULL,
  note TEXT,
  UNIQUE(player_id, month),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS site_content (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_player ON users(player_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_attendance_player ON attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_player ON evaluations(player_id);
CREATE INDEX IF NOT EXISTS idx_payments_player ON payments(player_id);
