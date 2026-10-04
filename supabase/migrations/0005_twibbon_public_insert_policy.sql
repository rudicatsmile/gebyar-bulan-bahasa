-- =====================================================================
-- Perbaikan RLS pengiriman twibbon publik
-- File: supabase/migrations/0005_twibbon_public_insert_policy.sql
--
-- Masalah:
--   Guest / user yang submit lewat /twibbon/unggah mendapat error
--   "new row violates row-level security policy for table \"twibbons\"" (code 42501).
--   Pada DB produksi tidak ada kebijakan INSERT yang mengizinkan peran `anon`
--   (kebijakan `twibbons_insert_anon ... with check (true)` di 0001_init.sql
--   ternyata tidak terpasang / sudah di-drop), sehingga semua insert ditolak.
--
-- Solusi:
--   Kebijakan INSERT yang sempit dan sengaja, bukan `with check (true)`:
--     1. Kiriman publik wajib masuk antrean moderasi (status = 'menunggu')
--        dan tidak boleh self-feature (is_featured = false).
--     2. user_id harus kosong untuk tamu, atau persis sama dengan auth.uid()
--        untuk user login -> tidak bisa memalsukan kiriman atas nama user lain.
--     3. Berlaku hanya untuk peran anon & authenticated; staff/admin tetap
--        memakai kebijakan tersendiri (twibbons_moderate_staff).
-- =====================================================================

-- Hapus kebijakan lama yang terlalu longgar / tidak ada di DB produksi
drop policy if exists "twibbons_insert_anon" on public.twibbons;
drop policy if exists "twibbons_insert_public" on public.twibbons;

create policy "twibbons_insert_public"
  on public.twibbons
  for insert
  to anon, authenticated
  with check (
    status = 'menunggu'
    and is_featured = false
    and (
      (auth.uid() is null and user_id is null)
      or (auth.uid() is not null and user_id = auth.uid())
    )
  );

-- Pastikan RLS tetap aktif (tidak dinonaktifkan)
alter table public.twibbons enable row level security;

-- Pengunggah boleh melihat kembali kiriman miliknya sendiri (semua status),
-- agar status kurasi dapat dipantau dari /peserta/twibbon.
drop policy if exists "twibbons_read_own" on public.twibbons;
create policy "twibbons_read_own"
  on public.twibbons
  for select
  to authenticated
  using (user_id = auth.uid());
