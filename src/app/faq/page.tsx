"use client";

import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, HelpCircle, MessageSquare } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "Apakah pendaftaran seluruh lomba dan challenge ini dipungut biaya?",
    a: "Tidak ada biaya sama sekali (100% gratis). Seluruh rangkaian lomba dan challenge Gebyar Bulan Bahasa diselenggarakan secara bebas biaya untuk memperingati Hari Sumpah Pemuda.",
  },
  {
    q: "Bagaimana cara kerja sistem penilaian digital oleh dewan juri?",
    a: "Dewan juri login ke aplikasi menggunakan tablet/laptop masing-masing. Setiap juri memberikan nilai per kriteria berbobot (total 100%). Nilai langsung diagregasikan secara otomatis oleh sistem tanpa kertas.",
  },
  {
    q: "Bagaimana jika terjadi nilai seri (draw) antar peserta?",
    a: "Sistem secara otomatis memprioritaskan peserta dengan perolehan skor tertinggi pada kriteria yang memiliki bobot persentase terbesar. Bila masih sama persis, Seksi Acara dan Juri Utama dapat menggelar sidang penetapan manual dengan catatan pertimbangan tertulis.",
  },
  {
    q: "Bagaimana cara pengunjung non-lomba mengumpulkan poin challenge?",
    a: "Pengunjung cukup mendaftarkan akun di laman /daftar, lalu mengunjungi 8 stand lomba untuk memindai kode QR atau memasukkan kode unik stand (misal: PUISI01, FILM02). Poin akan langsung bertambah di akun Anda.",
  },
  {
    q: "Kapan dan di mana hadiah poin challenge dapat ditukarkan?",
    a: "Penukaran merchandise (pin, tote bag, voucher, buku) dapat dilakukan di Stand Media Center setiap hari pukul 10.00 s/d 18.00 WIB selama kuota hadiah masih tersedia.",
  },
  {
    q: "Berapa lama waktu tunggu moderasi foto twibbon?",
    a: "Tim Media Center memoderasi setiap unggahan twibbon secara berkala dengan target waktu tunggu kurang dari 30 menit. Foto yang disetujui akan langsung tampil di galeri publik dan layar monitor venue.",
  },
];

export default function FAQPage() {
  const [openIdx, setOpenIdx] = React.useState<number | null>(0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="space-y-4 text-center">
            <Badge variant="gold" className="text-xs">
              Pusat Bantuan & Tanya Jawab
            </Badge>
            <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Pertanyaan yang Sering Diajukan (FAQ)
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Temukan jawaban cepat seputar teknis penjurian, verifikasi berkas lomba, dan alur partisipasi challenge interaktif.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-heading font-semibold text-sm sm:text-base text-foreground cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <HelpCircle className="h-4 w-4 text-accent shrink-0" />
                      <span>{item.q}</span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-foreground" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="p-5 pt-0 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/50 animate-in fade-in-50 duration-150">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center pt-8 border-t border-border space-y-3">
            <p className="text-xs text-muted-foreground">
              Masih memiliki pertanyaan yang belum terjawab?
            </p>
            <Link href="/kontak">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
                <MessageSquare className="h-4 w-4" />
                <span>Hubungi Sekretariat Panitia Acara</span>
              </span>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
