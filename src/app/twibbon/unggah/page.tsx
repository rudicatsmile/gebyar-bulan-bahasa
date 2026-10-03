"use client";

import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Camera, Upload, CheckCircle2, AlertCircle } from "lucide-react";

export default function UnggahTwibbonPage() {
  const [eventName, setEventName] = React.useState("Gebyar Bulan Bahasa dan Kebudayaan");
  const [eventYear, setEventYear] = React.useState("2026");
  const [fullName, setFullName] = React.useState("");
  const [institution, setInstitution] = React.useState("");
  const [regNumber, setRegNumber] = React.useState("");
  const [caption, setCaption] = React.useState("");
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.settings) {
          if (data.settings.eventName) {
            setEventName(data.settings.eventName);
          }
          if (data.settings.eventYear) {
            setEventYear(String(data.settings.eventYear));
          }
        }
      })
      .catch(() => { });
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Ukuran foto melebihi batas maksimal 5MB.");
        return;
      }
      setError("");
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !institution || !caption || !imagePreview) {
      setError("Silakan lengkapi seluruh kolom formulir dan unggah foto twibbon.");
      return;
    }
    setError("");
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div>
            <Link
              href="/galeri/twibbon"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Galeri Twibbon</span>
            </Link>
          </div>

          <div className="space-y-3 text-left">
            <Badge variant="gold" className="text-xs">
              Formulir Pengajuan Publik
            </Badge>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Unggah Foto Twibbon
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Kirimkan foto diri terbaikmu dengan bingkai resmi {eventName}. Foto akan melalui verifikasi tim Media Center sebelum tampil di galeri publik dan layar monitor venue.
            </p>
          </div>

          {submitted ? (
            <Card className="border-success/40 bg-success/5 p-8 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
              <div className="space-y-1">
                <h3 className="font-heading text-xl font-bold text-foreground">
                  Twibbon Berhasil Diajukan!
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Terima kasih, <strong>{fullName}</strong>. Foto twibbon Anda saat ini berada dalam antrean moderasi Media Center. Estimasi waktu moderasi &lt; 30 menit.
                </p>
              </div>
              <div className="pt-4 flex justify-center gap-3">
                <Link href="/galeri/twibbon">
                  <Button variant="outline" size="sm" className="text-xs">
                    Lihat Galeri Twibbon
                  </Button>
                </Link>
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setSubmitted(false);
                    setImagePreview(null);
                    setFullName("");
                    setInstitution("");
                    setRegNumber("");
                    setCaption("");
                  }}
                >
                  Unggah Foto Lain
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3.5 rounded-lg border border-danger/40 bg-danger/10 text-danger text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Upload Zone */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Unggah File Foto Twibbon (JPG / PNG / WebP, Maks. 5MB)
                  </label>
                  <div className="border-2 border-dashed border-border hover:border-accent rounded-xl p-6 text-center space-y-3 cursor-pointer transition-colors relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {imagePreview ? (
                      <div className="space-y-2">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-40 w-40 object-cover rounded-lg mx-auto border border-border shadow-xs"
                        />
                        <p className="text-xs text-accent font-semibold">Klik untuk mengganti foto</p>
                      </div>
                    ) : (
                      <div className="space-y-2 py-4">
                        <Camera className="h-8 w-8 text-muted-foreground mx-auto" />
                        <p className="text-xs font-semibold text-foreground">
                          Klik atau seret file gambar ke sini
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Format rasio 1:1 direkomendasikan
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Input
                  label="Nama Lengkap Pengunggah *"
                  placeholder="Contoh: Ahmad Fauzan Ramadhan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />

                <Input
                  label="Asal Sekolah / Instansi / Kampus *"
                  placeholder="Contoh: SMK Dinamika Pembangunan 2 Jakarta"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  required
                />

                <Input
                  label="Nomor Registrasi Peserta (Bila Mengikuti Lomba)"
                  placeholder="Contoh: GBB-PUI-014 (Opsional)"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  helperText="Kosongkan bila Anda pengunjung / penonton umum."
                />

                <Textarea
                  label="Pesan / Caption *"
                  placeholder="Tuliskan ucapan atau kutipan semangat pemuda Anda..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  required
                />

                <Button type="submit" size="lg" className="w-full text-xs font-semibold">
                  <Upload className="h-4 w-4 mr-1.5" />
                  <span>Kirimkan Twibbon untuk Moderasi</span>
                </Button>
              </form>
            </Card>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
