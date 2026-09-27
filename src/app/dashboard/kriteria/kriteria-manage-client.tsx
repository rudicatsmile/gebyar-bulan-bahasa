"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { Sliders, Plus, AlertCircle, CheckCircle2, Trash2, Save, Loader2 } from "lucide-react";
import { updateCompetitionCriteria } from "@/app/actions/competitions";
import type { Competition, CompetitionCriterion } from "@/lib/dummy-data";

interface KriteriaManageClientProps {
  initialCompetitions: Competition[];
}

export function KriteriaManageClient({ initialCompetitions }: KriteriaManageClientProps) {
  const router = useRouter();
  const [competitionsData, setCompetitionsData] = React.useState<Competition[]>(initialCompetitions);
  const [selectedCompId, setSelectedCompId] = React.useState(
    initialCompetitions[0]?.id || ""
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [notification, setNotification] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Sync state when server data updates
  React.useEffect(() => {
    setCompetitionsData(initialCompetitions);
    if (!selectedCompId && initialCompetitions[0]) {
      setSelectedCompId(initialCompetitions[0].id);
    }
  }, [initialCompetitions, selectedCompId]);

  // Form states
  const [critName, setCritName] = React.useState("");
  const [critDesc, setCritDesc] = React.useState("");
  const [critWeight, setCritWeight] = React.useState("20");
  const [critMaxScore, setCritMaxScore] = React.useState("100");

  const currentComp =
    competitionsData.find((c) => c.id === selectedCompId) || competitionsData[0] || {
      id: "",
      name: "",
      shortName: "",
      criteria: [],
    };

  const totalWeight = (currentComp.criteria || []).reduce((sum, c) => sum + c.weight, 0);
  const isValid100 = Math.round(totalWeight) === 100;

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    const newCrit: CompetitionCriterion = {
      id: `crit-${Date.now()}`,
      name: critName,
      description: critDesc,
      weight: parseFloat(critWeight) || 0,
      maxScore: parseFloat(critMaxScore) || 100,
    };

    setCompetitionsData((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCompId) return c;
        return { ...c, criteria: [...c.criteria, newCrit] };
      })
    );

    setDialogOpen(false);
    setCritName("");
    setCritDesc("");
    setNotification(null);
  };

  const handleDeleteCriterion = (critId: string) => {
    setCompetitionsData((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCompId) return c;
        return { ...c, criteria: c.criteria.filter((cr) => cr.id !== critId) };
      })
    );
    setNotification(null);
  };

  const handleSaveToDatabase = () => {
    if (!currentComp || !currentComp.id) return;

    if (!isValid100) {
      setNotification({
        type: "error",
        message: `Total bobot saat ini ${totalWeight}%. Harus tepat 100% sebelum disimpan.`,
      });
      return;
    }

    setNotification(null);

    startTransition(async () => {
      const res = await updateCompetitionCriteria({
        competitionId: currentComp.id,
        criteria: currentComp.criteria.map((c) => ({
          name: c.name,
          description: c.description,
          weight: c.weight,
          maxScore: c.maxScore,
        })),
      });

      if (!res.success) {
        setNotification({
          type: "error",
          message: res.error || "Gagal menyimpan kriteria ke database.",
        });
      } else {
        setNotification({
          type: "success",
          message: `Kriteria untuk cabang lomba ${currentComp.name} berhasil disimpan ke database.`,
        });
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sliders className="h-7 w-7 text-accent" />
            <span>Manajemen Kriteria Penilaian Berbobot</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Atur komponen penilaian per cabang lomba. Total akumulasi bobot per cabang lomba wajib tepat 100%.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSaveToDatabase}
            disabled={!isValid100 || isPending}
            size="sm"
            variant="default"
            className="text-xs gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Simpan ke Database</span>
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Kriteria Baru</span>
          </Button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
            notification.type === "success"
              ? "border-success/40 bg-success/10 text-success"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Tab Pemilihan Cabang Lomba */}
      <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-border bg-card">
        {competitionsData.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setSelectedCompId(c.id);
              setNotification(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              c.id === selectedCompId
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {c.shortName}
          </button>
        ))}
      </div>

      {/* Status Bobot Alert */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
          isValid100
            ? "border-success/40 bg-success/10 text-success"
            : "border-danger/40 bg-danger/10 text-danger"
        }`}
      >
        <div className="flex items-center gap-2.5 text-xs font-medium">
          {isValid100 ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-danger" />
          )}
          <span>
            {isValid100
              ? "Total bobot kriteria telah tervalidasi tepat 100%. Sistem siap melakukan kalkulasi penilaian juri."
              : `Peringatan: Total bobot saat ini ${totalWeight}%. Sesuaikan bobot kriteria agar total tepat 100% sebelum menyimpan.`}
          </span>
        </div>

        <div className="text-right shrink-0">
          <span className="font-mono text-xl font-black">
            {totalWeight}% / 100%
          </span>
        </div>
      </div>

      {/* Tabel Kriteria */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead>Nama Kriteria</TableHead>
              <TableHead>Deskripsi & Indikator</TableHead>
              <TableHead className="text-center w-28">Skor Maks</TableHead>
              <TableHead className="text-right w-28">Bobot (%)</TableHead>
              <TableHead className="text-right w-20">Hapus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(currentComp.criteria || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                  Belum ada kriteria penilaian untuk cabang lomba ini.
                </TableCell>
              </TableRow>
            ) : (
              currentComp.criteria.map((crit, idx) => (
                <TableRow key={crit.id}>
                  <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                  <TableCell className="font-semibold text-foreground text-xs sm:text-sm">
                    {crit.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {crit.description}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">
                    {crit.maxScore}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-accent text-sm">
                    {crit.weight}%
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleDeleteCriterion(crit.id)}
                      className="p-1 rounded text-muted-foreground hover:text-danger hover:bg-muted cursor-pointer transition-colors"
                      title="Hapus Kriteria"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Tambah Kriteria */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <form onSubmit={handleAddCriterion} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Tambah Kriteria Penilaian</DialogTitle>
            <DialogDescription>
              Tambahkan parameter kriteria untuk cabang lomba <strong>{currentComp.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <Input
            label="Nama Kriteria *"
            placeholder="Contoh: Penghayatan & Emosi Karakter"
            value={critName}
            onChange={(e) => setCritName(e.target.value)}
            required
            minLength={2}
          />

          <Input
            label="Deskripsi Indikator Penilaian *"
            placeholder="Aspek ekspresi wajah, penjiwaan pesan, artikulasi kata..."
            value={critDesc}
            onChange={(e) => setCritDesc(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Persentase Bobot (%) *"
              type="number"
              min={1}
              max={100}
              value={critWeight}
              onChange={(e) => setCritWeight(e.target.value)}
              required
            />
            <Input
              label="Skor Maksimal *"
              type="number"
              value={critMaxScore}
              onChange={(e) => setCritMaxScore(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Tambahkan Kriteria</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
