import { MetadataRoute } from "next";
import { COMPETITIONS, ANNOUNCEMENTS } from "@/lib/dummy-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://gebyarbulanbahasa.id";
  const now = new Date();

  const staticPages = [
    "",
    "/tentang",
    "/lomba",
    "/jadwal",
    "/pengumuman",
    "/papan-skor",
    "/pemenang",
    "/leaderboard",
    "/galeri/twibbon",
    "/challenge",
    "/faq",
    "/kontak",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: (route === "" || route === "/jadwal" || route === "/papan-skor"
      ? "hourly"
      : "daily") as "hourly" | "daily",
    priority: route === "" ? 1.0 : 0.8,
  }));

  const competitionPages = COMPETITIONS.map((c) => ({
    url: `${baseUrl}/lomba/${c.slug}`,
    lastModified: now,
    changeFrequency: "hourly" as const,
    priority: 0.9,
  }));

  const announcementPages = ANNOUNCEMENTS.map((a) => ({
    url: `${baseUrl}/pengumuman/${a.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...competitionPages, ...announcementPages];
}
