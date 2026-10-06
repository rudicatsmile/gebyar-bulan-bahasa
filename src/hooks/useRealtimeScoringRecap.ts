"use client";

import * as React from "react";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import {
  getCompetitionScoringRecap,
  type ScoringRecapItem,
} from "@/app/actions/assessments";

export interface CompetitionInfo {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  category: string;
  status: string;
  aggregation: string;
  criteria: Array<{ id: string; name: string; weight: number }>;
}

export interface JudgeInfo {
  id: string;
  fullName: string;
  isChiefJudge: boolean;
}

export type RealtimeStatus = "connecting" | "connected" | "polling" | "disconnected";

export interface UseRealtimeScoringRecapReturn {
  loading: boolean;
  isRefreshing: boolean;
  competition: CompetitionInfo | null;
  judges: JudgeInfo[];
  recaps: ScoringRecapItem[];
  realtimeStatus: RealtimeStatus;
  lastUpdatedAt: Date | null;
  error: string | null;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 8_000;

export function useRealtimeScoringRecap(competitionIdOrSlug: string): UseRealtimeScoringRecapReturn {
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [competition, setCompetition] = React.useState<CompetitionInfo | null>(null);
  const [judges, setJudges] = React.useState<JudgeInfo[]>([]);
  const [recaps, setRecaps] = React.useState<ScoringRecapItem[]>([]);
  const [realtimeStatus, setRealtimeStatus] = React.useState<RealtimeStatus>("connecting");
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const compIdRef = React.useRef<string | null>(null);
  const pollingRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = React.useRef(true);

  const fetchData = React.useCallback(
    async (showLoading = false) => {
      if (!competitionIdOrSlug) return;
      if (showLoading) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const res = await getCompetitionScoringRecap(competitionIdOrSlug);
        if (!mountedRef.current) return;

        if (res.success) {
          if (res.competition) {
            setCompetition(res.competition);
            compIdRef.current = res.competition.id;
          }
          if (res.judges) setJudges(res.judges);
          if (res.recaps) setRecaps(res.recaps);
          setError(null);
          setLastUpdatedAt(new Date());
        } else {
          setCompetition((prev) => {
            if (!prev) setError(res.error || "Gagal memuat data penilaian");
            return prev;
          });
        }
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat rekap.";
        const isNetworkErr =
          msg.toLowerCase().includes("networkerror") ||
          msg.toLowerCase().includes("failed to fetch") ||
          msg.toLowerCase().includes("load failed") ||
          msg.toLowerCase().includes("abort") ||
          msg.toLowerCase().includes("network request failed");

        if (isNetworkErr) {
          console.warn("[RealtimeScoringRecap] Disrupsi jaringan sementara:", msg);
          setCompetition((prev) => {
            if (!prev) setError("Koneksi terganggu. Sistem sedang mencoba menghubungkan kembali...");
            return prev;
          });
        } else {
          console.error("[RealtimeScoringRecap] Fetch error:", msg);
          setError(msg);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [competitionIdOrSlug]
  );

  const debouncedFetch = React.useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (mountedRef.current) {
        fetchData(false);
      }
    }, 300);
  }, [fetchData]);

  React.useEffect(() => {
    mountedRef.current = true;

    // 1. Initial load
    fetchData(true);

    // 2. Setup Realtime
    let channel: any = null;

    /*
    // Polling fallback interval (Di-nonaktifkan — disimpan sebagai komentar untuk kebutuhan masa mendatang)
    const startPolling = () => {
      if (pollingRef.current) return;
      pollingRef.current = setInterval(() => {
        if (mountedRef.current) {
          fetchData(false);
        }
      }, POLL_INTERVAL_MS);
    };
    */

    try {
      const supabase = createBrowserSupabase();
      channel = supabase
        .channel(`scoring-recap-${competitionIdOrSlug}`)
        .on(
          "postgres_changes" as any,
          {
            event: "*",
            schema: "public",
            table: "assessments",
          },
          () => {
            debouncedFetch();
          }
        )
        .on(
          "postgres_changes" as any,
          {
            event: "*",
            schema: "public",
            table: "assessment_scores",
          },
          () => {
            debouncedFetch();
          }
        )
        .on(
          "postgres_changes" as any,
          {
            event: "*",
            schema: "public",
            table: "registrations",
          },
          () => {
            debouncedFetch();
          }
        )
        .subscribe((status: string) => {
          if (!mountedRef.current) return;

          if (status === "SUBSCRIBED") {
            setRealtimeStatus("connected");
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("[RealtimeScoringRecap] Realtime channel error / timeout");
            setRealtimeStatus("disconnected");
            // startPolling(); // Polling fallback di-nonaktifkan
          } else if (status === "CLOSED") {
            if (mountedRef.current) {
              setRealtimeStatus("disconnected");
            }
          }
        });
    } catch (err) {
      console.warn("[RealtimeScoringRecap] Realtime setup failed:", err);
      setRealtimeStatus("disconnected");
      // startPolling(); // Polling fallback di-nonaktifkan
    }

    /*
    // Safety fallback: if still connecting after 5s, start polling (Di-nonaktifkan)
    const fallbackTimeout = setTimeout(() => {
      if (mountedRef.current && realtimeStatus === "connecting") {
        setRealtimeStatus("disconnected");
        // startPolling();
      }
    }, 5000);
    */

    return () => {
      mountedRef.current = false;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      if (channel) {
        try {
          const supabase = createBrowserSupabase();
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      // clearTimeout(fallbackTimeout);
    };
  }, [competitionIdOrSlug, fetchData, debouncedFetch]);

  return {
    loading,
    isRefreshing,
    competition,
    judges,
    recaps,
    realtimeStatus,
    lastUpdatedAt,
    error,
    refresh: () => fetchData(false),
  };
}
