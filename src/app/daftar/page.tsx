"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DaftarPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [institution, setInstitution] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            institution,
            role: "peserta",
          },
        },
      });

      if (error && !error.message.includes("placeholder")) {
        console.warn("Supabase SignUp notice:", error.message);
      }
    } catch {
      // Graceful fallback for offline demo
    }

    setIsLoading(false);
    router.push("/verifikasi-email");
  };

  return (
    <AuthLayout
      title="Daftar Akun Peserta"
      subtitle="Buat akun peserta untuk mengikuti challenge non-lomba, scan stand pameran, dan menukar reward."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-danger text-xs">
            {errorMsg}
          </div>
        )}

        <Input
          label="Nama Lengkap *"
          placeholder="Nama Lengkap Anda"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <Input
          label="Asal Sekolah / Kampus / Instansi *"
          placeholder="Contoh: SMAN 1 Bandung"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          required
        />

        <Input
          label="Alamat Email *"
          type="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Kata Sandi (Minimal 8 Karakter) *"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          helperText="Gunakan kombinasi huruf besar, huruf kecil, dan angka."
          required
        />

        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          className="w-full text-xs font-semibold gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span>Daftar Sekarang</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <div className="text-center pt-2 text-xs text-muted-foreground">
          Sudah memiliki akun terdaftar?{" "}
          <Link href="/masuk" className="font-semibold text-foreground underline hover:text-accent">
            Masuk di Sini
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
