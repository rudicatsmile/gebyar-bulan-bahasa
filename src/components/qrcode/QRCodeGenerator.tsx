"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download, Printer, QrCode } from "lucide-react";

interface QRCodeCardProps {
  standName: string;
  standCode: string;
  qrToken: string;
  location?: string;
  points?: number;
  badgeLabel?: string;
  infoText?: string;
  type?: "checkin" | "checkout";
}

export function QRCodeCard({
  standName,
  standCode,
  qrToken,
  location = "Area Pameran & Budaya",
  points = 0,
  badgeLabel,
  infoText,
  type = "checkin",
}: QRCodeCardProps) {
  const [dataUrl, setDataUrl] = React.useState<string>("");
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Generate QR payload containing standard app scan URL or token
    const qrPayload = JSON.stringify({
      app: "GebyarBulanBahasa",
      type: type === "checkout" ? "stand_checkout" : "stand_checkin",
      code: standCode,
      token: qrToken,
      standCode: standCode,
    });

    QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 2,
      color: {
        dark: "#1c202e", // Ink color
        light: "#ffffff",
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error("Error generating QR Code:", err));
  }, [standCode, qrToken]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR-Stand-${standCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      ref={cardRef}
      className="p-6 rounded-2xl border-2 border-border bg-card text-card-foreground shadow-sm flex flex-col items-center text-center space-y-4 max-w-sm mx-auto"
    >
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold">
          GEBYAR BULAN BAHASA 2025
        </span>
        <h4 className="font-heading text-lg font-bold text-foreground">
          {standName}
        </h4>
        <p className="text-xs text-muted-foreground">{location}</p>
        {badgeLabel && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30">
            {badgeLabel}
          </span>
        )}
      </div>

      <div className="p-3 bg-white rounded-xl border border-border shadow-xs">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR Code Stand ${standCode}`}
            className="w-48 h-48 object-contain"
          />
        ) : (
          <div className="w-48 h-48 flex items-center justify-center text-muted-foreground">
            <QrCode className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="w-full bg-muted/60 p-3 rounded-xl border border-border space-y-1">
        <span className="text-[10px] uppercase font-mono text-muted-foreground block">
          {type === "checkout" ? "KODE CHECKOUT DALAM STAND" : "KODE MASUK STAND"}
        </span>
        <div className="font-mono text-2xl font-black text-foreground tracking-widest">
          {standCode}
        </div>
        <span className="text-[11px] font-mono text-accent font-semibold block">
          {infoText || (points > 0 ? `+${points} Poin Acara` : "Misi Menonton Stand (Minimal 15 Menit)")}
        </span>
      </div>

      <div className="flex items-center gap-2 w-full pt-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          className="flex-1 text-xs gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Unduh PNG</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrint}
          className="text-xs gap-1.5"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Cetak</span>
        </Button>
      </div>
    </div>
  );
}
