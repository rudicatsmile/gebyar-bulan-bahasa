# Catatan Developer: Modul Juri (Dewan Juri)

> Audience: developer yang menyentuh fitur penjurian.
> Status: selaras dengan kode per refactor "keterhubungan data juri ↔ pengguna" (perbaikan #1–#3).

## 1. Fakta Kunci: TIDAK Ada Tabel `juri` Terpisah

"Juri" **bukan** entitas tersendiri. Juri adalah baris pada tabel tunggal **`public.profiles`**
dengan `role = 'juri'`. Konsekuensinya:

- Halaman **Pengguna** (`/dashboard/pengguna`) membaca `profiles` **tanpa filter role**
  (`getAllUsers`), sehingga setiap juri otomatis muncul di daftar pengguna.
- Halaman **Juri** (`/dashboard/juri`) membaca subset yang sama: `profiles.eq('role','juri')`.
- Satu juri = satu akun Supabase Auth = satu baris `profiles` (PK `id` sama).

Relasi penugasan/penilaian menunjuk ke `profiles`, bukan ke tabel juri:

| Tabel | Kolom | Reference |
|---|---|---|
| `competition_judges` | `judge_id` | → `profiles(id)` ON DELETE CASCADE |
| `assessments` | `judge_id` | → `profiles(id)` ON DELETE CASCADE |

Enum role (`src/types/database.types.ts`): `super_admin | seksi_acara | juri | media_center | peserta`.

## 2. Peta File

| Peran | Lokasi |
|---|---|
| List + tambah + edit juri | `src/app/dashboard/juri/page.tsx` |
| Matriks penugasan juri × lomba | `src/app/dashboard/juri/penugasan/page.tsx` |
| Aksi: baca/mapping, create, update, save matrix | `src/app/actions/competitions.ts` (`getJudgeAssignmentData`, `createJudgeAccount`, `updateJudgeAccount`, `saveJudgeAssignmentMatrix`) |
| Aksi: ubah role / aktifkan-nonaktifkan pengguna | `src/app/actions/users.ts` (`getAllUsers`, `updateUserRole`, `toggleUserActive`) |
| Upload foto juri | `src/app/actions/settings.ts` (`uploadJudgePhotoAction`) |
| Area kerja juri (menilai) | `src/app/juri/**` |
| Routing login | `src/app/masuk/page.tsx` |
| Skema & RLS | `supabase/migrations/0001_init.sql` |

## 3. Alur Data

### Create juri — `createJudgeAccount`
1. Cari auth user by email (`auth.admin.listUsers`).
2. **Guard baru**: jika email sudah ada TAPI `profiles.role != 'juri'` → **tolak** dengan pesan
   agar ubah peran lewat halaman Pengguna. Mencegah konversi senyap peserta/panitia/admin jadi juri.
3. Jika belum ada → `auth.admin.createUser({ password: "rahasia123", email_confirm: true, user_metadata.role: "juri" })`.
4. `upsert` ke `profiles` (`role='juri'`, `institution = expertise`, `nickname = title`).
5. Revalidate `/dashboard/juri` & `/dashboard/juri/penugasan`.
6. **Penting:** TIDAK menulis `competition_judges`. Juri baru berstatus "belum ditugaskan"
   sampai ditugaskan di matriks. UI menampilkan banner ajakan "Tugaskan Lomba" setelah create.

### Update juri — `updateJudgeAccount`
- Update `profiles` (nama, email, institution, nickname, phone; `avatar_url` hanya jika dikirim).
- Sinkron `auth.admin.updateUserById` (email + metadata) — best-effort (gagal → `console.warn`).
- Revalidate `/dashboard/juri`, `/dashboard/juri/penugasan`, `/dashboard/pengguna`.

### Cabut role juri — `updateUserRole` (modul Pengguna)
- Update `profiles.role` + metadata auth.
- **Guard baru**: jika `newRole != 'juri'` → `delete competition_judges where judge_id = userId`
  (best-effort; kegagalan hanya di-`console.warn`, peran tetap berubah) + revalidate halaman juri.
- Ini mencegah "juri bayangan" tertinggal di matriks/penilaian setelah seseorang bukan juri lagi.
- `assessments` TIDAK dihapus otomatis (data penilaian historis dipertahankan).

### Login juri
- Pakai akun Auth yang sama dengan pengguna lain. Role dibaca dari `profiles`.
- Redirect (`src/app/masuk/page.tsx`): `juri` → `/juri`; `seksi_acara`/`super_admin` → `/dashboard`;
  `media_center` → `/media`; sisanya → `/peserta`.
- Akun `is_active = false` diblokir saat login (kecuali `super_admin` untuk hindari lockout).

### Penugasan — `saveJudgeAssignmentMatrix` (di `/dashboard/juri/penugasan`)
- Menyimpan matriks `judge_id × competition_id` (+ `is_chief_judge`) ke `competition_judges`.

## 4. Pemetaan Field (Gotcha Penamaan)

| Istilah UI | Kolom DB |
|---|---|
| `expertise` (Bidang Keahlian) | `profiles.institution` |
| `title` (gelar/subjudul) | `profiles.nickname` |
| `avatarUrl` | `profiles.avatar_url` |

Jangan tertukar saat menulis query/manual.

## 5. Perubahan Terakhir (perbaikan #1–#5)

1. **#1** `/dashboard/juri` tidak lagi menambal/meng-ini-iasi dengan `JUDGES` dummy. Kini
   sumber tunggal = `profiles` + `competition_judges`, plus state: loading, error, dan
   **empty state** "Belum ada dewan juri".
2. **#2** Setelah create, tampil banner ajakan penugasan; sel "Lomba Ditugaskan" menampilkan
   **"Belum ditugaskan"** (tautan ke matriks) alih-alih `0 Cabang Lomba` yang menyesatkan.
3. **#3** Guard `createJudgeAccount` (email non-juri) + pembersihan `competition_judges` saat
   role juri dicabut di `updateUserRole`.
4. **#4** `/dashboard/juri/penugasan` dibersihkan dari seed dummy: initial state `[]`, `loadData`
   selalu memetakan data nyata dari DB, cabang `defaultChiefMap` + `DUMMY_TO_*` dihapus, ditambah
   skeleton/empty state, banner `loadError`, dan **guard `handleSave`** (tolak simpan saat load
   gagal / belum ada juri / belum ada lomba) untuk mencegah `saveJudgeAssignmentMatrix` yang
   bersifat delete-all menghapus penugasan asli secara tak sengaja.
5. **#5** Guard di level action `saveJudgeAssignmentMatrix`: bila `cleanAssignments.length === 0`
   (payload kosong / semua id tidak valid) operasi **ditolak sebelum delete-all** dijalankan.
   Ini pengaman terakhir terhadap penghapusan massal, termasuk bila pemanggil bukan halaman
   penugasan. Konsekuensi: tidak bisa "mengosongkan seluruh penugasan" lewat matriks dalam satu
   kali simpan — hapus per-juri, atau lakukan penghapusan eksplisit terpisah.

## 6. Known Issues / Hutang Teknis

- ✅ **`/dashboard/juri/penugasan` sudah bersih dari dummy (perbaikan #4)** dan
  `saveJudgeAssignmentMatrix` kini punya **guard anti delete-all saat payload kosong (perbaikan #5)**
  — baik di sisi klien (`handleSave`) maupun di aksi. Catatan: konsekuensi #5, pengosongan
  total semua penugasan tidak bisa dilakukan lewat satu kali simpan matriks.
- **Kolom `avatar_url` fallback**: tanpa foto, UI menampilkan default `title` "Dewan Juri Ahli"
  dan ikon inisial (bukan data fiktif).
- **Race check-then-insert** pada guard create: dua request paralel secara teori bisa lolos cek peran.
  Untuk jaminan ketat, perlu constraint/guard level DB.
- **`createJudgeAccount` hardcode password `rahasia123`** dan `email_confirm: true`. Pertimbangkan
  flow reset-password wajib ganti saat produksi.

## 7. Cara Menguji

- Akun admin/seksi_acara: `admin@gebyarbulanbahasa.id` (lihat `docs/KREDENSIAL.md`).
- Guard create: coba `createJudgeAccount` dengan email milik peserta → harus **gagal** + pesan
  "ubah peran lewat halaman Pengguna".
- Cabut role: di `/dashboard/pengguna`, turunkan role seorang juri → cek `competition_judges`
  milik id itu kosong & `/dashboard/juri/penugasan` tak lagi menampilkan juri tsb.
- Catatan: `rudi@...`/`ahmad.fauzan@...` pada docs lama tampak belum ter-seed; peserta ter-seed
  memakai pola `peserta-1@...`. Pastikan seed (`scripts/seed-users.mjs`) sebelum uji login peserta.

## 8. Aturan Tak Tertulis (Konvensi)

- Jangan tampilkan data dummy untuk menutupi DB kosong (prinsip "avoid masking empty DB").
- Perubahan peran/penugasan wajib `revalidatePath` halaman terkait agar UI sinkron.
- Lint repo menyetop `setState` sinkron di body `useEffect` (`react-hooks/set-state-in-effect`);
  gunakan callback `.then()/.finally()` atau microtask untuk flag seperti `mounted`.
