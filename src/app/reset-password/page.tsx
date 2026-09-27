"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setError("");
    setSubmitted(true);
  };

  return (
    <AuthLayout
      title="Kata Sandi Baru"
      subtitle="Silakan buat kata sandi baru yang aman untuk akun Anda."
    >
      {submitted ? (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
          <h3 className="font-heading text-lg font-bold text-foreground">
            Kata Sandi Diperbarui!
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Kata sandi Anda telah berhasil diubah. Silakan masuk menggunakan kata sandi baru Anda.
          </p>
          <div className="pt-2">
            <Link href="/masuk">
              <Button size="sm" className="text-xs">
                Masuk ke Akun Sekarang →
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-xs text-danger font-medium">{error}</p>}

          <Input
            label="Kata Sandi Baru *"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Input
            label="Konfirmasi Kata Sandi Baru *"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button type="submit" size="lg" className="w-full text-xs font-semibold">
            Simpan Kata Sandi Baru
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
