"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TWIBBONS, TwibbonItem } from "@/lib/dummy-data";
import { Camera, CheckCircle2, XCircle, Sparkles, ArrowLeft } from "lucide-react";

export default function MediaTwibbonPage() {
  const [twibbons, setTwibbons] = React.useState<TwibbonItem[]>(TWIBBONS);

  const handleApprove = (id: string) => {
    setTwibbons((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "disetujui" } : t))
    );
  };

  const handleReject = (id: string) => {
    setTwibbons((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "ditolak" } : t))
    );
  };

  const toggleFeatured = (id: string) => {
    setTwibbons((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isFeatured: !t.isFeatured } : t))
    );
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
                <Camera className="h-7 w-7 text-accent" />
                <span>Antrean Moderasi Twibbon Masuk</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Verifikasi kesesuaian bingkai dan konten unggahan foto twibbon peserta sebelum tayang di rotasi monitor venue.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {twibbons.map((item) => (
            <Card key={item.id} className="overflow-hidden flex flex-col justify-between">
              <div className="relative aspect-square w-full bg-muted overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.uploaderName}
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-2 left-2 flex gap-1">
                  <Badge
                    variant={
                      item.status === "disetujui"
                        ? "success"
                        : item.status === "menunggu"
                        ? "warning"
                        : "danger"
                    }
                    className="text-[10px]"
                  >
                    {item.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    {item.uploaderName}
                  </h4>
                  <p className="text-xs text-muted-foreground">{item.institution}</p>
                  <p className="text-xs text-foreground/80 line-clamp-2 italic pt-1">
                    &ldquo;{item.caption}&rdquo;
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleFeatured(item.id)}
                      className={`text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                        item.isFeatured ? "text-accent" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{item.isFeatured ? "★ Unggulan" : "Jadikan Unggulan"}</span>
                    </button>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {item.likesCount} suka
                    </span>
                  </div>

                  {item.status === "menunggu" && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(item.id)}
                        className="text-xs h-8"
                      >
                        Tolak
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleApprove(item.id)}
                        className="text-xs h-8"
                      >
                        Setujui
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
