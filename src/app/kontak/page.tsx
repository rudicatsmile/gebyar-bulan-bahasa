"use client";

import * as React from "react";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from "lucide-react";

export default function KontakPage() {
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
              <Card className="p-6 space-y-4">
                <h3 className="font-heading text-lg font-bold text-foreground">
                  Informasi Sekretariat Acara
                </h3>
                <div className="space-y-3.5 text-xs text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Lokasi Sekretariat:</strong>
                      <span>Gedung Kesenian & Pusat Kebudayaan Lt. 1, Ruang Panitia A.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Jam Layanan Operasional:</strong>
                      <span>07.30 - 21.00 WIB (Selama Acara Berlangsung)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Email Resmi:</strong>
                      <span>panitia@gebyarbulanbahasa.id</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Narahubung (WhatsApp):</strong>
                      <span>0812-3456-7890 (Seksi Acara)</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Denah Panggung Mini */}
              <Card className="p-6 space-y-3 bg-muted/30">
                <h4 className="font-heading text-sm font-bold text-foreground">
                  Denah Panggung & Lokasi Lomba
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• <strong>Panggung Utama (Stage A):</strong> Puisi, MC Formal, Vokal Grup</li>
                  <li>• <strong>Ruang Bioskop Mini Lt. 2:</strong> Lomba Film Pendek</li>
                  <li>• <strong>Aula Serbaguna:</strong> Pidato Bahasa Indonesia</li>
                  <li>• <strong>Area Kreatif Selasar:</strong> Melukis Tas Kanvas</li>
                  <li>• <strong>Ruang Teater A:</strong> Seni Teater Monolog</li>
                  <li>• <strong>Pelataran Budaya:</strong> Seni Tradisi Palang Pintu Betawi</li>
                </ul>
              </Card>
            </div>

            {/* Form Pesan */}
            <div className="lg:col-span-7">
              <Card className="p-6 sm:p-8">
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
                      className="text-xs"
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

                    <Button type="submit" size="lg" className="w-full text-xs font-semibold gap-2">
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
