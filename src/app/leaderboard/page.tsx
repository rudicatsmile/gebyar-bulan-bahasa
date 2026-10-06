import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getChallengeLeaderboard } from "@/lib/supabase/queries";
import { Trophy, Sparkles, ArrowRight } from "lucide-react";

export const revalidate = 60;

export default async function LeaderboardPage() {
  const leaderboard = await getChallengeLeaderboard();

  const rank1 = leaderboard[0];
  const rank2 = leaderboard[1];
  const rank3 = leaderboard[2];

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
          {leaderboard.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {/* Rank 2 */}
              {rank2 && (
                <Card className="order-2 md:order-1 border-muted-foreground/30 p-6 text-center space-y-3">
                  <span className="text-2xl">🥈</span>
                  <Badge variant="default" className="text-[10px]">
                    Peringkat #2
                  </Badge>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    {rank2.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{rank2.institution}</p>
                  <div className="text-base font-mono font-bold text-accent">
                    {rank2.points} Poin
                  </div>
                  <Badge variant="gold" className="text-[10px]">
                    {rank2.badge}
                  </Badge>
                </Card>
              )}

              {/* Rank 1 */}
              {rank1 && (
                <Card className="order-1 md:order-2 border-accent bg-accent/5 p-8 text-center space-y-4 md:-translate-y-3 shadow-xs">
                  <span className="text-3xl">🥇</span>
                  <Badge variant="gold" className="text-xs">
                    PEMIMPIN KLASEMEN (#1)
                  </Badge>
                  <h3 className="font-heading text-xl font-bold text-foreground">
                    {rank1.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{rank1.institution}</p>
                  <div className="text-2xl font-mono font-black text-accent">
                    {rank1.points} Poin
                  </div>
                  <Badge variant="gold" className="text-[10px]">
                    {rank1.badge}
                  </Badge>
                </Card>
              )}

              {/* Rank 3 */}
              {rank3 && (
                <Card className="order-3 border-amber-700/30 p-6 text-center space-y-3">
                  <span className="text-2xl">🥉</span>
                  <Badge variant="warning" className="text-[10px]">
                    Peringkat #3
                  </Badge>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    {rank3.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{rank3.institution}</p>
                  <div className="text-base font-mono font-bold text-accent">
                    {rank3.points} Poin
                  </div>
                  <Badge variant="gold" className="text-[10px]">
                    {rank3.badge}
                  </Badge>
                </Card>
              )}
            </div>
          )}

          {/* Table Leaderboard Lengkap */}
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-bold text-foreground">
              Daftar Peringkat 10 Besar Peserta
            </h3>

            {/* Mobile Card List (Tanpa Scroll Horizontal) */}
            <div className="block sm:hidden space-y-2.5">
              {leaderboard.map((item) => {
                const isPodium = item.rank <= 3;
                return (
                  <div
                    key={item.rank}
                    className={`rounded-xl border p-3.5 space-y-2.5 transition-colors ${
                      item.rank === 1
                        ? "border-accent/40 bg-accent/5"
                        : item.rank === 2
                        ? "border-muted-foreground/30 bg-muted/30"
                        : item.rank === 3
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-mono font-bold shrink-0 ${
                            item.rank === 1
                              ? "bg-accent text-accent-foreground shadow-xs"
                              : item.rank === 2
                              ? "bg-muted-foreground/30 text-foreground"
                              : item.rank === 3
                              ? "bg-amber-600/20 text-amber-600 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          #{item.rank}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.institution}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-accent text-sm block">
                          {item.points} Pts
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                      <span className="text-muted-foreground">Lencana:</span>
                      <Badge variant="gold" className="text-[10px]">
                        {item.badge}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden">
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
                  {leaderboard.map((item) => (
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
