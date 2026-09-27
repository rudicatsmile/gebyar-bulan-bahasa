# Panduan Teknis & Arsitektur Developer
**Aplikasi:** GebyarBulanBahasa  
**Framework:** Next.js 15+ App Router, TypeScript, Supabase, Tailwind CSS  
**Repository:** [https://github.com/rudicatsmile/gebyar-bulan-bahasa.git](https://github.com/rudicatsmile/gebyar-bulan-bahasa.git)

---

## 1. Ringkasan Arsitektur Sistem

GebyarBulanBahasa dibangun dengan arsitektur modern berbasis **Hybrid Rendering (Next.js App Router RSC + Server Actions)** yang berpusat pada keamanan, kecepatan respons, dan integritas data penilaian:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│  Public Pages (ISR/Static)  │  Dashboard Operasional (RSC Force-Dynamic)│
│  Monitor TV (Client Sub)    │  Interactive Client Components (useTransition)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                           MUTATION & ACTION                            │
│           Next.js 15 Server Actions (src/app/actions/*.ts)             │
│        Input Validation (Zod) • RBAC Check • revalidatePath()          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        DATA & INFRASTRUCTURE                           │
│  Supabase Auth (JWT)       │  PostgreSQL 15 (RLS, Views, Triggers)     │
│  Supabase Storage (Assets) │  Supabase Realtime (WebSocket Broadcast)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Struktur Direktori Proyek

```
gebyar-bulan-bahasa/
├── docs/                               # Dokumentasi resmi & panduan pengguna
│   ├── README.md                       # Indeks manual book & arsitektur umum
│   ├── KREDENSIAL.md                   # Daftar akun resmi, password, & kode stand
│   ├── user-guide-seksi-acara.md       # Panduan Seksi Acara & Admin
│   ├── user-guide-juri.md              # Panduan Dewan Juri (Digital Scoring)
│   ├── user-guide-media.md             # Panduan Media Center & Monitor Venue
│   ├── user-guide-peserta.md           # Panduan Peserta & Gamifikasi
│   └── developer-guide.md              # Dokumen panduan teknis developer (Ini)
├── scripts/                            # Skrip otomatisasi & pemeliharaan data
│   ├── seed.mjs                        # Seeder 8 lomba, kriteria, stan, jadwal, pengumuman
│   └── seed-users.mjs                  # Seeder akun resmi ke Supabase Auth & profiles
├── src/
│   ├── app/                            # Next.js 15 App Router Routes
│   │   ├── (public)/                   # Halaman publik: /, /lomba, /jadwal, /pemenang
│   │   ├── actions/                    # Server Actions terisolasi:
│   │   │   ├── announcements.ts        # Publikasi warta & siaran monitor
│   │   │   ├── assessments.ts          # Penjurian digital & deteksi selisih skor
│   │   │   ├── challenges.ts           # Klaim poin stand & katalog reward
│   │   │   ├── competitions.ts         # Status cabang lomba & update kriteria
│   │   │   ├── monitor.ts              # Pengendali digital signage venue
│   │   │   ├── participants.ts         # Registrasi peserta & verifikasi berkas
│   │   │   ├── schedules.ts            # Rundown panggung & anti-conflict stage
│   │   │   ├── twibbon.ts              # Generator & moderasi foto twibbon
│   │   │   └── winners.ts              # Penetapan & rilis juara resmi
│   │   ├── dashboard/                  # Panel Operasional Seksi Acara (Admin)
│   │   ├── juri/                       # Panel Khusus Dewan Juri
│   │   ├── media/                      # Panel Media Center & Dokumentasi
│   │   ├── monitor/                    # Tampilan Fullscreen Monitor Lapangan / Videotron
│   │   ├── peserta/                    # Panel Interaktif Akun Peserta
│   │   ├── masuk/                      # Halaman Login Autentikasi Terintegrasi
│   │   └── daftar/                     # Pendaftaran Akun Peserta Baru
│   ├── components/                     # Atomic Components & Layouts
│   │   ├── ui/                         # Badge, Button, Card, Dialog, Input, Table
│   │   └── layouts/                    # DashboardLayout, AuthLayout
│   ├── hooks/                          # Custom React Hooks (useRealtime.ts)
│   ├── lib/                            # Abstraksi utilitas & konektor Supabase
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser Supabase client (Client Components)
│   │   │   ├── server.ts               # Server Supabase client dengan penanganan cookie
│   │   │   ├── admin.ts                # Service-role Supabase client (Bypass RLS)
│   │   │   ├── public.ts               # Stateless public client (Static / Edge)
│   │   │   ├── queries.ts              # Lapisan query terpadu dengan fallback
│   │   │   └── storage.ts              # Manajemen upload berkas & bucket
│   │   ├── dummy-data.ts               # Dataset acuan tema Sumpah Pemuda & fallback
│   │   └── utils.ts                    # Class merging Tailwind (clsx & twMerge)
│   └── types/                          # Definisi tipe TypeScript & skema database
│       └── database.types.ts           # Skema lengkap hasil generate Supabase CLI
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql               # Skema tabel, ENUM, fungsi RLS, views & triggers
│       └── 0002_seed_full_data.sql     # Skrip migrasi SQL seeder mandiri
└── package.json
```

---

## 3. Prasyarat & Menjalankan Proyek Secara Lokal

### A. Kebutuhan Lingkungan (*Prerequisites*)
* **Node.js:** Versi 18.18.0 atau 20.x+ (Rekomendasi: Node LTS 20.x).
* **Package Manager:** npm versi 9+ atau 10+.
* **Git:** Terpasang pada sistem operasi.

### B. Langkah Instalasi & Menjalankan
1. **Clone Repository:**
   ```bash
   git clone https://github.com/rudicatsmile/gebyar-bulan-bahasa.git
   cd gebyar-bulan-bahasa
   ```

2. **Instal Dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables:**  
   Salin file `.env.example` menjadi `.env.local` (atau periksa `.env.production`):
   ```bash
   cp .env.example .env.local
   ```
   Pastikan variabel kunci terisi (lihat Bagian 4 di bawah).

4. **Seeding Database Supabase (Hanya Dilakukan Sekali):**
   ```bash
   # Seed 8 cabang lomba, kriteria, stan, jadwal, tantangan, dan pengumuman
   node scripts/seed.mjs

   # Seed akun resmi pengujian ke Supabase Auth & profiles
   node scripts/seed-users.mjs
   ```

5. **Jalankan Server Development:**
   ```bash
   npm run dev
   ```
   Buka peramban di [http://localhost:3000](http://localhost:3000).

6. **Memvalidasi Build Produksi:**
   ```bash
   npm run build
   ```
   Memastikan seluruh 59+ rute halaman terkompilasi dengan 0 error.

---

## 4. Daftar Environment Variables

| Variabel | Kebutuhan | Deskripsi & Contoh Nilai |
|---|:---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Wajib** | URL instance Supabase Project (`https://xyz.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Wajib** | Kunci API anonim Supabase (publik, dibatasi oleh RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Wajib (Server)** | Kunci Service Role (rahasia, untuk seeding dan operasi admin). |
| `NEXT_PUBLIC_SITE_URL` | Opsional | URL kanonikal situs (`https://gebyar-bulan-bahasa.vercel.app`). |
| `NEXT_PUBLIC_MAX_COMPETITION_PER_PARTICIPANT` | Opsional | Batas maksimal cabang lomba per peserta (Default: `3`). |
| `RESEND_API_KEY` | Opsional | Kunci API Resend untuk notifikasi email kredensial juri. |
| `EMAIL_FROM` | Opsional | Alamat pengirim email notifikasi (`noreply@domain.com`). |

---

## 5. Alur Teknis Fitur-Fitur Penting

### A. Kalkulasi Skor & Algoritma Penjurian
* **Struktur Kriteria:**  
  Setiap cabang lomba memiliki relasi ke tabel `competition_criteria` dengan kolom `weight` (numeric) dan `max_score` (numeric, default 100).
* **Validasi Bobot:**  
  Server Action `updateCompetitionCriteria` di [`src/app/actions/competitions.ts`](file:///d:/project/web/energies/gebyar-bulan-bahasa-by-bu-pebri/src/app/actions/competitions.ts) memvalidasi `Math.round(totalWeight) === 100` sebelum mengizinkan penyimpanan ke PostgreSQL.
* **Metode Agregasi:**
  1. *Rata-rata Terbobot (`rata_rata`):*  
     $$\text{Final} = \frac{1}{N} \sum_{j=1}^{N} \sum_{c=1}^{K} \left( \frac{\text{score}_{j,c} \times \text{weight}_c}{100} \right)$$
  2. *Rata-rata Buang Ekstrem (`rata_rata_buang_ekstrem`):*  
     Diterapkan bila juri $\ge 3$. Nilai total tertinggi dan terendah dari juri dibuang untuk mencegah deviasi bias subjektif. Perhitungan ini dieksekusi otomatis oleh SQL View `v_competition_final_score`.
* **Deteksi Disparitas (Gap Score):**  
  Fungsi `detectScoreGaps` di [`src/app/actions/assessments.ts`](file:///d:/project/web/energies/gebyar-bulan-bahasa-by-bu-pebri/src/app/actions/assessments.ts) mendeteksi jika selisih skor antar-juri untuk peserta yang sama melebihi 15 poin dan menandainya pada UI admin.

---

### B. Proteksi Bentrok Panggung (*Anti-Conflict Stage Validation*)
* Diterapkan pada Server Action `upsertSchedule` di [`src/app/actions/schedules.ts`](file:///d:/project/web/energies/gebyar-bulan-bahasa-by-bu-pebri/src/app/actions/schedules.ts).
* Sebelum menyimpan jadwal sesi panggung, sistem melakukan verifikasi tumpang tindih waktu:
  ```ts
  const { data: conflict } = await supabase
    .from("schedules")
    .select("id, title")
    .eq("venue_stage", parsed.data.venueStage)
    .neq("status", "dibatalkan")
    .lt("start_time", parsed.data.endTime)
    .gt("end_time", parsed.data.startTime);
  ```
* Jika ditemukan irisan rentang waktu pada panggung fisik yang sama, sistem langsung membatalkan mutasi dan mengembalikan pesan error yang menjelaskan nama sesi yang sedang berlangsung.

---

### C. Ledger Poin Gamifikasi & Stand Budaya
* **Prinsip Append-Only Ledger:**  
  Poin peserta tidak langsung di-`UPDATE` sembarangan pada tabel `participants`. Setiap perubahan poin dicatat sebagai transaksi baru pada tabel `point_transactions` (kolom: `participant_id`, `points`, `source`, `stand_id`, `challenge_id`).
* **Database Trigger Sinkronisasi Otomatis:**  
  Trigger PostgreSQL `sync_participant_points()` secara otomatis mengakumulasikan `SUM(points)` ke kolom `participants.total_points`.
* **Pencegahan Klaim Ganda:**  
  Unique constraint `uq_stand_visit UNIQUE (participant_id, stand_id, source)` pada PostgreSQL memastikan peserta tidak dapat mengklaim poin dari meja stan yang sama lebih dari satu kali.

---

### D. Digital Signage Venue & Supabase Realtime
* Monitor TV lapangan di [`src/app/monitor/page.tsx`](file:///d:/project/web/energies/gebyar-bulan-bahasa-by-bu-pebri/src/app/monitor/page.tsx) mendengarkan kanal WebSocket `useRealtimeTable` dari tabel `monitor_displays`.
* Ketika tim Media Center memencet tombol ganti mode pada remote kendali di `/media/monitor` atau Seksi Acara mengirimkan siaran darurat di `/dashboard/broadcast`, event mutasi `UPDATE` langsung diterima oleh browser monitor panggung dalam hitungan milidetik tanpa perlu memuat ulang (*reload*) halaman.

---

## 6. Panduan Menambahkan Fitur Baru

### Langkah 1: Skema Database (Jika Membutuhkan Tabel/Kolom Baru)
Tambahkan file migrasi baru di folder `supabase/migrations/` (misal `0003_add_feature_x.sql`), atau gunakan editor SQL Supabase:
```sql
CREATE TABLE public.feature_x (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);
```

### Langkah 2: Buat Server Action Terisolasi
Buat file aksi baru di `src/app/actions/featureX.ts`:
```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const FeatureSchema = z.object({
  title: z.string().min(3),
});

export async function createFeatureX(data: z.infer<typeof FeatureSchema>) {
  const parsed = FeatureSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("feature_x").insert(parsed.data);
    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/feature-x");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
    return { success: false, error: message };
  }
}
```

### Langkah 3: Buat Halaman (Server Component + Client Interactivity)
Pisahkan logika pengambilan data di Server Component (`page.tsx`) dan logika form interaktif di Client Component (`feature-manage-client.tsx`) menggunakan hook `useTransition()`:
```tsx
const [isPending, startTransition] = React.useTransition();

const handleAction = () => {
  startTransition(async () => {
    const res = await createFeatureX({ title });
    if (res.success) router.refresh();
  });
};
```

---

## 7. Catatan Teknis & Praktik Terbaik (*Best Practices*)
1. **Next.js 15/16 App Router Compliance:**  
   Gunakan `export const dynamic = "force-dynamic"` pada halaman dashboard operasional yang mengonsumsi data real-time agar tidak di-cache secara statis saat proses build.
2. **Type Safety & ESLint Strictness:**  
   Hindari penggunaan `any`. Selalu gunakan `catch (err: unknown)` dengan type narrowing `err instanceof Error ? err.message : ...` untuk menjaga kepatuhan linting standar industri.
3. **Keamanan Kunci API:**  
   Jangan pernah memanggil `createAdminClient()` di dalam Client Component. Operasi yang membutuhkan bypass RLS hanya boleh dieksekusi di Server Actions atau skrip Node.js backend.
