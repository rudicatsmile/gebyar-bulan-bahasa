"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Tv,
  Award,
  Calendar,
  Sparkles,
  Trophy,
  Flame,
  Camera,
  Layers,
  Home,
  Megaphone,
  Info,
  ChevronRight,
  LogIn,
} from "lucide-react";

import { useEventSettings } from "@/lib/hooks/useEventSettings";

interface NavLinkItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/lomba", label: "Lomba", icon: Award },
  { href: "/jadwal", label: "Jadwal", icon: Calendar },
  {
    href: "/papan-skor",
    label: "Papan Skor",
    icon: Flame,
    badge: "Live",
    badgeColor: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  { href: "/pemenang", label: "Pemenang", icon: Trophy },
  { href: "/challenge", label: "Challenge & Stand", icon: Sparkles },
  { href: "/galeri/twibbon", label: "Twibbon", icon: Camera },
  { href: "/pengumuman", label: "Pengumuman", icon: Megaphone },
  { href: "/tentang", label: "Tentang", icon: Info },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { settings } = useEventSettings();

  // Auto-close menu saat halaman berpindah
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Kunci scroll halaman saat menu mobile terbuka
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur-md transition-all shadow-2xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs transition-transform duration-200 group-hover:scale-105">
            <Layers className="h-5 w-5 text-accent" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-base font-bold tracking-tight text-foreground leading-none">
                Gebyar<span className="text-accent">BulanBahasa</span>
              </span>
              <span className="hidden sm:inline-block rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent leading-none border border-accent/30">
                2026
              </span>
            </div>
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase mt-0.5 font-medium">
              SMK DP 2 Jakarta
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links (Layar >= 1024px) */}
        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-2.5 py-1.5 text-xs xl:text-[13px] font-medium rounded-lg transition-all duration-150 flex items-center gap-1.5",
                  isActive
                    ? "text-primary font-bold bg-primary/10 shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span
                    className={cn(
                      "text-[9px] font-bold px-1.5 py-0.2 rounded-full border leading-tight animate-pulse",
                      link.badgeColor || "bg-accent/10 text-accent border-accent/20"
                    )}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Action Buttons */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <Link href="/monitor" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-border hover:border-accent/50 text-foreground hover:text-accent bg-background text-xs px-2.5 rounded-lg shadow-2xs"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Tv className="h-3.5 w-3.5 text-accent" />
              <span>Monitor</span>
            </Button>
          </Link>

          <Link href="/masuk">
            <Button size="sm" className="h-8 text-xs gap-1.5 px-3 rounded-lg shadow-2xs font-semibold">
              <LogIn className="h-3.5 w-3.5" />
              <span>Masuk</span>
            </Button>
          </Link>
        </div>

        {/* Mobile & Tablet Controls (Layar < 1024px) */}
        <div className="flex lg:hidden items-center gap-1.5">
          <Link href="/monitor" target="_blank" title="Layar Monitor Venue">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl border-border bg-background shadow-2xs relative"
              aria-label="Buka Layar Monitor"
            >
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Tv className="h-4 w-4 text-accent" />
            </Button>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center text-foreground rounded-xl border border-border bg-background hover:bg-muted active:scale-95 transition-all shadow-2xs focus:outline-none"
            aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-foreground transition-transform duration-200 rotate-90" />
            ) : (
              <Menu className="h-5 w-5 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay & Menu (Layar HP & Tablet) */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 top-16 z-40 bg-black/40 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Menu Panel */}
          <div className="fixed inset-x-0 top-16 z-50 lg:hidden max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-background/98 backdrop-blur-xl shadow-2xl animate-in slide-in-from-top-3 duration-200">
            <div className="p-4 sm:p-6 space-y-4">
              {/* Navigation Links List */}
              <div className="space-y-1">
                <div className="px-2 pb-2 text-[10px] font-mono tracking-widest text-muted-foreground uppercase font-bold">
                  Menu Utama Acara
                </div>
                {NAV_LINKS.map((link) => {
                  const isActive =
                    link.href === "/"
                      ? pathname === "/"
                      : pathname?.startsWith(link.href);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.99]",
                        isActive
                          ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
                          : "text-foreground hover:bg-muted/70 hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span>{link.label}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {link.badge && (
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border leading-tight animate-pulse",
                              link.badgeColor || "bg-accent/10 text-accent border-accent/20"
                            )}
                          >
                            {link.badge}
                          </span>
                        )}
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 text-muted-foreground/40",
                            isActive && "text-primary"
                          )}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Action Buttons on Mobile */}
              <div className="pt-4 border-t border-border space-y-2.5">
                <Link
                  href="/masuk"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block"
                >
                  <Button className="w-full h-11 text-sm font-bold gap-2 rounded-xl shadow-sm">
                    <LogIn className="h-4 w-4" />
                    <span>Masuk / Registrasi Akun</span>
                  </Button>
                </Link>

                <Link
                  href="/monitor"
                  target="_blank"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block"
                >
                  <Button
                    variant="outline"
                    className="w-full h-10 text-xs font-semibold gap-2 rounded-xl border-border hover:bg-accent/5"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Tv className="h-3.5 w-3.5 text-accent" />
                    <span>Buka Layar Monitor Panggung (TV)</span>
                  </Button>
                </Link>

                <div className="text-center pt-2 text-[11px] text-muted-foreground font-medium">
                  {settings.eventName} {settings.eventYear}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
