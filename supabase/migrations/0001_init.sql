-- =====================================================================
-- GebyarBulanBahasa — Supabase PostgreSQL Schema
-- File: supabase/migrations/0001_init.sql
-- Tema: "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia."
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------
create type user_role as enum ('super_admin','seksi_acara','juri','media_center','peserta');
create type competition_type as enum ('individu','kelompok');
create type competition_status as enum ('draft','pendaftaran','berlangsung','selesai','dibatalkan');
create type aggregation_method as enum ('rata_rata','total','rata_rata_buang_ekstrem');
create type participant_status as enum ('menunggu_verifikasi','terverifikasi','ditolak','mengundurkan_diri');
create type document_status as enum ('menunggu','valid','tidak_valid');
create type judge_assignment_status as enum ('diundang','aktif','nonaktif');
create type assessment_status as enum ('draft','terkirim','final');
create type schedule_status as enum ('terjadwal','berlangsung','selesai','ditunda','dibatalkan');
create type announcement_category as enum ('umum','jadwal','pemenang','penting','media');
create type moderation_status as enum ('menunggu','disetujui','ditolak');
create type challenge_type as enum ('scan_qr','kode_unik','unggah_bukti','input_panitia');
create type point_source as enum ('scan_qr','kode_unik','verifikasi_bukti','input_panitia','penyesuaian');
create type submission_status as enum ('menunggu','disetujui','ditolak');
create type redemption_status as enum ('menunggu','disetujui','diserahkan','ditolak');
create type winner_category as enum ('lomba','challenge');

-- ---------------------------------------------------------------------
-- PROFILES (extends auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  nickname text,
  phone text,
  institution text,
  avatar_url text,
  role user_role not null default 'peserta',
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);

-- Helper RBAC functions (security definer)
create or replace function public.current_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('super_admin','seksi_acara') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('super_admin','seksi_acara','media_center') from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- EVENT SETTINGS
-- ---------------------------------------------------------------------
create table public.event_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- COMPETITIONS (8 lomba)
-- ---------------------------------------------------------------------
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text not null,
  description text not null,
  theme_link text,
  type competition_type not null default 'individu',
  status competition_status not null default 'draft',
  aggregation aggregation_method not null default 'rata_rata',
  min_team_members int not null default 2,
  max_team_members int not null default 10,
  max_participants int,
  registration_open_at timestamptz,
  registration_close_at timestamptz,
  poster_url text,
  rules text,
  sort_order int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_competitions_status on public.competitions(status);

-- ---------------------------------------------------------------------
-- COMPETITION CRITERIA (kriteria penilaian berbobot)
-- ---------------------------------------------------------------------
create table public.competition_criteria (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  name text not null,
  description text,
  weight numeric(5,2) not null default 0,
  max_score numeric(6,2) not null default 100,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint chk_weight_range check (weight >= 0 and weight <= 100)
);

create index idx_criteria_competition on public.competition_criteria(competition_id);

-- ---------------------------------------------------------------------
-- PARTICIPANTS
-- ---------------------------------------------------------------------
create table public.participants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  registration_number text not null unique,
  full_name text not null,
  nickname text,
  email text,
  phone text,
  institution text,
  birth_date date,
  address text,
  photo_url text,
  status participant_status not null default 'menunggu_verifikasi',
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  rejection_reason text,
  total_points int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_participants_status on public.participants(status);
create index idx_participants_user on public.participants(user_id);

-- ---------------------------------------------------------------------
-- PARTICIPANT DOCUMENTS (verifikasi berkas)
-- ---------------------------------------------------------------------
create table public.participant_documents (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  doc_type text not null,
  file_url text not null,
  file_name text,
  status document_status not null default 'menunggu',
  note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  uploaded_at timestamptz not null default now()
);

create index idx_documents_participant on public.participant_documents(participant_id);
create index idx_documents_status on public.participant_documents(status);

-- ---------------------------------------------------------------------
-- REGISTRATIONS (pendaftaran peserta ke lomba)
-- ---------------------------------------------------------------------
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  team_name text,
  performance_order int,
  is_confirmed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (participant_id, competition_id)
);

create index idx_registrations_competition on public.registrations(competition_id);

create table public.registration_members (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  member_name text not null,
  member_role text,
  student_id text,
  institution text,
  is_leader boolean not null default false
);

create index idx_members_registration on public.registration_members(registration_id);

-- ---------------------------------------------------------------------
-- COMPETITION JUDGES (penugasan juri oleh Seksi Acara)
-- ---------------------------------------------------------------------
create table public.competition_judges (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  judge_id uuid not null references public.profiles(id) on delete cascade,
  is_chief_judge boolean not null default false,
  expertise_note text,
  status judge_assignment_status not null default 'aktif',
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (competition_id, judge_id)
);

create index idx_judges_competition on public.competition_judges(competition_id);
create index idx_judges_judge on public.competition_judges(judge_id);

-- ---------------------------------------------------------------------
-- SCHEDULES (jadwal acara)
-- ---------------------------------------------------------------------
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references public.competitions(id) on delete set null,
  title text not null,
  description text,
  event_day int not null default 1,
  event_date date not null,
  start_time time not null,
  end_time time,
  venue text not null,
  stage text,
  host_name text,
  status schedule_status not null default 'terjadwal',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_schedules_date on public.schedules(event_date);
create index idx_schedules_status on public.schedules(status);

-- ---------------------------------------------------------------------
-- ASSESSMENTS (penilaian juri)
-- ---------------------------------------------------------------------
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  judge_id uuid not null references public.profiles(id) on delete cascade,
  status assessment_status not null default 'draft',
  weighted_total numeric(10,2) not null default 0,
  notes text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, judge_id)
);

create index idx_assessments_competition on public.assessments(competition_id);
create index idx_assessments_judge on public.assessments(judge_id);

create table public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  criterion_id uuid not null references public.competition_criteria(id) on delete cascade,
  score numeric(6,2) not null default 0,
  comment text,
  unique (assessment_id, criterion_id)
);

create index idx_scores_assessment on public.assessment_scores(assessment_id);

-- ---------------------------------------------------------------------
-- ANNOUNCEMENTS (pengumuman & broadcast)
-- ---------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category announcement_category not null default 'umum',
  body text not null,
  cover_url text,
  attachment_url text,
  target_roles user_role[] default array['peserta','juri','media_center','seksi_acara']::user_role[],
  is_published boolean not null default false,
  is_pinned boolean not null default false,
  show_on_monitor boolean not null default false,
  publish_at timestamptz not null default now(),
  expire_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_announcements_category on public.announcements(category);
create index idx_announcements_published on public.announcements(is_published, publish_at);

-- ---------------------------------------------------------------------
-- WINNERS (pemenang lomba & challenge)
-- ---------------------------------------------------------------------
create table public.winners (
  id uuid primary key default gen_random_uuid(),
  category winner_category not null default 'lomba',
  competition_id uuid references public.competitions(id) on delete cascade,
  challenge_id uuid,
  registration_id uuid references public.registrations(id) on delete set null,
  participant_id uuid references public.participants(id) on delete set null,
  winner_name text not null,
  institution text,
  rank int not null default 1,
  title text,
  final_score numeric(10,2),
  prize text,
  is_published boolean not null default false,
  announced_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_winners_competition on public.winners(competition_id);
create index idx_winners_published on public.winners(is_published);

-- ---------------------------------------------------------------------
-- TWIBBONS
-- ---------------------------------------------------------------------
create table public.twibbons (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references public.participants(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  uploader_name text not null,
  uploader_institution text,
  caption text,
  image_url text not null,
  uploader_ip inet,
  status moderation_status not null default 'menunggu',
  is_featured boolean not null default false,
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  reject_reason text,
  likes_count int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_twibbons_status on public.twibbons(status);
create index idx_twibbons_featured on public.twibbons(is_featured);

-- ---------------------------------------------------------------------
-- CHALLENGES (challenge peserta non-lomba)
-- ---------------------------------------------------------------------
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  type challenge_type not null default 'scan_qr',
  point_reward int not null default 25,
  max_claims int,
  banner_url text,
  badge_icon text,
  start_at timestamptz not null default now(),
  end_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_challenges_active on public.challenges(is_active);

-- ---------------------------------------------------------------------
-- STANDS (stand budaya + kode unik + QR token)
-- ---------------------------------------------------------------------
create table public.stands (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references public.competitions(id) on delete set null,
  name text not null,
  code text not null unique,
  qr_token uuid not null unique default gen_random_uuid(),
  description text,
  booth_location text,
  points_per_visit int not null default 10,
  max_visits_per_participant int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_stands_active on public.stands(is_active);

-- ---------------------------------------------------------------------
-- POINT TRANSACTIONS (ledger poin — append only)
-- ---------------------------------------------------------------------
create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  challenge_id uuid references public.challenges(id) on delete set null,
  stand_id uuid references public.stands(id) on delete set null,
  points int not null,
  source point_source not null,
  note text,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint uq_stand_visit unique (participant_id, stand_id, source)
);

create index idx_points_participant on public.point_transactions(participant_id);
create index idx_points_created on public.point_transactions(created_at);

-- ---------------------------------------------------------------------
-- CHALLENGE SUBMISSIONS
-- ---------------------------------------------------------------------
create table public.challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  proof_url text,
  proof_type text,
  description text,
  status submission_status not null default 'menunggu',
  points_awarded int not null default 0,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index idx_submissions_status on public.challenge_submissions(status);

-- ---------------------------------------------------------------------
-- REWARDS & REDEMPTIONS
-- ---------------------------------------------------------------------
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  points_required int not null,
  quota int,
  claimed_count int not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.rewards(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete cascade,
  points_spent int not null,
  status redemption_status not null default 'menunggu',
  pickup_code text unique,
  processed_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index idx_redemptions_participant on public.reward_redemptions(participant_id);
create index idx_redemptions_status on public.reward_redemptions(status);

-- ---------------------------------------------------------------------
-- MEDIA CONTENTS
-- ---------------------------------------------------------------------
create table public.media_contents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  content_type text not null default 'berita',
  excerpt text,
  body text,
  file_url text,
  thumbnail_url text,
  tags text[],
  is_published boolean not null default false,
  author_id uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_media_published on public.media_contents(is_published, published_at);

-- ---------------------------------------------------------------------
-- MONITOR DISPLAYS & PLAYLIST
-- ---------------------------------------------------------------------
create table public.monitor_displays (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  layout_type text not null default 'rotasi',
  rotation_interval_seconds int not null default 15,
  theme text not null default 'dark',
  access_token text unique,
  is_active boolean not null default true,
  emergency_message text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.monitor_playlist_items (
  id uuid primary key default gen_random_uuid(),
  display_id uuid not null references public.monitor_displays(id) on delete cascade,
  module_key text not null,
  competition_id uuid references public.competitions(id) on delete set null,
  duration_seconds int not null default 15,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create index idx_playlist_display on public.monitor_playlist_items(display_id);

-- ---------------------------------------------------------------------
-- ACTIVITY LOGS & NOTIFICATIONS
-- ---------------------------------------------------------------------
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role user_role,
  action text not null,
  entity text not null,
  entity_id text,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_logs_created on public.activity_logs(created_at desc);
create index idx_logs_entity on public.activity_logs(entity, entity_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info',
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on public.notifications(user_id, is_read);

-- ---------------------------------------------------------------------
-- VIEWS
-- ---------------------------------------------------------------------
create or replace view public.v_assessment_totals as
select
  a.id                as assessment_id,
  a.registration_id,
  a.competition_id,
  a.judge_id,
  a.status,
  a.submitted_at,
  coalesce(sum(s.score * c.weight / 100.0), 0)::numeric(10,2) as weighted_total
from public.assessments a
left join public.assessment_scores s on s.assessment_id = a.id
left join public.competition_criteria c on c.id = s.criterion_id
group by a.id;

create or replace view public.v_competition_final_score as
select
  t.competition_id,
  t.registration_id,
  count(*) filter (where t.status <> 'draft')                        as judges_count,
  round(avg(t.weighted_total) filter (where t.status <> 'draft'), 2) as average_score,
  round(sum(t.weighted_total) filter (where t.status <> 'draft'), 2) as sum_score,
  round(
    (sum(t.weighted_total) filter (where t.status <> 'draft')
     - coalesce(max(t.weighted_total) filter (where t.status <> 'draft'), 0)
     - coalesce(min(t.weighted_total) filter (where t.status <> 'draft'), 0))
    / nullif(count(*) filter (where t.status <> 'draft') - 2, 0)
  , 2)                                                              as trimmed_average_score
from public.v_assessment_totals t
group by t.competition_id, t.registration_id;

-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------
create or replace function public.sync_participant_points()
returns trigger language plpgsql security definer as $$
begin
  update public.participants p
  set total_points = coalesce((
    select sum(points) from public.point_transactions where participant_id = p.id
  ), 0)
  where p.id = coalesce(new.participant_id, old.participant_id);
  return null;
end;
$$;

create trigger trg_sync_points
after insert or update or delete on public.point_transactions
for each row execute function public.sync_participant_points();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'peserta')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------
alter table public.profiles                enable row level security;
alter table public.participants            enable row level security;
alter table public.participant_documents   enable row level security;
alter table public.registrations           enable row level security;
alter table public.registration_members    enable row level security;
alter table public.competitions            enable row level security;
alter table public.competition_criteria    enable row level security;
alter table public.competition_judges      enable row level security;
alter table public.schedules               enable row level security;
alter table public.assessments             enable row level security;
alter table public.assessment_scores       enable row level security;
alter table public.announcements           enable row level security;
alter table public.winners                 enable row level security;
alter table public.twibbons                enable row level security;
alter table public.challenges              enable row level security;
alter table public.stands                  enable row level security;
alter table public.point_transactions      enable row level security;
alter table public.challenge_submissions   enable row level security;
alter table public.rewards                 enable row level security;
alter table public.reward_redemptions      enable row level security;
alter table public.media_contents          enable row level security;
alter table public.monitor_displays        enable row level security;
alter table public.monitor_playlist_items  enable row level security;
alter table public.activity_logs           enable row level security;
alter table public.notifications           enable row level security;

-- Policies for public tables (read all, write admin/staff)
create policy "competitions_read_all" on public.competitions for select using (true);
create policy "competitions_write_admin" on public.competitions for all using (public.is_admin()) with check (public.is_admin());

create policy "schedules_read_all" on public.schedules for select using (true);
create policy "schedules_write_admin" on public.schedules for all using (public.is_admin()) with check (public.is_admin());

create policy "criteria_read_all" on public.competition_criteria for select using (true);
create policy "criteria_write_admin" on public.competition_criteria for all using (public.is_admin()) with check (public.is_admin());

create policy "announcements_read_all" on public.announcements for select using (true);
create policy "announcements_write_staff" on public.announcements for all using (public.is_staff()) with check (public.is_staff());

create policy "winners_read_all" on public.winners for select using (true);
create policy "winners_write_admin" on public.winners for all using (public.is_admin()) with check (public.is_admin());

create policy "challenges_read_all" on public.challenges for select using (true);
create policy "challenges_write_admin" on public.challenges for all using (public.is_admin()) with check (public.is_admin());

create policy "stands_read_all" on public.stands for select using (true);
create policy "stands_write_admin" on public.stands for all using (public.is_admin()) with check (public.is_admin());

create policy "rewards_read_all" on public.rewards for select using (true);
create policy "rewards_write_admin" on public.rewards for all using (public.is_admin()) with check (public.is_admin());

create policy "twibbons_read_approved" on public.twibbons for select using (status = 'disetujui' or user_id = auth.uid() or public.is_staff());
create policy "twibbons_insert_anon" on public.twibbons for insert with check (true);
create policy "twibbons_moderate_staff" on public.twibbons for update using (public.is_staff());

create policy "monitor_read_active" on public.monitor_displays for select using (is_active = true or public.is_staff());
create policy "monitor_write_staff" on public.monitor_displays for all using (public.is_staff()) with check (public.is_staff());

create policy "monitor_playlist_read" on public.monitor_playlist_items for select using (true);
create policy "monitor_playlist_write" on public.monitor_playlist_items for all using (public.is_staff()) with check (public.is_staff());

-- Assessments policies
create policy "assessments_read_own_or_admin" on public.assessments for select using (judge_id = auth.uid() or public.is_admin());
create policy "assessments_insert_own" on public.assessments for insert with check (
  judge_id = auth.uid()
  and exists (
    select 1 from public.competition_judges cj
    where cj.competition_id = assessments.competition_id
      and cj.judge_id = auth.uid()
      and cj.status = 'aktif'
  )
);
create policy "assessments_update_own_draft" on public.assessments for update using (judge_id = auth.uid() and status <> 'final');

create policy "assessment_scores_rw_own" on public.assessment_scores for all using (
  exists (select 1 from public.assessments a where a.id = assessment_scores.assessment_id and a.judge_id = auth.uid())
  or public.is_admin()
);

-- Profiles policies
create policy "profiles_read_all" on public.profiles for select using (true);
create policy "profiles_update_own_or_admin" on public.profiles for update using (id = auth.uid() or public.is_admin());

-- Participants & documents policies
create policy "participants_read_all" on public.participants for select using (true);
create policy "participants_write_admin" on public.participants for all using (public.is_admin()) with check (public.is_admin());

create policy "registrations_read_all" on public.registrations for select using (true);
create policy "registrations_insert_auth" on public.registrations for insert with check (auth.uid() is not null or public.is_admin());
create policy "registrations_write_admin" on public.registrations for update using (public.is_admin());

create policy "points_read_own_or_admin" on public.point_transactions for select using (
  public.is_admin()
  or exists (select 1 from public.participants p where p.id = point_transactions.participant_id and p.user_id = auth.uid())
);
create policy "points_write_admin" on public.point_transactions for insert with check (public.is_admin() or public.is_staff());

create policy "activity_logs_read_admin" on public.activity_logs for select using (public.is_admin());
create policy "activity_logs_insert_all" on public.activity_logs for insert with check (true);
