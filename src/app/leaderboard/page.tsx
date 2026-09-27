"use client";

import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CHALLENGE_LEADERBOARD, REWARDS } from "@/lib/dummy-data";
import { Trophy, Coins, Sparkles, Gift, ArrowRight, ShieldCheck } from "lucide-react";

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="space-y-4 text-center max-w-3xl mx-auto">
            <Badge variant="gold" className="text-xs">
              Peringkat Peserta Non-Lomba
            </Badge>
            <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-foreground flex items-center justify-center gap-3">
              <Trophy className="h-8 w-8 text-accent" />
              <span>Klasemen Poin Challenge</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Kumpulkan poin dengan berkeliling 8 stand pameran lomba, ikuti kuis bahasa Indonesia, dan unggah karya twibbon untuk memperebutkan hadiah eksklusif.
            </p>

            <div className="pt-2 flex justify-center gap-3">
              <Link href="/challenge">
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <span>Daftar Misi Challenge</span>
                </Button>
              </Link>
              <Link href="/peserta/scan">
                <Button size="sm" className="text-xs gap-1.5">
                  <span>Scan QR Stand Sekarang</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* Rank 2 */}
            <Card className="order-2 md:order-1 border-muted-foreground/30 p-6 text-center space-y-3">
              <span className="text-2xl">🥈</span>
              <Badge variant="default" className="text-[10px]">
                Peringkat #2
              </Badge>
              <h3 className="font-heading text-base font-bold text-foreground">
                {CHALLENGE_LEADERBOARD[1].name}
              </h3>
              <p className="text-xs text-muted-foreground">{CHALLENGE_LEADERBOARD[1].institution}</p>
              <div className="text-base font-mono font-bold text-accent">
                {CHALLENGE_LEADERBOARD[1].points} Poin
              </div>
              <Badge variant="gold" className="text-[10px]">
                {CHALLENGE_LEADERBOARD[1].badge}
              </Badge>
            </Card>

            {/* Rank 1 */}
            <Card className="order-1 md:order-2 border-accent bg-accent/5 p-8 text-center space-y-4 md:-translate-y-3 shadow-xs">
              <span className="text-3xl">🥇</span>
              <Badge variant="gold" className="text-xs">
                PEMIMPIN KLASEMEN (#1)
              </Badge>
              <h3 className="font-heading text-xl font-bold text-foreground">
                {CHALLENGE_LEADERBOARD[0].name}
              </h3>
              <p className="text-xs text-muted-foreground">{CHALLENGE_LEADERBOARD[0].institution}</p>
              <div className="text-2xl font-mono font-black text-accent">
                {CHALLENGE_LEADERBOARD[0].points} Poin
              </div>
              <Badge variant="gold" className="text-[10px]">
                {CHALLENGE_LEADERBOARD[0].badge}
              </Badge>
            </Card>

            {/* Rank 3 */}
            <Card className="order-3 border-amber-700/30 p-6 text-center space-y-3">
              <span className="text-2xl">🥉</span>
              <Badge variant="warning" className="text-[10px]">
                Peringkat #3
              </Badge>
              <h3 className="font-heading text-base font-bold text-foreground">
                {CHALLENGE_LEADERBOARD[2].name}
              </h3>
              <p className="text-xs text-muted-foreground">{CHALLENGE_LEADERBOARD[2].institution}</p>
              <div className="text-base font-mono font-bold text-accent">
                {CHALLENGE_LEADERBOARD[2].points} Poin
              </div>
              <Badge variant="gold" className="text-[10px]">
                {CHALLENGE_LEADERBOARD[2].badge}
              </Badge>
            </Card>
          </div>

          {/* Table Leaderboard Lengkap */}
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-bold text-foreground">
              Daftar Peringkat 10 Besar Peserta
            </h3>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Pos</TableHead>
                    <TableHead>Nama Peserta</TableHead>
                    <TableHead>Asal Sekolah / Instansi</TableHead>
                    <TableHead className="text-center">Lencana Kehormatan</TableHead>
                    <TableHead className="text-right">Total Perolehan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CHALLENGE_LEADERBOARD.map((item) => (
                    <TableRow key={item.rank}>
                      <TableCell className="text-center font-mono font-bold text-xs">
                        #{item.rank}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground text-sm">
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
