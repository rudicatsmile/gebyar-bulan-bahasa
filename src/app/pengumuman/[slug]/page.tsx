import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAnnouncementBySlug } from "@/lib/supabase/queries";
import {
  ArrowLeft,
  Calendar,
  User,
  Megaphone,
} from "lucide-react";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PengumumanDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const announcement = await getAnnouncementBySlug(slug);
  if (!announcement) {
    return notFound();
  }

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
            </div>
          </header>

          {/* Content Body */}
          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground leading-relaxed space-y-4">
            <p className="text-base sm:text-lg leading-relaxed text-foreground/90 whitespace-pre-line">
              {announcement.body}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Bagi peserta atau pembina yang membutuhkan konfirmasi lebih lanjut, silakan menghubungi narahubung panitia atau mendatangi Meja Informasi Gedung Utama.
            </p>
          </div>

          {/* Banner Box */}
          <Card className="border-accent/40 bg-accent/5 p-6">
            <CardContent className="p-0 flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <Megaphone className="h-5 w-5 text-accent" />
              </div>
              <div className="space-y-1">
                <h4 className="font-heading text-sm font-bold text-foreground">
                  Informasi Resmi Gebyar Bulan Bahasa
                </h4>
                <p className="text-xs text-muted-foreground">
                  Pengumuman ini merupakan rilis resmi dari Seksi Acara & Media Center. Silakan periksa halaman jadwal secara berkala untuk perubahan waktu siaran panggung.
                </p>
              </div>
            </CardContent>
          </Card>
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
