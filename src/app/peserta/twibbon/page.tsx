"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TWIBBONS } from "@/lib/dummy-data";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import { Camera, ArrowLeft, Upload, Sparkles, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

export default function PesertaTwibbonSayaPage() {
  const { participant, loading } = useCurrentParticipant();

  // If demo fallback account, use demo twibbon. Otherwise, user newly registered hasn't uploaded yet unless stored
  const isDemo = participant?.isDemoFallback;
  const myTwibbon = isDemo ? TWIBBONS[0] : null;

  return (
    <DashboardLayout role="peserta" participantPoints={participant?.totalPoints}>
      <div className="space-y-6 max-w-3xl">
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
                <Camera className="h-7 w-7 text-accent" />
                <span>Twibbon Resmi Saya</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Status kurasi dan penayangan twibbon Anda pada Galeri Publik dan Layar Monitor Lapangan venue.
              </p>
            </div>

            <Link href="/twibbon/unggah">
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                <span>{myTwibbon ? "Unggah Ulang Foto" : "Unggah Twibbon"}</span>
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-xs">Memuat status twibbon peserta...</p>
          </div>
        ) : myTwibbon ? (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              <div className="sm:col-span-5 relative aspect-square rounded-xl overflow-hidden bg-muted border border-border">
                <img
                  src={myTwibbon.imageUrl}
                  alt={myTwibbon.uploaderName}
                  className="h-full w-full object-cover"
                />
                {myTwibbon.isFeatured && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-foreground uppercase flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Unggulan
                  </span>
                )}
              </div>

              <div className="sm:col-span-7 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="text-[10px]">
                      DISETUJUI & TAYANG DI MONITOR
                    </Badge>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {myTwibbon.likesCount} Suka
                    </span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground">
                    {participant?.fullName || myTwibbon.uploaderName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {participant?.institution || myTwibbon.institution}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-xs text-foreground/90 italic">
                  &ldquo;{myTwibbon.caption}&rdquo;
                </div>

                <div className="text-[11px] text-muted-foreground space-y-1 border-t border-border pt-3">
                  <p>• Foto Anda telah ditandai sebagai <strong>Unggulan</strong> oleh Media Center.</p>
                  <p>• Diputar secara berkala pada Layar TV Monitor Lapangan setiap rotasi modul galeri.</p>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-8 sm:p-12 text-center space-y-4 border-dashed border-2 border-border">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
              <Camera className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-heading text-base font-bold text-foreground">
                Belum Ada Foto Twibbon yang Diunggah
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Halo <strong>{participant?.fullName}</strong>! Ramaikan Gebyar Bulan Bahasa 2025 dengan mengunggah foto twibbon budaya Anda untuk meraih <strong>+20 Poin Festival</strong> dan kesempatan ditayangkan di monitor lapangan utama.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/twibbon/unggah">
                <Button className="text-xs font-semibold gap-2">
                  <span>Unggah Twibbon Saya Sekarang</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
