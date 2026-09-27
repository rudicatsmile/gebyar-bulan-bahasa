"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Competition } from "@/lib/dummy-data";
import { toggleCompetitionStatus } from "@/app/actions/competitions";
import { Sliders, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface LombaManageClientProps {
  initialCompetitions: Competition[];
}

export function LombaManageClient({ initialCompetitions }: LombaManageClientProps) {
  const router = useRouter();
  const [competitions, setCompetitions] = React.useState<Competition[]>(initialCompetitions);
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);
  const [notification, setNotification] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Sync state whenever initialCompetitions updates from server revalidation
  React.useEffect(() => {
    setCompetitions(initialCompetitions);
  }, [initialCompetitions]);

  // Auto-dismiss notification after 4 seconds
  React.useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const toggleStatus = async (id: string, currentStatus: string, competitionName: string) => {
    const nextStatus: "pendaftaran" | "berlangsung" | "selesai" =
      currentStatus === "pendaftaran"
        ? "berlangsung"
        : currentStatus === "berlangsung"
        ? "selesai"
        : "pendaftaran";

    // Optimistic UI update
    setCompetitions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
    );

    setIsUpdating(id);
    setNotification(null);

    try {
      const res = await toggleCompetitionStatus(id, nextStatus);

      if (!res.success) {
        // Revert to original status if server action failed
        setCompetitions((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: currentStatus as any } : c))
        );
        setNotification({
          type: "error",
          message: `Gagal memperbarui status ${competitionName}: ${res.error || "Terjadi kesalahan"}`,
        });
      } else {
        setNotification({
          type: "success",
          message: `Status "${competitionName}" berhasil disimpan: ${nextStatus.toUpperCase()}`,
        });
        router.refresh();
      }
    } catch (err) {
      console.error("Gagal update status lomba:", err);
      // Revert if network or unhandled error
      setCompetitions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: currentStatus as any } : c))
      );
      const errorDetail = err instanceof Error ? err.message : String(err);
      setNotification({
        type: "error",
        message: `Terjadi kendala saat memperbarui status ${competitionName}: ${errorDetail}`,
      });
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Monitoring 8 Cabang Lomba
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Kendali operasional, status pelaksanaan lomba real-time di Supabase, dan akses langsung ke rekapitulasi penilaian digital.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/kriteria">
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <Sliders className="h-3.5 w-3.5" />
                <span>Kriteria Penilaian</span>
              </Button>
            </Link>
          </div>
        </div>

        {notification && (
          <div
            className={`p-3.5 rounded-lg flex items-center gap-2 text-xs border ${
              notification.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cabang Lomba</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Venue & Panggung</TableHead>
                <TableHead className="text-center">Kriteria</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi Operasional</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitions.map((comp) => {
                const statusVariant =
                  comp.status === "berlangsung"
                    ? "live"
                    : comp.status === "selesai"
                    ? "success"
                    : "default";

                return (
                  <TableRow key={comp.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground text-sm">
                        {comp.name}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Agregasi: {comp.aggregation.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize text-xs font-mono">
                      {comp.category}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <strong className="text-foreground">{comp.venue}</strong>
                      <span className="block text-[11px]">{comp.stage}</span>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {comp.criteria.length} kriteria (100%)
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusVariant} className="text-[10px]">
                        {comp.status === "berlangsung"
                          ? "LIVE SEKARANG"
                          : comp.status === "selesai"
                          ? "SELESAI"
                          : "PENDAFTARAN DIBUKA"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isUpdating === comp.id}
                          onClick={() => toggleStatus(comp.id, comp.status, comp.name)}
                          className="text-[11px] h-8 text-accent font-semibold cursor-pointer"
                          title="Klik untuk ubah status lomba langsung di Supabase"
                        >
                          {isUpdating === comp.id ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Menyimpan...</span>
                            </span>
                          ) : (
                            "Ubah Status"
                          )}
                        </Button>
                        <Link href={`/dashboard/lomba/${comp.slug}`}>
                          <Button variant="outline" size="sm" className="text-xs h-8">
                            Pantau
                          </Button>
                        </Link>
                        <Link href={`/dashboard/penilaian/${comp.id}`}>
                          <Button size="sm" className="text-xs h-8">
                            Nilai
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}



