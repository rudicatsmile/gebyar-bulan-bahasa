"use client";

import * as React from "react";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { getCompetitionMonitoringData } from "@/app/actions/competitions";

interface DisplayJudge {
  id: string;
  fullName: string;
  expertise: string;
  avatarUrl: string;
  isChiefJudge: boolean;
}

interface DisplayParticipant {
  id: string;
  registrationNumber: string;
  fullName: string;
  institution: string;
}

interface MonitoringData {
  competition: {
    id: string;
    slug: string;
    name: string;
    shortName: string;
    category: string;
    status: string;
    description: string;
  } | null;
  judges: DisplayJudge[];
  participants: DisplayParticipant[];
  scores: Record<string, Record<string, number>>;
}

export type RealtimeStatus = "connecting" | "connected" | "polling" | "disconnected";

interface UseRealtimeMonitoringReturn extends MonitoringData {
  loading: boolean;
  realtimeStatus: RealtimeStatus;
  lastUpdatedAt: Date | null;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 8_000;

export function useRealtimeMonitoring(slug: string): UseRealtimeMonitoringReturn {
  const [loading, setLoading] = React.useState(true);
  const [competition, setCompetition] = React.useState<MonitoringData["competition"]>(null);
  const [judges, setJudges] = React.useState<DisplayJudge[]>([]);
  const [participants, setParticipants] = React.useState<DisplayParticipant[]>([]);
  const [scores, setScores] = React.useState<Record<string, Record<string, number>>>({});
  const [realtimeStatus, setRealtimeStatus] = React.useState<RealtimeStatus>("connecting");
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<Date | null>(null);

  const competitionIdRef = React.useRef<string | null>(null);
  const pollingRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = React.useRef(true);

  // Fungsi untuk memuat data lengkap dari server action
  const fetchFullData = React.useCallback(
    async (showLoading = false) => {
      if (!slug) return;
      if (showLoading) setLoading(true);

      try {
        const res = await getCompetitionMonitoringData(slug);
        if (!mountedRef.current) return;

        if (res.success) {
          if (res.competition) {
            setCompetition(res.competition);
            competitionIdRef.current = res.competition.id;
          }
          if (res.judges) setJudges(res.judges);
          if (res.participants) setParticipants(res.participants);
          if (res.scores) setScores(res.scores);
          setLastUpdatedAt(new Date());
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data.";
        const isNetworkErr =
          msg.toLowerCase().includes("networkerror") ||
          msg.toLowerCase().includes("failed to fetch") ||
          msg.toLowerCase().includes("load failed") ||
          msg.toLowerCase().includes("abort") ||
          msg.toLowerCase().includes("network request failed");

        if (isNetworkErr) {
          console.warn("[RealtimeMonitoring] Disrupsi jaringan sementara:", msg);
        } else {
          console.error("[RealtimeMonitoring] Gagal memuat data:", msg);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [slug]
  );

  // Fungsi untuk menangani event realtime dari Supabase
  const handleRealtimeEvent = React.useCallback(
    (payload: any) => {
      if (!mountedRef.current) return;

      const row = payload.new || payload.old;
      if (!row) return;

      // Hanya proses jika competition_id cocok
      if (row.competition_id && competitionIdRef.current && row.competition_id !== competitionIdRef.current) {
        return;
      }

      const regId = row.registration_id as string;
      const judgeId = row.judge_id as string;
      const weightedTotal = Number(row.weighted_total);
      const status = row.status as string;

      if (payload.eventType === "DELETE") {
        // Hapus skor juri untuk registrasi ini
        setScores((prev) => {
          const updated = { ...prev };
          if (updated[regId]) {
            const regScores = { ...updated[regId] };
            delete regScores[judgeId];
            updated[regId] = regScores;
          }
          return updated;
        });
      } else {
        // INSERT atau UPDATE — hanya tampilkan jika status terkirim/final (bukan draft)
        if (status === "terkirim" || status === "final") {
          setScores((prev) => {
            const updated = { ...prev };
            if (!updated[regId]) updated[regId] = {};
            updated[regId] = { ...updated[regId], [judgeId]: weightedTotal };
            return updated;
          });
        } else if (status === "draft") {
          // Untuk draft, bisa kita hapus skor finalnya atau biarkan — kita biarkan existing
          // tetapi jika sebelumnya belum ada skor, jangan tambahkan
        }
      }

      setLastUpdatedAt(new Date());
    },
    []
  );

  // Setup Supabase Realtime subscription
  React.useEffect(() => {
    mountedRef.current = true;

    // 1. Initial data fetch
    fetchFullData(true);

    // 2. Try Supabase Realtime
    let channel: any = null;
    let usingPolling = false;

    const setupRealtime = () => {
      try {
        const supabase = createBrowserSupabase();

        channel = supabase
          .channel(`monitoring-${slug}`)
          .on(
            "postgres_changes" as any,
            {
              event: "*",
              schema: "public",
              table: "assessments",
            },
            (payload: any) => {
              handleRealtimeEvent(payload);
            }
          )
          .subscribe((status: string) => {
            if (!mountedRef.current) return;

            if (status === "SUBSCRIBED") {
              setRealtimeStatus("connected");
              // Stop polling jika realtime berhasil
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              console.warn("[RealtimeMonitoring] Channel error, fallback ke polling");
              setRealtimeStatus("polling");
              startPolling();
            } else if (status === "CLOSED") {
              if (mountedRef.current) {
                setRealtimeStatus("disconnected");
              }
            }
          });
      } catch (err) {
        console.warn("[RealtimeMonitoring] Gagal subscribe realtime, gunakan polling:", err);
        setRealtimeStatus("polling");
        startPolling();
      }
    };

    const startPolling = () => {
      if (pollingRef.current) return; // Sudah polling
      usingPolling = true;
      pollingRef.current = setInterval(() => {
        if (mountedRef.current) {
          fetchFullData(false);
        }
      }, POLL_INTERVAL_MS);
    };

    setupRealtime();

    // Jika setelah 5 detik masih "connecting", fallback ke polling
    const fallbackTimeout = setTimeout(() => {
      if (mountedRef.current && realtimeStatus === "connecting") {
        setRealtimeStatus("polling");
        startPolling();
      }
    }, 5000);

    return () => {
      mountedRef.current = false;

      // Cleanup channel
      if (channel) {
        try {
          const supabase = createBrowserSupabase();
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }

      // Cleanup polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      clearTimeout(fallbackTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return {
    loading,
    competition,
    judges,
    participants,
    scores,
    realtimeStatus,
    lastUpdatedAt,
    refresh: () => fetchFullData(false),
  };
}
