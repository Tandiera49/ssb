# Rebuild Profesional — SSB Bhayangkara Junior 2018

Versi ini bukan sekadar penambahan menu. Homepage, dashboard Admin, dan Finance Desk dibangun ulang dengan hierarchy, bahasa visual, dan workflow yang berbeda.

## Homepage

Homepage sekarang memakai positioning **Football Academy** dengan hero editorial, development path U-8/U-10/U-12+, prinsip Academy, weekly rhythm, game day, gallery moments, CTA pendaftaran, dan footer yang lebih tenang. CMS tetap menjadi sumber data jadwal, turnamen, gallery, kontak, dan hero.

## Command Center Admin

Dashboard Admin sekarang menggunakan pola workspace: fokus hari ini, inbox pendaftaran, health kondisi sistem, metric cards, dan quick access untuk Admissions, Finance Desk, People & Access, serta Content Studio. Tujuannya mengurangi tampilan kartu dekoratif dan membuat pekerjaan admin terlihat sebagai alur operasional nyata.

## Finance Desk

Finance memiliki ringkasan outstanding, invoice register, filter, status invoice, catatan pembayaran manual, konfigurasi billing, dan aksi receipt. Pembayaran online tetap tidak tersedia. Invoice yang lunas dapat menghasilkan tanda terima PDF dari endpoint terlindungi Admin:

`/api/admin/finance/receipt?playerId=...&month=...`

## Validasi

`npm run build` berhasil, `astro check` menghasilkan 0 error dan 0 warning. Satu hint tersisa berasal dari script lama di halaman pendaftaran. Smoke test route publik berhasil; route Admin dan receipt tanpa session mengembalikan redirect/401 sesuai proteksi.
