import { publicClient } from "./public";
import { createAdminClient } from "./admin";
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
  type TwibbonItem,
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
function formatCompetition(
  row: DbCompetitionWithCriteria,
  manuscriptsMap?: Record<string, string[]>,
  eventFormatsMap?: Record<string, string[]>,
  countsMap?: Record<string, number>
): Competition {
  const criteria = (row.competition_criteria || [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || "",
      weight: Number(c.weight),
      maxScore: Number(c.max_score ?? 100),
    }));

  const fallbackComp = COMPETITIONS.find((c) => c.slug === row.slug || c.id === row.id);
  const fallbackRules = fallbackComp?.rules || [];

  const rules =
    typeof row.rules === "string" && row.rules.trim().length > 0
      ? row.rules
          .split("\n")
          .map((r) => r.trim())
          .filter((r) => r.length > 0)
      : row.rules === null
      ? fallbackRules
      : [];

  const fallbackManuscripts = fallbackComp?.manuscripts || [];

  const manuscripts =
    manuscriptsMap && (manuscriptsMap[row.slug] || manuscriptsMap[row.id])
      ? manuscriptsMap[row.slug] || manuscriptsMap[row.id]
      : fallbackManuscripts;

  const fallbackEventFormats = fallbackComp?.eventFormats || [];

  const eventFormats =
    eventFormatsMap && (eventFormatsMap[row.slug] || eventFormatsMap[row.id])
      ? eventFormatsMap[row.slug] || eventFormatsMap[row.id]
      : fallbackEventFormats;

  const rawStatus = row.status;
  const status: Competition["status"] =
    rawStatus === "berlangsung" ||
    rawStatus === "selesai" ||
    rawStatus === "draft" ||
    rawStatus === "dibatalkan"
      ? rawStatus
      : "pendaftaran";

  const fallbackCount = fallbackComp?.currentParticipantsCount ?? 0;
  const currentParticipantsCount =
    countsMap !== undefined
      ? countsMap[row.id] ?? (row.slug ? countsMap[row.slug] : undefined) ?? 0
      : fallbackCount;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.short_name || row.name,
    category: (row.type as "individu" | "kelompok") || "individu",
    status,
    description: row.description || "",
    venue: (() => {
      const raw = row.theme_link || "";
      return raw.includes(" | ") ? raw.split(" | ")[0].trim() : raw || "Panggung Utama";
    })(),
    stage: (() => {
      const raw = row.theme_link || "";
      return raw.includes(" | ") ? raw.split(" | ")[1].trim() : "";
    })(),
    date: "10-11 November 2026",
    time: "09:00 - 16:00 WIB",
    minMembers: row.min_team_members ?? 1,
    maxMembers: row.max_team_members ?? 1,
    maxParticipants: row.max_participants ?? 20,
    currentParticipantsCount,
    aggregation: row.aggregation || "rata_rata",
    rules,
    criteria,
    manuscripts,
    eventFormats,
  };
}

function formatEventDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "10 November 2026";
  if (dateStr.includes("November") || dateStr.includes("Oktober") || dateStr.includes(" ")) return dateStr;
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const d = new Date(year, month, day);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
    }
  } catch {
    // fallback
  }
  return dateStr;
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
    date: formatEventDateIndo(row.event_date),
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

async function fetchManuscriptsMap(): Promise<Record<string, string[]>> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", "competition_manuscripts")
      .maybeSingle();

    if (data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
      return data.value as Record<string, string[]>;
    }
  } catch (err) {
    console.error("fetchManuscriptsMap error:", err);
  }
  return {};
}

async function fetchEventFormatsMap(): Promise<Record<string, string[]>> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", "competition_event_formats")
      .maybeSingle();

    if (data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
      return data.value as Record<string, string[]>;
    }
  } catch (err) {
    console.error("fetchEventFormatsMap error:", err);
  }
  return {};
}

async function fetchRegistrationCountsMap(): Promise<Record<string, number>> {
  try {
    const admin = createAdminClient();
    const [regRes, dbProgressRes] = await Promise.all([
      admin.from("registrations").select("competition_id"),
      admin.from("event_settings").select("value").eq("key", "duta_bahasa_progress").maybeSingle(),
    ]);

    const map: Record<string, number> = {};
    if (regRes.data) {
      for (const row of regRes.data) {
        if (row.competition_id) {
          map[row.competition_id] = (map[row.competition_id] || 0) + 1;
        }
      }
    }

    if (dbProgressRes.data?.value && typeof dbProgressRes.data.value === "object") {
      const dbCount = Object.keys(dbProgressRes.data.value).length;
      if (dbCount > 0) {
        map["duta-bahasa"] = Math.max(map["duta-bahasa"] || 0, dbCount);
      }
    }

    return map;
  } catch (err) {
    console.error("fetchRegistrationCountsMap error:", err);
    return {};
  }
}

// =====================================================================
// EXPORTED PUBLIC QUERIES
// =====================================================================

export async function getCompetitions(): Promise<Competition[]> {
  try {
    const [compResult, manuscriptsMap, eventFormatsMap, countsMap] = await Promise.all([
      publicClient
        .from("competitions")
        .select("*, competition_criteria(*)")
        .order("sort_order", { ascending: true }),
      fetchManuscriptsMap(),
      fetchEventFormatsMap(),
      fetchRegistrationCountsMap(),
    ]);

    if (compResult.error || !compResult.data || compResult.data.length === 0) {
      return COMPETITIONS;
    }
    return (compResult.data as unknown as DbCompetitionWithCriteria[]).map((row) =>
      formatCompetition(row, manuscriptsMap, eventFormatsMap, countsMap)
    );
  } catch (err) {
    console.error("Supabase getCompetitions fallback:", err);
    return COMPETITIONS;
  }
}

export async function getCompetitionBySlug(slug: string): Promise<Competition | null> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    const resolvedSlug = compIdToSlug[slug] || slug;

    const query = publicClient.from("competitions").select("*, competition_criteria(*)");
    const [compResult, manuscriptsMap, eventFormatsMap, countsMap] = await Promise.all([
      isUuid
        ? query.eq("id", slug).maybeSingle()
        : query.eq("slug", resolvedSlug).maybeSingle(),
      fetchManuscriptsMap(),
      fetchEventFormatsMap(),
      fetchRegistrationCountsMap(),
    ]);

    if (compResult.error || !compResult.data) {
      return (
        COMPETITIONS.find(
          (c) => c.slug === resolvedSlug || c.slug === slug || c.id === slug
        ) || null
      );
    }
    return formatCompetition(compResult.data as unknown as DbCompetitionWithCriteria, manuscriptsMap, eventFormatsMap, countsMap);
  } catch (err) {
    console.error("Supabase getCompetitionBySlug fallback:", err);
    const resolvedSlug = compIdToSlug[slug] || slug;
    return (
      COMPETITIONS.find(
        (c) => c.slug === resolvedSlug || c.slug === slug || c.id === slug
      ) || null
    );
  }
}

export async function getCompetitionById(idOrSlug: string): Promise<Competition | null> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const slug = compIdToSlug[idOrSlug] || idOrSlug;

    const query = publicClient.from("competitions").select("*, competition_criteria(*)");
    const [compResult, manuscriptsMap, eventFormatsMap, countsMap] = await Promise.all([
      isUuid
        ? query.eq("id", idOrSlug).maybeSingle()
        : query.eq("slug", slug).maybeSingle(),
      fetchManuscriptsMap(),
      fetchEventFormatsMap(),
      fetchRegistrationCountsMap(),
    ]);

    if (compResult.error || !compResult.data) {
      return (
        COMPETITIONS.find(
          (c) => c.id === idOrSlug || c.slug === idOrSlug || c.slug === slug
        ) || null
      );
    }
    return formatCompetition(compResult.data as unknown as DbCompetitionWithCriteria, manuscriptsMap, eventFormatsMap, countsMap);
  } catch (err) {
    console.error("Supabase getCompetitionById fallback:", err);
    const slug = compIdToSlug[idOrSlug] || idOrSlug;
    return (
      COMPETITIONS.find(
        (c) => c.id === idOrSlug || c.slug === idOrSlug || c.slug === slug
      ) || null
    );
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
      return [];
    }
    return (data as unknown as DbWinnerWithCompetition[]).map(formatWinner);
  } catch (err) {
    console.error("Supabase getWinners error:", err);
    return [];
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
      return [];
    }
    return data.map(formatReward);
  } catch (err) {
    console.error("Supabase getRewards error:", err);
    return [];
  }
}

export async function getApprovedTwibbons(): Promise<TwibbonItem[]> {
  try {
    const { data, error } = await publicClient
      .from("twibbons")
      .select("*")
      .eq("status", "disetujui")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }
    return data.map((t) => ({
      id: t.id,
      uploaderName: t.uploader_name,
      institution: t.uploader_institution || "Umum",
      caption: t.caption || "",
      imageUrl: t.image_url,
      status: t.status as "disetujui" | "menunggu" | "ditolak",
      isFeatured: t.is_featured,
      likesCount: t.likes_count || 0,
      uploadedAt: new Date(t.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  } catch {
    return [];
  }
}

export async function getAllTwibbons(): Promise<TwibbonItem[]> {
  try {
    const { data, error } = await publicClient
      .from("twibbons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }
    return data.map((t) => ({
      id: t.id,
      uploaderName: t.uploader_name,
      institution: t.uploader_institution || "Umum",
      caption: t.caption || "",
      imageUrl: t.image_url,
      status: t.status as "disetujui" | "menunggu" | "ditolak",
      isFeatured: t.is_featured,
      likesCount: t.likes_count || 0,
      uploadedAt: new Date(t.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  } catch {
    return [];
  }
}

export async function getChallengeLeaderboard() {
  try {
    const { data, error } = await publicClient
      .from("participants")
      .select("id, full_name, institution, total_points")
      .order("total_points", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Supabase getChallengeLeaderboard error:", error);
      return CHALLENGE_LEADERBOARD;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((p, idx) => ({
      rank: idx + 1,
      name: p.full_name,
      institution: p.institution || "Umum",
      points: Number(p.total_points) || 0,
      badge:
        idx === 0
          ? "Penjelajah Bahasa"
          : idx < 3
          ? "Pewarta Muda"
          : idx < 6
          ? "Duta Bahasa"
          : "Pilar Pemuda",
    }));
  } catch (err) {
    console.error("Supabase getChallengeLeaderboard fallback:", err);
    return CHALLENGE_LEADERBOARD;
  }
}

export interface MonitorScoreItem {
  rank: number;
  registrationId: string;
  participantName: string;
  institution: string;
  finalAverageScore: number;
}

export interface MonitorDisplayData {
  schedules: ScheduleItem[];
  competitions: Competition[];
  activeCompetition: Competition | null;
  liveScores: MonitorScoreItem[];
  announcements: Announcement[];
  importantAnnouncement: Announcement | null;
  winners: Winner[];
  twibbons: TwibbonItem[];
  leaderboard: Array<{
    rank: number;
    name: string;
    institution: string;
    points: number;
    badge: string;
  }>;
  emergencyMessage?: string | null;
  eventSettings?: {
    eventName: string;
    eventTheme: string;
    eventYear: string;
    eventDate: string;
  } | null;
}

export async function getMonitorData(): Promise<MonitorDisplayData> {
  try {
    const [schedules, competitions, announcements, winners, twibbons, leaderboard] =
      await Promise.all([
        getSchedules(),
        getCompetitions(),
        getAnnouncements(),
        getWinners(),
        getApprovedTwibbons(),
        getChallengeLeaderboard(),
      ]);

    const activeCompetition =
      competitions.find((c) => c.status === "berlangsung") ||
      competitions.find((c) => c.status === "pendaftaran") ||
      competitions[0] ||
      null;

    let liveScores: MonitorScoreItem[] = [];
    if (activeCompetition?.id) {
      try {
        const { getCompetitionScoringRecap } = await import("@/app/actions/assessments");
        const recapRes = await getCompetitionScoringRecap(activeCompetition.id);
        if (recapRes.success && recapRes.recaps && recapRes.recaps.length > 0) {
          liveScores = recapRes.recaps.map((r) => ({
            rank: r.rank,
            registrationId: r.registrationId,
            participantName: r.participantName,
            institution: r.institution,
            finalAverageScore: r.finalScore,
          }));
        }
      } catch (err) {
        console.error("Error fetching live scores for monitor:", err);
      }
    }

    const importantAnnouncement =
      announcements.find((a) => a.isPinned || a.category === "penting") ||
      announcements[0] ||
      null;

    let emergencyMessage: string | null = null;
    try {
      const { data: display } = await publicClient
        .from("monitor_displays")
        .select("emergency_message")
        .eq("slug", "utama")
        .maybeSingle();
      emergencyMessage = display?.emergency_message || null;
    } catch {
      // ignore
    }

    let eventSettings = null;
    try {
      const { getEventSettings } = await import("@/app/actions/settings");
      const settingsRes = await getEventSettings();
      if (settingsRes.success && settingsRes.settings) {
        eventSettings = {
          eventName: settingsRes.settings.eventName,
          eventTheme: settingsRes.settings.eventTheme,
          eventYear: settingsRes.settings.eventYear,
          eventDate: settingsRes.settings.eventDate,
        };
      }
    } catch {
      // ignore
    }

    return {
      schedules,
      competitions,
      activeCompetition,
      liveScores,
      announcements,
      importantAnnouncement,
      winners,
      twibbons,
      leaderboard,
      emergencyMessage,
      eventSettings,
    };
  } catch (err) {
    console.error("Supabase getMonitorData fallback:", err);
    return {
      schedules: SCHEDULES,
      competitions: COMPETITIONS,
      activeCompetition: COMPETITIONS[0] || null,
      liveScores: [],
      announcements: ANNOUNCEMENTS,
      importantAnnouncement: ANNOUNCEMENTS[0] || null,
      winners: [],
      twibbons: [],
      leaderboard: [],
      emergencyMessage: null,
      eventSettings: {
        eventName: "Gebyar Bulan Bahasa dan Kebudayaan 2026",
        eventTheme: "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.",
        eventYear: "2026",
        eventDate: "11 November 2026",
      },
    };
  }
}
