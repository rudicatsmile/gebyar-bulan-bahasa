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
  ArrowRight,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/lomba", label: "8 Lomba", icon: Award },
  { href: "/jadwal", label: "Jadwal", icon: Calendar },
  { href: "/papan-skor", label: "Papan Skor", icon: Flame },
  { href: "/pemenang", label: "Pemenang", icon: Trophy },
  { href: "/challenge", label: "Challenge & Stand", icon: Sparkles },
  { href: "/galeri/twibbon", label: "Twibbon", icon: Camera },
  { href: "/pengumuman", label: "Pengumuman" },
  { href: "/tentang", label: "Tentang" },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-accent transition-transform group-hover:scale-105">
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-base font-bold tracking-tight text-foreground leading-none">
              Gebyar<span className="text-accent">BulanBahasa</span>
            </span>
            <span className="text-[10px] tracking-widest text-muted-foreground uppercase mt-0.5">
              Sumpah Pemuda 2025
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
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
                  "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors",
                  isActive
                    ? "text-foreground bg-muted font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Link href="/monitor" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-accent/40 text-accent-foreground hover:border-accent bg-accent/5 text-xs"
            >
              <Tv className="h-3.5 w-3.5 text-accent animate-pulse" />
              <span>Layar Monitor</span>
            </Button>
          </Link>

          <Link href="/masuk">
            <Button size="sm" className="text-xs gap-1.5">
              <span>Masuk</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <Link href="/monitor" target="_blank">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <Tv className="h-4 w-4 text-accent" />
            </Button>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-foreground rounded-lg hover:bg-muted focus:outline-none"
            aria-label="Buka Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-background px-4 py-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-muted text-foreground font-bold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {link.icon && <link.icon className="h-4 w-4 text-accent" />}
                <span>{link.label}</span>
              </Link>
            );
          })}
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            <Link href="/masuk" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full text-xs" size="sm">
                Masuk / Registrasi Akun
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
