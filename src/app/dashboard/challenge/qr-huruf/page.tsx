"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  QrCode,
  ArrowLeft,
  Plus,
  Printer,
  Eye,
  CheckCircle2,
  XCircle,
  Trophy,
  Users,
  MapPin,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Copy,
  Check,
  Edit,
  Trash2,
} from "lucide-react";
import { QRLetterCard } from "@/components/qrcode/QRLetterCard";
import {
  getAdminQrChallenges,
  createQrChallenge,
  toggleQrChallengeActive,
  deleteQrChallenge,
  updateQrLetterLocations,
  getAdminQrSubmissions,
  type QrLetterChallenge,
  type QrLetterCode,
  type QrSubmissionItem,
} from "@/app/actions/qr-huruf";
import { cn } from "@/lib/utils";

export default function DashboardQrHurufPage() {
  const [loading, setLoading] = React.useState(true);
  const [challenges, setChallenges] = React.useState<QrLetterChallenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = React.useState<string>("");
  const [submissions, setSubmissions] = React.useState<QrSubmissionItem[]>([]);
  const [tab, setTab] = React.useState<"letters" | "print" | "submissions">("letters");

  // Create Modal
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [formTitle, setFormTitle] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formTargetPhrase, setFormTargetPhrase] = React.useState("");
  const [formPoints, setFormPoints] = React.useState("100");
  const [saving, setSaving] = React.useState(false);

  // Single QR Preview Modal
  const [previewCode, setPreviewCode] = React.useState<QrLetterCode | null>(null);
  const [copiedToken, setCopiedToken] = React.useState("");

  // Edit Location Modal
  const [editLocOpen, setEditLocOpen] = React.useState(false);
  const [editingLocCode, setEditingLocCode] = React.useState<QrLetterCode | null>(null);
  const [locInput, setLocInput] = React.useState("");

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [chalRes, subRes] = await Promise.all([
        getAdminQrChallenges(),
        getAdminQrSubmissions(),
      ]);

      if (chalRes.success && chalRes.challenges.length > 0) {
        setChallenges(chalRes.challenges);
        setSelectedChallengeId((prev) => prev || chalRes.challenges[0].id);
      }
      if (subRes.success) {
        setSubmissions(subRes.submissions);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const activeChallenge =
    challenges.find((c) => c.id === selectedChallengeId) || challenges[0];

  const handleCopy = (token: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(token);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(""), 2000);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTargetPhrase.trim()) return;

    setSaving(true);
    try {
      const res = await createQrChallenge({
        title: formTitle.trim() || `Challenge QR: ${formTargetPhrase.toUpperCase()}`,
        description: formDescription.trim(),
        targetPhrase: formTargetPhrase.trim(),
        pointsReward: parseInt(formPoints) || 100,
        isActive: true,
      });

      if (res.success && res.challengeId) {
        setCreateDialogOpen(false);
        setFormTitle("");
        setFormDescription("");
        setFormTargetPhrase("");
        setFormPoints("100");
        await loadData();
        setSelectedChallengeId(res.challengeId);
      } else {
        alert(res.error || "Gagal membuat tantangan.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (chal: QrLetterChallenge) => {
    await toggleQrChallengeActive(chal.id, !chal.isActive);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus tantangan ini beserta seluruh QR hurufnya?")) return;
    await deleteQrChallenge(id);
    await loadData();
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocCode) return;
    await updateQrLetterLocations([
      { codeId: editingLocCode.id, locationHint: locInput.trim() },
    ]);
    setEditLocOpen(false);
    setEditingLocCode(null);
    await loadData();
  };

  // Preview generated letter count during typing
  const cleanPhraseLetters = formTargetPhrase.toUpperCase().replace(/[^A-Z]/g, "");

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        {/* Top Header */}
        <div>
          <Link
            href="/dashboard/challenge"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Manajemen Challenge</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <QrCode className="h-7 w-7 text-primary" />
                <span>Challenge QR Huruf & Susun Kata</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Pecah kalimat bermakna menjadi QR code huruf, tempatkan di lokasi tersembunyi, dan biarkan peserta berburu aksara.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCreateDialogOpen(true)}
                size="sm"
                className="gap-1.5 font-bold cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Buat Kalimat Target Baru</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Challenge Selector & Stats */}
        {challenges.length > 0 && activeChallenge && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 md:col-span-2 space-y-2 bg-gradient-to-br from-card via-card to-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Tantangan Aktif
                </span>
                <Badge variant={activeChallenge.isActive ? "success" : "default"}>
                  {activeChallenge.isActive ? "AKTIF" : "NONAKTIF"}
                </Badge>
              </div>

              {challenges.length > 1 ? (
                <select
                  value={selectedChallengeId}
                  onChange={(e) => setSelectedChallengeId(e.target.value)}
                  className="w-full text-base font-bold bg-background border border-border rounded-md px-2.5 py-1.5 focus:outline-none"
                >
                  {challenges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.targetPhrase})
                    </option>
                  ))}
                </select>
              ) : (
                <h3 className="font-heading text-lg font-bold text-foreground">
                  {activeChallenge.title}
                </h3>
              )}

              <p className="text-xs text-muted-foreground line-clamp-2">
                {activeChallenge.description || "Tidak ada deskripsi."}
              </p>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Kalimat Target
              </span>
              <p className="font-mono text-xl font-black text-primary tracking-widest">
                {activeChallenge.targetPhrase}
              </p>
              <span className="text-[11px] text-muted-foreground block">
                Total {activeChallenge.letterCodes.length} QR Huruf
              </span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Hadiah & Submisi
              </span>
              <p className="font-heading text-2xl font-bold text-accent">
                +{activeChallenge.pointsReward} POIN
              </p>
              <span className="text-[11px] text-muted-foreground block">
                {submissions.filter((s) => s.isCorrect).length} Peserta Berhasil
              </span>
            </Card>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit print:hidden">
          <button
            onClick={() => setTab("letters")}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer",
              tab === "letters"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Daftar QR Huruf ({activeChallenge?.letterCodes.length || 0})
          </button>
          <button
            onClick={() => setTab("print")}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5",
              tab === "print"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak Semua Kartu QR
          </button>
          <button
            onClick={() => setTab("submissions")}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5",
              tab === "submissions"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Trophy className="h-3.5 w-3.5 text-accent" />
            Leaderboard Submisi ({submissions.length})
          </button>
        </div>

        {/* TAB 1: LIST QR LETTERS TABLE */}
        {tab === "letters" && activeChallenge && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Setiap kartu QR berikut mewakili satu huruf dalam kalimat target. Tempelkan QR di lokasi yang ditentukan.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleToggle(activeChallenge)}
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5"
                >
                  {activeChallenge.isActive ? (
                    <>
                      <ToggleRight className="h-4 w-4 text-emerald-500" />
                      <span>Nonaktifkan</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      <span>Aktifkan</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleDelete(activeChallenge.id)}
                  size="sm"
                  variant="ghost"
                  className="text-xs text-destructive hover:bg-destructive/10 gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Hapus</span>
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Pos #</TableHead>
                    <TableHead className="w-20 text-center">Huruf</TableHead>
                    <TableHead>Kode Token QR</TableHead>
                    <TableHead>Lokasi Penempatan Stiker</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeChallenge.letterCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="text-center font-mono font-bold text-muted-foreground">
                        {code.letterIndex}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-mono text-lg font-black border border-primary/20">
                          {code.letter}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-mono text-xs text-foreground">
                          <span>{code.qrToken}</span>
                          <button
                            onClick={() => handleCopy(code.qrToken)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Salin token QR"
                          >
                            {copiedToken === code.qrToken ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{code.locationHint || "Belum ditentukan"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          onClick={() => {
                            setEditingLocCode(code);
                            setLocInput(code.locationHint || "");
                            setEditLocOpen(true);
                          }}
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Ubah Lokasi</span>
                        </Button>
                        <Button
                          onClick={() => setPreviewCode(code)}
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-xs gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Lihat QR</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* TAB 2: PRINT ALL QR CARDS */}
        {tab === "print" && activeChallenge && (
          <div className="space-y-4">
            <div className="flex items-center justify-between print:hidden p-4 bg-muted/40 rounded-xl border border-border">
              <div>
                <h3 className="font-heading font-bold text-foreground">
                  Cetak Lembar Stiker QR Huruf
                </h3>
                <p className="text-xs text-muted-foreground">
                  Gunakan tombol cetak di bawah ini untuk mencetak seluruh kartu QR kode huruf sekaligus.
                </p>
              </div>
              <Button
                onClick={() => window.print()}
                className="gap-2 font-bold bg-primary text-primary-foreground"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Semua ({activeChallenge.letterCodes.length} QR)</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:grid-cols-2 print:gap-6">
              {activeChallenge.letterCodes.map((code) => (
                <QRLetterCard
                  key={code.id}
                  challengeTitle={activeChallenge.title}
                  letter={code.letter}
                  letterIndex={code.letterIndex}
                  qrToken={code.qrToken}
                  locationHint={code.locationHint}
                  revealLetter={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SUBMISSIONS LEADERBOARD */}
        {tab === "submissions" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Rank</TableHead>
                    <TableHead>Nama Peserta</TableHead>
                    <TableHead>Asal Instansi</TableHead>
                    <TableHead>Susunan Kalimat Terkirim</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Poin</TableHead>
                    <TableHead className="text-center">Durasi</TableHead>
                    <TableHead className="text-right">Waktu Submit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Belum ada peserta yang mengirimkan susunan kata.
                      </TableCell>
                    </TableRow>
                  ) : (
                    submissions.map((sub, idx) => (
                      <TableRow key={sub.id}>
                        <TableCell className="text-center font-bold">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {sub.participantName}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {sub.institution}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-bold text-foreground">
                          "{sub.submittedPhrase}"
                        </TableCell>
                        <TableCell className="text-center">
                          {sub.isCorrect ? (
                            <Badge variant="success" className="gap-1 text-[10px]">
                              <CheckCircle2 className="h-3 w-3" />
                              BENAR
                            </Badge>
                          ) : (
                            <Badge variant="danger" className="gap-1 text-[10px]">
                              <XCircle className="h-3 w-3" />
                              SALAH
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold font-mono text-accent">
                          +{sub.score}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {sub.timeSeconds ? `${Math.floor(sub.timeSeconds / 60)}m ${sub.timeSeconds % 60}s` : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {new Date(sub.submittedAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* DIALOG: CREATE CHALLENGE */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Buat Tantangan QR Huruf Baru</DialogTitle>
              <DialogDescription>
                Ketik kalimat atau kata bermakna. Sistem akan otomatis memecah setiap karakter menjadi QR code yang dapat dicetak.
              </DialogDescription>
            </DialogHeader>

            <Input
              label="Judul Tantangan *"
              placeholder="Contoh: Jelajah Aksara"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />

            <Input
              label="Kalimat / Kata Target (Jawaban Benar) *"
              placeholder="Contoh: GEBYAR BAHASA atau BULAN BAHASA"
              value={formTargetPhrase}
              onChange={(e) => setFormTargetPhrase(e.target.value)}
              helperText={`Akan dipecah menjadi ${cleanPhraseLetters.length} huruf QR (${cleanPhraseLetters})`}
              required
            />

            <Textarea
              label="Petunjuk / Instruksi untuk Peserta"
              placeholder="Contoh: Temukan huruf yang tersebar di area acara dan susun menjadi kalimat bermakna!"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
            />

            <Input
              label="Poin Hadiah Jika Berhasil *"
              type="number"
              value={formPoints}
              onChange={(e) => setFormPoints(e.target.value)}
              required
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving || !cleanPhraseLetters}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Membuat...</span>
                  </>
                ) : (
                  <span>Generate QR ({cleanPhraseLetters.length} Huruf)</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* DIALOG: SINGLE QR PREVIEW */}
        <Dialog open={!!previewCode} onOpenChange={() => setPreviewCode(null)}>
          {previewCode && activeChallenge && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Preview QR Huruf #{previewCode.letterIndex}</DialogTitle>
                <DialogDescription>
                  QR Code untuk huruf <strong>"{previewCode.letter}"</strong> di {previewCode.locationHint || "Lokasi Acara"}.
                </DialogDescription>
              </DialogHeader>

              <QRLetterCard
                challengeTitle={activeChallenge.title}
                letter={previewCode.letter}
                letterIndex={previewCode.letterIndex}
                qrToken={previewCode.qrToken}
                locationHint={previewCode.locationHint}
                revealLetter={true}
              />

              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewCode(null)}>
                  Tutup
                </Button>
              </DialogFooter>
            </div>
          )}
        </Dialog>

        {/* DIALOG: EDIT LOCATION */}
        <Dialog open={editLocOpen} onOpenChange={setEditLocOpen}>
          <form onSubmit={handleSaveLocation} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                Ubah Lokasi Penempelan (Pos #{editingLocCode?.letterIndex} - Huruf "{editingLocCode?.letter}")
              </DialogTitle>
              <DialogDescription>
                Tentukan petunjuk lokasi di mana panitia akan menempelkan stiker QR code ini.
              </DialogDescription>
            </DialogHeader>

            <Input
              label="Keterangan Lokasi *"
              placeholder="Contoh: Pintu Masuk Barat, Stand Buku, dsb."
              value={locInput}
              onChange={(e) => setLocInput(e.target.value)}
              required
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditLocOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan Lokasi</Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
