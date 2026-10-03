"use client";

import * as React from "react";

export interface PublicEventSettings {
  eventName: string;
  eventShortName: string;
  eventOrganizer: string;
  eventTheme: string;
  eventDate: string;
  eventYear: string;
  heroImageUrl: string;
  logoImageUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactLocation: string;
}

const DEFAULT_SETTINGS: PublicEventSettings = {
  eventName: "Gebyar Bulan Bahasa dan Kebudayaan",
  eventShortName: "GebyarBulanBahasa",
  eventOrganizer: "SMK DP 2 Jakarta",
  eventTheme: "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.",
  eventDate: "11 November 2026",
  eventYear: "2026",
  heroImageUrl: "",
  logoImageUrl: "",
  contactEmail: "panitia@gebyarbulanbahasa.id",
  contactPhone: "0812-3456-7890 (Seksi Acara)",
  contactLocation: "Gedung Kesenian & Pusat Kebudayaan Lt. 1, Ruang Panitia A.",
};

/** Parse brand name into two parts for styled rendering */
export function parseBrandParts(name?: string): { first: string; second: string } {
  const brand = (name || "GebyarBulanBahasa").trim();
  const words = brand.split(/\s+/);
  if (words.length > 1) {
    return { first: words[0], second: words.slice(1).join(" ") };
  }
  const match = brand.match(/^([A-Z][a-z0-9]*)([A-Z].*)$/);
  if (match) {
    return { first: match[1], second: match[2] };
  }
  return { first: brand, second: "" };
}

export function useEventSettings() {
  const [settings, setSettings] = React.useState<PublicEventSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.settings && isMounted) {
            setSettings({
              eventName: json.settings.eventName || DEFAULT_SETTINGS.eventName,
              eventShortName: json.settings.eventShortName || DEFAULT_SETTINGS.eventShortName,
              eventOrganizer: json.settings.eventOrganizer || DEFAULT_SETTINGS.eventOrganizer,
              eventTheme: json.settings.eventTheme || DEFAULT_SETTINGS.eventTheme,
              eventDate: json.settings.eventDate || DEFAULT_SETTINGS.eventDate,
              eventYear: json.settings.eventYear || DEFAULT_SETTINGS.eventYear,
              heroImageUrl: json.settings.heroImageUrl || "",
              logoImageUrl: json.settings.logoImageUrl || "",
              contactEmail: json.settings.contactEmail || DEFAULT_SETTINGS.contactEmail,
              contactPhone: json.settings.contactPhone || DEFAULT_SETTINGS.contactPhone,
              contactLocation: json.settings.contactLocation || DEFAULT_SETTINGS.contactLocation,
            });
          }
        }
      } catch (err) {
        console.error("Gagal memuat event settings:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  return { settings, loading };
}

