"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STANDS, Stand } from "@/lib/dummy-data";
import { ArrowLeft, QrCode, Store, Printer, Eye, Copy, Check } from "lucide-react";
import { QRCodeCard } from "@/components/qrcode/QRCodeGenerator";

export default function DashboardKelolaStandPage() {
  const [stands, setStands] = React.useState<Stand[]>(STANDS);
  const [previewStand, setPreviewStand] = React.useState<Stand | null>(null);
  const [copiedCode, setCopiedCode] = React.useState("");

  const handleCopy = (code: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(""), 2000);
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/challenge"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Kelola Challenge</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Store className="h-7 w-7 text-accent" />
                <span>Kelola 8 Stand Pameran & QR Token</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Daftar kode unik 6 karakter (PUISI01 s/d MEDIA08) dan token QR untuk cetak stiker stand pameran lomba.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Stand Pameran</TableHead>
                <TableHead className="text-center">Kode Unik</TableHead>
                <TableHead>Lokasi Booth</TableHead>
                <TableHead className="text-center">Poin / Kunjungan</TableHead>
                <TableHead className="text-center">Total Kunjungan</TableHead>
                <TableHead className="text-right">Aksi QR & Cetak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stands.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <strong className="text-foreground text-xs sm:text-sm block">
                      {s.name}
                    </strong>
                    <span className="text-[11px] text-muted-foreground">{s.description}</span>
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-accent text-sm">
                    <span className="px-2 py-0.5 rounded bg-primary text-accent">
                      {s.code}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.location}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs font-bold text-foreground">
                    +{s.points} Pts
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">
                    {s.visitCount} Kali
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(s.code)}
                        className="text-xs h-8 gap-1"
                        title="Salin Kode Stand"
                      >
                        {copiedCode === s.code ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedCode === s.code ? "Disalin" : "Kode"}</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setPreviewStand(s)}
                        className="text-xs h-8 gap-1"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Lihat QR</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Modal Pratinjau QR Stand Siap Cetak */}
        {previewStand && (
          <Dialog open={!!previewStand} onOpenChange={() => setPreviewStand(null)}>
            <div className="space-y-4 text-center p-4">
              <DialogHeader>
                <DialogTitle>{previewStand.name}</DialogTitle>
                <DialogDescription>
                  Kode QR token resmi untuk dicetak dan ditempel di meja stand pameran.
                </DialogDescription>
              </DialogHeader>

              <div className="py-2">
                <QRCodeCard
                  standName={previewStand.name}
                  standCode={previewStand.code}
                  qrToken={previewStand.qrToken}
                  location={previewStand.location}
                  points={previewStand.points}
                />
              </div>
            </div>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
