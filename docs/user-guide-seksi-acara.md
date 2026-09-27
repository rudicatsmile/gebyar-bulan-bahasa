# Panduan Pengguna: Seksi Acara & Super Admin
**Aplikasi:** GebyarBulanBahasa  
**Peran:** Seksi Acara (`seksi_acara`) & Super Administrator (`super_admin`)  
**Tautan Dashboard:** [https://gebyar-bulan-bahasa.vercel.app/dashboard](https://gebyar-bulan-bahasa.vercel.app/dashboard)

---

## 1. Fungsi & Tanggung Jawab Peran
Seksi Acara bertindak sebagai pengatur utama operasional festival di lapangan. Tanggung jawab meliputi:
1. Mengontrol status pembukaan dan penutupan 8 cabang lomba.
2. Memverifikasi kelayakan berkas administratif peserta.
3. Menata dan memantau rundown panggung utama serta panggung kebudayaan.
4. Menetapkan komponen kriteria penilaian berbobot bagi dewan juri (wajib tepat 100%).
5. Menugaskan dewan juri ke cabang lomba yang sesuai.
6. Merekapitulasi nilai dewan juri secara real-time dan mengawasi disparitas nilai (*gap score*).
7. Menetapkan daftar juara resmi dan menerbitkan pengumuman kemenangan ke layar monitor venue.
8. Menyiarkan informasi warta berkala dan pesan peringatan darurat (*emergency alert*) ke seluruh area venue.

---

## 2. Cara Masuk (Login)
1. Kunjungi halaman login: [https://gebyar-bulan-bahasa.vercel.app/masuk](https://gebyar-bulan-bahasa.vercel.app/masuk).
2. Gunakan salah satu metode berikut:
   * **Metode Cepat (Satu Klik):** Klik tombol kartu **"Seksi Acara (Admin)"** pada kotak *Akun Resmi Uji Coba*. Email dan kata sandi akan terisi otomatis.
   * **Metode Manual:**
     * **Email:** `acara@gebyarbulanbahasa.id` (atau `admin@gebyarbulanbahasa.id` untuk Super Admin)
     * **Kata Sandi:** `rahasia123`
3. Klik tombol **"Masuk ke Dashboard"**. Sistem akan mengautentikasi dan mengarahkan Anda ke panel operasional utama.

---

## 3. Struktur Menu & Navigasi Sidebar

| Bagian Menu | Nama Menu | Tautan Route | Fungsi Utama |
|---|---|---|---|
| **Ringkasan** | Ringkasan Acara | `/dashboard` | Monitoring statistik peserta, lomba aktif, jumlah juri, dan log aktivitas sistem. |
| **Operasional Lomba** | Monitoring Lomba | `/dashboard/lomba` | Mengubah status live cabang lomba (*Draft*, *Pendaftaran*, *Berlangsung*, *Selesai*). |
| | Peserta & Berkas | `/dashboard/peserta` | Direktori seluruh peserta terdaftar beserta detail kontak dan instansi. |
| | Verifikasi Berkas | `/dashboard/peserta/verifikasi` | Validasi kartu pelajar, surat rekomendasi, dan status keabsahan peserta. |
| | Pendaftaran Tim | `/dashboard/pendaftaran` | Pendaftaran manual peserta/tim kelompok oleh panitia. |
| | Manajemen Jadwal | `/dashboard/jadwal` | Pengendalian rundown sesi panggung dengan proteksi bentrok waktu. |
| **Penjurian & Nilai** | Daftar Juri | `/dashboard/juri` | Direktori akun dewan juri terdaftar. |
| | Penugasan Juri | `/dashboard/juri/penugasan` | Memetakan dewan juri ke cabang lomba dan menetapkan Ketua Juri. |
| | Kriteria Penilaian | `/dashboard/kriteria` | Mengatur parameter dan bobot persentase skor penilaian lomba. |
| | Rekap Nilai | `/dashboard/penilaian` | Papan rekapitulasi nilai agregat dewan juri secara langsung. |
| | Penetapan Pemenang | `/dashboard/pemenang` | Menetapkan Juara 1, 2, 3, dan Harapan serta rilis berita acara. |
| **Komunikasi** | Kelola Pengumuman | `/dashboard/pengumuman` | Menerbitkan warta resmi acara ke halaman publik dan monitor venue. |
| | Broadcast Darurat | `/dashboard/broadcast` | Mengirimkan siaran darurat merah kedap-kedip ke layar raksasa venue. |
| **Challenge & Stand** | Daftar Challenge | `/dashboard/challenge` | Mengaktifkan/menonaktifkan tantangan interaktif berhadiah poin. |
| | Kelola 8 Stand | `/dashboard/challenge/stand` | Mengatur kode unik 6 karakter dan token QR meja stan kebudayaan. |
| | Verifikasi Bukti | `/dashboard/challenge/verifikasi` | Menyetujui bukti unggahan tantangan media sosial dari peserta. |
| | Penyesuaian Poin | `/dashboard/challenge/poin` | Penambahan/pengurangan poin manual peserta dengan alasan tercatat. |
| | Katalog Reward | `/dashboard/challenge/reward` | Mengelola kuota dan daftar merchandise penukaran poin. |
| **Sistem** | Moderasi Twibbon | `/dashboard/twibbon` | Menyetujui/menolak foto twibbon peserta sebelum tayang di monitor. |
| | Kelola Pengguna | `/dashboard/pengguna` | Manajemen akun dan penugasan peran (*RBAC*). |
| | Pengaturan Acara | `/dashboard/pengaturan` | Konfigurasi tema acara, tanggal mulai, dan kuota pendaftaran. |

---

## 4. Panduan Langkah Demi Langkah Penggunaan Fitur

### A. Mengubah Status Cabang Lomba
1. Buka menu **Monitoring Lomba** (`/dashboard/lomba`).
2. Cari cabang lomba yang diinginkan (misal: *Membaca Puisi* atau *Melukis Tas Kanvas*).
3. Pada kolom **Status Operasional**, klik tombol status:
   * **Buka Pendaftaran:** Mengaktifkan form pendaftaran publik di `/lomba/[slug]`.
   * **Mulai Lomba (Live):** Menandai lomba sedang berjalan di venue. Status ini mengizinkan dewan juri memasukkan nilai digital.
   * **Selesaikan Lomba:** Mengunci penilaian juri agar rekapitulasi nilai bersifat permanen.
4. Perubahan status langsung tersinkronisasi ke database Supabase dan memicu revalidasi otomatis pada halaman publik dan monitor venue.

---

### B. Menata Kriteria Penilaian Berbobot (Wajib 100%)
1. Buka menu **Kriteria Penilaian** (`/dashboard/kriteria`).
2. Pilih tab cabang lomba di bagian atas (contoh: *Puisi*, *Monolog*, *Vokal Grup*).
3. Periksa status akumulasi bobot pada kotak indikator:
   * **Hijau (100%):** Bobot telah tervalidasi dan siap untuk sesi penilaian juri.
   * **Merah (≠ 100%):** Bobot belum seimbang. Sistem akan melarang penyimpanan sampai total persis 100%.
4. Untuk menambah kriteria baru, klik tombol **"Tambah Kriteria Baru"**:
   * Isi **Nama Kriteria** (contoh: *Penghayatan & Ekspresi*).
   * Isi **Deskripsi Indikator** (aspek penilaian bagi juri).
   * Tentukan **Persentase Bobot (%)** (misal: 30) dan **Skor Maksimal** (default: 100).
   * Klik **"Tambahkan Kriteria"**.
5. Setelah total bobot mencapai tepat 100%, klik tombol **"Simpan ke Database"**. Seluruh kriteria lama akan diperbarui dan tersimpan permanen di Supabase PostgreSQL.

---

### C. Mengelola Jadwal Panggung & Mencegah Bentrok Rundown
1. Buka menu **Manajemen Jadwal** (`/dashboard/jadwal`).
2. Untuk menambah sesi baru, klik **"Tambah Sesi Rundown"**:
   * Tentukan **Panggung Venue** (misal: *Panggung Utama - Gelora Budaya* atau *Panggung Teater & Sastra*).
   * Tentukan **Cabang Lomba / Agenda**.
   * Masukkan **Jam Mulai** dan **Jam Selesai** (format WIB).
   * Klik **"Simpan ke Jadwal Resmi"**.
3. **Proteksi Anti-Bentrok:** Jika Anda memasukkan jadwal pada panggung dan rentang waktu yang sama dengan sesi lain, sistem akan menolak dan memunculkan notifikasi peringatan bentrok panggung (*anti-conflict stage validation*).
4. Untuk memperbarui status sesi di lapangan, klik tombol cepat pada tabel:
   * Klik **"Jalankan Sekarang"** saat peserta/pengisi acara naik ke panggung.
   * Klik **"Selesai"** saat sesi berakhir. Sesi berikutnya akan naik menjadi sorotan (*Now Playing*) di layar monitor venue.

---

### D. Menerbitkan Pengumuman Resmi
1. Buka menu **Kelola Pengumuman** (`/dashboard/pengumuman`).
2. Klik tombol **"Buat Pengumuman Baru"**.
3. Masukkan **Judul Pengumuman**, pilih **Kategori** (*Umum*, *Jadwal*, *Pemenang*, *Penting*), dan ketikkan **Isi Warta Lengkap**.
4. Opsi Penayangan:
   * Centang **"Pin di bagian paling atas"** agar pengumuman berada di urutan teratas beranda publik.
   * Centang **"Tayangkan otomatis pada modul Layar Monitor Lapangan"** agar warta masuk ke rotasi slide monitor TV venue.
5. Klik **"Publikasikan Pengumuman"**.

---

### E. Mengirimkan Siaran Darurat (*Emergency Alert*)
Gunakan fitur ini hanya untuk keadaan mendesak di area festival (misal: anak terpisah dari orang tua, barang berharga tertinggal, instruksi evakuasi, atau pergeseran panggung mendadak).
1. Buka menu **Broadcast Darurat** (`/dashboard/broadcast`).
2. Masukkan pesan singkat, padat, dan jelas pada kotak siaran darurat.
3. Klik tombol **"Kirim Siaran Darurat Sekarang"**.
4. Seketika itu juga, modul Layar Monitor Venue di seluruh panggung akan menampilkan banner merah kedap-kedip berukuran besar berisi pesan Anda.
5. Setelah situasi terkendali, klik **"Hentikan / Hapus Siaran Darurat"** untuk mengembalikan tampilan monitor ke playlist normal.

---

### F. Rekapitulasi Nilai & Penetapan Pemenang
1. Buka menu **Rekap Nilai** (`/dashboard/penilaian`).
2. Pilih cabang lomba untuk melihat tabel matriks skor dari seluruh dewan juri.
3. Periksa indikator **Disparitas Nilai (Gap Score)**:
   * Jika ada selisih skor antar-juri melebihi ambang batas toleransi (misal selisih > 15 poin), baris peserta akan ditandai dengan warna kuning/peringatan agar panitia dapat memfasilitasi musyawarah dewan juri.
4. Buka menu **Penetapan Pemenang** (`/dashboard/pemenang`):
   * Tinjau urutan ranking otomatis berdasarkan rumus kalkulasi rata-rata berbobot.
   * Klik **"Tetapkan Pemenang Resmi"** untuk mengunci nama Juara 1, Juara 2, Juara 3, dan Juara Harapan.
   * Klik **"Publikasikan ke Publik & Monitor"**. Sistem akan otomatis membuat pengumuman resmi dan menampilkannya di halaman publik `/pemenang` serta tayangan selebrasi monitor venue.

---

## 5. Tips & Hal-Hal Kritis yang Perlu Diperhatikan
* ⚠️ **Jangan mengubah kriteria saat lomba sedang berlangsung:** Mengubah bobot saat juri sudah mengirimkan nilai dapat mengubah akumulasi penilaian yang sedang berjalan.
* ⚠️ **Selalu verifikasi berkas sebelum hari perlombaan:** Peserta yang belum berstatus `terverifikasi` tidak dapat dimasukkan ke dalam daftar urutan tampil panggung.
* 💡 **Gunakan Monitor TV Panggung:** Buka tautan `/monitor` di laptop operator panggung yang terhubung ke proyektor/LED videotron agar penonton mendapatkan informasi terkini secara otomatis.
