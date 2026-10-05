"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Judge } from "@/lib/dummy-data";
import { UserCheck, UserPlus, ShieldCheck, Mail, Sliders, Loader2, Pencil, Upload, X, ImageIcon, Camera } from "lucide-react";
import { getJudgeAssignmentData, createJudgeAccount, updateJudgeAccount } from "@/app/actions/competitions";
import { uploadJudgePhotoAction } from "@/app/actions/settings";

/** Sub-komponen: area upload foto juri */
function JudgePhotoUpload({
  currentUrl,
  onUploaded,
  label = "Foto Profil Juri",
}: {
  currentUrl: string;
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [preview, setPreview] = React.useState(currentUrl);

  // Sync preview bila currentUrl berubah dari luar (misal: reset form)
  React.useEffect(() => {
    setPreview(currentUrl);
  }, [currentUrl]);

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadJudgePhotoAction(fd);
      if (res.success && res.url) {
        setPreview(res.url);
        onUploaded(res.url);
      } else {
        setError(res.error || "Gagal mengunggah foto.");
      }
    } catch {
      setError("Terjadi kesalahan saat mengunggah foto.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-foreground block">{label}</label>

      {preview ? (
        /* Preview foto yang sudah diupload / existing */
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/40">
          <img
            src={preview}
            alt="Foto Juri"
            className="h-16 w-16 rounded-full object-cover border-2 border-accent/40 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">Foto terpasang</p>
            <p className="text-[11px] text-muted-foreground truncate">{preview}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-[11px] h-7 gap-1 cursor-pointer"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Camera className="h-3 w-3" />
              )}
              Ganti
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-[11px] h-7 text-muted-foreground hover:text-danger cursor-pointer"
              onClick={() => {
                setPreview("");
                onUploaded("");
              }}
            >
              <X className="h-3 w-3 mr-0.5" />
              Hapus
            </Button>
          </div>
        </div>
      ) : (
        /* Drop zone / tombol upload */
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-border hover:border-accent/60 bg-muted/30 hover:bg-accent/5 transition-colors cursor-pointer"
        >
          {uploading ? (
            <>
              <Loader2 className="h-7 w-7 text-accent animate-spin" />
              <span className="text-xs text-muted-foreground">Mengunggah foto...</span>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 border border-accent/20">
                <Upload className="h-5 w-5 text-accent" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-foreground">Klik atau seret foto ke sini</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG, WEBP · Maks 3MB</p>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-[11px] text-danger flex items-center gap-1">
          <X className="h-3 w-3" />{error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}

export default function DashboardJuriPage() {
  const [loading, setLoading] = React.useState(true);
  const [judges, setJudges] = React.useState<Judge[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  // Juri yang baru saja dibuat — dipakai untuk menampilkan ajakan menugaskan lomba.
  const [justAdded, setJustAdded] = React.useState<{ id: string; fullName: string } | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form states (Tambah Juri)
  const [fullName, setFullName] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [expertise, setExpertise] = React.useState("Sastra & Puisi");
  const [avatarUrl, setAvatarUrl] = React.useState("");

  // Form states (Edit Juri)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingJudge, setEditingJudge] = React.useState<Judge | null>(null);
  const [editFullName, setEditFullName] = React.useState("");
  const [editTitle, setEditTitle] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editExpertise, setEditExpertise] = React.useState("Sastra & Puisi");
  const [editAvatarUrl, setEditAvatarUrl] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);

  const loadJudges = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await getJudgeAssignmentData();
      if (res.success) {
        // Sumber data tunggal: tabel profiles (role='juri') + competition_judges.
        // Tidak ada penambalan data dummy — kalau DB kosong, tampilkan empty state.
        const mapped: Judge[] = res.judges.map((j) => {
          const assignedIds = res.assignments
            .filter((a) => a.judgeId === j.id)
            .map((a) => a.competitionId);
          const isChief = res.assignments.some((a) => a.judgeId === j.id && a.isChiefJudge);

          return {
            id: j.id,
            fullName: j.fullName,
            title: j.title || "Dewan Juri Ahli",
            email: j.email,
            expertise: j.expertise || "Belum ditetapkan",
            avatarUrl: j.avatarUrl || "",
            assignedCompetitionIds: assignedIds,
            isChiefJudge: isChief,
          };
        });
        setJudges(mapped);
        setLoadError(null);
      } else {
        setJudges([]);
        setLoadError(res.error || "Daftar juri gagal dimuat.");
      }
    } catch (err) {
      console.error("Gagal memuat juri:", err);
      setJudges([]);
      setLoadError("Daftar juri gagal dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadJudges();
  }, [loadJudges]);

  const handleAddJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await createJudgeAccount({
        fullName,
        email,
        expertise,
        title,
        avatarUrl: avatarUrl || undefined,
      });

      if (res.success) {
        await loadJudges();
        setJustAdded({ id: res.userId || "", fullName });
        setDialogOpen(false);
        setFullName("");
        setTitle("");
        setEmail("");
        setExpertise("Sastra & Puisi");
        setAvatarUrl("");
      } else {
        alert(res.error || "Gagal membuat akun dewan juri.");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menambahkan juri.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditDialog = (j: Judge) => {
    setEditingJudge(j);
    setEditFullName(j.fullName);
    setEditTitle(j.title || "");
    setEditEmail(j.email || "");
    setEditExpertise(j.expertise || "Sastra & Puisi");
    setEditAvatarUrl(j.avatarUrl || "");
    setEditDialogOpen(true);
  };

  const handleUpdateJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJudge) return;
    try {
      setIsUpdating(true);
      const res = await updateJudgeAccount({
        judgeId: editingJudge.id,
        fullName: editFullName,
        email: editEmail,
        title: editTitle,
        expertise: editExpertise,
        avatarUrl: editAvatarUrl,
      });

      if (res.success) {
        await loadJudges();
        setEditDialogOpen(false);
        setEditingJudge(null);
      } else {
        alert(res.error || "Gagal memperbarui data dewan juri.");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat memperbarui data juri.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Manajemen Dewan Juri Lomba
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Daftar dewan juri ahli bersertifikasi, bidang keahlian, dan status penugasan penjurian 8 cabang lomba.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/juri/penugasan">
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                <span>Matriks Penugasan Juri</span>
              </Button>
            </Link>
            <Button onClick={() => setDialogOpen(true)} size="sm" className="text-xs gap-1.5 cursor-pointer">
              <UserPlus className="h-4 w-4" />
              <span>Tambah Juri Baru</span>
            </Button>
          </div>
        </div>

        {justAdded && (
          <div className="p-3 rounded-xl border border-accent/30 bg-accent/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-foreground">
              Akun juri <strong>{justAdded.fullName}</strong> berhasil dibuat. Langkah berikutnya:
              tugaskan cabang lomba agar juri dapat mulai menilai peserta.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/dashboard/juri/penugasan">
                <Button size="sm" className="text-xs h-8 gap-1.5 cursor-pointer">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Tugaskan Lomba</span>
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-8 cursor-pointer"
                onClick={() => setJustAdded(null)}
              >
                <X className="h-3.5 w-3.5 mr-0.5" />
                <span>Tutup</span>
              </Button>
            </div>
          </div>
        )}

        {/* Daftar mobile (card list) */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat daftar juri...
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-danger">{loadError}</div>
          ) : judges.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-foreground">Belum ada dewan juri</p>
              <p className="text-xs">Klik &quot;Tambah Juri Baru&quot; untuk membuat akun juri.</p>
            </div>
          ) : (
            judges.map((j) => {
              const assignedCount = j.assignedCompetitionIds.length;
              return (
                <div key={j.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {j.avatarUrl ? (
                        <img src={j.avatarUrl} alt={j.fullName} className="h-10 w-10 rounded-full object-cover border border-border shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center shrink-0">
                          <UserCheck className="h-5 w-5 text-accent" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <strong className="text-foreground text-sm block truncate">{j.fullName}</strong>
                        <span className="text-[11px] text-muted-foreground block truncate">{j.title}</span>
                      </div>
                    </div>
                    <Badge variant={j.isChiefJudge ? "gold" : "default"} className="text-[10px] shrink-0">
                      {j.isChiefJudge ? "JURI UTAMA" : "ANGGOTA JURI"}
                    </Badge>
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <p className="text-foreground font-medium">{j.expertise}</p>
                    <p className="text-muted-foreground font-mono break-all">{j.email}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <span className="text-xs">
                      {assignedCount > 0 ? (
                        <span className="font-mono font-bold text-accent">{assignedCount} Cabang Lomba</span>
                      ) : (
                        <Link href="/dashboard/juri/penugasan" className="text-muted-foreground hover:text-accent underline decoration-dotted underline-offset-2">
                          Belum ditugaskan
                        </Link>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 cursor-pointer" onClick={() => handleOpenEditDialog(j)}>
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </Button>
                      <Link href="/dashboard/juri/penugasan">
                        <Button variant="outline" size="sm" className="text-xs h-8">Atur Tugas</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Tabel desktop */}
        <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profil Dewan Juri</TableHead>
                <TableHead>Bidang Keahlian</TableHead>
                <TableHead>Kontak Email</TableHead>
                <TableHead className="text-center">Peran Penugasan</TableHead>
                <TableHead className="text-center">Lomba Ditugaskan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat daftar juri...
                    </div>
                  </TableCell>
                </TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center">
                    <p className="text-sm text-danger">{loadError}</p>
                  </TableCell>
                </TableRow>
              ) : judges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <UserCheck className="h-8 w-8 opacity-60" />
                      <p className="text-sm font-semibold text-foreground">Belum ada dewan juri</p>
                      <p className="text-xs max-w-sm">
                        Klik &quot;Tambah Juri Baru&quot; untuk membuat akun juri. Akun juri dibuat dari modul
                        pengguna dan otomatis tampil di halaman Pengguna.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                judges.map((j) => {
                const assignedCount = j.assignedCompetitionIds.length;
                return (
                  <TableRow key={j.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {j.avatarUrl ? (
                          <img
                            src={j.avatarUrl}
                            alt={j.fullName}
                            className="h-9 w-9 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center shrink-0">
                            <UserCheck className="h-4 w-4 text-accent" />
                          </div>
                        )}
                        <div>
                          <strong className="text-foreground text-xs sm:text-sm block">
                            {j.fullName}
                          </strong>
                          <span className="text-[11px] text-muted-foreground">{j.title}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-foreground font-medium">
                      {j.expertise}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {j.email}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={j.isChiefJudge ? "gold" : "default"}
                        className="text-[10px]"
                      >
                        {j.isChiefJudge ? "JURI UTAMA" : "ANGGOTA JURI"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {assignedCount > 0 ? (
                        <span className="font-mono font-bold text-accent">{assignedCount} Cabang Lomba</span>
                      ) : (
                        <Link
                          href="/dashboard/juri/penugasan"
                          className="inline-flex items-center text-muted-foreground hover:text-accent underline decoration-dotted underline-offset-2"
                        >
                          Belum ditugaskan
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 gap-1.5 cursor-pointer hover:border-accent hover:text-accent"
                          onClick={() => handleOpenEditDialog(j)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </Button>
                        <Link href="/dashboard/juri/penugasan">
                          <Button variant="outline" size="sm" className="text-xs h-8">
                            Atur Tugas
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Modal Tambah Juri */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <form onSubmit={handleAddJudge} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Buat Akun Dewan Juri Baru</DialogTitle>
              <DialogDescription>
                Masukkan biodata, bidang keahlian, dan alamat email aktif untuk pembuatan akun penilai digital.
              </DialogDescription>
            </DialogHeader>

            {/* Upload Foto */}
            <JudgePhotoUpload
              currentUrl={avatarUrl}
              onUploaded={setAvatarUrl}
              label="Foto Profil Juri (Opsional)"
            />

            <Input
              label="Nama Lengkap Beserta Gelar *"
              placeholder="Contoh: Dr. Siti Nurhaliza M.Pd."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Bidang Keahlian *"
              placeholder="Contoh: Sastra & Puisi"
              list="bidang-keahlian-list-add"
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              required
            />
            <datalist id="bidang-keahlian-list-add">
              <option value="Sastra & Puisi" />
              <option value="Sinematografi & Film" />
              <option value="Public Speaking & MC" />
              <option value="Seni Rupa & Kriya" />
              <option value="Teater & Monolog" />
              <option value="Tradisi Betawi & Palang Pintu" />
              <option value="Musik & Vokal" />
            </datalist>

            <Input
              label="Jabatan / Instansi / Portofolio *"
              placeholder="Contoh: Dosen Sastra Indonesia Universitas Negeri"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Input
              label="Alamat Email Akun *"
              type="email"
              placeholder="juri@instansi.ac.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Membuat Akun...</span>
                  </>
                ) : (
                  "Buat Akun Juri"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal Edit Juri */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <form onSubmit={handleUpdateJudge} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Edit Profil Dewan Juri</DialogTitle>
              <DialogDescription>
                Perbarui biodata, foto, bidang keahlian, dan jabatan akun dewan juri.
              </DialogDescription>
            </DialogHeader>

            {/* Upload / Ganti Foto */}
            <JudgePhotoUpload
              currentUrl={editAvatarUrl}
              onUploaded={setEditAvatarUrl}
              label="Foto Profil Juri"
            />

            <Input
              label="Nama Lengkap Beserta Gelar *"
              placeholder="Contoh: Dr. Siti Nurhaliza M.Pd."
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              required
            />

            <Input
              label="Bidang Keahlian *"
              placeholder="Contoh: Sastra & Puisi"
              list="bidang-keahlian-list-edit"
              value={editExpertise}
              onChange={(e) => setEditExpertise(e.target.value)}
              required
            />
            <datalist id="bidang-keahlian-list-edit">
              <option value="Sastra & Puisi" />
              <option value="Sinematografi & Film" />
              <option value="Public Speaking & MC" />
              <option value="Seni Rupa & Kriya" />
              <option value="Teater & Monolog" />
              <option value="Tradisi Betawi & Palang Pintu" />
              <option value="Musik & Vokal" />
            </datalist>

            <Input
              label="Jabatan / Instansi / Portofolio *"
              placeholder="Contoh: Dosen Sastra Indonesia Universitas Negeri"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />

            <Input
              label="Alamat Email Akun *"
              type="email"
              placeholder="juri@instansi.ac.id"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              required
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingJudge(null);
                }}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Menyimpan Perubahan...</span>
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
