"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download, Printer, QrCode, MapPin } from "lucide-react";

interface QRLetterCardProps {
  challengeTitle?: string;
  letter: string;
  letterIndex: number;
  qrToken: string;
  locationHint?: string | null;
  revealLetter?: boolean;
}

export function QRLetterCard({
  challengeTitle = "Jelajah Aksara Bulan Bahasa",
  letter,
  letterIndex,
  qrToken,
  locationHint = "Lokasi Acara",
  revealLetter = true,
}: QRLetterCardProps) {
  const [dataUrl, setDataUrl] = React.useState<string>("");

  React.useEffect(() => {
    // Generate QR payload containing standard app scan URL or token
    const qrPayload = JSON.stringify({
      app: "GebyarBulanBahasa",
      type: "qr_letter",
      token: qrToken,
      letterIndex,
    });

    QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 2,
      color: {
        dark: "#1c202e",
        light: "#ffffff",
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error("Error generating QR Code:", err));
  }, [qrToken, letterIndex]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR-Huruf-${letterIndex}-${qrToken}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-5 rounded-2xl border-2 border-border bg-card text-card-foreground shadow-sm flex flex-col items-center text-center space-y-3 print:border-black print:shadow-none max-w-xs mx-auto">
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold block">
          GEBYAR BULAN BAHASA 2025
        </span>
        <h4 className="font-heading text-sm font-bold text-foreground line-clamp-1">
          {challengeTitle}
        </h4>
        <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
          <MapPin className="h-3 w-3 text-primary shrink-0" />
          <span className="line-clamp-1">{locationHint || "Lokasi Rahasia"}</span>
        </div>
      </div>

      {/* QR Display */}
      <div className="p-3 bg-white rounded-xl border border-border shadow-xs print:border-black">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR Code Huruf ${letter}`}
            className="w-40 h-40 object-contain mx-auto"
          />
        ) : (
          <div className="w-40 h-40 flex items-center justify-center text-muted-foreground">
            <QrCode className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info Badge */}
      <div className="w-full bg-muted/60 p-2.5 rounded-xl border border-border space-y-1 text-center">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] uppercase font-mono text-muted-foreground">
            Pos Huruf #{letterIndex}
          </span>
          {revealLetter ? (
            <span className="text-xs font-mono font-black text-primary px-1.5 py-0.2 bg-primary/10 rounded">
              Huruf: {letter}
            </span>
          ) : (
            <span className="text-[10px] font-mono text-muted-foreground italic">
              [Rahasia]
            </span>
          )}
        </div>
        <div className="font-mono text-xs font-bold text-foreground tracking-wider select-all break-all">
          {qrToken}
        </div>
      </div>

      {/* Actions (Hidden on Print) */}
      <div className="flex items-center gap-2 pt-1 w-full print:hidden">
        <Button
          onClick={handleDownload}
          size="sm"
          variant="outline"
          className="flex-1 text-xs gap-1.5 h-8"
        >
          <Download className="h-3 w-3" />
          <span>Unduh PNG</span>
        </Button>
      </div>
    </div>
  );
}
