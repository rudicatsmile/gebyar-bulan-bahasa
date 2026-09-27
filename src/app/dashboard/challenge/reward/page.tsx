"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { REWARDS, Reward } from "@/lib/dummy-data";
import { Gift, ArrowLeft, Plus, CheckCircle2, Clock } from "lucide-react";

interface RedemptionQueue {
  id: string;
  participantName: string;
  rewardName: string;
  pointsSpent: number;
  pickupCode: string;
  status: "menunggu" | "diserahkan";
  requestedAt: string;
}

const INITIAL_QUEUE: RedemptionQueue[] = [
  {
    id: "red-1",
    participantName: "Nurul Hidayah Salsabila",
    rewardName: "Pin Logam Edisi Sumpah Pemuda 2025",
    pointsSpent: 100,
    pickupCode: "PIN-8831",
    status: "menunggu",
    requestedAt: "27 Okt 2025, 11:20 WIB",
  },
  {
    id: "red-2",
    participantName: "Bagas Prasetyo Wibowo",
    rewardName: "Voucher Kopi Nusantara Rp25.000",
    pointsSpent: 150,
    pickupCode: "VOU-4290",
    status: "menunggu",
    requestedAt: "27 Okt 2025, 10:45 WIB",
  },
  {
    id: "red-3",
    participantName: "Clara Stephanie",
    rewardName: "Pin Logam Edisi Sumpah Pemuda 2025",
    pointsSpent: 100,
    pickupCode: "PIN-1029",
    status: "diserahkan",
    requestedAt: "26 Okt 2025, 16:30 WIB",
  },
];

export default function DashboardKelolaRewardPage() {
  const [rewards, setRewards] = React.useState<Reward[]>(REWARDS);
  const [queue, setQueue] = React.useState<RedemptionQueue[]>(INITIAL_QUEUE);

  const handleHandover = (id: string) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: "diserahkan" } : q))
    );
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-8">
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
                <Gift className="h-7 w-7 text-accent" />
                <span>Katalog Reward & Pemrosesan Klaim Hadiah</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Pantau sisa kuota merchandise dan proses penyerahan hadiah fisik kepada peserta di meja Media Center.
              </p>
            </div>
          </div>
        </div>

        {/* Antrean Penyerahan Hadiah */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-foreground">
              Antrean Penyerahan Hadiah di Lokasi
            </h2>
            <Badge variant="warning" className="text-xs font-mono">
              {queue.filter((q) => q.status === "menunggu").length} Menunggu Pengambilan
            </Badge>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Kode Ambil</TableHead>
                  <TableHead>Nama Peserta</TableHead>
                  <TableHead>Hadiah Ditukar</TableHead>
                  <TableHead className="text-center">Poin Terpotong</TableHead>
                  <TableHead className="text-center">Status Klaim</TableHead>
                  <TableHead className="text-right">Aksi Penyerahan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs font-bold text-accent">
                      {item.pickupCode}
                    </TableCell>
                    <TableCell className="font-medium text-foreground text-xs sm:text-sm">
                      {item.participantName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.rewardName}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-xs">
                      -{item.pointsSpent} Pts
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={item.status === "diserahkan" ? "success" : "warning"}
                        className="text-[10px]"
                      >
                        {item.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status === "menunggu" ? (
                        <Button
                          size="sm"
                          variant="accent"
                          onClick={() => handleHandover(item.id)}
                          className="text-xs h-7"
                        >
                          Tandai Diserahkan
                        </Button>
                      ) : (
                        <span className="text-[11px] text-success font-medium">✓ Selesai</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Katalog Kuota Reward */}
        <div className="space-y-4">
          <h2 className="font-heading text-lg font-bold text-foreground">
            Stok & Kuota Merchandise Hadiah
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rewards.map((rew) => {
              const remaining = rew.quota - rew.claimedCount;
              return (
                <Card key={rew.id} className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="gold" className="text-[10px]">
                      {rew.category}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-accent">
                      {rew.pointsRequired} Poin
                    </span>
                  </div>

                  <div>
                    <h4 className="font-heading text-base font-bold text-foreground">
                      {rew.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">{rew.description}</p>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <span>Terklaim: {rew.claimedCount}</span>
                    <span className="font-bold text-foreground">Sisa: {remaining} unit</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
