"use client";

import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ANNOUNCEMENTS } from "@/lib/dummy-data";
import { Megaphone, Calendar, User, ArrowRight, Pin } from "lucide-react";

export default function PengumumanPage() {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("semua");

  const filteredAnnouncements = ANNOUNCEMENTS.filter((ann) => {
    return selectedCategory === "semua" || ann.category === selectedCategory;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Header */}
          <div className="space-y-4 max-w-3xl">
            <Badge variant="gold" className="text-xs">
              Pusat Informasi & Warta Resmi
            </Badge>
            <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Pengumuman & Siaran Acara
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Dapatkan informasi terkini seputar nomor urut tampil, instruksi teknis panggung, dan rilis pengumuman juara lomba.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl border border-border bg-card">
            {["semua", "penting", "jadwal", "pemenang", "umum"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat === "semua" ? "Semua Kategori" : cat}
              </button>
            ))}
          </div>

          {/* Announcements List */}
          <div className="space-y-4">
            {filteredAnnouncements.map((ann) => {
              const isPinned = ann.isPinned;
              const isUrgent = ann.category === "penting";

              return (
                <Card
                  key={ann.id}
                  className={`hover:border-accent transition-colors ${
                    isUrgent ? "border-danger/40 bg-danger/5" : ""
                  }`}
                >
                  <CardHeader className="p-5 sm:p-6 pb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isPinned && (
                          <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-accent uppercase">
                            <Pin className="h-3 w-3" /> Dipin
                          </span>
                        )}
                        <Badge
                          variant={isUrgent ? "danger" : "default"}
                          className="text-[10px]"
                        >
                          {ann.category}
                        </Badge>
                      </div>

                      <span className="text-[11px] font-mono text-muted-foreground">
                        {ann.publishedAt}
                      </span>
                    </div>

                    <Link href={`/pengumuman/${ann.slug}`} className="block group">
                      <CardTitle className="text-lg sm:text-xl font-heading group-hover:text-accent transition-colors">
                        {ann.title}
                      </CardTitle>
                    </Link>
                  </CardHeader>

                  <CardContent className="p-5 sm:p-6 pt-0 space-y-4">
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {ann.body}
                    </p>

                    <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> Diterbitkan oleh: <strong>{ann.author}</strong>
                      </span>

                      <Link
                        href={`/pengumuman/${ann.slug}`}
                        className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                      >
                        <span>Baca Selengkapnya</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
