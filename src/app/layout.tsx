import type { Metadata } from "next";
import { Instrument_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | GebyarBulanBahasa 2025",
    default: "GebyarBulanBahasa — Sistem Penilaian Digital & Dashboard Acara",
  },
  description:
    "Sistem Penilaian Digital dan Dashboard Operasional Acara Gebyar Bulan Bahasa dan Kebudayaan (Peringatan Hari Sumpah Pemuda). Tema: Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.",
  keywords: [
    "Gebyar Bulan Bahasa",
    "Sumpah Pemuda",
    "Lomba Puisi",
    "Lomba Film Pendek",
    "Lomba Pidato",
    "Penilaian Digital",
  ],
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

import { EventJsonLd } from "@/components/seo/JsonLd";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${instrumentSans.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground flex flex-col selection:bg-accent/20 selection:text-foreground">
        <EventJsonLd />
        {children}
      </body>
    </html>
  );
}
