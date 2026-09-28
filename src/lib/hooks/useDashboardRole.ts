"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";

export type DashboardRole = "seksi_acara" | "juri" | "media_center" | "peserta";

/**
 * Menentukan peran dashboard user yang sedang login di sisi klien.
 * Dipakai oleh halaman publik (misal /lomba) agar tetap menampilkan sidebar
 * DashboardLayout saat dikunjungi oleh user yang sudah login.
 * super_admin dipetakan ke "seksi_acara" (konsisten dengan routing login).
 */
export function useDashboardRole() {
  const [role, setRole] = React.useState<DashboardRole | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let cancelled = false;

    const resolveRole = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setRole(null);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const rawRole = profile?.role || "peserta";
        const mapped: DashboardRole =
          rawRole === "super_admin" ? "seksi_acara" : (rawRole as DashboardRole);

        if (!cancelled) setRole(mapped);
      } catch {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    resolveRole();

    return () => {
      cancelled = true;
    };
  }, []);

  return { role, loading };
}
