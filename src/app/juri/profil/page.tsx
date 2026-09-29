"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getJudgeProfileData,
  updateJudgeProfileData,
  JudgeAssignedCompetition,
} from "@/app/actions/assessments";
import {
  User,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trophy,
  MapPin,
  ShieldCheck,
  Award,
  FileCheck2,
  FileClock,
  ExternalLink,
} from "lucide-react";

export default function JuriProfilPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [judgeId, setJudgeId] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [institution, setInstitution] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [assignedCompetitions, setAssignedCompetitions] = React.useState<
    JudgeAssignedCompetition[]
  >([]);
  const [stats, setStats] = React.useState({
    totalAssigned: 0,
    submittedAssessments: 0,
    draftAssessments: 0,
  });

  const loadProfile = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getJudgeProfileData();
      if (res.success && res.profile) {
        setJudgeId(res.profile.id);
        setFullName(res.profile.fullName);
        setTitle(res.profile.nickname || "");
        setInstitution(res.profile.institution || "");
        setPhone(res.profile.phone || "");
        setEmail(res.profile.email);
        setAvatarUrl(res.profile.avatarUrl);
        setAssignedCompetitions(res.assignedCompetitions);
        setStats(res.stats);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal memuat profil juri dari database.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan saat memuat data profil.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judgeId) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await updateJudgeProfileData({
        id: judgeId,
        fullName,
        institution,
        nickname: title,
        phone,
        newPassword: password || undefined,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: "Data profil dewan juri berhasil disimpan ke database!",
        });
        setPassword("");
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal memperbarui profil.",
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan sistem saat menyimpan.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout role="juri">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header Section */}
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <User className="h-7 w-7 text-accent" />
            <span>Profil Anggota Dewan Juri</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola data diri, kredensial akun penilai, dan daftar penugasan cabang lomba resmi.
          </p>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in-50 ${
              feedback.type === "success"
                ? "border-success/40 bg-success/10 text-success"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs text-muted-foreground">Memuat profil dan penugasan juri dari database...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4 flex items-center gap-3 border-border bg-card">
                <div className="p-2.5 rounded-lg bg-accent/10 text-accent">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground block">
                    Cabang Lomba Ditugaskan
                  </span>
                  <span className="text-xl font-bold font-heading text-foreground">
                    {stats.totalAssigned} Cabang
                  </span>
                </div>
              </Card>

              <Card className="p-4 flex items-center gap-3 border-border bg-card">
                <div className="p-2.5 rounded-lg bg-success/10 text-success">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground block">
                    Penilaian Final Terkirim
                  </span>
                  <span className="text-xl font-bold font-heading text-foreground">
                    {stats.submittedAssessments} Berkas
                  </span>
                </div>
              </Card>

              <Card className="p-4 flex items-center gap-3 border-border bg-card">
                <div className="p-2.5 rounded-lg bg-warning/10 text-warning">
                  <FileClock className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground block">
                    Draft Penilaian Tersimpan
                  </span>
                  <span className="text-xl font-bold font-heading text-foreground">
                    {stats.draftAssessments} Berkas
                  </span>
                </div>
              </Card>
            </div>

            {/* List Penugasan Cabang Lomba Resmi */}
            <Card className="p-6 border-border bg-card overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="gold" className="text-[10px]">
                      MATRIKS PENUGASAN JURI
                    </Badge>
                  </div>
                  <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                    <Award className="h-5 w-5 text-accent" />
                    <span>Daftar Cabang Lomba yang Ditugaskan</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Daftar cabang lomba resmi tempat Anda terdaftar sebagai dewan juri penilai.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cabang Lomba</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Peran Penilai</TableHead>
                      <TableHead>Lokasi & Panggung</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedCompetitions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                          Belum ada cabang lomba yang ditugaskan kepada Anda dalam sistem.
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignedCompetitions.map((comp) => (
                        <TableRow key={comp.id}>
                          <TableCell className="font-semibold text-foreground text-xs sm:text-sm">
                            {comp.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="info" className="text-[10px] uppercase font-mono">
                              {comp.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {comp.isChiefJudge ? (
                              <Badge variant="gold" className="text-[10px]">
                                ★ Ketua Dewan Juri
                              </Badge>
                            ) : (
                              <Badge variant="default" className="text-[10px]">
                                Anggota Juri
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-accent" />
                              {comp.stageName}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={comp.status === "aktif" ? "success" : "default"}
                              className="text-[10px]"
                            >
                              {comp.status === "aktif" ? "Aktif" : comp.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/juri/lomba/${comp.slug}`}>
                              <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5">
                                <span>Roster Peserta</span>
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Form Edit Profil Juri */}
            <Card className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="h-16 w-16 rounded-full object-cover border-2 border-accent bg-accent/10"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-accent uppercase font-bold">
                        Role: Dewan Juri Resmi
                      </span>
                      <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      {fullName || "Nama Dewan Juri"}
                    </h3>
                    <p className="text-xs text-muted-foreground">{email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nama Lengkap Beserta Gelar *"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

                  <Input
                    label="Jabatan Akademik / Portofolio Keahlian *"
                    placeholder="Contoh: Kepala Divisi Hukum / Dosen Sastra"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />

                  <Input
                    label="Instansi / Asal Lembaga *"
                    placeholder="Contoh: Institut Kesenian / Hukum dan Litbang"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    required
                  />

                  <Input
                    label="Nomor Telepon / WhatsApp"
                    placeholder="Contoh: 08123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />

                  <div className="sm:col-span-2">
                    <Input
                      label="Alamat Email Akun (Terdaftar)"
                      type="email"
                      value={email}
                      disabled
                      className="bg-muted/50 cursor-not-allowed"
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      Email akun dikelola terpusat oleh administrator panitia.
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <Input
                      label="Ubah Kata Sandi Baru (Opsional)"
                      type="password"
                      placeholder="Kosongkan bila tidak ingin mengubah kata sandi (minimal 6 karakter)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={saving}
                    className="text-xs font-semibold gap-2 cursor-pointer shadow-xs"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>{saving ? "Menyimpan Perubahan..." : "Simpan Perubahan Profil"}</span>
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
