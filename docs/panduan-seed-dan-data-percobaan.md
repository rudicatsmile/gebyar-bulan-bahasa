# Panduan Pembuatan Data Percobaan (Database Seeding & Simulation)

**Aplikasi:** GebyarBulanBahasa  
**Tujuan:** Panduan eksekusi perintah terminal untuk menyiapkan data percobaan, akun uji coba, cabang lomba, dan peserta simulasi.

---

## 🚀 Ringkasan Perintah Terminal

Semua perintah dijalankan di root direktori proyek melalui terminal (PowerShell, Bash, atau Command Prompt):

| Perintah NPM | Perintah Node Alternatif | Fungsi Utama |
|---|---|---|
| `npm run db:seed` | `node scripts/seed.mjs` | Membuat master pengaturan acara, 8 cabang lomba, kriteria penilaian, stan budaya, jadwal, dan pengumuman |
| `npm run db:seed-users` | `node scripts/seed-users.mjs` | Membuat akun resmi di Supabase Auth & profiles: Super Admin, Seksi Acara, Dewan Juri, Media Center, dan Peserta |
| `npm run db:seed-simulation` | `node scripts/seed-simulation.mjs` | Membuat 25 peserta simulasi dari Master Sekolah, pendaftaran lomba individu/kelompok, dan penilaian simulasi |
| `npm run db:backfill-peserta` | `node scripts/backfill-participants.mjs` | Melakukan sinkronisasi/backfill akun peserta yang belum memiliki profil lengkap |
| *(opsional pembersihan)* | `node scripts/cleanup-test-data.mjs` | Membersihkan data pendaftaran dan penilaian uji coba |

---

## 📋 Rekomendasi Urutan Eksekusi (Inisialisasi Penuh)

Jika Anda ingin menyiapkan lingkungan pengujian dari kondisi kosong atau reset:

```powershell
# 1. Inisialisasi master data acara, lomba, dan kriteria
npm run db:seed

# 2. Inisialisasi akun peran (Admin, Panitia, Juri, Media)
npm run db:seed-users

# 3. Inisialisasi peserta simulasi & pendaftaran lomba
npm run db:seed-simulation
```

---

## 🔍 Detail Setiap Skrip

### 1. `npm run db:seed` (`scripts/seed.mjs`)
- **Tabel yang Diisi:**
  - `event_settings`: Pengaturan umum acara, kontak panitia, master instansi, tema panggung.
  - `competitions`: 8 cabang lomba (Baca Puisi, Monolog, Pidato/Duta Bahasa, Musikalisasi Puisi, Menulis Cerpen, Debat Bahasa, Pewarta Berita/MC, Cipta Pantun).
  - `criteria`: Kriteria penilaian beserta bobot persentase masing-masing lomba.
  - `cultural_stands`: 8 stan budaya daerah (Aceh, Minangkabau, Sunda, Jawa, Bali, Dayak, Toraja, Papua) beserta kode token.
  - `schedules`: Rundown panggung utama dan panggung ekspresi budaya.
  - `announcements`: Warta dan pengumuman resmi acara.
- **Konfigurasi Environment:** Otomatis membaca `.env.production` atau `.env.local`.

---

### 2. `npm run db:seed-users` (`scripts/seed-users.mjs`)
- Mendaftarkan akun ke **Supabase Auth** (`auth.users`) dan tabel **`public.profiles`**.
- Akun terkonfirmasi otomatis (`email_confirm: true`).
- **Default Password:** `rahasia123`

#### Daftar Akun Resmi:
| Email | Nama Lengkap | Peran (*Role*) | Institusi / Keterangan |
|---|---|---|---|
| `admin@gebyarbulanbahasa.id` | Super Administrator | `super_admin` | Panitia Pusat |
| `acara@gebyarbulanbahasa.id` | Seksi Acara & Operasional | `seksi_acara` | Panitia Pelaksana |
| `juri.siti@gebyarbulanbahasa.id` | Dr. Siti Nurhaliza, M.Pd. | `juri` | UNJ - Dewan Juri Puisi |
| `juri.bambang@gebyarbulanbahasa.id` | Drs. Bambang Pamungkas, M.Sn. | `juri` | ISI - Dewan Juri Monolog |
| `media@gebyarbulanbahasa.id` | Tim Media Center & Monitor | `media_center` | Divisi Publikasi |
| `ahmad.fauzan@sman1bdg.sch.id` | Ahmad Fauzan Ramadhan | `peserta` | SMAN 1 Bandung |

---

### 3. `npm run db:seed-simulation` (`scripts/seed-simulation.mjs`)
- Menghasilkan **25 peserta simulasi** dengan karakteristik realistis.
- **Aturan Integritas Data:**
  - Asal sekolah 100% diambil dari Master Sekolah aktif di `/dashboard/instansi` (`event_settings.master_institutions`).
  - 1 peserta hanya terdaftar pada 1 cabang lomba.
  - Mendukung lomba individu maupun kelompok/beregu (dilengkapi data anggota tim di `registration_members`).
  - Menyiapkan data pendaftaran terverifikasi (`terverifikasi`) dan draft/final penilaian juri untuk menguji papan skor serta rekapitulasi.
- **Default Password Peserta:** `Peserta2026!`

---

## 🛠️ Catatan & Troubleshooting

1. **Variabel Lingkungan (*Environment Variables*):**
   Pastikan file `.env.production` atau `.env.local` di root proyek memiliki konfigurasi berikut:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJh... (Service Role Key dengan hak admin)
   ```
2. **Koneksi Supabase:**
   Jika muncul peringatan error koneksi atau izin ditolak (*permission denied*), pastikan `SUPABASE_SERVICE_ROLE_KEY` yang digunakan adalah **Service Role (Secret)**, bukan Anon Key.
3. **Reset Data:**
   Jika ingin mengosongkan data simulasi pendaftaran dan penilaian tanpa menghapus master lomba, jalankan:
   ```powershell
   node scripts/cleanup-test-data.mjs
   ```
