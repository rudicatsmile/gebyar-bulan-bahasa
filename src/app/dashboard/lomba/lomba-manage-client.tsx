"use client";

import * as React from "react";
import Link from "next/link";
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
import { Sliders } from "lucide-react";

interface LombaManageClientProps {
  initialCompetitions: Competition[];
}

export function LombaManageClient({ initialCompetitions }: LombaManageClientProps) {
  const [competitions, setCompetitions] = React.useState<Competition[]>(initialCompetitions);
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);

  const toggleStatus = async (id: string, currentStatus: string) => {
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
    try {
      await toggleCompetitionStatus(id, nextStatus);
    } catch (err) {
      console.error("Gagal update status lomba:", err);
      // Revert if error
      setCompetitions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: currentStatus as any } : c))
      );
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
                          onClick={() => toggleStatus(comp.id, comp.status)}
                          className="text-[11px] h-8 text-accent font-semibold cursor-pointer"
                          title="Klik untuk ubah status lomba langsung di Supabase"
                        >
                          {isUpdating === comp.id ? "Menyimpan..." : "Ubah Status"}
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
