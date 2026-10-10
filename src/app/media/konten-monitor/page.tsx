"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sliders,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Save,
  Check,
  Trophy,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { getCompetitions, type Competition } from "@/lib/supabase/queries";
import {
  getMonitorScoreboardSettings,
  updateMonitorScoreboardSettings,
} from "@/app/actions/settings";

interface PlaylistItem {
  id: string;
  moduleKey: string;
  name: string;
  description: string;
  durationSeconds: number;
  isActive: boolean;
}

const INITIAL_PLAYLIST: PlaylistItem[] = [
  { id: "mod-1", moduleKey: "jadwal", name: "Jadwal & Agenda Berlangsung (LIVE)", description: "Daftar panggung, jam, dan penanda LIVE denyut acara hari ini.", durationSeconds: 15, isActive: true },
  { id: "mod-2", moduleKey: "papan_skor", name: "Papan Skor Sementara (5 Besar)", description: "Skor agregat 5 besar cabang lomba yang sedang berjalan.", durationSeconds: 15, isActive: true },
  { id: "mod-3", moduleKey: "pengumuman", name: "Warta Resmi & Pengumuman Penting", description: "Pesan prioritas, nomor urut tampil, dan arahan seksi acara.", durationSeconds: 15, isActive: true },
  { id: "mod-4", moduleKey: "pemenang", name: "Penganugerahan Juara Resmi", description: "Podium juara 1, 2, dan 3 cabang lomba yang telah final.", durationSeconds: 15, isActive: true },
  { id: "mod-5", moduleKey: "twibbon", name: "Galeri Foto Twibbon Peserta", description: "Rotasi foto-foto unggulan peserta dan pengunjung festival.", durationSeconds: 15, isActive: true },
  { id: "mod-6", moduleKey: "leaderboard", name: "Klasemen Poin Challenge Stand", description: "10 besar perolehan poin keliling 8 stand pameran.", durationSeconds: 15, isActive: true },
];

export default function MediaKontenMonitorPage() {
  const [playlist, setPlaylist] = React.useState<PlaylistItem[]>(INITIAL_PLAYLIST);
  const [competitions, setCompetitions] = React.useState<Competition[]>([]);
  const [scoreboardEnabled, setScoreboardEnabled] = React.useState(true);
  const [selectedCompIds, setSelectedCompIds] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [comps, sbRes] = await Promise.all([
          getCompetitions(),
          getMonitorScoreboardSettings(),
        ]);
        setCompetitions(comps);
        if (sbRes.success && sbRes.settings) {
          setScoreboardEnabled(sbRes.settings.enabled);
          setSelectedCompIds(sbRes.settings.selectedCompetitionIds);
          // Sinkronkan toggle aktif pada modul papan skor
          setPlaylist((prev) =>
            prev.map((item) =>
              item.moduleKey === "papan_skor"
                ? { ...item, isActive: sbRes.settings.enabled }
                : item
            )
          );
        }
      } catch (err) {
        console.error("Gagal memuat konfigurasi monitor:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= playlist.length) return;
    const newItems = [...playlist];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setPlaylist(newItems);
  };

  const toggleActive = (id: string) => {
    setPlaylist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextActive = !item.isActive;
          if (item.moduleKey === "papan_skor") {
            setScoreboardEnabled(nextActive);
          }
          return { ...item, isActive: nextActive };
        }
        return item;
      })
    );
  };

  const handleToggleScoreboard = (val: boolean) => {
    setScoreboardEnabled(val);
    setPlaylist((prev) =>
      prev.map((item) =>
        item.moduleKey === "papan_skor" ? { ...item, isActive: val } : item
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const papanSkorItem = playlist.find((p) => p.moduleKey === "papan_skor");
      const isEnabled = papanSkorItem ? papanSkorItem.isActive : scoreboardEnabled;

      await updateMonitorScoreboardSettings({
        enabled: isEnabled,
        selectedCompetitionIds: selectedCompIds,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Gagal menyimpan playlist monitor:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout role="media_center">
      <div className="space-y-6">
        <div>
          <Link
            href="/media"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Ringkasan Media</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Sliders className="h-7 w-7 text-accent" />
                <span>Susun Playlist Modul Layar Monitor TV</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Urutkan urutan penayangan modul otomatis dan aktifkan/nonaktifkan modul siar sesuai kebutuhan panggung.
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              size="sm"
              className="text-xs gap-1.5 cursor-pointer min-w-[170px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>{saved ? "Tersimpan Realtime!" : "Simpan Pengaturan"}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {saved && (
          <div className="p-3.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in-50">
            <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              Pengaturan playlist dan filter cabang lomba papan skor berhasil disimpan! Layar TV (/monitor) akan langsung memperbarui tayangan secara realtime.
            </span>
          </div>
        )}

        {/* Daftar Modul Playlist */}
        <div className="space-y-3">
          {playlist.map((item, idx) => (
            <Card
              key={item.id}
              className={`p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                item.isActive ? "border-border bg-card" : "border-border/40 bg-muted/20 opacity-60"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveItem(idx, "up")}
                    disabled={idx === 0}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
                    title="Geser ke Atas"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveItem(idx, "down")}
                    disabled={idx === playlist.length - 1}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
                    title="Geser ke Bawah"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>

                <span className="font-mono text-xl font-bold text-accent w-8 text-center">
                  #{idx + 1}
                </span>

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-heading text-base font-bold text-foreground">
                      {item.name}
                    </h3>
                    <Badge variant={item.isActive ? "success" : "default"} className="text-[10px]">
                      {item.isActive ? "AKTIF" : "NONAKTIF"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:shrink-0 justify-between sm:justify-end">
                <span className="font-mono text-xs text-muted-foreground">
                  Durasi: <strong>{item.durationSeconds} Detik</strong>
                </span>

                <Button
                  size="sm"
                  variant={item.isActive ? "outline" : "default"}
                  onClick={() => toggleActive(item.id)}
                  className="text-xs h-8 cursor-pointer"
                >
                  {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Panel Kontrol Khusus: Papan Skor Sementara */}
        <Card className="p-5 sm:p-6 border-accent/30 bg-accent/5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent" />
                <h2 className="font-heading text-lg font-bold text-foreground">
                  Pengaturan Khusus: Modul Papan Skor Sementara
                </h2>
                <Badge
                  variant={scoreboardEnabled ? "success" : "warning"}
                  className="text-[10px]"
                >
                  {scoreboardEnabled ? "AKTIF DI MONITOR" : "DINONAKTIFKAN"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl">
                Tentukan cabang-cabang lomba mana saja yang boleh ditayangkan di papan skor 5 besar layar monitor. Jika lebih dari 1 lomba dipilih, monitor akan merotasikan skor masing-masing lomba secara berkala (setiap 7 detik).
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
              <span className="text-xs font-semibold text-muted-foreground">
                {scoreboardEnabled ? "Tayangkan di Monitor" : "Sembunyikan"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={scoreboardEnabled}
                onClick={() => handleToggleScoreboard(!scoreboardEnabled)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                  scoreboardEnabled ? "bg-accent" : "bg-muted-foreground/30"
                }`}
              >
                <span className="sr-only">Toggle Papan Skor</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    scoreboardEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {scoreboardEnabled ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Checklist Cabang Lomba Ditampilkan
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Centang cabang lomba yang ingin dimasukkan ke dalam rotasi skor monitor panggung.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCompIds(competitions.map((c) => c.id))}
                    className="text-[11px] h-7 px-2.5 gap-1 cursor-pointer"
                  >
                    <CheckSquare className="h-3 w-3" />
                    <span>Pilih Semua</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCompIds([])}
                    className="text-[11px] h-7 px-2.5 gap-1 cursor-pointer"
                  >
                    <Square className="h-3 w-3" />
                    <span>Kosongkan (Semua)</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {competitions.map((comp) => {
                  const isChecked =
                    selectedCompIds.length === 0 || selectedCompIds.includes(comp.id);
                  return (
                    <label
                      key={comp.id}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isChecked
                          ? "border-accent/40 bg-accent/10 hover:bg-accent/15"
                          : "border-border/60 bg-muted/20 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (selectedCompIds.length === 0) {
                              if (!e.target.checked) {
                                setSelectedCompIds(
                                  competitions.filter((c) => c.id !== comp.id).map((c) => c.id)
                                );
                              }
                            } else {
                              if (e.target.checked) {
                                setSelectedCompIds([...selectedCompIds, comp.id]);
                              } else {
                                setSelectedCompIds(
                                  selectedCompIds.filter((id) => id !== comp.id)
                                );
                              }
                            }
                          }}
                          className="h-4 w-4 rounded border-border text-accent focus:ring-accent accent-accent cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {comp.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase font-mono">
                            {comp.category}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={comp.status === "berlangsung" ? "live" : "default"}
                        className="text-[9px] uppercase px-1.5 py-0 shrink-0"
                      >
                        {comp.status === "berlangsung" ? "LIVE" : comp.status}
                      </Badge>
                    </label>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-[11px] text-muted-foreground">
                <span>
                  * Jika semua lomba dikosongkan, sistem otomatis merotasikan seluruh cabang lomba yang berstatus sedang berlangsung.
                </span>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  size="sm"
                  className="text-xs gap-1.5 cursor-pointer self-end sm:self-auto shrink-0"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Simpan Perubahan Lomba</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/20 border border-border/40 text-center text-xs text-muted-foreground">
              Modul Papan Skor Sementara sedang dinonaktifkan. Layar monitor tidak akan menayangkan modul ini dalam siklus tayangannya.
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
