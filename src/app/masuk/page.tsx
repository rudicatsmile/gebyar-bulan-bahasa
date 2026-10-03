"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(() => {
    return null; // diisi oleh useEffect setelah mount
  });

  // Tampilkan pesan error dari middleware (misal: akun nonaktif diarahkan ke /masuk?error=nonaktif)
  React.useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "nonaktif") {
      setErrorMsg(
        "Akun Anda telah dinonaktifkan oleh administrator. Silakan hubungi panitia untuk informasi lebih lanjut."
      );
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        // Ambil peran resmi DAN status keaktifan dari tabel public.profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_active")
          .eq("id", data.user.id)
          .maybeSingle();

        const userRole = profile?.role || "peserta";
        const isActive = profile?.is_active ?? true;

        // Blokir akun nonaktif (kecuali super_admin agar tidak terjadi lockout sistem)
        if (!isActive && userRole !== "super_admin") {
          await supabase.auth.signOut();
          setErrorMsg(
            "Akun Anda telah dinonaktifkan oleh administrator. Silakan hubungi panitia untuk informasi lebih lanjut."
          );
          setIsLoading(false);
          return;
        }

        const targetUrl =
          userRole === "seksi_acara" || userRole === "super_admin"
            ? "/dashboard"
            : userRole === "juri"
            ? "/juri"
            : userRole === "media_center"
            ? "/media"
            : "/peserta";

        router.push(targetUrl);
        return;
      }

      if (error) {
        setErrorMsg(
          error.message === "Invalid login credentials"
            ? "Email atau kata sandi tidak cocok. Silakan periksa kembali."
            : error.message
        );
      }
    } catch {
      setErrorMsg("Terjadi kesalahan saat mencoba masuk. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Masuk ke Akun"
      subtitle="Gunakan akun terdaftar untuk mengakses dashboard operasional atau panel peserta."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-danger text-xs">
            {errorMsg}
          </div>
        )}

        <Input
          label="Alamat Email *"
          type="email"
          placeholder="nama@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="space-y-1">
          <Input
            label="Kata Sandi *"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="text-right">
            <Link
              href="/lupa-password"
              className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
            >
              Lupa kata sandi?
            </Link>
          </div>
        </div>

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
              <span>Masuk ke Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <div className="text-center pt-2 text-xs text-muted-foreground">
          Belum memiliki akun peserta?{" "}
          <Link href="/daftar" className="font-semibold text-foreground underline hover:text-accent">
            Daftar Akun Baru
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

// useSearchParams() harus dibungkus Suspense agar halaman bisa di-prerender saat build
export default function MasukPage() {
  return (
    <React.Suspense>
      <LoginForm />
    </React.Suspense>
  );
}
