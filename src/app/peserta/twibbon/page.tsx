"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TWIBBONS } from "@/lib/dummy-data";
import { Camera, ArrowLeft, Upload, Sparkles, CheckCircle2 } from "lucide-react";

export default function PesertaTwibbonSayaPage() {
  // My twibbon: Ahmad Fauzan Ramadhan
  const myTwibbon = TWIBBONS[0];

  return (
    <DashboardLayout role="peserta">
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
                <span>Unggah Ulang Foto</span>
              </Button>
            </Link>
          </div>
        </div>

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
                  {myTwibbon.uploaderName}
                </h3>
                <p className="text-xs text-muted-foreground">{myTwibbon.institution}</p>
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
      </div>
    </DashboardLayout>
  );
}
