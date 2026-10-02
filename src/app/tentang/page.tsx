import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, BookOpen, Users, Compass, Award, CheckCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export const metadata = {
  title: "Tentang Acara",
  description: "Latar Belakang, Visi, dan Susunan Panitia Gebyar Bulan Bahasa dan Kebudayaan 2025.",
};

const COMMITTEE_MEMBERS = [
  {
    role: "Penanggung Jawab",
    name: "Siti Aliyah A., S.Ag.",
    title: "Kepala Sekolah",
    color: "border-l-rose-700 dark:border-l-rose-500",
  },
  {
    role: "Ketua Pelaksana",
    name: "Rizky Pebriani, M.Pd.",
    title: "Kepala Perpustakaan/ Guru",
    color: "border-l-amber-500 dark:border-l-amber-400",
  },
  {
    role: "Wakil Ketua",
    name: "Suci Dwi Wulandari, S.E., M.Pd.",
    title: "Waka Kesiswaan",
    color: "border-l-emerald-600 dark:border-l-emerald-500",
  },
  {
    role: "Sekretariat",
    name: "Mela Nurhasanah, S.Pd. & Najla Azzahra",
    title: "Guru / XII MPLB 3",
    color: "border-l-rose-600 dark:border-l-rose-400",
  },
  {
    role: "Bendahara",
    name: "Zurrahmah, S.Pd. & Sheila Jessika Sari",
    title: "Bendahara Sekolah / XII MPLB 3",
    color: "border-l-amber-500 dark:border-l-amber-400",
  },
  {
    role: "Koorlap",
    name: "Saepullah, S.Pd. & tim",
    title: "Pembina Ekskul + siswa",
    color: "border-l-emerald-600 dark:border-l-emerald-500",
  },
];

const SUPPORT_DIVISIONS = [
  "Acara",
  "Humas",
  "Kesekretariatan",
  "Perlengkapan",
  "Dokumentasi",
  "Konsumsi",
  "Keamanan",
];

export default function TentangPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="space-y-4 text-center max-w-3xl mx-auto">
            <Badge variant="gold" className="text-xs">
              Profil & Identitas Acara
            </Badge>
            <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Gebyar Bulan Bahasa dan Kebudayaan 2025
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Peringatan Hari Sumpah Pemuda bertema &ldquo;Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.&rdquo;
            </p>
          </div>

          {/* Latar Belakang Proposal */}
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <span className="text-xs font-mono tracking-widest text-accent uppercase font-bold flex items-center justify-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                Latar Belakang Proposal
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                Fondasi Nilai & Urgensi Kegiatan
              </h2>
            </div>

            {/* 3 Pilar Kartu Latar Belakang */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-rose-700 dark:border-l-rose-500 shadow-xs bg-card hover:border-accent/40 transition-colors">
                <CardHeader className="p-5 sm:p-6 space-y-2.5">
                  <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                    Bahasa = Identitas
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Bahasa dan budaya diposisikan sebagai identitas nasional serta fondasi pembentukan karakter dan kepribadian bangsa.
                  </p>
                </CardHeader>
              </Card>

              <Card className="border-l-4 border-l-amber-500 dark:border-l-amber-400 shadow-xs bg-card hover:border-accent/40 transition-colors">
                <CardHeader className="p-5 sm:p-6 space-y-2.5">
                  <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                    Tantangan Generasi Muda
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Globalisasi dan perkembangan teknologi digital menghadirkan tantangan untuk menjaga kelestarian bahasa Indonesia dan budaya Nusantara.
                  </p>
                </CardHeader>
              </Card>

              <Card className="border-l-4 border-l-emerald-600 dark:border-l-emerald-500 shadow-xs bg-card hover:border-accent/40 transition-colors">
                <CardHeader className="p-5 sm:p-6 space-y-2.5">
                  <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                    Konteks SMK
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Siswa tidak hanya perlu kompetensi teknis, tetapi juga kreativitas, karakter kuat, kemampuan berkolaborasi, dan kebanggaan terhadap budaya.
                  </p>
                </CardHeader>
              </Card>
            </div>

            {/* Poin-poin Penegas */}
            <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-xs">
              <ul className="space-y-3 text-xs sm:text-sm text-foreground font-semibold">
                <li className="flex items-start gap-3">
                  <span className="text-accent text-lg leading-none mt-0.5">•</span>
                  <span>
                    Momentum Bulan Bahasa menjadi ruang untuk mengasah literasi, seni, komunikasi, dan pelestarian budaya.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent text-lg leading-none mt-0.5">•</span>
                  <span>
                    Seluruh program keahlian didorong untuk berpartisipasi melalui kompetisi yang edukatif dan ekspresif.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent text-lg leading-none mt-0.5">•</span>
                  <span>
                    Ragam lomba dirancang untuk menghubungkan kemampuan berbahasa dengan kebutuhan komunikasi profesional di dunia kerja.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Susunan Panitia */}
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <span className="text-xs font-mono tracking-widest text-accent uppercase font-bold">
                Struktur Pelaksana
              </span>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Susunan Tim Panitia Penyelenggara
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COMMITTEE_MEMBERS.map((member, i) => (
                <Card
                  key={i}
                  className={cn(
                    "border-l-4 hover:border-accent/40 transition-colors shadow-xs bg-card",
                    member.color
                  )}
                >
                  <CardHeader className="p-5 space-y-1.5">
                    <span className="text-xs font-mono uppercase tracking-wider text-accent font-bold">
                      {member.role}
                    </span>
                    <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                      {member.name}
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                      {member.title}
                    </p>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {/* Divisi Pendukung */}
            <Card className="border-l-4 border-l-blue-600 dark:border-l-blue-400 hover:border-accent/40 transition-colors shadow-xs bg-card">
              <CardHeader className="p-5 space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-accent font-bold">
                  Divisi Pendukung
                </span>
                <p className="text-xs sm:text-sm text-foreground font-semibold flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {SUPPORT_DIVISIONS.map((divisi, index) => (
                    <span key={divisi} className="inline-flex items-center gap-2.5">
                      <span>{divisi}</span>
                      {index < SUPPORT_DIVISIONS.length - 1 && (
                        <span className="text-muted-foreground font-bold">•</span>
                      )}
                    </span>
                  ))}
                </p>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
