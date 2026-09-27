"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ANNOUNCEMENTS } from "@/lib/dummy-data";
import {
  ArrowLeft,
  Calendar,
  User,
  Share2,
  FileDown,
  Megaphone,
  Check,
} from "lucide-react";

export default function PengumumanDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [copied, setCopied] = React.useState(false);

  const announcement = ANNOUNCEMENTS.find((a) => a.slug === slug);
  if (!announcement) {
    return notFound();
  }

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-10 sm:py-16">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Back button */}
          <div>
            <Link
              href="/pengumuman"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Semua Pengumuman</span>
            </Link>
          </div>

          {/* Article Header */}
          <header className="space-y-4 border-b border-border pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={announcement.category === "penting" ? "danger" : "default"}
                className="text-xs"
              >
                {announcement.category}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">
                {announcement.publishedAt}
              </span>
            </div>

            <h1 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
              {announcement.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-accent" />
                <span>Diterbitkan oleh: <strong>{announcement.author}</strong></span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="text-xs gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Share2 className="h-3.5 w-3.5" />}
                <span>{copied ? "Tautan Disalin!" : "Bagikan Pengumuman"}</span>
              </Button>
            </div>
          </header>

          {/* Content Body */}
          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground leading-relaxed space-y-4">
            <p className="text-base sm:text-lg leading-relaxed text-foreground/90">
              {announcement.body}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Bagi peserta atau pembina yang membutuhkan konfirmasi lebih lanjut, silakan menghubungi narahubung panitia atau mendatangi Meja Informasi Gedung Utama.
            </p>
          </div>

          {/* Lampiran Dokumen Dummy */}
          <Card className="border-border bg-card">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 truncate">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileDown className="h-5 w-5 text-accent" />
                </div>
                <div className="truncate">
                  <span className="text-xs font-semibold text-foreground block truncate">
                    Surat_Edaran_Panitia_BulanBahasa_2025.pdf
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Dokumen Resmi PDF • 1.2 MB
                  </span>
                </div>
              </div>
              <Button size="sm" variant="outline" className="text-xs shrink-0">
                Unduh PDF
              </Button>
            </CardContent>
          </Card>
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
