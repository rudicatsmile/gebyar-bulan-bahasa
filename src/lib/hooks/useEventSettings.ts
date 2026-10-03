"use client";

import * as React from "react";

export interface PublicEventSettings {
  eventName: string;
  eventTheme: string;
  eventDate: string;
  eventYear: string;
  heroImageUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactLocation: string;
}

const DEFAULT_SETTINGS: PublicEventSettings = {
  eventName: "Gebyar Bulan Bahasa dan Kebudayaan",
  eventTheme: "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.",
  eventDate: "11 November 2026",
  eventYear: "2026",
  heroImageUrl: "",
  contactEmail: "panitia@gebyarbulanbahasa.id",
  contactPhone: "0812-3456-7890 (Seksi Acara)",
  contactLocation: "Gedung Kesenian & Pusat Kebudayaan Lt. 1, Ruang Panitia A.",
};

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
              eventTheme: json.settings.eventTheme || DEFAULT_SETTINGS.eventTheme,
              eventDate: json.settings.eventDate || DEFAULT_SETTINGS.eventDate,
              eventYear: json.settings.eventYear || DEFAULT_SETTINGS.eventYear,
              heroImageUrl: json.settings.heroImageUrl || "",
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
