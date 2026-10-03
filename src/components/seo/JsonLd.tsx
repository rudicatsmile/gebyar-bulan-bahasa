import * as React from "react";
import { COMPETITIONS } from "@/lib/dummy-data";

export function EventJsonLd() {
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Gebyar Bulan Bahasa dan Kebudayaan 2026",
    alternateName: "Gebyar Bulan Bahasa dan Kebudayaan",
    description:
      "Sistem penilaian digital dan pameran kebudayaan Gebyar Bulan Bahasa dan Kebudayaan bertema 'Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.'",
    startDate: "2025-10-27T08:00:00+07:00",
    endDate: "2025-10-29T18:00:00+07:00",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: "Balai Budaya Pemuda Nusantara",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Jl. Pemuda No. 28, Gelora Kebudayaan",
        addressLocality: "Jakarta Pusat",
        addressRegion: "DKI Jakarta",
        postalCode: "10270",
        addressCountry: "ID",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "Panitia Gebyar Bulan Bahasa & Kebudayaan",
      url: process.env.NEXT_PUBLIC_APP_URL || "https://gebyarbulanbahasa.id",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "IDR",
      availability: "https://schema.org/InStock",
      validFrom: "2025-10-01T00:00:00+07:00",
    },
    subEvents: COMPETITIONS.map((c) => ({
      "@type": "Event",
      name: `Lomba ${c.name}`,
      description: c.description,
      startDate: "2025-10-27T09:00:00+07:00",
      location: {
        "@type": "Place",
        name: `${c.venue} (${c.stage})`,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
    />
  );
}
