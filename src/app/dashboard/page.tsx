import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PARTICIPANTS,
  JUDGES,
} from "@/lib/dummy-data";
import {
  Users,
  Trophy,
  UserCheck,
  Flame,
  Clock,
  AlertTriangle,
  Megaphone,
  Tv,
} from "lucide-react";
import { getCompetitions } from "@/lib/supabase/queries";
import { publicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function DashboardSeksiAcaraPage() {
  const competitions = await getCompetitions();

  // Fetch counts from Supabase with graceful fallback
  let totalParticipants = PARTICIPANTS.length;
  let verifiedParticipants = PARTICIPANTS.filter((p) => p.status === "terverifikasi").length;
  let pendingParticipants = PARTICIPANTS.filter((p) => p.status === "menunggu_verifikasi").length;
  let activeJudges = JUDGES.length;
  // Mulai dari array kosong: tampilkan data asli dari activity_logs.
  // Tidak lagi memakai ACTIVITY_LOGS dummy agar tidak menyesatkan
  // saat tabel memang belum berisi aktivitas.
  let activityLogs: Array<{
    id: string;
    actor: string;
    role: string;
    action: string;
    description: string;
    timestamp: string;
  }> = [];

  try {
    // activity_logs memiliki RLS "select for is_admin()"; baca memakai admin client
    // (service role) agar log asli tampil, bukan jatuh ke data dummy.
    const adminClient = createAdminClient();
    const [partRes, verRes, pendRes, judgeRes, logRes] = await Promise.all([
      publicClient.from("participants").select("*", { count: "exact", head: true }),
      publicClient.from("participants").select("*", { count: "exact", head: true }).eq("status", "terverifikasi"),
      publicClient.from("participants").select("*", { count: "exact", head: true }).eq("status", "menunggu_verifikasi"),
      publicClient.from("profiles").select("*", { count: "exact", head: true }).eq("role", "juri"),
      adminClient.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(6),
    ]);

    if (partRes.count !== null && partRes.count > 0) {
      totalParticipants = partRes.count;
      verifiedParticipants = verRes.count ?? 0;
      pendingParticipants = pendRes.count ?? 0;
    }

    if (judgeRes.count !== null && judgeRes.count > 0) {
      activeJudges = judgeRes.count;
    }

    if (logRes.data && logRes.data.length > 0) {
      activityLogs = logRes.data.map((l) => ({
        id: l.id,
        actor: l.actor_role?.toUpperCase() || "SISTEM",
        role: l.actor_role || "seksi_acara",
        action: l.action,
        description: l.description || l.action,
        timestamp: new Date(l.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      }));
    }
  } catch (err) {
    console.error("Dashboard overview stats error, using cached fallback:", err);
  }

  const activeCompetitions = competitions.filter((c) => c.status === "berlangsung").length;

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-8">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Ringkasan Operasional Acara
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Monitoring pelaksanaan {competitions.length} cabang lomba, dewan juri, dan verifikasi peserta acara.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/broadcast">
              <Button size="sm" variant="destructive" className="text-xs gap-1.5 shadow-xs">
                <Megaphone className="h-3.5 w-3.5" />
                <span>Siaran Darurat</span>
              </Button>
            </Link>
            <Link href="/monitor" target="_blank">
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <Tv className="h-3.5 w-3.5 text-accent" />
                <span>Monitor TV</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-semibold uppercase tracking-wider">Total Peserta Terdaftar</span>
              <Users className="h-4 w-4 text-accent" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-foreground">
                {totalParticipants}
              </span>
              <span className="text-xs text-muted-foreground">Orang/Tim</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
              {verifiedParticipants} terverifikasi • {pendingParticipants} menunggu
            </p>
          </Card>

          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-semibold uppercase tracking-wider">Lomba Berlangsung</span>
              <Flame className="h-4 w-4 text-danger animate-pulse" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-danger">
                {activeCompetitions}
              </span>
              <span className="text-xs text-muted-foreground">dari {competitions.length} Cabang</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
              {activeCompetitions > 0 ? "Lomba sedang berlangsung di venue" : "Tidak ada lomba aktif saat ini"}
            </p>
          </Card>

          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-semibold uppercase tracking-wider">Dewan Juri Bertugas</span>
              <UserCheck className="h-4 w-4 text-accent" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-foreground">
                {activeJudges}
              </span>
              <span className="text-xs text-muted-foreground">Juri Terdaftar</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
              Sistem penilaian real-time aktif
            </p>
          </Card>

          <Card className="p-5 space-y-2 border-accent/40 bg-accent/5">
            <div className="flex items-center justify-between text-accent text-xs">
              <span className="font-semibold uppercase tracking-wider">Antrean Verifikasi</span>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-accent">
                {pendingParticipants}
              </span>
              <span className="text-xs text-muted-foreground">Berkas Menunggu</span>
            </div>
            <Link
              href="/dashboard/peserta/verifikasi"
              className="text-[11px] font-semibold text-accent hover:underline block pt-1 border-t border-accent/20"
            >
              Buka Antrean Verifikasi →
            </Link>
          </Card>
        </div>

        {/* Status Monitoring Lomba & Activity Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Status Lomba */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                <span>Monitoring Progres {competitions.length} Lomba</span>
              </h2>
              <Link href="/dashboard/lomba" className="text-xs text-accent hover:underline">
                Kelola Semua →
              </Link>
            </div>

            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {competitions.map((comp) => {
                const statusVariant =
                  comp.status === "berlangsung"
                    ? "live"
                    : comp.status === "selesai"
                    ? "success"
                    : "default";
                return (
                  <div
                    key={comp.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant} className="text-[10px]">
                          {comp.status.toUpperCase()}
                        </Badge>
                        <h3 className="font-heading text-sm font-bold text-foreground">
                          {comp.name}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {comp.venue} • {comp.currentParticipantsCount} Peserta • {comp.criteria.length} Kriteria
                      </p>
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0">
                      <Link href={`/dashboard/lomba/${comp.slug}`}>
                        <Button variant="outline" size="sm" className="text-xs h-8">
                          Monitoring
                        </Button>
                      </Link>
                      <Link href={`/dashboard/penilaian/${comp.id}`}>
                        <Button size="sm" variant="secondary" className="text-xs h-8">
                          Rekap
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Logs (Audit Trail) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                <span>Log Aktivitas Sistem</span>
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">Audit Trail</span>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3.5">
              {activityLogs.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Belum ada aktivitas tercatat.
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed max-w-xs">
                    Log akan muncul otomatis saat panitia melakukan aksi seperti
                    verifikasi peserta, input nilai juri, atau publikasi pemenang.
                  </p>
                </div>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="text-xs space-y-1 pb-3 border-b border-border/60 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <strong className="text-foreground">{log.actor}</strong>
                      <span className="text-[10px] font-mono text-muted-foreground">{log.timestamp}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{log.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
