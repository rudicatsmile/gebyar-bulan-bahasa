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
import { CHALLENGE_LEADERBOARD } from "@/lib/dummy-data";
import { Trophy, Download, ArrowLeft } from "lucide-react";

export default function DashboardLeaderboardInternalPage() {
  const [leaderboard, setLeaderboard] = React.useState<typeof CHALLENGE_LEADERBOARD>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data?.leaderboard)) {
          setLeaderboard(data.leaderboard);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleExport = () => {
    const csvContent =
      "Rank,Nama Peserta,Instansi,Poin,Lencana\n" +
      leaderboard.map(
        (p) => `${p.rank},"${p.name}","${p.institution}",${p.points},"${p.badge}"`
      ).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leaderboard_poin_challenge.csv";
    a.click();
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/challenge"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Kelola Challenge</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Trophy className="h-7 w-7 text-accent" />
                <span>Leaderboard Poin Peserta (Internal Panitia)</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Daftar perolehan akumulasi poin seluruh peserta aktif non-lomba real-time.
              </p>
            </div>

            <Button onClick={handleExport} size="sm" variant="outline" className="text-xs gap-1.5 cursor-pointer" disabled={leaderboard.length === 0}>
              <Download className="h-3.5 w-3.5" />
              <span>Ekspor Klasemen CSV</span>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Peringkat</TableHead>
                <TableHead>Nama Peserta</TableHead>
                <TableHead>Asal Instansi</TableHead>
                <TableHead className="text-center">Lencana Aktif</TableHead>
                <TableHead className="text-right">Total Akumulasi Poin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                    Memuat data klasemen peserta...
                  </TableCell>
                </TableRow>
              ) : leaderboard.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                    Belum ada data peserta yang terdaftar pada challenge stand.
                  </TableCell>
                </TableRow>
              ) : (
                leaderboard.map((item) => (
                  <TableRow key={item.rank}>
                    <TableCell className="text-center font-mono font-bold text-xs">
                      #{item.rank}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-xs sm:text-sm">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.institution}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="gold" className="text-[10px]">
                        {item.badge}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-accent text-sm sm:text-base">
                      {item.points} Poin
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
