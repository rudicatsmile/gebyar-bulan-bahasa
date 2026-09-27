"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JUDGES, Judge, COMPETITIONS } from "@/lib/dummy-data";
import { UserCheck, UserPlus, ShieldCheck, Mail, Sliders } from "lucide-react";

export default function DashboardJuriPage() {
  const [judges, setJudges] = React.useState<Judge[]>(JUDGES);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Form states
  const [fullName, setFullName] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [expertise, setExpertise] = React.useState("Sastra & Puisi");

  const handleAddJudge = (e: React.FormEvent) => {
    e.preventDefault();
    const newJudge: Judge = {
      id: `judge-${Date.now()}`,
      fullName,
      title,
      email,
      expertise,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
      assignedCompetitionIds: ["comp-1"],
      isChiefJudge: false,
    };
    setJudges((prev) => [...prev, newJudge]);
    setDialogOpen(false);
    setFullName("");
    setTitle("");
    setEmail("");
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Manajemen Dewan Juri Lomba
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Daftar dewan juri ahli bersertifikasi, bidang keahlian, dan status penugasan penjurian 8 cabang lomba.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/juri/penugasan">
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                <span>Matriks Penugasan Juri</span>
              </Button>
            </Link>
            <Button onClick={() => setDialogOpen(true)} size="sm" className="text-xs gap-1.5 cursor-pointer">
              <UserPlus className="h-4 w-4" />
              <span>Tambah Juri Baru</span>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profil Dewan Juri</TableHead>
                <TableHead>Bidang Keahlian</TableHead>
                <TableHead>Kontak Email</TableHead>
                <TableHead className="text-center">Peran Penugasan</TableHead>
                <TableHead className="text-center">Lomba Ditugaskan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {judges.map((j) => {
                const assignedCount = j.assignedCompetitionIds.length;
                return (
                  <TableRow key={j.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={j.avatarUrl}
                          alt={j.fullName}
                          className="h-9 w-9 rounded-full object-cover border border-border shrink-0"
                        />
                        <div>
                          <strong className="text-foreground text-xs sm:text-sm block">
                            {j.fullName}
                          </strong>
                          <span className="text-[11px] text-muted-foreground">{j.title}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-foreground font-medium">
                      {j.expertise}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {j.email}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={j.isChiefJudge ? "gold" : "default"}
                        className="text-[10px]"
                      >
                        {j.isChiefJudge ? "JURI UTAMA" : "ANGGOTA JURI"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-bold text-accent">
                      {assignedCount} Cabang Lomba
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href="/dashboard/juri/penugasan">
                        <Button variant="outline" size="sm" className="text-xs h-8">
                          Atur Tugas
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Modal Tambah Juri */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <form onSubmit={handleAddJudge} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Buat Akun Dewan Juri Baru</DialogTitle>
              <DialogDescription>
                Masukkan biodata, bidang keahlian, dan alamat email aktif untuk pembuatan akun penilai digital.
              </DialogDescription>
            </DialogHeader>

            <Input
              label="Nama Lengkap Beserta Gelar *"
              placeholder="Contoh: Dr. Siti Nurhaliza M.Pd."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Jabatan / Instansi / Portofolio *"
              placeholder="Contoh: Dosen Sastra Indonesia Universitas Negeri"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Input
              label="Alamat Email Akun *"
              type="email"
              placeholder="juri@instansi.ac.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Bidang Keahlian Penilaian *
              </label>
              <select
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
              >
                <option value="Sastra & Puisi">Sastra & Puisi</option>
                <option value="Sinematografi & Film">Sinematografi & Film</option>
                <option value="Public Speaking & MC">Public Speaking & MC</option>
                <option value="Seni Rupa & Kriya">Seni Rupa & Kriya</option>
                <option value="Teater & Monolog">Teater & Monolog</option>
                <option value="Tradisi Betawi & Palang Pintu">Tradisi Betawi & Palang Pintu</option>
                <option value="Musik & Vokal">Musik & Vokal</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Buat Akun Juri</Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
