# Deployment Cloudflare SSB Bhayangkara Junior

Proyek ini sekarang menggunakan **Astro SSR + Cloudflare Pages Functions**, **D1** untuk data relasional, dan **R2** untuk semua upload CMS serta dokumen pendaftaran privat. Jangan mengandalkan folder `storage/` di production karena filesystem Worker tidak persisten.

## 1. Binding yang wajib dibuat di Cloudflare Pages

Buka project Pages `ssbbhayangkarjunior` → **Settings → Functions → Bindings**. Tambahkan:

| Jenis | Variable name | Nilai |
|---|---|---|
| D1 database | `DB` | pilih database D1 proyek SSB |
| R2 bucket | `UPLOADS` | `ssb-uploads` |

ID database D1 yang diberikan adalah `f0496b5c-308b-493d-95a2-8b0607c1445c` dan sudah dimasukkan ke `wrangler.toml`. Jika nama database D1 Anda bukan `ssb-db`, ubah nilai `database_name` di file tersebut sesuai nama yang tampil di Cloudflare.

## 2. Build settings GitHub → Cloudflare Pages

Gunakan pengaturan berikut:

```text
Framework preset: Astro
Build command: npm run build
Build output directory: dist
Node version: 22
```

Pastikan project Pages melakukan deployment sebagai project Functions/SSR Astro, bukan hanya mengunggah folder statis dari repository. `astro.config.mjs` sudah memakai `@astrojs/cloudflare` dan output `server`.

## 3. Migrasi database D1

Install/login Wrangler dengan akun Cloudflare yang memiliki project Pages, D1, dan R2:

```bash
npm install
npx wrangler login
npx wrangler d1 list
```

Pastikan `database_id` dan `database_name` di `wrangler.toml` sesuai dengan database D1 Anda:

```toml
database_name = "ssb-db"
database_id = "f0496b5c-308b-493d-95a2-8b0607c1445c"
```

Setelah itu jalankan migrasi remote:

```bash
npm run db:migrate:remote
```

Migrasi yang dipakai adalah `db/migrations/0001_initial.sql`. Jangan menjalankan migrasi berulang secara manual karena Wrangler menyimpan riwayat migrasi.

## 4. Membuat admin pertama di D1

Buat SQL seed tanpa menyimpan password ke repository:

```bash
```

Lihat isi SQL tersebut secara lokal, lalu jalankan ke database D1 remote:

```bash
npx wrangler d1 execute NAMA_DATABASE_D1 --remote --file=/tmp/ssb-admin.sql
rm -f /tmp/ssb-admin.sql
```

Gunakan password minimal 8 karakter. Script ini tidak lagi membuat `storage/auth/users.json`; autentikasi production seluruhnya membaca tabel `users` dan `sessions` dari D1.

## 5. Deploy dari lokal

Setelah binding Pages sudah dibuat dan D1 ID sudah diisi:

```bash
npm ci
npm run check
npm run build
npm run deploy
```

Atau cukup push ke GitHub jika project Pages sudah terhubung ke repository. Jangan commit file `.env`, password, SQL seed admin, atau data runtime.

## 6. Pengujian lokal dengan binding Cloudflare

Untuk menjalankan Worker hasil build secara lokal:

```bash
npm run build
npx wrangler pages dev ./dist
```

Jika ingin menguji D1 lokal, gunakan database lokal Wrangler dan migrasi lokal terlebih dahulu. R2 lokal dapat diuji lewat binding Wrangler; untuk memeriksa bucket production gunakan bucket `ssb-uploads` yang sama hanya ketika memang ingin mengubah data production.

## 7. Perubahan penting yang sudah dilakukan

1. Adapter Node diganti menjadi adapter Cloudflare.
2. Data CMS dipindahkan dari `storage/content/content.json` ke tabel `site_content` di D1.
3. Data pendaftaran dipindahkan dari `storage/pendaftaran/*/data.json` ke tabel `registrations` dan `players` di D1.
4. Foto CMS dan dokumen pendaftaran dipindahkan ke R2 dengan binding `UPLOADS`.
5. Endpoint gambar dan dokumen membaca object R2, bukan filesystem lokal.
6. Endpoint pendaftaran memakai Web Crypto, bukan `node:crypto`.
7. Seluruh pemeriksaan sesi, autentikasi, akun, absensi, penilaian, dan keuangan memakai binding D1 dari `Astro.locals`.
8. Konfigurasi migrasi dan perintah deploy sudah disediakan di `wrangler.toml` dan `package.json`.

## Troubleshooting utama

- **`Binding D1 "DB" tidak tersedia`**: tambahkan binding D1 dengan nama tepat `DB` pada Pages production dan preview environment yang dipakai.
- **`Binding R2 "UPLOADS" tidak tersedia`**: tambahkan R2 binding dengan variable name tepat `UPLOADS` dan pilih bucket `ssb-uploads`.
- **Halaman tampil tetapi data kosong**: jalankan migrasi D1 remote, lalu buat admin pertama. Data lama yang hanya berada di folder `storage/` tidak dapat otomatis muncul di Cloudflare.
- **Upload berhasil tetapi gambar 404**: pastikan R2 binding `UPLOADS` aktif pada environment Pages yang sama dan gunakan endpoint aplikasi `/api/admin/content/image?file=...`.
- **Deploy CLI menolak `database_id`**: pastikan ID dan nama database pada `wrangler.toml` sama persis dengan database D1 di Cloudflare.
