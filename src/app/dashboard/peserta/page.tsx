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
import type { Participant } from "@/lib/dummy-data";
import {
  Users,
  Search,
  Download,
  FileCheck,
  Eye,
  RotateCcw,
  Loader2,
  ArrowRightLeft,
  UserPlus,
  FileSpreadsheet,
  Trophy,
} from "lucide-react";
import { PindahLombaModal, ParticipantTransferTarget } from "@/components/dashboard/PindahLombaModal";
import { VerifikasiPesertaModal, ParticipantVerificationTarget } from "@/components/dashboard/VerifikasiPesertaModal";
import { DaftarPesertaLombaModal } from "@/components/dashboard/DaftarPesertaLombaModal";
import { ImportPesertaLombaModal } from "@/components/dashboard/ImportPesertaLombaModal";
import { downloadParticipantsExcel } from "@/lib/excel-participant-export";

export default function DashboardPesertaPage() {
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMounted, setIsMounted] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("semua");

  const [transferTarget, setTransferTarget] = React.useState<ParticipantTransferTarget | null>(null);
  const [transferOpen, setTransferOpen] = React.useState(false);

  const [verificationTarget, setVerificationTarget] = React.useState<ParticipantVerificationTarget | null>(null);
  const [verificationOpen, setVerificationOpen] = React.useState(false);

  // Modal Pendaftaran Lomba Manual & Import Excel
  const [daftarLombaOpen, setDaftarLombaOpen] = React.useState(false);
  const [daftarLombaTarget, setDaftarLombaTarget] = React.useState<{
    id: string;
    fullName: string;
    institution: string;
    registrationNumber?: string;
  } | null>(null);
  const [importExcelOpen, setImportExcelOpen] = React.useState(false);
  const [isExportingExcel, setIsExportingExcel] = React.useState(false);

  const fetchParticipants = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/participants", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.participants)) {
          setParticipants(data.participants);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data peserta dari API:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const handleOpenTransfer = (p: Participant) => {
    setTransferTarget({
      id: p.id,
      fullName: p.fullName,
      competitionId: p.competitionId,
      competitionName: p.competitionName,
      registrationId: p.registrationId,
      documentsCount: p.documents?.length || 0,
    });
    setTransferOpen(true);
  };

  const handleOpenVerification = (p: Participant) => {
    setVerificationTarget({
      id: p.id,
      registrationId: p.registrationId,
      fullName: p.fullName,
      registrationNumber: p.registrationNumber,
      institution: p.institution,
      email: p.email,
      phone: p.phone,
      competitionId: p.competitionId,
      competitionName: p.competitionName,
      category: p.category,
      teamName: p.teamName,
      teamMembers: p.teamMembers,
      status: p.status,
      rejectionReason: p.rejectionReason,
      documents: p.documents,
    });
    setVerificationOpen(true);
  };

  const filtered = participants.filter((p) => {
    const matchSearch =
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.institution.toLowerCase().includes(search.toLowerCase()) ||
      p.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
      (p.competitionName && p.competitionName.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "semua" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = participants.filter((p) => p.status === "menunggu_verifikasi").length;

  const handleExportExcel = () => {
    if (filtered.length === 0) return;
    try {
      setIsExportingExcel(true);
      downloadParticipantsExcel(filtered, {
        statusFilter,
        searchQuery: search.trim() || undefined,
      });
    } catch (err) {
      console.error("Gagal mendownload file Excel data peserta:", err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportCSV = () => {
    const headers = "Nomor Registrasi,Nama Lengkap,Asal Instansi,Cabang Lomba,Status,Poin\n";
    const rows = filtered
      .map(
        (p) =>
          `"${p.registrationNumber}","${p.fullName}","${p.institution}","${p.competitionName || '-'}","${p.status}","${p.totalPoints}"`
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

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchParticipants}
              disabled={isMounted ? isLoading : false}
              suppressHydrationWarning
              className="text-xs gap-1.5 cursor-pointer"
              title="Segarkan data"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isMounted && isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              size="sm"
              variant="accent"
              onClick={() => {
                setDaftarLombaTarget(null);
                setDaftarLombaOpen(true);
              }}
              className="text-xs gap-1.5 cursor-pointer shadow-xs font-semibold"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Daftarkan ke Lomba</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImportExcelOpen(true)}
              className="text-xs gap-1.5 cursor-pointer border-accent/40 text-foreground hover:bg-accent/10 font-semibold"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-accent" />
              <span>Import Excel</span>
            </Button>
            <Link href="/dashboard/peserta/verifikasi">
              <Button size="sm" variant="outline" className="text-xs gap-1.5" suppressHydrationWarning>
                <FileCheck className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Antrean ({isMounted ? pendingCount : 0})</span>
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportExcel}
              disabled={isMounted ? (isLoading || isExportingExcel || filtered.length === 0) : false}
              className="text-xs gap-1.5 cursor-pointer border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold shadow-xs"
              title="Download data peserta ke format Excel (.xlsx)"
            >
              {isExportingExcel ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>Download Excel</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              disabled={isMounted ? (isLoading || filtered.length === 0) : false}
              className="text-xs gap-1.5 cursor-pointer"
              title="Download data peserta ke format CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 w-full sm:w-80">
            <Search className="h-4 w-4 text-muted-foreground ml-1" />
            <input
              type="text"
              placeholder="Cari nama, nomor registrasi, instansi, cabang lomba..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-muted-foreground font-semibold">Filter:</span>
            {["semua", "terverifikasi", "menunggu_verifikasi", "ditolak"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${
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

        {/* Daftar mobile (card list) */}
        <div className="md:hidden space-y-3">
          {isLoading && participants.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-accent" />
              <p className="text-xs">Memuat daftar peserta...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">Tidak ada data peserta</p>
              <p className="text-xs">Tidak ditemukan peserta dengan kriteria pencarian & filter yang dipilih.</p>
            </div>
          ) : (
            filtered.map((p) => {
              const statusVariant =
                p.status === "terverifikasi"
                  ? "success"
                  : p.status === "menunggu_verifikasi"
                  ? "warning"
                  : "danger";
              return (
                <div key={p.id} className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{p.fullName}</p>
                      <p className="font-mono text-[11px] font-bold text-accent">{p.registrationNumber}</p>
                    </div>
                    <Badge variant={statusVariant} className="text-[10px] shrink-0">
                      {p.status.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                  </div>
                  {p.teamName && (
                    <p className="text-[11px] text-muted-foreground">Tim: {p.teamName}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{p.institution}</p>
                  <p className="text-xs text-foreground font-medium">{p.competitionName || "Belum Memilih Lomba"}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <span className="font-mono text-xs font-bold text-accent">{p.totalPoints} Pts</span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {p.status === "menunggu_verifikasi" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                          onClick={() => handleOpenVerification(p)}
                          title="Verifikasi berkas & pendaftaran"
                        >
                          <FileCheck className="h-3 w-3" />
                          <span>Verifikasi</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 gap-1 border-accent/40 text-accent hover:bg-accent/10 cursor-pointer"
                        onClick={() => {
                          setDaftarLombaTarget({
                            id: p.id,
                            fullName: p.fullName,
                            institution: p.institution,
                            registrationNumber: p.registrationNumber,
                          });
                          setDaftarLombaOpen(true);
                        }}
                        title="Daftarkan peserta ke cabang lomba"
                      >
                        <Trophy className="h-3 w-3" />
                        <span>Daftar Lomba</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                        onClick={() => handleOpenTransfer(p)}
                        title="Pindah Cabang Lomba"
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        <span>Pindah</span>
                      </Button>
                      <Link href={`/dashboard/peserta/${p.id}`}>
                        <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
                          <Eye className="h-3 w-3" />
                          <span>Detail</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Tabel Peserta (desktop) */}
        <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
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
              {isLoading && participants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-accent" />
                    <p className="text-xs">Memuat daftar peserta...</p>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm font-semibold">Tidak ada data peserta</p>
                    <p className="text-xs text-muted-foreground">
                      Tidak ditemukan peserta dengan kriteria pencarian & filter yang dipilih.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
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
                        {p.competitionName || "Belum Memilih Lomba"}
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
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === "menunggu_verifikasi" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                              onClick={() => handleOpenVerification(p)}
                              title="Verifikasi berkas & pendaftaran"
                            >
                              <FileCheck className="h-3.5 w-3.5" />
                              <span className="font-semibold">Verifikasi</span>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 gap-1 border-accent/40 text-accent hover:bg-accent/10 cursor-pointer"
                            onClick={() => {
                              setDaftarLombaTarget({
                                id: p.id,
                                fullName: p.fullName,
                                institution: p.institution,
                                registrationNumber: p.registrationNumber,
                              });
                              setDaftarLombaOpen(true);
                            }}
                            title="Daftarkan ke cabang lomba"
                          >
                            <Trophy className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Daftar Lomba</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                            onClick={() => handleOpenTransfer(p)}
                            title="Pindah ke lomba lain"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Pindah Lomba</span>
                          </Button>
                          <Link href={`/dashboard/peserta/${p.id}`}>
                            <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
                              <Eye className="h-3 w-3" />
                              <span>Detail</span>
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Modal Pindah Lomba */}
        <PindahLombaModal
          open={transferOpen}
          onOpenChange={setTransferOpen}
          participant={transferTarget}
          onSuccess={fetchParticipants}
        />

        {/* Modal Verifikasi Berkas & Pendaftaran */}
        <VerifikasiPesertaModal
          open={verificationOpen}
          onOpenChange={setVerificationOpen}
          participant={verificationTarget}
          onSuccess={fetchParticipants}
        />

        {/* Modal Pendaftaran Peserta ke Lomba Manual oleh Admin */}
        <DaftarPesertaLombaModal
          open={daftarLombaOpen}
          onOpenChange={setDaftarLombaOpen}
          initialParticipant={daftarLombaTarget}
          onSuccess={fetchParticipants}
        />

        {/* Modal Import Peserta ke Lomba via Excel */}
        <ImportPesertaLombaModal
          open={importExcelOpen}
          onOpenChange={setImportExcelOpen}
          onSuccess={fetchParticipants}
        />
      </div>
    </DashboardLayout>
  );
}
