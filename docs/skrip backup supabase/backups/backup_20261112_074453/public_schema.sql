--
-- PostgreSQL database dump
--

\restrict 1ki2EnlsYNNPevTeoKT2E2Uqh6hgJNJ2NC4d3BC4vv0R5DkumUAmvJkooZRwPBS

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: aggregation_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.aggregation_method AS ENUM (
    'rata_rata',
    'total',
    'rata_rata_buang_ekstrem'
);


--
-- Name: announcement_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.announcement_category AS ENUM (
    'umum',
    'jadwal',
    'pemenang',
    'penting',
    'media'
);


--
-- Name: assessment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assessment_status AS ENUM (
    'draft',
    'terkirim',
    'final'
);


--
-- Name: challenge_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.challenge_type AS ENUM (
    'scan_qr',
    'kode_unik',
    'unggah_bukti',
    'input_panitia'
);


--
-- Name: competition_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.competition_status AS ENUM (
    'draft',
    'pendaftaran',
    'berlangsung',
    'selesai',
    'dibatalkan'
);


--
-- Name: competition_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.competition_type AS ENUM (
    'individu',
    'kelompok'
);


--
-- Name: document_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_status AS ENUM (
    'menunggu',
    'valid',
    'tidak_valid'
);


--
-- Name: judge_assignment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.judge_assignment_status AS ENUM (
    'diundang',
    'aktif',
    'nonaktif'
);


--
-- Name: moderation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.moderation_status AS ENUM (
    'menunggu',
    'disetujui',
    'ditolak'
);


--
-- Name: participant_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.participant_status AS ENUM (
    'menunggu_verifikasi',
    'terverifikasi',
    'ditolak',
    'mengundurkan_diri'
);


--
-- Name: point_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.point_source AS ENUM (
    'scan_qr',
    'kode_unik',
    'verifikasi_bukti',
    'input_panitia',
    'penyesuaian'
);


--
-- Name: redemption_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.redemption_status AS ENUM (
    'menunggu',
    'disetujui',
    'diserahkan',
    'ditolak'
);


--
-- Name: schedule_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.schedule_status AS ENUM (
    'terjadwal',
    'berlangsung',
    'selesai',
    'ditunda',
    'dibatalkan'
);


--
-- Name: submission_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.submission_status AS ENUM (
    'menunggu',
    'disetujui',
    'ditolak'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'seksi_acara',
    'juri',
    'media_center',
    'peserta'
);


--
-- Name: winner_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.winner_category AS ENUM (
    'lomba',
    'challenge'
);


--
-- Name: current_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public."current_role"() RETURNS public.user_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select role from public.profiles where id = auth.uid();
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce((select role in ('super_admin','seksi_acara') from public.profiles where id = auth.uid()), false);
$$;


--
-- Name: is_staff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_staff() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce((select role in ('super_admin','seksi_acara','media_center') from public.profiles where id = auth.uid()), false);
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: sync_participant_points(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_participant_points() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  update public.participants p
  set total_points = coalesce((
    select sum(points) from public.point_transactions where participant_id = p.id
  ), 0)
  where p.id = coalesce(new.participant_id, old.participant_id);
  return null;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    actor_role public.user_role,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id text,
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    category public.announcement_category DEFAULT 'umum'::public.announcement_category NOT NULL,
    body text NOT NULL,
    cover_url text,
    attachment_url text,
    target_roles public.user_role[] DEFAULT ARRAY['peserta'::public.user_role, 'juri'::public.user_role, 'media_center'::public.user_role, 'seksi_acara'::public.user_role],
    is_published boolean DEFAULT false NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    show_on_monitor boolean DEFAULT false NOT NULL,
    publish_at timestamp with time zone DEFAULT now() NOT NULL,
    expire_at timestamp with time zone,
    author_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assessment_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    criterion_id uuid NOT NULL,
    score numeric(6,2) DEFAULT 0 NOT NULL,
    comment text
);


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_id uuid NOT NULL,
    competition_id uuid NOT NULL,
    judge_id uuid NOT NULL,
    status public.assessment_status DEFAULT 'draft'::public.assessment_status NOT NULL,
    weighted_total numeric(10,2) DEFAULT 0 NOT NULL,
    notes text,
    submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: challenge_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenge_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_id uuid NOT NULL,
    participant_id uuid NOT NULL,
    proof_url text,
    proof_type text,
    description text,
    status public.submission_status DEFAULT 'menunggu'::public.submission_status NOT NULL,
    points_awarded integer DEFAULT 0 NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    type public.challenge_type DEFAULT 'scan_qr'::public.challenge_type NOT NULL,
    point_reward integer DEFAULT 25 NOT NULL,
    max_claims integer,
    banner_url text,
    badge_icon text,
    start_at timestamp with time zone DEFAULT now() NOT NULL,
    end_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: competition_criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competition_criteria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competition_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    weight numeric(5,2) DEFAULT 0 NOT NULL,
    max_score numeric(6,2) DEFAULT 100 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_weight_range CHECK (((weight >= (0)::numeric) AND (weight <= (100)::numeric)))
);


--
-- Name: competition_judges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competition_judges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competition_id uuid NOT NULL,
    judge_id uuid NOT NULL,
    is_chief_judge boolean DEFAULT false NOT NULL,
    expertise_note text,
    status public.judge_assignment_status DEFAULT 'aktif'::public.judge_assignment_status NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: competitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    short_name text NOT NULL,
    description text NOT NULL,
    theme_link text,
    type public.competition_type DEFAULT 'individu'::public.competition_type NOT NULL,
    status public.competition_status DEFAULT 'draft'::public.competition_status NOT NULL,
    aggregation public.aggregation_method DEFAULT 'rata_rata'::public.aggregation_method NOT NULL,
    min_team_members integer DEFAULT 2 NOT NULL,
    max_team_members integer DEFAULT 10 NOT NULL,
    max_participants integer,
    registration_open_at timestamp with time zone,
    registration_close_at timestamp with time zone,
    poster_url text,
    rules text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doorprize_winners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doorprize_winners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doorprize_id uuid,
    doorprize_name text NOT NULL,
    reward_id uuid,
    participant_id uuid NOT NULL,
    participant_name text NOT NULL,
    participant_reg_num text NOT NULL,
    participant_institution text NOT NULL,
    participant_phone text DEFAULT ''::text,
    drawn_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    drawn_by uuid,
    status text DEFAULT 'sah'::text NOT NULL,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT doorprize_winners_status_check CHECK ((status = ANY (ARRAY['sah'::text, 'dibatalkan'::text, 'diserahkan'::text])))
);


--
-- Name: doorprizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doorprizes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    reward_id uuid,
    total_quantity integer DEFAULT 1 NOT NULL,
    remaining_quantity integer DEFAULT 1 NOT NULL,
    sponsor text DEFAULT ''::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT doorprizes_remaining_quantity_check CHECK ((remaining_quantity >= 0)),
    CONSTRAINT doorprizes_total_quantity_check CHECK ((total_quantity >= 1))
);


--
-- Name: event_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: institutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institutions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'sekolah'::text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jigsaw_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jigsaw_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    puzzle_id uuid,
    participant_id uuid NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    time_seconds integer,
    moves_count integer DEFAULT 0 NOT NULL,
    is_completed boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jigsaw_puzzles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jigsaw_puzzles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text DEFAULT 'Misteri Mahakarya Budaya'::text NOT NULL,
    description text DEFAULT 'Susun kembali kepingan mahakarya seni budaya Indonesia hingga utuh untuk meraih poin reward!'::text,
    image_url text NOT NULL,
    grid_size integer DEFAULT 3 NOT NULL,
    pieces_count integer DEFAULT 9 NOT NULL,
    points_reward integer DEFAULT 100 NOT NULL,
    time_limit_seconds integer DEFAULT 120,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    start_at timestamp with time zone DEFAULT now(),
    end_at timestamp with time zone
);


--
-- Name: media_contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_contents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text,
    content_type text DEFAULT 'berita'::text NOT NULL,
    excerpt text,
    body text,
    file_url text,
    thumbnail_url text,
    tags text[],
    is_published boolean DEFAULT false NOT NULL,
    author_id uuid,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: monitor_displays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitor_displays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    layout_type text DEFAULT 'rotasi'::text NOT NULL,
    rotation_interval_seconds integer DEFAULT 15 NOT NULL,
    theme text DEFAULT 'dark'::text NOT NULL,
    access_token text,
    is_active boolean DEFAULT true NOT NULL,
    emergency_message text,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: monitor_playlist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitor_playlist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    display_id uuid NOT NULL,
    module_key text NOT NULL,
    competition_id uuid,
    duration_seconds integer DEFAULT 15 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    body text,
    type text DEFAULT 'info'::text NOT NULL,
    link text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: participant_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.participant_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    participant_id uuid NOT NULL,
    doc_type text NOT NULL,
    file_url text NOT NULL,
    file_name text,
    status public.document_status DEFAULT 'menunggu'::public.document_status NOT NULL,
    note text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    registration_number text NOT NULL,
    full_name text NOT NULL,
    nickname text,
    email text,
    phone text,
    institution text,
    birth_date date,
    address text,
    photo_url text,
    status public.participant_status DEFAULT 'menunggu_verifikasi'::public.participant_status NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    rejection_reason text,
    total_points integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: point_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    participant_id uuid NOT NULL,
    challenge_id uuid,
    stand_id uuid,
    points integer NOT NULL,
    source public.point_source NOT NULL,
    note text,
    granted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    nickname text,
    phone text,
    institution text,
    avatar_url text,
    role public.user_role DEFAULT 'peserta'::public.user_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: puzzle_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.puzzle_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    participant_id uuid NOT NULL,
    total_items integer DEFAULT 0 NOT NULL,
    correct_count integer DEFAULT 0 NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    time_seconds integer,
    answers jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: puzzle_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.puzzle_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    costume_name text NOT NULL,
    region_name text NOT NULL,
    costume_image_url text,
    hint text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: qr_letter_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_letter_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    target_phrase text NOT NULL,
    points_reward integer DEFAULT 50 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    start_at timestamp with time zone DEFAULT now(),
    end_at timestamp with time zone
);


--
-- Name: qr_letter_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_letter_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_id uuid NOT NULL,
    letter character varying(2) NOT NULL,
    letter_index integer NOT NULL,
    qr_token text NOT NULL,
    location_hint text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: qr_letter_scans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_letter_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_id uuid NOT NULL,
    participant_id uuid NOT NULL,
    qr_code_id uuid NOT NULL,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: qr_letter_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_letter_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_id uuid NOT NULL,
    participant_id uuid NOT NULL,
    submitted_phrase text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    time_seconds integer,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: registration_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registration_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_id uuid NOT NULL,
    member_name text NOT NULL,
    member_role text,
    student_id text,
    institution text,
    is_leader boolean DEFAULT false NOT NULL
);


--
-- Name: registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    participant_id uuid NOT NULL,
    competition_id uuid NOT NULL,
    team_name text,
    performance_order integer,
    is_confirmed boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reward_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reward_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reward_id uuid NOT NULL,
    participant_id uuid NOT NULL,
    points_spent integer NOT NULL,
    status public.redemption_status DEFAULT 'menunggu'::public.redemption_status NOT NULL,
    pickup_code text,
    processed_by uuid,
    processed_at timestamp with time zone,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    image_url text,
    points_required integer NOT NULL,
    quota integer,
    claimed_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competition_id uuid,
    title text NOT NULL,
    description text,
    event_day integer DEFAULT 1 NOT NULL,
    event_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone,
    venue text NOT NULL,
    stage text,
    host_name text,
    status public.schedule_status DEFAULT 'terjadwal'::public.schedule_status NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competition_id uuid,
    name text NOT NULL,
    code text NOT NULL,
    qr_token uuid DEFAULT gen_random_uuid() NOT NULL,
    description text,
    booth_location text,
    points_per_visit integer DEFAULT 10 NOT NULL,
    max_visits_per_participant integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: twibbon_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.twibbon_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    image_url text NOT NULL,
    thumbnail_url text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: twibbons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.twibbons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    participant_id uuid,
    user_id uuid,
    uploader_name text NOT NULL,
    uploader_institution text,
    caption text,
    image_url text NOT NULL,
    uploader_ip inet,
    status public.moderation_status DEFAULT 'menunggu'::public.moderation_status NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    moderated_by uuid,
    moderated_at timestamp with time zone,
    reject_reason text,
    likes_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    template_id uuid
);


--
-- Name: v_assessment_totals; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_assessment_totals AS
SELECT
    NULL::uuid AS assessment_id,
    NULL::uuid AS registration_id,
    NULL::uuid AS competition_id,
    NULL::uuid AS judge_id,
    NULL::public.assessment_status AS status,
    NULL::timestamp with time zone AS submitted_at,
    NULL::numeric(10,2) AS weighted_total;


--
-- Name: v_competition_final_score; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_competition_final_score AS
 SELECT competition_id,
    registration_id,
    count(*) FILTER (WHERE (status <> 'draft'::public.assessment_status)) AS judges_count,
    round(avg(weighted_total) FILTER (WHERE (status <> 'draft'::public.assessment_status)), 2) AS average_score,
    round(sum(weighted_total) FILTER (WHERE (status <> 'draft'::public.assessment_status)), 2) AS sum_score,
    round((((sum(weighted_total) FILTER (WHERE (status <> 'draft'::public.assessment_status)) - COALESCE(max(weighted_total) FILTER (WHERE (status <> 'draft'::public.assessment_status)), (0)::numeric)) - COALESCE(min(weighted_total) FILTER (WHERE (status <> 'draft'::public.assessment_status)), (0)::numeric)) / (NULLIF((count(*) FILTER (WHERE (status <> 'draft'::public.assessment_status)) - 2), 0))::numeric), 2) AS trimmed_average_score
   FROM public.v_assessment_totals t
  GROUP BY competition_id, registration_id;


--
-- Name: winners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.winners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category public.winner_category DEFAULT 'lomba'::public.winner_category NOT NULL,
    competition_id uuid,
    challenge_id uuid,
    registration_id uuid,
    participant_id uuid,
    winner_name text NOT NULL,
    institution text,
    rank integer DEFAULT 1 NOT NULL,
    title text,
    final_score numeric(10,2),
    prize text,
    is_published boolean DEFAULT false NOT NULL,
    announced_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_slug_key UNIQUE (slug);


--
-- Name: assessment_scores assessment_scores_assessment_id_criterion_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_scores
    ADD CONSTRAINT assessment_scores_assessment_id_criterion_id_key UNIQUE (assessment_id, criterion_id);


--
-- Name: assessment_scores assessment_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_scores
    ADD CONSTRAINT assessment_scores_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_registration_id_judge_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_registration_id_judge_id_key UNIQUE (registration_id, judge_id);


--
-- Name: challenge_submissions challenge_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_submissions
    ADD CONSTRAINT challenge_submissions_pkey PRIMARY KEY (id);


--
-- Name: challenges challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_pkey PRIMARY KEY (id);


--
-- Name: challenges challenges_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_slug_key UNIQUE (slug);


--
-- Name: competition_criteria competition_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_criteria
    ADD CONSTRAINT competition_criteria_pkey PRIMARY KEY (id);


--
-- Name: competition_judges competition_judges_competition_id_judge_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_judges
    ADD CONSTRAINT competition_judges_competition_id_judge_id_key UNIQUE (competition_id, judge_id);


--
-- Name: competition_judges competition_judges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_judges
    ADD CONSTRAINT competition_judges_pkey PRIMARY KEY (id);


--
-- Name: competitions competitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_pkey PRIMARY KEY (id);


--
-- Name: competitions competitions_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_slug_key UNIQUE (slug);


--
-- Name: doorprize_winners doorprize_winners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doorprize_winners
    ADD CONSTRAINT doorprize_winners_pkey PRIMARY KEY (id);


--
-- Name: doorprizes doorprizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doorprizes
    ADD CONSTRAINT doorprizes_pkey PRIMARY KEY (id);


--
-- Name: event_settings event_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_settings
    ADD CONSTRAINT event_settings_pkey PRIMARY KEY (key);


--
-- Name: institutions institutions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_name_key UNIQUE (name);


--
-- Name: institutions institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_pkey PRIMARY KEY (id);


--
-- Name: jigsaw_attempts jigsaw_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jigsaw_attempts
    ADD CONSTRAINT jigsaw_attempts_pkey PRIMARY KEY (id);


--
-- Name: jigsaw_puzzles jigsaw_puzzles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jigsaw_puzzles
    ADD CONSTRAINT jigsaw_puzzles_pkey PRIMARY KEY (id);


--
-- Name: media_contents media_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_contents
    ADD CONSTRAINT media_contents_pkey PRIMARY KEY (id);


--
-- Name: media_contents media_contents_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_contents
    ADD CONSTRAINT media_contents_slug_key UNIQUE (slug);


--
-- Name: monitor_displays monitor_displays_access_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_displays
    ADD CONSTRAINT monitor_displays_access_token_key UNIQUE (access_token);


--
-- Name: monitor_displays monitor_displays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_displays
    ADD CONSTRAINT monitor_displays_pkey PRIMARY KEY (id);


--
-- Name: monitor_displays monitor_displays_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_displays
    ADD CONSTRAINT monitor_displays_slug_key UNIQUE (slug);


--
-- Name: monitor_playlist_items monitor_playlist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_playlist_items
    ADD CONSTRAINT monitor_playlist_items_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: participant_documents participant_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_documents
    ADD CONSTRAINT participant_documents_pkey PRIMARY KEY (id);


--
-- Name: participants participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_pkey PRIMARY KEY (id);


--
-- Name: participants participants_registration_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_registration_number_key UNIQUE (registration_number);


--
-- Name: participants participants_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_user_id_key UNIQUE (user_id);


--
-- Name: point_transactions point_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: puzzle_attempts puzzle_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puzzle_attempts
    ADD CONSTRAINT puzzle_attempts_pkey PRIMARY KEY (id);


--
-- Name: puzzle_items puzzle_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puzzle_items
    ADD CONSTRAINT puzzle_items_pkey PRIMARY KEY (id);


--
-- Name: qr_letter_challenges qr_letter_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_letter_challenges
    ADD CONSTRAINT qr_letter_challenges_pkey PRIMARY KEY (id);


--
-- Name: qr_letter_codes qr_letter_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_letter_codes
    ADD CONSTRAINT qr_letter_codes_pkey PRIMARY KEY (id);


--
-- Name: qr_letter_codes qr_letter_codes_qr_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_letter_codes
    ADD CONSTRAINT qr_letter_codes_qr_token_key UNIQUE (qr_token);


--
-- Name: qr_letter_scans qr_letter_scans_participant_id_qr_code_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_letter_scans
    ADD CONSTRAINT qr_letter_scans_participant_id_qr_code_id_key UNIQUE (participant_id, qr_code_id);


--
-- Name: qr_letter_scans qr_letter_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_letter_scans
    ADD CONSTRAINT qr_letter_scans_pkey PRIMARY KEY (id);


--
-- Name: qr_letter_submissions qr_letter_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_letter_submissions
    ADD CONSTRAINT qr_letter_submissions_pkey PRIMARY KEY (id);


--
-- Name: registration_members registration_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_members
    ADD CONSTRAINT registration_members_pkey PRIMARY KEY (id);


--
-- Name: registrations registrations_participant_id_competition_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT registrations_participant_id_competition_id_key UNIQUE (participant_id, competition_id);


--
-- Name: registrations registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT registrations_pkey PRIMARY KEY (id);


--
-- Name: reward_redemptions reward_redemptions_pickup_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_pickup_code_key UNIQUE (pickup_code);


--
-- Name: reward_redemptions reward_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_pkey PRIMARY KEY (id);


--
-- Name: rewards rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rewards
    ADD CONSTRAINT rewards_pkey PRIMARY KEY (id);


--
-- Name: schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (id);


--
-- Name: stands stands_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stands
    ADD CONSTRAINT stands_code_key UNIQUE (code);


--
-- Name: stands stands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stands
    ADD CONSTRAINT stands_pkey PRIMARY KEY (id);


--
-- Name: stands stands_qr_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stands
    ADD CONSTRAINT stands_qr_token_key UNIQUE (qr_token);


--
-- Name: twibbon_templates twibbon_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.twibbon_templates
    ADD CONSTRAINT twibbon_templates_pkey PRIMARY KEY (id);


--
-- Name: twibbons twibbons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.twibbons
    ADD CONSTRAINT twibbons_pkey PRIMARY KEY (id);


--
-- Name: point_transactions uq_stand_visit; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT uq_stand_visit UNIQUE (participant_id, stand_id, source);


--
-- Name: winners winners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.winners
    ADD CONSTRAINT winners_pkey PRIMARY KEY (id);


--
-- Name: idx_announcements_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_category ON public.announcements USING btree (category);


--
-- Name: idx_announcements_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_published ON public.announcements USING btree (is_published, publish_at);


--
-- Name: idx_assessments_competition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessments_competition ON public.assessments USING btree (competition_id);


--
-- Name: idx_assessments_judge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessments_judge ON public.assessments USING btree (judge_id);


--
-- Name: idx_challenges_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenges_active ON public.challenges USING btree (is_active);


--
-- Name: idx_competitions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitions_status ON public.competitions USING btree (status);


--
-- Name: idx_criteria_competition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_criteria_competition ON public.competition_criteria USING btree (competition_id);


--
-- Name: idx_documents_participant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_participant ON public.participant_documents USING btree (participant_id);


--
-- Name: idx_documents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_status ON public.participant_documents USING btree (status);


--
-- Name: idx_doorprize_winners_drawn_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doorprize_winners_drawn_at ON public.doorprize_winners USING btree (drawn_at DESC);


--
-- Name: idx_doorprize_winners_participant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doorprize_winners_participant ON public.doorprize_winners USING btree (participant_id);


--
-- Name: idx_doorprize_winners_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doorprize_winners_status ON public.doorprize_winners USING btree (status);


--
-- Name: idx_institutions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institutions_active ON public.institutions USING btree (is_active, sort_order, name);


--
-- Name: idx_jigsaw_attempts_participant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jigsaw_attempts_participant ON public.jigsaw_attempts USING btree (participant_id);


--
-- Name: idx_jigsaw_attempts_puzzle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jigsaw_attempts_puzzle ON public.jigsaw_attempts USING btree (puzzle_id);


--
-- Name: idx_jigsaw_puzzles_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jigsaw_puzzles_active ON public.jigsaw_puzzles USING btree (is_active);


--
-- Name: idx_judges_competition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_judges_competition ON public.competition_judges USING btree (competition_id);


--
-- Name: idx_judges_judge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_judges_judge ON public.competition_judges USING btree (judge_id);


--
-- Name: idx_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_created ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_entity ON public.activity_logs USING btree (entity, entity_id);


--
-- Name: idx_media_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_published ON public.media_contents USING btree (is_published, published_at);


--
-- Name: idx_members_registration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_registration ON public.registration_members USING btree (registration_id);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_participants_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_status ON public.participants USING btree (status);


--
-- Name: idx_participants_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_user ON public.participants USING btree (user_id);


--
-- Name: idx_playlist_display; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_playlist_display ON public.monitor_playlist_items USING btree (display_id);


--
-- Name: idx_points_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_created ON public.point_transactions USING btree (created_at);


--
-- Name: idx_points_participant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_participant ON public.point_transactions USING btree (participant_id);


--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);


--
-- Name: idx_puzzle_attempts_participant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_puzzle_attempts_participant ON public.puzzle_attempts USING btree (participant_id);


--
-- Name: idx_puzzle_items_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_puzzle_items_active ON public.puzzle_items USING btree (is_active, sort_order);


--
-- Name: idx_qr_letter_challenges_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_letter_challenges_active ON public.qr_letter_challenges USING btree (is_active);


--
-- Name: idx_qr_letter_codes_challenge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_letter_codes_challenge ON public.qr_letter_codes USING btree (challenge_id);


--
-- Name: idx_qr_letter_codes_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_letter_codes_token ON public.qr_letter_codes USING btree (qr_token);


--
-- Name: idx_qr_letter_scans_part; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_letter_scans_part ON public.qr_letter_scans USING btree (participant_id, challenge_id);


--
-- Name: idx_qr_letter_submissions_challenge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_letter_submissions_challenge ON public.qr_letter_submissions USING btree (challenge_id);


--
-- Name: idx_qr_letter_submissions_part; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_letter_submissions_part ON public.qr_letter_submissions USING btree (participant_id);


--
-- Name: idx_redemptions_participant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_redemptions_participant ON public.reward_redemptions USING btree (participant_id);


--
-- Name: idx_redemptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_redemptions_status ON public.reward_redemptions USING btree (status);


--
-- Name: idx_registrations_competition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_competition ON public.registrations USING btree (competition_id);


--
-- Name: idx_schedules_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedules_date ON public.schedules USING btree (event_date);


--
-- Name: idx_schedules_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedules_status ON public.schedules USING btree (status);


--
-- Name: idx_scores_assessment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scores_assessment ON public.assessment_scores USING btree (assessment_id);


--
-- Name: idx_stands_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stands_active ON public.stands USING btree (is_active);


--
-- Name: idx_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_status ON public.challenge_submissions USING btree (status);


--
-- Name: idx_twibbon_templates_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_twibbon_templates_active ON public.twibbon_templates USING btree (is_active, sort_order);


--
-- Name: idx_twibbons_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_twibbons_featured ON public.twibbons USING btree (is_featured);


--
-- Name: idx_twibbons_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_twibbons_status ON public.twibbons USING btree (status);


--
-- Name: idx_twibbons_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_twibbons_template_id ON public.twibbons USING btree (template_id);


--
-- Name: idx_winners_competition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_winners_competition ON public.winners USING btree (competition_id);


--
-- Name: idx_winners_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_winners_published ON public.winners USING btree (is_published);


--
-- Name: v_assessment_totals _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.v_assessment_totals AS
 SELECT a.id AS assessment_id,
    a.registration_id,
    a.competition_id,
    a.judge_id,
    a.status,
    a.submitted_at,
    (COALESCE(sum(((s.score * c.weight) / 100.0)), (0)::numeric))::numeric(10,2) AS weighted_total
   FROM ((public.assessments a
     LEFT JOIN public.assessment_scores s ON ((s.assessment_id = a.id)))
     LEFT JOIN public.competition_criteria c ON ((c.id = s.criterion_id)))
  GROUP BY a.id;


--
-- Name: point_transactions trg_sync_points; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_points AFTER INSERT OR DELETE OR UPDATE ON public.point_transactions FOR EACH ROW EXECUTE FUNCTION public.sync_participant_points();


--
-- Name: activity_logs activity_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: announcements announcements_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: assessment_scores assessment_scores_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_scores
    ADD CONSTRAINT assessment_scores_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: assessment_scores assessment_scores_criterion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_scores
    ADD CONSTRAINT assessment_scores_criterion_id_fkey FOREIGN KEY (criterion_id) REFERENCES public.competition_criteria(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_competition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES public.competitions(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_judge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_judge_id_fkey FOREIGN KEY (judge_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE CASCADE;


--
-- Name: challenge_submissions challenge_submissions_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_submissions
    ADD CONSTRAINT challenge_submissions_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;


--
-- Name: challenge_submissions challenge_submissions_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_submissions
    ADD CONSTRAINT challenge_submissions_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: challenge_submissions challenge_submissions_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_submissions
    ADD CONSTRAINT challenge_submissions_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: challenges challenges_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: competition_criteria competition_criteria_competition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_criteria
    ADD CONSTRAINT competition_criteria_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES public.competitions(id) ON DELETE CASCADE;


--
-- Name: competition_judges competition_judges_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_judges
    ADD CONSTRAINT competition_judges_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: competition_judges competition_judges_competition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_judges
    ADD CONSTRAINT competition_judges_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES public.competitions(id) ON DELETE CASCADE;


--
-- Name: competition_judges competition_judges_judge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_judges
    ADD CONSTRAINT competition_judges_judge_id_fkey FOREIGN KEY (judge_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: competitions competitions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: doorprize_winners doorprize_winners_doorprize_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doorprize_winners
    ADD CONSTRAINT doorprize_winners_doorprize_id_fkey FOREIGN KEY (doorprize_id) REFERENCES public.doorprizes(id) ON DELETE SET NULL;


--
-- Name: doorprize_winners doorprize_winners_drawn_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doorprize_winners
    ADD CONSTRAINT doorprize_winners_drawn_by_fkey FOREIGN KEY (drawn_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: doorprize_winners doorprize_winners_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doorprize_winners
    ADD CONSTRAINT doorprize_winners_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: doorprize_winners doorprize_winners_reward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doorprize_winners
    ADD CONSTRAINT doorprize_winners_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES public.rewards(id) ON DELETE SET NULL;


--
-- Name: doorprizes doorprizes_reward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doorprizes
    ADD CONSTRAINT doorprizes_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES public.rewards(id) ON DELETE SET NULL;


--
-- Name: event_settings event_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_settings
    ADD CONSTRAINT event_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: jigsaw_attempts jigsaw_attempts_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jigsaw_attempts
    ADD CONSTRAINT jigsaw_attempts_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: jigsaw_attempts jigsaw_attempts_puzzle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jigsaw_attempts
    ADD CONSTRAINT jigsaw_attempts_puzzle_id_fkey FOREIGN KEY (puzzle_id) REFERENCES public.jigsaw_puzzles(id) ON DELETE CASCADE;


--
-- Name: jigsaw_puzzles jigsaw_puzzles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jigsaw_puzzles
    ADD CONSTRAINT jigsaw_puzzles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: media_contents media_contents_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_contents
    ADD CONSTRAINT media_contents_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: monitor_displays monitor_displays_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_displays
    ADD CONSTRAINT monitor_displays_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: monitor_playlist_items monitor_playlist_items_competition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_playlist_items
    ADD CONSTRAINT monitor_playlist_items_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES public.competitions(id) ON DELETE SET NULL;


--
-- Name: monitor_playlist_items monitor_playlist_items_display_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor_playlist_items
    ADD CONSTRAINT monitor_playlist_items_display_id_fkey FOREIGN KEY (display_id) REFERENCES public.monitor_displays(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: participant_documents participant_documents_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_documents
    ADD CONSTRAINT participant_documents_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: participant_documents participant_documents_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_documents
    ADD CONSTRAINT participant_documents_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: participants participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: participants participants_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: point_transactions point_transactions_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE SET NULL;


--
-- Name: point_transactions point_transactions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: point_transactions point_transactions_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: point_transactions point_transactions_stand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_stand_id_fkey FOREIGN KEY (stand_id) REFERENCES public.stands(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: puzzle_attempts puzzle_attempts_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puzzle_attempts
    ADD CONSTRAINT puzzle_attempts_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: puzzle_items puzzle_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puzzle_items
    ADD CONSTRAINT puzzle_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: qr_letter_challenges qr_letter_challenges_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_letter_challenges
    ADD CONSTRAINT qr_letter_challenges_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: qr_letter_codes qr_letter_codes_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_letter_codes
    ADD CONSTRAINT qr_letter_codes_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.qr_letter_challenges(id) ON DELETE CASCADE;


--
-- Name: qr_letter_scans qr_letter_scans_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_letter_scans
    ADD CONSTRAINT qr_letter_scans_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.qr_letter_challenges(id) ON DELETE CASCADE;


--
-- Name: qr_letter_scans qr_letter_scans_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_letter_scans
    ADD CONSTRAINT qr_letter_scans_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: qr_letter_scans qr_letter_scans_qr_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_letter_scans
    ADD CONSTRAINT qr_letter_scans_qr_code_id_fkey FOREIGN KEY (qr_code_id) REFERENCES public.qr_letter_codes(id) ON DELETE CASCADE;


--
-- Name: qr_letter_submissions qr_letter_submissions_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_letter_submissions
    ADD CONSTRAINT qr_letter_submissions_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.qr_letter_challenges(id) ON DELETE CASCADE;


--
-- Name: qr_letter_submissions qr_letter_submissions_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_letter_submissions
    ADD CONSTRAINT qr_letter_submissions_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: registration_members registration_members_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_members
    ADD CONSTRAINT registration_members_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE CASCADE;


--
-- Name: registrations registrations_competition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT registrations_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES public.competitions(id) ON DELETE CASCADE;


--
-- Name: registrations registrations_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT registrations_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: reward_redemptions reward_redemptions_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: reward_redemptions reward_redemptions_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: reward_redemptions reward_redemptions_reward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_redemptions
    ADD CONSTRAINT reward_redemptions_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES public.rewards(id) ON DELETE RESTRICT;


--
-- Name: schedules schedules_competition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES public.competitions(id) ON DELETE SET NULL;


--
-- Name: stands stands_competition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stands
    ADD CONSTRAINT stands_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES public.competitions(id) ON DELETE SET NULL;


--
-- Name: twibbon_templates twibbon_templates_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.twibbon_templates
    ADD CONSTRAINT twibbon_templates_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: twibbons twibbons_moderated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.twibbons
    ADD CONSTRAINT twibbons_moderated_by_fkey FOREIGN KEY (moderated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: twibbons twibbons_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.twibbons
    ADD CONSTRAINT twibbons_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE SET NULL;


--
-- Name: twibbons twibbons_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.twibbons
    ADD CONSTRAINT twibbons_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.twibbon_templates(id) ON DELETE SET NULL;


--
-- Name: twibbons twibbons_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.twibbons
    ADD CONSTRAINT twibbons_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: winners winners_competition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.winners
    ADD CONSTRAINT winners_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES public.competitions(id) ON DELETE CASCADE;


--
-- Name: winners winners_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.winners
    ADD CONSTRAINT winners_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: winners winners_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.winners
    ADD CONSTRAINT winners_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE SET NULL;


--
-- Name: winners winners_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.winners
    ADD CONSTRAINT winners_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE SET NULL;


--
-- Name: twibbon_templates Admins can manage templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage templates" ON public.twibbon_templates USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: twibbon_templates Admins can view all templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all templates" ON public.twibbon_templates FOR SELECT USING ((public.is_admin() OR public.is_staff()));


--
-- Name: twibbon_templates Public can view active templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active templates" ON public.twibbon_templates FOR SELECT USING ((is_active = true));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_logs activity_logs_insert_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_logs_insert_all ON public.activity_logs FOR INSERT WITH CHECK (true);


--
-- Name: activity_logs activity_logs_read_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_logs_read_admin ON public.activity_logs FOR SELECT USING (public.is_admin());


--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements announcements_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY announcements_read_all ON public.announcements FOR SELECT USING (true);


--
-- Name: announcements announcements_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY announcements_write_staff ON public.announcements USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: assessment_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_scores assessment_scores_rw_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assessment_scores_rw_own ON public.assessment_scores USING (((EXISTS ( SELECT 1
   FROM public.assessments a
  WHERE ((a.id = assessment_scores.assessment_id) AND (a.judge_id = auth.uid())))) OR public.is_admin()));


--
-- Name: assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: assessments assessments_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assessments_insert_own ON public.assessments FOR INSERT WITH CHECK (((judge_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.competition_judges cj
  WHERE ((cj.competition_id = assessments.competition_id) AND (cj.judge_id = auth.uid()) AND (cj.status = 'aktif'::public.judge_assignment_status))))));


--
-- Name: assessments assessments_read_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assessments_read_own_or_admin ON public.assessments FOR SELECT USING (((judge_id = auth.uid()) OR public.is_admin()));


--
-- Name: assessments assessments_update_own_draft; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assessments_update_own_draft ON public.assessments FOR UPDATE USING (((judge_id = auth.uid()) AND (status <> 'final'::public.assessment_status)));


--
-- Name: challenge_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: challenges challenges_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY challenges_read_all ON public.challenges FOR SELECT USING (true);


--
-- Name: challenges challenges_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY challenges_write_admin ON public.challenges USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: competition_criteria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.competition_criteria ENABLE ROW LEVEL SECURITY;

--
-- Name: competition_judges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.competition_judges ENABLE ROW LEVEL SECURITY;

--
-- Name: competitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

--
-- Name: competitions competitions_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY competitions_read_all ON public.competitions FOR SELECT USING (true);


--
-- Name: competitions competitions_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY competitions_write_admin ON public.competitions USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: competition_criteria criteria_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY criteria_read_all ON public.competition_criteria FOR SELECT USING (true);


--
-- Name: competition_criteria criteria_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY criteria_write_admin ON public.competition_criteria USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: doorprize_winners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doorprize_winners ENABLE ROW LEVEL SECURITY;

--
-- Name: doorprize_winners doorprize_winners_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY doorprize_winners_read_all ON public.doorprize_winners FOR SELECT USING (true);


--
-- Name: doorprize_winners doorprize_winners_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY doorprize_winners_write_staff ON public.doorprize_winners USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: doorprizes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doorprizes ENABLE ROW LEVEL SECURITY;

--
-- Name: doorprizes doorprizes_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY doorprizes_read_all ON public.doorprizes FOR SELECT USING (true);


--
-- Name: doorprizes doorprizes_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY doorprizes_write_staff ON public.doorprizes USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: event_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: institutions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

--
-- Name: institutions institutions_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY institutions_read_all ON public.institutions FOR SELECT USING (true);


--
-- Name: institutions institutions_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY institutions_write_staff ON public.institutions USING (true) WITH CHECK (true);


--
-- Name: jigsaw_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jigsaw_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: jigsaw_attempts jigsaw_attempts_insert_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY jigsaw_attempts_insert_auth ON public.jigsaw_attempts FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: jigsaw_attempts jigsaw_attempts_read_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY jigsaw_attempts_read_own_or_admin ON public.jigsaw_attempts FOR SELECT USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.participants p
  WHERE ((p.id = jigsaw_attempts.participant_id) AND (p.user_id = auth.uid()))))));


--
-- Name: jigsaw_puzzles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jigsaw_puzzles ENABLE ROW LEVEL SECURITY;

--
-- Name: jigsaw_puzzles jigsaw_puzzles_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY jigsaw_puzzles_read_all ON public.jigsaw_puzzles FOR SELECT USING (true);


--
-- Name: jigsaw_puzzles jigsaw_puzzles_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY jigsaw_puzzles_write_admin ON public.jigsaw_puzzles USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: media_contents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.media_contents ENABLE ROW LEVEL SECURITY;

--
-- Name: monitor_displays; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monitor_displays ENABLE ROW LEVEL SECURITY;

--
-- Name: monitor_playlist_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monitor_playlist_items ENABLE ROW LEVEL SECURITY;

--
-- Name: monitor_playlist_items monitor_playlist_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY monitor_playlist_read ON public.monitor_playlist_items FOR SELECT USING (true);


--
-- Name: monitor_playlist_items monitor_playlist_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY monitor_playlist_write ON public.monitor_playlist_items USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: monitor_displays monitor_read_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY monitor_read_active ON public.monitor_displays FOR SELECT USING (((is_active = true) OR public.is_staff()));


--
-- Name: monitor_displays monitor_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY monitor_write_staff ON public.monitor_displays USING (public.is_staff()) WITH CHECK (public.is_staff());


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: participant_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.participant_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

--
-- Name: participants participants_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY participants_read_all ON public.participants FOR SELECT USING (true);


--
-- Name: participants participants_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY participants_write_admin ON public.participants USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: point_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: point_transactions points_read_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY points_read_own_or_admin ON public.point_transactions FOR SELECT USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.participants p
  WHERE ((p.id = point_transactions.participant_id) AND (p.user_id = auth.uid()))))));


--
-- Name: point_transactions points_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY points_write_admin ON public.point_transactions FOR INSERT WITH CHECK ((public.is_admin() OR public.is_staff()));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_read_all ON public.profiles FOR SELECT USING (true);


--
-- Name: profiles profiles_update_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own_or_admin ON public.profiles FOR UPDATE USING (((id = auth.uid()) OR public.is_admin()));


--
-- Name: puzzle_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.puzzle_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: puzzle_attempts puzzle_attempts_insert_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY puzzle_attempts_insert_auth ON public.puzzle_attempts FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: puzzle_attempts puzzle_attempts_read_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY puzzle_attempts_read_own_or_admin ON public.puzzle_attempts FOR SELECT USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.participants p
  WHERE ((p.id = puzzle_attempts.participant_id) AND (p.user_id = auth.uid()))))));


--
-- Name: puzzle_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.puzzle_items ENABLE ROW LEVEL SECURITY;

--
-- Name: puzzle_items puzzle_items_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY puzzle_items_read_all ON public.puzzle_items FOR SELECT USING (true);


--
-- Name: puzzle_items puzzle_items_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY puzzle_items_write_admin ON public.puzzle_items USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: qr_letter_challenges qr_challenges_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qr_challenges_read_all ON public.qr_letter_challenges FOR SELECT USING (true);


--
-- Name: qr_letter_challenges qr_challenges_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qr_challenges_write_admin ON public.qr_letter_challenges USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: qr_letter_codes qr_codes_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qr_codes_read_all ON public.qr_letter_codes FOR SELECT USING (true);


--
-- Name: qr_letter_codes qr_codes_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qr_codes_write_admin ON public.qr_letter_codes USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: qr_letter_challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qr_letter_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: qr_letter_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qr_letter_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: qr_letter_scans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qr_letter_scans ENABLE ROW LEVEL SECURITY;

--
-- Name: qr_letter_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qr_letter_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: qr_letter_scans qr_scans_insert_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qr_scans_insert_auth ON public.qr_letter_scans FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: qr_letter_scans qr_scans_read_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qr_scans_read_own_or_admin ON public.qr_letter_scans FOR SELECT USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.participants p
  WHERE ((p.id = qr_letter_scans.participant_id) AND (p.user_id = auth.uid()))))));


--
-- Name: qr_letter_submissions qr_subs_insert_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qr_subs_insert_auth ON public.qr_letter_submissions FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: qr_letter_submissions qr_subs_read_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qr_subs_read_own_or_admin ON public.qr_letter_submissions FOR SELECT USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.participants p
  WHERE ((p.id = qr_letter_submissions.participant_id) AND (p.user_id = auth.uid()))))));


--
-- Name: registration_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.registration_members ENABLE ROW LEVEL SECURITY;

--
-- Name: registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: registrations registrations_insert_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY registrations_insert_auth ON public.registrations FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) OR public.is_admin()));


--
-- Name: registrations registrations_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY registrations_read_all ON public.registrations FOR SELECT USING (true);


--
-- Name: registrations registrations_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY registrations_write_admin ON public.registrations FOR UPDATE USING (public.is_admin());


--
-- Name: reward_redemptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

--
-- Name: rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: rewards rewards_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rewards_read_all ON public.rewards FOR SELECT USING (true);


--
-- Name: rewards rewards_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rewards_write_admin ON public.rewards USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: schedules schedules_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY schedules_read_all ON public.schedules FOR SELECT USING (true);


--
-- Name: schedules schedules_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY schedules_write_admin ON public.schedules USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: stands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stands ENABLE ROW LEVEL SECURITY;

--
-- Name: stands stands_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stands_read_all ON public.stands FOR SELECT USING (true);


--
-- Name: stands stands_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stands_write_admin ON public.stands USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: twibbon_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.twibbon_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: twibbons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.twibbons ENABLE ROW LEVEL SECURITY;

--
-- Name: twibbons twibbons_insert_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY twibbons_insert_public ON public.twibbons FOR INSERT TO authenticated, anon WITH CHECK (((status = 'menunggu'::public.moderation_status) AND (is_featured = false) AND (((auth.uid() IS NULL) AND (user_id IS NULL)) OR ((auth.uid() IS NOT NULL) AND (user_id = auth.uid())))));


--
-- Name: twibbons twibbons_moderate_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY twibbons_moderate_staff ON public.twibbons FOR UPDATE USING (public.is_staff());


--
-- Name: twibbons twibbons_read_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY twibbons_read_approved ON public.twibbons FOR SELECT USING (((status = 'disetujui'::public.moderation_status) OR (user_id = auth.uid()) OR public.is_staff()));


--
-- Name: twibbons twibbons_read_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY twibbons_read_own ON public.twibbons FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: winners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

--
-- Name: winners winners_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY winners_read_all ON public.winners FOR SELECT USING (true);


--
-- Name: winners winners_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY winners_write_admin ON public.winners USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- PostgreSQL database dump complete
--

\unrestrict 1ki2EnlsYNNPevTeoKT2E2Uqh6hgJNJ2NC4d3BC4vv0R5DkumUAmvJkooZRwPBS

