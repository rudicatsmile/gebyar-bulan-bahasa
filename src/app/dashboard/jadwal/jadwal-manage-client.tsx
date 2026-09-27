"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScheduleItem } from "@/lib/dummy-data";
import { setScheduleStatus, upsertSchedule } from "@/app/actions/schedules";
import { Plus, Radio, AlertCircle } from "lucide-react";

interface JadwalManageClientProps {
  initialSchedules: ScheduleItem[];
}

export function JadwalManageClient({ initialSchedules }: JadwalManageClientProps) {
  const [schedules, setSchedules] = React.useState<ScheduleItem[]>(initialSchedules);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [conflictWarning, setConflictWarning] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form states
  const [title, setTitle] = React.useState("");
  const [day, setDay] = React.useState("2");
  const [time, setTime] = React.useState("09:00 - 12:00 WIB");
  const [venue, setVenue] = React.useState("Panggung Utama");
  const [stage, setStage] = React.useState("Stage A");
  const [host, setHost] = React.useState("");

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

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const eventDate =
      day === "1" ? "2025-10-26" : day === "2" ? "2025-10-27" : "2025-10-28";
    const startTimeParts = time.split("-")[0]?.trim() || "09:00";
    const endTimeParts = time.split("-")[1]?.replace("WIB", "").trim() || "12:00";

    const newItem: ScheduleItem = {
      id: `sch-${Date.now()}`,
      title,
      day: parseInt(day),
      date: day === "1" ? "26 Oktober 2025" : day === "2" ? "27 Oktober 2025" : "28 Oktober 2025",
      time,
      venue,
      stage,
      host: host || "Panitia Acara",
      status: "terjadwal",
    };

    setSchedules((prev) => [newItem, ...prev]);

    try {
      await upsertSchedule({
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
              Atur status pelaksanaan panggung secara langsung. Perubahan status menjadi &quot;Berlangsung&quot; otomatis tampil di layar monitor lapangan.
            </p>
          </div>

          <Button onClick={() => setDialogOpen(true)} size="sm" className="text-xs gap-1.5 cursor-pointer">
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
                <TableHead>Agenda / Judul Acara</TableHead>
                <TableHead>Lokasi & Panggung</TableHead>
                <TableHead>Pemandu Acara</TableHead>
                <TableHead className="text-center">Status Panggung</TableHead>
                <TableHead className="text-right">Aksi Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((sch) => {
                const isLive = sch.status === "berlangsung";
                return (
                  <TableRow key={sch.id} className={isLive ? "bg-danger/5" : ""}>
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-foreground block">
                        Hari ke-{sch.day}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">{sch.time}</span>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-xs sm:text-sm">
                      {sch.title}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <strong className="text-foreground">{sch.venue}</strong>
                      <span className="block text-[11px]">{sch.stage}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{sch.host}</TableCell>
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Modal Tambah Jadwal */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <form onSubmit={handleAddSchedule} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Tambah Agenda Acara Baru</DialogTitle>
              <DialogDescription>
                Agenda yang ditambahkan akan tersimpan ke Supabase dan otomatis muncul di jadwal publik.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
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
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
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
                    placeholder="Panggung Utama"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Panggung / Stage</label>
                  <Input
                    required
                    placeholder="Stage A"
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Pemandu Acara (Host/MC)</label>
                <Input
                  placeholder="Nama Host"
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
