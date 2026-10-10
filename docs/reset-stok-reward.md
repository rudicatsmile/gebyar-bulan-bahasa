# Panduan & Query SQL Reset Stok Reward

Dokumentasi ini menjelaskan penyebab dan solusi perbaikan untuk kasus **sisa stok reward belum bertambah / kembali penuh** pada halaman katalog reward (`/dashboard/challenge/reward`) setelah dilakukan proses reset data.

---

## 1. Analisis Akar Masalah

Pada aplikasi Gebyar Bulan Bahasa, perhitungan sisa stok merchandise/hadiah dihitung secara dinamis dari tabel `public.rewards`:

$$\text{Sisa Stok Tersedia} = \text{quota} - \text{claimed\_count}$$

- **`quota`**: Total kuota atau jumlah stok awal yang dialokasikan panitia untuk reward tersebut.
- **`claimed_count`**: Counter jumlah unit hadiah yang telah diklaim/ditukar oleh peserta.

### Penyebab Kendala
Ketika pembersihan/reset data dilakukan, data transaksi riwayat di tabel `public.reward_redemptions` telah dihapus. Namun, **kolom `claimed_count` pada tabel `public.rewards` tidak ikut ter-reset ke angka `0`**. Akibatnya, sistem masih menganggap hadiah telah diklaim sebanyak angka `claimed_count` lama sehingga sisa stok tidak bertambah kembali penuh.

---

## 2. Query SQL Solusi di Supabase SQL Editor

Buka dashboard Supabase pada proyek Anda, lalu masuk ke menu **SQL Editor** dan jalankan salah satu query di bawah ini sesuai kebutuhan Anda:

### Opsi A: Reset Total Seluruh Stok Reward (Rekomendasi)
Gunakan opsi ini jika Anda ingin mengembalikan seluruh reward ke kondisi awal (**stok kembali 100% penuh**) dan membersihkan sisa riwayat penukaran:

```sql
-- 1. Bersihkan seluruh sisa riwayat antrean penukaran reward
DELETE FROM public.reward_redemptions;

-- 2. Reset counter klaim pada seluruh katalog reward menjadi 0
UPDATE public.rewards
SET claimed_count = 0;

-- 3. (Opsional) Bersihkan catatan mutasi poin penukaran reward testing lama di ledger poin
DELETE FROM public.point_transactions
WHERE note ILIKE '%Penukaran reward%' OR note ILIKE '%Pengembalian Poin%';
```

---

### Opsi B: Sinkronisasi / Hitung Ulang Berdasarkan Klaim Riil (Recalculate)
Gunakan opsi ini jika ada sebagian klaim yang **masih ingin dipertahankan**, dan Anda ingin counter `claimed_count` sinkron presisi dengan data di tabel `reward_redemptions` (hanya menghitung status `menunggu` dan `diserahkan`):

```sql
-- Hitung ulang claimed_count secara otomatis berdasarkan klaim aktif yang masih ada di database
UPDATE public.rewards r
SET claimed_count = COALESCE((
    SELECT COUNT(*)
    FROM public.reward_redemptions rr
    WHERE rr.reward_id = r.id
      AND rr.status IN ('menunggu', 'diserahkan')
), 0);
```

---

## 3. Query Verifikasi (Pemeriksaan Hasil)

Jalankan query ini untuk memastikan bahwa kolom `claimed_count` dan perhitungan sisa stok sudah sesuai dengan harapan:

```sql
SELECT 
    id,
    name,
    points_required,
    quota AS total_kuota,
    claimed_count AS jumlah_terklaim,
    (quota - claimed_count) AS sisa_stok_tersedia,
    is_active
FROM public.rewards
ORDER BY sort_order ASC, points_required ASC;
```

---

## 4. Langkah Setelah Eksekusi SQL

1. Buka halaman katalog reward di dashboard panitia:  
   `http://localhost:3000/dashboard/challenge/reward` (atau domain live).
2. Lakukan **Refresh** halaman browser.
3. Pastikan teks status stok pada masing-masing kartu hadiah telah kembali normal:
   - **Terklaim**: `0 unit`
   - **Sisa**: `[quota] / [quota] unit`
   - Progress bar kuota berwarna hijau/aksen penuh.
