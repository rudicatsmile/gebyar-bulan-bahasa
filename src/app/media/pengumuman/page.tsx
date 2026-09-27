"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ANNOUNCEMENTS } from "@/lib/dummy-data";
import { Megaphone, ArrowLeft, Eye } from "lucide-react";

export default function MediaPengumumanPage() {
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
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Megaphone className="h-7 w-7 text-accent" />
              <span>Daftar Siaran & Pengumuman Media Center</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tinjau pengumuman yang tayang di halaman publik dan modul teks berjalan monitor lapangan.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul Warta</TableHead>
                <TableHead className="text-center">Kategori</TableHead>
                <TableHead>Tanggal Siar</TableHead>
                <TableHead className="text-center">Layar Monitor</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ANNOUNCEMENTS.map((ann) => (
                <TableRow key={ann.id}>
                  <TableCell>
                    <strong className="text-foreground text-xs sm:text-sm block">
                      {ann.title}
                    </strong>
                    <span className="text-[11px] text-muted-foreground">{ann.body}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={ann.category === "penting" ? "danger" : "default"} className="text-[10px]">
                      {ann.category.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {ann.publishedAt}
                  </TableCell>
                  <TableCell className="text-center">
                    {ann.showOnMonitor ? (
                      <Badge variant="success" className="text-[10px]">
                        TAYANG
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/pengumuman/${ann.slug}`} target="_blank">
                      <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Pratinjau</span>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
