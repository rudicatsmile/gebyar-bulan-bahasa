"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PARTICIPANTS, Participant } from "@/lib/dummy-data";
import { Users, Search, Download, FileCheck, Eye, Plus } from "lucide-react";

export default function DashboardPesertaPage() {
  const [participants, setParticipants] = React.useState<Participant[]>(PARTICIPANTS);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("semua");

  const filtered = participants.filter((p) => {
    const matchSearch =
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.institution.toLowerCase().includes(search.toLowerCase()) ||
      p.registrationNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "semua" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleExportCSV = () => {
    const headers = "Nomor Registrasi,Nama Lengkap,Asal Instansi,Cabang Lomba,Status,Poin\n";
    const rows = filtered
      .map(
        (p) =>
          `"${p.registrationNumber}","${p.fullName}","${p.institution}","${p.competitionName}","${p.status}","${p.totalPoints}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data_peserta_gebyarbulanbahasa.csv";
    a.click();
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Manajemen Data Peserta Lomba
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Kelola daftar registrasi peserta, status verifikasi berkas, dan nomor urut tampil.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/peserta/verifikasi">
              <Button size="sm" variant="accent" className="text-xs gap-1.5">
                <FileCheck className="h-3.5 w-3.5" />
                <span>Antrean Verifikasi (1)</span>
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="text-xs gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Ekspor CSV</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 w-full sm:w-80">
            <Search className="h-4 w-4 text-muted-foreground ml-1" />
            <input
              type="text"
              placeholder="Cari nama, nomor registrasi, instansi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-muted-foreground font-semibold">Filter:</span>
            {["semua", "terverifikasi", "menunggu_verifikasi", "ditolak"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  statusFilter === st
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {st.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Tabel Peserta */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">No. Registrasi</TableHead>
                <TableHead>Nama Peserta / Tim</TableHead>
                <TableHead>Sekolah / Kampus</TableHead>
                <TableHead>Cabang Lomba</TableHead>
                <TableHead className="text-center">Status Berkas</TableHead>
                <TableHead className="text-center">Poin Pameran</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const statusVariant =
                  p.status === "terverifikasi"
                    ? "success"
                    : p.status === "menunggu_verifikasi"
                    ? "warning"
                    : "danger";

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-bold text-accent">
                      {p.registrationNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground text-xs sm:text-sm">
                        {p.fullName}
                      </div>
                      {p.teamName && (
                        <span className="text-[11px] text-muted-foreground">
                          Tim: {p.teamName}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.institution}
                    </TableCell>
                    <TableCell className="text-xs text-foreground font-medium">
                      {p.competitionName}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusVariant} className="text-[10px]">
                        {p.status.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-bold text-accent">
                      {p.totalPoints} Pts
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/peserta/${p.id}`}>
                        <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
                          <Eye className="h-3 w-3" />
                          <span>Detail</span>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
