"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import { updateParticipantProfile } from "@/app/actions/auth";
import { User, Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function PesertaProfilPage() {
  const { participant, loading, refetch } = useCurrentParticipant();

  const [fullName, setFullName] = React.useState("");
  const [institution, setInstitution] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Sync state when participant data loads
  React.useEffect(() => {
    if (participant) {
      setFullName(participant.fullName || "");
      setInstitution(participant.institution || "");
      setEmail(participant.email || "");
      setPhone(participant.phone || "");
    }
  }, [participant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participant) return;

    setSaving(true);
    setErrorMsg(null);
    setSaved(false);

    try {
      if (participant.userId) {
        const res = await updateParticipantProfile({
          userId: participant.userId,
          fullName,
          institution,
          phone,
          password: password.trim() ? password : null,
        });

        if (!res.success) {
          setErrorMsg(res.error || "Gagal memperbarui profil.");
          setSaving(false);
          return;
        }
      }

      await refetch();
      setSaved(true);
      setPassword("");
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      console.error("Gagal simpan profil:", err);
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kendala saat menyimpan profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout role="peserta" participantPoints={participant?.totalPoints}>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <User className="h-7 w-7 text-accent" />
            <span>Profil Akun Peserta</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola data biodata diri, instansi sekolah/kampus, dan nomor telepon kontak Anda.
          </p>
        </div>

        {saved && (
          <div className="p-4 rounded-xl border border-success/40 bg-success/10 text-success text-xs flex items-center gap-2 animate-in fade-in-50">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Perubahan data profil peserta berhasil disimpan!</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-center gap-2 animate-in fade-in-50">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <Card className="p-6 sm:p-8">
          {loading && !participant ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <p className="text-xs">Memuat profil akun peserta...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-bold block">
                    Nomor Registrasi Peserta:
                  </span>
                  <span className="font-mono text-xl font-bold text-accent">
                    {participant?.registrationNumber || "-"}
                  </span>
                </div>
                <Badge
                  variant={
                    participant?.status === "ditolak"
                      ? "danger"
                      : participant?.status === "menunggu_verifikasi"
                      ? "warning"
                      : "success"
                  }
                  className="text-xs uppercase"
                >
                  {participant?.status || "TERVERIFIKASI"}
                </Badge>
              </div>

              <Input
                label="Nama Lengkap Peserta *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                label="Asal Sekolah / Universitas / Sanggar *"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Alamat Email Akun *"
                  type="email"
                  value={email}
                  disabled
                  className="opacity-70 cursor-not-allowed bg-muted/40"
                  required
                />

                <Input
                  label="Nomor WhatsApp / Telepon *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                />
              </div>

              <Input
                label="Ubah Kata Sandi Baru (Opsional)"
                type="password"
                placeholder="Kosongkan bila tidak ingin mengubah kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button
                type="submit"
                size="lg"
                disabled={saving}
                className="text-xs font-semibold gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menyimpan Perubahan...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Simpan Perubahan Profil</span>
                  </>
                )}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
