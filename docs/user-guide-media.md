# Panduan Pengguna: Media Center & Kendali Monitor Venue
**Aplikasi:** GebyarBulanBahasa  
**Peran:** Media Center (`media_center`)  
**Tautan Dashboard Media:** [https://gebyar-bulan-bahasa.vercel.app/media](https://gebyar-bulan-bahasa.vercel.app/media)  
**Tautan Layar Panggung (Digital Signage):** [https://gebyar-bulan-bahasa.vercel.app/monitor](https://gebyar-bulan-bahasa.vercel.app/monitor)

---

## 1. Fungsi & Tanggung Jawab Tim Media Center
Tim Media Center bertanggung jawab atas seluruh publikasi visual digital dan operasional layar panggung festival, meliputi:
1. Mengendalikan tampilan layar monitor TV / LED videotron raksasa di panggung utama dan area venue.
2. Mengelola playlist tayangan otomatis (rundown acara, profil cabang lomba, warta pengumuman, dan leaderboard poin).
3. Melakukan kurasi dan moderasi foto twibbon peserta sebelum disiarkan ke monitor panggung.
4. Mendokumentasikan dan mempublikasikan galeri liputan kegiatan ke halaman publik.

---

## 2. Cara Masuk (Login) ke Panel Media Center
1. Kunjungi halaman login: [https://gebyar-bulan-bahasa.vercel.app/masuk](https://gebyar-bulan-bahasa.vercel.app/masuk).
2. Pilih salah satu cara:
   * **Pintasan Satu Klik:** Klik tombol kartu **"Media Center"** pada kotak akun uji coba.
   * **Input Manual:**
     * **Email:** `media@gebyarbulanbahasa.id`
     * **Kata Sandi:** `rahasia123`
3. Klik tombol **"Masuk ke Dashboard"**. Anda akan diarahkan ke beranda media di `/media`.

---

## 3. Menu yang Tersedia untuk Media Center

| Menu | Tautan Route | Deskripsi & Fungsi |
|---|---|---|
| **Ringkasan Media** | `/media` | Statistik penayangan monitor, jumlah twibbon masuk, dan status display venue. |
| **Konten Acara** | `/media/konten` | Kelola materi slide promosi lomba, profil juri, dan video sorotan. |
| **Pengumuman** | `/media/pengumuman` | Menerbitkan warta pers dan siaran informasi media sosial. |
| **Moderasi Twibbon** | `/media/twibbon` | Ruang kurasi persetujuan foto twibbon kiriman peserta. |
| **Kendali Monitor** | `/media/monitor` | Panel kontrol remote untuk mengubah mode tampilan layar panggung secara instan. |
| **Playlist Monitor** | `/media/konten-monitor` | Pengaturan rotasi slide tayang, durasi detik per slide, dan aktivasi item. |
| **Galeri Foto/Video** | `/media/galeri` | Manajemen album dokumentasi visual festival. |

---

## 4. Panduan Langkah Demi Langkah Fitur Media Center

### A. Mengoperasikan Layar Monitor Venue (Digital Signage)
Di panggung utama dan area publik festival, terdapat layar TV / LED videotron yang menampilkan informasi digital dinamis.

**Langkah Setup Perangkat Panggung:**
1. Pada laptop/komputer panggung yang tersambung ke kabel HDMI LED videotron/proyektor, buka browser dan akses URL:
   👉 **[https://gebyar-bulan-bahasa.vercel.app/monitor](https://gebyar-bulan-bahasa.vercel.app/monitor)**
2. Tekan tombol **F11** pada keyboard untuk beralih ke mode **Fullscreen (Layar Penuh)** tanpa bilah navigasi browser.
3. Layar monitor ini bekerja secara mandiri dan otomatis memperbarui tampilan saat ada pembaruan data dari database (*Supabase Realtime*).

---

### B. Mengubah Mode Tampilan Monitor dari Panel Remote
Dari laptop tim media di ruang kontrol, Anda dapat mengganti mode layar panggung seketika tanpa harus menyentuh laptop panggung:
1. Buka menu **Kendali Monitor** (`/media/monitor`).
2. Pilih mode tampilan yang diinginkan:
   * **Mode Playlist Bergilir (Default):** Layar secara otomatis memutar slide informasi, rundown acara, tata tertib, dan sponsor dengan interval detik yang telah ditentukan.
   * **Mode Panggung Berlangsung (Now Playing):** Menampilkan nama peserta yang sedang tampil di panggung, cabang lomba, dan nomor urut.
   * **Mode Papan Skor Live:** Menampilkan peringkat skor sementara dari cabang lomba yang baru selesai dinilai.
   * **Mode Dinding Galeri Twibbon:** Menampilkan foto-foto twibbon peserta pilihan yang telah disetujui.
   * **Mode Selebrasi Pemenang:** Menampilkan animasi pengumuman Juara 1, 2, 3, dan Harapan lengkap dengan nama instansi dan piala.
3. Klik tombol **"Terapkan ke Layar Monitor"**. Perubahan mode langsung terkirim secara nirkabel ke layar panggung venue.

---

### C. Mengelola Playlist & Durasi Slide Monitor
1. Buka menu **Playlist Monitor** (`/media/konten-monitor`).
2. Anda akan melihat daftar slide yang aktif dalam antrean putar.
3. Untuk mengubah durasi tayang:
   * Sesuaikan angka pada kolom **Durasi (detik)** (misal: slide rundown 15 detik, slide sponsor 10 detik).
4. Untuk menonaktifkan slide tanpa menghapus:
   * Klik tombol toggle switch **Status Aktif** menjadi nonaktif.
5. Untuk menambah slide pengumuman kustom:
   * Klik **"Tambah Slide Playlist"**, unggah gambar banner 16:9 atau ketikkan judul dan teks pengumuman visual, lalu simpan.

---

### D. Memoderasi Foto Twibbon Peserta
Peserta acara dapat membuat foto twibbon di modul peserta dan mengirimkannya ke sistem. Sebelum foto tersebut tayang di layar raksasa venue, tim Media Center wajib melakukan kurasi:
1. Buka menu **Moderasi Twibbon** (`/media/twibbon`).
2. Tab **Menunggu Verifikasi** menampilkan foto-foto kiriman peserta terbaru.
3. Periksa kesesuaian foto:
   * Pastikan wajah terlihat jelas dan tidak mengandung unsur SARA, pornografi, atau konten yang melanggar norma kesopanan.
4. Klik tombol aksi pada kartu foto:
   * **Setujui (Approve):** Foto masuk ke galeri twibbon publik resmi.
   * **Jadikan Unggulan (Featured):** Foto mendapatkan badge emas dan diprioritaskan tampil pada rotasi layar monitor panggung.
   * **Tolak (Reject):** Foto dihapus dari antrean tayang, dengan opsi memilih alasan penolakan (misal: *Foto buram*, *Tidak sesuai tema*, atau *Melanggar norma*).

---

## 5. Tips Operasional untuk Tim Media Center
* 🖥️ **Rekomendasi Resolusi:** Desain slide visual monitor dioptimalkan untuk rasio **16:9** (Full HD 1920x1080 piksel).
* 🔄 **Koneksi Realtime:** Layar monitor dilengkapi heartbeat status koneksi di pojok kanan bawah. Jika indikator berubah menjadi *Disconnected*, cukup muat ulang browser panggung (*Ctrl + R*).
* 🚨 **Penanganan Pesan Darurat:** Jika Seksi Acara mengirimkan pesan *Broadcast Darurat*, layar monitor akan secara otomatis membunyikan animasi banner merah darurat di bagian atas layar. Tim media tidak perlu melakukan intervensi manual karena sistem telah mengaturnya secara prioritas.
