import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getStands, getRewards } from "@/lib/supabase/queries";
import {
  QrCode,
} from "lucide-react";

export const revalidate = 60;

export default async function ChallengeInfoPage() {
  const [stands, rewards] = await Promise.all([
    getStands(),
    getRewards(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Header */}
          <div className="space-y-4 text-center max-w-3xl mx-auto">
            <Badge variant="gold" className="text-xs">
              Aktivitas Partisipasi Interaktif
            </Badge>
            <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Challenge Poin & Pameran 8 Stand Lomba
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Acara Gebyar Bulan Bahasa tidak hanya untuk peserta lomba! Pengunjung dan peserta non-lomba dapat mengumpulkan poin reward dengan menjelajahi area stand pameran.
            </p>

            <div className="pt-2 flex justify-center gap-3">
              <Link href="/peserta/scan">
                <Button size="lg" className="text-xs gap-1.5 shadow-xs">
                  <QrCode className="h-4 w-4" />
                  <span>Buka Kamera Scanner QR Stand</span>
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button variant="outline" size="lg" className="text-xs">
                  Lihat Klasemen Sementara →
                </Button>
              </Link>
            </div>
          </div>

          {/* 3 Langkah Mudah */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-3 border-accent/30 bg-accent/5">
              <span className="font-mono text-2xl font-bold text-accent">01.</span>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Kunjungi Stand Pameran
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Datangi 8 stand pameran cabang lomba di area selasar barat, pelataran budaya, dan lobi teater.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border-accent/30 bg-accent/5">
              <span className="font-mono text-2xl font-bold text-accent">02.</span>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Scan QR atau Masukkan Kode
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pindai kode QR stand atau ketik kode unik 6 karakter (contoh: <code>PUISI01</code>) untuk klaim 10 poin instan.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border-accent/30 bg-accent/5">
              <span className="font-mono text-2xl font-bold text-accent">03.</span>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Tukarkan Hadiah Eksklusif
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tukarkan akumulasi poin dengan pin logam emas, tote bag kanvas, voucher kopi, atau buku antologi di Media Center.
              </p>
            </Card>
          </div>

          {/* Daftar 8 Stand Lomba */}
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-mono text-accent font-bold uppercase tracking-wider">
                Lokasi & Kode Unik
              </span>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                8 Stand Pameran Resmi di Venue
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stands.map((stand) => (
                <Card key={stand.id} className="p-4 space-y-2.5 hover:border-accent transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary text-accent">
                      {stand.code}
                    </span>
                    <span className="text-xs font-mono font-bold text-accent">
                      +{stand.points} Poin
                    </span>
                  </div>
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    {stand.name}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {stand.description}
                  </p>
                  <p className="text-[11px] text-foreground/80 font-medium pt-2 border-t border-border/60">
                    📍 {stand.location}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* Katalog Hadiah / Reward */}
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-mono text-accent font-bold uppercase tracking-wider">
                Katalog Penukaran
              </span>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Daftar Reward & Merchandise Eksklusif
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rewards.map((rew) => {
                const sisa = rew.quota - rew.claimedCount;
                return (
                  <Card key={rew.id} className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="gold" className="text-[10px]">
                        {rew.category}
                      </Badge>
                      <span className="font-mono text-sm font-bold text-accent">
                        {rew.pointsRequired} Poin
                      </span>
                    </div>

                    <div>
                      <h4 className="font-heading text-base font-bold text-foreground">
                        {rew.name}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {rew.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                      <span>Sisa Kuota: <strong>{sisa}</strong> / {rew.quota}</span>
                      <Link href="/peserta/reward">
                        <Button size="sm" variant="outline" className="text-xs">
                          Tukar
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
