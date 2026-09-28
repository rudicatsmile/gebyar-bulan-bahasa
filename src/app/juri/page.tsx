"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COMPETITIONS, JUDGES } from "@/lib/dummy-data";
import { Trophy, ArrowRight, UserCheck, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardJuriPage() {
  const [loading, setLoading] = React.useState(true);
  const [judgeInfo, setJudgeInfo] = React.useState({
    fullName: JUDGES[0].fullName,
    expertise: JUDGES[0].expertise,
    title: JUDGES[0].title,
    avatarUrl: JUDGES[0].avatarUrl,
  });
  const [assignedComps, setAssignedComps] = React.useState<
    Array<{
      id: string;
      slug: string;
      name: string;
      category: string;
      description: string;
      venue: string;
      stage: string;
      status: string;
      criteriaCount: number;
      isChiefJudge: boolean;
    }>
  >([]);

  React.useEffect(() => {
    async function loadJudgeAssignments() {
      try {
        setLoading(true);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let judgeProfile: any = null;
        if (user) {
          const { data: p } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();
          if (p) judgeProfile = p;
        }

        if (judgeProfile) {
          setJudgeInfo({
            fullName: judgeProfile.full_name || "Dewan Juri",
            expertise: judgeProfile.institution || "Dewan Juri Resmi",
            title: judgeProfile.role === "juri" ? "Dewan Juri Ahli Bersertifikasi" : "Penilai Lomba",
            avatarUrl:
              judgeProfile.avatar_url ||
              JUDGES[0].avatarUrl,
          });

          // Ambil penugasan lomba dari competition_judges
          const { data: assignments } = await supabase
            .from("competition_judges")
            .select(`
              is_chief_judge,
              competitions (
                id,
                slug,
                name,
                category,
                description,
                theme_link,
                status,
                competition_criteria (id)
              )
            `)
            .eq("judge_id", judgeProfile.id)
            .eq("status", "aktif");

          if (assignments && assignments.length > 0) {
            const mapped = assignments
              .filter((a) => Boolean(a.competitions))
              .map((a) => {
                const comp = a.competitions as any;
                const dummy = COMPETITIONS.find(
                  (c) => c.slug === comp.slug || c.id === comp.id
                );
                return {
                  id: comp.id,
                  slug: comp.slug,
                  name: comp.name,
                  category: comp.category,
                  description: comp.description || dummy?.description || "",
                  venue: dummy?.venue || comp.theme_link || "Panggung Utama",
                  stage: dummy?.stage || "Area Panggung",
                  status: comp.status || "berlangsung",
                  criteriaCount: comp.competition_criteria?.length || dummy?.criteria.length || 4,
                  isChiefJudge: Boolean(a.is_chief_judge),
                };
              });

            setAssignedComps(mapped);
            setLoading(false);
            return;
          }
        }

        // Fallback default jika belum login atau belum ada di database
        const defaultJudge = JUDGES[0];
        const defaultAssigned = COMPETITIONS.filter((c) =>
          defaultJudge.assignedCompetitionIds.includes(c.id)
        ).map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          category: c.category,
          description: c.description,
          venue: c.venue,
          stage: c.stage,
          status: c.status,
          criteriaCount: c.criteria.length,
          isChiefJudge: true,
        }));

        setAssignedComps(defaultAssigned);
      } catch (err) {
        console.error("Error loadJudgeAssignments:", err);
      } finally {
        setLoading(false);
      }
    }

    loadJudgeAssignments();
  }, []);

  return (
    <DashboardLayout role="juri">
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="p-6 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={judgeInfo.avatarUrl}
              alt={judgeInfo.fullName}
              className="h-16 w-16 rounded-full object-cover border-2 border-accent"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="gold" className="text-[10px]">
                  DEWAN JURI RESMI
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  {judgeInfo.expertise}
                </span>
              </div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Selamat Bertugas, {judgeInfo.fullName}
              </h1>
              <p className="text-xs text-muted-foreground">{judgeInfo.title}</p>
            </div>
          </div>

          <div className="sm:shrink-0 text-left sm:text-right">
            <span className="text-[11px] text-muted-foreground block">Tugas Penjurian Aktif:</span>
            <span className="font-mono text-2xl font-bold text-accent">
              {assignedComps.length} Cabang Lomba
            </span>
          </div>
        </div>

        {/* Assigned Competitions Cards */}
        <div className="space-y-4">
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            <span>Cabang Lomba yang Ditugaskan kepada Anda</span>
          </h2>

          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <span>Memuat data penugasan juri dari database...</span>
            </div>
          ) : assignedComps.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">Belum ada cabang lomba yang ditugaskan.</p>
              <p className="text-xs">Hubungi Seksi Acara untuk melakukan sinkronisasi matriks penugasan.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assignedComps.map((comp) => (
                <Card key={comp.id} className="p-6 space-y-4 border-accent/40 bg-accent/5">
                  <div className="flex items-center justify-between">
                    <Badge variant={comp.status === "berlangsung" ? "live" : "default"} className="text-xs">
                      {comp.status === "berlangsung" ? "SEDANG BERLANGSUNG" : comp.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-mono uppercase text-muted-foreground">
                      {comp.category}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-heading text-xl font-bold text-foreground">
                      {comp.name}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {comp.description}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-card border border-border text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Lokasi & Panggung:</span>
                      <strong className="text-foreground">{comp.venue} ({comp.stage})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Jumlah Kriteria:</span>
                      <strong className="text-foreground">{comp.criteriaCount} Komponen Berbobot 100%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Status Juri Anda:</span>
                      <strong className="text-accent">
                        {comp.isChiefJudge ? "Juri Utama (Chief Judge)" : "Anggota Dewan Juri"}
                      </strong>
                    </div>
                  </div>

                  <Link href={`/juri/lomba/${comp.slug}`} className="block">
                    <Button className="w-full text-xs gap-1.5 font-semibold" size="lg">
                      <span>Buka Roster Peserta & Mulai Menilai</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
