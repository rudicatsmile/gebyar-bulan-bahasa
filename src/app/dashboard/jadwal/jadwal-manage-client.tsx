"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScheduleItem, Competition } from "@/lib/dummy-data";
import { setScheduleStatus, upsertSchedule } from "@/app/actions/schedules";
import { Plus, Radio, AlertCircle, Trophy, Pencil } from "lucide-react";

interface JadwalManageClientProps {
  initialSchedules: ScheduleItem[];
  competitions: Competition[];
}

export function JadwalManageClient({
  initialSchedules,
  competitions = [],
}: JadwalManageClientProps) {
  const [schedules, setSchedules] = React.useState<ScheduleItem[]>(initialSchedules);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [conflictWarning, setConflictWarning] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form states
  const [editingScheduleId, setEditingScheduleId] = React.useState<string | null>(null);
  const [selectedCompId, setSelectedCompId] = React.useState<string>("");
  const [title, setTitle] = React.useState("");
  const [day, setDay] = React.useState("2");
  const [time, setTime] = React.useState("09:00 - 12:00 WIB");
  const [venue, setVenue] = React.useState("Panggung Utama");
  const [stage, setStage] = React.useState("Stage A");
  const [host, setHost] = React.useState("");

  const handleOpenAdd = () => {
    setEditingScheduleId(null);
    setSelectedCompId("");
    setTitle("");
    setDay("2");
    setTime("09:00 - 12:00 WIB");
    setVenue("Panggung Utama");
    setStage("Stage A");
    setHost("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (sch: ScheduleItem) => {
    setEditingScheduleId(sch.id);
    const matchedComp = competitions.find(
      (c) => c.id === sch.competitionId || (sch.competitionId && c.slug === sch.competitionId)
    );
    setSelectedCompId(matchedComp?.id || sch.competitionId || "");
    setTitle(sch.title);
    setDay(String(sch.day || 1));
    setTime(sch.time || "09:00 - 12:00 WIB");
    setVenue(sch.venue || "Panggung Utama");
    setStage(sch.stage || "Stage A");
    setHost(sch.host || "");
    setDialogOpen(true);
  };

  const handleCompetitionChange = (compVal: string) => {
    setSelectedCompId(compVal);
    if (!compVal) return;

    const foundComp = competitions.find(
      (c) => c.id === compVal || c.slug === compVal
    );
    if (foundComp) {
      // Auto-suggest judul agenda jika masih kosong atau berisi default format "Lomba..."
      if (!title || title.startsWith("Lomba ") || title.includes("Cabang Lomba")) {
        setTitle(`Lomba ${foundComp.name}`);
      }
      if (foundComp.venue) setVenue(foundComp.venue);
      if (foundComp.stage) setStage(foundComp.stage);
    }
  };

  const handleSetLive = async (id: string) => {
    const target = schedules.find((s) => s.id === id);
    if (!target) return;

    // Check conflict locally: Hanya satu jadwal boleh 'berlangsung' pada panggung/venue yang sama
    const conflict = schedules.find(
      (s) =>
        s.id !== id &&
        s.venue === target.venue &&
        s.stage === target.stage &&
        s.status === "berlangsung"
    );

    if (conflict) {
      setConflictWarning(
        `Perhatian: Panggung ${target.venue} (${target.stage}) sudah memiliki acara aktif ("${conflict.title}"). Status acara tersebut dialihkan menjadi Selesai di database.`
      );
    } else {
      setConflictWarning("");
    }

    // Optimistic UI update
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id === id) return { ...s, status: "berlangsung" };
        if (s.venue === target.venue && s.stage === target.stage && s.status === "berlangsung") {
          return { ...s, status: "selesai" };
        }
        return s;
      })
    );

    // Supabase server action
    try {
      await setScheduleStatus(id, "berlangsung");
    } catch (err) {
      console.error("Gagal update status jadwal:", err);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const eventDate =
      day === "1" ? "2025-10-26" : day === "2" ? "2025-10-27" : "2025-10-28";
    const startTimeParts = time.split("-")[0]?.trim() || "09:00";
    const endTimeParts = time.split("-")[1]?.replace("WIB", "").trim() || "12:00";
    const compIdPayload = selectedCompId || null;

    const newItem: ScheduleItem = {
      id: editingScheduleId || `sch-${Date.now()}`,
      competitionId: compIdPayload || undefined,
      title,
      day: parseInt(day),
      date: day === "1" ? "26 Oktober 2025" : day === "2" ? "27 Oktober 2025" : "28 Oktober 2025",
      time,
      venue,
      stage,
      host: host || "Panitia Acara",
      status: "terjadwal",
    };

    if (editingScheduleId) {
      setSchedules((prev) =>
        prev.map((s) => (s.id === editingScheduleId ? newItem : s))
      );
    } else {
      setSchedules((prev) => [newItem, ...prev]);
    }

    try {
      await upsertSchedule({
        id: editingScheduleId || undefined,
        competitionId: compIdPayload,
        title,
        eventDay: parseInt(day),
        eventDate,
        startTime: startTimeParts,
        endTime: endTimeParts,
        venue,
        stage,
        hostName: host,
        status: "terjadwal",
      });
    } catch (err) {
      console.error("Gagal simpan jadwal:", err);
    } finally {
      setIsSubmitting(false);
      setDialogOpen(false);
      setEditingScheduleId(null);
      setSelectedCompId("");
      setTitle("");
      setTime("09:00 - 12:00 WIB");
      setHost("");
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Manajemen Jadwal & Panggung
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Atur status pelaksanaan panggung dan hubungkan agenda dengan cabang lomba. Jadwal terintegrasi otomatis ke monitor TV dan jadwal publik.
            </p>
          </div>

          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="text-xs gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Jadwal Baru</span>
          </Button>
        </div>

        {conflictWarning && (
          <div className="p-3.5 rounded-lg border border-accent/40 bg-accent/10 text-accent-foreground text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-accent" />
            <span>{conflictWarning}</span>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hari & Jam</TableHead>
                <TableHead>Agenda & Cabang Lomba</TableHead>
                <TableHead>Lokasi & Panggung</TableHead>
                <TableHead>Pemandu Acara</TableHead>
                <TableHead className="text-center">Status Panggung</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((sch) => {
                const isLive = sch.status === "berlangsung";
                const matchedComp = competitions.find(
                  (c) =>
                    c.id === sch.competitionId ||
                    (sch.competitionId && c.slug === sch.competitionId) ||
                    sch.title.toLowerCase().includes(c.shortName.toLowerCase())
                );

                return (
                  <TableRow key={sch.id} className={isLive ? "bg-danger/5" : ""}>
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-foreground block">
                        Hari ke-{sch.day}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {sch.time}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className="font-semibold text-foreground text-xs sm:text-sm block">
                          {sch.title}
                        </span>
                        {matchedComp ? (
                          <Link
                            href={`/dashboard/lomba/${matchedComp.slug}`}
                            className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline font-mono"
                            title="Buka monitoring cabang lomba ini"
                          >
                            <Trophy className="h-3 w-3" />
                            <span>
                              {matchedComp.name} (
                              {matchedComp.category === "kelompok" ? "Kelompok" : "Individu"})
                            </span>
                          </Link>
                        ) : (
                          <span className="inline-block text-[10px] text-muted-foreground font-mono">
                            Acara Umum (Non-Lomba)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <strong className="text-foreground">{sch.venue}</strong>
                      <span className="block text-[11px]">{sch.stage}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sch.host || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          sch.status === "berlangsung"
                            ? "live"
                            : sch.status === "selesai"
                            ? "success"
                            : "default"
                        }
                        className="text-[10px]"
                      >
                        {sch.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(sch)}
                          className="text-[11px] h-7 gap-1 px-2 cursor-pointer"
                          title="Ubah Jadwal & Relasi Lomba"
                        >
                          <Pencil className="h-3 w-3" />
                          <span className="hidden sm:inline">Ubah</span>
                        </Button>
                        {!isLive && (
                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => handleSetLive(sch.id)}
                            className="text-[11px] h-7 gap-1 cursor-pointer"
                          >
                            <Radio className="h-3 w-3" />
                            <span>Jadikan Live</span>
                          </Button>
                        )}
                        {isLive && (
                          <span className="text-[11px] font-mono font-bold text-danger animate-pulse">
                            ● SEDANG TAYANG
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Modal Tambah / Edit Jadwal */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <form onSubmit={handleSaveSchedule} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingScheduleId ? "Ubah Jadwal Agenda Acara" : "Tambah Agenda Acara Baru"}
              </DialogTitle>
              <DialogDescription>
                Hubungkan agenda dengan cabang lomba dari data lomba agar venue dan jadwal terintegrasi secara otomatis.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              {/* Dropdown Referensi Cabang Lomba */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>Hubungkan ke Cabang Lomba (Opsional)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Pilih lomba dari data /dashboard/lomba
                  </span>
                </label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  value={selectedCompId}
                  onChange={(e) => handleCompetitionChange(e.target.value)}
                >
                  <option value="">— Bukan Cabang Lomba (Acara Umum) —</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏆 {c.name} ({c.category === "kelompok" ? "Kelompok" : "Individu"}) — {c.venue}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Judul Agenda / Acara</label>
                <Input
                  required
                  placeholder="Contoh: Lomba Membaca Puisi Sastra"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Hari ke-</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  >
                    <option value="1">Hari 1 (26 Okt)</option>
                    <option value="2">Hari 2 (27 Okt)</option>
                    <option value="3">Hari 3 (28 Okt)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Waktu Pelaksanaan</label>
                  <Input
                    required
                    placeholder="09:00 - 12:00 WIB"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Gedung / Venue</label>
                  <Input
                    required
                    placeholder="Ruang 12"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Panggung / Stage</label>
                  <Input
                    required
                    placeholder="Stage A1"
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Pemandu Acara (Host/MC)</label>
                <Input
                  placeholder="Nama Host / PIC Panggung"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan ke Database"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
