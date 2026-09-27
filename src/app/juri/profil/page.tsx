"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { JUDGES } from "@/lib/dummy-data";
import { User, Save, CheckCircle2, ShieldCheck } from "lucide-react";

export default function JuriProfilPage() {
  const judge = JUDGES[0];
  const [fullName, setFullName] = React.useState(judge.fullName);
  const [title, setTitle] = React.useState(judge.title);
  const [email, setEmail] = React.useState(judge.email);
  const [password, setPassword] = React.useState("");
  const [saved, setSaved] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <DashboardLayout role="juri">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <User className="h-7 w-7 text-accent" />
            <span>Profil Anggota Dewan Juri</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola data diri, kredensial akun penilai, dan bidang kepakaran sastra/seni.
          </p>
        </div>

        {saved && (
          <div className="p-4 rounded-xl border border-success/40 bg-success/10 text-success text-xs flex items-center gap-2 animate-in fade-in-50">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Profil dewan juri berhasil diperbarui!</span>
          </div>
        )}

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <img
                src={judge.avatarUrl}
                alt={judge.fullName}
                className="h-16 w-16 rounded-full object-cover border-2 border-accent"
              />
              <div>
                <span className="text-[10px] font-mono text-accent uppercase font-bold block">
                  Kepakaran: {judge.expertise}
                </span>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  {judge.fullName}
                </h3>
                <p className="text-xs text-muted-foreground">{judge.email}</p>
              </div>
            </div>

            <Input
              label="Nama Lengkap Beserta Gelar *"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Jabatan Akademik / Portofolio Keahlian *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Input
              label="Alamat Email Akun *"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

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
