"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import type { Competition } from "@/lib/dummy-data";
import {
  toggleCompetitionStatus,
  createCompetitionAdmin,
  updateCompetitionAdmin,
  deleteOrArchiveCompetitionAdmin,
} from "@/app/actions/competitions";
import {
  Sliders,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Archive,
  Trophy,
  MoreVertical,
  Eye,
  ClipboardList,
  RotateCw,
  BookOpen,
  Mic,
} from "lucide-react";

/**
 * Menentukan apakah sebuah cabang lomba memerlukan input Pilihan Naskah
 * berdasarkan slug atau kata kunci nama lomba.
 */
export function isManuscriptEligible(slug: string, name?: string): boolean {
  const eligibleSlugs = [
    "membaca-puisi",
    "pidato",
    "monolog",
    "mc-formal",
    "cipta-puisi",
    "esai",
    "baca-berita",
    "storytelling",
  ];
  const s = (slug || "").toLowerCase();
  const n = (name || "").toLowerCase();

  if (eligibleSlugs.some((es) => s.includes(es))) return true;

  const keywords = ["puisi", "pidato", "monolog", "mc", "teater", "naskah", "orasi", "esai", "cerpen"];
  return keywords.some((kw) => s.includes(kw) || n.includes(kw));
}

/**
 * Menentukan apakah sebuah cabang lomba memerlukan input Format Acara yang dibawakan
 * (misalnya MC Formal / Pembawa Acara / Protokoler / Presenter / Moderator / Penyiar)
 * berdasarkan slug atau kata kunci nama lomba.
 */
export function isEventFormatEligible(slug: string, name?: string): boolean {
  const eligibleSlugs = [
    "mc-formal",
    "mc",
    "pembawa-acara",
    "protokoler",
    "presenter",
    "moderator",
    "penyiar",
    "host",
  ];
  const s = (slug || "").toLowerCase();
  const n = (name || "").toLowerCase();

  if (eligibleSlugs.some((es) => s.includes(es))) return true;

  const keywords = ["mc", "pembawa acara", "protokoler", "presenter", "moderator", "penyiar", "host"];
  return keywords.some((kw) => s.includes(kw) || n.includes(kw));
}

interface CompetitionActionMenuProps {
  comp: Competition;
  index: number;
  total: number;
  isUpdating: boolean;
  onToggleStatus: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CompetitionActionMenu({
  comp,
  index,
  total,
  isUpdating,
  onToggleStatus,
  onEdit,
  onDelete,
}: CompetitionActionMenuProps) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside or Escape key
  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Determine dropup vs dropdown: open upwards if row is near bottom
  const isDropup = total > 3 && index >= total - 2;

  // Next status preview label
  const nextStatusLabel =
    comp.status === "pendaftaran"
      ? "Mulai Lomba (Live)"
      : comp.status === "berlangsung"
      ? "Selesaikan Lomba"
      : "Buka Pendaftaran";

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={cn(
          "h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 inline-flex items-center justify-center cursor-pointer transition-colors focus-visible:ring-1 focus-visible:ring-accent",
          open && "bg-muted text-foreground ring-1 ring-border shadow-xs"
        )}
        title="Opsi Aksi Lomba"
        aria-label={`Menu aksi untuk ${comp.name}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {open && (
        <div
          className={cn(
            "absolute right-0 z-50 min-w-[220px] w-max rounded-xl border border-border bg-card/98 backdrop-blur-md p-1.5 shadow-xl text-foreground animate-in fade-in-50 zoom-in-95",
            isDropup ? "bottom-full mb-1.5 origin-bottom-right" : "top-full mt-1.5 origin-top-right"
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header Info Singkat */}
          <div className="px-2.5 py-1.5 border-b border-border/60 mb-1">
            <p className="text-[11px] font-semibold text-foreground truncate max-w-[200px]">
              {comp.name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Aksi & Operasional
            </p>
          </div>

          {/* Group 1: Navigasi Utama */}
          <Link
            href={`/dashboard/penilaian/${comp.id}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-accent/10 hover:text-accent transition-colors"
            role="menuitem"
          >
            <ClipboardList className="h-4 w-4 text-accent shrink-0" />
            <div className="flex flex-col text-left">
              <span>Input / Penilaian</span>
              <span className="text-[10px] text-muted-foreground font-normal">Lembar skor juri</span>
            </div>
          </Link>

          <Link
            href={`/dashboard/lomba/${comp.slug}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-muted transition-colors"
            role="menuitem"
          >
            <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col text-left">
              <span>Pantau Lomba</span>
              <span className="text-[10px] text-muted-foreground font-normal">Leaderboard & peserta</span>
            </div>
          </Link>

          <div className="h-px bg-border/60 my-1" />

          {/* Group 2: Status & Edit */}
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => {
              setOpen(false);
              onToggleStatus();
            }}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-muted transition-colors text-left disabled:opacity-50 cursor-pointer"
            role="menuitem"
          >
            <div className="flex items-center gap-2.5">
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin text-accent shrink-0" />
              ) : (
                <RotateCw className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex flex-col text-left">
                <span>Ubah Status</span>
                <span className="text-[10px] text-accent font-normal">{nextStatusLabel}</span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-muted transition-colors text-left cursor-pointer"
            role="menuitem"
          >
            <Edit2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col text-left">
              <span>Edit Lomba</span>
              <span className="text-[10px] text-muted-foreground font-normal">Nama, juknis, venue & kuota</span>
            </div>
          </button>

          <div className="h-px bg-border/60 my-1" />

          {/* Group 3: Hapus / Arsipkan */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
            role="menuitem"
          >
            <Trash2 className="h-4 w-4 text-destructive shrink-0" />
            <div className="flex flex-col text-left">
              <span>Hapus / Arsipkan</span>
              <span className="text-[10px] text-destructive/80 font-normal">Hapus atau nonaktifkan</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

interface LombaManageClientProps {
  initialCompetitions: Competition[];
}

export function LombaManageClient({ initialCompetitions }: LombaManageClientProps) {
  const router = useRouter();
  const [competitions, setCompetitions] = React.useState<Competition[]>(initialCompetitions);
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);
  const [notification, setNotification] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal Tambah Lomba
  const [addOpen, setAddOpen] = React.useState(false);
  const [addName, setAddName] = React.useState("");
  const [addShortName, setAddShortName] = React.useState("");
  const [addCategory, setAddCategory] = React.useState<"individu" | "kelompok">("individu");
  const [addMinMembers, setAddMinMembers] = React.useState(2);
  const [addMaxMembers, setAddMaxMembers] = React.useState(10);
  const [addVenue, setAddVenue] = React.useState("Panggung Utama");
  const [addStage, setAddStage] = React.useState("");
  const [addAggregation, setAddAggregation] = React.useState<"rata_rata" | "total" | "rata_rata_buang_ekstrem">("rata_rata");
  const [addMaxParticipants, setAddMaxParticipants] = React.useState(20);
  const [addDescription, setAddDescription] = React.useState("");
  const [addRules, setAddRules] = React.useState("");
  const [addNeedsManuscripts, setAddNeedsManuscripts] = React.useState(false);
  const [addManuscripts, setAddManuscripts] = React.useState("");
  const [addNeedsEventFormats, setAddNeedsEventFormats] = React.useState(false);
  const [addEventFormats, setAddEventFormats] = React.useState("");
  const [addStatus, setAddStatus] = React.useState<"draft" | "pendaftaran">("pendaftaran");
  const [isSubmittingAdd, setIsSubmittingAdd] = React.useState(false);

  // Modal Edit Lomba
  const [editOpen, setEditOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Competition | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editShortName, setEditShortName] = React.useState("");
  const [editCategory, setEditCategory] = React.useState<"individu" | "kelompok">("individu");
  const [editMinMembers, setEditMinMembers] = React.useState(2);
  const [editMaxMembers, setEditMaxMembers] = React.useState(10);
  const [editVenue, setEditVenue] = React.useState("Panggung Utama");
  const [editStage, setEditStage] = React.useState("");
  const [editAggregation, setEditAggregation] = React.useState<"rata_rata" | "total" | "rata_rata_buang_ekstrem">("rata_rata");
  const [editMaxParticipants, setEditMaxParticipants] = React.useState(20);
  const [editDescription, setEditDescription] = React.useState("");
  const [editRules, setEditRules] = React.useState("");
  const [editNeedsManuscripts, setEditNeedsManuscripts] = React.useState(false);
  const [editManuscripts, setEditManuscripts] = React.useState("");
  const [editNeedsEventFormats, setEditNeedsEventFormats] = React.useState(false);
  const [editEventFormats, setEditEventFormats] = React.useState("");
  const [editStatus, setEditStatus] = React.useState<"draft" | "pendaftaran" | "berlangsung" | "selesai" | "dibatalkan">("pendaftaran");
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);

  // Auto-detect jika nama di Modal Tambah Lomba cocok dengan kategori berbasis naskah atau format acara
  React.useEffect(() => {
    if (addOpen && !addNeedsManuscripts && isManuscriptEligible("", addName)) {
      setAddNeedsManuscripts(true);
    }
  }, [addName, addOpen, addNeedsManuscripts]);

  React.useEffect(() => {
    if (addOpen && !addNeedsEventFormats && isEventFormatEligible("", addName)) {
      setAddNeedsEventFormats(true);
    }
  }, [addName, addOpen, addNeedsEventFormats]);

  // Modal Hapus / Arsip
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Competition | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = React.useState(false);

  // Sync state whenever initialCompetitions updates from server revalidation
  React.useEffect(() => {
    setCompetitions(initialCompetitions);
  }, [initialCompetitions]);

  // Auto-dismiss notification after 4 seconds
  React.useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const toggleStatus = async (id: string, currentStatus: string, competitionName: string) => {
    const nextStatus: "pendaftaran" | "berlangsung" | "selesai" =
      currentStatus === "pendaftaran"
        ? "berlangsung"
        : currentStatus === "berlangsung"
        ? "selesai"
        : "pendaftaran";

    // Optimistic UI update
    setCompetitions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
    );

    setIsUpdating(id);
    setNotification(null);

    try {
      const res = await toggleCompetitionStatus(id, nextStatus);

      if (!res.success) {
        setCompetitions((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: currentStatus as any } : c))
        );
        setNotification({
          type: "error",
          message: `Gagal memperbarui status ${competitionName}: ${res.error || "Terjadi kesalahan"}`,
        });
      } else {
        setNotification({
          type: "success",
          message: `Status "${competitionName}" berhasil disimpan: ${nextStatus.toUpperCase()}`,
        });
        router.refresh();
      }
    } catch (err) {
      console.error("Gagal update status lomba:", err);
      setCompetitions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: currentStatus as any } : c))
      );
      const errorDetail = err instanceof Error ? err.message : String(err);
      setNotification({
        type: "error",
        message: `Terjadi kendala saat memperbarui status ${competitionName}: ${errorDetail}`,
      });
    } finally {
      setIsUpdating(null);
    }
  };

  // Open Edit Modal
  const openEdit = (comp: Competition) => {
    setEditTarget(comp);
    setEditName(comp.name);
    setEditShortName(comp.shortName);
    setEditCategory(comp.category);
    setEditMinMembers(comp.minMembers || 2);
    setEditMaxMembers(comp.maxMembers || 10);
    setEditVenue(comp.venue || "Panggung Utama");
    setEditStage(comp.stage && comp.stage !== "Stage A" ? comp.stage : comp.stage || "");
    setEditAggregation(comp.aggregation || "rata_rata");
    setEditMaxParticipants(comp.maxParticipants || 20);
    setEditDescription(comp.description || "");
    setEditRules(
      comp.rules && Array.isArray(comp.rules) && comp.rules.length > 0
        ? comp.rules.join("\n")
        : ""
    );

    // Conditional Pilihan Naskah
    const hasExistingManuscripts = Boolean(
      comp.manuscripts && Array.isArray(comp.manuscripts) && comp.manuscripts.length > 0
    );
    const eligible = isManuscriptEligible(comp.slug, comp.name) || hasExistingManuscripts;
    setEditNeedsManuscripts(eligible);
    setEditManuscripts(
      comp.manuscripts && Array.isArray(comp.manuscripts) && comp.manuscripts.length > 0
        ? comp.manuscripts.join("\n")
        : ""
    );

    // Conditional Format Acara yang dibawakan
    const hasExistingEventFormats = Boolean(
      comp.eventFormats && Array.isArray(comp.eventFormats) && comp.eventFormats.length > 0
    );
    const eligibleEventFormat = isEventFormatEligible(comp.slug, comp.name) || hasExistingEventFormats;
    setEditNeedsEventFormats(eligibleEventFormat);
    setEditEventFormats(
      comp.eventFormats && Array.isArray(comp.eventFormats) && comp.eventFormats.length > 0
        ? comp.eventFormats.join("\n")
        : ""
    );

    const mappedStatus = comp.status === "terjadwal" ? "pendaftaran" : comp.status;
    setEditStatus(mappedStatus);
    setEditOpen(true);
  };

  // Handle Submit Edit
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      setIsSubmittingEdit(true);
      const combinedVenue = editStage.trim()
        ? `${editVenue.trim()} | ${editStage.trim()}`
        : editVenue.trim();

      const res = await updateCompetitionAdmin({
        id: editTarget.id,
        name: editName,
        shortName: editShortName,
        slug: editTarget.slug,
        category: editCategory,
        minMembers: editMinMembers,
        maxMembers: editMaxMembers,
        venue: combinedVenue,
        aggregation: editAggregation,
        maxParticipants: editMaxParticipants,
        description: editDescription,
        rules: editRules,
        manuscripts: editNeedsManuscripts ? editManuscripts : "",
        eventFormats: editNeedsEventFormats ? editEventFormats : "",
        status: editStatus,
      });

      if (res.success) {
        const updatedRules = editRules
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean);

        const updatedManuscripts = editNeedsManuscripts
          ? editManuscripts
              .split("\n")
              .map((m) => m.trim())
              .filter(Boolean)
          : [];

        const updatedEventFormats = editNeedsEventFormats
          ? editEventFormats
              .split("\n")
              .map((ef) => ef.trim())
              .filter(Boolean)
          : [];

        setCompetitions((prev) =>
          prev.map((c) =>
            c.id === editTarget.id
              ? {
                  ...c,
                  name: editName,
                  shortName: editShortName,
                  category: editCategory,
                  minMembers: editMinMembers,
                  maxMembers: editMaxMembers,
                  venue: editVenue.trim(),
                  stage: editStage.trim(),
                  aggregation: editAggregation,
                  maxParticipants: editMaxParticipants,
                  description: editDescription,
                  rules: updatedRules,
                  manuscripts: updatedManuscripts,
                  eventFormats: updatedEventFormats,
                  status: editStatus,
                }
              : c
          )
        );
        setEditOpen(false);
        setNotification({
          type: "success",
          message: `Perubahan cabang lomba "${editName}" berhasil disimpan!`,
        });
        router.refresh();
      } else {
        alert(res.error || "Gagal memperbarui data lomba.");
      }
    } catch {
      alert("Terjadi kesalahan saat memperbarui data lomba.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Submit Add
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingAdd(true);
      const combinedVenue = addStage.trim()
        ? `${addVenue.trim()} | ${addStage.trim()}`
        : addVenue.trim();

      const res = await createCompetitionAdmin({
        name: addName,
        shortName: addShortName,
        category: addCategory,
        minMembers: addMinMembers,
        maxMembers: addMaxMembers,
        venue: combinedVenue,
        aggregation: addAggregation,
        maxParticipants: addMaxParticipants,
        description: addDescription,
        rules: addRules,
        manuscripts: addNeedsManuscripts ? addManuscripts : "",
        eventFormats: addNeedsEventFormats ? addEventFormats : "",
        status: addStatus,
      });

      if (res.success) {
        setAddOpen(false);
        setAddName("");
        setAddShortName("");
        setAddDescription("");
        setAddRules("");
        setAddManuscripts("");
        setAddNeedsManuscripts(false);
        setAddEventFormats("");
        setAddNeedsEventFormats(false);
        setNotification({
          type: "success",
          message: `Cabang lomba baru "${addName}" berhasil ditambahkan ke database!`,
        });
        router.refresh();
      } else {
        alert(res.error || "Gagal menambahkan cabang lomba.");
      }
    } catch {
      alert("Terjadi kesalahan saat menambahkan cabang lomba.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handle Delete or Archive
  const handleDeleteOrArchive = async (mode: "archive" | "delete") => {
    if (!deleteTarget) return;

    try {
      setIsSubmittingDelete(true);
      const res = await deleteOrArchiveCompetitionAdmin(deleteTarget.id, mode);

      if (res.success) {
        setDeleteOpen(false);
        setNotification({
          type: "success",
          message:
            mode === "archive"
              ? `Cabang lomba "${deleteTarget.name}" berhasil diarsipkan / dibatalkan.`
              : `Cabang lomba "${deleteTarget.name}" berhasil dihapus permanen.`,
        });
        router.refresh();
      } else {
        alert(res.error || "Gagal memproses penghapusan lomba.");
      }
    } catch {
      alert("Terjadi kesalahan sistem saat memproses penghapusan.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Trophy className="h-7 w-7 text-accent" />
              <span>Monitoring Cabang Lomba</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Kendali operasional, status pelaksanaan lomba real-time di Supabase, dan akses langsung ke rekapitulasi penilaian digital.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/kriteria">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 cursor-pointer">
                <Sliders className="h-3.5 w-3.5" />
                <span>Kriteria Penilaian</span>
              </Button>
            </Link>
            <Button
              onClick={() => setAddOpen(true)}
              size="sm"
              className="text-xs gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Lomba Baru</span>
            </Button>
          </div>
        </div>

        {notification && (
          <div
            className={`p-3.5 rounded-lg flex items-center gap-2 text-xs border ${
              notification.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cabang Lomba</TableHead>
                <TableHead className="text-center w-28">Kategori</TableHead>
                <TableHead>Venue & Panggung</TableHead>
                <TableHead className="text-center">Kriteria</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right pr-4 w-16">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitions.map((comp, index) => {
                const statusVariant =
                  comp.status === "berlangsung"
                    ? "live"
                    : comp.status === "selesai"
                    ? "success"
                    : comp.status === "pendaftaran"
                    ? "warning"
                    : comp.status === "dibatalkan"
                    ? "danger"
                    : "default";

                return (
                  <TableRow key={comp.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground text-sm flex items-center gap-2 flex-wrap">
                        <span>{comp.name}</span>
                        {comp.manuscripts && comp.manuscripts.length > 0 && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-normal"
                            title={`${comp.manuscripts.length} Pilihan Naskah Tersedia`}
                          >
                            <BookOpen className="h-3 w-3" />
                            <span>{comp.manuscripts.length} Naskah</span>
                          </span>
                        )}
                        {comp.eventFormats && comp.eventFormats.length > 0 && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-normal"
                            title={`${comp.eventFormats.length} Pilihan Format Acara Tersedia`}
                          >
                            <Mic className="h-3 w-3" />
                            <span>{comp.eventFormats.length} Format Acara</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Agregasi: {comp.aggregation.replace(/_/g, " ")}
                      </span>
                    </TableCell>

                    {/* Kolom Kategori dengan Badge jelas */}
                    <TableCell className="text-center">
                      <Badge
                        variant={comp.category === "kelompok" ? "warning" : "default"}
                        className="text-[10px] uppercase font-mono font-bold"
                      >
                        {comp.category}
                      </Badge>
                      {comp.category === "kelompok" && (
                        <span className="block text-[10px] text-muted-foreground mt-0.5">
                          {comp.minMembers}-{comp.maxMembers} org
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      <strong className="text-foreground">{comp.venue}</strong>
                      {comp.stage ? <span className="block text-[11px]">{comp.stage}</span> : null}
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs">
                      {comp.criteria.length} kriteria (100%)
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant={statusVariant} className="text-[10px]">
                        {comp.status === "berlangsung"
                          ? "LIVE SEKARANG"
                          : comp.status === "selesai"
                          ? "SELESAI"
                          : comp.status === "pendaftaran"
                          ? "PENDAFTARAN DIBUKA"
                          : comp.status === "dibatalkan"
                          ? "DIBATALKAN"
                          : "DRAFT"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <CompetitionActionMenu
                        comp={comp}
                        index={index}
                        total={competitions.length}
                        isUpdating={isUpdating === comp.id}
                        onToggleStatus={() => toggleStatus(comp.id, comp.status, comp.name)}
                        onEdit={() => openEdit(comp)}
                        onDelete={() => {
                          setDeleteTarget(comp);
                          setDeleteOpen(true);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Modal TAMBAH Lomba Baru */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <form onSubmit={handleAdd} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Tambah Cabang Lomba Baru</DialogTitle>
              <DialogDescription>
                Daftarkan cabang perlombaan baru ke database acara Gebyar Bulan Bahasa.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <Input
                label="Nama Lengkap Lomba *"
                placeholder="Contoh: Cipta Puisi Digital"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                required
              />
              <Input
                label="Nama Singkat / Label *"
                placeholder="Contoh: Cipta Puisi"
                value={addShortName}
                onChange={(e) => setAddShortName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Kategori Perlombaan *
                </label>
                <select
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value as "individu" | "kelompok")}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
                >
                  <option value="individu">Individu (Peserta Tunggal)</option>
                  <option value="kelompok">Kelompok / Beregu (Tim)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Metode Agregasi Nilai *
                </label>
                <select
                  value={addAggregation}
                  onChange={(e) => setAddAggregation(e.target.value as any)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
                >
                  <option value="rata_rata">Rata-Rata Standar (Mean)</option>
                  <option value="total">Total Akumulasi (Sum)</option>
                  <option value="rata_rata_buang_ekstrem">Rata-Rata Buang Ekstrem (Olympic Scoring)</option>
                </select>
              </div>
            </div>

            {addCategory === "kelompok" && (
              <div className="grid grid-cols-2 gap-3 text-left p-3 rounded-lg border border-accent/20 bg-accent/5">
                <Input
                  label="Minimal Anggota Tim *"
                  type="number"
                  min={2}
                  max={20}
                  value={addMinMembers}
                  onChange={(e) => setAddMinMembers(Number(e.target.value))}
                  required
                />
                <Input
                  label="Maksimal Anggota Tim *"
                  type="number"
                  min={addMinMembers}
                  max={30}
                  value={addMaxMembers}
                  onChange={(e) => setAddMaxMembers(Number(e.target.value))}
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <Input
                label="Venue / Ruangan *"
                placeholder="Panggung Utama / Aula Serbaguna"
                value={addVenue}
                onChange={(e) => setAddVenue(e.target.value)}
                required
              />
              <Input
                label="Nama Panggung / Stage"
                placeholder="Contoh: Stage A / Podium Utama"
                value={addStage}
                onChange={(e) => setAddStage(e.target.value)}
              />
            </div>

            <div className="text-left">
              <Input
                label="Batas Maksimal Peserta / Tim"
                type="number"
                min={1}
                max={100}
                value={addMaxParticipants}
                onChange={(e) => setAddMaxParticipants(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Deskripsi Singkat Lomba
              </label>
              <textarea
                rows={2}
                placeholder="Ketentuan umum perlombaan..."
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Petunjuk Teknis & Peraturan Lomba (Opsional)</span>
                <span className="text-[10px] text-muted-foreground/80 font-normal">1 baris = 1 poin</span>
              </label>
              <textarea
                rows={4}
                placeholder="Tuliskan peraturan per baris, contoh:&#10;Karya orisinal dan belum pernah dilombakan&#10;Durasi video 5-10 menit&#10;Format MP4 Full HD 1080p"
                value={addRules}
                onChange={(e) => setAddRules(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent font-sans leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground">
                Tekan <strong>Enter</strong> untuk membuat baris aturan baru.
              </p>
            </div>

            {/* Conditional: Pilihan Naskah (Hanya untuk Lomba Tertentu) */}
            {addNeedsManuscripts ? (
              <div className="space-y-2 text-left p-3.5 rounded-xl border border-accent/30 bg-accent/5 transition-all">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-accent flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    <span>Pilihan Naskah Lomba</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
                    Khusus Lomba Berbasis Naskah
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Daftar judul puisi wajib/pilihan, naskah lakon drama monolog, atau tema naskah pidato/protokoler bagi peserta.
                </p>
                <textarea
                  rows={4}
                  placeholder={"Contoh:\nAku — Karya Chairil Anwar\nDiponegoro — Karya Chairil Anwar\nKarawang-Bekasi — Karya Chairil Anwar"}
                  value={addManuscripts}
                  onChange={(e) => setAddManuscripts(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent font-sans leading-relaxed"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    Tekan <strong>Enter</strong> untuk poin naskah baru (1 baris = 1 naskah).
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAddNeedsManuscripts(false);
                      setAddManuscripts("");
                    }}
                    className="text-[11px] text-muted-foreground hover:text-destructive underline decoration-dotted cursor-pointer"
                  >
                    Batal sertakan naskah
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-left pt-1">
                <button
                  type="button"
                  onClick={() => setAddNeedsManuscripts(true)}
                  className="text-xs text-accent hover:underline inline-flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>+ Sertakan Pilihan Naskah untuk lomba ini</span>
                </button>
              </div>
            )}

            {/* Conditional: Format Acara yang dibawakan (Hanya untuk Lomba Tertentu seperti MC/Pembawa Acara) */}
            {addNeedsEventFormats ? (
              <div className="space-y-2 text-left p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 transition-all">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Mic className="h-4 w-4" />
                    <span>Format Acara yang Dibawakan</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                    Khusus Lomba MC &amp; Pembawa Acara
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Daftar format, tema agenda acara, atau simulasi keprotokoleran yang dapat dipilih atau dibawakan oleh peserta.
                </p>
                <textarea
                  rows={3}
                  placeholder={"Contoh:\nUpacara Protokoler Peringatan Hari Sumpah Pemuda Tingkat Nasional\nSeminar Nasional Bahasa dan Diplomasi Budaya Nusantara\nMalam Penganugerahan Juara & Resepsi Kebudayaan"}
                  value={addEventFormats}
                  onChange={(e) => setAddEventFormats(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans leading-relaxed"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    Tekan <strong>Enter</strong> untuk format acara baru (1 baris = 1 format acara).
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAddNeedsEventFormats(false);
                      setAddEventFormats("");
                    }}
                    className="text-[11px] text-muted-foreground hover:text-destructive underline decoration-dotted cursor-pointer"
                  >
                    Batal sertakan format acara
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-left pt-1">
                <button
                  type="button"
                  onClick={() => setAddNeedsEventFormats(true)}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>+ Sertakan Format Acara yang dibawakan untuk lomba ini</span>
                </button>
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status Awal Lomba *
              </label>
              <select
                value={addStatus}
                onChange={(e) => setAddStatus(e.target.value as any)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
              >
                <option value="pendaftaran">Pendaftaran Dibuka</option>
                <option value="draft">Draft (Disembunyikan)</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmittingAdd || !addName || !addShortName}>
                {isSubmittingAdd ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Menambahkan...</span>
                  </>
                ) : (
                  "Simpan Lomba Baru"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal EDIT Lomba */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Edit Konfigurasi Cabang Lomba</DialogTitle>
              <DialogDescription>
                Ubah nama, kategori (individu/kelompok), venue, dan metode perhitungan skor lomba.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <Input
                label="Nama Lengkap Lomba *"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
              <Input
                label="Nama Singkat / Label *"
                value={editShortName}
                onChange={(e) => setEditShortName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Kategori Perlombaan *
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as "individu" | "kelompok")}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none font-semibold text-accent"
                >
                  <option value="individu">Individu (Peserta Tunggal)</option>
                  <option value="kelompok">Kelompok / Beregu (Tim)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Metode Agregasi Nilai *
                </label>
                <select
                  value={editAggregation}
                  onChange={(e) => setEditAggregation(e.target.value as any)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
                >
                  <option value="rata_rata">Rata-Rata Standar (Mean)</option>
                  <option value="total">Total Akumulasi (Sum)</option>
                  <option value="rata_rata_buang_ekstrem">Rata-Rata Buang Ekstrem (Olympic Scoring)</option>
                </select>
              </div>
            </div>

            {editCategory === "kelompok" && (
              <div className="grid grid-cols-2 gap-3 text-left p-3 rounded-lg border border-accent/20 bg-accent/5">
                <Input
                  label="Minimal Anggota Tim *"
                  type="number"
                  min={2}
                  max={20}
                  value={editMinMembers}
                  onChange={(e) => setEditMinMembers(Number(e.target.value))}
                  required
                />
                <Input
                  label="Maksimal Anggota Tim *"
                  type="number"
                  min={editMinMembers}
                  max={30}
                  value={editMaxMembers}
                  onChange={(e) => setEditMaxMembers(Number(e.target.value))}
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <Input
                label="Venue / Ruangan *"
                placeholder="Panggung Utama / Aula Serbaguna"
                value={editVenue}
                onChange={(e) => setEditVenue(e.target.value)}
                required
              />
              <Input
                label="Nama Panggung / Stage"
                placeholder="Contoh: Stage A / Podium Utama / Zona B"
                value={editStage}
                onChange={(e) => setEditStage(e.target.value)}
              />
            </div>

            <div className="text-left">
              <Input
                label="Batas Maksimal Peserta / Tim"
                type="number"
                min={1}
                max={100}
                value={editMaxParticipants}
                onChange={(e) => setEditMaxParticipants(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Deskripsi Singkat Lomba
              </label>
              <textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Petunjuk Teknis & Peraturan Lomba</span>
                <span className="text-[10px] text-muted-foreground/80 font-normal">1 baris = 1 poin</span>
              </label>
              <textarea
                rows={5}
                placeholder="Tuliskan peraturan per baris, contoh:&#10;Karya orisinal dan belum pernah dilombakan&#10;Durasi video 5-10 menit termasuk kredit&#10;Format MP4 Full HD 1080p&#10;Bebas dari unsur SARA dan ujaran kebencian"
                value={editRules}
                onChange={(e) => setEditRules(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent font-sans leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground">
                Tekan <strong>Enter</strong> untuk membuat butir poin peraturan baru. Aturan ini akan langsung tampil dengan ikon centang di halaman detail lomba publik.
              </p>
            </div>

            {/* Conditional: Pilihan Naskah (Hanya untuk Lomba Tertentu) */}
            {editNeedsManuscripts ? (
              <div className="space-y-2 text-left p-3.5 rounded-xl border border-accent/30 bg-accent/5 transition-all">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-accent flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    <span>Pilihan Naskah Lomba</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
                    Khusus Lomba Berbasis Naskah
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Daftar judul puisi wajib/pilihan, naskah lakon drama monolog, atau tema naskah pidato/protokoler bagi peserta.
                </p>
                <textarea
                  rows={4}
                  placeholder={"Contoh:\nAku — Karya Chairil Anwar\nDiponegoro — Karya Chairil Anwar\nKarawang-Bekasi — Karya Chairil Anwar"}
                  value={editManuscripts}
                  onChange={(e) => setEditManuscripts(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent font-sans leading-relaxed"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    Tekan <strong>Enter</strong> untuk poin naskah baru (1 baris = 1 naskah).
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditNeedsManuscripts(false);
                      setEditManuscripts("");
                    }}
                    className="text-[11px] text-muted-foreground hover:text-destructive underline decoration-dotted cursor-pointer"
                  >
                    Hapus / Sembunyikan naskah
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-left pt-1">
                <button
                  type="button"
                  onClick={() => setEditNeedsManuscripts(true)}
                  className="text-xs text-accent hover:underline inline-flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>+ Sertakan Pilihan Naskah untuk lomba ini</span>
                </button>
              </div>
            )}

            {/* Conditional: Format Acara yang dibawakan (Hanya untuk Lomba Tertentu seperti MC/Pembawa Acara) */}
            {editNeedsEventFormats ? (
              <div className="space-y-2 text-left p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 transition-all">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Mic className="h-4 w-4" />
                    <span>Format Acara yang Dibawakan</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                    Khusus Lomba MC &amp; Pembawa Acara
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Daftar format, tema agenda acara, atau simulasi keprotokoleran yang dapat dipilih atau dibawakan oleh peserta.
                </p>
                <textarea
                  rows={3}
                  placeholder={"Contoh:\nUpacara Protokoler Peringatan Hari Sumpah Pemuda Tingkat Nasional\nSeminar Nasional Bahasa dan Diplomasi Budaya Nusantara\nMalam Penganugerahan Juara & Resepsi Kebudayaan"}
                  value={editEventFormats}
                  onChange={(e) => setEditEventFormats(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans leading-relaxed"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    Tekan <strong>Enter</strong> untuk format acara baru (1 baris = 1 format acara).
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditNeedsEventFormats(false);
                      setEditEventFormats("");
                    }}
                    className="text-[11px] text-muted-foreground hover:text-destructive underline decoration-dotted cursor-pointer"
                  >
                    Hapus / Sembunyikan format acara
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-left pt-1">
                <button
                  type="button"
                  onClick={() => setEditNeedsEventFormats(true)}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>+ Sertakan Format Acara yang dibawakan untuk lomba ini</span>
                </button>
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status Operasional Lomba *
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
              >
                <option value="pendaftaran">Pendaftaran Dibuka</option>
                <option value="berlangsung">Sedang Berlangsung (Live)</option>
                <option value="selesai">Selesai</option>
                <option value="draft">Draft</option>
                <option value="dibatalkan">Dibatalkan</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmittingEdit || !editName || !editShortName}>
                {isSubmittingEdit ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  "Simpan Perubahan Lomba"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal HAPUS / ARSIP Lomba */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>Pengelolaan Hapus / Arsip Lomba</span>
              </DialogTitle>
              <DialogDescription>
                Pilih tindakan yang ingin dilakukan untuk cabang lomba{" "}
                <strong>&quot;{deleteTarget?.name}&quot;</strong>:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 p-3.5 rounded-lg border border-border bg-muted/40 text-xs text-foreground">
              <div className="flex gap-2">
                <Archive className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-foreground">Opsi 1: Batalkan / Arsipkan Lomba (Sangat Direkomendasikan)</strong>
                  <p className="text-muted-foreground">
                    Status lomba diubah menjadi <em>Dibatalkan</em>. Data pendaftaran dan lembar penilaian juri tetap aman tersimpan di database sebagai arsip sejarah acara.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Trash2 className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-destructive">Opsi 2: Hapus Permanen</strong>
                  <p className="text-muted-foreground">
                    Hanya dapat dilakukan jika belum ada peserta yang mendaftar pada cabang lomba ini. Jika sudah ada peserta, sistem akan memblokir penghapusan demi keamanan data.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                disabled={isSubmittingDelete}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleDeleteOrArchive("archive")}
                disabled={isSubmittingDelete}
                className="text-xs gap-1"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Arsipkan / Batalkan</span>
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDeleteOrArchive("delete")}
                disabled={isSubmittingDelete}
                className="text-xs gap-1"
              >
                {isSubmittingDelete ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>Hapus Permanen</span>
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
