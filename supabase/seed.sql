-- =====================================================================
-- GebyarBulanBahasa — Seed Database Migration (Langkah 1)
-- File: supabase/seed.sql
-- Tema: "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia."
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EVENT SETTINGS
-- ---------------------------------------------------------------------
insert into public.event_settings (key, value, description)
values
  (
    'general',
    jsonb_build_object(
      'name', 'GebyarBulanBahasa',
      'theme', 'Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.',
      'year', 2025,
      'venue', 'Pusat Gelora Budaya Nusantara, Jakarta',
      'startDate', '2025-10-26',
      'endDate', '2025-10-28',
      'description', 'Sistem penilaian digital dan dashboard operasional acara Gebyar Bulan Bahasa dan Kebudayaan (Peringatan Hari Sumpah Pemuda)'
    ),
    'Pengaturan umum acara dan tema Gebyar Bulan Bahasa'
  ),
  (
    'registration',
    jsonb_build_object(
      'isOpen', true,
      'maxTeamsPerSchool', 2,
      'requireSchoolRecommendation', true,
      'allowedDocTypes', jsonb_build_array('kartu_pelajar', 'surat_izin', 'karya')
    ),
    'Konfigurasi pendaftaran peserta lomba dan persyaratan berkas'
  ),
  (
    'gamification',
    jsonb_build_object(
      'scanQrPoints', 10,
      'maxDailyScans', 8,
      'leaderboardVisible', true,
      'enableChallenges', true
    ),
    'Pengaturan gamifikasi poin kunjungan stand dan tantangan'
  ),
  (
    'monitor',
    jsonb_build_object(
      'refreshIntervalSeconds', 15,
      'activeTheme', 'sumpah_pemuda_dark',
      'autoRotateSlides', true
    ),
    'Konfigurasi tampilan monitor panggung dan signage aula'
  )
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();

-- ---------------------------------------------------------------------
-- 2. COMPETITIONS (8 Cabang Lomba Resmi dengan Fixed UUID)
-- ---------------------------------------------------------------------
insert into public.competitions (
  id, slug, name, short_name, description, theme_link, type, status,
  aggregation, min_team_members, max_team_members, max_participants,
  rules, sort_order
)
values
  (
    'a0000000-0000-0000-0000-000000000001',
    'membaca-puisi',
    'Membaca Puisi',
    'Puisi',
    'Lomba membaca karya puisi sastra nusantara dan puisi bertema Sumpah Pemuda untuk mengobarkan semangat persatuan generasi penerus bangsa.',
    'Panggung Utama',
    'individu',
    'berlangsung',
    'rata_rata',
    1, 1, 25,
    '1. Membaca 1 puisi wajib karya penyair nasional dan 1 puisi pilihan.
2. Durasi penampilan maksimal 7 menit tanpa alat pengeras suara tambahan.
3. Peserta mengenakan pakaian batik atau busana daerah sopan.
4. Penilaian murni mengacu pada penghayatan, vokal, dan intonasi.',
    1
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'film-pendek',
    'Film Pendek',
    'Film',
    'Kompetisi karya sinematografi fiksi pendek bertema "Persatuan dalam Keberagaman Budaya Nusantara" dengan durasi 5-10 menit.',
    'Ruang Bioskop Mini',
    'kelompok',
    'berlangsung',
    'rata_rata_buang_ekstrem',
    3, 10, 15,
    '1. Karya orisinal diproduksi kurun waktu 2024-2025 dan belum pernah memenangkan festival lain.
2. Durasi video 5-10 menit termasuk kredit judul dan akhir.
3. Format MP4/MOV Full HD 1080p dengan teks bahasa Indonesia baku.
4. Bebas dari unsur SARA, ujaran kebencian, dan pelanggaran hak cipta musik.',
    2
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'pidato',
    'Pidato Bahasa Indonesia',
    'Pidato',
    'Ajang orasi dan adu gagasan kebangsaan peserta dengan tema "Menginspirasi Indonesia Melalui Bahasa Persatuan".',
    'Aula Serbaguna',
    'individu',
    'berlangsung',
    'rata_rata',
    1, 1, 20,
    '1. Durasi orasi 5-7 menit; lampu indikator hijau (mulai), kuning (1 menit tersisa), merah (selesai).
2. Pidato dibawakan tanpa membaca naskah penuh (catatan poin diperkenankan).
3. Busana formal rapi atau jas almamater / seragam sekolah.',
    3
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'melukis-tas-kanvas',
    'Melukis Tas Kanvas',
    'Melukis',
    'Lomba kreasi seni visual pada media tote bag kanvas bertema motif ornamen tradisional Indonesia berpadu tipografi aksara nusantara.',
    'Area Kreatif Selasar',
    'individu',
    'berlangsung',
    'rata_rata',
    1, 1, 30,
    '1. Media tas kanvas disediakan panitia; cat akrilik dan kuas dibawa peserta.
2. Durasi melukis 180 menit tanpa bantuan orang lain.
3. Karya wajib memadukan motif budaya nusantara dengan kutipan berbahasa Indonesia.',
    4
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'monolog',
    'Seni Teater Monolog',
    'Monolog',
    'Penampilan lakon drama tunggal mengangkat naskah tokoh pahlawan pergerakan nasional dan pemuda pejuang kemerdekaan.',
    'Ruang Teater A',
    'individu',
    'pendaftaran',
    'rata_rata',
    1, 1, 16,
    '1. Durasi pementasan 10-15 menit per peserta.
2. Menggunakan naskah yang disediakan panitia atau naskah sastra klasik nusantara.
3. Properti pendukung panggung dibatasi maksimal 3 item yang mudah dipindahkan.',
    5
  ),
  (
    'a0000000-0000-0000-0000-000000000006',
    'mc-formal',
    'Pembawa Acara (MC) Formal',
    'MC Formal',
    'Uji keahlian memandu protokoler kenegaraan dan upacara peringatan Hari Sumpah Pemuda menggunakan bahasa Indonesia baku yang anggun.',
    'Panggung Utama',
    'individu',
    'pendaftaran',
    'rata_rata',
    1, 1, 20,
    '1. Simulasi memandu Upacara Peringatan Hari Sumpah Pemuda tingkat nasional.
2. Durasi 5 menit per peserta dengan pembacaan teks protokoler.
3. Mengenakan busana formal jas / kebaya nasional lengkap.',
    6
  ),
  (
    'a0000000-0000-0000-0000-000000000007',
    'palang-pintu',
    'Seni Tradisi Palang Pintu',
    'Palang Pintu',
    'Lomba kesenian tradisi Betawi memadukan adu pantun jenaka, jurus silat beksi tradisional, dan lantunan salawat.',
    'Lapangan Terbuka',
    'kelompok',
    'selesai',
    'rata_rata',
    4, 8, 10,
    '1. Terdiri dari 1 jawara pantun, 2 pesilat beksi, dan pendamping rebana ketimpring.
2. Durasi penampilan 10-12 menit per rombongan.
3. Pantun wajib orisinal bertema pelestarian budaya nusantara dan sumpah pemuda.',
    7
  ),
  (
    'a0000000-0000-0000-0000-000000000008',
    'vokal-grup',
    'Vokal Grup Lagu Daerah & Nasional',
    'Vokal Grup',
    'Harmoni paduan suara kelompok membawakan medley lagu wajib nasional "Bangun Pemudi Pemuda" dan 1 lagu daerah pilihan nusantara.',
    'Panggung Utama',
    'kelompok',
    'pendaftaran',
    'rata_rata_buang_ekstrem',
    5, 12, 12,
    '1. Jumlah anggota 5-12 penyanyi dengan instrumen pengiring akustik (non-minus one).
2. Durasi total penampilan maksimal 10 menit untuk 2 lagu.
3. Aransemen musik dan harmoni suara orisinal buatan tim.',
    8
  )
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  short_name = excluded.short_name,
  description = excluded.description,
  theme_link = excluded.theme_link,
  type = excluded.type,
  status = excluded.status,
  aggregation = excluded.aggregation,
  min_team_members = excluded.min_team_members,
  max_team_members = excluded.max_team_members,
  max_participants = excluded.max_participants,
  rules = excluded.rules,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ---------------------------------------------------------------------
-- 3. COMPETITION CRITERIA (Kriteria Penilaian Berbobot — Total 100%)
-- ---------------------------------------------------------------------
-- Hapus kriteria lama jika ada konflik lalu pasang ulang secara presisi
delete from public.competition_criteria where competition_id in (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000008'
);

insert into public.competition_criteria (id, competition_id, name, description, weight, max_score, sort_order)
values
  -- 1. Membaca Puisi (35 + 25 + 25 + 15 = 100)
  ('b0000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Penghayatan & Penjiwaan', 'Kedalaman emosi, pemahaman makna larik puisi, ketulusan ekspresi', 35, 100, 1),
  ('b0000001-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Vokal & Artikulasi', 'Kejelasan lafal, proyeksi suara, kebulatan vokal dan konsonan', 25, 100, 2),
  ('b0000001-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Intonasi & Ritme', 'Ketepatan jeda, dinamika tempo cepat-lambat, tinggi-rendah nada', 25, 100, 3),
  ('b0000001-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Gestur & Penampilan', 'Kerapian busana, keserasian gerak tubuh, etika panggung', 15, 100, 4),

  -- 2. Film Pendek (30 + 25 + 20 + 15 + 10 = 100)
  ('b0000002-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Kekuatan Cerita & Skenario', 'Struktur dramatik narasi, pesan moral, orisinalitas ide', 30, 100, 1),
  ('b0000002-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Sinematografi & Visual', 'Komposisi framing, pencahayaan, pergerakan kamera, grading warna', 25, 100, 2),
  ('b0000002-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Akting & Pengadeganan', 'Penghayatan peran pemeran, bloking adegan, naturalitas dialog', 20, 100, 3),
  ('b0000002-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Tata Suara & Musik', 'Kualitas audio dialog jernih, scoring musik latar, sound FX', 15, 100, 4),
  ('b0000002-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Keselarasan Tema Sumpah Pemuda', 'Kesesuaian pesan dengan semangat persatuan bangsa', 10, 100, 5),

  -- 3. Pidato Bahasa Indonesia (30 + 25 + 25 + 20 = 100)
  ('b0000003-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Isi & Relevansi Tema', 'Kesesuaian gagasan, kedalaman argumen, solusi inspiratif', 30, 100, 1),
  ('b0000003-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Ketepatan Bahasa Indonesia', 'Struktur kalimat baku, ketepatan diksi, kaidah tata bahasa EYD', 25, 100, 2),
  ('b0000003-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Retorika & Daya Pikat', 'Kemampuan memikat audiens, intonasi persuasif, kontak mata', 25, 100, 3),
  ('b0000003-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'Sikap & Penampilan', 'Kerapian busana, kepercayaan diri, penguasaan podium', 20, 100, 4),

  -- 4. Melukis Tas Kanvas (30 + 30 + 25 + 15 = 100)
  ('b0000004-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Kreativitas & Orisinalitas', 'Keunikan konsep ide, eksplorasi motif nusantara', 30, 100, 1),
  ('b0000004-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'Keselarasan Tema', 'Representasi tema Sumpah Pemuda dan kekayaan budaya', 30, 100, 2),
  ('b0000004-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'Komposisi & Estetika Warna', 'Keseimbangan tata letak, keharmonisan gradasi dan palet warna', 25, 100, 3),
  ('b0000004-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'Kerapian & Teknik Melukis', 'Kebersihan karya, ketelitian garis tepi, daya lekat cat pada kanvas', 15, 100, 4),

  -- 5. Teater Monolog (35 + 25 + 25 + 15 = 100)
  ('b0000005-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'Penghayatan Karakter', 'Transformasi kejiwaan peran, emosi tokoh, penghidupan lakon', 35, 100, 1),
  ('b0000005-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'Vokal & Diksi Panggung', 'Artikulasi teaterikal, kejelasan dialog, dinamika suara', 25, 100, 2),
  ('b0000005-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'Penguasaan Panggung & Gerak', 'Pemanfaatan ruang pentas, keselarasan gestur tubuh, bloking', 25, 100, 3),
  ('b0000005-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'Artistik & Karakteristik Busana', 'Kesesuaian tata rias dan kostum dengan latar drama', 15, 100, 4),

  -- 6. Pembawa Acara (MC) Formal (35 + 25 + 25 + 15 = 100)
  ('b0000006-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'Artikulasi & Diksi Bahasa Baku', 'Pelafalan bahasa Indonesia formal, kepatuhan kaidah protokoler', 35, 100, 1),
  ('b0000006-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000006', 'Protokoler & Tata Susun Acara', 'Kelancaran susunan susunan acara kenegaraan, ketepatan etika salam', 25, 100, 2),
  ('b0000006-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000006', 'Ketepatan Intonasi & Tempo', 'Kewibawaan nada suara, tempo stabil, ketenangan pemanduan', 25, 100, 3),
  ('b0000006-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', 'Sikap Tubuh & Kerapian Busana', 'Postur tubuh tegak, keanggunan, tata rias rapi formal', 15, 100, 4),

  -- 7. Tradisi Palang Pintu (35 + 25 + 25 + 15 = 100)
  ('b0000007-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'Ketangkasan Pantun Betawi', 'Kelincahan berbalas pantun, rima a-b-a-b, humor mendidik', 35, 100, 1),
  ('b0000007-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 'Jurus & Silat Tradisional', 'Keindahan jurus silat beksi, ketegasan gerak, ketangkasan kembangan', 25, 100, 2),
  ('b0000007-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000007', 'Kekompakan Rombongan & Iringan Musik', 'Keserasian pukulan rebana ketimpring, lantunan salawat, kebersamaan', 25, 100, 3),
  ('b0000007-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000007', 'Adab, Atribut & Busana Adat Betawi', 'Kelengkapan busana ujung serong / baju sadariah, peci hitam, cukin', 15, 100, 4),

  -- 8. Vokal Grup (35 + 25 + 20 + 20 = 100)
  ('b0000008-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 'Harmoni Suara & Aransemen', 'Keseimbangan pembagian suara (sopran, alto, tenor, bas), kekayaan aransemen', 35, 100, 1),
  ('b0000008-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000008', 'Ketepatan Nada & Pitch Control', 'Akurasi nada vokal, intonasi bersih tanpa fals, keselarasan akord', 25, 100, 2),
  ('b0000008-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000008', 'Artikulasi & Dinamika Musikal', 'Kejelasan lirik syair, penjiwaan crescendo-decrescendo', 20, 100, 3),
  ('b0000008-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000008', 'Koreografi, Kostum & Penampilan', 'Keseragaman gerak, busana adat kreasi, ekspresi panggung', 20, 100, 4);

-- ---------------------------------------------------------------------
-- 4. STANDS (8 Stand Pameran Budaya & Kode Unik)
-- ---------------------------------------------------------------------
insert into public.stands (
  id, competition_id, name, code, qr_token, description, booth_location,
  points_per_visit, max_visits_per_participant, is_active
)
values
  (
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Stand Membaca Puisi',
    'PUISI01',
    'd3b07384-d113-46fb-b09a-528256a47a11',
    'Nikmati pembacaan puisi interaktif dan kenali bait-bait karya Chairil Anwar.',
    'Selasar Barat No. 01',
    10, 1, true
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    'Stand Film Pendek',
    'FILM02',
    'e4c18495-e224-57ac-c10b-639367b58b22',
    'Tonton cuplikan teaser karya film peserta dan ikuti mini kuis sinematografi.',
    'Hall Sinema Lt. 2 No. 02',
    10, 1, true
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000005',
    'Stand Teater Monolog',
    'MONO03',
    'f5d29506-f335-68bd-d21c-740478c69c33',
    'Coba properti panggung teater dan berfoto ala tokoh pejuang kemerdekaan.',
    'Lobby Teater A No. 03',
    10, 1, true
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000004',
    'Stand Melukis Tas Kanvas',
    'KANVAS04',
    'a6e30617-a446-79ce-e32d-851589d70d44',
    'Coba goresan cat akrilik pada kain kanvas dan pelajari ornamen tradisional.',
    'Area Kreatif Selasar No. 04',
    10, 1, true
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000006',
    'Stand MC Formal',
    'MCFRM05',
    'b7f41728-b557-80df-f43e-962690e81e55',
    'Praktik membaca naskah protokoler kenegaraan di depan cermin mikrofon.',
    'Lobi Protokoler No. 05',
    10, 1, true
  ),
  (
    'c0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000007',
    'Stand Tradisi Palang Pintu',
    'PALANG06',
    'c8052839-c668-91e0-054f-073701f92f66',
    'Belajar pantun Betawi spontan dan berfoto bersama jawara berpakaian cukin.',
    'Pelataran Budaya No. 06',
    10, 1, true
  ),
  (
    'c0000000-0000-0000-0000-000000000007',
    'a0000000-0000-0000-0000-000000000008',
    'Stand Vokal Grup',
    'VOKAL07',
    'd9163940-d779-02f1-1650-184812a03a77',
    'Tebak aransemen harmoni lagu daerah dan nyanyikan potongan lagu bersama.',
    'Foyer Panggung Utama No. 07',
    10, 1, true
  ),
  (
    'c0000000-0000-0000-0000-000000000008',
    null,
    'Stand Media Center & Twibbon',
    'MEDIA08',
    'ea274051-e88a-1302-2761-295923b14b88',
    'Bantuan unggah twibbon, foto cetak instan, dan panduan challenge acara.',
    'Pusat Informasi Tengah No. 08',
    10, 1, true
  )
on conflict (id) do update set
  competition_id = excluded.competition_id,
  name = excluded.name,
  code = excluded.code,
  qr_token = excluded.qr_token,
  description = excluded.description,
  booth_location = excluded.booth_location,
  points_per_visit = excluded.points_per_visit,
  is_active = excluded.is_active;

-- ---------------------------------------------------------------------
-- 5. CHALLENGES (Gamifikasi & Tantangan Interaktif)
-- ---------------------------------------------------------------------
insert into public.challenges (
  id, slug, title, description, type, point_reward, max_claims, badge_icon, is_active
)
values
  (
    'd0000000-0000-0000-0000-000000000001',
    'keliling-8-stand',
    'Keliling 8 Stand Lomba Nusantara',
    'Kunjungi seluruh 8 stand pameran lomba, scan kode QR di tiap stand, dan kumpulkan poin maksimal!',
    'scan_qr',
    80,
    500,
    'Penjelajah Bahasa',
    true
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'ikrar-sumpah-pemuda',
    'Rekam Video Ikrar Sumpah Pemuda',
    'Rekam video berdurasi 30-60 detik membacakan teks asli Sumpah Pemuda di spot foto resmi panitia.',
    'unggah_bukti',
    50,
    300,
    'Pilar Pemuda',
    true
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'kuis-bahasa-indonesia',
    'Kuis Cerdas Cermat Bahasa Indonesia (10 Soal)',
    'Jawab kuis 10 pertanyaan seputar kaidah EYD, asal-usul kata serapan, dan sejarah Sumpah Pemuda 1928.',
    'kode_unik',
    30,
    1000,
    'Kamus Berjalan',
    true
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    'twibbon-gebyar',
    'Tantangan Twibbon GebyarBulanBahasa',
    'Unggah foto terbaikmu menggunakan Twibbon resmi acara ke Instagram/TikTok dan submit ke galeri acara.',
    'unggah_bukti',
    20,
    1000,
    'Duta Bahasa',
    true
  ),
  (
    'd0000000-0000-0000-0000-000000000005',
    'wawancara-juri',
    'Wawancara Singkat Juri Favorit',
    'Ajak diskusi singkat salah satu dewan juri setelah sesi lomba selesai dan unggah intisari nasihat sastranya.',
    'unggah_bukti',
    40,
    100,
    'Pewarta Muda',
    true
  )
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  description = excluded.description,
  type = excluded.type,
  point_reward = excluded.point_reward,
  max_claims = excluded.max_claims,
  badge_icon = excluded.badge_icon,
  is_active = excluded.is_active;

-- ---------------------------------------------------------------------
-- 6. REWARDS (Merchandise & Hadiah Penukaran Poin)
-- ---------------------------------------------------------------------
insert into public.rewards (
  id, name, description, points_required, quota, claimed_count, is_active, sort_order
)
values
  (
    'e0000000-0000-0000-0000-000000000001',
    'Pin Logam Edisi Sumpah Pemuda 2025',
    'Pin enamel kuningan eksklusif berlogo GebyarBulanBahasa dengan sepuhan emas.',
    100, 200, 74, true, 1
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'Voucher Kopi Nusantara Rp25.000',
    'Voucher belanja di seluruh tenant kuliner kopi tradisional area festival.',
    150, 120, 62, true, 2
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'Tote Bag Kanvas GebyarBulanBahasa',
    'Tote bag bahan kanvas tebal dengan sablon tipografi kutipan Sumpah Pemuda.',
    250, 80, 39, true, 3
  ),
  (
    'e0000000-0000-0000-0000-000000000004',
    'Tiket Prioritas Kursi VIP Pentas Seni',
    'Akses tempat duduk baris terdepan pada Malam Penganugerahan & Pentas Seni puncak.',
    300, 50, 28, true, 4
  ),
  (
    'e0000000-0000-0000-0000-000000000005',
    'Buku Antologi Puisi & Naskah Juara',
    'Buku cetak eksklusif kumpulan karya puisi dan naskah pidato terbaik Gebyar Bulan Bahasa.',
    400, 30, 11, true, 5
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  points_required = excluded.points_required,
  quota = excluded.quota,
  claimed_count = excluded.claimed_count,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------
-- 7. SCHEDULES (Jadwal Acara 3 Hari)
-- ---------------------------------------------------------------------
insert into public.schedules (
  id, competition_id, title, description, event_day, event_date,
  start_time, end_time, venue, stage, host_name, status, sort_order
)
values
  -- Hari 1: 26 Oktober 2025
  (
    'f0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000007',
    'Lomba Seni Tradisi Palang Pintu',
    'Adu pantun dan jurus silat tradisional Betawi antar sanggar seni.',
    1, '2025-10-26', '14:00:00', '17:30:00',
    'Lapangan Terbuka', 'Pelataran Budaya', 'Bang Udin & Mpok Romlah',
    'selesai', 1
  ),
  (
    'f0000000-0000-0000-0000-000000000002',
    null,
    'Pentas Musik Pembuka: Kolaborasi Gamelan & Akustik',
    'Pergelaran pembukaan festival menyambut para delegasi dan kontingen.',
    1, '2025-10-26', '19:00:00', '21:00:00',
    'Panggung Utama', 'Stage A', 'Dewi Sekar',
    'selesai', 2
  ),

  -- Hari 2: 27 Oktober 2025 (Sedang Berlangsung)
  (
    'f0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Lomba Membaca Puisi Sastra Nusantara',
    'Penampilan membaca puisi karya penyair terkemuka Indonesia.',
    2, '2025-10-27', '09:00:00', '12:00:00',
    'Panggung Utama', 'Stage A', 'Rizal Ramli',
    'berlangsung', 3
  ),
  (
    'f0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000004',
    'Lomba Melukis Tas Kanvas Nusantara',
    'Kreasi visual motif ornamen tradisional pada tas kain kanvas.',
    2, '2025-10-27', '10:00:00', '13:00:00',
    'Area Kreatif Selasar', 'Zona Kreatif B', 'Nadira Putri',
    'berlangsung', 4
  ),
  (
    'f0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000003',
    'Lomba Pidato Bahasa Indonesia',
    'Orasi gagasan generasi muda dengan tema persatuan bangsa.',
    2, '2025-10-27', '13:00:00', '16:30:00',
    'Aula Serbaguna', 'Podium Utama', 'Aditya Pratama',
    'terjadwal', 5
  ),
  (
    'f0000000-0000-0000-0000-000000000006',
    null,
    'Talkshow Budaya: Menjaga Bahasa Ibu di Era Kecerdasan Buatan',
    'Diskusi panel pakar bahasa dan budayawan tentang kelestarian bahasa lokal.',
    2, '2025-10-27', '19:30:00', '21:00:00',
    'Aula Serbaguna', 'Podium Utama', 'Dra. Endang Sulastri',
    'terjadwal', 6
  ),

  -- Hari 3: 28 Oktober 2025 (Puncak Hari Sumpah Pemuda)
  (
    'f0000000-0000-0000-0000-000000000007',
    'a0000000-0000-0000-0000-000000000002',
    'Pemutaran & Penjurian Film Pendek Fiksi',
    'Screening karya sinematografi film pendek dan sesi tanya-jawab juri.',
    3, '2025-10-28', '09:00:00', '15:00:00',
    'Ruang Bioskop Mini', 'Hall Sinema Lt. 2', 'Bagus Wicaksono',
    'terjadwal', 7
  ),
  (
    'f0000000-0000-0000-0000-000000000008',
    'a0000000-0000-0000-0000-000000000005',
    'Lomba Seni Teater Monolog Kebangsaan',
    'Pentas monolog lakon kepahlawanan pejuang kemerdekaan.',
    3, '2025-10-28', '10:30:00', '14:00:00',
    'Ruang Teater A', 'Panggung Blackbox', 'Taufik Hidayat',
    'terjadwal', 8
  ),
  (
    'f0000000-0000-0000-0000-000000000009',
    'a0000000-0000-0000-0000-000000000006',
    'Lomba Pembawa Acara (MC) Formal Kenegaraan',
    'Simulasi pemanduan protokoler upacara peringatan Hari Sumpah Pemuda.',
    3, '2025-10-28', '14:00:00', '17:00:00',
    'Panggung Utama', 'Stage A', 'Rina Kartika',
    'terjadwal', 9
  ),
  (
    'f0000000-0000-0000-0000-000000000010',
    'a0000000-0000-0000-0000-000000000008',
    'Lomba Vokal Grup Lagu Daerah & Nasional',
    'Harmoni paduan suara kelompok membawakan lagu daerah dan nasional.',
    3, '2025-10-28', '19:00:00', '21:30:00',
    'Panggung Utama', 'Stage A', 'Dewi Anggraini',
    'terjadwal', 10
  ),
  (
    'f0000000-0000-0000-0000-000000000011',
    null,
    'Malam Penganugerahan Juara & Ikrar Sumpah Pemuda 2025',
    'Malam puncak pengumuman juara seluruh cabang lomba dan pembacaan ikrar.',
    3, '2025-10-28', '21:30:00', '23:00:00',
    'Panggung Utama', 'Stage A', 'Seluruh Panitia & Tamu Kehormatan',
    'terjadwal', 11
  )
on conflict (id) do update set
  competition_id = excluded.competition_id,
  title = excluded.title,
  description = excluded.description,
  event_day = excluded.event_day,
  event_date = excluded.event_date,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  venue = excluded.venue,
  stage = excluded.stage,
  host_name = excluded.host_name,
  status = excluded.status,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ---------------------------------------------------------------------
-- 8. ANNOUNCEMENTS (Pengumuman Resmi & Broadcast)
-- ---------------------------------------------------------------------
insert into public.announcements (
  id, slug, title, category, body, is_published, is_pinned, show_on_monitor, publish_at
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'pengambilan-nomor-peserta-puisi',
    'Pengambilan Nomor Urut Peserta Lomba Membaca Puisi',
    'penting',
    'Pengambilan nomor dada dan pengundian urutan tampil peserta Lomba Membaca Puisi dapat dilakukan di Sekretariat Panitia (Gedung A Lt. 1) mulai pukul 07.30 WIB. Peserta wajib hadir minimal 30 menit sebelum jadwal lomba dimulai.',
    true, true, true, now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'perubahan-ruang-sidang-film-pendek',
    'Konfirmasi Uji Coba Audio Ruang Bioskop Mini untuk Film Pendek',
    'jadwal',
    'Seluruh tim peserta Film Pendek dapat melakukan uji format file dan kalibrasi audio di Ruang Bioskop Mini hari ini pukul 16.00 - 18.00 WIB didampingi tim Media Center.',
    true, false, true, now()
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'hasil-juara-palang-pintu-2025',
    'Selamat Kepada Pemenang Lomba Seni Tradisi Palang Pintu',
    'pemenang',
    'Dewan juri telah merampungkan rekapitulasi penilaian digital untuk Lomba Tradisi Palang Pintu. Juara 1 diraih oleh Sanggar Seni Si Pitung Rawa Belong dengan total nilai terbobot 94,80. Daftar lengkap pemenang dapat dilihat di laman Pemenang.',
    true, true, true, now()
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'ketentuan-penukaran-poin-challenge',
    'Batas Akhir Klaim Hadiah Poin Challenge Acara',
    'umum',
    'Penukaran poin challenge dengan merchandise eksklusif dapat dilayani di Stand Media Center setiap hari pukul 10.00 s/d 18.00 WIB. Pastikan saldo poin mencukupi dan tunjukkan kode QR akun peserta.',
    true, false, false, now()
  )
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  category = excluded.category,
  body = excluded.body,
  is_published = excluded.is_published,
  is_pinned = excluded.is_pinned,
  show_on_monitor = excluded.show_on_monitor,
  updated_at = now();

-- ---------------------------------------------------------------------
-- 9. WINNERS (Pemenang Resmi Lomba Selesai)
-- ---------------------------------------------------------------------
insert into public.winners (
  id, category, competition_id, winner_name, institution, rank, title,
  final_score, prize, is_published, announced_at
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'lomba',
    'a0000000-0000-0000-0000-000000000007',
    'Rezky Ramadhan & Tim (Jawara Cukin Rawa Belong)',
    'Sanggar Seni Si Pitung Rawa Belong',
    1,
    'Juara 1',
    94.80,
    'Piala Bergilir Gubernur + Uang Pembinaan Rp5.000.000 + Piagam',
    true,
    now()
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'lomba',
    'a0000000-0000-0000-0000-000000000007',
    'M. Syafi''i & Kawan-kawan (Kembang Kelapa Ciganjur)',
    'Sanggar Palang Pintu Jagakarsa',
    2,
    'Juara 2',
    91.50,
    'Piala + Uang Pembinaan Rp3.500.000 + Piagam',
    true,
    now()
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'lomba',
    'a0000000-0000-0000-0000-000000000007',
    'Fajar Kurniawan & Tim (Pendekar Tenabang)',
    'Komunitas Seni Budaya Tanah Abang',
    3,
    'Juara 3',
    88.20,
    'Piala + Uang Pembinaan Rp2.500.000 + Piagam',
    true,
    now()
  )
on conflict (id) do update set
  category = excluded.category,
  competition_id = excluded.competition_id,
  winner_name = excluded.winner_name,
  institution = excluded.institution,
  rank = excluded.rank,
  title = excluded.title,
  final_score = excluded.final_score,
  prize = excluded.prize,
  is_published = excluded.is_published,
  announced_at = excluded.announced_at;
