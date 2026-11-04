-- =====================================================================
-- GebyarBulanBahasa — Periode Tanggal Mulai & Tanggal Akhir Challenge & Game
-- File: supabase/migrations/0007_challenge_dates.sql
-- =====================================================================

-- 1. Pastikan kolom start_at dan end_at tersedia pada tabel challenges
ALTER TABLE public.challenges 
  ADD COLUMN IF NOT EXISTS start_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS end_at timestamptz;

-- 2. Tambahkan kolom start_at dan end_at pada tabel jigsaw_puzzles
ALTER TABLE public.jigsaw_puzzles 
  ADD COLUMN IF NOT EXISTS start_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS end_at timestamptz;

-- 3. Tambahkan kolom start_at dan end_at pada tabel qr_letter_challenges
ALTER TABLE public.qr_letter_challenges 
  ADD COLUMN IF NOT EXISTS start_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS end_at timestamptz;

