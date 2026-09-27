"use client";

import * as React from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ArrowLeft } from "lucide-react";

export default function LupaPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <AuthLayout
      title="Atur Ulang Kata Sandi"
      subtitle="Masukkan alamat email akun Anda untuk menerima tautan pemulihan kata sandi."
    >
      {submitted ? (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
          <h3 className="font-heading text-lg font-bold text-foreground">
            Tautan Terkirim!
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Kami telah mengirimkan instruksi pengaturan ulang kata sandi ke <strong>{email}</strong>. Silakan periksa kotak masuk atau spam Anda.
          </p>
          <div className="pt-2">
            <Link href="/reset-password">
              <Button size="sm" variant="outline" className="text-xs">
                Simulasi Buka Tautan Reset Password →
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Alamat Email Terdaftar *"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" size="lg" className="w-full text-xs font-semibold">
            Kirim Tautan Atur Ulang
          </Button>

          <div className="text-center pt-2">
            <Link
              href="/masuk"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Halaman Masuk</span>
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
