// =====================================================================
// DATA DUMMY GEBYAR BULAN BAHASA & KEBUDAYAAN (PERINGATAN HARI SUMPAH PEMUDA)
// Berdasarkan Bab 9 & Bab 10 PRD
// =====================================================================

export interface CompetitionCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // Persentase bobot (Total wajib 100)
  maxScore: number;
}

export interface Competition {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  category: "individu" | "kelompok";
  status: "pendaftaran" | "berlangsung" | "selesai" | "draft" | "terjadwal" | "dibatalkan";
  description: string;
  venue: string;
  stage: string;
  date: string;
  time: string;
  minMembers: number;
  maxMembers: number;
  maxParticipants: number;
  currentParticipantsCount: number;
  aggregation: "rata_rata" | "total" | "rata_rata_buang_ekstrem";
  rules: string[];
  criteria: CompetitionCriterion[];
}

export interface Participant {
  id: string;
  registrationNumber: string;
  fullName: string;
  institution: string;
  email: string;
  phone: string;
  competitionId: string;
  competitionName: string;
  category: "individu" | "kelompok";
  teamName?: string;
  teamMembers?: string[];
  status: "terverifikasi" | "menunggu_verifikasi" | "ditolak";
  rejectionReason?: string;
  totalPoints: number;
  registeredAt: string;
  documents: {
    id: string;
    type: "kartu_pelajar" | "surat_izin" | "karya";
    fileName: string;
    fileUrl?: string;
    status: "valid" | "menunggu" | "tidak_valid";
  }[];
}

export interface Judge {
  id: string;
  fullName: string;
  title: string;
  email: string;
  expertise: string;
  avatarUrl: string;
  assignedCompetitionIds: string[];
  isChiefJudge?: boolean;
}

export interface ScheduleItem {
  id: string;
  competitionId?: string;
  title: string;
  day: number;
  date: string;
  time: string;
  venue: string;
  stage: string;
  host: string;
  status: "terjadwal" | "berlangsung" | "selesai";
}

export interface Stand {
  id: string;
  name: string;
  code: string;
  competitionSlug: string;
  location: string;
  points: number;
  description: string;
  qrToken: string;
  visitCount: number;
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: "scan_qr" | "kode_unik" | "unggah_bukti" | "input_panitia";
  pointReward: number;
  badge: string;
  participantsCount: number;
  status: "aktif" | "selesai";
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  quota: number;
  claimedCount: number;
  category: "Merchandise" | "Voucher" | "Buku" | "Akses";
}

export interface Announcement {
  id: string;
  slug: string;
  title: string;
  category: "umum" | "jadwal" | "pemenang" | "penting";
  body: string;
  publishedAt: string;
  isPinned: boolean;
  author: string;
  showOnMonitor: boolean;
}

export interface TwibbonItem {
  id: string;
  uploaderName: string;
  institution: string;
  participantNumber?: string;
  caption: string;
  imageUrl: string;
  status: "disetujui" | "menunggu" | "ditolak";
  isFeatured: boolean;
  likesCount: number;
  uploadedAt: string;
}

export interface Winner {
  id: string;
  competitionId: string;
  competitionName: string;
  rank: 1 | 2 | 3 | 4;
  title: string; // 'Juara 1', 'Juara 2', 'Juara 3', 'Harapan 1'
  winnerName: string;
  teamName?: string;
  institution: string;
  finalScore: number;
  prize: string;
}

export interface ScoreRecap {
  registrationId: string;
  participantName: string;
  institution: string;
  competitionId: string;
  scoresPerJudge: {
    judgeId: string;
    judgeName: string;
    scores: Record<string, number>; // criterionId -> score
    weightedTotal: number;
    notes?: string;
    status: "draft" | "terkirim";
  }[];
  finalAverageScore: number;
  rank: number;
}

// =====================================================================
// 8 KOMPETISI LENGKAP DENGAN KRITERIA BERBOBOT (TOTAL 100%)
// =====================================================================
export const COMPETITIONS: Competition[] = [
  {
    id: "comp-1",
    slug: "membaca-puisi",
    name: "Membaca Puisi",
    shortName: "Puisi",
    category: "individu",
    status: "berlangsung",
    description:
      "Lomba membaca karya puisi sastra nusantara dan puisi bertema Sumpah Pemuda untuk mengobarkan semangat persatuan generasi penerus bangsa.",
    venue: "Panggung Utama",
    stage: "Stage A",
    date: "27 Oktober 2025",
    time: "09:00 - 12:00 WIB",
    minMembers: 1,
    maxMembers: 1,
    maxParticipants: 25,
    currentParticipantsCount: 22,
    aggregation: "rata_rata",
    rules: [
      "Membaca 1 puisi wajib karya penyair nasional dan 1 puisi pilihan.",
      "Durasi penampilan maksimal 7 menit tanpa alat pengeras suara tambahan.",
      "Peserta mengenakan pakaian batik atau busana daerah sopan.",
      "Penilaian murni mengacu pada penghayatan, vokal, dan intonasi.",
    ],
    criteria: [
      {
        id: "crit-pui-1",
        name: "Penghayatan & Penjiwaan",
        description: "Kedalaman emosi, pemahaman makna larik puisi, ketulusan ekspresi",
        weight: 35,
        maxScore: 100,
      },
      {
        id: "crit-pui-2",
        name: "Vokal & Artikulasi",
        description: "Kejelasan lafal, proyeksi suara, kebulatan vokal dan konsonan",
        weight: 25,
        maxScore: 100,
      },
      {
        id: "crit-pui-3",
        name: "Intonasi & Ritme",
        description: "Ketepatan jeda, dinamika tempo cepat-lambat, tinggi-rendah nada",
        weight: 25,
        maxScore: 100,
      },
      {
        id: "crit-pui-4",
        name: "Gestur & Penampilan",
        description: "Kerapian busana, keserasian gerak tubuh, etika panggung",
        weight: 15,
        maxScore: 100,
      },
    ],
  },
  {
    id: "comp-2",
    slug: "film-pendek",
    name: "Film Pendek",
    shortName: "Film",
    category: "kelompok",
    status: "berlangsung",
    description:
      "Kompetisi karya sinematografi fiksi pendek bertema 'Persatuan dalam Keberagaman Budaya Nusantara' dengan durasi 5-10 menit.",
    venue: "Ruang Bioskop Mini",
    stage: "Hall Sinema Lt. 2",
    date: "28 Oktober 2025",
    time: "09:00 - 15:00 WIB",
    minMembers: 3,
    maxMembers: 10,
    maxParticipants: 15,
    currentParticipantsCount: 14,
    aggregation: "rata_rata_buang_ekstrem",
    rules: [
      "Karya orisinal diproduksi kurun waktu 2024-2025 dan belum pernah memenangkan festival lain.",
      "Durasi video 5-10 menit termasuk kredit judul dan akhir.",
      "Format MP4/MOV Full HD 1080p dengan teks bahasa Indonesia baku.",
      "Bebas dari unsur SARA, ujaran kebencian, dan pelanggaran hak cipta musik.",
    ],
    criteria: [
      {
        id: "crit-flm-1",
        name: "Kekuatan Cerita & Skenario",
        description: "Struktur dramatik narasi, pesan moral, orisinalitas ide",
        weight: 30,
        maxScore: 100,
      },
      {
        id: "crit-flm-2",
        name: "Sinematografi & Visual",
        description: "Komposisi framing, pencahayaan, pergerakan kamera, grading warna",
        weight: 25,
        maxScore: 100,
      },
      {
        id: "crit-flm-3",
        name: "Akting & Pengadeganan",
        description: "Penghayatan peran pemeran, bloking adegan, naturalitas dialog",
        weight: 20,
        maxScore: 100,
      },
      {
        id: "crit-flm-4",
        name: "Tata Suara & Musik",
        description: "Kualitas audio dialog jernih, scoring musik latar, sound FX",
        weight: 15,
        maxScore: 100,
      },
      {
        id: "crit-flm-5",
        name: "Keselarasan Tema Sumpah Pemuda",
        description: "Kesesuaian pesan dengan semangat persatuan bangsa",
        weight: 10,
        maxScore: 100,
      },
    ],
  },
  {
    id: "comp-3",
    slug: "pidato",
    name: "Pidato Bahasa Indonesia",
    shortName: "Pidato",
    category: "individu",
    status: "berlangsung",
    description:
      "Ajang orasi dan adu gagasan kebangsaan peserta dengan tema 'Menginspirasi Indonesia Melalui Bahasa Persatuan'.",
    venue: "Aula Serbaguna",
    stage: "Podium Utama",
    date: "27 Oktober 2025",
    time: "13:00 - 16:30 WIB",
    minMembers: 1,
    maxMembers: 1,
    maxParticipants: 20,
    currentParticipantsCount: 18,
    aggregation: "rata_rata",
    rules: [
      "Durasi orasi 5-7 menit; lampu indikator hijau (mulai), kuning (1 menit tersisa), merah (selesai).",
      "Pidato dibawakan tanpa membaca naskah penuh (catatan poin diperkenankan).",
      "Busana formal rapi atau jas almamater / seragam sekolah.",
    ],
    criteria: [
      {
        id: "crit-pid-1",
        name: "Isi & Relevansi Tema",
        description: "Kesesuaian gagasan, kedalaman argumen, solusi inspiratif",
        weight: 30,
        maxScore: 100,
      },
      {
        id: "crit-pid-2",
        name: "Ketepatan Bahasa Indonesia",
        description: "Struktur kalimat baku, ketepatan diksi, kaidah tata bahasa EYD",
        weight: 25,
        maxScore: 100,
      },
      {
        id: "crit-pid-3",
        name: "Retorika & Daya Pikat",
        description: "Kemampuan memikat audiens, intonasi persuasif, kontak mata",
        weight: 25,
        maxScore: 100,
      },
      {
        id: "crit-pid-4",
        name: "Sikap & Penampilan",
        description: "Kerapian busana, kepercayaan diri, penguasaan podium",
        weight: 20,
        maxScore: 100,
      },
    ],
  },
  {
    id: "comp-4",
    slug: "melukis-tas-kanvas",
    name: "Melukis Tas Kanvas",
    shortName: "Melukis",
    category: "individu",
    status: "berlangsung",
    description:
      "Lomba kreasi seni visual pada media tote bag kanvas bertema motif ornamen tradisional Indonesia berpadu tipografi aksara nusantara.",
    venue: "Area Kreatif Selasar",
    stage: "Zona Kreatif B",
    date: "27 Oktober 2025",
    time: "10:00 - 13:00 WIB",
    minMembers: 1,
    maxMembers: 1,
    maxParticipants: 30,
    currentParticipantsCount: 26,
    aggregation: "rata_rata",
    rules: [
      "Media tas kanvas disediakan panitia; cat akrilik dan kuas dibawa peserta.",
      "Durasi melukis 180 menit tanpa bantuan orang lain.",
      "Karya wajib memadukan motif budaya nusantara dengan kutipan berbahasa Indonesia.",
    ],
    criteria: [
      {
        id: "crit-kvs-1",
        name: "Kreativitas & Orisinalitas",
        description: "Keunikan konsep ide, eksplorasi motif nusantara",
        weight: 30,
        maxScore: 100,
      },
      {
        id: "crit-kvs-2",
        name: "Keselarasan Tema",
        description: "Representasi tema Sumpah Pemuda dan kekayaan budaya",
        weight: 30,
        maxScore: 100,
      },
      {
        id: "crit-kvs-3",
        name: "Komposisi & Estetika Warna",
        description: "Keseimbangan tata letak, keharmonisan gradasi dan palet warna",
        weight: 25,
        maxScore: 100,
      },
      {
        id: "crit-kvs-4",
        name: "Kerapian & Teknik Melukis",
        description: "Kebersihan karya, ketelitian garis tepi, daya lekat cat pada kanvas",
        weight: 15,
        maxScore: 100,
      },
    ],
  },
  {
    id: "comp-5",
    slug: "monolog",
    name: "Seni Teater Monolog",
    shortName: "Monolog",
    category: "individu",
    status: "terjadwal",
    description:
      "Penampilan lakon drama tunggal mengangkat naskah tokoh pahlawan pergerakan nasional dan pemuda pejuang kemerdekaan.",
    venue: "Ruang Teater A",
    stage: "Panggung Blackbox",
    date: "28 Oktober 2025",
    time: "10:30 - 14:00 WIB",
    minMembers: 1,
    maxMembers: 1,
    maxParticipants: 16,
    currentParticipantsCount: 14,
    aggregation: "rata_rata",
    rules: [
      "Durasi pementasan 10-15 menit per peserta.",
      "Menggunakan naskah yang disediakan panitia atau naskah sastra klasik nusantara.",
      "Properti pendukung panggung dibatasi maksimal 3 item yang mudah dipindahkan.",
    ],
    criteria: [
      {
        id: "crit-mon-1",
        name: "Penghayatan Karakter",
        description: "Transformasi kejiwaan peran, emosi tokoh, penghidupan lakon",
        weight: 35,
        maxScore: 100,
      },
      {
        id: "crit-mon-2",
        name: "Vokal & Diksi Panggung",
        description: "Artikulasi teaterikal, kejelasan dialog, dinamika suara",
        weight: 25,
        maxScore: 100,
      },
      {
        id: "crit-mon-3",
        name: "Penguasaan Panggung & Gerak",
        description: "Pemanfaatan ruang pentas, keselarasan gestur tubuh, bloking",
        weight: 25,
        maxScore: 100,
      },
      {
        id: "crit-mon-4",
        name: "Artistik & Karakteristik Busana",
        description: "Kesesuaian tata rias dan kostum dengan latar drama",
        weight: 15,
        maxScore: 100,
      },
    ],
  },
  {
    id: "comp-6",
    slug: "mc-formal",
    name: "Pembawa Acara (MC) Formal",
    shortName: "MC Formal",
    category: "individu",
    status: "terjadwal",
    description:
      "Uji keahlian memandu protokoler kenegaraan dan upacara peringatan Hari Sumpah Pemuda menggunakan bahasa Indonesia baku yang anggun.",
    venue: "Panggung Utama",
    stage: "Stage A",
    date: "28 Oktober 2025",
    time: "14:00 - 17:00 WIB",
    minMembers: 1,
    maxMembers: 1,
    maxParticipants: 20,
    currentParticipantsCount: 19,
    aggregation: "rata_rata",
    rules: [
      "Simulasi memandu Upacara Peringatan Hari Sumpah Pemuda tingkat nasional.",
      "Durasi 5 menit per peserta dengan pembacaan teks protokoler.",
      "Mengenakan busana formal jas / kebaya nasional lengkap.",
    ],
    criteria: [
      {
        id: "crit-mc-1",
        name: "Artikulasi & Diksi Bahasa Baku",
        description: "Pelafalan bahasa Indonesia formal, kepatuhan kaidah protokoler",
        weight: 35,
        maxScore: 100,
      },
      {
        id: "crit-mc-2",
        name: "Protokoler & Tata Susun Acara",
        description: "Kelancaran susunan susunan acara kenegaraan, ketepatan etika salam",
        weight: 25,
        maxScore: 100,
      },
      {
        id: "crit-mc-3",
        name: "Ketepatan Intonasi & Tempo",
        description: "Kewibawaan nada suara, tempo stabil, ketenangan pemanduan",
        weight: 25,
        maxScore: 100,
      },
      {
        id: "crit-mc-4",
        name: "Sikap Tubuh & Kerapian Busana",
        description: "Postur tubuh tegak, keanggunan, tata rias rapi formal",
        weight: 15,
        maxScore: 100,
      },
    ],
  },
  {
    id: "comp-7",
    slug: "palang-pintu",
    name: "Seni Tradisi Palang Pintu",
    shortName: "Palang Pintu",
    category: "kelompok",
    status: "selesai",
    description:
      "Lomba kesenian tradisi Betawi memadukan adu pantun jenaka, jurus silat beksi tradisional, dan lantunan salawat.",
    venue: "Lapangan Terbuka",
    stage: "Pelataran Budaya",
    date: "26 Oktober 2025",
    time: "14:00 - 17:30 WIB",
    minMembers: 4,
    maxMembers: 8,
    maxParticipants: 10,
    currentParticipantsCount: 10,
    aggregation: "rata_rata",
    rules: [
      "Terdiri dari 1 jawara pantun, 2 pesilat beksi, dan pendamping rebana ketimpring.",
      "Durasi penampilan 10-12 menit per rombongan.",
      "Pantun wajib orisinal bertema pelestarian budaya nusantara dan sumpah pemuda.",
    ],
    criteria: [
      {
        id: "crit-plg-1",
        name: "Ketangkasan Pantun Betawi",
        description: "Kelincahan berbalas pantun, rima a-b-a-b, humor mendidik",
        weight: 35,
        maxScore: 100,
      },
      {
        id: "crit-plg-2",
        name: "Jurus & Silat Tradisional",
        description: "Keindahan jurus silat beksi, ketegasan gerak, ketangkasan kembangan",
        weight: 25,
        maxScore: 100,
      },
      {
        id: "crit-plg-3",
        name: "Kekompakan Rombongan & Iringan Musik",
        description: "Keserasian pukulan rebana ketimpring, lantunan salawat, kebersamaan",
        weight: 25,
        maxScore: 100,
      },
      {
        id: "crit-plg-4",
        name: "Adab, Atribut & Busana Adat Betawi",
        description: "Kelengkapan busana ujung serong / baju sadariah, peci hitam, cukin",
        weight: 15,
        maxScore: 100,
      },
    ],
  },
  {
    id: "comp-8",
    slug: "vokal-grup",
    name: "Vokal Grup Lagu Daerah & Nasional",
    shortName: "Vokal Grup",
    category: "kelompok",
    status: "terjadwal",
    description:
      "Harmoni paduan suara kelompok membawakan medley lagu wajib nasional 'Bangun Pemudi Pemuda' dan 1 lagu daerah pilihan nusantara.",
    venue: "Panggung Utama",
    stage: "Stage A",
    date: "28 Oktober 2025",
    time: "19:00 - 22:00 WIB",
    minMembers: 5,
    maxMembers: 12,
    maxParticipants: 12,
    currentParticipantsCount: 11,
    aggregation: "rata_rata_buang_ekstrem",
    rules: [
      "Jumlah anggota 5-12 penyanyi dengan instrumen pengiring akustik (non-minus one).",
      "Durasi total penampilan maksimal 10 menit untuk 2 lagu.",
      "Aransemen musik dan harmoni suara orisinal buatan tim.",
    ],
    criteria: [
      {
        id: "crit-vok-1",
        name: "Harmoni Suara & Aransemen",
        description: "Keseimbangan pembagian suara (sopran, alto, tenor, bas), kekayaan aransemen",
        weight: 35,
        maxScore: 100,
      },
      {
        id: "crit-vok-2",
        name: "Ketepatan Nada & Pitch Control",
        description: "Akurasi nada vokal, intonasi bersih tanpa fals, keselarasan akord",
        weight: 25,
        maxScore: 100,
      },
      {
        id: "crit-vok-3",
        name: "Artikulasi & Dinamika Musikal",
        description: "Kejelasan lirik syair, penjiwaan crescendo-decrescendo",
        weight: 20,
        maxScore: 100,
      },
      {
        id: "crit-vok-4",
        name: "Koreografi, Kostum & Penampilan",
        description: "Keseragaman gerak, busana adat kreasi, ekspresi panggung",
        weight: 20,
        maxScore: 100,
      },
    ],
  },
];

// =====================================================================
// DATA PESERTA BERKUALITAS (SESUAI BAB 9 PRD)
// =====================================================================
export const PARTICIPANTS: Participant[] = [
  {
    id: "part-1",
    registrationNumber: "GBB-PUI-014",
    fullName: "Ahmad Fauzan Ramadhan",
    institution: "SMAN 1 Bandung",
    email: "ahmad.fauzan@sman1bdg.sch.id",
    phone: "081223456781",
    competitionId: "comp-1",
    competitionName: "Membaca Puisi",
    category: "individu",
    status: "terverifikasi",
    totalPoints: 140,
    registeredAt: "2025-10-15 08:30 WIB",
    documents: [
      { id: "doc-1", type: "kartu_pelajar", fileName: "kartu_pelajar_ahmad.pdf", status: "valid" },
      { id: "doc-2", type: "surat_izin", fileName: "surat_rekomendasi_kepsek.pdf", status: "valid" },
    ],
  },
  {
    id: "part-2",
    registrationNumber: "GBB-PUI-015",
    fullName: "Nurul Hidayah Salsabila",
    institution: "SMKN 3 Jakarta",
    email: "nurul.salsabila@smkn3jkt.sch.id",
    phone: "081387654321",
    competitionId: "comp-1",
    competitionName: "Membaca Puisi",
    category: "individu",
    status: "terverifikasi",
    totalPoints: 110,
    registeredAt: "2025-10-16 11:15 WIB",
    documents: [
      { id: "doc-3", type: "kartu_pelajar", fileName: "kartu_nurul_smkn3.pdf", status: "valid" },
      { id: "doc-4", type: "surat_izin", fileName: "surat_izin_orangtua.pdf", status: "valid" },
    ],
  },
  {
    id: "part-3",
    registrationNumber: "GBB-FLM-003",
    fullName: "Bagas Prasetyo Wibowo",
    institution: "Universitas Indonesia",
    email: "bagas.prasetyo@ui.ac.id",
    phone: "085612347890",
    competitionId: "comp-2",
    competitionName: "Film Pendek",
    category: "kelompok",
    teamName: "Sinema Mahameru",
    teamMembers: ["Bagas Prasetyo Wibowo (Ketua)", "Fikri Haikal (Sinematografer)", "Annisa Rizky (Editor)"],
    status: "terverifikasi",
    totalPoints: 195,
    registeredAt: "2025-10-14 14:00 WIB",
    documents: [
      { id: "doc-5", type: "kartu_pelajar", fileName: "ktm_ui_bagas.pdf", status: "valid" },
      { id: "doc-6", type: "karya", fileName: "naskah_dan_sinopsis_film.pdf", status: "valid" },
    ],
  },
  {
    id: "part-4",
    registrationNumber: "GBB-PID-008",
    fullName: "Kirana Ayu Lestari",
    institution: "SMA Taman Siswa Yogyakarta",
    email: "kirana.ayu@tamsis-yogya.sch.id",
    phone: "081809876543",
    competitionId: "comp-3",
    competitionName: "Pidato Bahasa Indonesia",
    category: "individu",
    status: "terverifikasi",
    totalPoints: 85,
    registeredAt: "2025-10-17 09:45 WIB",
    documents: [
      { id: "doc-7", type: "kartu_pelajar", fileName: "kartu_pelajar_kirana.pdf", status: "valid" },
      { id: "doc-8", type: "surat_izin", fileName: "surat_sekolah_tamsis.pdf", status: "valid" },
    ],
  },
  {
    id: "part-5",
    registrationNumber: "GBB-KVS-012",
    fullName: "Rangga Aditya Nugraha",
    institution: "Universitas Padjadjaran",
    email: "rangga.aditya@unpad.ac.id",
    phone: "082134567891",
    competitionId: "comp-4",
    competitionName: "Melukis Tas Kanvas",
    category: "individu",
    status: "terverifikasi",
    totalPoints: 160,
    registeredAt: "2025-10-18 13:20 WIB",
    documents: [
      { id: "doc-9", type: "kartu_pelajar", fileName: "ktm_unpad_rangga.pdf", status: "valid" },
      { id: "doc-10", type: "surat_izin", fileName: "surat_keterangan_aktif.pdf", status: "valid" },
    ],
  },
  {
    id: "part-6",
    registrationNumber: "GBB-MON-005",
    fullName: "Zahra Amelia Putri",
    institution: "MAN 2 Malang",
    email: "zahra.amelia@man2malang.sch.id",
    phone: "087765432190",
    competitionId: "comp-5",
    competitionName: "Seni Teater Monolog",
    category: "individu",
    status: "menunggu_verifikasi",
    totalPoints: 40,
    registeredAt: "2025-10-20 16:30 WIB",
    documents: [
      { id: "doc-11", type: "kartu_pelajar", fileName: "kartu_zahra_man2.pdf", status: "menunggu" },
      { id: "doc-12", type: "surat_izin", fileName: "surat_pengantar_man2.pdf", status: "menunggu" },
    ],
  },
  {
    id: "part-7",
    registrationNumber: "GBB-MCF-009",
    fullName: "Dimas Arya Pratama",
    institution: "SMA Taruna Nusantara",
    email: "dimas.arya@tarnus.sch.id",
    phone: "081298765432",
    competitionId: "comp-6",
    competitionName: "Pembawa Acara (MC) Formal",
    category: "individu",
    status: "terverifikasi",
    totalPoints: 75,
    registeredAt: "2025-10-19 10:10 WIB",
    documents: [
      { id: "doc-13", type: "kartu_pelajar", fileName: "kartu_dimas_tarnus.pdf", status: "valid" },
    ],
  },
  {
    id: "part-8",
    registrationNumber: "GBB-PLG-002",
    fullName: "Rezky Ramadhan",
    institution: "Sanggar Seni Si Pitung Rawa Belong",
    email: "rezky.pitung@gmail.com",
    phone: "085811223344",
    competitionId: "comp-7",
    competitionName: "Seni Tradisi Palang Pintu",
    category: "kelompok",
    teamName: "Jawara Cukin Rawa Belong",
    teamMembers: ["Rezky Ramadhan (Jawara)", "Haikal Mansur (Pantun)", "Baidhowi (Rebana)", "Soleh (Rebana)"],
    status: "terverifikasi",
    totalPoints: 230,
    registeredAt: "2025-10-12 15:45 WIB",
    documents: [
      { id: "doc-14", type: "surat_izin", fileName: "legalitas_sanggar_pitung.pdf", status: "valid" },
    ],
  },
  {
    id: "part-9",
    registrationNumber: "GBB-VOK-004",
    fullName: "Clara Stephanie",
    institution: "SMA Kristen 1 BPK Penabur",
    email: "clara.stephanie@bpkpenabur.sch.id",
    phone: "081933445566",
    competitionId: "comp-8",
    competitionName: "Vokal Grup Lagu Daerah & Nasional",
    category: "kelompok",
    teamName: "Harmony Genta Nusantara",
    teamMembers: ["Clara Stephanie (Ketua)", "Jonathan Lim", "Nathania Putri", "Samuel Kevin", "Evelyn Tan"],
    status: "terverifikasi",
    totalPoints: 175,
    registeredAt: "2025-10-16 17:00 WIB",
    documents: [
      { id: "doc-15", type: "kartu_pelajar", fileName: "ktp_pelajar_penabur.pdf", status: "valid" },
      { id: "doc-16", type: "karya", fileName: "partitur_aransemen_vokal.pdf", status: "valid" },
    ],
  },
  {
    id: "part-10",
    registrationNumber: "GBB-PUI-016",
    fullName: "Rizky Ananda Putra",
    institution: "SMAN 8 Jakarta",
    email: "rizky.ananda@sman8jkt.sch.id",
    phone: "081211112222",
    competitionId: "comp-1",
    competitionName: "Membaca Puisi",
    category: "individu",
    status: "ditolak",
    rejectionReason: "Kartu Pelajar kedaluwarsa dan tidak menyertakan surat rekomendasi kepala sekolah.",
    totalPoints: 20,
    registeredAt: "2025-10-21 09:00 WIB",
    documents: [
      { id: "doc-17", type: "kartu_pelajar", fileName: "kartu_lama.pdf", status: "tidak_valid" },
    ],
  },
];

// =====================================================================
// DATA JURI DENGAN KEAHLIAN & PENUGASAN (BAB 9 PRD)
// =====================================================================
export const JUDGES: Judge[] = [
  {
    id: "judge-1",
    fullName: "Dr. Siti Nurhaliza M.Pd.",
    title: "Dosen Sastra Indonesia & Pengkaji Puisi",
    email: "siti.nurhaliza@kemdikbud.go.id",
    expertise: "Sastra & Puisi",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    assignedCompetitionIds: ["comp-1"],
    isChiefJudge: true,
  },
  {
    id: "judge-2",
    fullName: "Bimo Aryanto S.Sn.",
    title: "Sutradara & Kurator Festival Film Nusantara",
    email: "bimo.aryanto@sinemanusantara.id",
    expertise: "Sinematografi & Film",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    assignedCompetitionIds: ["comp-2"],
    isChiefJudge: true,
  },
  {
    id: "judge-3",
    fullName: "Rina Kartika M.I.Kom.",
    title: "Praktisi Komunikasi Publik & News Anchor Senior",
    email: "rina.kartika@tvri.go.id",
    expertise: "Public Speaking & MC",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
    assignedCompetitionIds: ["comp-3", "comp-6"],
    isChiefJudge: true,
  },
  {
    id: "judge-4",
    fullName: "Yudi Permana",
    title: "Perupa Tekstil & Dosen Seni Murni ITB",
    email: "yudi.permana@fsrd.itb.ac.id",
    expertise: "Seni Rupa & Kriya",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    assignedCompetitionIds: ["comp-4"],
    isChiefJudge: true,
  },
  {
    id: "judge-5",
    fullName: "Hendra Gunawan S.Pd.",
    title: "Aktor Teater & Pelatih Seni Peran Nasional",
    email: "hendra.gunawan@teaterkoma.org",
    expertise: "Teater & Monolog",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    assignedCompetitionIds: ["comp-5"],
    isChiefJudge: true,
  },
  {
    id: "judge-6",
    fullName: "Bang Jali Mansur",
    title: "Budayawan Betawi & Lembaga Adat Betawi",
    email: "jali.mansur@lembagabetawi.org",
    expertise: "Tradisi Betawi & Palang Pintu",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face",
    assignedCompetitionIds: ["comp-7"],
    isChiefJudge: true,
  },
  {
    id: "judge-7",
    fullName: "Dewi Anggraini M.Mus.",
    title: "Komposer & Dirigen Paduan Suara Nusantara",
    email: "dewi.anggraini@musikanusantara.id",
    expertise: "Musik & Vokal",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
    assignedCompetitionIds: ["comp-8"],
    isChiefJudge: true,
  },
  {
    id: "judge-8",
    fullName: "Farhan Mahendra M.Hum.",
    title: "Kritikus Sastra & Esais Balai Bahasa",
    email: "farhan.mahendra@badanbahasa.kemdikbud.go.id",
    expertise: "Sastra & Puisi",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    assignedCompetitionIds: ["comp-1", "comp-3"],
    isChiefJudge: false,
  },
];

// =====================================================================
// JADWAL ACARA 3 HARI DENGAN STATUS REALTIME (BAB 9 PRD)
// =====================================================================
export const SCHEDULES: ScheduleItem[] = [
  // HARI 1: 26 Oktober 2025
  {
    id: "sch-1",
    competitionId: "comp-7",
    title: "Lomba Seni Tradisi Palang Pintu",
    day: 1,
    date: "26 Oktober 2025",
    time: "14:00 - 17:30 WIB",
    venue: "Lapangan Terbuka",
    stage: "Pelataran Budaya",
    host: "Bang Udin & Mpok Romlah",
    status: "selesai",
  },
  {
    id: "sch-2",
    title: "Pentas Musik Pembuka: Kolaborasi Gamelan & Akustik",
    day: 1,
    date: "26 Oktober 2025",
    time: "19:00 - 21:00 WIB",
    venue: "Panggung Utama",
    stage: "Stage A",
    host: "Dewi Sekar",
    status: "selesai",
  },
  // HARI 2: 27 Oktober 2025 (HARI INI - AKTIF LIVE)
  {
    id: "sch-3",
    competitionId: "comp-1",
    title: "Lomba Membaca Puisi Sastra Nusantara",
    day: 2,
    date: "27 Oktober 2025",
    time: "09:00 - 12:00 WIB",
    venue: "Panggung Utama",
    stage: "Stage A",
    host: "Rizal Ramli",
    status: "berlangsung", // LIVE SEKARANG
  },
  {
    id: "sch-4",
    competitionId: "comp-4",
    title: "Lomba Melukis Tas Kanvas Nusantara",
    day: 2,
    date: "27 Oktober 2025",
    time: "10:00 - 13:00 WIB",
    venue: "Area Kreatif Selasar",
    stage: "Zona Kreatif B",
    host: "Nadira Putri",
    status: "berlangsung", // LIVE SEKARANG
  },
  {
    id: "sch-5",
    competitionId: "comp-3",
    title: "Lomba Pidato Bahasa Indonesia",
    day: 2,
    date: "27 Oktober 2025",
    time: "13:00 - 16:30 WIB",
    venue: "Aula Serbaguna",
    stage: "Podium Utama",
    host: "Aditya Pratama",
    status: "terjadwal",
  },
  {
    id: "sch-6",
    title: "Talkshow Budaya: Menjaga Bahasa Ibu di Era Kecerdasan Buatan",
    day: 2,
    date: "27 Oktober 2025",
    time: "19:30 - 21:00 WIB",
    venue: "Aula Serbaguna",
    stage: "Podium Utama",
    host: "Dra. Endang Sulastri",
    status: "terjadwal",
  },
  // HARI 3: 28 Oktober 2025 (PUNCAK HARI SUMPAH PEMUDA)
  {
    id: "sch-7",
    competitionId: "comp-2",
    title: "Pemutaran & Penjurian Film Pendek Fiksi",
    day: 3,
    date: "28 Oktober 2025",
    time: "09:00 - 15:00 WIB",
    venue: "Ruang Bioskop Mini",
    stage: "Hall Sinema Lt. 2",
    host: "Bagus Wicaksono",
    status: "terjadwal",
  },
  {
    id: "sch-8",
    competitionId: "comp-5",
    title: "Lomba Seni Teater Monolog Kebangsaan",
    day: 3,
    date: "28 Oktober 2025",
    time: "10:30 - 14:00 WIB",
    venue: "Ruang Teater A",
    stage: "Panggung Blackbox",
    host: "Taufik Hidayat",
    status: "terjadwal",
  },
  {
    id: "sch-9",
    competitionId: "comp-6",
    title: "Lomba Pembawa Acara (MC) Formal Kenegaraan",
    day: 3,
    date: "28 Oktober 2025",
    time: "14:00 - 17:00 WIB",
    venue: "Panggung Utama",
    stage: "Stage A",
    host: "Rina Kartika",
    status: "terjadwal",
  },
  {
    id: "sch-10",
    competitionId: "comp-8",
    title: "Lomba Vokal Grup Lagu Daerah & Nasional",
    day: 3,
    date: "28 Oktober 2025",
    time: "19:00 - 21:30 WIB",
    venue: "Panggung Utama",
    stage: "Stage A",
    host: "Dewi Anggraini",
    status: "terjadwal",
  },
  {
    id: "sch-11",
    title: "Malam Penganugerahan Juara & Ikrar Sumpah Pemuda 2025",
    day: 3,
    date: "28 Oktober 2025",
    time: "21:30 - 23:00 WIB",
    venue: "Panggung Utama",
    stage: "Stage A",
    host: "Seluruh Panitia & Tamu Kehormatan",
    status: "terjadwal",
  },
];

// =====================================================================
// DATA 8 STAND DENGAN KODE UNIK (BAB 9 PRD)
// =====================================================================
export const STANDS: Stand[] = [
  {
    id: "stand-1",
    name: "Stand Membaca Puisi",
    code: "PUISI01",
    competitionSlug: "membaca-puisi",
    location: "Selasar Barat No. 01",
    points: 10,
    description: "Nikmati pembacaan puisi interaktif dan kenali bait-bait karya Chairil Anwar.",
    qrToken: "d3b07384-d113-46fb-b09a-528256a47a11",
    visitCount: 142,
  },
  {
    id: "stand-2",
    name: "Stand Film Pendek",
    code: "FILM02",
    competitionSlug: "film-pendek",
    location: "Hall Sinema Lt. 2 No. 02",
    points: 10,
    description: "Tonton cuplikan teaser karya film peserta dan ikuti mini kuis sinematografi.",
    qrToken: "e4c18495-e224-57ac-c10b-639367b58b22",
    visitCount: 118,
  },
  {
    id: "stand-3",
    name: "Stand Teater Monolog",
    code: "MONO03",
    competitionSlug: "monolog",
    location: "Lobby Teater A No. 03",
    points: 10,
    description: "Coba properti panggung teater dan berfoto ala tokoh pejuang kemerdekaan.",
    qrToken: "f5d29506-f335-68bd-d21c-740478c69c33",
    visitCount: 95,
  },
  {
    id: "stand-4",
    name: "Stand Melukis Tas Kanvas",
    code: "KANVAS04",
    competitionSlug: "melukis-tas-kanvas",
    location: "Area Kreatif Selasar No. 04",
    points: 10,
    description: "Coba goresan cat akrilik pada kain kanvas dan pelajari ornamen tradisional.",
    qrToken: "a6e30617-a446-79ce-e32d-851589d70d44",
    visitCount: 165,
  },
  {
    id: "stand-5",
    name: "Stand MC Formal",
    code: "MCFRM05",
    competitionSlug: "mc-formal",
    location: "Lobi Protokoler No. 05",
    points: 10,
    description: "Praktik membaca naskah protokoler kenegaraan di depan cermin mikrofon.",
    qrToken: "b7f41728-b557-80df-f43e-962690e81e55",
    visitCount: 88,
  },
  {
    id: "stand-6",
    name: "Stand Tradisi Palang Pintu",
    code: "PALANG06",
    competitionSlug: "palang-pintu",
    location: "Pelataran Budaya No. 06",
    points: 10,
    description: "Belajar pantun Betawi spontan dan berfoto bersama jawara berpakaian cukin.",
    qrToken: "c8052839-c668-91e0-054f-073701f92f66",
    visitCount: 180,
  },
  {
    id: "stand-7",
    name: "Stand Vokal Grup",
    code: "VOKAL07",
    competitionSlug: "vokal-grup",
    location: "Foyer Panggung Utama No. 07",
    points: 10,
    description: "Tebak aransemen harmoni lagu daerah dan nyanyikan potongan lagu bersama.",
    qrToken: "d9163940-d779-02f1-1650-184812a03a77",
    visitCount: 110,
  },
  {
    id: "stand-8",
    name: "Stand Media Center & Twibbon",
    code: "MEDIA08",
    competitionSlug: "media-center",
    location: "Pusat Informasi Tengah No. 08",
    points: 10,
    description: "Bantuan unggah twibbon, foto cetak instan, dan panduan challenge acara.",
    qrToken: "ea274051-e88a-1302-2761-295923b14b88",
    visitCount: 220,
  },
];

// =====================================================================
// DATA CHALLENGE INTERAKTIF PESERTA NON-LOMBA (BAB 9 PRD)
// =====================================================================
export const CHALLENGES: Challenge[] = [
  {
    id: "ch-1",
    slug: "keliling-8-stand",
    title: "Keliling 8 Stand Lomba Nusantara",
    description: "Kunjungi seluruh 8 stand pameran lomba, scan kode QR di tiap stand, dan kumpulkan poin maksimal!",
    type: "scan_qr",
    pointReward: 80,
    badge: "Penjelajah Bahasa",
    participantsCount: 312,
    status: "aktif",
  },
  {
    id: "ch-2",
    slug: "ikrar-sumpah-pemuda",
    title: "Rekam Video Ikrar Sumpah Pemuda",
    description: "Rekam video berdurasi 30-60 detik membacakan teks asli Sumpah Pemuda di spot foto resmi panitia.",
    type: "unggah_bukti",
    pointReward: 50,
    badge: "Pilar Pemuda",
    participantsCount: 145,
    status: "aktif",
  },
  {
    id: "ch-3",
    slug: "kuis-bahasa-indonesia",
    title: "Kuis Cerdas Cermat Bahasa Indonesia (10 Soal)",
    description: "Jawab kuis 10 pertanyaan seputar kaidah EYD, asal-usul kata serapan, dan sejarah Sumpah Pemuda 1928.",
    type: "kode_unik",
    pointReward: 30,
    badge: "Kamus Berjalan",
    participantsCount: 240,
    status: "aktif",
  },
  {
    id: "ch-4",
    slug: "twibbon-gebyar",
    title: "Tantangan Twibbon GebyarBulanBahasa",
    description: "Unggah foto terbaikmu menggunakan Twibbon resmi acara ke Instagram/TikTok dan submit ke galeri acara.",
    type: "unggah_bukti",
    pointReward: 20,
    badge: "Duta Bahasa",
    participantsCount: 280,
    status: "aktif",
  },
  {
    id: "ch-5",
    slug: "wawancara-juri",
    title: "Wawancara Singkat Juri Favorit",
    description: "Ajak diskusi singkat salah satu dewan juri setelah sesi lomba selesai dan unggah intisari nasihat sastranya.",
    type: "unggah_bukti",
    pointReward: 40,
    badge: "Pewarta Muda",
    participantsCount: 68,
    status: "aktif",
  },
];

// =====================================================================
// DATA REWARD / HADIAH PENUKARAN POIN (BAB 9 PRD)
// =====================================================================
export const REWARDS: Reward[] = [
  {
    id: "rew-1",
    name: "Pin Logam Edisi Sumpah Pemuda 2025",
    description: "Pin enamel kuningan eksklusif berlogo GebyarBulanBahasa dengan sepuhan emas.",
    pointsRequired: 100,
    quota: 200,
    claimedCount: 74,
    category: "Merchandise",
  },
  {
    id: "rew-2",
    name: "Voucher Kopi Nusantara Rp25.000",
    description: "Voucher belanja di seluruh tenant kuliner kopi tradisional area festival.",
    pointsRequired: 150,
    quota: 120,
    claimedCount: 62,
    category: "Voucher",
  },
  {
    id: "rew-3",
    name: "Tote Bag Kanvas GebyarBulanBahasa",
    description: "Tote bag bahan kanvas tebal dengan sablon tipografi kutipan Sumpah Pemuda.",
    pointsRequired: 250,
    quota: 80,
    claimedCount: 39,
    category: "Merchandise",
  },
  {
    id: "rew-4",
    name: "Tiket Prioritas Kursi VIP Pentas Seni",
    description: "Akses tempat duduk baris terdepan pada Malam Penganugerahan & Pentas Seni puncak.",
    pointsRequired: 300,
    quota: 50,
    claimedCount: 28,
    category: "Akses",
  },
  {
    id: "rew-5",
    name: "Buku Antologi Puisi & Naskah Juara",
    description: "Buku cetak eksklusif kumpulan karya puisi dan naskah pidato terbaik Gebyar Bulan Bahasa.",
    pointsRequired: 400,
    quota: 30,
    claimedCount: 11,
    category: "Buku",
  },
];

// =====================================================================
// DATA PENGUMUMAN RESMI (BAB 9 PRD)
// =====================================================================
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-1",
    slug: "pengambilan-nomor-peserta-puisi",
    title: "Pengambilan Nomor Urut Peserta Lomba Membaca Puisi",
    category: "penting",
    body: "Pengambilan nomor dada dan pengundian urutan tampil peserta Lomba Membaca Puisi dapat dilakukan di Sekretariat Panitia (Gedung A Lt. 1) mulai pukul 07.30 WIB. Peserta wajib hadir minimal 30 menit sebelum jadwal lomba dimulai.",
    publishedAt: "27 Oktober 2025, 07:00 WIB",
    isPinned: true,
    author: "Seksi Acara",
    showOnMonitor: true,
  },
  {
    id: "ann-2",
    slug: "perubahan-ruang-sidang-film-pendek",
    title: "Konfirmasi Uji Coba Audio Ruang Bioskop Mini untuk Film Pendek",
    category: "jadwal",
    body: "Seluruh tim peserta Film Pendek dapat melakukan uji format file dan kalibrasi audio di Ruang Bioskop Mini hari ini pukul 16.00 - 18.00 WIB didampingi tim Media Center.",
    publishedAt: "27 Oktober 2025, 08:30 WIB",
    isPinned: false,
    author: "Media Center",
    showOnMonitor: true,
  },
  {
    id: "ann-3",
    slug: "hasil-juara-palang-pintu-2025",
    title: "Selamat Kepada Pemenang Lomba Seni Tradisi Palang Pintu",
    category: "pemenang",
    body: "Dewan juri telah merampungkan rekapitulasi penilaian digital untuk Lomba Tradisi Palang Pintu. Juara 1 diraih oleh Sanggar Seni Si Pitung Rawa Belong dengan total nilai terbobot 94,80. Daftar lengkap pemenang dapat dilihat di laman Pemenang.",
    publishedAt: "26 Oktober 2025, 18:30 WIB",
    isPinned: true,
    author: "Seksi Acara",
    showOnMonitor: true,
  },
  {
    id: "ann-4",
    slug: "ketentuan-penukaran-poin-challenge",
    title: "Batas Akhir Klaim Hadiah Poin Challenge Acara",
    category: "umum",
    body: "Penukaran poin challenge dengan merchandise eksklusif dapat dilayani di Stand Media Center setiap hari pukul 10.00 s/d 18.00 WIB. Pastikan saldo poin mencukupi dan tunjukkan kode QR akun peserta.",
    publishedAt: "26 Oktober 2025, 12:00 WIB",
    isPinned: false,
    author: "Seksi Acara",
    showOnMonitor: false,
  },
];

// =====================================================================
// DATA TWIBBON (BAB 9 PRD)
// =====================================================================
export const TWIBBONS: TwibbonItem[] = [
  {
    id: "twb-1",
    uploaderName: "Ahmad Fauzan Ramadhan",
    institution: "SMAN 1 Bandung",
    participantNumber: "GBB-PUI-014",
    caption: "Bangga melestarikan bahasa persatuan! Siap tampil terbaik di Lomba Membaca Puisi Gebyar Bulan Bahasa 2025.",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&h=500&fit=crop",
    status: "disetujui",
    isFeatured: true,
    likesCount: 84,
    uploadedAt: "2025-10-25 14:10 WIB",
  },
  {
    id: "twb-2",
    uploaderName: "Nurul Hidayah Salsabila",
    institution: "SMKN 3 Jakarta",
    participantNumber: "GBB-PUI-015",
    caption: "Satu bahasa, satu bangsa, satu karya! Salam budaya dari SMKN 3 Jakarta.",
    imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&h=500&fit=crop",
    status: "disetujui",
    isFeatured: true,
    likesCount: 65,
    uploadedAt: "2025-10-25 15:30 WIB",
  },
  {
    id: "twb-3",
    uploaderName: "Bagas Prasetyo Wibowo",
    institution: "Universitas Indonesia",
    participantNumber: "GBB-FLM-003",
    caption: "Karya sinema kami dedikasikan untuk menginspirasi Indonesia. Dukung film pendek kami!",
    imageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&h=500&fit=crop",
    status: "disetujui",
    isFeatured: false,
    likesCount: 52,
    uploadedAt: "2025-10-26 09:20 WIB",
  },
  {
    id: "twb-4",
    uploaderName: "Kirana Ayu Lestari",
    institution: "SMA Taman Siswa Yogyakarta",
    participantNumber: "GBB-PID-008",
    caption: "Bahasa menunjukkan jati diri bangsa. Mari kobarkan api Sumpah Pemuda!",
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop",
    status: "disetujui",
    isFeatured: true,
    likesCount: 91,
    uploadedAt: "2025-10-26 10:45 WIB",
  },
  {
    id: "twb-5",
    uploaderName: "Zahra Amelia Putri",
    institution: "MAN 2 Malang",
    caption: "Salam teater! Bersama merawat kekayaan kata dan makna dalam Gebyar Bulan Bahasa.",
    imageUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500&h=500&fit=crop",
    status: "menunggu",
    isFeatured: false,
    likesCount: 12,
    uploadedAt: "2025-10-27 08:15 WIB",
  },
  {
    id: "twb-6",
    uploaderName: "Dimas Arya Pratama",
    institution: "SMA Taruna Nusantara",
    caption: "Menjunjung tinggi kehormatan bahasa Indonesia sebagai bahasa resmi pemersatu negeri.",
    imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&h=500&fit=crop",
    status: "disetujui",
    isFeatured: false,
    likesCount: 47,
    uploadedAt: "2025-10-26 16:00 WIB",
  },
];

// =====================================================================
// DATA PEMENANG RESMI (BAB 9 PRD)
// =====================================================================
export const WINNERS: Winner[] = [
  {
    id: "win-1",
    competitionId: "comp-7",
    competitionName: "Seni Tradisi Palang Pintu",
    rank: 1,
    title: "Juara 1",
    winnerName: "Rezky Ramadhan & Tim",
    teamName: "Jawara Cukin Rawa Belong",
    institution: "Sanggar Seni Si Pitung Rawa Belong",
    finalScore: 94.8,
    prize: "Piala Bergilir Gubernur + Uang Pembinaan Rp5.000.000 + Piagam",
  },
  {
    id: "win-2",
    competitionId: "comp-7",
    competitionName: "Seni Tradisi Palang Pintu",
    rank: 2,
    title: "Juara 2",
    winnerName: "M. Syafi'i & Kawan-kawan",
    teamName: "Kembang Kelapa Ciganjur",
    institution: "Sanggar Palang Pintu Jagakarsa",
    finalScore: 91.5,
    prize: "Piala + Uang Pembinaan Rp3.500.000 + Piagam",
  },
  {
    id: "win-3",
    competitionId: "comp-7",
    competitionName: "Seni Tradisi Palang Pintu",
    rank: 3,
    title: "Juara 3",
    winnerName: "Fajar Kurniawan & Tim",
    teamName: "Pendekar Tenabang",
    institution: "Komunitas Seni Budaya Tanah Abang",
    finalScore: 88.2,
    prize: "Piala + Uang Pembinaan Rp2.500.000 + Piagam",
  },
  // Skor Sementara Lomba Membaca Puisi (sedang berlangsung)
  {
    id: "win-4",
    competitionId: "comp-1",
    competitionName: "Membaca Puisi",
    rank: 1,
    title: "Peringkat 1 (Sementara)",
    winnerName: "Ahmad Fauzan Ramadhan",
    institution: "SMAN 1 Bandung",
    finalScore: 92.75,
    prize: "Piala + Tabungan Pendidikan Rp3.000.000",
  },
  {
    id: "win-5",
    competitionId: "comp-1",
    competitionName: "Membaca Puisi",
    rank: 2,
    title: "Peringkat 2 (Sementara)",
    winnerName: "Nurul Hidayah Salsabila",
    institution: "SMKN 3 Jakarta",
    finalScore: 89.5,
    prize: "Piala + Tabungan Pendidikan Rp2.000.000",
  },
  {
    id: "win-6",
    competitionId: "comp-1",
    competitionName: "Membaca Puisi",
    rank: 3,
    title: "Peringkat 3 (Sementara)",
    winnerName: "Kirana Ayu Lestari",
    institution: "SMA Taman Siswa Yogyakarta",
    finalScore: 87.2,
    prize: "Piala + Tabungan Pendidikan Rp1.500.000",
  },
];

// =====================================================================
// DATA REKAP PENILAIAN DIGITAL MULTI-JURI (SKORING & KRITERIA)
// =====================================================================
export const SCORING_RECAPS: Record<string, ScoreRecap[]> = {
  "comp-1": [
    {
      registrationId: "part-1",
      participantName: "Ahmad Fauzan Ramadhan",
      institution: "SMAN 1 Bandung",
      competitionId: "comp-1",
      scoresPerJudge: [
        {
          judgeId: "judge-1",
          judgeName: "Dr. Siti Nurhaliza M.Pd.",
          scores: {
            "crit-pui-1": 95, // bobot 35% -> 33.25
            "crit-pui-2": 92, // bobot 25% -> 23.00
            "crit-pui-3": 90, // bobot 25% -> 22.50
            "crit-pui-4": 94, // bobot 15% -> 14.10
          },
          weightedTotal: 92.85,
          notes: "Penghayatan bait ketiga sangat menyentuh emosi audiens. Artikulasi prima.",
          status: "terkirim",
        },
        {
          judgeId: "judge-8",
          judgeName: "Farhan Mahendra M.Hum.",
          scores: {
            "crit-pui-1": 94,
            "crit-pui-2": 93,
            "crit-pui-3": 91,
            "crit-pui-4": 92,
          },
          weightedTotal: 92.65,
          notes: "Dinamika tempo sangat terjaga dengan baik. Pantas mendapat skor tinggi.",
          status: "terkirim",
        },
      ],
      finalAverageScore: 92.75,
      rank: 1,
    },
    {
      registrationId: "part-2",
      participantName: "Nurul Hidayah Salsabila",
      institution: "SMKN 3 Jakarta",
      competitionId: "comp-1",
      scoresPerJudge: [
        {
          judgeId: "judge-1",
          judgeName: "Dr. Siti Nurhaliza M.Pd.",
          scores: {
            "crit-pui-1": 90,
            "crit-pui-2": 90,
            "crit-pui-3": 88,
            "crit-pui-4": 90,
          },
          weightedTotal: 89.5,
          notes: "Vokal lantang dan jernih, jeda pernapasan perlu sedikit diperhalus.",
          status: "terkirim",
        },
        {
          judgeId: "judge-8",
          judgeName: "Farhan Mahendra M.Hum.",
          scores: {
            "crit-pui-1": 91,
            "crit-pui-2": 89,
            "crit-pui-3": 88,
            "crit-pui-4": 90,
          },
          weightedTotal: 89.5,
          notes: "Penampilan percaya diri, mimik muka selaras dengan tema perjuangan.",
          status: "terkirim",
        },
      ],
      finalAverageScore: 89.5,
      rank: 2,
    },
    {
      registrationId: "part-4",
      participantName: "Kirana Ayu Lestari",
      institution: "SMA Taman Siswa Yogyakarta",
      competitionId: "comp-1",
      scoresPerJudge: [
        {
          judgeId: "judge-1",
          judgeName: "Dr. Siti Nurhaliza M.Pd.",
          scores: {
            "crit-pui-1": 88,
            "crit-pui-2": 87,
            "crit-pui-3": 86,
            "crit-pui-4": 89,
          },
          weightedTotal: 87.4,
          notes: "Gaya pembacaan sangat tenang dan puitis, proyeksi vokal perlu ditingkatkan.",
          status: "terkirim",
        },
        {
          judgeId: "judge-8",
          judgeName: "Farhan Mahendra M.Hum.",
          scores: {
            "crit-pui-1": 87,
            "crit-pui-2": 86,
            "crit-pui-3": 87,
            "crit-pui-4": 88,
          },
          weightedTotal: 87.0,
          notes: "Bagus pada modulasi suara, busana daerah sangat anggun.",
          status: "terkirim",
        },
      ],
      finalAverageScore: 87.2,
      rank: 3,
    },
  ],
};

// =====================================================================
// DATA LEADERBOARD CHALLENGE (POIN PESERTA NON-LOMBA)
// =====================================================================
export const CHALLENGE_LEADERBOARD = [
  { rank: 1, name: "Rezky Ramadhan", institution: "Sanggar Seni Si Pitung", points: 230, badge: "Penjelajah Bahasa" },
  { rank: 2, name: "Bagas Prasetyo Wibowo", institution: "Universitas Indonesia", points: 195, badge: "Pewarta Muda" },
  { rank: 3, name: "Clara Stephanie", institution: "SMA BPK Penabur", points: 175, badge: "Duta Bahasa" },
  { rank: 4, name: "Rangga Aditya Nugraha", institution: "Universitas Padjadjaran", points: 160, badge: "Pilar Pemuda" },
  { rank: 5, name: "Ahmad Fauzan Ramadhan", institution: "SMAN 1 Bandung", points: 140, badge: "Kamus Berjalan" },
  { rank: 6, name: "Nurul Hidayah Salsabila", institution: "SMKN 3 Jakarta", points: 110, badge: "Penjelajah Bahasa" },
  { rank: 7, name: "Kirana Ayu Lestari", institution: "SMA Taman Siswa Yogya", points: 85, badge: "Duta Bahasa" },
  { rank: 8, name: "Dimas Arya Pratama", institution: "SMA Taruna Nusantara", points: 75, badge: "Pilar Pemuda" },
  { rank: 9, name: "Zahra Amelia Putri", institution: "MAN 2 Malang", points: 40, badge: "Penjelajah Bahasa" },
  { rank: 10, name: "Fikri Haikal", institution: "Universitas Indonesia", points: 35, badge: "Kamus Berjalan" },
];

// =====================================================================
// ACTIVITY LOGS (AUDIT TRAIL SISTEM)
// =====================================================================
export const ACTIVITY_LOGS = [
  {
    id: "log-1",
    actor: "Dr. Siti Nurhaliza M.Pd.",
    role: "juri",
    action: "submit_assessment",
    description: "Mengirimkan nilai akhir Lomba Membaca Puisi untuk peserta Ahmad Fauzan Ramadhan (92,85).",
    timestamp: "27 Oktober 2025, 11:42 WIB",
  },
  {
    id: "log-2",
    actor: "Seksi Acara (Admin)",
    role: "seksi_acara",
    action: "verify_participant",
    description: "Menyetujui berkas pendaftaran peserta Kirana Ayu Lestari (SMA Taman Siswa).",
    timestamp: "27 Oktober 2025, 10:15 WIB",
  },
  {
    id: "log-3",
    actor: "Media Center",
    role: "media_center",
    action: "approve_twibbon",
    description: "Menyetujui 4 twibbon peserta baru dan menandai twibbon Kirana Ayu sebagai Unggulan.",
    timestamp: "27 Oktober 2025, 09:30 WIB",
  },
  {
    id: "log-4",
    actor: "Seksi Acara (Admin)",
    role: "seksi_acara",
    action: "update_schedule",
    description: "Mengubah status jadwal 'Lomba Membaca Puisi' menjadi 'Berlangsung' (LIVE).",
    timestamp: "27 Oktober 2025, 09:00 WIB",
  },
  {
    id: "log-5",
    actor: "Farhan Mahendra M.Hum.",
    role: "juri",
    action: "save_draft",
    description: "Menyimpan draft penilaian peserta Nurul Hidayah Salsabila.",
    timestamp: "27 Oktober 2025, 11:20 WIB",
  },
];
