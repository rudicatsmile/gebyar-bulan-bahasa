-- =====================================================================
-- GebyarBulanBahasa — Challenge QR Huruf: Susun Kata & Kalimat Bermakna
-- File: supabase/migrations/0003_qr_letter_challenge.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. QR LETTER CHALLENGES (Master tantangan kalimat tersembunyi)
-- ---------------------------------------------------------------------
create table public.qr_letter_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,                      -- judul challenge, misal "Misteri Kalimat Sumpah Pemuda"
  description text,                         -- petunjuk/instruksi umum
  target_phrase text not null,              -- kalimat/kata target yang harus disusun (misal "BULAN BAHASA")
  points_reward int not null default 50,    -- poin reward jika berhasil menyusun
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_qr_letter_challenges_active on public.qr_letter_challenges(is_active);

-- ---------------------------------------------------------------------
-- 2. QR LETTER CODES (Daftar huruf individual & token QR)
-- ---------------------------------------------------------------------
create table public.qr_letter_codes (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.qr_letter_challenges(id) on delete cascade,
  letter varchar(2) not null,               -- huruf yang didapat (misal "B", "U", dst.)
  letter_index int not null,                -- nomor urutan huruf di kalimat asli
  qr_token text not null unique,            -- token unik di dalam QR code (misal "QR-HURUF-B-A1")
  location_hint text,                       -- lokasi penempelan QR (misal "Pintu Masuk Utama")
  created_at timestamptz not null default now()
);

create index idx_qr_letter_codes_challenge on public.qr_letter_codes(challenge_id);
create index idx_qr_letter_codes_token on public.qr_letter_codes(qr_token);

-- ---------------------------------------------------------------------
-- 3. QR LETTER SCANS (Riwayat scan huruf per peserta)
-- ---------------------------------------------------------------------
create table public.qr_letter_scans (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.qr_letter_challenges(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  qr_code_id uuid not null references public.qr_letter_codes(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  unique(participant_id, qr_code_id)       -- mencegah scan ganda pada QR yang sama
);

create index idx_qr_letter_scans_part on public.qr_letter_scans(participant_id, challenge_id);

-- ---------------------------------------------------------------------
-- 4. QR LETTER SUBMISSIONS (Hasil submit tebakan kata/kalimat peserta)
-- ---------------------------------------------------------------------
create table public.qr_letter_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.qr_letter_challenges(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  submitted_phrase text not null,           -- kalimat yang disusun peserta
  is_correct boolean not null default false,-- apakah sesuai target phrase
  score int not null default 0,             -- poin yang diberikan
  time_seconds int,                         -- durasi sejak scan pertama s.d. submit (detik)
  submitted_at timestamptz not null default now()
);

create index idx_qr_letter_submissions_part on public.qr_letter_submissions(participant_id);
create index idx_qr_letter_submissions_challenge on public.qr_letter_submissions(challenge_id);

-- ---------------------------------------------------------------------
-- RLS (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.qr_letter_challenges  enable row level security;
alter table public.qr_letter_codes       enable row level security;
alter table public.qr_letter_scans       enable row level security;
alter table public.qr_letter_submissions enable row level security;

-- Challenges: publik baca, admin kelola penuh
create policy "qr_challenges_read_all" on public.qr_letter_challenges for select using (true);
create policy "qr_challenges_write_admin" on public.qr_letter_challenges for all using (public.is_admin()) with check (public.is_admin());

-- QR Codes: publik baca, admin kelola penuh
create policy "qr_codes_read_all" on public.qr_letter_codes for select using (true);
create policy "qr_codes_write_admin" on public.qr_letter_codes for all using (public.is_admin()) with check (public.is_admin());

-- Scans: peserta bisa baca miliknya & insert, admin bisa baca semua
create policy "qr_scans_read_own_or_admin" on public.qr_letter_scans for select using (
  public.is_admin()
  or exists (select 1 from public.participants p where p.id = qr_letter_scans.participant_id and p.user_id = auth.uid())
);
create policy "qr_scans_insert_auth" on public.qr_letter_scans for insert with check (auth.uid() is not null);

-- Submissions: peserta bisa baca miliknya & insert, admin bisa baca semua
create policy "qr_subs_read_own_or_admin" on public.qr_letter_submissions for select using (
  public.is_admin()
  or exists (select 1 from public.participants p where p.id = qr_letter_submissions.participant_id and p.user_id = auth.uid())
);
create policy "qr_subs_insert_auth" on public.qr_letter_submissions for insert with check (auth.uid() is not null);

-- ---------------------------------------------------------------------
-- SEED DATA DEFAULT (Kalimat: "BULAN BAHASA")
-- ---------------------------------------------------------------------
do $$
declare
  cid uuid := gen_random_uuid();
begin
  insert into public.qr_letter_challenges (id, title, description, target_phrase, points_reward, is_active)
  values (
    cid,
    'Jelajah Aksara: Misteri Bulan Bahasa',
    'Temukan QR code huruf yang tersebar di 11 lokasi acara, kumpulkan semua huruf, lalu susun menjadi kalimat bermakna!',
    'BULAN BAHASA',
    100,
    true
  );

  insert into public.qr_letter_codes (challenge_id, letter, letter_index, qr_token, location_hint) values
    (cid, 'B', 1,  'QR-HURUF-B-01', 'Pintu Masuk Utama Gelora'),
    (cid, 'U', 2,  'QR-HURUF-U-02', 'Stand Pameran Buku Literasi'),
    (cid, 'L', 3,  'QR-HURUF-L-03', 'Pojok Karya Puisi & Cerpen'),
    (cid, 'A', 4,  'QR-HURUF-A-04', 'Area Photobooth Twibbon'),
    (cid, 'N', 5,  'QR-HURUF-N-05', 'Stand Musikalisasi & Teater'),
    (cid, 'B', 6,  'QR-HURUF-B-06', 'Meja Informasi Registrasi'),
    (cid, 'A', 7,  'QR-HURUF-A-07', 'Kantin Budaya Nusantara'),
    (cid, 'H', 8,  'QR-HURUF-H-08', 'Pojok Dongeng & Pidato'),
    (cid, 'A', 9,  'QR-HURUF-A-09', 'Panggung Utama Sumpah Pemuda'),
    (cid, 'S', 10, 'QR-HURUF-S-10', 'Taman Baca Mini'),
    (cid, 'A', 11, 'QR-HURUF-A-11', 'Area Parkir VIP & Tamu');
end $$;
