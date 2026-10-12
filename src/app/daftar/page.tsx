"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowRight, Loader2, CheckCircle2, AlertCircle, Lock, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerUser } from "@/app/actions/auth";
import { getActiveInstitutions, type InstitutionItem } from "@/app/actions/institutions";
import { getParticipantAccessStatus, type ParticipantAccessStatus } from "@/app/actions/settings";

function DaftarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Slug lomba yang dibawa dari halaman detail (/daftar?lomba=membaca-puisi)
  const lombaParam = searchParams.get("lomba");
  const [fullName, setFullName] = React.useState("");
  const [institution, setInstitution] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const [institutions, setInstitutions] = React.useState<InstitutionItem[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = React.useState(true);
  const [accessStatus, setAccessStatus] = React.useState<ParticipantAccessStatus | null>(null);
  const [checkingAccess, setCheckingAccess] = React.useState(true);

  React.useEffect(() => {
    getActiveInstitutions().then((res) => {
      if (res.success && res.institutions.length > 0) {
        setInstitutions(res.institutions);
      }
      setLoadingInstitutions(false);
    });

    getParticipantAccessStatus()
      .then((status) => {
        setAccessStatus(status);
      })
      .finally(() => {
        setCheckingAccess(false);
      });
  }, []);

  const isAccessLocked = Boolean(accessStatus && !accessStatus.isOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAccessLocked) {
      setErrorMsg(
        `Pendaftaran peserta belum dibuka. Akses akan dibuka pada ${accessStatus?.formattedStartDate || "jadwal yang ditentukan"}.`
      );
      return;
    }

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
      // Bersihkan kemungkinan residu sesi lama
      await supabase.auth.signOut().catch(() => { });

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

      // 3. Alihkan ke dashboard peserta; bila ada konteks lomba, lanjutkan ke formulir
      //    pendaftaran lomba agar alur "klik Daftar Sekarang" tidak berakhir buntu.
      window.location.href = lombaParam
        ? `/peserta/pendaftaran?lomba=${encodeURIComponent(lombaParam)}&auto=1`
        : "/peserta";
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
        {/* Banner Kunci Pendaftaran Berdasarkan Tanggal Admin */}
        {isAccessLocked && (
          <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Lock className="h-4 w-4" />
              <span>Pendaftaran Belum Dibuka</span>
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              Mohon maaf, pendaftaran akun peserta Gebyar Bulan Bahasa baru akan dibuka pada:
            </p>
            <div className="p-3 rounded-lg bg-card border border-border flex items-center gap-2.5 font-semibold text-xs text-accent shadow-xs">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{accessStatus?.formattedStartDate}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Silakan kembali lagi pada tanggal dan waktu tersebut untuk mendaftarkan akun peserta.
            </p>
          </div>
        )}

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
          disabled={isAccessLocked || isLoading}
          required
        />

        <Select
          label="Asal Sekolah / Kampus / Instansi *"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          disabled={isAccessLocked || isLoading}
          required
          helperText="Pilih nama sekolah, kampus, atau instansi Anda dari daftar resmi."
        >
          <option value="">
            {loadingInstitutions
              ? "-- Memuat daftar instansi... --"
              : "-- Pilih Asal Sekolah / Kampus / Instansi --"}
          </option>
          {institutions.map((inst) => (
            <option key={inst.id} value={inst.name}>
              {inst.name}
            </option>
          ))}
        </Select>

        <Input
          label="Nomor WhatsApp / HP (Disarankan)"
          type="tel"
          placeholder="Contoh: 081234567890"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isAccessLocked || isLoading}
          helperText="Digunakan panitia untuk konfirmasi kegiatan dan penyerahan hadiah reward."
        />

        <Input
          label="Alamat Email *"
          type="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isAccessLocked || isLoading}
          required
        />

        <Input
          label="Kata Sandi (Minimal 8 Karakter) *"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isAccessLocked || isLoading}
          helperText="Gunakan minimal 8 karakter dengan kombinasi huruf dan angka."
          required
        />

        {isAccessLocked ? (
          <Button
            type="button"
            size="lg"
            disabled
            className="w-full text-xs font-semibold gap-2 opacity-60 cursor-not-allowed"
          >
            <Lock className="h-4 w-4" />
            <span>Pendaftaran Dibuka {accessStatus?.formattedStartDate}</span>
          </Button>
        ) : (
          <Button
            type="submit"
            size="lg"
            disabled={isLoading || !!successMsg || checkingAccess}
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
        )}

        <div className="text-center pt-2 text-xs text-muted-foreground">
          {isAccessLocked ? "Sudah memiliki akun panitia atau juri? " : "Sudah memiliki akun terdaftar? "}
          <Link href="/masuk" className="font-semibold text-foreground underline hover:text-accent">
            Masuk di Sini
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

// useSearchParams() harus dibungkus Suspense agar halaman bisa di-prerender saat build
export default function DaftarPage() {
  return (
    <React.Suspense>
      <DaftarForm />
    </React.Suspense>
  );
}

