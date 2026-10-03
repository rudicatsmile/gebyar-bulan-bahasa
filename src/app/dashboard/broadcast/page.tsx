"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Radio, ArrowLeft, Megaphone, Tv, CheckCircle2, AlertTriangle, Loader2, Ban } from "lucide-react";
import { setEmergencyAlert } from "@/app/actions/monitor";

export default function DashboardBroadcastPage() {
  const [message, setMessage] = React.useState("");
  const [targetAudience, setTargetAudience] = React.useState("semua");
  const [forceMonitorTakeover, setForceMonitorTakeover] = React.useState(true);
  const [sentNotice, setSentNotice] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [activeEmergency, setActiveEmergency] = React.useState<string | null>(null);

  // Pantau status siaran darurat aktif pada monitor (polling ringan).
  const refreshActiveEmergency = React.useCallback(async () => {
    try {
      const res = await fetch("/api/monitor", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setActiveEmergency(json?.emergencyMessage || null);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    refreshActiveEmergency();
    const id = setInterval(refreshActiveEmergency, 5000);
    return () => clearInterval(id);
  }, [refreshActiveEmergency]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    setSendError(null);
    try {
      const res = await setEmergencyAlert(message.trim(), {
        takeover: forceMonitorTakeover,
        durationSeconds: 20,
      });
      if (!res.success) {
        setSendError(res.error || "Gagal mengirim siaran darurat ke monitor.");
        return;
      }
      setActiveEmergency(message.trim());
      setSentNotice(true);
      setMessage("");
      setTimeout(() => setSentNotice(false), 4500);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Terjadi kendala saat mengirim siaran.");
    } finally {
      setIsSending(false);
    }
  };

  const handleStopEmergency = async () => {
    setIsSending(true);
    setSendError(null);
    try {
      const res = await setEmergencyAlert(null);
      if (res.success) {
        setActiveEmergency(null);
      } else {
        setSendError(res.error || "Gagal menghentikan siaran darurat.");
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/pengumuman"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Pengumuman</span>
          </Link>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 text-danger">
              <Radio className="h-7 w-7 animate-pulse text-danger" />
              <span>Broadcast Pengumuman Darurat & Mendesak</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Kirimkan pengumuman prioritas tinggi secara serentak ke role tertentu dan jeda rotasi Layar Monitor Lapangan selama 20 detik (Emergency Takeover).
            </p>
          </div>
        </div>

        {sentNotice && (
          <div className="p-4 rounded-xl border border-success/40 bg-success/10 text-success text-xs flex items-center gap-2 animate-in fade-in-50">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>
              Siaran darurat berhasil dipublikasikan! Monitor venue akan segera menampilkan pesan darurat dan menjeda rotasi modul.
            </span>
          </div>
        )}

        {sendError && (
          <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-center gap-2 animate-in fade-in-50">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{sendError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <Card className="p-6 sm:p-8 border-danger/40">
              <form onSubmit={handleBroadcast} className="space-y-5">
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Target Audiens Penerima Siaran *
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
                  >
                    <option value="semua">Seluruh Pengguna & Layar Publik (Semua)</option>
                    <option value="peserta">Khusus Seluruh Peserta</option>
                    <option value="juri">Khusus Dewan Juri</option>
                    <option value="media_center">Khusus Tim Media Center</option>
                  </select>
                </div>

                <Textarea
                  label="Pesan Siaran Darurat *"
                  placeholder="Contoh: Peserta Lomba Pidato dimohon segera memasuki Ruang Aula Serbaguna, sesi akan dimulai dalam 10 menit."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  required
                />

                <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-danger">
                    <input
                      type="checkbox"
                      checked={forceMonitorTakeover}
                      onChange={(e) => setForceMonitorTakeover(e.target.checked)}
                      className="rounded border-danger text-danger focus:ring-danger"
                    />
                    <span>Aktifkan Pengalihan Penuh Layar Monitor Lapangan (Takeover 20 Detik)</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
                    Modul rotasi normal di monitor lapangan akan dijeda otomatis dan digantikan dengan banner peringatan darurat kontras tinggi.
                  </p>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  variant="destructive"
                  disabled={isSending || !message.trim()}
                  className="w-full text-xs font-semibold gap-2"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Radio className="h-4 w-4" />
                  )}
                  <span>{isSending ? "Mengirim ke monitor..." : "Kirimkan Siaran Darurat Sekarang"}</span>
                </Button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <Card
              className={`p-5 space-y-3 ${activeEmergency ? "border-danger/50 bg-danger/5" : ""}`}
            >
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${activeEmergency ? "bg-danger animate-pulse" : "bg-muted-foreground/40"}`} />
                <span>Status Siaran di Monitor</span>
              </h3>
              {activeEmergency ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-danger font-bold">
                    Darurat sedang aktif
                  </p>
                  <p className="text-xs text-foreground leading-relaxed line-clamp-4">
                    &ldquo;{activeEmergency}&rdquo;
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStopEmergency}
                    disabled={isSending}
                    className="w-full text-xs gap-1.5 border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                  >
                    {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                    <span>Hentikan Siaran Darurat</span>
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tidak ada siaran darurat aktif. Monitor sedang menjalankan rotasi modul normal.
                </p>
              )}
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-accent" />
                <span>Ketentuan Siaran Darurat</span>
              </h3>
              <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <li>• Gunakan hanya untuk informasi mendesak seperti perubahan jadwal mendadak, panggilan peserta, atau pengumuman keamanan.</li>
                <li>• Maksimal 3 siaran darurat aktif dalam satu siklus acara.</li>
                <li>• Pesan darurat otomatis dicatat pada <strong>activity_logs</strong> panitia.</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
