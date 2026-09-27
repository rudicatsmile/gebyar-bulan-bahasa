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
import { Coins, ArrowLeft, PlusCircle, MinusCircle } from "lucide-react";

interface PointLedgerItem {
  id: string;
  source: string;
  description: string;
  pointsDelta: number;
  timestamp: string;
}

const LEDGER_ITEMS: PointLedgerItem[] = [
  { id: "tx-1", source: "Scan QR", description: "Kunjungan Stand Membaca Puisi (PUISI01)", pointsDelta: 10, timestamp: "27 Okt 2025, 09:15 WIB" },
  { id: "tx-2", source: "Scan QR", description: "Kunjungan Stand Melukis Tas Kanvas (KANVAS04)", pointsDelta: 10, timestamp: "27 Okt 2025, 09:40 WIB" },
  { id: "tx-3", source: "Scan QR", description: "Kunjungan Stand Tradisi Palang Pintu (PALANG06)", pointsDelta: 10, timestamp: "27 Okt 2025, 10:05 WIB" },
  { id: "tx-4", source: "Tantangan Twibbon", description: "Verifikasi unggahan twibbon media sosial", pointsDelta: 20, timestamp: "27 Okt 2025, 10:30 WIB" },
  { id: "tx-5", source: "Misi Video", description: "Rekam Video Ikrar Sumpah Pemuda", pointsDelta: 50, timestamp: "27 Okt 2025, 11:10 WIB" },
  { id: "tx-6", source: "Kuis EYD", description: "Kuis Bahasa Indonesia 10 Soal", pointsDelta: 30, timestamp: "27 Okt 2025, 11:35 WIB" },
  { id: "tx-7", source: "Bonus Panitia", description: "Apresiasi keaktifan sesi diskusi budaya", pointsDelta: 10, timestamp: "27 Okt 2025, 11:50 WIB" },
];

export default function PesertaRiwayatPoinPage() {
  const currentTotal = LEDGER_ITEMS.reduce((sum, item) => sum + item.pointsDelta, 0);

  return (
    <DashboardLayout role="peserta">
      <div className="space-y-6">
        <div>
          <Link
            href="/peserta"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda Peserta</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Coins className="h-7 w-7 text-accent" />
                <span>Buku Besar Riwayat Poin (Ledger)</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Daftar mutasi saldo poin masuk dari aktivitas kunjungan stand pameran dan penyelesaian misi challenge.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-accent/40 bg-accent/10 text-right shrink-0">
              <span className="text-[10px] font-mono uppercase text-accent font-bold block">
                Total Saldo Bersih:
              </span>
              <span className="font-mono text-3xl font-black text-accent">
                {currentTotal} Poin
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sumber Perolehan</TableHead>
                <TableHead>Keterangan Transaksi</TableHead>
                <TableHead>Waktu Transaksi</TableHead>
                <TableHead className="text-right">Mutasi Poin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LEDGER_ITEMS.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <Badge variant="gold" className="text-[10px]">
                      {tx.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-foreground text-xs sm:text-sm">
                    {tx.description}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {tx.timestamp}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-accent text-sm sm:text-base">
                    +{tx.pointsDelta} Pts
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
