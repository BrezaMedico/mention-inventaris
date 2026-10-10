# MENTION — Sistem Peminjaman & Pengembalian Barang

Sistem inventarisasi, peminjaman, pengembalian, dan automasi WhatsApp Group untuk organisasi **MENTION**.

---

## 1. Quick Start

### A. Menjalankan Website (Next.js)

Pastikan dependensi telah terinstall:

```bash
npm install
npm run dev
```

Buka browser di: [http://localhost:3000](http://localhost:3000)

### B. Menjalankan WhatsApp Microservice (24/7 Always-On)

WhatsApp Microservice berjalan terpisah untuk menjaga sesi WhatsApp Web tetap aktif 24/7 secara persisten tanpa terputus:

- **Cara 1 (Windows Batch 24/7 Auto-Restart)**:
  Cukup double-click file `start-wa-always-on.bat` di root project. Script ini akan menjaga service tetap berjalan dan otomatis menyala kembali jika terjadi crash atau koneksi reset.

- **Cara 2 (NPM Command)**:
```bash
npm run start:wa
```

- **Cara 3 (Cloud / Render 24/7 Keep-Alive)**:
  Service telah dilengkapi:
  1. **Anti-Sleep Keep-Alive**: Otomatis mem-ping endpoint `/health` tiap 2.5 menit agar server cloud (seperti Render) tidak pernah sleep.
  2. **Sentinel Watchdog**: Memperbarui status presence ke WhatsApp tiap 25 detik dan auto-reconnect jika koneksi internet terputus.
  3. **Crash Protection**: Kebal terhadap uncaught exceptions socket frame.
  4. **Eksternal Monitoring (Opsional)**: Daftarkan URL `https://mention-inventaris.onrender.com/health` di UptimeRobot (Free) untuk jaminan pinger dari luar 24/7.

---

## 2. Kredensial Awal

### Admin Portal
- **URL**: `/admin/login`
- **Username**: `mention`
- **Password**: `Mention_123!*`

### PIC Checker PIN (6-Digit Numeric)
- **Rian (Divisi Logistik)**: `123456`
- **Siti (Koordinator Aset)**: `654321`

*(Admin dapat menambahkan PIC baru atau mereset PIN 6-digit kapan saja melalui menu PIC Checker di Admin Portal).*

---

## 3. Database Supabase

File migrasi database SQL lengkap dan seed data tersedia di:

`supabase/schema.sql`

Untuk mengaktifkan sinkronisasi langsung dengan Supabase Cloud:
1. Buka dashboard proyek Supabase Anda: `https://qaaslumawvoykqyohclh.supabase.co`
2. Masuk ke menu **SQL Editor**.
3. Salin seluruh isi file `supabase/schema.sql` dan klik **Run**.
4. Sistem otomatis terhubung langsung ke database PostgreSQL Supabase.
*(Jika Supabase belum dimigrate, sistem memiliki fallback database lokal sinkron sehingga tetap berjalan tanpa error).*

---

## 4. Fitur Utama

- **Peminjaman Barang (`/borrow`)**:
  - Filter otomatis Angkatan & Anggota.
  - Multi-item selection dengan pencegahan duplikasi & race condition.
  - Checklist kelengkapan bawaan tiap barang.
  - Verifikasi kode 6-digit PIC Checker di sisi server.
  - Pemeriksaan kondisi awal & pencatatan catatan kondisi.
  - Pengiriman notifikasi otomatis ke WhatsApp Group organisasi.

- **Pengembalian Barang (`/return`)**:
  - Deteksi transaksi aktif peminjam.
  - Dukungan pengembalian parsial (sebagian barang).
  - Perhitungan otomatis keterlambatan (overdue).
  - Verifikasi kode 6-digit PIC Checker & pencatatan kondisi pengembalian.
  - Update status otomatis barang (`AVAILABLE` atau `MAINTENANCE` jika rusak).
  - Pengiriman notifikasi pengembalian ke WhatsApp Group.

- **Admin Portal (`/admin`)**:
  - Dashboard metriks: Active Loans, Overdue, Available, Borrowed, Maintenance.
  - Monitoring transaksi aktif & detail inspeksi barang.
  - Manajemen Barang & Kelengkapan inventaris.
  - Manajemen Angkatan & Anggota organisasi.
  - Manajemen PIC Checker & reset PIN 6-digit.
  - Audit Trail / History lengkap semua transaksi.
  - Integrasi WhatsApp Web (QR scan, pemilihan target group, test message, log notifikasi).
  - Background scheduler pengingat keterlambatan (maksimal 1 reminder/minggu).
