import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Auto-load .env.production or .env.local if not already in process.env
const envPaths = [".env.production", ".env.local", ".env"];
for (const p of envPaths) {
  const fullPath = resolve(process.cwd(), p);
  if (existsSync(fullPath)) {
    const content = readFileSync(fullPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum disetel!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`\n======================================================`);
console.log(`🚀 MEMULAI SEED DATABASE: GebyarBulanBahasa`);
console.log(`🎯 Target URL: ${supabaseUrl}`);
console.log(`======================================================\n`);

async function seed() {
  // 1. EVENT SETTINGS
  console.log("📦 1. Seeding event_settings...");
  const settingsData = [
    {
      key: "general",
      value: {
        name: "GebyarBulanBahasa",
        theme: "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.",
        year: 2025,
        venue: "Pusat Gelora Budaya Nusantara, Jakarta",
        startDate: "2025-10-26",
        endDate: "2025-10-28",
        description: "Sistem penilaian digital dan dashboard operasional acara Gebyar Bulan Bahasa dan Kebudayaan (Peringatan Hari Sumpah Pemuda)",
      },
      description: "Pengaturan umum acara dan tema Gebyar Bulan Bahasa",
    },
    {
      key: "registration",
      value: {
        isOpen: true,
        maxTeamsPerSchool: 2,
        requireSchoolRecommendation: true,
        allowedDocTypes: ["kartu_pelajar", "surat_izin", "karya"],
      },
      description: "Konfigurasi pendaftaran peserta lomba dan persyaratan berkas",
    },
    {
      key: "gamification",
      value: {
        scanQrPoints: 10,
        maxDailyScans: 8,
        leaderboardVisible: true,
        enableChallenges: true,
      },
      description: "Pengaturan gamifikasi poin kunjungan stand dan tantangan",
    },
    {
      key: "monitor",
      value: {
        refreshIntervalSeconds: 15,
        activeTheme: "sumpah_pemuda_dark",
        autoRotateSlides: true,
      },
      description: "Konfigurasi tampilan monitor panggung dan signage aula",
    },
  ];

  const { error: errSettings } = await supabase.from("event_settings").upsert(settingsData, { onConflict: "key" });
  if (errSettings) console.error("   ❌ Gagal seed event_settings:", errSettings.message);
  else console.log("   ✅ Berhasil seed 4 pengaturan acara");

  // 2. COMPETITIONS
  console.log("📦 2. Seeding competitions (8 Cabang Lomba)...");
  const competitionsData = [
    {
      id: "a0000000-0000-0000-0000-000000000001",
      slug: "membaca-puisi",
      name: "Membaca Puisi",
      short_name: "Puisi",
      description: "Lomba membaca karya puisi sastra nusantara dan puisi bertema Sumpah Pemuda untuk mengobarkan semangat persatuan generasi penerus bangsa.",
      theme_link: "Panggung Utama",
      type: "individu",
      status: "berlangsung",
      aggregation: "rata_rata",
      min_team_members: 1,
      max_team_members: 1,
      max_participants: 25,
      rules: "1. Membaca 1 puisi wajib karya penyair nasional dan 1 puisi pilihan.\n2. Durasi penampilan maksimal 7 menit tanpa alat pengeras suara tambahan.\n3. Peserta mengenakan pakaian batik atau busana daerah sopan.\n4. Penilaian murni mengacu pada penghayatan, vokal, dan intonasi.",
      sort_order: 1,
    },
    {
      id: "a0000000-0000-0000-0000-000000000002",
      slug: "film-pendek",
      name: "Film Pendek",
      short_name: "Film",
      description: "Kompetisi karya sinematografi fiksi pendek bertema 'Persatuan dalam Keberagaman Budaya Nusantara' dengan durasi 5-10 menit.",
      theme_link: "Ruang Bioskop Mini",
      type: "kelompok",
      status: "berlangsung",
      aggregation: "rata_rata_buang_ekstrem",
      min_team_members: 3,
      max_team_members: 10,
      max_participants: 15,
      rules: "1. Karya orisinal diproduksi kurun waktu 2024-2025 dan belum pernah memenangkan festival lain.\n2. Durasi video 5-10 menit termasuk kredit judul dan akhir.\n3. Format MP4/MOV Full HD 1080p dengan teks bahasa Indonesia baku.\n4. Bebas dari unsur SARA, ujaran kebencian, dan pelanggaran hak cipta musik.",
      sort_order: 2,
    },
    {
      id: "a0000000-0000-0000-0000-000000000003",
      slug: "pidato",
      name: "Pidato Bahasa Indonesia",
      short_name: "Pidato",
      description: "Ajang orasi dan adu gagasan kebangsaan peserta dengan tema 'Menginspirasi Indonesia Melalui Bahasa Persatuan'.",
      theme_link: "Aula Serbaguna",
      type: "individu",
      status: "berlangsung",
      aggregation: "rata_rata",
      min_team_members: 1,
      max_team_members: 1,
      max_participants: 20,
      rules: "1. Durasi orasi 5-7 menit; lampu indikator hijau (mulai), kuning (1 menit tersisa), merah (selesai).\n2. Pidato dibawakan tanpa membaca naskah penuh (catatan poin diperkenankan).\n3. Busana formal rapi atau jas almamater / seragam sekolah.",
      sort_order: 3,
    },
    {
      id: "a0000000-0000-0000-0000-000000000004",
      slug: "melukis-tas-kanvas",
      name: "Melukis Tas Kanvas",
      short_name: "Melukis",
      description: "Lomba kreasi seni visual pada media tote bag kanvas bertema motif ornamen tradisional Indonesia berpadu tipografi aksara nusantara.",
      theme_link: "Area Kreatif Selasar",
      type: "individu",
      status: "berlangsung",
      aggregation: "rata_rata",
      min_team_members: 1,
      max_team_members: 1,
      max_participants: 30,
      rules: "1. Media tas kanvas disediakan panitia; cat akrilik dan kuas dibawa peserta.\n2. Durasi melukis 180 menit tanpa bantuan orang lain.\n3. Karya wajib memadukan motif budaya nusantara dengan kutipan berbahasa Indonesia.",
      sort_order: 4,
    },
    {
      id: "a0000000-0000-0000-0000-000000000005",
      slug: "monolog",
      name: "Seni Teater Monolog",
      short_name: "Monolog",
      description: "Penampilan lakon drama tunggal mengangkat naskah tokoh pahlawan pergerakan nasional dan pemuda pejuang kemerdekaan.",
      theme_link: "Ruang Teater A",
      type: "individu",
      status: "pendaftaran",
      aggregation: "rata_rata",
      min_team_members: 1,
      max_team_members: 1,
      max_participants: 16,
      rules: "1. Durasi pementasan 10-15 menit per peserta.\n2. Menggunakan naskah yang disediakan panitia atau naskah sastra klasik nusantara.\n3. Properti pendukung panggung dibatasi maksimal 3 item yang mudah dipindahkan.",
      sort_order: 5,
    },
    {
      id: "a0000000-0000-0000-0000-000000000006",
      slug: "mc-formal",
      name: "Pembawa Acara (MC) Formal",
      short_name: "MC Formal",
      description: "Uji keahlian memandu protokoler kenegaraan dan upacara peringatan Hari Sumpah Pemuda menggunakan bahasa Indonesia baku yang anggun.",
      theme_link: "Panggung Utama",
      type: "individu",
      status: "pendaftaran",
      aggregation: "rata_rata",
      min_team_members: 1,
      max_team_members: 1,
      max_participants: 20,
      rules: "1. Simulasi memandu Upacara Peringatan Hari Sumpah Pemuda tingkat nasional.\n2. Durasi 5 menit per peserta dengan pembacaan teks protokoler.\n3. Mengenakan busana formal jas / kebaya nasional lengkap.",
      sort_order: 6,
    },
    {
      id: "a0000000-0000-0000-0000-000000000007",
      slug: "palang-pintu",
      name: "Seni Tradisi Palang Pintu",
      short_name: "Palang Pintu",
      description: "Lomba kesenian tradisi Betawi memadukan adu pantun jenaka, jurus silat beksi tradisional, dan lantunan salawat.",
      theme_link: "Lapangan Terbuka",
      type: "kelompok",
      status: "selesai",
      aggregation: "rata_rata",
      min_team_members: 4,
      max_team_members: 8,
      max_participants: 10,
      rules: "1. Terdiri dari 1 jawara pantun, 2 pesilat beksi, dan pendamping rebana ketimpring.\n2. Durasi penampilan 10-12 menit per rombongan.\n3. Pantun wajib orisinal bertema pelestarian budaya nusantara dan sumpah pemuda.",
      sort_order: 7,
    },
    {
      id: "a0000000-0000-0000-0000-000000000008",
      slug: "vokal-grup",
      name: "Vokal Grup Lagu Daerah & Nasional",
      short_name: "Vokal Grup",
      description: "Harmoni paduan suara kelompok membawakan medley lagu wajib nasional 'Bangun Pemudi Pemuda' dan 1 lagu daerah pilihan nusantara.",
      theme_link: "Panggung Utama",
      type: "kelompok",
      status: "pendaftaran",
      aggregation: "rata_rata_buang_ekstrem",
      min_team_members: 5,
      max_team_members: 12,
      max_participants: 12,
      rules: "1. Jumlah anggota 5-12 penyanyi dengan instrumen pengiring akustik (non-minus one).\n2. Durasi total penampilan maksimal 10 menit untuk 2 lagu.\n3. Aransemen musik dan harmoni suara orisinal buatan tim.",
      sort_order: 8,
    },
  ];

  const { error: errComp } = await supabase.from("competitions").upsert(competitionsData, { onConflict: "id" });
  if (errComp) console.error("   ❌ Gagal seed competitions:", errComp.message);
  else console.log("   ✅ Berhasil seed 8 cabang lomba resmi");

  // 3. COMPETITION CRITERIA
  console.log("📦 3. Seeding competition_criteria (Kriteria Berbobot 100%)...");
  const criteriaData = [
    // Puisi (35 + 25 + 25 + 15 = 100)
    { id: "b0000001-0000-0000-0000-000000000001", competition_id: "a0000000-0000-0000-0000-000000000001", name: "Penghayatan & Penjiwaan", description: "Kedalaman emosi, pemahaman makna larik puisi, ketulusan ekspresi", weight: 35, max_score: 100, sort_order: 1 },
    { id: "b0000001-0000-0000-0000-000000000002", competition_id: "a0000000-0000-0000-0000-000000000001", name: "Vokal & Artikulasi", description: "Kejelasan lafal, proyeksi suara, kebulatan vokal dan konsonan", weight: 25, max_score: 100, sort_order: 2 },
    { id: "b0000001-0000-0000-0000-000000000003", competition_id: "a0000000-0000-0000-0000-000000000001", name: "Intonasi & Ritme", description: "Ketepatan jeda, dinamika tempo cepat-lambat, tinggi-rendah nada", weight: 25, max_score: 100, sort_order: 3 },
    { id: "b0000001-0000-0000-0000-000000000004", competition_id: "a0000000-0000-0000-0000-000000000001", name: "Gestur & Penampilan", description: "Kerapian busana, keserasian gerak tubuh, etika panggung", weight: 15, max_score: 100, sort_order: 4 },

    // Film Pendek (30 + 25 + 20 + 15 + 10 = 100)
    { id: "b0000002-0000-0000-0000-000000000001", competition_id: "a0000000-0000-0000-0000-000000000002", name: "Kekuatan Cerita & Skenario", description: "Struktur dramatik narasi, pesan moral, orisinalitas ide", weight: 30, max_score: 100, sort_order: 1 },
    { id: "b0000002-0000-0000-0000-000000000002", competition_id: "a0000000-0000-0000-0000-000000000002", name: "Sinematografi & Visual", description: "Komposisi framing, pencahayaan, pergerakan kamera, grading warna", weight: 25, max_score: 100, sort_order: 2 },
    { id: "b0000002-0000-0000-0000-000000000003", competition_id: "a0000000-0000-0000-0000-000000000002", name: "Akting & Pengadeganan", description: "Penghayatan peran pemeran, bloking adegan, naturalitas dialog", weight: 20, max_score: 100, sort_order: 3 },
    { id: "b0000002-0000-0000-0000-000000000004", competition_id: "a0000000-0000-0000-0000-000000000002", name: "Tata Suara & Musik", description: "Kualitas audio dialog jernih, scoring musik latar, sound FX", weight: 15, max_score: 100, sort_order: 4 },
    { id: "b0000002-0000-0000-0000-000000000005", competition_id: "a0000000-0000-0000-0000-000000000002", name: "Keselarasan Tema Sumpah Pemuda", description: "Kesesuaian pesan dengan semangat persatuan bangsa", weight: 10, max_score: 100, sort_order: 5 },

    // Pidato (30 + 25 + 25 + 20 = 100)
    { id: "b0000003-0000-0000-0000-000000000001", competition_id: "a0000000-0000-0000-0000-000000000003", name: "Isi & Relevansi Tema", description: "Kesesuaian gagasan, kedalaman argumen, solusi inspiratif", weight: 30, max_score: 100, sort_order: 1 },
    { id: "b0000003-0000-0000-0000-000000000002", competition_id: "a0000000-0000-0000-0000-000000000003", name: "Ketepatan Bahasa Indonesia", description: "Struktur kalimat baku, ketepatan diksi, kaidah tata bahasa EYD", weight: 25, max_score: 100, sort_order: 2 },
    { id: "b0000003-0000-0000-0000-000000000003", competition_id: "a0000000-0000-0000-0000-000000000003", name: "Retorika & Daya Pikat", description: "Kemampuan memikat audiens, intonasi persuasif, kontak mata", weight: 25, max_score: 100, sort_order: 3 },
    { id: "b0000003-0000-0000-0000-000000000004", competition_id: "a0000000-0000-0000-0000-000000000003", name: "Sikap & Penampilan", description: "Kerapian busana, kepercayaan diri, penguasaan podium", weight: 20, max_score: 100, sort_order: 4 },

    // Melukis (30 + 30 + 25 + 15 = 100)
    { id: "b0000004-0000-0000-0000-000000000001", competition_id: "a0000000-0000-0000-0000-000000000004", name: "Kreativitas & Orisinalitas", description: "Keunikan konsep ide, eksplorasi motif nusantara", weight: 30, max_score: 100, sort_order: 1 },
    { id: "b0000004-0000-0000-0000-000000000002", competition_id: "a0000000-0000-0000-0000-000000000004", name: "Keselarasan Tema", description: "Representasi tema Sumpah Pemuda dan kekayaan budaya", weight: 30, max_score: 100, sort_order: 2 },
    { id: "b0000004-0000-0000-0000-000000000003", competition_id: "a0000000-0000-0000-0000-000000000004", name: "Komposisi & Estetika Warna", description: "Keseimbangan tata letak, keharmonisan gradasi dan palet warna", weight: 25, max_score: 100, sort_order: 3 },
    { id: "b0000004-0000-0000-0000-000000000004", competition_id: "a0000000-0000-0000-0000-000000000004", name: "Kerapian & Teknik Melukis", description: "Kebersihan karya, ketelitian garis tepi, daya lekat cat pada kanvas", weight: 15, max_score: 100, sort_order: 4 },

    // Monolog (35 + 25 + 25 + 15 = 100)
    { id: "b0000005-0000-0000-0000-000000000001", competition_id: "a0000000-0000-0000-0000-000000000005", name: "Penghayatan Karakter", description: "Transformasi kejiwaan peran, emosi tokoh, penghidupan lakon", weight: 35, max_score: 100, sort_order: 1 },
    { id: "b0000005-0000-0000-0000-000000000002", competition_id: "a0000000-0000-0000-0000-000000000005", name: "Vokal & Diksi Panggung", description: "Artikulasi teaterikal, kejelasan dialog, dinamika suara", weight: 25, max_score: 100, sort_order: 2 },
    { id: "b0000005-0000-0000-0000-000000000003", competition_id: "a0000000-0000-0000-0000-000000000005", name: "Penguasaan Panggung & Gerak", description: "Pemanfaatan ruang pentas, keselarasan gestur tubuh, bloking", weight: 25, max_score: 100, sort_order: 3 },
    { id: "b0000005-0000-0000-0000-000000000004", competition_id: "a0000000-0000-0000-0000-000000000005", name: "Artistik & Karakteristik Busana", description: "Kesesuaian tata rias dan kostum dengan latar drama", weight: 15, max_score: 100, sort_order: 4 },

    // MC Formal (35 + 25 + 25 + 15 = 100)
    { id: "b0000006-0000-0000-0000-000000000001", competition_id: "a0000000-0000-0000-0000-000000000006", name: "Artikulasi & Diksi Bahasa Baku", description: "Pelafalan bahasa Indonesia formal, kepatuhan kaidah protokoler", weight: 35, max_score: 100, sort_order: 1 },
    { id: "b0000006-0000-0000-0000-000000000002", competition_id: "a0000000-0000-0000-0000-000000000006", name: "Protokoler & Tata Susun Acara", description: "Kelancaran susunan susunan acara kenegaraan, ketepatan etika salam", weight: 25, max_score: 100, sort_order: 2 },
    { id: "b0000006-0000-0000-0000-000000000003", competition_id: "a0000000-0000-0000-0000-000000000006", name: "Ketepatan Intonasi & Tempo", description: "Kewibawaan nada suara, tempo stabil, ketenangan pemanduan", weight: 25, max_score: 100, sort_order: 3 },
    { id: "b0000006-0000-0000-0000-000000000004", competition_id: "a0000000-0000-0000-0000-000000000006", name: "Sikap Tubuh & Kerapian Busana", description: "Postur tubuh tegak, keanggunan, tata rias rapi formal", weight: 15, max_score: 100, sort_order: 4 },

    // Palang Pintu (35 + 25 + 25 + 15 = 100)
    { id: "b0000007-0000-0000-0000-000000000001", competition_id: "a0000000-0000-0000-0000-000000000007", name: "Ketangkasan Pantun Betawi", description: "Kelincahan berbalas pantun, rima a-b-a-b, humor mendidik", weight: 35, max_score: 100, sort_order: 1 },
    { id: "b0000007-0000-0000-0000-000000000002", competition_id: "a0000000-0000-0000-0000-000000000007", name: "Jurus & Silat Tradisional", description: "Keindahan jurus silat beksi, ketegasan gerak, ketangkasan kembangan", weight: 25, max_score: 100, sort_order: 2 },
    { id: "b0000007-0000-0000-0000-000000000003", competition_id: "a0000000-0000-0000-0000-000000000007", name: "Kekompakan Rombongan & Iringan Musik", description: "Keserasian pukulan rebana ketimpring, lantunan salawat, kebersamaan", weight: 25, max_score: 100, sort_order: 3 },
    { id: "b0000007-0000-0000-0000-000000000004", competition_id: "a0000000-0000-0000-0000-000000000007", name: "Adab, Atribut & Busana Adat Betawi", description: "Kelengkapan busana ujung serong / baju sadariah, peci hitam, cukin", weight: 15, max_score: 100, sort_order: 4 },

    // Vokal Grup (35 + 25 + 20 + 20 = 100)
    { id: "b0000008-0000-0000-0000-000000000001", competition_id: "a0000000-0000-0000-0000-000000000008", name: "Harmoni Suara & Aransemen", description: "Keseimbangan pembagian suara (sopran, alto, tenor, bas), kekayaan aransemen", weight: 35, max_score: 100, sort_order: 1 },
    { id: "b0000008-0000-0000-0000-000000000002", competition_id: "a0000000-0000-0000-0000-000000000008", name: "Ketepatan Nada & Pitch Control", description: "Akurasi nada vokal, intonasi bersih tanpa fals, keselarasan akord", weight: 25, max_score: 100, sort_order: 2 },
    { id: "b0000008-0000-0000-0000-000000000003", competition_id: "a0000000-0000-0000-0000-000000000008", name: "Artikulasi & Dinamika Musikal", description: "Kejelasan lirik syair, penjiwaan crescendo-decrescendo", weight: 20, max_score: 100, sort_order: 3 },
    { id: "b0000008-0000-0000-0000-000000000004", competition_id: "a0000000-0000-0000-0000-000000000008", name: "Koreografi, Kostum & Penampilan", description: "Keseragaman gerak, busana adat kreasi, ekspresi panggung", weight: 20, max_score: 100, sort_order: 4 },
  ];

  const { error: errCrit } = await supabase.from("competition_criteria").upsert(criteriaData, { onConflict: "id" });
  if (errCrit) console.error("   ❌ Gagal seed competition_criteria:", errCrit.message);
  else console.log(`   ✅ Berhasil seed ${criteriaData.length} kriteria berbobot 100%`);

  // 4. STANDS
  console.log("📦 4. Seeding stands (8 Stand Pameran Budaya)...");
  const standsData = [
    { id: "c0000000-0000-0000-0000-000000000001", competition_id: "a0000000-0000-0000-0000-000000000001", name: "Stand Membaca Puisi", code: "PUISI01", qr_token: "d3b07384-d113-46fb-b09a-528256a47a11", description: "Nikmati pembacaan puisi interaktif dan kenali bait-bait karya Chairil Anwar.", booth_location: "Selasar Barat No. 01", points_per_visit: 10, max_visits_per_participant: 1, is_active: true },
    { id: "c0000000-0000-0000-0000-000000000002", competition_id: "a0000000-0000-0000-0000-000000000002", name: "Stand Film Pendek", code: "FILM02", qr_token: "e4c18495-e224-57ac-c10b-639367b58b22", description: "Tonton cuplikan teaser karya film peserta dan ikuti mini kuis sinematografi.", booth_location: "Hall Sinema Lt. 2 No. 02", points_per_visit: 10, max_visits_per_participant: 1, is_active: true },
    { id: "c0000000-0000-0000-0000-000000000003", competition_id: "a0000000-0000-0000-0000-000000000005", name: "Stand Teater Monolog", code: "MONO03", qr_token: "f5d29506-f335-68bd-d21c-740478c69c33", description: "Coba properti panggung teater dan berfoto ala tokoh pejuang kemerdekaan.", booth_location: "Lobby Teater A No. 03", points_per_visit: 10, max_visits_per_participant: 1, is_active: true },
    { id: "c0000000-0000-0000-0000-000000000004", competition_id: "a0000000-0000-0000-0000-000000000004", name: "Stand Melukis Tas Kanvas", code: "KANVAS04", qr_token: "a6e30617-a446-79ce-e32d-851589d70d44", description: "Coba goresan cat akrilik pada kain kanvas dan pelajari ornamen tradisional.", booth_location: "Area Kreatif Selasar No. 04", points_per_visit: 10, max_visits_per_participant: 1, is_active: true },
    { id: "c0000000-0000-0000-0000-000000000005", competition_id: "a0000000-0000-0000-0000-000000000006", name: "Stand MC Formal", code: "MCFRM05", qr_token: "b7f41728-b557-80df-f43e-962690e81e55", description: "Praktik membaca naskah protokoler kenegaraan di depan cermin mikrofon.", booth_location: "Lobi Protokoler No. 05", points_per_visit: 10, max_visits_per_participant: 1, is_active: true },
    { id: "c0000000-0000-0000-0000-000000000006", competition_id: "a0000000-0000-0000-0000-000000000007", name: "Stand Tradisi Palang Pintu", code: "PALANG06", qr_token: "c8052839-c668-91e0-054f-073701f92f66", description: "Belajar pantun Betawi spontan dan berfoto bersama jawara berpakaian cukin.", booth_location: "Pelataran Budaya No. 06", points_per_visit: 10, max_visits_per_participant: 1, is_active: true },
    { id: "c0000000-0000-0000-0000-000000000007", competition_id: "a0000000-0000-0000-0000-000000000008", name: "Stand Vokal Grup", code: "VOKAL07", qr_token: "d9163940-d779-02f1-1650-184812a03a77", description: "Tebak aransemen harmoni lagu daerah dan nyanyikan potongan lagu bersama.", booth_location: "Foyer Panggung Utama No. 07", points_per_visit: 10, max_visits_per_participant: 1, is_active: true },
    { id: "c0000000-0000-0000-0000-000000000008", competition_id: null, name: "Stand Media Center & Twibbon", code: "MEDIA08", qr_token: "ea274051-e88a-1302-2761-295923b14b88", description: "Bantuan unggah twibbon, foto cetak instan, dan panduan challenge acara.", booth_location: "Pusat Informasi Tengah No. 08", points_per_visit: 10, max_visits_per_participant: 1, is_active: true },
  ];

  const { error: errStands } = await supabase.from("stands").upsert(standsData, { onConflict: "id" });
  if (errStands) console.error("   ❌ Gagal seed stands:", errStands.message);
  else console.log("   ✅ Berhasil seed 8 stand budaya");

  // 5. CHALLENGES
  console.log("📦 5. Seeding challenges (Gamifikasi)...");
  const challengesData = [
    { id: "d0000000-0000-0000-0000-000000000001", slug: "keliling-8-stand", title: "Keliling 8 Stand Lomba Nusantara", description: "Kunjungi seluruh 8 stand pameran lomba, scan kode QR di tiap stand, dan kumpulkan poin maksimal!", type: "scan_qr", point_reward: 80, max_claims: 500, badge_icon: "Penjelajah Bahasa", is_active: true },
    { id: "d0000000-0000-0000-0000-000000000002", slug: "ikrar-sumpah-pemuda", title: "Rekam Video Ikrar Sumpah Pemuda", description: "Rekam video berdurasi 30-60 detik membacakan teks asli Sumpah Pemuda di spot foto resmi panitia.", type: "unggah_bukti", point_reward: 50, max_claims: 300, badge_icon: "Pilar Pemuda", is_active: true },
    { id: "d0000000-0000-0000-0000-000000000003", slug: "kuis-bahasa-indonesia", title: "Kuis Cerdas Cermat Bahasa Indonesia (10 Soal)", description: "Jawab kuis 10 pertanyaan seputar kaidah EYD, asal-usul kata serapan, dan sejarah Sumpah Pemuda 1928.", type: "kode_unik", point_reward: 30, max_claims: 1000, badge_icon: "Kamus Berjalan", is_active: true },
    { id: "d0000000-0000-0000-0000-000000000004", slug: "twibbon-gebyar", title: "Tantangan Twibbon GebyarBulanBahasa", description: "Unggah foto terbaikmu menggunakan Twibbon resmi acara ke Instagram/TikTok dan submit ke galeri acara.", type: "unggah_bukti", point_reward: 20, max_claims: 1000, badge_icon: "Duta Bahasa", is_active: true },
    { id: "d0000000-0000-0000-0000-000000000005", slug: "wawancara-juri", title: "Wawancara Singkat Juri Favorit", description: "Ajak diskusi singkat salah satu dewan juri setelah sesi lomba selesai dan unggah intisari nasihat sastranya.", type: "unggah_bukti", point_reward: 40, max_claims: 100, badge_icon: "Pewarta Muda", is_active: true },
  ];

  const { error: errChal } = await supabase.from("challenges").upsert(challengesData, { onConflict: "id" });
  if (errChal) console.error("   ❌ Gagal seed challenges:", errChal.message);
  else console.log("   ✅ Berhasil seed 5 tantangan interaktif");

  // 6. REWARDS
  console.log("📦 6. Seeding rewards (Merchandise)...");
  const rewardsData = [
    { id: "e0000000-0000-0000-0000-000000000001", name: "Pin Logam Edisi Sumpah Pemuda 2025", description: "Pin enamel kuningan eksklusif berlogo GebyarBulanBahasa dengan sepuhan emas.", points_required: 100, quota: 200, claimed_count: 74, is_active: true, sort_order: 1 },
    { id: "e0000000-0000-0000-0000-000000000002", name: "Voucher Kopi Nusantara Rp25.000", description: "Voucher belanja di seluruh tenant kuliner kopi tradisional area festival.", points_required: 150, quota: 120, claimed_count: 62, is_active: true, sort_order: 2 },
    { id: "e0000000-0000-0000-0000-000000000003", name: "Tote Bag Kanvas GebyarBulanBahasa", description: "Tote bag bahan kanvas tebal dengan sablon tipografi kutipan Sumpah Pemuda.", points_required: 250, quota: 80, claimed_count: 39, is_active: true, sort_order: 3 },
    { id: "e0000000-0000-0000-0000-000000000004", name: "Tiket Prioritas Kursi VIP Pentas Seni", description: "Akses tempat duduk baris terdepan pada Malam Penganugerahan & Pentas Seni puncak.", points_required: 300, quota: 50, claimed_count: 28, is_active: true, sort_order: 4 },
    { id: "e0000000-0000-0000-0000-000000000005", name: "Buku Antologi Puisi & Naskah Juara", description: "Buku cetak eksklusif kumpulan karya puisi dan naskah pidato terbaik Gebyar Bulan Bahasa.", points_required: 400, quota: 30, claimed_count: 11, is_active: true, sort_order: 5 },
  ];

  const { error: errRew } = await supabase.from("rewards").upsert(rewardsData, { onConflict: "id" });
  if (errRew) console.error("   ❌ Gagal seed rewards:", errRew.message);
  else console.log("   ✅ Berhasil seed 5 merchandise & rewards");

  // 7. SCHEDULES
  console.log("📦 7. Seeding schedules (Jadwal 3 Hari)...");
  const schedulesData = [
    { id: "f0000000-0000-0000-0000-000000000001", competition_id: "a0000000-0000-0000-0000-000000000007", title: "Lomba Seni Tradisi Palang Pintu", description: "Adu pantun dan jurus silat tradisional Betawi antar sanggar seni.", event_day: 1, event_date: "2025-10-26", start_time: "14:00:00", end_time: "17:30:00", venue: "Lapangan Terbuka", stage: "Pelataran Budaya", host_name: "Bang Udin & Mpok Romlah", status: "selesai", sort_order: 1 },
    { id: "f0000000-0000-0000-0000-000000000002", competition_id: null, title: "Pentas Musik Pembuka: Kolaborasi Gamelan & Akustik", description: "Pergelaran pembukaan festival menyambut para delegasi dan kontingen.", event_day: 1, event_date: "2025-10-26", start_time: "19:00:00", end_time: "21:00:00", venue: "Panggung Utama", stage: "Stage A", host_name: "Dewi Sekar", status: "selesai", sort_order: 2 },
    { id: "f0000000-0000-0000-0000-000000000003", competition_id: "a0000000-0000-0000-0000-000000000001", title: "Lomba Membaca Puisi Sastra Nusantara", description: "Penampilan membaca puisi karya penyair terkemuka Indonesia.", event_day: 2, event_date: "2025-10-27", start_time: "09:00:00", end_time: "12:00:00", venue: "Panggung Utama", stage: "Stage A", host_name: "Rizal Ramli", status: "berlangsung", sort_order: 3 },
    { id: "f0000000-0000-0000-0000-000000000004", competition_id: "a0000000-0000-0000-0000-000000000004", title: "Lomba Melukis Tas Kanvas Nusantara", description: "Kreasi visual motif ornamen tradisional pada tas kain kanvas.", event_day: 2, event_date: "2025-10-27", start_time: "10:00:00", end_time: "13:00:00", venue: "Area Kreatif Selasar", stage: "Zona Kreatif B", host_name: "Nadira Putri", status: "berlangsung", sort_order: 4 },
    { id: "f0000000-0000-0000-0000-000000000005", competition_id: "a0000000-0000-0000-0000-000000000003", title: "Lomba Pidato Bahasa Indonesia", description: "Orasi gagasan generasi muda dengan tema persatuan bangsa.", event_day: 2, event_date: "2025-10-27", start_time: "13:00:00", end_time: "16:30:00", venue: "Aula Serbaguna", stage: "Podium Utama", host_name: "Aditya Pratama", status: "terjadwal", sort_order: 5 },
    { id: "f0000000-0000-0000-0000-000000000006", competition_id: null, title: "Talkshow Budaya: Menjaga Bahasa Ibu di Era Kecerdasan Buatan", description: "Diskusi panel pakar bahasa dan budayawan tentang kelestarian bahasa lokal.", event_day: 2, event_date: "2025-10-27", start_time: "19:30:00", end_time: "21:00:00", venue: "Aula Serbaguna", stage: "Podium Utama", host_name: "Dra. Endang Sulastri", status: "terjadwal", sort_order: 6 },
    { id: "f0000000-0000-0000-0000-000000000007", competition_id: "a0000000-0000-0000-0000-000000000002", title: "Pemutaran & Penjurian Film Pendek Fiksi", description: "Screening karya sinematografi film pendek dan sesi tanya-jawab juri.", event_day: 3, event_date: "2025-10-28", start_time: "09:00:00", end_time: "15:00:00", venue: "Ruang Bioskop Mini", stage: "Hall Sinema Lt. 2", host_name: "Bagus Wicaksono", status: "terjadwal", sort_order: 7 },
    { id: "f0000000-0000-0000-0000-000000000008", competition_id: "a0000000-0000-0000-0000-000000000005", title: "Lomba Seni Teater Monolog Kebangsaan", description: "Pentas monolog lakon kepahlawanan pejuang kemerdekaan.", event_day: 3, event_date: "2025-10-28", start_time: "10:30:00", end_time: "14:00:00", venue: "Ruang Teater A", stage: "Panggung Blackbox", host_name: "Taufik Hidayat", status: "terjadwal", sort_order: 8 },
    { id: "f0000000-0000-0000-0000-000000000009", competition_id: "a0000000-0000-0000-0000-000000000006", title: "Lomba Pembawa Acara (MC) Formal Kenegaraan", description: "Simulasi pemanduan protokoler upacara peringatan Hari Sumpah Pemuda.", event_day: 3, event_date: "2025-10-28", start_time: "14:00:00", end_time: "17:00:00", venue: "Panggung Utama", stage: "Stage A", host_name: "Rina Kartika", status: "terjadwal", sort_order: 9 },
    { id: "f0000000-0000-0000-0000-000000000010", competition_id: "a0000000-0000-0000-0000-000000000008", title: "Lomba Vokal Grup Lagu Daerah & Nasional", description: "Harmoni paduan suara kelompok membawakan lagu daerah dan nasional.", event_day: 3, event_date: "2025-10-28", start_time: "19:00:00", end_time: "21:30:00", venue: "Panggung Utama", stage: "Stage A", host_name: "Dewi Anggraini", status: "terjadwal", sort_order: 10 },
    { id: "f0000000-0000-0000-0000-000000000011", competition_id: null, title: "Malam Penganugerahan Juara & Ikrar Sumpah Pemuda 2025", description: "Malam puncak pengumuman juara seluruh cabang lomba dan pembacaan ikrar.", event_day: 3, event_date: "2025-10-28", start_time: "21:30:00", end_time: "23:00:00", venue: "Panggung Utama", stage: "Stage A", host_name: "Seluruh Panitia & Tamu Kehormatan", status: "terjadwal", sort_order: 11 },
  ];

  const { error: errSch } = await supabase.from("schedules").upsert(schedulesData, { onConflict: "id" });
  if (errSch) console.error("   ❌ Gagal seed schedules:", errSch.message);
  else console.log("   ✅ Berhasil seed 11 agenda acara 3 hari");

  // 8. ANNOUNCEMENTS
  console.log("📦 8. Seeding announcements (Pengumuman Resmi)...");
  const announcementsData = [
    { id: "10000000-0000-0000-0000-000000000001", slug: "pengambilan-nomor-peserta-puisi", title: "Pengambilan Nomor Urut Peserta Lomba Membaca Puisi", category: "penting", body: "Pengambilan nomor dada dan pengundian urutan tampil peserta Lomba Membaca Puisi dapat dilakukan di Sekretariat Panitia (Gedung A Lt. 1) mulai pukul 07.30 WIB. Peserta wajib hadir minimal 30 menit sebelum jadwal lomba dimulai.", is_published: true, is_pinned: true, show_on_monitor: true },
    { id: "10000000-0000-0000-0000-000000000002", slug: "perubahan-ruang-sidang-film-pendek", title: "Konfirmasi Uji Coba Audio Ruang Bioskop Mini untuk Film Pendek", category: "jadwal", body: "Seluruh tim peserta Film Pendek dapat melakukan uji format file dan kalibrasi audio di Ruang Bioskop Mini hari ini pukul 16.00 - 18.00 WIB didampingi tim Media Center.", is_published: true, is_pinned: false, show_on_monitor: true },
    { id: "10000000-0000-0000-0000-000000000003", slug: "hasil-juara-palang-pintu-2025", title: "Selamat Kepada Pemenang Lomba Seni Tradisi Palang Pintu", category: "pemenang", body: "Dewan juri telah merampungkan rekapitulasi penilaian digital untuk Lomba Tradisi Palang Pintu. Juara 1 diraih oleh Sanggar Seni Si Pitung Rawa Belong dengan total nilai terbobot 94,80. Daftar lengkap pemenang dapat dilihat di laman Pemenang.", is_published: true, is_pinned: true, show_on_monitor: true },
    { id: "10000000-0000-0000-0000-000000000004", slug: "ketentuan-penukaran-poin-challenge", title: "Batas Akhir Klaim Hadiah Poin Challenge Acara", category: "umum", body: "Penukaran poin challenge dengan merchandise eksklusif dapat dilayani di Stand Media Center setiap hari pukul 10.00 s/d 18.00 WIB. Pastikan saldo poin mencukupi dan tunjukkan kode QR akun peserta.", is_published: true, is_pinned: false, show_on_monitor: false },
  ];

  const { error: errAnn } = await supabase.from("announcements").upsert(announcementsData, { onConflict: "id" });
  if (errAnn) console.error("   ❌ Gagal seed announcements:", errAnn.message);
  else console.log("   ✅ Berhasil seed 4 pengumuman resmi");

  // 9. WINNERS
  console.log("📦 9. Seeding winners (Pemenang Palang Pintu)...");
  const winnersData = [
    { id: "20000000-0000-0000-0000-000000000001", category: "lomba", competition_id: "a0000000-0000-0000-0000-000000000007", winner_name: "Rezky Ramadhan & Tim (Jawara Cukin Rawa Belong)", institution: "Sanggar Seni Si Pitung Rawa Belong", rank: 1, title: "Juara 1", final_score: 94.80, prize: "Piala Bergilir Gubernur + Uang Pembinaan Rp5.000.000 + Piagam", is_published: true },
    { id: "20000000-0000-0000-0000-000000000002", category: "lomba", competition_id: "a0000000-0000-0000-0000-000000000007", winner_name: "M. Syafi'i & Kawan-kawan (Kembang Kelapa Ciganjur)", institution: "Sanggar Palang Pintu Jagakarsa", rank: 2, title: "Juara 2", final_score: 91.50, prize: "Piala + Uang Pembinaan Rp3.500.000 + Piagam", is_published: true },
    { id: "20000000-0000-0000-0000-000000000003", category: "lomba", competition_id: "a0000000-0000-0000-0000-000000000007", winner_name: "Fajar Kurniawan & Tim (Pendekar Tenabang)", institution: "Komunitas Seni Budaya Tanah Abang", rank: 3, title: "Juara 3", final_score: 88.20, prize: "Piala + Uang Pembinaan Rp2.500.000 + Piagam", is_published: true },
  ];

  const { error: errWin } = await supabase.from("winners").upsert(winnersData, { onConflict: "id" });
  if (errWin) console.error("   ❌ Gagal seed winners:", errWin.message);
  else console.log("   ✅ Berhasil seed 3 pemenang lomba");

  console.log(`\n======================================================`);
  console.log(`🎉 SEED DATABASE SELESAI DENGAN SUKSES!`);
  console.log(`======================================================\n`);
}

seed().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
