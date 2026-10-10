-- =====================================================================
-- GebyarBulanBahasa — Game Kepingan Puzzle (Jigsaw Tile Puzzle)
-- File: supabase/migrations/0006_kepingan_puzzle.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. JIGSAW PUZZLES (Konfigurasi Game Kepingan Puzzle oleh Admin)
-- ---------------------------------------------------------------------
create table if not exists public.jigsaw_puzzles (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Misteri Mahakarya Budaya',
  description text default 'Susun kembali kepingan mahakarya seni budaya Indonesia hingga utuh untuk meraih poin reward!',
  image_url text not null,                  -- URL gambar yang dijadikan puzzle
  grid_size int not null default 3,         -- Ukuran grid (2=2x2, 3=3x3, 4=4x4, 5=5x5)
  pieces_count int not null default 9,      -- Jumlah kepingan (4, 9, 16, 25)
  points_reward int not null default 100,   -- Poin reward saat puzzle berhasil diselesaikan
  time_limit_seconds int default 120,       -- Batas waktu pengerjaan dalam detik (0 = tanpa batas)
  is_active boolean not null default true,  -- Status aktif/nonaktif challenge
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jigsaw_puzzles_active on public.jigsaw_puzzles(is_active);

-- ---------------------------------------------------------------------
-- 2. JIGSAW ATTEMPTS (Riwayat Penyelesaian Peserta & Poin)
-- ---------------------------------------------------------------------
create table if not exists public.jigsaw_attempts (
  id uuid primary key default gen_random_uuid(),
  puzzle_id uuid references public.jigsaw_puzzles(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  score int not null default 0,             -- Poin yang diberikan ke peserta
  time_seconds int,                         -- Durasi waktu penyelesaian (detik)
  moves_count int not null default 0,       -- Jumlah langkah pertukaran kepingan (swap moves)
  is_completed boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_jigsaw_attempts_participant on public.jigsaw_attempts(participant_id);
create index if not exists idx_jigsaw_attempts_puzzle on public.jigsaw_attempts(puzzle_id);

-- RLS
alter table public.jigsaw_puzzles  enable row level security;
alter table public.jigsaw_attempts enable row level security;

-- Jigsaw Puzzles: Semua pengguna/publik bisa membaca puzzle aktif, admin bisa CRUD
create policy "jigsaw_puzzles_read_all" on public.jigsaw_puzzles
  for select using (true);

create policy "jigsaw_puzzles_write_admin" on public.jigsaw_puzzles
  for all using (public.is_admin()) with check (public.is_admin());

-- Jigsaw Attempts: Peserta bisa melihat miliknya, admin bisa melihat semua
create policy "jigsaw_attempts_read_own_or_admin" on public.jigsaw_attempts
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.participants p
      where p.id = jigsaw_attempts.participant_id and p.user_id = auth.uid()
    )
  );

create policy "jigsaw_attempts_insert_auth" on public.jigsaw_attempts
  for insert with check (auth.uid() is not null);

-- Seed konfigurasi bawaan pertama
insert into public.jigsaw_puzzles (
  id,
  title,
  description,
  image_url,
  grid_size,
  pieces_count,
  points_reward,
  time_limit_seconds,
  is_active
) values (
  '33333333-3333-4333-8333-333333333301',
  'Mahakarya Wayang & Ornamen Nusantara',
  'Susun kembali kepingan mahakarya wayang kulit dan ornamen batik nusantara hingga menjadi gambar utuh untuk membuktikan ketangkasan visual Anda!',
  '/uploads/puzzle/puzzle-wayang.jpg',
  3,
  9,
  100,
  120,
  true
) on conflict (id) do nothing;
