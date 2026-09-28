"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerUser } from "@/app/actions/auth";

export default function DaftarPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [institution, setInstitution] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Eksekusi pendaftaran via Server Action (auto-confirm & save ke profiles + participants)
      const res = await registerUser({
        fullName,
        institution,
        phone: phone || null,
        email,
        password,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Gagal melakukan pendaftaran. Silakan periksa data Anda.");
        setIsLoading(false);
        return;
      }

      setSuccessMsg(`Pendaftaran berhasil! Nomor Peserta Anda: ${res.registrationNumber}. Menghubungkan sesi...`);

      // 2. Langsung login otomatis via Supabase SSR client agar cookie sesi aktif di browser
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (loginError) {
        console.warn("Auto-login notice:", loginError.message);
        // Fallback jika signIn browser terhambat, arahkan ke login dengan pesan sukses
        router.push("/masuk?registered=true");
        return;
      }

      // 3. Alihkan langsung ke dashboard peserta
      router.push("/peserta");
    } catch (err: unknown) {
      console.error("Gagal submit pendaftaran:", err);
      const msg = err instanceof Error ? err.message : "Terjadi kendala jaringan saat mendaftar.";
      setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Daftar Akun Peserta"
      subtitle="Buat akun peserta resmi untuk mengikuti challenge festival, scan QR booth stand budaya, dan menukar poin reward."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-medium">{successMsg}</span>
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
          placeholder="Contoh: SMAN 1 Bandung / Univ. Indonesia"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          required
        />

        <Input
          label="Nomor WhatsApp / HP (Disarankan)"
          type="tel"
          placeholder="Contoh: 081234567890"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          helperText="Digunakan panitia untuk konfirmasi kegiatan dan penyerahan hadiah reward."
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
          helperText="Gunakan minimal 8 karakter dengan kombinasi huruf dan angka."
          required
        />

        <Button
          type="submit"
          size="lg"
          disabled={isLoading || !!successMsg}
          className="w-full text-xs font-semibold gap-2 cursor-pointer"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Memproses Akun Peserta...</span>
            </span>
          ) : (
            <>
              <span>Daftar Akun Sekarang</span>
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
