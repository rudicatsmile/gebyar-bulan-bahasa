"use client";

import * as React from "react";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, Map } from "lucide-react";

export default function KontakPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [contactLocation, setContactLocation] = React.useState(
    "Gedung Kesenian & Pusat Kebudayaan Lt. 1, Ruang Panitia A."
  );
  const [contactHours, setContactHours] = React.useState(
    "07.30 - 21.00 WIB (Selama Acara Berlangsung)"
  );
  const [contactEmail, setContactEmail] = React.useState("panitia@gebyarbulanbahasa.id");
  const [contactPhone, setContactPhone] = React.useState("0812-3456-7890 (Seksi Acara)");
  const [contactStageMap, setContactStageMap] = React.useState(
    "• Panggung Utama (Stage A): Puisi, MC Formal, Vokal Grup\n• Ruang Bioskop Mini Lt. 2: Lomba Film Pendek\n• Aula Serbaguna: Pidato Bahasa Indonesia\n• Area Kreatif Selasar: Melukis Tas Kanvas\n• Ruang Teater A: Seni Teater Monolog\n• Pelataran Budaya: Seni Tradisi Palang Pintu Betawi"
  );

  React.useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.settings) {
          if (data.settings.contactLocation) setContactLocation(data.settings.contactLocation);
          if (data.settings.contactHours) setContactHours(data.settings.contactHours);
          if (data.settings.contactEmail) setContactEmail(data.settings.contactEmail);
          if (data.settings.contactPhone) setContactPhone(data.settings.contactPhone);
          if (data.settings.contactStageMap) setContactStageMap(data.settings.contactStageMap);
        }
      })
      .catch((err) => {
        console.warn("Gagal memuat pengaturan kontak:", err);
      });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  // Parse lines for denah panggung
  const stageMapLines = contactStageMap
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Parse raw phone number for WhatsApp link
  const rawPhoneDigits = contactPhone.replace(/[^0-9]/g, "");
  const waLink = rawPhoneDigits
    ? `https://wa.me/${rawPhoneDigits.startsWith("0") ? "62" + rawPhoneDigits.slice(1) : rawPhoneDigits}`
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="space-y-4 max-w-3xl">
            <Badge variant="gold" className="text-xs">
              Sekretariat & Bantuan
            </Badge>
            <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Hubungi Sekretariat Panitia
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Tim Seksi Acara dan Media Center siap membantu kebutuhan informasi lomba, pendaftaran, dan teknis pelaksanaan di lapangan.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Info Sekretariat */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="p-6 space-y-4 shadow-sm border border-border">
                <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Informasi Sekretariat Acara</span>
                </h3>
                <div className="space-y-3.5 text-xs text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Lokasi Sekretariat:</strong>
                      <span>{contactLocation}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Jam Layanan Operasional:</strong>
                      <span>{contactHours}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Email Resmi:</strong>
                      <a
                        href={`mailto:${contactEmail}`}
                        className="hover:text-accent underline underline-offset-2 transition-colors"
                      >
                        {contactEmail}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Narahubung (WhatsApp):</strong>
                      {waLink ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-accent underline underline-offset-2 transition-colors"
                        >
                          {contactPhone}
                        </a>
                      ) : (
                        <span>{contactPhone}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Denah Panggung Mini */}
              <Card className="p-6 space-y-3 bg-muted/30 border border-border">
                <h4 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                  <Map className="h-4 w-4 text-accent" />
                  <span>Denah Panggung & Lokasi Lomba</span>
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {stageMapLines.map((line, idx) => {
                    const cleanLine = line.replace(/^[•\-\*]\s*/, "");
                    const colonIndex = cleanLine.indexOf(":");
                    if (colonIndex !== -1) {
                      const title = cleanLine.substring(0, colonIndex);
                      const desc = cleanLine.substring(colonIndex + 1);
                      return (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-accent shrink-0">•</span>
                          <span>
                            <strong className="text-foreground font-semibold">{title.trim()}:</strong>{" "}
                            <span>{desc.trim()}</span>
                          </span>
                        </li>
                      );
                    }
                    return (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-accent shrink-0">•</span>
                        <span>{cleanLine}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>

            {/* Form Pesan */}
            <div className="lg:col-span-7">
              <Card className="p-6 sm:p-8 border border-border">
                {submitted ? (
                  <div className="text-center py-12 space-y-4">
                    <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
                    <h3 className="font-heading text-xl font-bold text-foreground">
                      Pesan Anda Telah Terkirim!
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Narahubung panitia akan segera merespons pesan Anda melalui email atau nomor telepon yang tertera.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSubmitted(false)}
                      className="text-xs cursor-pointer"
                    >
                      Kirim Pesan Lain
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      Kirim Pesan ke Panitia
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Nama Lengkap *" placeholder="Nama Anda" required />
                      <Input label="Email / Kontak *" placeholder="nama@email.com" required />
                    </div>

                    <Input
                      label="Subjek / Kategori *"
                      placeholder="Pertanyaan Lomba / Teknis / Poin"
                      required
                    />

                    <Textarea
                      label="Pesan Anda *"
                      placeholder="Tuliskan pertanyaan atau permohonan informasi Anda..."
                      rows={5}
                      required
                    />

                    <Button type="submit" size="lg" className="w-full text-xs font-semibold gap-2 cursor-pointer">
                      <Send className="h-4 w-4" />
                      <span>Kirimkan Pesan Sekarang</span>
                    </Button>
                  </form>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
