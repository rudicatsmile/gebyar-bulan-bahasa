# Panduan Pengguna: Peserta Acara & Gamifikasi Stand
**Aplikasi:** GebyarBulanBahasa  
**Peran:** Peserta Acara (`peserta`)  
**Tautan Beranda Peserta:** [https://gebyar-bulan-bahasa.vercel.app/peserta](https://gebyar-bulan-bahasa.vercel.app/peserta)

---

## 1. Selamat Datang di GebyarBulanBahasa!
Sebagai peserta resmi acara *"Gebyar Bulan Bahasa dan Kebudayaan"*, Anda dapat menikmati berbagai fasilitas digital:
1. **Mengikuti Cabang Lomba:** Mendaftar perlombaan individu maupun kelompok secara online.
2. **Perburuan Poin Stand Budaya (Gamifikasi):** Menjelajahi 8 stan pameran kebudayaan, memindai barcode QR, dan mengumpulkan poin partisipasi.
3. **Katalog Penukaran Hadiah (*Reward*):** Menukarkan akumulasi poin dengan suvenir resmi festival.
4. **Twibbon Interaktif:** Membuat foto profil berbingkai estetik bertema Sumpah Pemuda untuk ditayangkan di dinding digital venue.

---

## 2. Cara Registrasi & Masuk ke Akun Peserta

### A. Mendaftar Akun Baru
1. Buka halaman registrasi: [https://gebyar-bulan-bahasa.vercel.app/daftar](https://gebyar-bulan-bahasa.vercel.app/daftar).
2. Isi formulir dengan data yang benar:
   * **Nama Lengkap:** Sesuai kartu identitas / kartu pelajar.
   * **Alamat Email:** Pastikan aktif untuk menerima notifikasi acara.
   * **Nomor WhatsApp / Telepon:** Untuk koordinasi panitia panggung.
   * **Nama Sekolah / Kampus / Instansi:** Asal kontingen.
   * **Kata Sandi:** Minimal 8 karakter.
3. Klik **"Daftar Akun Peserta"**. Anda akan langsung mendapatkan **Nomor Registrasi Unik** (contoh: `GBB-PES-1001`).

### B. Masuk ke Akun (Login)
1. Buka tautan masuk: [https://gebyar-bulan-bahasa.vercel.app/masuk](https://gebyar-bulan-bahasa.vercel.app/masuk).
2. Anda dapat masuk menggunakan:
   * **Pintasan Akun Uji Coba:** Klik kartu **"Peserta Acara"** (Email: `ahmad.fauzan@sman1bdg.sch.id` | Kata Sandi: `rahasia123`).
   * **Akun Pribadi:** Ketikkan email dan password yang Anda daftarkan.
3. Klik tombol **"Masuk ke Dashboard"**.

---

## 3. Menu Navigasi Peserta

| Menu | Tautan Route | Fungsi Utama |
|---|---|---|
| **Beranda Peserta** | `/peserta` | Ringkasan saldo poin terkini, nomor registrasi resmi, dan progres misi festival. |
| **Pendaftaran Lomba** | `/peserta/pendaftaran` | Memilih cabang lomba dan mendaftarkan anggota tim. |
| **Daftar Challenge** | `/peserta/challenge` | Daftar misi eksplorasi budaya berhadiah poin tambahan. |
| **Scan QR Stand** | `/peserta/scan` | Kamera pemindai barcode meja stan atau form input kode unik 6 karakter. |
| **Riwayat Poin** | `/peserta/riwayat-poin` | Rekam jejak seluruh penambahan dan pemotongan poin Anda (*ledger*). |
| **Katalog Reward** | `/peserta/reward` | Daftar hadiah fisik dan voucher yang dapat ditukar dengan poin. |
| **Twibbon Saya** | `/peserta/twibbon` | Generator pembuat foto twibbon Hari Sumpah Pemuda. |
| **Profil Saya** | `/peserta/profil` | Mengubah informasi profil, foto avatar, dan melihat riwayat sertifikat. |

---

## 4. Panduan Fitur & Aktivitas Peserta

### A. Mendaftar ke Cabang Perlombaan
1. Buka menu **Pendaftaran Lomba** (`/peserta/pendaftaran`).
2. Pilih salah satu dari 8 cabang perlombaan yang tersedia:
   * *Membaca Puisi*, *Film Pendek*, *Pidato Bahasa Indonesia*, *Melukis Tas Kanvas*, *Seni Teater Monolog*, *Pembawa Acara (MC) Formal*, *Seni Tradisi Palang Pintu*, atau *Vokal Grup Lagu Daerah*.
3. Aturan Partisipasi:
   * Setiap peserta dapat mendaftar **maksimal hingga 3 cabang lomba**.
   * Untuk lomba kelompok (*Film Pendek*, *Palang Pintu*, *Vokal Grup*), masukkan nama tim dan data anggota (nama lengkap & nomor kartu pelajar).
4. Klik **"Kirim Pendaftaran Lomba"**. Anda akan menerima notifikasi konfirmasi nomor registrasi lomba.

---

### B. Cara Scan QR & Klaim Poin Kunjungan Stand Budaya
Di area pameran festival, terdapat 8 meja stand kebudayaan nusantara. Di setiap meja stand terdapat plakat stiker dengan kode unik dan QR Barcode.

**Langkah Klaim Poin:**
1. Kunjungi salah satu stand budaya.
2. Buka menu **Scan QR Stand** (`/peserta/scan`) di smartphone Anda.
3. **Pilihan 1 — Menggunakan Kamera Pemindai:**  
   * Izinkan browser mengakses kamera smartphone Anda.
   * Arahkan kamera tepat ke barcode QR yang ada di meja stand.
   * Kamera akan otomatis mengenali token dan mengklaim **+10 Poin**.
4. **Pilihan 2 — Menggunakan Kode Unik Manual:**  
   * Jika kamera smartphone Anda mengalami kendala pencahayaan, gulir ke bagian bawah pada formulir **Input Kode Unik Stand Manual**.
   * Ketikkan kode 6 karakter stand tersebut (huruf besar/kecil tidak berpengaruh).
   * Klik **"Klaim 10 Poin Stand Sekarang"**.
5. Muncul banner animasi hijau bertuliskan **"Klaim Poin Berhasil!"**. Saldo poin di akun Anda akan otomatis bertambah seketika.

#### 📋 Daftar Kode Unik 8 Stand Budaya:
| Stand Budaya | Kode Unik 6 Karakter | Hadiah Poin |
|---|:---:|:---:|
| Stand Cabang Membaca Puisi | `PUISI01` | +10 Poin |
| Stand Eksibisi Film Pendek | `FILM02` | +10 Poin |
| Stand Orasi Pidato Kebangsaan | `PIDATO03` | +10 Poin |
| Stand Workshop Melukis Tas Kanvas | `KANVAS04` | +10 Poin |
| Stand Seni Teater & Sastra Monolog | `MONOLOG05` | +10 Poin |
| Stand Public Speaking & MC Formal | `MC06` | +10 Poin |
| Stand Tradisi Palang Pintu | `PINTU07` | +10 Poin |
| Stand Vokal Grup & Musik Nusantara | `VOKAL08` | +10 Poin |

---

### C. Menukarkan Poin dengan Hadiah Resmi (*Merchandise*)
1. Kumpulkan poin sebanyak-banyaknya hingga memenuhi syarat penukaran.
2. Pantau posisi peringkat Anda di papan skor pengunjung: [https://gebyar-bulan-bahasa.vercel.app/leaderboard](https://gebyar-bulan-bahasa.vercel.app/leaderboard).
3. Buka menu **Katalog Reward** (`/peserta/reward`).
4. Pilih suvenir yang kuotanya masih tersedia, contohnya:
   * **Stiker Eksklusif Bulan Bahasa:** 50 Poin
   * **Pin Enamel Sumpah Pemuda:** 100 Poin
   * **Voucher Minuman Budaya Nusantara:** 150 Poin
   * **Totebag Kanvas Edisi Terbatas:** 250 Poin
   * **Buku Antologi Sastra Indonesia:** 350 Poin
5. Klik **"Tukarkan Poin"**. Saldo poin Anda akan dipotong dan sistem akan menerbitkan **Kode Pengambilan Hadiah (*Pickup Code*)** unik (misal: `RWD-7382`).
6. Datanglah ke **Booth Penukaran Merchandise Panitia** di venue dan tunjukkan kode pengambilan tersebut kepada petugas untuk menerima barang fisik Anda.

---

### D. Membuat & Mengunggah Twibbon Acara
1. Buka menu **Twibbon Saya** (`/peserta/twibbon`) atau akses langsung [https://gebyar-bulan-bahasa.vercel.app/twibbon/unggah](https://gebyar-bulan-bahasa.vercel.app/twibbon/unggah).
2. Klik tombol **"Pilih Foto Anda"** untuk mengunggah foto selfie atau foto tim.
3. Geser dan atur perbesaran (*zoom & pan*) foto agar pas di dalam bingkai resmi Hari Sumpah Pemuda.
4. Klik **"Unduh Foto Twibbon"** untuk menyimpan hasil foto ke galeri ponsel Anda (siap diunggah ke Instagram Story atau WhatsApp Status).
5. Klik tombol **"Kirim ke Galeri Acara"** agar foto Anda dapat ditinjau oleh tim Media Center dan berkesempatan ditayangkan di layar videotron raksasa panggung utama!

---

## 5. Tips & Aturan Penting untuk Peserta
* ⚠️ **Aturan Klaim Stand:** Setiap kode stand hanya dapat diklaim **1 kali per akun peserta**. Anda harus menjelajahi stand lain untuk menambah poin lebih banyak.
* 📦 **Kuota Hadiah Terbatas:** Penukaran hadiah menggunakan prinsip *siapa cepat dia dapat* (*first-come, first-served*). Tukarkan poin Anda sebelum kuota suvenir favorit habis.
* 🏆 **Papan Skor Pemenang:** Pengumuman hasil perlombaan resmi akan diterbitkan secara serentak di halaman [https://gebyar-bulan-bahasa.vercel.app/pemenang](https://gebyar-bulan-bahasa.vercel.app/pemenang).
