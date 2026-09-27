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
import { PARTICIPANTS, COMPETITIONS } from "@/lib/dummy-data";
import { Users, UserPlus, Trophy, CheckCircle, ShieldCheck } from "lucide-react";

export default function DashboardPendaftaranPage() {
  const [participants, setParticipants] = React.useState(PARTICIPANTS);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedComp, setSelectedComp] = React.useState("comp-2"); // Film Pendek
  const [teamName, setTeamName] = React.useState("");
  const [leaderName, setLeaderName] = React.useState("");
  const [institution, setInstitution] = React.useState("");
  const [memberNames, setMemberNames] = React.useState("");

  const handleRegisterTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const members = memberNames.split("\n").filter((m) => m.trim().length > 0);
    const matchedComp = COMPETITIONS.find((c) => c.id === selectedComp);

    const newTeamEntry = {
      id: `part-${Date.now()}`,
      registrationNumber: `GBB-${matchedComp?.shortName.substring(0, 3).toUpperCase()}-999`,
      fullName: leaderName,
      institution,
      email: "tim.baru@sekolah.sch.id",
      phone: "081234567899",
      competitionId: selectedComp,
      competitionName: matchedComp?.name || "",
      category: matchedComp?.category || "kelompok",
      teamName,
      teamMembers: [leaderName + " (Ketua)", ...members],
      status: "menunggu_verifikasi" as const,
      totalPoints: 0,
      registeredAt: "Baru saja",
      documents: [],
    };

    setParticipants((prev) => [newTeamEntry, ...prev]);
    setDialogOpen(false);
    setTeamName("");
    setLeaderName("");
    setInstitution("");
    setMemberNames("");
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Pendaftaran Lomba & Kelola Rombongan Tim
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Kelola struktur anggota tim untuk cabang lomba beregu (Film Pendek, Vokal Grup, Palang Pintu Betawi).
            </p>
          </div>

          <Button onClick={() => setDialogOpen(true)} size="sm" className="text-xs gap-1.5 cursor-pointer">
            <UserPlus className="h-4 w-4" />
            <span>Daftarkan Tim Baru</span>
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">No. Registrasi</TableHead>
                <TableHead>Nama Tim & Ketua</TableHead>
                <TableHead>Cabang Lomba</TableHead>
                <TableHead>Sekolah / Sanggar</TableHead>
                <TableHead>Daftar Anggota Tim</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants
                .filter((p) => p.category === "kelompok")
                .map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-bold text-accent">
                      {p.registrationNumber}
                    </TableCell>
                    <TableCell>
                      <strong className="text-foreground text-xs sm:text-sm block">
                        {p.teamName || p.fullName}
                      </strong>
                      <span className="text-[11px] text-muted-foreground">Ketua: {p.fullName}</span>
                    </TableCell>
                    <TableCell className="text-xs text-foreground font-medium">
                      {p.competitionName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.institution}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex flex-wrap gap-1">
                        {p.teamMembers?.map((m, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] text-foreground font-medium"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={p.status === "terverifikasi" ? "success" : "warning"}
                        className="text-[10px]"
                      >
                        {p.status.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {/* Modal Tambah Tim Baru */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <form onSubmit={handleRegisterTeam} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Daftarkan Rombongan / Tim Lomba</DialogTitle>
              <DialogDescription>
                Masukkan nama tim, ketua, instansi, dan anggota rombongan lomba beregu.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pilih Cabang Lomba Beregu *
              </label>
              <select
                value={selectedComp}
                onChange={(e) => setSelectedComp(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
              >
                {COMPETITIONS.filter((c) => c.category === "kelompok").map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Min. {c.minMembers} - Maks. {c.maxMembers} Orang)
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Nama Tim / Rombongan *"
              placeholder="Contoh: Sanggar Sinema Mahameru"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            />

            <Input
              label="Nama Ketua Tim *"
              placeholder="Nama Lengkap Ketua Tim"
              value={leaderName}
              onChange={(e) => setLeaderName(e.target.value)}
              required
            />

            <Input
              label="Asal Sekolah / Universitas / Sanggar *"
              placeholder="Contoh: Universitas Indonesia"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              required
            />

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nama Anggota Lain (1 nama per baris) *
              </label>
              <textarea
                rows={3}
                placeholder="Fikri Haikal (Kameramen)&#10;Annisa Rizky (Editor)"
                value={memberNames}
                onChange={(e) => setMemberNames(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none"
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Daftarkan Tim</Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
