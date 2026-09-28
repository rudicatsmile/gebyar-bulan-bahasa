"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { PARTICIPANTS, COMPETITIONS, Participant } from "@/lib/dummy-data";

/** Satu baris public.registrations milik peserta aktif */
export interface Enrollment {
  registrationId: string;
  competitionId: string;
  competitionSlug?: string | null;
  competitionName: string | null;
  teamName: string | null;
  isConfirmed: boolean;
}

export interface CurrentParticipant {
  id: string;
  userId: string | null;
  fullName: string;
  institution: string;
  email: string;
  phone: string;
  registrationNumber: string;
  totalPoints: number;
  status: "menunggu_verifikasi" | "terverifikasi" | "ditolak";
  competitionId?: string;
  competitionName?: string;
  /**
   * Daftar seluruh cabang lomba yang sudah diikuti (maks. MAX_COMPETITION_PER_PARTICIPANT).
   * competitionId/competitionName tetap dipertahankan di atas untuk kompatibilitas halaman lama.
   */
  enrollments?: Enrollment[];
  /**
   * public.participants.id asli (satu-satunya nilai yang valid sebagai FK registrations.participant_id).
   * `null` bila baris peserta belum ada di database (akun baru / fallback demo), sehingga
   * aksi pendaftaran lomba harus diblokir sebelum menembus constraint.
   */
  participantRowId?: string | null;
  isDemoFallback: boolean;
  avatarUrl?: string;
}

export function useCurrentParticipant() {
  const [participant, setParticipant] = React.useState<CurrentParticipant | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchParticipant = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const userEmail = (user.email || "").toLowerCase().trim();

        // 1. Coba cari di public.participants by user_id
        let participantRow: any = null;
        const { data: pByUserId, error: errUserId } = await supabase
          .from("participants")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (pByUserId) {
          participantRow = pByUserId;
        } else if (userEmail) {
          // 2. Fallback cari by email di public.participants
          const { data: pByEmail } = await supabase
            .from("participants")
            .select("*")
            .eq("email", userEmail)
            .maybeSingle();

          if (pByEmail) {
            participantRow = pByEmail;
          }
        }

        // 3. Ambil profil user dari public.profiles
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        // 4. Ambil SELURUH pendaftaran lomba (registrations) milik peserta.
        //    Satu peserta boleh mengikuti beberapa cabang lomba, jadi jangan pakai
        //    maybeSingle(): dengan 2+ baris hasilnya null dan status tampak "belum mendaftar".
        let enrollments: Enrollment[] = [];

        if (participantRow?.id) {
          const { data: regRows } = await supabase
            .from("registrations")
            .select("id, team_name, is_confirmed, competition_id, competitions(name, slug)")
            .eq("participant_id", participantRow.id)
            .order("created_at", { ascending: true });

          enrollments = (regRows ?? []).map((reg) => {
            const comp = reg.competitions as { name?: string; slug?: string } | null;
            return {
              registrationId: reg.id,
              competitionId: reg.competition_id,
              competitionSlug: comp?.slug ?? null,
              competitionName: comp?.name ?? null,
              teamName: reg.team_name,
              isConfirmed: reg.is_confirmed,
            };
          });
        }

        // Jika participantRow ditemukan di database
        if (participantRow) {
          setParticipant({
            id: participantRow.id,
            userId: user.id,
            fullName:
              participantRow.full_name ||
              profileRow?.full_name ||
              user.user_metadata?.full_name ||
              "Peserta",
            institution:
              participantRow.institution ||
              profileRow?.institution ||
              user.user_metadata?.institution ||
              "Umum",
            email: participantRow.email || userEmail,
            phone:
              participantRow.phone ||
              profileRow?.phone ||
              user.user_metadata?.phone ||
              "",
            registrationNumber: participantRow.registration_number,
            totalPoints: Number(participantRow.total_points ?? 0),
            status:
              participantRow.status === "ditolak"
                ? "ditolak"
                : participantRow.status === "menunggu_verifikasi"
                ? "menunggu_verifikasi"
                : "terverifikasi",
            competitionId: enrollments[0]?.competitionId,
            competitionName: enrollments[0]?.competitionName ?? undefined,
            enrollments,
            participantRowId: participantRow.id,
            isDemoFallback: false,
          });
          setLoading(false);
          return;
        }

        // Jika row di participants belum ada tapi profiles ada
        if (profileRow) {
          const regNumber = `GBB-2025-${user.id.slice(0, 4).toUpperCase()}`;
          setParticipant({
            id: profileRow.id,
            userId: user.id,
            fullName: profileRow.full_name || user.user_metadata?.full_name || "Peserta",
            institution: profileRow.institution || user.user_metadata?.institution || "Umum",
            email: profileRow.email || userEmail,
            phone: profileRow.phone || user.user_metadata?.phone || "",
            registrationNumber: regNumber,
            totalPoints: 0,
            status: "terverifikasi",
            enrollments: [],
            // profiles.id BUKAN participants.id — tidak boleh dipakai sebagai FK registrations
            participantRowId: null,
            isDemoFallback: false,
          });
          setLoading(false);
          return;
        }

        // Cek apakah akun demo resmi seperti ahmad.fauzan@sman1bdg.sch.id
        const dummyDemo = PARTICIPANTS.find(
          (p) => p.email.toLowerCase() === userEmail
        );
        if (dummyDemo) {
          const comp = COMPETITIONS.find((c) => c.id === dummyDemo.competitionId);
          setParticipant({
            id: dummyDemo.id,
            userId: user.id,
            fullName: dummyDemo.fullName,
            institution: dummyDemo.institution,
            email: dummyDemo.email,
            phone: dummyDemo.phone,
            registrationNumber: dummyDemo.registrationNumber,
            totalPoints: dummyDemo.totalPoints,
            status: dummyDemo.status,
            competitionId: dummyDemo.competitionId,
            competitionName: comp?.name || "Membaca Puisi",
            enrollments: [
              {
                registrationId: "demo-reg",
                competitionId: dummyDemo.competitionId,
                competitionName: comp?.name || "Membaca Puisi",
                teamName: dummyDemo.teamName ?? null,
                isConfirmed: true,
              },
            ],
            participantRowId: null,
            isDemoFallback: true,
          });
          setLoading(false);
          return;
        }

        // User auth ada di Supabase, buat entitas fallback dari metadata
        const metadataName = (user.user_metadata?.full_name as string) || "Peserta";
        const metadataInst = (user.user_metadata?.institution as string) || "Umum";
        const metadataPhone = (user.user_metadata?.phone as string) || "";
        const fallbackReg = `GBB-2025-${user.id.slice(0, 4).toUpperCase()}`;

        setParticipant({
          id: user.id,
          userId: user.id,
          fullName: metadataName,
          institution: metadataInst,
          email: userEmail,
          phone: metadataPhone,
          registrationNumber: fallbackReg,
          totalPoints: 0,
          status: "terverifikasi",
          enrollments: [],
          // Belum ada baris participants -> pendaftar lomba wajib dilengkapi lebih dulu
          participantRowId: null,
          isDemoFallback: false,
        });
        setLoading(false);
        return;
      }

      // Jika TIDAK ADA user login (unauthenticated session / demo visitor)
      // Fallback ke PARTICIPANTS[0] agar tidak merusak tampilan demo
      const demo = PARTICIPANTS[0];
      const comp = COMPETITIONS.find((c) => c.id === demo.competitionId);
      setParticipant({
        id: demo.id,
        userId: null,
        fullName: demo.fullName,
        institution: demo.institution,
        email: demo.email,
        phone: demo.phone,
        registrationNumber: demo.registrationNumber,
        totalPoints: demo.totalPoints,
        status: demo.status,
        competitionId: demo.competitionId,
        competitionName: comp?.name || "Membaca Puisi",
        enrollments: [],
        participantRowId: null,
        isDemoFallback: true,
      });
      setLoading(false);
    } catch (err: unknown) {
      console.error("Gagal sinkronisasi data peserta:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat profil");
      // Fallback aman ke demo peserta
      const demo = PARTICIPANTS[0];
      setParticipant({
        id: demo.id,
        userId: null,
        fullName: demo.fullName,
        institution: demo.institution,
        email: demo.email,
        phone: demo.phone,
        registrationNumber: demo.registrationNumber,
        totalPoints: demo.totalPoints,
        status: demo.status,
        competitionId: demo.competitionId,
        competitionName: "Membaca Puisi",
        enrollments: [],
        participantRowId: null,
        isDemoFallback: true,
      });
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchParticipant();
  }, [fetchParticipant]);

  return {
    participant,
    loading,
    error,
    refetch: fetchParticipant,
  };
}
