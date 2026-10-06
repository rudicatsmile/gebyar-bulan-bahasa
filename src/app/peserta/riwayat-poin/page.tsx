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
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import {
  getParticipantPointLedger,
  type PointLedgerItem,
} from "@/app/actions/challenges";
import { Coins, ArrowLeft, PlusCircle, Sparkles, ArrowRight, Loader2, Clock } from "lucide-react";

const DEMO_LEDGER_ITEMS: PointLedgerItem[] = [
  { id: "tx-1", source: "Scan QR Stand", description: "Kunjungan Stand Membaca Puisi (PUISI01)", pointsDelta: 10, timestamp: "27 Okt 2025, 09:15 WIB" },
  { id: "tx-2", source: "Scan QR Stand", description: "Kunjungan Stand Melukis Tas Kanvas (KANVAS04)", pointsDelta: 10, timestamp: "27 Okt 2025, 09:40 WIB" },
  { id: "tx-3", source: "Scan QR Stand", description: "Kunjungan Stand Tradisi Palang Pintu (PALANG06)", pointsDelta: 10, timestamp: "27 Okt 2025, 10:05 WIB" },
  { id: "tx-4", source: "Tantangan Twibbon", description: "Verifikasi unggahan twibbon media sosial", pointsDelta: 20, timestamp: "27 Okt 2025, 10:30 WIB" },
  { id: "tx-5", source: "Misi Video", description: "Rekam Videoa", pointsDelta: 50, timestamp: "27 Okt 2025, 11:10 WIB" },
  { id: "tx-6", source: "Kuis EYD", description: "Kuis Bahasa Indonesia 10 Soal", pointsDelta: 30, timestamp: "27 Okt 2025, 11:35 WIB" },
  { id: "tx-7", source: "Bonus Panitia", description: "Apresiasi keaktifan sesi diskusi budaya", pointsDelta: 10, timestamp: "27 Okt 2025, 11:50 WIB" },
];

export default function PesertaRiwayatPoinPage() {
  const { participant, loading: participantLoading } = useCurrentParticipant();
  const [ledgerItems, setLedgerItems] = React.useState<PointLedgerItem[]>([]);
  const [loadingLedger, setLoadingLedger] = React.useState(true);

  const isDemo = participant?.isDemoFallback;
  const currentTotal = participant?.totalPoints ?? 0;

  React.useEffect(() => {
    if (participantLoading) return;

    if (isDemo) {
      setLedgerItems(DEMO_LEDGER_ITEMS);
      setLoadingLedger(false);
      return;
    }

    if (participant?.id) {
      setLoadingLedger(true);
      getParticipantPointLedger(participant.id)
        .then((res) => {
          if (res.success) {
            setLedgerItems(res.transactions);
          } else {
            setLedgerItems([]);
          }
        })
        .catch((err) => {
          console.error("Gagal memuat riwayat mutasi poin:", err);
          setLedgerItems([]);
        })
        .finally(() => {
          setLoadingLedger(false);
        });
    } else {
      setLedgerItems([]);
      setLoadingLedger(false);
    }
  }, [participant?.id, isDemo, participantLoading]);

  const isLoading = participantLoading || loadingLedger;

  return (
    <DashboardLayout role="peserta" participantPoints={currentTotal}>
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

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-xs">Memuat riwayat poin peserta...</p>
          </div>
        ) : ledgerItems.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-xl border border-dashed border-border bg-card space-y-4">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
              <Coins className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-heading text-base font-bold text-foreground">
                Belum Ada Riwayat Mutasi Poin
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {currentTotal > 0
                  ? `Anda saat ini memiliki saldo ${currentTotal} poin. Rincian riwayat transaksi poin saat ini belum tersedia di sistem.`
                  : "Anda saat ini memiliki saldo 0 poin. Kunjungi stand pameran budaya, lakukan scan QR, atau kerjakan misi tantangan untuk mulai mengumpulkan poin festival."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link href="/peserta/scan">
                <Button size="sm" variant="outline" className="text-xs">
                  Scan QR Stand
                </Button>
              </Link>
              <Link href="/peserta/challenge">
                <Button size="sm" className="text-xs gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Kerjakan Challenge</span>
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Tampilan Mobile: Card List (Tanpa Scroll Horizontal) */}
            <div className="block sm:hidden space-y-2.5">
              {ledgerItems.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-xl border border-border bg-card p-3.5 space-y-2 shadow-xs transition-colors hover:border-accent/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="gold" className="text-[10px] shrink-0 font-medium">
                      {tx.source}
                    </Badge>
                    <span
                      className={`font-mono font-bold text-sm shrink-0 ${
                        tx.pointsDelta >= 0 ? "text-accent" : "text-destructive"
                      }`}
                    >
                      {tx.pointsDelta >= 0 ? `+${tx.pointsDelta}` : tx.pointsDelta} Pts
                    </span>
                  </div>

                  <p className="font-medium text-foreground text-xs leading-relaxed">
                    {tx.description}
                  </p>

                  <div className="flex items-center gap-1.5 pt-1 border-t border-border/60 text-[11px] text-muted-foreground font-mono">
                    <Clock className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                    <span>{tx.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Tampilan Desktop: Tabel Lengkap */}
            <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden">
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
                  {ledgerItems.map((tx) => (
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
                        {tx.pointsDelta >= 0 ? `+${tx.pointsDelta}` : tx.pointsDelta} Pts
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
