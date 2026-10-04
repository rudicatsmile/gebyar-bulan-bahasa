-- =====================================================================
-- Twibbon Templates — Admin upload template resmi
-- File: supabase/migrations/0004_twibbon_templates.sql
-- =====================================================================

-- Tabel template twibbon yang dikelola oleh admin
create table if not exists public.twibbon_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text not null,
  thumbnail_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tambahkan kolom template_id ke tabel twibbons (opsional, referensi template yang digunakan)
alter table public.twibbons
  add column if not exists template_id uuid references public.twibbon_templates(id) on delete set null;

-- Index untuk performa
create index if not exists idx_twibbon_templates_active on public.twibbon_templates(is_active, sort_order);
create index if not exists idx_twibbons_template_id on public.twibbons(template_id);

-- RLS (Row Level Security)
alter table public.twibbon_templates enable row level security;

-- Policy: Semua orang bisa melihat template yang aktif
create policy "Public can view active templates"
  on public.twibbon_templates
  for select
  using (is_active = true);

-- Policy: Admin dan seksi_acara bisa melihat semua template (termasuk tidak aktif)
create policy "Admins can view all templates"
  on public.twibbon_templates
  for select
  using (public.is_admin() or public.is_staff());

-- Policy: Admin bisa mengelola template
create policy "Admins can manage templates"
  on public.twibbon_templates
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Bucket twibbon-templates untuk storage template (dibuat via dashboard Supabase)
-- Storage bucket: twibbon-templates (public read)
