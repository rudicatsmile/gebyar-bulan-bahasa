import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, BookOpen, Users, Compass, Award, CheckCircle } from "lucide-react";

export const metadata = {
  title: "Tentang Acara",
  description: "Latar Belakang, Visi, dan Susunan Panitia Gebyar Bulan Bahasa dan Kebudayaan 2025.",
};

const COMMITTEE_MEMBERS = [
  { role: "Penanggung Jawab Acara", name: "Dra. Hj. Pebriani M.Pd.", title: "Ketua Pelaksana & Kurator Acara" },
  { role: "Seksi Acara & Perlombaan", name: "Rahmat Hidayat S.Pd.", title: "Koordinator Operasional 8 Lomba" },
  { role: "Koordinator Dewan Juri", name: "Dr. Siti Nurhaliza M.Pd.", title: "Kepala Penilai & Standarisasi Skor" },
  { role: "Media Center & Dokumentasi", name: "Bima Arya Prasetya", title: "Ketua Publikasi, Twibbon & Monitor" },
  { role: "Seksi Hubungan & Peserta", name: "Fathia Zahra S.Sos.", title: "Verifikasi Berkas & Pelayanan Peserta" },
  { role: "Koordinator Challenge & Stand", name: "Bayu Wicaksono", title: "Pengelola 8 Stand & Distribusi Hadiah" },
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

          {/* Latar Belakang */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center border border-border rounded-2xl p-6 sm:p-8 bg-card">
            <div className="space-y-4">
              <span className="text-xs font-mono tracking-widest text-accent uppercase font-bold flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                Latar Belakang
              </span>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Menjunjung Bahasa Persatuan di Era Digital
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Bulan Bahasa dan Sastra yang diperingati setiap bulan Oktober berakar dari tonggak sejarah Sumpah Pemuda 28 Oktober 1928, di mana para pemuda dari segenap penjuru nusantara berikrar menjunjung bahasa persatuan, bahasa Indonesia.
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Melalui GebyarBulanBahasa, kami menghadirkan ekosistem festival yang memadukan keluhuran karya sastra, seni pertunjukan tradisional, dan kecanggihan teknologi penilaian digital real-time demi pengalaman acara yang adil, transparan, dan menginspirasi.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-muted/60 border border-border space-y-4 text-left">
              <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <Compass className="h-4 w-4 text-accent" />
                Tiga Pilar Utama Acara
              </h3>
              <ul className="space-y-3 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span><strong>100% Digital & Transparan:</strong> Penilaian 8 lomba tanpa kertas dengan kalkulasi agregasi multi-juri otomatis.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span><strong>Inklusif Non-Lomba:</strong> Penonton dan peserta non-lomba aktif berpartisipasi lewat challenge interaktif 8 stand.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span><strong>Pelestarian Nilai Budaya:</strong> Memadukan sastra modern dengan seni tradisi nusantara seperti Palang Pintu Betawi.</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {COMMITTEE_MEMBERS.map((member, i) => (
                <Card key={i} className="hover:border-accent/40 transition-colors">
                  <CardHeader className="p-5 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-bold">
                      {member.role}
                    </span>
                    <CardTitle className="text-base">{member.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{member.title}</p>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
