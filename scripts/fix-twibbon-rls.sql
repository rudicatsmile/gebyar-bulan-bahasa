-- ================================================================
-- FIX: Storage Policies untuk bucket twibbon-templates
-- Jalankan di Supabase Dashboard > SQL Editor
-- ================================================================

-- Cek dulu apakah sudah ada policy storage untuk bucket ini
-- select * from pg_policies where tablename = 'objects' and schemaname = 'storage';

-- Hapus policy lama jika ada (untuk bucket ini)
drop policy if exists "Allow authenticated uploads to twibbon-templates" on storage.objects;
drop policy if exists "Allow public read from twibbon-templates" on storage.objects;
drop policy if exists "Allow authenticated to manage twibbon-templates" on storage.objects;
drop policy if exists "twibbon_templates_upload" on storage.objects;
drop policy if exists "twibbon_templates_read" on storage.objects;

-- Policy: User terautentikasi bisa upload ke bucket ini
create policy "Allow authenticated uploads to twibbon-templates"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'twibbon-templates');

-- Policy: Siapapun bisa membaca (public bucket)
create policy "Allow public read from twibbon-templates"
  on storage.objects
  for select
  using (bucket_id = 'twibbon-templates');

-- Policy: User terautentikasi bisa update dan delete
create policy "Allow authenticated manage twibbon-templates"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'twibbon-templates')
  with check (bucket_id = 'twibbon-templates');

-- Verifikasi: lihat policies yang aktif untuk storage.objects
select policyname, cmd, roles 
from pg_policies 
where schemaname = 'storage' and tablename = 'objects'
  and (policyname like '%twibbon%' or policyname like '%template%');
