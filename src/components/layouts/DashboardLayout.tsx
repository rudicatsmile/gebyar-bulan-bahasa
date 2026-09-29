"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Layers,
  LayoutDashboard,
  Trophy,
  Users,
  FileCheck,
  Calendar,
  UserCheck,
  ClipboardList,
  Calculator,
  Megaphone,
  Radio,
  Sparkles,
  Store,
  CheckCircle2,
  Coins,
  Gift,
  Camera,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Tv,
  Award,
  QrCode,
  History,
  User,
  Sliders,
  PlaySquare,
  Image,
  Bell,
  Search,
  Puzzle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type RoleType = "seksi_acara" | "juri" | "media_center" | "peserta";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isHeader?: boolean;
}

const SEKSI_ACARA_NAV: NavItem[] = [
  { title: "Ringkasan", href: "/dashboard", icon: LayoutDashboard },
  { title: "OPERASIONAL LOMBA", href: "#", icon: Trophy, isHeader: true },
  { title: "Monitoring Lomba", href: "/dashboard/lomba", icon: Trophy },
  { title: "Peserta & Berkas", href: "/dashboard/peserta", icon: Users },
  { title: "Verifikasi Berkas", href: "/dashboard/peserta/verifikasi", icon: FileCheck },
  { title: "Pendaftaran Tim", href: "/dashboard/pendaftaran", icon: ClipboardList },
  { title: "Manajemen Jadwal", href: "/dashboard/jadwal", icon: Calendar },
  { title: "PENJURIAN & NILAI", href: "#", icon: UserCheck, isHeader: true },
  { title: "Daftar Juri", href: "/dashboard/juri", icon: UserCheck },
  { title: "Penugasan Juri", href: "/dashboard/juri/penugasan", icon: ShieldCheck },
  { title: "Kriteria Penilaian", href: "/dashboard/kriteria", icon: Sliders },
  { title: "Rekap Nilai", href: "/dashboard/penilaian", icon: Calculator },
  { title: "Penetapan Pemenang", href: "/dashboard/pemenang", icon: Award },
  { title: "KOMUNIKASI", href: "#", icon: Megaphone, isHeader: true },
  { title: "Kelola Pengumuman", href: "/dashboard/pengumuman", icon: Megaphone },
  { title: "Broadcast Darurat", href: "/dashboard/broadcast", icon: Radio },
  { title: "CHALLENGE & STAND", href: "#", icon: Sparkles, isHeader: true },
  { title: "Daftar Challenge", href: "/dashboard/challenge", icon: Sparkles },
  { title: "Kelola 8 Stand", href: "/dashboard/challenge/stand", icon: Store },
  { title: "Verifikasi Bukti", href: "/dashboard/challenge/verifikasi", icon: CheckCircle2, badge: "3" },
  { title: "Penyesuaian Poin", href: "/dashboard/challenge/poin", icon: Coins },
  { title: "Katalog Reward", href: "/dashboard/challenge/reward", icon: Gift },
  { title: "Puzzle Baju Daerah", href: "/dashboard/challenge/puzzle", icon: Puzzle },
  { title: "Challenge QR Huruf", href: "/dashboard/challenge/qr-huruf", icon: QrCode },
  { title: "SISTEM", href: "#", icon: Settings, isHeader: true },
  { title: "Moderasi Twibbon", href: "/dashboard/twibbon", icon: Camera, badge: "1" },
  { title: "Kelola Pengguna", href: "/dashboard/pengguna", icon: Users },
  { title: "Pengaturan Acara", href: "/dashboard/pengaturan", icon: Settings },
];

const JURI_NAV: NavItem[] = [
  { title: "Lomba Ditugaskan", href: "/juri", icon: Trophy },
  { title: "Riwayat Penilaian", href: "/juri/riwayat", icon: History },
  { title: "Profil Juri", href: "/juri/profil", icon: User },
];

const MEDIA_NAV: NavItem[] = [
  { title: "Ringkasan Media", href: "/media", icon: LayoutDashboard },
  { title: "Konten Acara", href: "/media/konten", icon: PlaySquare },
  { title: "Pengumuman", href: "/media/pengumuman", icon: Megaphone },
  { title: "Moderasi Twibbon", href: "/media/twibbon", icon: Camera, badge: "1" },
  { title: "Kendali Monitor", href: "/media/monitor", icon: Tv },
  { title: "Playlist Monitor", href: "/media/konten-monitor", icon: Sliders },
  { title: "Galeri Foto/Video", href: "/media/galeri", icon: Image },
];

const PESERTA_NAV: NavItem[] = [
  { title: "Beranda Peserta", href: "/peserta", icon: LayoutDashboard },
  { title: "Pendaftaran Lomba", href: "/peserta/pendaftaran", icon: Trophy },
  { title: "Daftar Challenge", href: "/peserta/challenge", icon: Sparkles },
  { title: "Puzzle Baju Daerah", href: "/peserta/challenge/puzzle", icon: Puzzle },
  { title: "Challenge QR Huruf", href: "/peserta/challenge/qr-huruf", icon: QrCode },
  { title: "Scan QR & Kode Stand", href: "/peserta/scan", icon: QrCode },
  { title: "Riwayat Poin", href: "/peserta/riwayat-poin", icon: Coins },
  { title: "Katalog Reward", href: "/peserta/reward", icon: Gift },
  { title: "Twibbon Saya", href: "/peserta/twibbon", icon: Camera },
  { title: "Profil Saya", href: "/peserta/profil", icon: User },
];

export function DashboardLayout({
  children,
  role,
  participantPoints,
}: {
  children: React.ReactNode;
  role: RoleType;
  participantPoints?: number;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [internalPoints, setInternalPoints] = React.useState<number | null>(null);
  const [pendingVerificationCount, setPendingVerificationCount] = React.useState<number | null>(null);

  // ---------- Realtime badge count for "Verifikasi Berkas" ----------
  const fetchPendingCount = React.useCallback(() => {
    if (role !== "seksi_acara") return;

    const supabase = createClient();
    supabase
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("status", "menunggu_verifikasi")
      .then(({ count }) => {
        if (count !== null && count !== undefined) {
          setPendingVerificationCount(count);
        }
      });
  }, [role]);

  React.useEffect(() => {
    if (role !== "seksi_acara") return;

    // Initial fetch
    fetchPendingCount();

    // Subscribe to realtime changes on participants table
    const supabase = createClient();
    const channel = supabase
      .channel("sidebar-verifikasi-badge")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "participants" },
        () => {
          // Re-count on any participant change (INSERT / UPDATE status / DELETE)
          fetchPendingCount();
        }
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Fallback: poll every 15 seconds if realtime fails
          const pollId = setInterval(fetchPendingCount, 15_000);
          return () => clearInterval(pollId);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, fetchPendingCount]);

  React.useEffect(() => {
    if (role === "peserta" && participantPoints === undefined) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase
          .from("participants")
          .select("total_points")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.total_points !== undefined && data?.total_points !== null) {
              setInternalPoints(data.total_points);
            }
          });
      });
    }
  }, [role, participantPoints]);

  const displayPoints =
    participantPoints !== undefined
      ? participantPoints
      : internalPoints !== null
      ? internalPoints
      : 0;

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Gagal logout:", err);
    }
    window.location.href = "/masuk";
  };

  const navItems = React.useMemo(() => {
    let baseItems =
      role === "seksi_acara"
        ? SEKSI_ACARA_NAV
        : role === "juri"
        ? JURI_NAV
        : role === "media_center"
        ? MEDIA_NAV
        : PESERTA_NAV;

    if (role === "seksi_acara" && pendingVerificationCount !== null) {
      baseItems = baseItems.map((item) => {
        if (item.href === "/dashboard/peserta/verifikasi") {
          return {
            ...item,
            badge: pendingVerificationCount > 0 ? String(pendingVerificationCount) : undefined,
          };
        }
        return item;
      });
    }

    return baseItems;
  }, [role, pendingVerificationCount]);

  const roleLabel =
    role === "seksi_acara"
      ? "Seksi Acara (Admin)"
      : role === "juri"
      ? "Dewan Juri"
      : role === "media_center"
      ? "Media Center"
      : "Peserta Acara";

  const roleBadgeVariant =
    role === "seksi_acara"
      ? "warning"
      : role === "juri"
      ? "gold"
      : role === "media_center"
      ? "info"
      : "success";

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Sidebar Desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-card fixed inset-y-0 left-0 z-30 transition-all duration-300",
          collapsed ? "w-[72px]" : "w-[264px]"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border/80">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-accent">
              <Layers className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-heading text-sm font-bold tracking-tight text-foreground truncate">
                  Gebyar<span className="text-accent">BulanBahasa</span>
                </span>
                <span className="text-[10px] tracking-wider text-muted-foreground uppercase">
                  {roleLabel}
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none cursor-pointer"
            title={collapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item, idx) => {
            if (item.isHeader) {
              if (collapsed) return <div key={idx} className="my-2 border-t border-border" />;
              return (
                <div
                  key={idx}
                  className="px-3 pt-4 pb-1.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
                >
                  {item.title}
                </div>
              );
            }

            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors group relative",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )}
                title={collapsed ? item.title : undefined}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!collapsed && <span className="truncate">{item.title}</span>}
                {!collapsed && item.badge && (
                  <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-accent text-accent-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer with Role Switcher Quick Links */}
        <div className="p-3 border-t border-border bg-muted/20">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-semibold text-accent">Pindah Peran Acara:</span>
                <Link href="/" title="Ke Beranda Publik" className="text-muted-foreground hover:text-foreground">
                  <LogOut className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <Link
                  href="/dashboard"
                  className={cn(
                    "px-2 py-1 rounded text-center border transition-colors",
                    role === "seksi_acara"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  Acara
                </Link>
                <Link
                  href="/juri"
                  className={cn(
                    "px-2 py-1 rounded text-center border transition-colors",
                    role === "juri"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  Juri
                </Link>
                <Link
                  href="/media"
                  className={cn(
                    "px-2 py-1 rounded text-center border transition-colors",
                    role === "media_center"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  Media
                </Link>
                <Link
                  href="/peserta"
                  className={cn(
                    "px-2 py-1 rounded text-center border transition-colors",
                    role === "peserta"
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  Peserta
                </Link>
              </div>
            </div>

          ) : (
            <div className="flex justify-center">
              <Link href="/" title="Ke Beranda Publik">
                <LogOut className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          collapsed ? "md:pl-[72px]" : "md:pl-[264px]"
        )}
      >
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 md:hidden text-foreground rounded-lg hover:bg-muted focus:outline-none"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-xs">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                GebyarBulanBahasa
              </Link>
              <span className="text-muted-foreground">/</span>
              <Badge variant={roleBadgeVariant} className="text-[10px]">
                {roleLabel}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {role === "peserta" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent-foreground text-xs font-bold font-mono">
                <Coins className="h-3.5 w-3.5 text-accent" />
                <span>{displayPoints} Poin</span>
              </div>
            )}

            <Link href="/monitor" target="_blank">
              <Button variant="outline" size="sm" className="hidden sm:flex text-xs gap-1.5">
                <Tv className="h-3.5 w-3.5 text-accent" />
                <span>Monitor TV</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-primary/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50 w-72 bg-card h-full flex flex-col border-r border-border p-4 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-accent">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="font-heading text-sm font-bold">GebyarBulanBahasa</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-1">
              {navItems.map((item, idx) => {
                if (item.isHeader) {
                  return (
                    <div
                      key={idx}
                      className="px-2 pt-3 pb-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
                    >
                      {item.title}
                    </div>
                  );
                }
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg",
                      isActive
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    {item.badge && (
                      <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-accent text-accent-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="pt-4 border-t border-border">
              <Link href="/" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full text-xs">
                  Ke Halaman Publik
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
