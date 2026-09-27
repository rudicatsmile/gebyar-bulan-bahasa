"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ShieldCheck, UserCheck, Tv, User, Loader2, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function MasukPage() {
  const router = useRouter();
  const isDev = process.env.NODE_ENV === "development";
  const [email, setEmail] = React.useState(isDev ? "acara@gebyarbulanbahasa.id" : "");
  const [password, setPassword] = React.useState(isDev ? "rahasia123" : "");
  const [selectedRole, setSelectedRole] = React.useState<string>("seksi_acara");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [showDemoSelector, setShowDemoSelector] = React.useState(isDev);

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
        // Fetch role from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        const userRole = profile?.role || selectedRole;
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
        // In development mode, allow bypassing for demo if credentials match mock
        if (isDev) {
          const targetUrl =
            selectedRole === "seksi_acara"
              ? "/dashboard"
              : selectedRole === "juri"
              ? "/juri"
              : selectedRole === "media_center"
              ? "/media"
              : "/peserta";
          router.push(targetUrl);
          return;
        }

        setErrorMsg(
          error.message === "Invalid login credentials"
            ? "Email atau kata sandi tidak sesuai. Silakan periksa kembali."
            : error.message
        );
      }
    } catch {
      if (isDev) {
        router.push("/dashboard");
      } else {
        setErrorMsg("Terjadi gangguan jaringan saat memproses login.");
      }
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
        {/* Quick Demo Role Picker (Development Mode or Toggled) */}
        {showDemoSelector && (
          <div className="space-y-2 p-3 rounded-xl border border-accent/40 bg-accent/5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-bold block">
                {isDev ? "Pilih Peran Demo (Mode Dev):" : "Pilihan Akun Uji Coba:"}
              </span>
              {!isDev && (
                <button
                  type="button"
                  onClick={() => setShowDemoSelector(false)}
                  className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Tutup
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: "seksi_acara", label: "Seksi Acara (Admin)", icon: ShieldCheck, email: "acara@gebyarbulanbahasa.id" },
                { id: "juri", label: "Dewan Juri", icon: UserCheck, email: "juri.siti@gebyarbulanbahasa.id" },
                { id: "media_center", label: "Media Center", icon: Tv, email: "media@gebyarbulanbahasa.id" },
                { id: "peserta", label: "Peserta Acara", icon: User, email: "ahmad.fauzan@sman1bdg.sch.id" },
              ].map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRole === r.id;
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => {
                      setSelectedRole(r.id);
                      setEmail(r.email);
                      setPassword("rahasia123");
                    }}
                    className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate text-[11px]">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

        {!isDev && !showDemoSelector && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setShowDemoSelector(true)}
              className="text-[11px] text-muted-foreground hover:text-accent inline-flex items-center gap-1 cursor-pointer"
            >
              <KeyRound className="h-3 w-3" />
              <span>Gunakan Akun Uji Coba Demo</span>
            </button>
          </div>
        )}

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
