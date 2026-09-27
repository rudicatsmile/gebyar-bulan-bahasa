"use client";

import Link from "next/link";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { MailCheck, ArrowRight } from "lucide-react";

export default function VerifikasiEmailPage() {
  return (
    <AuthLayout
      title="Verifikasi Email Anda"
      subtitle="Satu langkah lagi untuk mengaktifkan akun peserta GebyarBulanBahasa Anda."
    >
      <div className="space-y-5 text-center py-4">
        <div className="h-16 w-16 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto">
          <MailCheck className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h3 className="font-heading text-lg font-bold text-foreground">
            Periksa Kotak Masuk Anda
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tautan konfirmasi telah dikirimkan ke alamat email Anda. Klik tautan tersebut untuk menyelesaikan verifikasi akun.
          </p>
        </div>

        <div className="pt-4 flex flex-col gap-2.5">
          <Link href="/peserta">
            <Button size="lg" className="w-full text-xs font-semibold gap-2">
              <span>Lanjut ke Dashboard Peserta (Demo)</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/masuk">
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
              Kembali ke Halaman Masuk
            </Button>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
