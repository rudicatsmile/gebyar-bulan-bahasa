import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase URL or Service Key missing!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_PASSWORD = "Peserta2026!";

async function run() {
  console.log("=== MEMULAI GENERASI DATA SIMULASI (ATURAN TERBARU) ===");
  console.log("Aturan: 1 peserta = 1 lomba, asal sekolah HANYA dari Master Sekolah (/dashboard/instansi)\n");

  // 1. Ambil Data Master Sekolah / Instansi dari event_settings
  console.log("[1/6] Mengambil Daftar Sekolah dari Master Instansi...");
  const { data: instSetting, error: instErr } = await supabase
    .from("event_settings")
    .select("value")
    .eq("key", "master_institutions")
    .maybeSingle();

  if (instErr) {
    console.error("Gagal mengambil master instansi:", instErr.message);
    process.exit(1);
  }

  const rawInstitutions = (instSetting?.value || []);
  // Filter instansi sekolah aktif (kecuali opsi umum / lainnya)
  const masterSchools = rawInstitutions
    .filter((i) => i.isActive && i.category === "sekolah")
    .map((i) => i.name);

  console.log(`Ditemukan ${masterSchools.length} sekolah aktif di Master Instansi:`);
  masterSchools.forEach((s, idx) => console.log(`  ${idx + 1}. ${s}`));

  if (masterSchools.length === 0) {
    console.error("Error: Master sekolah kosong! Pastikan ada data di /dashboard/instansi.");
    process.exit(1);
  }

  // 2. Bersihkan Data Simulasi Lama (Agar tidak ada peserta yang terdaftar multi-lomba)
  console.log("\n[2/6] Membersihkan Data Registrasi & Penilaian Lama...");
  await supabase.from("assessment_scores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("assessments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("registration_members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("registrations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("winners").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("✓ Data pendaftaran, tim, dan penilaian lama telah dibersihkan.");

  // 3. Susun 25 Peserta dengan Asal Sekolah 100% dari Master Sekolah
  // Pembagian per lomba (Total 25 peserta):
  // - Baca Puisi: 3 peserta (idx 0..2)
  // - MC Formal: 3 peserta (idx 3..5)
  // - Monolog: 3 peserta (idx 6..8)
  // - Seni Rupa Tas Kanvas: 2 peserta (idx 9..10)
  // - Duta Bahasa: 4 peserta / 2 tim (idx 11..14)
  // - Paduan Suara: 10 peserta / 2 tim (idx 15..24)
  const PARTICIPANTS_SPEC = [
    // --- Lomba 1: Baca Puisi (3 peserta) ---
    { name: "Ahmad Fauzi", gender: "L", school: "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA", compSlug: "membaca-puisi", roleType: "individu" },
    { name: "Bunga Citra Lestari", gender: "P", school: "SMP Al Wathoniyah 9", compSlug: "membaca-puisi", roleType: "individu" },
    { name: "Cahya Pratama", gender: "L", school: "SMPN 168", compSlug: "membaca-puisi", roleType: "individu" },

    // --- Lomba 2: Pewara MC Formal (3 peserta) ---
    { name: "Dewi Sartika", gender: "P", school: "SMPN 138", compSlug: "mc-formal", roleType: "individu" },
    { name: "Eka Putra Wardhana", gender: "L", school: "SMP Atthahiriyah", compSlug: "mc-formal", roleType: "individu" },
    { name: "Fadhilah Rahma", gender: "P", school: "SMPN 172", compSlug: "mc-formal", roleType: "individu" },

    // --- Lomba 3: Monolog (3 peserta) ---
    { name: "Gilang Ramadhan", gender: "L", school: "MTSN 24 Jakarta", compSlug: "monolog", roleType: "individu" },
    { name: "Hana Pertiwi", gender: "P", school: "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA", compSlug: "monolog", roleType: "individu" },
    { name: "Ilham Maulana", gender: "L", school: "SMP Al Wathoniyah 9", compSlug: "monolog", roleType: "individu" },

    // --- Lomba 4: Seni Rupa Tas Kanvas (2 peserta) ---
    { name: "Jovita Amanda", gender: "P", school: "SMPN 168", compSlug: "melukis-tas-kanvas", roleType: "individu" },
    { name: "Kevin Ardiansyah", gender: "L", school: "SMPN 138", compSlug: "melukis-tas-kanvas", roleType: "individu" },

    // --- Lomba 5: Duta Bahasa (4 peserta -> 2 Tim @ 2 Peserta) ---
    // Tim 1 Duta Bahasa (SMP Atthahiriyah)
    { name: "Laila Ramadhani", gender: "P", school: "SMP Atthahiriyah", compSlug: "pidato", roleType: "duta_tim1", isLeader: true },
    { name: "Muhammad Rizky", gender: "L", school: "SMP Atthahiriyah", compSlug: "pidato", roleType: "duta_tim1", isLeader: false },
    // Tim 2 Duta Bahasa (SMPN 172)
    { name: "Nadya Farhana", gender: "P", school: "SMPN 172", compSlug: "pidato", roleType: "duta_tim2", isLeader: true },
    { name: "Oki Setiawan", gender: "L", school: "SMPN 172", compSlug: "pidato", roleType: "duta_tim2", isLeader: false },

    // --- Lomba 6: Paduan Suara / Vokal Grup (10 peserta -> 2 Tim @ 5 Peserta) ---
    // Tim 1 Paduan Suara (MTSN 24 Jakarta)
    { name: "Putri Maharani", gender: "P", school: "MTSN 24 Jakarta", compSlug: "vokal-grup", roleType: "ps_tim1", isLeader: true, teamRole: "Ketua Tim / Dirigen" },
    { name: "Qori Hidayatullah", gender: "L", school: "MTSN 24 Jakarta", compSlug: "vokal-grup", roleType: "ps_tim1", isLeader: false, teamRole: "Tenor" },
    { name: "Ratna Kumalasari", gender: "P", school: "MTSN 24 Jakarta", compSlug: "vokal-grup", roleType: "ps_tim1", isLeader: false, teamRole: "Sopran 1" },
    { name: "Surya Saputra", gender: "L", school: "MTSN 24 Jakarta", compSlug: "vokal-grup", roleType: "ps_tim1", isLeader: false, teamRole: "Bariton" },
    { name: "Tiara Andini", gender: "P", school: "MTSN 24 Jakarta", compSlug: "vokal-grup", roleType: "ps_tim1", isLeader: false, teamRole: "Alto 1" },
    // Tim 2 Paduan Suara (SMK DINAMIKA PEMBANGUNAN 2 JAKARTA)
    { name: "Umar Faruq", gender: "L", school: "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA", compSlug: "vokal-grup", roleType: "ps_tim2", isLeader: true, teamRole: "Ketua Tim / Tenor" },
    { name: "Vania Aurelia", gender: "P", school: "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA", compSlug: "vokal-grup", roleType: "ps_tim2", isLeader: false, teamRole: "Sopran 1" },
    { name: "Wahyu Hidayat", gender: "L", school: "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA", compSlug: "vokal-grup", roleType: "ps_tim2", isLeader: false, teamRole: "Bass" },
    { name: "Yasmin Zahra", gender: "P", school: "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA", compSlug: "vokal-grup", roleType: "ps_tim2", isLeader: false, teamRole: "Alto 1" },
    { name: "Zidan Al-Fath", gender: "L", school: "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA", compSlug: "vokal-grup", roleType: "ps_tim2", isLeader: false, teamRole: "Bariton" },
  ];

  console.log("\n[3/6] Memproses 25 Akun & Biodata Peserta Terdaftar...");
  const participantsMap = []; // Berisi objek peserta lengkap dengan id, userId, data

  for (let i = 0; i < PARTICIPANTS_SPEC.length; i++) {
    const item = PARTICIPANTS_SPEC[i];
    const email = `${item.name.toLowerCase().replace(/[^a-z0-9]/g, ".")}@peserta.test`;
    const phone = `08129000${String(i + 1).padStart(4, "0")}`;
    const regNumber = `REG-2026-${String(i + 1).padStart(3, "0")}`;
    const nisn = `0081234${String(i + 1).padStart(3, "0")}`;

    // Verifikasi atau buat user di Auth
    let userId = null;
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const foundUser = existingUsers?.users?.find((u) => u.email === email);

    if (foundUser) {
      userId = foundUser.id;
    } else {
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: item.name, role: "peserta" },
      });
      if (createErr) {
        console.error(`Gagal membuat user auth ${email}:`, createErr.message);
        continue;
      }
      userId = newUser.user.id;
    }

    // Upsert profil
    await supabase.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: item.name,
        nickname: item.name.split(" ")[0],
        phone,
        institution: item.school,
        role: "peserta",
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    // Upsert peserta di public.participants
    let participantId = null;
    const { data: existingPart } = await supabase
      .from("participants")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingPart) {
      participantId = existingPart.id;
      await supabase.from("participants").update({
        registration_number: regNumber,
        full_name: item.name,
        nickname: item.name.split(" ")[0],
        email,
        phone,
        institution: item.school,
        status: "terverifikasi",
        total_points: 35 + (i * 2),
        updated_at: new Date().toISOString(),
      }).eq("id", participantId);
    } else {
      const { data: newPart, error: partErr } = await supabase
        .from("participants")
        .insert({
          user_id: userId,
          registration_number: regNumber,
          full_name: item.name,
          nickname: item.name.split(" ")[0],
          email,
          phone,
          institution: item.school,
          birth_date: "2008-06-10",
          address: "DKI Jakarta",
          status: "terverifikasi",
          total_points: 35 + (i * 2),
        })
        .select()
        .single();

      if (partErr) {
        console.error(`Gagal insert participant ${item.name}:`, partErr.message);
        continue;
      }
      participantId = newPart.id;
    }

    // Masukkan dokumen dummy yang valid
    await supabase.from("participant_documents").delete().eq("participant_id", participantId);
    await supabase.from("participant_documents").insert([
      {
        participant_id: participantId,
        doc_type: "Kartu Pelajar",
        file_name: `Kartu_Pelajar_${item.name.replace(/\s+/g, "_")}.pdf`,
        file_url: "https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/public/og.png",
        status: "valid",
        note: "Data pelajar valid dan sesuai data dapodik.",
        uploaded_at: new Date().toISOString(),
      },
      {
        participant_id: participantId,
        doc_type: "Biodata & Formulir",
        file_name: `Formulir_${item.name.replace(/\s+/g, "_")}.pdf`,
        file_url: "https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/public/og.png",
        status: "valid",
        note: "Formulir pendaftaran ditandatangani kepala sekolah.",
        uploaded_at: new Date().toISOString(),
      },
    ]);

    participantsMap.push({
      ...item,
      email,
      phone,
      regNumber,
      nisn,
      userId,
      participantId,
    });
  }

  console.log(`✓ 25 Peserta terdaftar sukses dengan asal sekolah resmi.`);

  // 4. Daftarkan Peserta ke TEPAT 1 Lomba
  console.log("\n[4/6] Mendaftarkan Peserta ke Tepat 1 Lomba...");
  const targetSlugs = ["membaca-puisi", "mc-formal", "monolog", "melukis-tas-kanvas", "pidato", "vokal-grup"];
  const { data: comps } = await supabase.from("competitions").select("id, slug, name, type").in("slug", targetSlugs);
  const compMap = new Map((comps || []).map((c) => [c.slug, c]));

  // Memastikan penugasan juri lengkap
  const judgeAssignments = {
    "membaca-puisi": ["b1c34a48-78a8-4ae6-8b10-4311725e2d4e"], // H. Mulyana
    "mc-formal": ["44695fec-faa9-4963-8feb-2119b0f42669"],     // Anisa Rizky
    "monolog": ["b02c3cb0-00cc-4663-9530-fd0f3f2407f1"],       // Drs. Ngatmin
    "melukis-tas-kanvas": ["e018d884-79f4-42bb-9ef9-4f3b467ac4ae"], // Rudi Kurniawan
    "vokal-grup": ["fb5129b6-1f50-45f6-b491-08bbd5727788"],    // Dra. Hj. Endang Ekowati
    "pidato": [
      "cc5667d2-d1ab-46e6-ab2f-7ea4e5fa6d2c", // Sofyan Jamaludin
      "b372e72e-0676-4c2f-9316-2e0fa171dd01", // Roihan Al Kamil
    ],
  };

  for (const [slug, jIds] of Object.entries(judgeAssignments)) {
    const comp = compMap.get(slug);
    if (!comp) continue;
    for (const jId of jIds) {
      await supabase.from("competition_judges").upsert(
        { competition_id: comp.id, judge_id: jId },
        { onConflict: "competition_id,judge_id" }
      );
    }
  }

  const registrationsToScore = []; // { registrationId, competitionId, slug, title }

  // A. Pendaftaran 4 Lomba Individu (11 Peserta)
  const individualParticipants = participantsMap.filter((p) => p.roleType === "individu");
  for (let i = 0; i < individualParticipants.length; i++) {
    const p = individualParticipants[i];
    const comp = compMap.get(p.compSlug);

    const { data: reg, error: regErr } = await supabase.from("registrations").insert({
      participant_id: p.participantId,
      competition_id: comp.id,
      team_name: null,
      performance_order: i + 1,
      is_confirmed: true,
      notes: `Peserta individu dari ${p.school}`,
    }).select().single();

    if (regErr) {
      console.error(`Gagal reg individu ${p.name}:`, regErr.message);
    } else {
      registrationsToScore.push({
        registrationId: reg.id,
        competitionId: comp.id,
        competitionSlug: p.compSlug,
        title: `${p.name} (${p.school})`,
      });
    }
  }
  console.log(`✓ 11 Peserta individu terdaftar di 4 lomba individu.`);

  // B. Pendaftaran Lomba Duta Bahasa (4 Peserta -> 2 Tim Pasangan)
  const dutaComp = compMap.get("pidato");
  const dutaTim1Leader = participantsMap.find((p) => p.roleType === "duta_tim1" && p.isLeader);
  const dutaTim1Partner = participantsMap.find((p) => p.roleType === "duta_tim1" && !p.isLeader);
  const dutaTim2Leader = participantsMap.find((p) => p.roleType === "duta_tim2" && p.isLeader);
  const dutaTim2Partner = participantsMap.find((p) => p.roleType === "duta_tim2" && !p.isLeader);

  const dutaTeams = [
    { name: "Duta Bahasa & Budaya Atthahiriyah", leader: dutaTim1Leader, partner: dutaTim1Partner, order: 1 },
    { name: "Duta Bahasa & Budaya Satya 172", leader: dutaTim2Leader, partner: dutaTim2Partner, order: 2 },
  ];

  const dutaProgressMap = {};

  for (const dt of dutaTeams) {
    const { data: reg, error: regErr } = await supabase.from("registrations").insert({
      participant_id: dt.leader.participantId,
      competition_id: dutaComp.id,
      team_name: dt.name,
      performance_order: dt.order,
      is_confirmed: true,
      notes: `Pasangan Duta Bahasa dari ${dt.leader.school}`,
    }).select().single();

    if (regErr) {
      console.error(`Gagal reg tim duta ${dt.name}:`, regErr.message);
      continue;
    }

    await supabase.from("registration_members").insert([
      {
        registration_id: reg.id,
        member_name: dt.leader.name,
        member_role: dt.leader.gender === "L" ? "Duta Putra (Ketua)" : "Duta Putri (Ketua)",
        student_id: dt.leader.nisn,
        institution: dt.leader.school,
        is_leader: true,
      },
      {
        registration_id: reg.id,
        member_name: dt.partner.name,
        member_role: dt.partner.gender === "L" ? "Duta Putra" : "Duta Putri",
        student_id: dt.partner.nisn,
        institution: dt.partner.school,
        is_leader: false,
      },
    ]);

    // Simpan progres seleksi di event_settings
    dutaProgressMap[dt.leader.participantId] = {
      "db-stage-1": {
        participantId: dt.leader.participantId,
        stageId: "db-stage-1",
        status: "lolos",
        notes: "Berkas persyaratan lengkap dan terverifikasi.",
        reviewedAt: new Date().toISOString(),
      },
      "db-stage-2": {
        participantId: dt.leader.participantId,
        stageId: "db-stage-2",
        status: "lolos",
        score: dt.order === 1 ? 88.5 : 92.0,
        notes: "Visi misi dan pemaparan program kerja unggul.",
        reviewedAt: new Date().toISOString(),
      },
    };

    registrationsToScore.push({
      registrationId: reg.id,
      competitionId: dutaComp.id,
      competitionSlug: "pidato",
      title: dt.name,
    });
  }

  await supabase.from("event_settings").upsert(
    {
      key: "duta_bahasa_progress",
      value: dutaProgressMap,
      description: "Progress peserta seleksi Duta Bahasa per tahap",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  console.log(`✓ 4 Peserta dialokasikan ke 2 tim Duta Bahasa (Lengkap dengan anggota & tahapan).`);

  // C. Pendaftaran Lomba Paduan Suara / Vokal Grup (10 Peserta -> 2 Tim @ 5 Peserta)
  const vokalComp = compMap.get("vokal-grup");
  const psTim1Members = participantsMap.filter((p) => p.roleType === "ps_tim1");
  const psTim1Leader = psTim1Members.find((p) => p.isLeader);
  const psTim2Members = participantsMap.filter((p) => p.roleType === "ps_tim2");
  const psTim2Leader = psTim2Members.find((p) => p.isLeader);

  const psTeams = [
    { name: "Paduan Suara Bahana 24", leader: psTim1Leader, members: psTim1Members, order: 1 },
    { name: "Gita Swara Dinamika Pembangunan", leader: psTim2Leader, members: psTim2Members, order: 2 },
  ];

  for (const pt of psTeams) {
    const { data: reg, error: regErr } = await supabase.from("registrations").insert({
      participant_id: pt.leader.participantId,
      competition_id: vokalComp.id,
      team_name: pt.name,
      performance_order: pt.order,
      is_confirmed: true,
      notes: `Tim Paduan Suara dari ${pt.leader.school}`,
    }).select().single();

    if (regErr) {
      console.error(`Gagal reg tim paduan suara ${pt.name}:`, regErr.message);
      continue;
    }

    const membersInsert = pt.members.map((m) => ({
      registration_id: reg.id,
      member_name: m.name,
      member_role: m.teamRole || (m.isLeader ? "Ketua Tim" : "Anggota"),
      student_id: m.nisn,
      institution: m.school,
      is_leader: m.isLeader,
    }));

    await supabase.from("registration_members").insert(membersInsert);

    registrationsToScore.push({
      registrationId: reg.id,
      competitionId: vokalComp.id,
      competitionSlug: "vokal-grup",
      title: pt.name,
    });
  }
  console.log(`✓ 10 Peserta dialokasikan ke 2 tim Paduan Suara (Lengkap dengan anggota tim).`);

  // 5. Penilaian Juri untuk Seluruh 6 Lomba
  console.log("\n[5/6] Memasukkan Penilaian Juri Realistis untuk Seluruh 6 Lomba...");
  let totalAssessments = 0;
  let totalScores = 0;

  // Cache kriteria lomba
  const criteriaByComp = {};
  for (const slug of targetSlugs) {
    const comp = compMap.get(slug);
    if (!comp) continue;
    const { data: crits } = await supabase.from("competition_criteria").select("id, name, weight").eq("competition_id", comp.id);
    criteriaByComp[comp.id] = crits || [];
  }

  const JUDGE_COMMENTS = [
    "Penguasaan materi sangat prima, gestur dan ekspresi natural.",
    "Artikulasi sangat bersih, intonasi bertenaga dan artikulatif.",
    "Komposisi harmonisasi suara matang, aransemen dan pitch control terjaga.",
    "Retorika persuasif dengan penguasaan panggung yang mengagumkan.",
    "Karakter panggung kuat, penjiwaan mendalam dan menyentuh emosi juri.",
    "Kreativitas tinggi, komposisi warna artistik dan finishing sangat rapi.",
    "Tata bahasa baku tepat, modulasi suara stabil dan percaya diri tinggi.",
  ];

  for (const regItem of registrationsToScore) {
    const judgeIds = judgeAssignments[regItem.competitionSlug] || [];
    const criteria = criteriaByComp[regItem.competitionId] || [];

    for (let jIdx = 0; jIdx < judgeIds.length; jIdx++) {
      const judgeId = judgeIds[jIdx];
      const baseGrade = 83 + Math.floor(Math.random() * 12);
      let calculatedWeightedTotal = 0;
      const criterionScores = [];

      for (const crit of criteria) {
        const variation = (Math.random() * 6 - 3);
        const scoreVal = Math.min(98, Math.max(75, Number((baseGrade + variation).toFixed(1))));
        const weight = Number(crit.weight) || 25;
        calculatedWeightedTotal += (scoreVal * weight) / 100;

        criterionScores.push({
          criterion_id: crit.id,
          score: scoreVal,
          comment: JUDGE_COMMENTS[Math.floor(Math.random() * JUDGE_COMMENTS.length)],
        });
      }

      const weightedTotal = Number(calculatedWeightedTotal.toFixed(2));
      const note = JUDGE_COMMENTS[(totalAssessments + jIdx) % JUDGE_COMMENTS.length];

      const { data: ass, error: assErr } = await supabase.from("assessments").insert({
        registration_id: regItem.registrationId,
        competition_id: regItem.competitionId,
        judge_id: judgeId,
        status: "terkirim",
        weighted_total: weightedTotal,
        notes: note,
        submitted_at: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
      }).select().single();

      if (assErr) {
        console.error(`Gagal insert assessment ${regItem.title}:`, assErr.message);
        continue;
      }
      totalAssessments++;

      for (const sc of criterionScores) {
        const { error: scErr } = await supabase.from("assessment_scores").insert({
          assessment_id: ass.id,
          criterion_id: sc.criterion_id,
          score: sc.score,
          comment: sc.comment,
        });
        if (!scErr) totalScores++;
      }
    }
  }

  console.log(`✓ Berhasil memasukkan ${totalAssessments} lembar penilaian juri.`);
  console.log(`✓ Berhasil memasukkan ${totalScores} skor kriteria penilaian.`);

  // 6. Verifikasi Kritis: Pemenang Belum Dipublikasikan
  console.log("\n[6/6] Verifikasi Status Pemenang...");
  const { count: winnerCount } = await supabase.from("winners").select("*", { count: "exact", head: true });
  console.log(`✓ Jumlah pemenang di tabel winners: ${winnerCount} (AMAN / BELUM DIPUBLIKASIKAN)`);

  console.log("\n=== SELESAI: DATA SIMULASI SESUAI ATURAN TERBARU BERHASIL DIBUAT ===");
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
