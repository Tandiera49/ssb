# Roadmap Progress — SSB Bhayangkara Junior 2018

## Selesai pada batch ini

### Admin dan CMS

- Navigasi admin sudah menunjuk ke modul yang tersedia: Pendaftaran, Konten Website, Manajemen Akun, Jadwal/Turnamen, dan Pengumuman.
- Dashboard admin menampilkan statistik nyata dari storage saat ini: pendaftaran baru, diproses, diterima, jumlah akun, aktivitas terbaru, jadwal, turnamen, dan pengumuman.
- Navigasi mobile dan desktop tetap menggunakan `AdminNav` yang sama.
- CMS tetap menjadi satu-satunya sumber pengelolaan Jadwal, Turnamen, dan Pengumuman; tidak dibuat modul duplikat.

### Account dan Session

- Pembuatan akun manual dibatasi untuk Admin dan Pelatih.
- Akun Siswa dan Orang Tua tetap dibuat melalui pendaftaran yang diterima, dengan `playerId` dan temporary credential.
- Username dinormalisasi menjadi lowercase.
- Session diinvalidasi ketika password diubah, akun dinonaktifkan, atau akun dihapus.
- Akun admin terakhir tidak dapat dihapus.

### Security Review

- Login memiliki rate limit dasar per alamat client.
- Cookie session production memakai `Secure`, `HttpOnly`, `SameSite=Lax`, dan `Max-Age`.
- Security headers global ditambahkan: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, dan `Permissions-Policy`.
- Dokumen admin memerlukan autentikasi admin, membatasi jenis dokumen, dan menyanitasi nama file.
- Upload pendaftaran dibatasi 5 MB per file dan hanya menerima JPG, PNG, WEBP, atau PDF.
- Upload CMS dibatasi 10 MB dan ekstensi gambar yang didukung.
- Absensi dan penilaian pelatih hanya dapat dibuat untuk pemain yang status pendaftarannya `diterima`.
- Payload CMS memiliki batas ukuran dan jumlah item.

## Validasi

- `npx astro check`: 0 error, 0 warning, 3 hint Astro yang tidak memblokir build.
- `npm run build`: berhasil menggunakan `@astrojs/node` dalam mode server.
- Smoke test: halaman `/admin` tanpa sesi mengarah ke login; endpoint konten publik merespons sukses dan security headers terpasang.

## Ditahan secara sengaja

Migrasi ke Cloudflare D1/R2, deployment Worker, domain, backup production, dan secure cookie production penuh memerlukan konfigurasi Cloudflare serta keputusan infrastruktur yang belum tersedia di ZIP ini. Storage JSON/filesystem dipertahankan agar data lokal dan modul yang sudah berjalan tidak rusak. Finance juga tetap ditahan sampai data foundation D1/R2 siap, sesuai urutan roadmap.

## Urutan batch berikutnya

1. Migrasi storage ke D1/R2 dengan adapter yang kompatibel dan migrasi data teruji.
2. Modul Finance setelah skema Payments siap.
3. Audit dan finalisasi Parent/Siswa berdasarkan data foundation.
4. Production Cloudflare, observability, backup, dan pengujian deployment.
