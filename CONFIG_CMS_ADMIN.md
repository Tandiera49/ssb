# Konfigurasi CMS dan Admin

## Menjalankan proyek di Termux

```bash
cd ~/ssb
npm install
npm run dev -- --host 0.0.0.0 --port 4321
```

Buka `http://127.0.0.1:4321`.

## Membuat Admin pertama

Endpoint setup web sengaja dinonaktifkan. Buat Admin dari command line:

```bash
npm run admin:create -- adminssb 'PasswordKuatMinimal8'
```

Perintah ini membuat file runtime `storage/auth/users.json` dan `storage/auth/sessions.json`. Jangan memasukkan password production ke shell history; gunakan terminal sementara atau hapus history sesuai kebijakan perangkat.

Kemudian buka `/login` dan masuk menggunakan username serta password tersebut. Setelah login, halaman utama Admin tersedia di `/admin`.

## Menu Admin

| Menu | Fungsi |
|---|---|
| Dashboard | Ringkasan pendaftaran, akun, aktivitas, jadwal, turnamen, dan CMS |
| Pendaftaran | Cari/filter pendaftar, lihat detail, ubah status, download PDF, buka dokumen, dan buat akun peserta |
| Konten Website | Kelola Hero, Visi/Misi, Kontak, Gallery, Jadwal, Turnamen, dan Pengumuman |
| Manajemen Akun | Kelola Admin/Pelatih, status akun, reset password, dan akun peserta yang sudah dibuat dari pendaftaran diterima |
| Keuangan | Konfigurasi biaya, daftar tagihan, tandai pembayaran manual, dan laporan outstanding |

## Alur pendaftaran sampai portal

Pertama, calon peserta mengisi `/pendaftaran`. Data dan dokumen tersimpan di `storage/pendaftaran/<nomor>`. Admin memeriksa pendaftar dari `/admin/pendaftaran`, kemudian mengubah status menjadi `diterima` setelah proses verifikasi selesai. Dari detail pendaftar, Admin menjalankan pembuatan akun peserta. Sistem membuat akun Siswa dan Orang Tua/Wali dengan `playerId` yang sama dengan nomor pendaftaran.

PDF lengkap dapat diunduh dari detail pendaftar. Dokumen peserta tidak boleh dipindahkan ke `public/` karena bersifat privat.

## Konfigurasi CMS

Buka `/admin/content`. Isi dan simpan secara bertahap: Hero, Visi/Misi, Kontak, Jadwal, Turnamen, Gallery, dan Pengumuman. Homepage, halaman Program, halaman Berita, dan portal anggota membaca data CMS yang sama. Gallery dan foto Hero menggunakan upload CMS; jangan menghapus folder `storage/content/uploads`.

## Konfigurasi Keuangan

Buka `/admin/finance`. Nominal awal yang tersedia adalah Administrasi Rp100.000, Jersey + kaos kaki Rp250.000, SPP awal Rp150.000, total awal Rp500.000, dan SPP bulanan Rp150.000. Admin dapat mengubah nominal dan tanggal jatuh tempo.

Pembayaran **tidak dilakukan melalui website**. Setelah orang tua membayar secara offline/manual, Admin memilih siswa dan menekan `Tandai Lunas`. Orang Tua/Wali melihat tagihan, status, dan riwayat pada portal `/orang-tua`. Siswa tidak melihat data keuangan.

## Data runtime dan backup

Data penting berada di folder berikut:

```text
storage/auth/          akun dan session
storage/pendaftaran/   data pendaftaran dan dokumen privat
storage/content/       CMS dan upload gambar
storage/attendance/    absensi
storage/evaluations/   penilaian
storage/finance/       konfigurasi, invoice, dan pembayaran manual
```

Untuk backup lokal, hentikan server lalu salin folder `storage` ke media aman. Jangan memasukkan `storage` ke ZIP distribusi publik karena berisi dokumen dan credential.
