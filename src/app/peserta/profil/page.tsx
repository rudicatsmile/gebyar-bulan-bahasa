"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PARTICIPANTS } from "@/lib/dummy-data";
import { User, Save, CheckCircle2 } from "lucide-react";

export default function PesertaProfilPage() {
  const p = PARTICIPANTS[0];
  const [fullName, setFullName] = React.useState(p.fullName);
  const [institution, setInstitution] = React.useState(p.institution);
  const [email, setEmail] = React.useState(p.email);
  const [phone, setPhone] = React.useState(p.phone);
  const [password, setPassword] = React.useState("");
  const [saved, setSaved] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <DashboardLayout role="peserta">
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

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-bold block">
                  Nomor Registrasi Peserta:
                </span>
                <span className="font-mono text-xl font-bold text-accent">
                  {p.registrationNumber}
                </span>
              </div>
              <Badge variant="success" className="text-xs">
                TERVERIFIKASI
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
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Nomor WhatsApp / Telepon *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <Input
              label="Ubah Kata Sandi Baru (Opsional)"
              type="password"
              placeholder="Kosongkan bila tidak ingin mengubah kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" size="lg" className="text-xs font-semibold gap-2">
              <Save className="h-4 w-4" />
              <span>Simpan Perubahan Profil</span>
            </Button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
