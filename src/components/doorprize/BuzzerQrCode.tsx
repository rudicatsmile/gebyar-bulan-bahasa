"use client";

import * as React from "react";
import QRCode from "qrcode";
import { QrCode as QrIcon, Smartphone } from "lucide-react";

export function BuzzerQrCode({
  url = "https://bulanbahasa.smkdp2jkt.sch.id/buzzer",
  className = "",
  size = 200,
}: {
  url?: string;
  className?: string;
  size?: number;
}) {
  const [dataUrl, setDataUrl] = React.useState<string>("");

  React.useEffect(() => {
    QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: {
        dark: "#020617",
        light: "#ffffff",
      },
    })
      .then((res) => setDataUrl(res))
      .catch((err) => console.error("Gagal buat QR Buzzer:", err));
  }, [url, size]);

  return (
    <div
      className={`p-3 sm:p-4 rounded-3xl bg-slate-900 border-2 border-amber-400/40 shadow-xl flex flex-col items-center text-center space-y-2 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold font-mono uppercase tracking-wider">
        <Smartphone className="h-4 w-4" />
        <span>GABUNG VIA HP (SCAN QR)</span>
      </div>

      <div className="p-2 rounded-2xl bg-white shadow-inner">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="QR Code Arena Buzzer"
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg"
          />
        ) : (
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg bg-slate-100 flex items-center justify-center">
            <QrIcon className="h-8 w-8 text-slate-400 animate-pulse" />
          </div>
        )}
      </div>

      <div className="space-y-0.5">
        <span className="font-mono text-[11px] font-bold text-amber-300 block">
          /buzzer
        </span>
        <span className="text-[10px] text-white/60 block leading-tight">
          Tanpa login • Cukup masukkan nama
        </span>
      </div>
    </div>
  );
}
