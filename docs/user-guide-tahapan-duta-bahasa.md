# Panduan Penggunaan: Sistem Tahapan Lomba Duta Bahasa & Budaya

Dokumen ini berisi panduan lengkap penggunaan fitur **Tahapan Lomba Duta Bahasa dan Budaya** pada aplikasi **Gebyar Bulan Bahasa & Kebudayaan**.

---

## 📌 Daftar Isi
1. [Konsep & Alur Lomba](#1-konsep--alur-lomba)
2. [5 Tahapan Resmi & Jadwal Pelaksanaan](#2-5-tahapan-resmi--jadwal-pelaksanaan)
3. [Panduan untuk Panitia / Admin (Seksi Acara)](#3-panduan-untuk-panitia--admin-seksi-acara)
   - [Akses Halaman](#akses-halaman)
   - [Mengubah Status Tahapan](#mengubah-status-tahapan)
   - [Menambahkan Peserta](#menambahkan-peserta)
   - [Menilai & Mengupdate Kelolosan Peserta](#menilai--mengupdate-kelolosan-peserta)
   - [Mekanisme Prerequisite (Sistem Gugur)](#mekanisme-prerequisite-sistem-gugur)
   - [Menghapus Peserta](#menghapus-peserta)
4. [Panduan untuk Peserta](#4-panduan-untuk-peserta)
   - [Melihat Timeline di Katalog Lomba](#melihat-timeline-di-katalog-lomba)
   - [Memantau Status Kelolosan Pribadi](#memantau-status-kelolosan-pribadi)
5. [Tanya Jawab (FAQ)](#5-tanya-jawab-faq)

---

## 1. Konsep & Alur Lomba

Berbeda dengan cabang perlombaan sekali jalan, **Duta Bahasa dan Budaya** menggunakan format **kompetisi bertingkat (*multi-stage competition*)** dengan sistem gugur. 

- Setiap peserta memulai dari **Tahap 1 (Pendaftaran)**.
- Peserta dinilai secara berkala pada setiap tahap.
- **Hanya peserta yang dinyatakan "Lolos" di tahap sebelumnya yang berhak maju ke tahap berikutnya.**
- Peserta yang tidak memenuhi kualifikasi akan berstatus **"Gugur / Tereliminasi"** dan dikunci pada tahap tersebut.

---

## 2. 5 Tahapan Resmi & Jadwal Pelaksanaan

| No | Nama Tahapan | Jadwal Resmi | Deskripsi Kegiatan |
|---|---|---|---|
| **1** | **Pendaftaran** | Sabtu, 10 Oktober 2026 | Pengumpulan data peserta, formulir resmi, berkas persyaratan, dan foto profil. |
| **2** | **Seleksi Administrasi & Wawancara** | Sabtu, 17 Oktober 2026 | Verifikasi keabsahan dokumen dan wawancara awal wawasan kebahasaan & kebudayaan. |
| **3** | **Seleksi Minat & Bakat** | Sabtu, 24 Oktober 2026 | Unjuk kebolehan dan bakat seni, literasi, atau diplomasi budaya peserta. |
| **4** | **Pengumuman 3 Besar** | Sabtu, 31 Oktober 2026 | Penetapan dan pengumuman 3 finalis utama yang melaju ke babak puncak. |
| **5** | **Grand Final Penetapan Juara** | Rabu, 11 November 2026 | Penampilan akhir di panggung utama dan penobatan Duta Bahasa dan Budaya terpilih. |

---

## 3. Panduan untuk Panitia / Admin (Seksi Acara)

### Akses Halaman
1. Masuk ke Dashboard sebagai **Seksi Acara**.
2. Di sidebar navigasi sebelah kiri, klik menu **"Tahapan Duta Bahasa"** pada kelompok *OPERASIONAL LOMBA*.
   *(Atau buka langsung URL: `/dashboard/lomba/duta-bahasa`)*.
3. Anda juga dapat mengaksesnya melalui tombol **"Tahapan Duta Bahasa"** di bagian atas halaman [Monitoring Lomba](/dashboard/lomba).

---

### Mengubah Status Tahapan
Di bagian **"Alur Tahapan Resmi"**, panitia dapat mengatur fase setiap tahapan:
1. Pilih salah satu tahapan pada tab bar (Tahap 1 s.d. 5).
2. Pada menu drop-down status tahapan di sebelah kanan judul tahap, pilih status:
   - **Akan Datang (*Upcoming*)**: Tahap belum dimulai.
   - **Sedang Berlangsung (*Active*)**: Tahap sedang berjalan (akan ditandai efek visual aktif di publik).
   - **Selesai (*Completed*)**: Tahap telah selesai dievaluasi.
3. Sistem akan otomatis menyimpan status dan memperbarui tampilan publik.

---

### Menambahkan Peserta
Untuk mendaftarkan peserta yang telah terdaftar di database ke dalam cabang Duta Bahasa:
1. Klik tombol **"+ Tambah Peserta"** di bagian kanan atas daftar peserta.
2. Pilih nama peserta dari daftar drop-down (hanya menampilkan peserta yang belum terdaftar di Duta Bahasa).
3. Klik **"Tambahkan ke Duta Bahasa"**.
4. Peserta akan otomatis masuk ke **Tahap 1 (Pendaftaran)** dengan status awal *Terdaftar*.

---

### Menilai & Mengupdate Kelolosan Peserta
1. Pilih tahapan yang sedang dinilai pada tab bar.
2. Cari nama peserta di tabel tahapan tersebut, lalu klik tombol **"Update Status"**.
3. Pada dialog yang muncul:
   - **Status Kelolosan**:
     - `Lolos Tahap Ini`: Peserta dinyatakan lulus dan berhak lanjut ke tahap berikutnya.
     - `Gugur / Tereliminasi`: Peserta tidak lolos ke tahap berikutnya.
     - `Dalam Penilaian`: Sedang dalam proses review dewan juri.
     - `Terdaftar`: Status awal pendaftaran.
   - **Nilai Angka (Opsional)**: Masukkan skor nilai juri (skala 0–100).
   - **Catatan / Evaluasi Juri**: Masukkan umpan balik atau catatan juri (misal: *"Wawasan kebahasaan sangat baik, artikulasi jelas"*).
4. Klik **"Simpan Perubahan"**.

---

### Mekanisme Prerequisite (Sistem Gugur)
Sistem memiliki pengaman bawaan (*guard validation*):
- Jika panitia mencoba mengubah status peserta di Tahap 3, namun peserta tersebut belum dinyatakan **"Lolos"** di Tahap 2, sistem akan menolak dan menampilkan pesan peringatan:
  > *"Peserta belum lolos tahap 'Seleksi Administrasi dan Wawancara' (tahap 2). Tidak bisa mengupdate tahap 3."*
- Hal ini menjamin integritas data kompetisi agar tidak ada peserta yang melompat tahapan tanpa lolos seleksi sebelumnya.

---

### Menghapus Peserta
Jika ada peserta yang mengundurkan diri atau salah dimasukkan:
1. Buka tab **"Semua Peserta"** pada tabel peserta.
2. Klik tombol **Hapus** (ikon tempat sampah) di baris peserta terkait.
3. Konfirmasikan dialog penghapusan.

---

## 4. Panduan untuk Peserta

### Melihat Timeline di Katalog Lomba
1. Buka menu publik **Lomba** $\rightarrow$ pilih **Duta Bahasa** (`/lomba/duta-bahasa`).
2. Di bawah kartu informasi lomba, terdapat widget interaktif **"Tahapan & Alur Lomba Duta Bahasa"**.
3. Peserta dan publik dapat mengklik masing-masing kartu tahapan untuk membaca deskripsi kegiatan, tanggal resmi, dan daftar peserta yang sedang berkompetisi di tahap tersebut.

---

### Memantau Status Kelolosan Pribadi
1. Masuk ke akun peserta di menu **Masuk**.
2. Buka menu **Pendaftaran Lomba** (`/peserta/pendaftaran`).
3. Pada kartu pendaftaran Duta Bahasa, peserta dapat melihat:
   - **Status Kelolosan Terkini** (*Lolos / Gugur / Dalam Penilaian*).
   - **Posisi Tahap Saat Ini** (contoh: *"Anda berada pada tahap ke-3: Seleksi Minat dan Bakat"*).
   - **Nilai & Catatan Juri** yang diberikan pada setiap tahapan.

---

## 5. Tanya Jawab (FAQ)

**Q: Apakah perubahan status kelolosan peserta langsung terlihat di halaman peserta?**  
*A: Ya, status tersinkronisasi secara real-time dan halaman peserta akan otomatis merefleksikan hasil evaluasi terbaru.*

**Q: Apakah data penilaian dan tahapan hilang jika server di-restart?**  
*A: Tidak. Seluruh konfigurasi tahapan dan progres nilai tersimpan secara permanen di database Supabase.*

**Q: Bagaimana jika jadwal tahapan diundur atau dimajukan oleh panitia?**  
*A: Tanggal dan hari pelaksanaan pada setiap tahapan dapat disesuaikan langsung oleh pengembang atau melalui konfigurasi event settings tanpa merusak riwayat nilai peserta.*
