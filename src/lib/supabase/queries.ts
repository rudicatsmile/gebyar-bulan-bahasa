import { publicClient } from "./public";
import { Database } from "@/types/database.types";
import {
  COMPETITIONS,
  SCHEDULES,
  ANNOUNCEMENTS,
  WINNERS,
  TWIBBONS,
  CHALLENGE_LEADERBOARD,
  STANDS,
  CHALLENGES,
  REWARDS,
  type Competition,
  type ScheduleItem,
  type Announcement,
  type Winner,
  type Stand,
  type Challenge,
  type Reward,
} from "@/lib/dummy-data";

type DbCompetition = Database["public"]["Tables"]["competitions"]["Row"];
type DbCriterion = Database["public"]["Tables"]["competition_criteria"]["Row"];
type DbSchedule = Database["public"]["Tables"]["schedules"]["Row"];
type DbAnnouncement = Database["public"]["Tables"]["announcements"]["Row"];
type DbWinner = Database["public"]["Tables"]["winners"]["Row"];
type DbStand = Database["public"]["Tables"]["stands"]["Row"];
type DbChallenge = Database["public"]["Tables"]["challenges"]["Row"];
type DbReward = Database["public"]["Tables"]["rewards"]["Row"];

interface DbCompetitionWithCriteria extends DbCompetition {
  competition_criteria?: DbCriterion[];
}

interface DbWinnerWithCompetition extends DbWinner {
  competitions?: { name: string } | null;
}

// Helper map slug from competition id
const compIdToSlug: Record<string, string> = {
  "a0000000-0000-0000-0000-000000000001": "membaca-puisi",
  "a0000000-0000-0000-0000-000000000002": "film-pendek",
  "a0000000-0000-0000-0000-000000000003": "pidato",
  "a0000000-0000-0000-0000-000000000004": "melukis-tas-kanvas",
  "a0000000-0000-0000-0000-000000000005": "monolog",
  "a0000000-0000-0000-0000-000000000006": "mc-formal",
  "a0000000-0000-0000-0000-000000000007": "palang-pintu",
  "a0000000-0000-0000-0000-000000000008": "vokal-grup",
};

// Helper map competition id to display name
const compIdToName: Record<string, string> = {
  "a0000000-0000-0000-0000-000000000001": "Membaca Puisi",
  "a0000000-0000-0000-0000-000000000002": "Film Pendek",
  "a0000000-0000-0000-0000-000000000003": "Pidato Bahasa Indonesia",
  "a0000000-0000-0000-0000-000000000004": "Melukis Tas Kanvas",
  "a0000000-0000-0000-0000-000000000005": "Seni Teater Monolog",
  "a0000000-0000-0000-0000-000000000006": "Pembawa Acara (MC) Formal",
  "a0000000-0000-0000-0000-000000000007": "Seni Tradisi Palang Pintu",
  "a0000000-0000-0000-0000-000000000008": "Vokal Grup Lagu Daerah & Nasional",
};

/**
 * Format PostgreSQL row into frontend Competition interface
 */
function formatCompetition(row: DbCompetitionWithCriteria): Competition {
  const criteria = (row.competition_criteria || [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || "",
      weight: Number(c.weight),
      maxScore: Number(c.max_score ?? 100),
    }));

  const rules =
    typeof row.rules === "string"
      ? row.rules.split("\n").filter((r) => r.trim().length > 0)
      : [];

  const rawStatus = row.status;
  const status: "pendaftaran" | "berlangsung" | "selesai" | "draft" | "terjadwal" =
    rawStatus === "berlangsung" || rawStatus === "selesai" || rawStatus === "draft"
      ? rawStatus
      : "pendaftaran";

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.short_name || row.name,
    category: (row.type as "individu" | "kelompok") || "individu",
    status,
    description: row.description || "",
    venue: row.theme_link || "Panggung Utama",
    stage: "Stage A",
    date: "27-28 Oktober 2025",
    time: "09:00 - 16:00 WIB",
    minMembers: row.min_team_members ?? 1,
    maxMembers: row.max_team_members ?? 1,
    maxParticipants: row.max_participants ?? 20,
    currentParticipantsCount: 18,
    aggregation: row.aggregation || "rata_rata",
    rules,
    criteria,
  };
}

/**
 * Format PostgreSQL schedule row into frontend ScheduleItem interface
 */
function formatSchedule(row: DbSchedule): ScheduleItem {
  const startTime = row.start_time ? row.start_time.slice(0, 5) : "09:00";
  const endTime = row.end_time ? row.end_time.slice(0, 5) : "Selesai";

  const rawStatus = row.status;
  const status: "terjadwal" | "berlangsung" | "selesai" =
    rawStatus === "berlangsung" || rawStatus === "selesai" ? rawStatus : "terjadwal";

  return {
    id: row.id,
    competitionId: row.competition_id || undefined,
    title: row.title,
    day: row.event_day,
    date: row.event_date || "27 Oktober 2025",
    time: `${startTime} - ${endTime} WIB`,
    venue: row.venue,
    stage: row.stage || "Stage A",
    host: row.host_name || "Panitia Acara",
    status,
  };
}

/**
 * Format PostgreSQL announcement row into frontend Announcement interface
 */
function formatAnnouncement(row: DbAnnouncement): Announcement {
  const publishedDate = row.publish_at || row.created_at;
  const formattedDate = publishedDate
    ? new Date(publishedDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) + ", 08:00 WIB"
    : "27 Oktober 2025, 08:00 WIB";

  const rawCategory = row.category;
  const category: "umum" | "jadwal" | "pemenang" | "penting" =
    rawCategory === "jadwal" || rawCategory === "pemenang" || rawCategory === "penting"
      ? rawCategory
      : "umum";

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category,
    body: row.body,
    publishedAt: formattedDate,
    isPinned: Boolean(row.is_pinned),
    author: "Seksi Acara",
    showOnMonitor: Boolean(row.show_on_monitor),
  };
}

/**
 * Format PostgreSQL winner row into frontend Winner interface
 */
function formatWinner(row: DbWinnerWithCompetition): Winner {
  const compName =
    (row.competitions && row.competitions.name) ||
    (row.competition_id ? compIdToName[row.competition_id] : null) ||
    "Cabang Lomba Kebudayaan";

  const rank = (row.rank >= 1 && row.rank <= 4 ? row.rank : 1) as 1 | 2 | 3 | 4;

  return {
    id: row.id,
    competitionId: row.competition_id || "",
    competitionName: compName,
    rank,
    title: row.title || `Juara ${row.rank}`,
    winnerName: row.winner_name,
    teamName: undefined,
    institution: row.institution || "Umum",
    finalScore: Number(row.final_score) || 0,
    prize: row.prize || "Piala & Piagam Penghargaan",
  };
}

/**
 * Format PostgreSQL stand row into frontend Stand interface
 */
function formatStand(row: DbStand): Stand {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    competitionSlug: row.competition_id ? compIdToSlug[row.competition_id] || "kebudayaan" : "kebudayaan",
    location: row.booth_location || "Area Pameran",
    points: row.points_per_visit ?? 10,
    description: row.description || "",
    qrToken: row.qr_token,
    visitCount: 140,
  };
}

/**
 * Format PostgreSQL challenge row into frontend Challenge interface
 */
function formatChallenge(row: DbChallenge): Challenge {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    type: row.type,
    pointReward: row.point_reward ?? 25,
    badge: row.badge_icon || "Penjelajah Bahasa",
    participantsCount: 215,
    status: row.is_active ? "aktif" : "selesai",
  };
}

/**
 * Format PostgreSQL reward row into frontend Reward interface
 */
function formatReward(row: DbReward): Reward {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    pointsRequired: row.points_required,
    quota: row.quota ?? 100,
    claimedCount: row.claimed_count ?? 0,
    category: row.points_required >= 200 ? "Merchandise" : "Voucher",
  };
}

// =====================================================================
// EXPORTED PUBLIC QUERIES
// =====================================================================

export async function getCompetitions(): Promise<Competition[]> {
  try {
    const { data, error } = await publicClient
      .from("competitions")
      .select("*, competition_criteria(*)")
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return COMPETITIONS;
    }
    return (data as unknown as DbCompetitionWithCriteria[]).map(formatCompetition);
  } catch (err) {
    console.error("Supabase getCompetitions fallback:", err);
    return COMPETITIONS;
  }
}

export async function getCompetitionBySlug(slug: string): Promise<Competition | null> {
  try {
    const { data, error } = await publicClient
      .from("competitions")
      .select("*, competition_criteria(*)")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      return COMPETITIONS.find((c) => c.slug === slug) || null;
    }
    return formatCompetition(data as unknown as DbCompetitionWithCriteria);
  } catch (err) {
    console.error("Supabase getCompetitionBySlug fallback:", err);
    return COMPETITIONS.find((c) => c.slug === slug) || null;
  }
}

export async function getSchedules(): Promise<ScheduleItem[]> {
  try {
    const { data, error } = await publicClient
      .from("schedules")
      .select("*")
      .order("event_day", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("start_time", { ascending: true });

    if (error || !data || data.length === 0) {
      return SCHEDULES;
    }
    return data.map(formatSchedule);
  } catch (err) {
    console.error("Supabase getSchedules fallback:", err);
    return SCHEDULES;
  }
}

export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const { data, error } = await publicClient
      .from("announcements")
      .select("*")
      .eq("is_published", true)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return ANNOUNCEMENTS;
    }
    return data.map(formatAnnouncement);
  } catch (err) {
    console.error("Supabase getAnnouncements fallback:", err);
    return ANNOUNCEMENTS;
  }
}

export async function getAllAnnouncements(): Promise<Announcement[]> {
  try {
    const { data, error } = await publicClient
      .from("announcements")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return ANNOUNCEMENTS;
    }
    return data.map(formatAnnouncement);
  } catch (err) {
    console.error("Supabase getAllAnnouncements fallback:", err);
    return ANNOUNCEMENTS;
  }
}


export async function getAnnouncementBySlug(slug: string): Promise<Announcement | null> {
  try {
    const { data, error } = await publicClient
      .from("announcements")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      return ANNOUNCEMENTS.find((a) => a.slug === slug) || null;
    }
    return formatAnnouncement(data);
  } catch (err) {
    console.error("Supabase getAnnouncementBySlug fallback:", err);
    return ANNOUNCEMENTS.find((a) => a.slug === slug) || null;
  }
}

export async function getWinners(): Promise<Winner[]> {
  try {
    const { data, error } = await publicClient
      .from("winners")
      .select("*, competitions(name)")
      .eq("is_published", true)
      .order("rank", { ascending: true });

    if (error || !data || data.length === 0) {
      return WINNERS;
    }
    return (data as unknown as DbWinnerWithCompetition[]).map(formatWinner);
  } catch (err) {
    console.error("Supabase getWinners fallback:", err);
    return WINNERS;
  }
}

export async function getStands(): Promise<Stand[]> {
  try {
    const { data, error } = await publicClient
      .from("stands")
      .select("*")
      .eq("is_active", true)
      .order("code", { ascending: true });

    if (error || !data || data.length === 0) {
      return STANDS;
    }
    return data.map(formatStand);
  } catch (err) {
    console.error("Supabase getStands fallback:", err);
    return STANDS;
  }
}

export async function getChallenges(): Promise<Challenge[]> {
  try {
    const { data, error } = await publicClient
      .from("challenges")
      .select("*")
      .eq("is_active", true)
      .order("point_reward", { ascending: false });

    if (error || !data || data.length === 0) {
      return CHALLENGES;
    }
    return data.map(formatChallenge);
  } catch (err) {
    console.error("Supabase getChallenges fallback:", err);
    return CHALLENGES;
  }
}

export async function getRewards(): Promise<Reward[]> {
  try {
    const { data, error } = await publicClient
      .from("rewards")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return REWARDS;
    }
    return data.map(formatReward);
  } catch (err) {
    console.error("Supabase getRewards fallback:", err);
    return REWARDS;
  }
}

export async function getApprovedTwibbons() {
  try {
    const { data, error } = await publicClient
      .from("twibbons")
      .select("*")
      .eq("status", "disetujui")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return TWIBBONS.filter((t) => t.status === "disetujui");
    }
    return data;
  } catch {
    return TWIBBONS.filter((t) => t.status === "disetujui");
  }
}

export async function getChallengeLeaderboard() {
  try {
    const { data, error } = await publicClient
      .from("participants")
      .select("id, full_name, institution, total_points")
      .order("total_points", { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) {
      return CHALLENGE_LEADERBOARD;
    }

    return data.map((p, idx) => ({
      rank: idx + 1,
      name: p.full_name,
      institution: p.institution || "Umum",
      points: p.total_points,
      badge:
        idx === 0
          ? "Penjelajah Bahasa"
          : idx < 3
          ? "Pewarta Muda"
          : idx < 6
          ? "Duta Bahasa"
          : "Pilar Pemuda",
    }));
  } catch {
    return CHALLENGE_LEADERBOARD;
  }
}
