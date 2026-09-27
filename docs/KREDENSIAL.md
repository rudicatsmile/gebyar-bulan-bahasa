# Daftar Kredensial & Hak Akses Pengguna
**Aplikasi:** GebyarBulanBahasa — Sistem Penilaian Digital & Dashboard Operasional Acara  
**Tema:** *"Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia."*  
**Peringatan:** Hari Sumpah Pemuda

---

## 🌐 Tautan Masuk Sistem
* **Aplikasi Web (Production):** [https://gebyar-bulan-bahasa.vercel.app/masuk](https://gebyar-bulan-bahasa.vercel.app/masuk)
* **Lingkungan Lokal:** [http://localhost:3000/masuk](http://localhost:3000/masuk)
* **Database & Auth:** Supabase Cloud PostgreSQL ([`lumrqtxmdcrjxjxzrqau.supabase.co`](https://lumrqtxmdcrjxjxzrqau.supabase.co))

> **Catatan Kata Sandi:**  
> Seluruh akun resmi default telah diseragamkan dengan kata sandi:  
> 🔑 **`rahasia123`**

---

## 👥 Tabel Kredensial Akun Resmi

| No | Peran (Role) | Nama Pengguna | Alamat Email | Kata Sandi | Halaman Utama / Route |
|:--:|---|---|---|:---:|---|
| 1 | **Super Admin** | Super Administrator | `admin@gebyarbulanbahasa.id` | `rahasia123` | [`/dashboard`](https://gebyar-bulan-bahasa.vercel.app/dashboard) |
| 2 | **Seksi Acara (Admin)** | Panitia Pelaksana Operasional | `acara@gebyarbulanbahasa.id` | `rahasia123` | [`/dashboard`](https://gebyar-bulan-bahasa.vercel.app/dashboard) |
| 3 | **Dewan Juri 1** | Dr. Siti Nurhaliza, M.Pd. | `juri.siti@gebyarbulanbahasa.id` | `rahasia123` | [`/juri`](https://gebyar-bulan-bahasa.vercel.app/juri) |
| 4 | **Dewan Juri 2** | Drs. Bambang Pamungkas, M.Sn. | `juri.bambang@gebyarbulanbahasa.id` | `rahasia123` | [`/juri`](https://gebyar-bulan-bahasa.vercel.app/juri) |
| 5 | **Media Center** | Divisi Media & Publikasi | `media@gebyarbulanbahasa.id` | `rahasia123` | [`/media`](https://gebyar-bulan-bahasa.vercel.app/media) |
| 6 | **Peserta Acara** | Ahmad Fauzan Ramadhan (SMAN 1 Bandung) | `ahmad.fauzan@sman1bdg.sch.id` | `rahasia123` | [`/peserta`](https://gebyar-bulan-bahasa.vercel.app/peserta) |

---

## 🛡️ Rincian Hak Akses & Fitur per Peran

### 1. Seksi Acara (`seksi_acara` / `super_admin`)
Akun penanggung jawab utama operasional perlombaan dan panggung.
* **Email:** `acara@gebyarbulanbahasa.id`
* **Fitur Utama:**
  * **Monitoring Lomba (`/dashboard/lomba`):** Membuka/menutup pendaftaran lomba, mengaktifkan status lomba berlangsung, dan menyelesaikan sesi perlombaan.
  * **Verifikasi Berkas (`/dashboard/peserta/verifikasi`):** Validasi identitas peserta (NISN, kartu pelajar, surat rekomendasi).
  * **Manajemen Panggung & Jadwal (`/dashboard/jadwal`):** Mengatur rundown sesi panggung utama & panggung budaya dengan validasi anti-bentrok.
  * **Kriteria Penilaian (`/dashboard/kriteria`):** Mengatur komponen kriteria berbobot (wajib akumulasi 100%).
  * **Rekap Nilai & Pemenang (`/dashboard/penilaian`, `/dashboard/pemenang`):** Memantau skor juri secara real-time dan menerbitkan surat keputusan juara ke publik dan monitor venue.
  * **Siaran & Pengumuman (`/dashboard/pengumuman`, `/dashboard/broadcast`):** Menerbitkan siaran informasi resmi dan siaran peringatan darurat ke layar monitor panggung.

### 2. Dewan Juri (`juri`)
Akun khusus dewan juri untuk melakukan penilaian langsung (*digital scoring sheet*).
* **Email Juri Puisi:** `juri.siti@gebyarbulanbahasa.id`
* **Email Juri Monolog:** `juri.bambang@gebyarbulanbahasa.id`
* **Fitur Utama:**
  * **Daftar Lomba Ditugaskan (`/juri`):** Menampilkan cabang perlombaan yang menjadi tanggung jawab juri.
  * **Lembar Penilaian Digital (`/juri/penilaian/[id]`):** Antarmuka penilaian responsif dengan input skor per kriteria, validasi bobot otomatis, serta kolom catatan kritik dan saran.
  * **Riwayat Penilaian (`/juri/riwayat`):** Mengaudit kembali skor yang telah dikirimkan secara final ke server.

### 3. Media Center (`media_center`)
Akun untuk mengelola informasi visual, monitor panggung, dan media sosial acara.
* **Email:** `media@gebyarbulanbahasa.id`
* **Fitur Utama:**
  * **Kendali Monitor Lapangan (`/media/monitor`):** Mengatur modul layar TV venue (Slide informasi, Leaderboard, Galeri Twibbon, Broadcast).
  * **Playlist Layar Venue (`/media/konten-monitor`):** Mengatur urutan dan durasi tayang konten digital.
  * **Moderasi Twibbon (`/media/twibbon`):** Meninjau dan menyetujui foto twibbon kiriman peserta sebelum tampil di layar raksasa.
  * **Galeri Dokumentasi (`/media/galeri`):** Mengunggah foto dan video sorotan kegiatan acara.

### 4. Peserta Acara (`peserta`)
Akun peserta lomba dan pengunjung interaktif peringatan Bulan Bahasa.
* **Email:** `ahmad.fauzan@sman1bdg.sch.id`
* **No. Registrasi:** `GBB-PES-1001`
* **Fitur Utama:**
  * **Beranda Peserta (`/peserta`):** Dashboard status partisipasi, saldo poin gamifikasi, dan pintasan modul.
  * **Pendaftaran Cabang Lomba (`/peserta/pendaftaran`):** Mendaftarkan diri atau tim ke 8 cabang lomba (maksimal 3 lomba per peserta).
  * **Scan QR & Kode Stand Budaya (`/peserta/scan`):** Memindai barcode atau mengetikkan kode unik meja stand budaya untuk mengklaim poin kunjungan.
  * **Tukar Hadiah (`/peserta/reward`):** Menukarkan akumulasi poin dengan merchandise resmi (totebag batik, buku sastra, pin Sumpah Pemuda).
  * **Twibbon Virtual (`/peserta/twibbon`):** Membuat foto twibbon bertema Sumpah Pemuda dan mengunggah ke galeri publik.

---

## 🎯 Kode Unik Stand Budaya (Gamifikasi Poin)
Bila menguji fitur penambahan poin peserta di modul [`/peserta/scan`](https://gebyar-bulan-bahasa.vercel.app/peserta/scan), masukkan salah satu kode unik 6 karakter berikut:

| Kode Stand | Nama Stand Budaya | Poin per Kunjungan |
|:---:|---|:---:|
| `PUISI01` | Stand Cabang Membaca Puisi | +10 Poin |
| `FILM02` | Stand Eksibisi Film Pendek | +10 Poin |
| `PIDATO03` | Stand Orasi & Pidato Kebangsaan | +10 Poin |
| `KANVAS04` | Stand Workshop Melukis Tas Kanvas | +10 Poin |
| `MONOLOG05` | Stand Seni Teater & Sastra Monolog | +10 Poin |
| `MC06` | Stand Public Speaking & MC Formal | +10 Poin |
| `PINTU07` | Stand Tradisi Budaya Palang Pintu | +10 Poin |
| `VOKAL08` | Stand Musik Tradisional & Vokal Grup | +10 Poin |

---

## ⚙️ Skrip Manajemen Akun (Developer Helper)
Seluruh data akun dapat di-seed ulang kapan saja menggunakan skrip Node.js otomatis yang tersedia di direktori proyek:

```bash
# Men-seed ulang seluruh akun di Supabase Auth & tabel profiles
node scripts/seed-users.mjs

# Men-seed ulang seluruh dataset lomba, kriteria, stan, jadwal, dan pengumuman
node scripts/seed.mjs
```
