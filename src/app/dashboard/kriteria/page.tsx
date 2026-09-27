"use client";

import * as React from "react";
import Link from "next/link";
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
import { COMPETITIONS, CompetitionCriterion } from "@/lib/dummy-data";
import { Sliders, Plus, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";

export default function DashboardKriteriaPage() {
  const [selectedCompId, setSelectedCompId] = React.useState("comp-1");
  const [competitionsData, setCompetitionsData] = React.useState(COMPETITIONS);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Form states
  const [critName, setCritName] = React.useState("");
  const [critDesc, setCritDesc] = React.useState("");
  const [critWeight, setCritWeight] = React.useState("20");
  const [critMaxScore, setCritMaxScore] = React.useState("100");

  const currentComp =
    competitionsData.find((c) => c.id === selectedCompId) || competitionsData[0];

  const totalWeight = currentComp.criteria.reduce((sum, c) => sum + c.weight, 0);
  const isValid100 = totalWeight === 100;

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    const newCrit: CompetitionCriterion = {
      id: `crit-${Date.now()}`,
      name: critName,
      description: critDesc,
      weight: parseFloat(critWeight),
      maxScore: parseFloat(critMaxScore),
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
  };

  const handleDeleteCriterion = (critId: string) => {
    setCompetitionsData((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCompId) return c;
        return { ...c, criteria: c.criteria.filter((cr) => cr.id !== critId) };
      })
    );
  };

  return (
    <DashboardLayout role="seksi_acara">
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

          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
            className="text-xs gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Kriteria Baru</span>
          </Button>
        </div>

        {/* Tab Pemilihan Cabang Lomba */}
        <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-border bg-card">
          {competitionsData.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCompId(c.id)}
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
                : `Peringatan: Total bobot saat ini ${totalWeight}%. Sesuaikan bobot kriteria agar total tepat 100% sebelum memulai penilaian.`}
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
              {currentComp.criteria.map((crit, idx) => (
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
                      className="p-1 rounded text-muted-foreground hover:text-danger hover:bg-muted cursor-pointer"
                      title="Hapus Kriteria"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
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
    </DashboardLayout>
  );
}
