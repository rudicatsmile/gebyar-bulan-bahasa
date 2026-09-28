# Manual Book & Dokumentasi Resmi GebyarBulanBahasa

Selamat datang di pusat dokumentasi resmi **GebyarBulanBahasa** — sistem penilaian digital dan dashboard operasional acara *"Gebyar Bulan Bahasa dan Kebudayaan"* dalam rangka Peringatan Hari Sumpah Pemuda.

**Tema Acara:** *"Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia."*

---

## 📚 Struktur Dokumentasi

Folder `docs/` ini memuat panduan operasional lengkap yang dibagi berdasarkan peran pengguna (*role*) serta panduan teknis mendalam untuk tim pengembang:

```
docs/
├── README.md                   # Dokumen Utama & Ringkasan Alur Bisnis (Dokumen Ini)
├── KREDENSIAL.md               # Daftar Akun Resmi, Email, Password, & Kode Stand
├── sistem-penilaian.md         # Dokumentasi Lengkap Sistem Penilaian, Agregasi, & Audit Nilai
├── user-guide-seksi-acara.md   # Panduan Operasional: Seksi Acara & Super Admin
├── user-guide-juri.md          # Panduan Pengoperasian: Dewan Juri (Digital Scoring)
├── user-guide-media.md         # Panduan Pengoperasian: Tim Media Center & Monitor Venue
├── user-guide-peserta.md       # Panduan Interaktif: Peserta Acara & Gamifikasi Stand
└── developer-guide.md          # Panduan Teknis Arsitektur & Pengembangan Developer
```

---

## 🏛️ Ringkasan Aplikasi

GebyarBulanBahasa dirancang untuk mendigitalkan seluruh siklus penyelenggaraan festival kebudayaan dan perlombaan bahasa:
1. **Pendaftaran & Verifikasi:** Pendaftaran peserta lomba individu maupun beregu dengan validasi dokumen otomatis dan batasan kuota.
2. **Penjurian Digital Real-Time:** Penilaian langsung di meja juri menggunakan bobot persentase dinamis per kriteria dengan kalkulasi otomatis dan deteksi selisih nilai ekstrem (*gap score*).
3. **Manajemen Panggung & Rundown:** Pengendalian jadwal panggung utama dan panggung ekspresi budaya dengan sistem proteksi bentrok waktu (*anti-conflict stage validation*).
4. **Papan Skor & Pengumuman Live:** Tayangan langsung rekapitulasi penilaian dan pengumuman juara yang terhubung ke monitor lapangan.
5. **Gamifikasi Interaktif Peserta:** Kunjungan 8 stand budaya dengan scan QR token / input kode unik 6 karakter, akumulasi poin, papan peringkat (*leaderboard*), dan penukaran hadiah (*merchandise reward*).
6. **Layar Monitor Venue & Media Center:** Kendali tayangan digital signage di panggung venue, rotasi playlist otomatis, siaran darurat (*emergency alert broadcast*), dan galeri twibbon yang dimoderasi.

---

## 👥 Matriks Peran & Hak Akses Pengguna

Aplikasi menerapkan kontrol akses berbasis peran (*Role-Based Access Control / RBAC*) yang ketat:

| Peran (Role) | Hak Akses Utama | URL Halaman Utama |
|---|---|---|
| **Super Admin** (`super_admin`) | Seluruh modul sistem, manajemen pengguna, konfigurasi acara, audit logs. | `/dashboard` |
| **Seksi Acara** (`seksi_acara`) | Manajemen 8 cabang lomba, jadwal panggung, kriteria nilai, verifikasi peserta, rekap nilai & pemenang, broadcast darurat. | `/dashboard` |
| **Dewan Juri** (`juri`) | Lembar penilaian digital lomba yang ditugaskan, riwayat penilaian, revisi skor draft, catatan masukan peserta. | `/juri` |
| **Media Center** (`media_center`) | Pengendali monitor lapangan (Digital Signage), moderasi twibbon, playlist monitor, galeri liputan, siaran warta media. | `/media` |
| **Peserta** (`peserta`) | Pendaftaran lomba, scan QR & kode stand budaya, riwayat perolehan poin, katalog reward, unggah twibbon, profil peserta. | `/peserta` |
| **Publik / Tamu** (`anon`) | Melihat profil lomba, rundown jadwal acara, warta pengumuman, papan skor akhir, leaderboard poin, dan galeri publik. | `/` |

---

## 🔄 Alur Bisnis Utama Sistem (*End-to-End Workflow*)

```
[Peserta]                      [Seksi Acara]                    [Dewan Juri]               [Media Center & Monitor]
    │                                │                                │                               │
    ├─► Daftar Akun / Masuk          │                                │                               │
    ├─► Unggah Dokumen Verifikasi ──►├─► Validasi Dokumen Peserta     │                               │
    ├─► Pilih Cabang Lomba ─────────►├─► Konfirmasi Urutan Tampil     │                               │
    │                                ├─► Atur Kriteria Berbobot (100%)│                               │
    │                                ├─► Buka Status Lomba "Berlangsung"                              │
    │                                │        │                       │                               │
    │                                │        └─► Notifikasi Juri ───►├─► Buka Scoring Sheet Digital  │
    ├─► Tampil di Panggung           │                                ├─► Input Skor per Kriteria     │
    │                                │                                └─► Kirim Nilai Final ─────────┐│
    │                                ├─► Verifikasi Rekapitulasi Nilai ◄─────────────────────────────┘│
    │                                ├─► Tetapkan Juara & Rilis ─────────────────────────────────────►├─► Tayang Otomatis di
    │                                │                                                                │   Monitor Panggung
    ├─► Kunjungi 8 Stand Budaya      │                                                                │
    ├─► Scan QR / Input Kode Stand ──┼─► Ledger Poin Bertambah Realtime                               │
    ├─► Tukar Poin dengan Hadiah ────┼─► Klaim Reward Fisik di Booth                                  │
    └─► Buat & Unggah Twibbon ───────┼─► Moderasi Foto Disetujui ────────────────────────────────────►├─► Tayang di Wall Monitor
```

---

## 🚀 Memulai Penggunaan

1. **Untuk Pengguna Operasional:**  
   Buka [Panduan Masuk & Kredensial](file:///d:/project/web/energies/gebyar-bulan-bahasa-by-bu-pebri/docs/KREDENSIAL.md) untuk melihat daftar akun resmi dan kata sandi yang dapat langsung dipakai.
2. **Untuk Seksi Acara:**  
   Baca [User Guide Seksi Acara](file:///d:/project/web/energies/gebyar-bulan-bahasa-by-bu-pebri/docs/user-guide-seksi-acara.md) untuk mempelajari langkah operasional lomba, panggung, dan rekap juara.
3. **Untuk Dewan Juri:**  
   Baca [User Guide Dewan Juri](file:///d:/project/web/energies/gebyar-bulan-bahasa-by-bu-pebri/docs/user-guide-juri.md) untuk panduan penilaian digital bebas kesalahan.
4. **Untuk Tim Media:**  
   Baca [User Guide Media Center](file:///d:/project/web/energies/gebyar-bulan-bahasa-by-bu-pebri/docs/user-guide-media.md) untuk kendali layar panggung dan kurasi foto.
5. **Untuk Peserta:**  
   Baca [User Guide Peserta](file:///d:/project/web/energies/gebyar-bulan-bahasa-by-bu-pebri/docs/user-guide-peserta.md) untuk panduan lomba dan perburuan poin stand budaya.
6. **Untuk Developer:**  
   Buka [Developer Guide](file:///d:/project/web/energies/gebyar-bulan-bahasa-by-bu-pebri/docs/developer-guide.md) untuk arsitektur kode, setup lokal, database migration, dan penambahan fitur.
