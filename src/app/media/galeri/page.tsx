"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image, Plus, ArrowLeft, Download } from "lucide-react";

interface GalleryAlbum {
  id: string;
  title: string;
  category: string;
  photosCount: number;
  coverUrl: string;
  date: string;
}

const ALBUMS: GalleryAlbum[] = [
  {
    id: "alb-1",
    title: "Pembukaan Resmi & Lomba Palang Pintu Betawi",
    category: "Hari ke-1",
    photosCount: 48,
    coverUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=500&h=300&fit=crop",
    date: "26 Oktober 2025",
  },
  {
    id: "alb-2",
    title: "Lomba Membaca Puisi Sastra Nusantara",
    category: "Hari ke-2",
    photosCount: 65,
    coverUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=500&h=300&fit=crop",
    date: "27 Oktober 2025",
  },
  {
    id: "alb-3",
    title: "Aktivitas Stand Pameran & Peserta Challenge",
    category: "Stand Pameran",
    photosCount: 92,
    coverUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=500&h=300&fit=crop",
    date: "27 Oktober 2025",
  },
  {
    id: "alb-4",
    title: "Area Kreatif Melukis Tas Kanvas",
    category: "Hari ke-2",
    photosCount: 34,
    coverUrl: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=500&h=300&fit=crop",
    date: "27 Oktober 2025",
  },
];

export default function MediaGaleriDokumentasiPage() {
  return (
    <DashboardLayout role="media_center">
      <div className="space-y-6">
        <div>
          <Link
            href="/media"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Ringkasan Media</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Image className="h-7 w-7 text-accent" />
                <span>Galeri Album Dokumentasi Acara</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Arsip foto dan video dokumentasi panggung festival untuk publikasi dan arsip panitia.
              </p>
            </div>

            <Button size="sm" className="text-xs gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>Buat Album Baru</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ALBUMS.map((alb) => (
            <Card key={alb.id} className="overflow-hidden hover:border-accent transition-colors flex flex-col justify-between">
              <div className="relative aspect-video w-full bg-muted overflow-hidden">
                <img
                  src={alb.coverUrl}
                  alt={alb.title}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
                <Badge variant="gold" className="absolute top-2 left-2 text-[10px]">
                  {alb.category}
                </Badge>
              </div>

              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <h4 className="font-heading text-sm font-bold text-foreground line-clamp-2">
                    {alb.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">{alb.date}</p>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono font-semibold text-accent">{alb.photosCount} Foto/Video</span>
                  <Button variant="ghost" size="sm" className="text-xs h-7 p-0 text-accent">
                    Buka Album →
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
