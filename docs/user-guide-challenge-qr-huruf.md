# Panduan Pengguna & Panitia: Challenge QR Huruf (Jelajah Aksara)

**Aplikasi:** GebyarBulanBahasa  
**Fitur:** Gamifikasi Jelajah Aksara (Berburu Token QR Huruf & Penyusunan Kalimat)  
**Tautan Peserta:** [http://localhost:3000/peserta/challenge/qr-huruf](http://localhost:3000/peserta/challenge/qr-huruf)  
**Tautan Panitia / Admin:** [http://localhost:3000/dashboard/challenge/qr-huruf](http://localhost:3000/dashboard/challenge/qr-huruf)  

---

## 1. Ikhtisar Fitur (Overview)

**Challenge QR Huruf (Jelajah Aksara)** adalah fitur gamifikasi eksploratif interaktif yang dirancang untuk meramaikan lokasi acara *Gebyar Bulan Bahasa dan Kebudayaan*. 

Peserta diajak untuk melakukan *treasure hunt* (perburuan stiker QR) yang tersebar di berbagai sudut venue festival (seperti stand pameran, area photobooth, panggung utama, dan taman baca). Setiap stiker QR mewakili satu token huruf. Setelah mengumpulkan seluruh token huruf yang diperlukan, peserta menyusunnya menjadi rahasia frasa target (contoh: **"BULAN BAHASA"**) dan mengklaim **+100 Poin Hadiah** yang langsung masuk ke saldo poin peserta.

---

## 2. Panduan Peserta (User Guide)

### A. Mengakses Halaman Challenge
1. Buka aplikasi web peserta di smartphone Anda.
2. Pilih menu **Daftar Challenge** atau langsung akses URL:  
   `http://localhost:3000/peserta/challenge/qr-huruf`
3. Halaman akan menampilkan tantangan aktif **"Jelajah Aksara: Misteri Bulan Bahasa"** beserta:
   - **Kartu Ringkasan Progres:** Jumlah huruf terkumpul (misal: `4 / 11 Huruf`).
   - **Hadiah Poin:** Jumlah poin yang didapatkan saat berhasil menyelesaikan (`+100 Poin`).
   - **Papan Inventaris Huruf:** Daftar kartu huruf yang sudah dan belum ditemukan.

---

### B. Cara Memindai QR Code di Area Acara

Di berbagai titik lokasi festival, terdapat stiker QR Code bertuliskan **"Token Aksara Gebyar Bulan Bahasa"**.

#### Pilihan 1: Menggunakan Kamera Smartphone (Auto-Scan)
1. Pada halaman Challenge, klik tombol utama **"Buka Kamera Scan QR"**.
2. Jika browser meminta izin akses kamera:
   - Pilih **"Izinkan"** (*Allow*).
3. Arahkan kamera smartphone ke stiker QR Code di lokasi stand/pos.
4. Kamera akan memindai secara otomatis (*real-time*):
   - Jika QR valid dan belum pernah diklaim, muncul efek getar/suara konfirmasi dan pesan sukses:  
     🟢 **"Huruf 'B' Berhasil Dikumpulkan! (Pos: Pintu Masuk Utama)"**
   - Huruf yang baru didapatkan akan otomatis masuk ke **Inventaris Huruf** Anda.

#### Pilihan 2: Menggunakan Input Kode Manual (Fallback)
Jika lokasi stiker QR kurang pencahayaan, lensa kamera bermasalah, atau stiker sedikit terkelupas:
1. Klik tombol **"Input Kode Manual"** pada modal scan atau di bagian bawah halaman.
2. Masukkan **Kode Unik 6 Karakter** atau **Token QR** yang tertera di bagian bawah stiker QR (Contoh: `GBB-LET-A1` atau `QR-HURUF-B-01`).
3. Klik **"Klaim Huruf"**.

---

### C. Menyusun Kalimat & Mengklaim Poin Hadiah

1. Setelah mengumpulkan huruf yang dibutuhkan, gulir ke bagian **"Meja Penyusun Kalimat"**.
2. Klik atau seret kartu huruf dari inventaris ke slot kata yang kosong sesuai perkiraan frasa target (contoh: `B - U - L - A - N   B - A - H - A - S - A`).
3. Jika terdapat huruf yang salah posisi, klik huruf di slot untuk mengembalikannya ke inventaris.
4. Setelah seluruh slot terisi dengan benar, klik tombol **"Kirim Jawaban & Klaim Poin"**.
5. **Verifikasi & Feedback:**
   - **Jawaban Benar:** Tampil modal ucapan selamat dengan animasi kembang api digital, dan **+100 Poin** langsung ditambahkan ke akun Anda.
   - **Jawaban Salah:** Tampil pesan petunjuk untuk memeriksa kembali urutan huruf.

---

### D. Memeriksa Riwayat & Poin
* Saldo poin yang berhasil diklaim dapat dicek pada menu **Beranda Peserta** (`/peserta`) atau **Riwayat Poin** (`/peserta/riwayat-poin`).
* Poin dapat ditukarkan dengan berbagai suvenir menarik di **Katalog Reward** (`/peserta/reward`).

---

## 3. Panduan Panitia & Admin (Admin Guide)

Panitia Seksi Acara dan Admin Sistem bertugas mengelola tantangan, mengunduh/mencetak kode QR, serta memantau keterlibatan peserta.

### A. Mengakses Dashboard Pengelolaan
1. Login dengan akun bertipe `admin` atau `seksi_acara`.
2. Masuk ke halaman pengelolaan Challenge QR Huruf:  
   `http://localhost:3000/dashboard/challenge/qr-huruf`

---

### B. Membuat Challenge QR Huruf Baru
1. Klik tombol **"+ Tambah Challenge Baru"**.
2. Isi formulir pembuatan tantangan:
   - **Judul Challenge:** Contoh: `Jelajah Aksara: Misteri Bulan Bahasa`.
   - **Deskripsi:** Petunjuk singkat untuk peserta.
   - **Frasa Target:** Kata/Kalimat rahasia (Contoh: `BULAN BAHASA`).  
     *Sistem secara otomatis mengekstrak seluruh huruf alfabet A-Z dari frasa target menjadi token QR individual.*
   - **Hadiah Poin:** Total poin yang diberikan saat peserta berhasil menyelesaikan (Contoh: `100`).
   - **Status:** Centang `Aktifkan Challenge`.
3. Klik **"Simpan & Generate Token QR"**.

---

### C. Mengatur Petunjuk Lokasi (*Location Hints*) & Cetak Stiker
1. Pada daftar tantangan, klik ikon **"Kelola Token Huruf"**.
2. Setiap huruf akan memiliki **Token QR Unik** dan **Kode Unik 6 Karakter** (misal: `GBB-LET-A1`).
3. Isi kolom **Petunjuk Lokasi / Stand** untuk masing-masing huruf (Contoh: `Pos Stand Buku`, `Area Photobooth`, `Kantin Budaya`).
4. Klik tombol **"Cetak / Unduh Stiker QR"**:
   - Sistem akan menghasilkan dokumen siap cetak (PDF/Gambar) berisikan QR Code, kode manual 6-karakter, nama pos, dan logo acara.
5. Tempelkan stiker di lokasi yang telah ditentukan.

---

### D. Memantau Hasil Submission & Papan Skor
1. Buka tab **"Riwayat Submission Peserta"**.
2. Panitia dapat melihat data *real-time*:
   - Nama Peserta & Asal Instansi/Sekolah.
   - Waktu penyelesaian (durasi pengerjaan).
   - Jawaban yang dikirimkan.
   - Status keabsahan (Benar/Salah).
3. Data ini juga terintegrasi otomatis dengan **Papan Skor Poin Utama** (`/papan-skor` & `/leaderboard`).

---

## 4. Panduan Troubleshooting Lapangan (Troubleshooting Guide)

| Masalah / Kendala | Penyebab Utama | Solusi & Langkah Penanganan |
|---|---|---|
| **Kamera tidak muncul / layar hitam saat klik Scan QR** | Izin kamera diblokir oleh browser smartphone. | 1. Klik ikon gembok/pengaturan di address bar browser.<br>2. Cari menu **Permissions / Izin** -> **Kamera** -> ubah ke **Allow / Izinkan**.<br>3. Muat ulang (*refresh*) halaman web dan coba lagi. |
| **Kamera tidak bisa fokus pada stiker QR** | Pencahayaan minim atau lensa kamera kotor/pantulan cahaya. | 1. Bersihkan lensa kamera smartphone.<br>2. Jauhkan atau dekatkan jarak HP sekitar 15–30 cm dari stiker.<br>3. Jika masih gagal, gunakan **Input Kode Manual 6-Karakter**. |
| **Gagal Klaim: "Kode QR sudah pernah kamu scan"** | Peserta mencoba memindai stiker huruf yang sama dua kali. | Sistem mencegah duplikasi scan. Informasikan ke peserta bahwa huruf tersebut sudah tersimpan di inventarisnya dan mintalah peserta mencari stiker huruf lainnya. |
| **Stiker QR di lokasi fisik rusak, basah, atau hilang** | Faktor cuaca atau area ramai pengunjung. | Panitia lokasi dapat mengarahkan peserta untuk memasukkan **Kode Unik 6 Karakter** yang tertera di bagian bawah stiker, atau mengganti stiker baru melalui menu cetak admin. |
| **Koneksi internet peserta lambat / terputus** | Sinyal seluler di lokasi lemah. | Aplikasi menggunakan penanganan status jaringan resilient. Minta peserta menunggu hingga indikator sinyal stabil, lalu klik tombol **Coba Lagi / Retry** tanpa perlu melakukan scan ulang dari awal. |
| **Poin tidak bertambah setelah jawaban benar** | Sesi login peserta telah kedaluwarsa. | Minta peserta melakukan *refresh* halaman atau login ulang ke akun peserta, lalu periksa **Riwayat Poin** (`/peserta/riwayat-poin`). |

---

## 5. Ringkasan Teknis (Developer Context)

* **Route Peserta:** `src/app/peserta/challenge/qr-huruf/page.tsx`
* **Route Admin:** `src/app/dashboard/challenge/qr-huruf/page.tsx`
* **Server Actions:** `src/app/actions/qr-huruf.ts`
  - `getActiveQrChallenge()`: Mengambil data tantangan aktif & token huruf.
  - `getParticipantCollectedLetters()`: Mengambil inventaris huruf milik peserta.
  - `scanQrLetterToken(qrToken)`: Memvalidasi scan token QR atau kode manual 6-karakter.
  - `submitWordArrangement(challengeId, phrase)`: Memvalidasi susunan frasa & menambahkan +100 Poin secara atomic.
  - `getAdminQrChallenges()`, `createQrChallenge()`: Pengelolaan admin.

---
*Dokumen ini disusun sebagai panduan resmi operasional fitur Gamifikasi Challenge QR Huruf pada Gebyar Bulan Bahasa.*
