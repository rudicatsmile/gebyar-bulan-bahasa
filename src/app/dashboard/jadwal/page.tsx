"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { SCHEDULES, ScheduleItem } from "@/lib/dummy-data";
import { Calendar, Plus, Clock, MapPin, Radio, AlertCircle } from "lucide-react";

export default function DashboardJadwalPage() {
  const [schedules, setSchedules] = React.useState<ScheduleItem[]>(SCHEDULES);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [conflictWarning, setConflictWarning] = React.useState("");

  // Form states
  const [title, setTitle] = React.useState("");
  const [day, setDay] = React.useState("2");
  const [time, setTime] = React.useState("");
  const [venue, setVenue] = React.useState("Panggung Utama");
  const [stage, setStage] = React.useState("Stage A");
  const [host, setHost] = React.useState("");

  const handleSetLive = (id: string) => {
    const target = schedules.find((s) => s.id === id);
    if (!target) return;

    // Check conflict: Hanya satu jadwal boleh 'berlangsung' pada panggung/venue yang sama
    const conflict = schedules.find(
      (s) =>
        s.id !== id &&
        s.venue === target.venue &&
        s.stage === target.stage &&
        s.status === "berlangsung"
    );

    if (conflict) {
      setConflictWarning(
        `Perhatian: Panggung ${target.venue} (${target.stage}) sudah memiliki acara aktif ("${conflict.title}"). Status acara tersebut dialihkan menjadi Selesai.`
      );
    } else {
      setConflictWarning("");
    }

    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id === id) return { ...s, status: "berlangsung" };
        if (s.venue === target.venue && s.stage === target.stage && s.status === "berlangsung") {
          return { ...s, status: "selesai" };
        }
        return s;
      })
    );
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: ScheduleItem = {
      id: `sch-${Date.now()}`,
      title,
      day: parseInt(day),
      date: day === "1" ? "26 Oktober 2025" : day === "2" ? "27 Oktober 2025" : "28 Oktober 2025",
      time,
      venue,
      stage,
      host,
      status: "terjadwal",
    };
    setSchedules((prev) => [newItem, ...prev]);
    setDialogOpen(false);
    setTitle("");
    setTime("");
    setHost("");
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
                          className="text-[11px] h-7 gap-1"
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
              <DialogTitle>Tambah Agenda Jadwal Baru</DialogTitle>
              <DialogDescription>
                Masukkan informasi panggung dan waktu pelaksanaan acara atau lomba.
              </DialogDescription>
            </DialogHeader>

            <Input
              label="Judul Agenda / Lomba *"
              placeholder="Contoh: Lomba Membaca Puisi Sesi 2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Hari Pelaksanaan (1, 2, atau 3) *"
                type="number"
                min={1}
                max={3}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                required
              />
              <Input
                label="Jam Pelaksanaan *"
                placeholder="09:00 - 12:00 WIB"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Venue / Gedung *"
                placeholder="Panggung Utama"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                required
              />
              <Input
                label="Nama Stage / Ruangan *"
                placeholder="Stage A"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                required
              />
            </div>

            <Input
              label="Nama Pemandu / MC *"
              placeholder="Nama MC Acara"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              required
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan Jadwal</Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
