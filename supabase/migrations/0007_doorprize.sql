-- =====================================================================
-- GebyarBulanBahasa — Modul Undian Doorprize / Digital Lucky Wheel
-- File: supabase/migrations/0007_doorprize.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. DOORPRIZE PRIZES (Katalog / Master Hadiah Doorprize)
-- ---------------------------------------------------------------------
create table if not exists public.doorprizes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  reward_id uuid references public.rewards(id) on delete set null,
  image_url text,
  total_quantity int not null default 1,
  remaining_quantity int not null default 1,
  sponsor text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_doorprizes_active on public.doorprizes(is_active);

-- ---------------------------------------------------------------------
-- 2. DOORPRIZE WINNERS (Riwayat Pemenang Undian Doorprize)
-- ---------------------------------------------------------------------
create table if not exists public.doorprize_winners (
  id uuid primary key default gen_random_uuid(),
  doorprize_name text not null,
  prize_id uuid references public.doorprizes(id) on delete set null,
  reward_id uuid references public.rewards(id) on delete set null,
  participant_id uuid not null references public.participants(id) on delete cascade,
  participant_name text not null,
  participant_reg_num text not null,
  participant_institution text,
  participant_phone text,
  drawn_at timestamptz not null default now(),
  drawn_by uuid references public.profiles(id) on delete set null,
  status text not null default 'sah', -- 'sah', 'dibatalkan', 'diserahkan'
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_doorprize_winners_participant on public.doorprize_winners(participant_id);
create index if not exists idx_doorprize_winners_status on public.doorprize_winners(status);
create index if not exists idx_doorprize_winners_drawn_at on public.doorprize_winners(drawn_at desc);

-- ---------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------
alter table public.doorprizes enable row level security;
alter table public.doorprize_winners enable row level security;

-- Doorprizes policies: Read all, write staff/admin
create policy "doorprizes_read_all" on public.doorprizes
  for select using (true);

create policy "doorprizes_write_staff" on public.doorprizes
  for all using (public.is_staff()) with check (public.is_staff());

-- Doorprize Winners policies: Read all, write staff/admin
create policy "doorprize_winners_read_all" on public.doorprize_winners
  for select using (true);

create policy "doorprize_winners_write_staff" on public.doorprize_winners
  for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- Seed Contoh Hadiah Doorprize Bawaan
-- ---------------------------------------------------------------------
insert into public.doorprizes (id, name, description, total_quantity, remaining_quantity, sponsor)
values
  ('55555555-5555-4555-8555-555555555501', 'Grand Prize: Sepeda Gunung Polygon', 'Hadiah utama penutupan Gebyar Bulan Bahasa untuk peserta beruntung', 1, 1, 'Komite Acara'),
  ('55555555-5555-4555-8555-555555555502', 'Smart TV LED 32 Inch', 'Doorprize elektronik hiburan keluarga berlayar HD', 2, 2, 'Sponsor Utama'),
  ('55555555-5555-4555-8555-555555555503', 'Paket Eksklusif Buku Sastra Nusantara & Kaos Festival', 'Koleksi karya sastra klasik Indonesia + merchandise resmi', 5, 5, 'Balai Pustaka & Panitia'),
  ('55555555-5555-4555-8555-555555555504', 'Headset Wireless Bluetooth Super Bass', 'Perangkat audio nirkabel untuk belajar dan hiburan', 3, 3, 'Media Center')
on conflict (id) do nothing;

