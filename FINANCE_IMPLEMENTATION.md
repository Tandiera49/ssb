# Finance Manual dan Sinkronisasi Portal

## Prinsip

Sistem keuangan ini **tidak menerima pembayaran melalui website**. Website hanya digunakan untuk menetapkan nominal, membuat tampilan tagihan, mencatat pembayaran yang sudah diterima secara manual oleh Admin, dan menampilkan laporan kepada Orang Tua/Wali.

## Nominal default

| Komponen | Nominal |
|---|---:|
| Administrasi | Rp100.000 |
| Jersey + kaos kaki | Rp250.000 |
| SPP awal | Rp150.000 |
| Total awal | Rp500.000 |
| SPP bulanan | Rp150.000 |

Seluruh nominal dan tanggal jatuh tempo dapat diubah Admin melalui `/admin/finance`.

## Alur data

Pendaftaran online tetap menjadi sumber identitas peserta. Ketika pendaftaran diterima, `nomor_pendaftaran` menjadi `playerId` untuk akun Siswa/Orang Tua, absensi, evaluasi, PDF, dan finance. Tidak ada pembuatan siswa kedua atau input peserta finance terpisah.

Admin dapat melihat peserta yang statusnya `diterima`, memilih tagihan biaya awal atau bulan tertentu, kemudian menandai pembayaran sebagai lunas atau membatalkannya. Orang Tua/Wali hanya dapat melihat ringkasan dan daftar invoice. Siswa tidak menerima data finance melalui endpoint member.

## Status invoice

Invoice menggunakan status `paid`, `unpaid`, `upcoming`, dan `overdue`. Bulan setelah bulan berjalan bukan tunggakan. Biaya awal memiliki invoice terpisah dengan nominal Rp500.000 dan dicatat sebagai pembayaran manual.

## Batasan yang disengaja

Belum ada payment gateway, upload bukti transfer, atau tombol pembayaran online. Storage saat ini masih JSON/filesystem agar kompatibel dengan proyek ZIP. Migrasi D1/R2 dapat dilakukan setelah skema dan backup production disiapkan.
