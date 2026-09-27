# Panduan Pengguna: Dewan Juri (Digital Scoring)
**Aplikasi:** GebyarBulanBahasa  
**Peran:** Dewan Juri (`juri`)  
**Tautan Panel Juri:** [https://gebyar-bulan-bahasa.vercel.app/juri](https://gebyar-bulan-bahasa.vercel.app/juri)

---

## 1. Fungsi & Tanggung Jawab Dewan Juri
Sistem GebyarBulanBahasa menggantikan formulir penilaian kertas konvensional dengan **Lembar Penilaian Digital (*Digital Scoring Sheet*)** real-time. Peran juri adalah:
1. Menilai penampilan peserta lomba sesuai kriteria baku berbobot yang telah disahkan panitia.
2. Memasukkan skor angka objektif (skala 0 - 100) pada tiap indikator penilaian.
3. Memberikan catatan evaluasi, ulasan teknis, dan apresiasi bagi setiap peserta/tim.
4. Mengirimkan nilai akhir (*final submission*) secara aman ke database pusat.

---

## 2. Cara Masuk (Login) ke Panel Juri
1. Buka tautan masuk: [https://gebyar-bulan-bahasa.vercel.app/masuk](https://gebyar-bulan-bahasa.vercel.app/masuk).
2. Anda dapat menggunakan:
   * **Pintasan Satu Klik:** Klik tombol kartu **"Dewan Juri"** pada kotak akun uji coba. Email `juri.siti@gebyarbulanbahasa.id` dan kata sandi otomatis terisi.
   * **Kredensial Resmi Akun Juri:**
     * **Juri Puisi:** `juri.siti@gebyarbulanbahasa.id` (Kata Sandi: `rahasia123`)
     * **Juri Monolog:** `juri.bambang@gebyarbulanbahasa.id` (Kata Sandi: `rahasia123`)
3. Klik tombol **"Masuk ke Dashboard"**. Anda akan diarahkan langsung ke halaman beranda juri di `/juri`.

---

## 3. Menu yang Tersedia untuk Dewan Juri

| Menu | Tautan Route | Deskripsi & Fungsi |
|---|---|---|
| **Lomba Ditugaskan** | `/juri` | Daftar cabang lomba yang menjadi tanggung jawab Anda, status lomba aktif, dan jumlah peserta yang menunggu penilaian. |
| **Riwayat Penilaian** | `/juri/riwayat` | Daftar seluruh peserta yang telah Anda berikan nilai (baik berstatus *Draft* maupun *Final*). |
| **Profil Juri** | `/juri/profil` | Informasi biodata juri, instansi asal, nomor registrasi juri, dan penugasan kategori lomba. |

---

## 4. Alur Kerja & Langkah Pengisian Nilai di Meja Juri

### A. Membuka Lembar Penilaian Peserta yang Tampil
1. Pada halaman **Lomba Ditugaskan** (`/juri`), klik cabang lomba yang sedang berlangsung (misal: *Membaca Puisi*).
2. Anda akan melihat daftar peserta yang diurutkan berdasarkan **Nomor Urut Tampil Panggung**.
3. Cari nama atau nomor registrasi peserta yang saat itu dipanggil naik ke panggung (contoh: *No. Tampil 01 — Ahmad Fauzan Ramadhan*).
4. Klik tombol **"Beri Nilai"** di sebelah kanan nama peserta. Sistem akan membuka lembar penilaian digital peserta tersebut.

---

### B. Mengisi Skor Indikator Kriteria
Lembar penilaian memuat indikator kriteria berbobot resmi sesuai cabang lomba.
Contoh untuk cabang **Membaca Puisi**:
* **Penghayatan & Penjiwaan** (Bobot: 30%, Skor Maks: 100)
* **Vokal, Artikulasi & Intonasi** (Bobot: 25%, Skor Maks: 100)
* **Gestur, Sikap & Ekspresi** (Bobot: 25%, Skor Maks: 100)
* **Ketepatan Tafsir Puisi** (Bobot: 20%, Skor Maks: 100)

**Langkah Penilaian:**
1. Masukkan nilai angka pada setiap kolom kriteria (rentang 0 s.d. 100).
2. **Kalkulasi Otomatis Tanpa Kalkulator:**  
   Saat Anda mengetikkan angka, sistem secara instan menghitung:
   $$\text{Skor Terbobot} = \sum \left( \frac{\text{Skor Input} \times \text{Bobot}}{100} \right)$$
   Total nilai akhir akan langsung terpampang di bagian kartu ringkasan skor sebelah kanan.
3. Tuliskan **Catatan & Ulasan Dewan Juri** pada kolom teks area di bawah kriteria (contoh masukan: *"Vokal sangat prima dan artikulasi jelas, namun pertahankan tempo pada bait ketiga agar tidak terburu-buru"*).

---

### C. Menyimpan Draft vs Mengirimkan Nilai Final
Tersedia dua opsi penyimpanan di bagian bawah lembar penilaian:
1. **Simpan Sebagai Draf (Draft):**
   * Gunakan tombol ini jika peserta masih tampil di panggung atau Anda masih ingin mempertimbangkan nilai sebelum penampilan tuntas.
   * Nilai draft tersimpan aman di database tetapi belum dihitung ke dalam kalkulasi pemenang resmi.
2. **Kirim Nilai Final (Final Submit):**
   * Gunakan tombol ini setelah peserta selesai tampil dan Anda yakin dengan skor yang diberikan.
   * Muncul dialog konfirmasi rincian nilai total. Klik **"Ya, Kirim Nilai Final"**.
   * Status penilaian akan berubah menjadi `final`. Nilai ini secara otomatis masuk ke rekapitulasi panitia dan diperhitungkan dalam agregasi ranking juara.

---

### D. Memeriksa Riwayat Penilaian
1. Buka menu **Riwayat Penilaian** (`/juri/riwayat`).
2. Anda dapat melihat daftar seluruh peserta yang telah Anda nilai, lengkap dengan total poin berbobot dan waktu pengiriman.
3. Terdapat badge status:
   * **HIJAU (FINAL):** Nilai telah dikirim dan sah.
   * **KUNING (DRAFT):** Nilai belum difinalisasi dan masih dapat diedit kembali sebelum sesi lomba ditutup.

---

## 5. Tips Penting bagi Dewan Juri
* 📱 **Kompatibel Tablet & Laptop:** Lembar penilaian dirancang responsif dan nyaman digunakan baik pada layar laptop meja juri maupun tablet sentuh (iPad / Android).
* ⚡ **Koneksi Stabil:** Nilai tersimpan langsung via koneksi server actions. Pastikan perangkat Anda terhubung ke jaringan Wi-Fi venue panitia.
* 🔒 **Koreksi Nilai yang Terlanjur Final:** Untuk menjaga integritas kompetisi, nilai berstatus `final` terkunci dari pengubahan sepihak. Jika Anda melakukan salah ketik yang fatal, segera laporkan ke Seksi Acara di meja kontrol utama untuk dilakukan koreksi administratif resmi dengan pencatatan audit log.
