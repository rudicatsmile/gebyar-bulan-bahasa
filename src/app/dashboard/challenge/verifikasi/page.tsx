"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, XCircle, FileVideo, FileText, Image } from "lucide-react";

interface PendingSubmission {
  id: string;
  participantName: string;
  institution: string;
  challengeTitle: string;
  proofType: "video" | "foto" | "tautan";
  description: string;
  points: number;
  submittedAt: string;
}

const INITIAL_SUBMISSIONS: PendingSubmission[] = [
  {
    id: "sub-1",
    participantName: "Bagas Prasetyo Wibowo",
    institution: "Universitas Indonesia",
    challengeTitle: "Rekam Video Orasi Kebahasaan",
    proofType: "video",
    description: "Video rekaman ikrar 45 detik di pelataran Panggung Utama bersama 5 pemuda daerah.",
    points: 50,
    submittedAt: "27 Oktober 2025, 10:20 WIB",
  },
  {
    id: "sub-2",
    participantName: "Kirana Ayu Lestari",
    institution: "SMA Taman Siswa Yogyakarta",
    challengeTitle: "Wawancara Singkat Juri Favorit",
    proofType: "foto",
    description: "Foto wawancara dan ringkasan 3 poin pesan sastra bersama Dr. Siti Nurhaliza M.Pd.",
    points: 40,
    submittedAt: "27 Oktober 2025, 11:15 WIB",
  },
  {
    id: "sub-3",
    participantName: "Dimas Arya Pratama",
    institution: "SMA Taruna Nusantara",
    challengeTitle: "Tantangan Twibbon GebyarBulanBahasa",
    proofType: "foto",
    description: "Tautan unggahan Instagram reels twibbon dengan caption kebangsaan.",
    points: 20,
    submittedAt: "27 Oktober 2025, 11:30 WIB",
  },
];

export default function DashboardVerifikasiChallengePage() {
  const [submissions, setSubmissions] = React.useState<PendingSubmission[]>(INITIAL_SUBMISSIONS);

  const handleAction = (id: string, action: "setujui" | "tolak") => {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/challenge"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Kelola Challenge</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Verifikasi Bukti Challenge Peserta
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Tinjau rekaman video, foto wawancara, dan bukti misi yang diunggah peserta sebelum poin dicairkan.
              </p>
            </div>
            <Badge variant="warning" className="text-xs">
              {submissions.length} Bukti Menunggu
            </Badge>
          </div>
        </div>

        {submissions.length > 0 ? (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <Card key={sub.id} className="p-6 space-y-4 border-accent/40 bg-accent/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="gold" className="text-[10px]">
                        +{sub.points} Poin
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground uppercase">
                        Tipe: {sub.proofType}
                      </span>
                    </div>
                    <h3 className="font-heading text-base font-bold text-foreground">
                      {sub.challengeTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Pengunggah: <strong>{sub.participantName}</strong> ({sub.institution}) • {sub.submittedAt}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(sub.id, "tolak")}
                      className="text-xs gap-1"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Tolak Bukti</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleAction(sub.id, "setujui")}
                      className="text-xs gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Setujui & Berikan +{sub.points} Poin</span>
                    </Button>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-card text-xs text-foreground/90 leading-relaxed">
                  <strong>Catatan Peserta:</strong> &ldquo;{sub.description}&rdquo;
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl bg-card space-y-3">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <h3 className="font-heading text-base font-bold text-foreground">
              Semua Bukti Challenge Telah Terverifikasi!
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Tidak ada kiriman bukti baru yang sedang menunggu moderasi.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
