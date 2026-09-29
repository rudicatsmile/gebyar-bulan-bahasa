-- =====================================================================
-- GebyarBulanBahasa — Puzzle Challenge: Mencocokkan Baju Daerah
-- File: supabase/migrations/0002_puzzle_challenge.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- PUZZLE ITEMS (soal puzzle baju daerah ↔ nama daerah)
-- ---------------------------------------------------------------------
create table public.puzzle_items (
  id uuid primary key default gen_random_uuid(),
  costume_name text not null,           -- nama baju daerah, misal "Kebaya"
  region_name text not null,            -- nama daerah, misal "Jawa Barat"
  costume_image_url text,               -- URL gambar baju daerah (opsional)
  hint text,                            -- petunjuk opsional
  sort_order int not null default 0,    -- urutan tampilan
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_puzzle_items_active on public.puzzle_items(is_active, sort_order);

-- ---------------------------------------------------------------------
-- PUZZLE ATTEMPTS (hasil percobaan puzzle peserta)
-- ---------------------------------------------------------------------
create table public.puzzle_attempts (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  total_items int not null default 0,     -- jumlah soal saat attempt
  correct_count int not null default 0,   -- jumlah jawaban benar
  score int not null default 0,           -- poin yang diperoleh
  time_seconds int,                       -- waktu pengerjaan (detik)
  answers jsonb,                          -- detail jawaban: [{itemId, selectedRegion, isCorrect}]
  created_at timestamptz not null default now()
);

create index idx_puzzle_attempts_participant on public.puzzle_attempts(participant_id);

-- RLS
alter table public.puzzle_items    enable row level security;
alter table public.puzzle_attempts enable row level security;

-- Puzzle items: publik bisa baca, admin bisa CRUD
create policy "puzzle_items_read_all" on public.puzzle_items for select using (true);
create policy "puzzle_items_write_admin" on public.puzzle_items for all using (public.is_admin()) with check (public.is_admin());

-- Puzzle attempts: peserta bisa insert & baca miliknya, admin bisa baca semua
create policy "puzzle_attempts_read_own_or_admin" on public.puzzle_attempts for select using (
  public.is_admin()
  or exists (select 1 from public.participants p where p.id = puzzle_attempts.participant_id and p.user_id = auth.uid())
);
create policy "puzzle_attempts_insert_auth" on public.puzzle_attempts for insert with check (auth.uid() is not null);

-- Seed data: 10 baju daerah populer Indonesia
insert into public.puzzle_items (costume_name, region_name, sort_order) values
  ('Kebaya',               'Jawa',            1),
  ('Ulos',                 'Sumatera Utara',  2),
  ('Baju Bodo',            'Sulawesi Selatan',3),
  ('Pakaian Ewer',         'Papua',           4),
  ('Songket Palembang',    'Sumatera Selatan',5),
  ('Beskap',               'Jawa Tengah',     6),
  ('Baju Kurung',          'Riau',            7),
  ('Pakaian Sapei Sapaq',  'Kalimantan Timur',8),
  ('Baju Cele',            'Maluku',          9),
  ('Endong',               'Bali',            10);
