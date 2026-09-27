import { createClient } from "./server";
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
  SCORING_RECAPS,
} from "@/lib/dummy-data";

export async function getCompetitions() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("competitions")
      .select("*, competition_criteria(*)")
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return COMPETITIONS;
    }
    return data;
  } catch {
    return COMPETITIONS;
  }
}

export async function getCompetitionBySlug(slug: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("competitions")
      .select("*, competition_criteria(*)")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      return COMPETITIONS.find((c) => c.slug === slug) || null;
    }
    return data;
  } catch {
    return COMPETITIONS.find((c) => c.slug === slug) || null;
  }
}

export async function getSchedules() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .order("event_day", { ascending: true })
      .order("start_time", { ascending: true });

    if (error || !data || data.length === 0) {
      return SCHEDULES;
    }
    return data;
  } catch {
    return SCHEDULES;
  }
}

export async function getAnnouncements() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_published", true)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return ANNOUNCEMENTS;
    }
    return data;
  } catch {
    return ANNOUNCEMENTS;
  }
}

export async function getWinners() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("winners")
      .select("*")
      .eq("is_published", true)
      .order("rank", { ascending: true });

    if (error || !data || data.length === 0) {
      return WINNERS;
    }
    return data;
  } catch {
    return WINNERS;
  }
}

export async function getApprovedTwibbons() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
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
    const supabase = await createClient();
    const { data, error } = await supabase
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

export async function getStands() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stands")
      .select("*")
      .order("name", { ascending: true });

    if (error || !data || data.length === 0) {
      return STANDS;
    }
    return data;
  } catch {
    return STANDS;
  }
}

export async function getRewards() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rewards")
      .select("*")
      .eq("is_active", true)
      .order("points_required", { ascending: true });

    if (error || !data || data.length === 0) {
      return REWARDS;
    }
    return data;
  } catch {
    return REWARDS;
  }
}
