import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://gebyarbulanbahasa.id";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/lomba",
          "/lomba/*",
          "/jadwal",
          "/pengumuman",
          "/pengumuman/*",
          "/papan-skor",
          "/pemenang",
          "/leaderboard",
          "/galeri/twibbon",
          "/challenge",
          "/tentang",
          "/faq",
          "/kontak",
        ],
        disallow: [
          "/dashboard",
          "/dashboard/*",
          "/juri",
          "/juri/*",
          "/media",
          "/media/*",
          "/peserta",
          "/peserta/*",
          "/monitor",
          "/monitor/*",
          "/api/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
