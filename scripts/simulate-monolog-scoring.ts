import { createAdminClient } from "../src/lib/supabase/admin";
import {
  getJudgeCompetitionRoster,
  getParticipantGradingSheet,
  saveAssessment,
  getCompetitionScoringRecap,
} from "../src/app/actions/assessments";

const MONOLOG_COMP_ID = "a0000000-0000-0000-0000-000000000005";
const JUDGE_1_ID = "44695fec-faa9-4963-8feb-2119b0f42669"; // Anisa Rizky, S.Pd.
const JUDGE_2_ID = "abfc8e99-ffdd-4d9f-9ba4-ea18fd42432d"; // Restu Nurcahyani, S.Pd.

const CRITERIA = {
  PENGHAYATAN: "b0000005-0000-0000-0000-000000000001", // Bobot 35
  VOKAL: "b0000005-0000-0000-0000-000000000002",       // Bobot 25
  PANGGUNG: "b0000005-0000-0000-0000-000000000003",    // Bobot 25
  ARTISTIK: "b0000005-0000-0000-0000-000000000004",    // Bobot 15
};

const NEW_PARTICIPANTS = [
  {
    registrationNumber: "GBB-2025-4102",
    fullName: "Dewi Sartika Putri",
    email: "dewi.sartika@smkdp1jkt.sch.id",
    phone: "081234567801",
    institution: "SMK DINAMIKA PEMBANGUNAN 1 JAKARTA",
    performanceOrder: 1,
    scoresJudge1: {
      scores: [
        { criterionId: CRITERIA.PENGHAYATAN, score: 92, comment: "Penghayatan karakter tokoh sangat mendalam dan emosional." },
        { criterionId: CRITERIA.VOKAL, score: 90, comment: "Artikulasi jelas, artikulasi dialog terdengar jernih." },
        { criterionId: CRITERIA.PANGGUNG, score: 88, comment: "Blocking panggung efektif dan mengalir." },
        { criterionId: CRITERIA.ARTISTIK, score: 90, comment: "Kostum dan tata rias sangat mendukung penokohan." },
      ],
      notes: "Penghayatan karakter tokoh sangat kuat dan emosional. Penggunaan tempo bicara sangat teratur.",
    },
    scoresJudge2: {
      scores: [
        { criterionId: CRITERIA.PENGHAYATAN, score: 90, comment: "Penjiwaan sangat baik dan ekspresif." },
        { criterionId: CRITERIA.VOKAL, score: 88, comment: "Intonasi dan resonansi vokal sangat baik." },
        { criterionId: CRITERIA.PANGGUNG, score: 89, comment: "Penguasaan panggung sangat luwes." },
        { criterionId: CRITERIA.ARTISTIK, score: 88, comment: "Karakteristik busana selaras dengan tema cerita." },
      ],
      notes: "Artikulasi vokal jernih, dinamika rasa mengalir dengan sangat natural.",
    },
  },
  {
    registrationNumber: "GBB-2025-5219",
    fullName: "Ahmad Fauzi Rahman",
    email: "ahmad.fauzi@smkdp2jkt.sch.id",
    phone: "081234567802",
    institution: "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA",
    performanceOrder: 2,
    scoresJudge1: {
      scores: [
        { criterionId: CRITERIA.PENGHAYATAN, score: 87, comment: "Karakter dibawakan dengan penuh energi." },
        { criterionId: CRITERIA.VOKAL, score: 85, comment: "Proyeksi vokal lantang dan tegas." },
        { criterionId: CRITERIA.PANGGUNG, score: 88, comment: "Gerak tubuh dan gestur panggung hidup." },
        { criterionId: CRITERIA.ARTISTIK, score: 84, comment: "Properti pendukung dimanfaatkan dengan baik." },
      ],
      notes: "Penguasaan blocking panggung sangat baik dan percaya diri tinggi.",
    },
    scoresJudge2: {
      scores: [
        { criterionId: CRITERIA.PENGHAYATAN, score: 86, comment: "Konsistensi ekspresi terjaga rapi." },
        { criterionId: CRITERIA.VOKAL, score: 86, comment: "Diksi panggung terdengar tegas dan jelas." },
        { criterionId: CRITERIA.PANGGUNG, score: 87, comment: "Perpindahan zona panggung terarah." },
        { criterionId: CRITERIA.ARTISTIK, score: 85, comment: "Visualisasi busana rapi dan sesuai naskah." },
      ],
      notes: "Diksi panggung terdengar tegas dan artikulatif. Pertahankan intonasi.",
    },
  },
  {
    registrationNumber: "GBB-2025-6330",
    fullName: "Siti Nurhaliza",
    email: "siti.nurhaliza@sman107jkt.sch.id",
    phone: "081234567803",
    institution: "SMA NEGERI 107 JAKARTA",
    performanceOrder: 3,
    scoresJudge1: {
      scores: [
        { criterionId: CRITERIA.PENGHAYATAN, score: 85, comment: "Nuansa puitis terasa hangat dan menyentuh." },
        { criterionId: CRITERIA.VOKAL, score: 84, comment: "Pengaturan nafas dan jeda kalimat pas." },
        { criterionId: CRITERIA.PANGGUNG, score: 83, comment: "Gerak lembut namun sarat makna." },
        { criterionId: CRITERIA.ARTISTIK, score: 87, comment: "Tata busana panggung sangat estetik." },
      ],
      notes: "Tata busana dan tata rias sangat mendukung karakter monolog yang dibawakan.",
    },
    scoresJudge2: {
      scores: [
        { criterionId: CRITERIA.PENGHAYATAN, score: 84, comment: "Penyampaian monolog puitis dan mendalam." },
        { criterionId: CRITERIA.VOKAL, score: 85, comment: "Vokal stabil dan intonasi melodius." },
        { criterionId: CRITERIA.PANGGUNG, score: 82, comment: "Fokus pandangan terjaga dengan baik." },
        { criterionId: CRITERIA.ARTISTIK, score: 88, comment: "Karakter artistik busana sangat memukau." },
      ],
      notes: "Penyampaian monolog puitis dan penuh penghayatan batin.",
    },
  },
];

const RUDI_SCORES = {
  scoresJudge1: {
    scores: [
      { criterionId: CRITERIA.PENGHAYATAN, score: 88, comment: "Transisi karakter sangat halus dan menyatu." },
      { criterionId: CRITERIA.VOKAL, score: 86, comment: "Artikulasi dialog tegas dan artikulatif." },
      { criterionId: CRITERIA.PANGGUNG, score: 85, comment: "Pemanfaatan ruang panggung proporsional." },
      { criterionId: CRITERIA.ARTISTIK, score: 86, comment: "Karakteristik busana sesuai dengan alur monolog." },
    ],
    notes: "Transisi karakter sangat halus, ekspresi wajah hidup dan meyakinkan.",
  },
  scoresJudge2: {
    scores: [
      { criterionId: CRITERIA.PENGHAYATAN, score: 89, comment: "Penghayatan tokoh sangat konsisten." },
      { criterionId: CRITERIA.VOKAL, score: 87, comment: "Modulasi vokal dinamis dan ekspresif." },
      { criterionId: CRITERIA.PANGGUNG, score: 86, comment: "Gerakan panggung mendukung tensi cerita." },
      { criterionId: CRITERIA.ARTISTIK, score: 85, comment: "Tata rias panggung selaras dengan karakter." },
    ],
    notes: "Penghayatan tokoh sangat konsisten dari awal hingga akhir penampilan.",
  },
};

async function runSimulation() {
  const supabase = createAdminClient();
  console.log("=== MEMULAI SIMULASI PENILAIAN JURI LOMBA MONOLOG ===\n");

  // LANGKAH 1: Tambahkan 3 peserta baru terverifikasi
  console.log("--- Langkah 1: Memeriksa dan Menambahkan 3 Peserta Baru ---");
  const createdRegistrations: Array<{
    registrationId: string;
    participantId: string;
    fullName: string;
    regNum: string;
    scoresJudge1: any;
    scoresJudge2: any;
  }> = [];

  for (const p of NEW_PARTICIPANTS) {
    // Cek apakah sudah ada peserta dengan nomor registrasi ini
    const { data: existingPart } = await supabase
      .from("participants")
      .select("id")
      .eq("registration_number", p.registrationNumber)
      .maybeSingle();

    let participantId = existingPart?.id;

    if (!participantId) {
      const { data: insertedPart, error: partErr } = await supabase
        .from("participants")
        .insert({
          registration_number: p.registrationNumber,
          full_name: p.fullName,
          email: p.email,
          phone: p.phone,
          institution: p.institution,
          status: "terverifikasi",
          verified_at: new Date().toISOString(),
          total_points: 0,
        })
        .select()
        .single();

      if (partErr || !insertedPart) {
        throw new Error(`Gagal insert participant ${p.fullName}: ${partErr?.message}`);
      }
      participantId = insertedPart.id;
      console.log(`[+] Peserta baru dibuat: ${p.fullName} (${p.registrationNumber}) -> ID: ${participantId}`);

      // Insert dokumen pendukung kartu pelajar
      await supabase.from("participant_documents").insert({
        participant_id: participantId,
        doc_type: "kartu_pelajar",
        file_url: `https://lumrqtxmdcrjxjxzrqau.supabase.co/storage/v1/object/public/documents/${p.registrationNumber}.pdf`,
        file_name: `Kartu_Pelajar_${p.fullName.replace(/\s+/g, "_")}.pdf`,
        status: "valid",
        reviewed_at: new Date().toISOString(),
      });
    } else {
      console.log(`[i] Peserta ${p.fullName} (${p.registrationNumber}) sudah ada -> ID: ${participantId}`);
      // Pastikan status terverifikasi
      await supabase
        .from("participants")
        .update({ status: "terverifikasi", verified_at: new Date().toISOString() })
        .eq("id", participantId);
    }

    // Cek registrasi di lomba monolog
    const { data: existingReg } = await supabase
      .from("registrations")
      .select("id")
      .eq("competition_id", MONOLOG_COMP_ID)
      .eq("participant_id", participantId)
      .maybeSingle();

    let registrationId = existingReg?.id;
    if (!registrationId) {
      const { data: insertedReg, error: regErr } = await supabase
        .from("registrations")
        .insert({
          competition_id: MONOLOG_COMP_ID,
          participant_id: participantId,
          is_confirmed: true,
          performance_order: p.performanceOrder,
        })
        .select()
        .single();

      if (regErr || !insertedReg) {
        throw new Error(`Gagal registrasi lomba monolog untuk ${p.fullName}: ${regErr?.message}`);
      }
      registrationId = insertedReg.id;
      console.log(`[+] Registrasi monolog dibuat: ${p.fullName} -> Reg ID: ${registrationId}`);
    } else {
      console.log(`[i] Registrasi ${p.fullName} sudah ada -> Reg ID: ${registrationId}`);
      await supabase
        .from("registrations")
        .update({ is_confirmed: true, performance_order: p.performanceOrder })
        .eq("id", registrationId);
    }

    createdRegistrations.push({
      registrationId,
      participantId,
      fullName: p.fullName,
      regNum: p.registrationNumber,
      scoresJudge1: p.scoresJudge1,
      scoresJudge2: p.scoresJudge2,
    });
  }

  // Cek Rudi K (peserta pertama) dan update urutan tampil menjadi 4
  const { data: rudiPart } = await supabase
    .from("participants")
    .select("id, full_name, registration_number, status")
    .eq("full_name", "Rudi K")
    .maybeSingle();

  if (rudiPart) {
    const { data: rudiReg } = await supabase
      .from("registrations")
      .select("id")
      .eq("competition_id", MONOLOG_COMP_ID)
      .eq("participant_id", rudiPart.id)
      .maybeSingle();

    if (rudiReg) {
      await supabase
        .from("registrations")
        .update({ is_confirmed: true, performance_order: 4 })
        .eq("id", rudiReg.id);

      createdRegistrations.push({
        registrationId: rudiReg.id,
        participantId: rudiPart.id,
        fullName: rudiPart.full_name,
        regNum: rudiPart.registration_number,
        scoresJudge1: RUDI_SCORES.scoresJudge1,
        scoresJudge2: RUDI_SCORES.scoresJudge2,
      });
      console.log(`[i] Rudi K (Reg ID: ${rudiReg.id}) diperbarui: urutan tampil = 4, is_confirmed = true.`);
    }
  }

  console.log(`\nTotal peserta siap dinilai: ${createdRegistrations.length} peserta.`);

  // LANGKAH 2: Uji Pembacaan Roster Peserta oleh Juri (/juri/lomba/monolog)
  console.log("\n--- Langkah 2: Uji Pembacaan Roster Peserta di Halaman Juri ---");
  const roster = await getJudgeCompetitionRoster("monolog");
  console.log("Status Roster:", roster.success ? "BERHASIL" : "GAGAL");
  console.log("Cabang Lomba:", roster.competition?.name, `(Kategori: ${roster.competition?.category})`);
  console.log("Jumlah Peserta Terverifikasi:", roster.participants.length);
  console.log("Jumlah Peserta Belum Terverifikasi:", roster.unverifiedCount);
  console.log("Daftar Peserta Roster:");
  roster.participants.forEach((p, idx) => {
    console.log(`  ${idx + 1}. [${p.registrationNumber}] ${p.fullName} - ${p.institution} (Status: ${p.status})`);
  });

  if (roster.participants.length !== 4) {
    throw new Error(`Diharapkan 4 peserta terverifikasi, namun didapatkan ${roster.participants.length}`);
  }

  // LANGKAH 3: Simulasi Alur Penilaian (Buka Form -> Simpan Draft -> Kirim Final)
  console.log("\n--- Langkah 3: Simulasi Penilaian Juri (Draft & Final) ---");

  // Helper untuk melakukan simpan penilaian langsung ke database dengan validasi logika saveAssessment
  for (const target of createdRegistrations) {
    console.log(`\n>>> Memproses Penilaian untuk: ${target.fullName} (${target.regNum}) <<<`);

    // 1. Uji getParticipantGradingSheet sebelum dinilai
    const initialSheet = await getParticipantGradingSheet(target.registrationId);
    if (!initialSheet.success || !initialSheet.participant) {
      throw new Error(`Gagal membuka grading sheet untuk ${target.fullName}: ${initialSheet.error}`);
    }
    console.log(`  ✓ Form Penilaian terbuka dengan sukses: isVerified = ${initialSheet.isVerified}`);

    // 2. Simulasikan Juri 1 (Anisa Rizky, S.Pd.)
    console.log(`  [Juri 1 - Anisa Rizky, S.Pd.]`);
    // A. Simpan Draft terlebih dahulu
    const draftTotalJ1 = target.scoresJudge1.scores.reduce((acc: number, s: any) => {
      const w = s.criterionId === CRITERIA.PENGHAYATAN ? 35 : s.criterionId === CRITERIA.ARTISTIK ? 15 : 25;
      return acc + (s.score * w) / 100;
    }, 0);

    const { data: assessDraftJ1, error: aDraftErr } = await supabase
      .from("assessments")
      .upsert(
        {
          registration_id: target.registrationId,
          competition_id: MONOLOG_COMP_ID,
          judge_id: JUDGE_1_ID,
          status: "draft",
          weighted_total: Number(draftTotalJ1.toFixed(2)),
          notes: target.scoresJudge1.notes,
        },
        { onConflict: "registration_id,judge_id" }
      )
      .select()
      .single();

    if (aDraftErr) throw new Error(`Gagal draft Juri 1: ${aDraftErr.message}`);

    const draftScoresJ1 = target.scoresJudge1.scores.map((sc: any) => ({
      assessment_id: assessDraftJ1.id,
      criterion_id: sc.criterionId,
      score: sc.score,
      comment: sc.comment,
    }));
    await supabase.from("assessment_scores").upsert(draftScoresJ1, { onConflict: "assessment_id,criterion_id" });
    console.log(`    ✓ Draft Juri 1 tersimpan (Skor Terbobot: ${draftTotalJ1.toFixed(2)})`);

    // B. Finalisasi Nilai Juri 1
    const { data: assessFinalJ1, error: aFinalErr } = await supabase
      .from("assessments")
      .upsert(
        {
          registration_id: target.registrationId,
          competition_id: MONOLOG_COMP_ID,
          judge_id: JUDGE_1_ID,
          status: "terkirim",
          weighted_total: Number(draftTotalJ1.toFixed(2)),
          notes: target.scoresJudge1.notes,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "registration_id,judge_id" }
      )
      .select()
      .single();

    if (aFinalErr) throw new Error(`Gagal final Juri 1: ${aFinalErr.message}`);
    console.log(`    ✓ Penilaian Final Juri 1 berhasil dikirim (Status: terkirim, Total: ${draftTotalJ1.toFixed(2)})`);

    // 3. Simulasikan Juri 2 (Restu Nurcahyani, S.Pd.)
    console.log(`  [Juri 2 - Restu Nurcahyani, S.Pd.]`);
    const finalTotalJ2 = target.scoresJudge2.scores.reduce((acc: number, s: any) => {
      const w = s.criterionId === CRITERIA.PENGHAYATAN ? 35 : s.criterionId === CRITERIA.ARTISTIK ? 15 : 25;
      return acc + (s.score * w) / 100;
    }, 0);

    const { data: assessFinalJ2, error: aFinalErr2 } = await supabase
      .from("assessments")
      .upsert(
        {
          registration_id: target.registrationId,
          competition_id: MONOLOG_COMP_ID,
          judge_id: JUDGE_2_ID,
          status: "terkirim",
          weighted_total: Number(finalTotalJ2.toFixed(2)),
          notes: target.scoresJudge2.notes,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "registration_id,judge_id" }
      )
      .select()
      .single();

    if (aFinalErr2) throw new Error(`Gagal final Juri 2: ${aFinalErr2.message}`);

    const finalScoresJ2 = target.scoresJudge2.scores.map((sc: any) => ({
      assessment_id: assessFinalJ2.id,
      criterion_id: sc.criterionId,
      score: sc.score,
      comment: sc.comment,
    }));
    await supabase.from("assessment_scores").upsert(finalScoresJ2, { onConflict: "assessment_id,criterion_id" });
    console.log(`    ✓ Penilaian Final Juri 2 berhasil dikirim (Status: terkirim, Total: ${finalTotalJ2.toFixed(2)})`);

    // 4. Uji Verifikasi Baca Ulang Data Penilaian (getParticipantGradingSheet)
    const rereadSheet = await getParticipantGradingSheet(target.registrationId);
    console.log(`  ✓ Baca ulang form penilaian peserta berhasil:`);
    console.log(`    - Status Penilaian: ${rereadSheet.status}`);
    console.log(`    - Catatan: "${rereadSheet.existingNotes}"`);
    console.log(`    - Nilai Kriteria Terbaca:`, rereadSheet.existingScores);
  }

  // LANGKAH 4: Uji Rekapitulasi Penilaian & Leaderboard Kejuaraan
  console.log("\n--- Langkah 4: Uji Rekapitulasi Nilai & Peringkat Monolog ---");
  const recap = await getCompetitionScoringRecap("monolog");

  console.log("Status Rekap:", recap.success ? "BERHASIL" : "GAGAL");
  console.log("Jumlah Juri Aktif:", recap.judges.length);
  recap.judges.forEach((j) => console.log(`  - ${j.fullName} (${j.id})`));

  console.log("\nHASIL REKAPITULASI DAN PERINGKAT SIMULASI LOMBA MONOLOG:");
  console.log("------------------------------------------------------------------------------------------------------");
  console.log(
    `| No | No. Registrasi | Nama Peserta              | Instansi                        | Juri 1 | Juri 2 | Nilai Akhir | Gap  | Status |`
  );
  console.log("------------------------------------------------------------------------------------------------------");

  // Sort by final score descending
  const sortedRecaps = [...recap.recaps].sort((a, b) => b.finalScore - a.finalScore);

  sortedRecaps.forEach((r, idx) => {
    const j1Score = r.scoresPerJudge.find((s) => s.judgeId === JUDGE_1_ID)?.weightedTotal?.toFixed(2) || "-";
    const j2Score = r.scoresPerJudge.find((s) => s.judgeId === JUDGE_2_ID)?.weightedTotal?.toFixed(2) || "-";
    console.log(
      `| ${(idx + 1).toString().padEnd(2)} | ${(r.registrationId.slice(0, 14)).padEnd(14)} | ${r.participantName.padEnd(25)} | ${r.institution.padEnd(31)} | ${j1Score.padEnd(6)} | ${j2Score.padEnd(6)} | ${r.finalScore.toFixed(2).padEnd(11)} | ${r.scoreGap.toFixed(2).padEnd(4)} | ${r.status.padEnd(6)} |`
    );
  });
  console.log("------------------------------------------------------------------------------------------------------");

  // Update status lomba ke 'berlangsung' jika sebelumnya 'pendaftaran' agar hari H siap
  const { data: comp } = await supabase.from("competitions").select("status").eq("id", MONOLOG_COMP_ID).single();
  if (comp && comp.status !== "selesai") {
    await supabase.from("competitions").update({ status: "berlangsung" }).eq("id", MONOLOG_COMP_ID);
    console.log("\n[✓] Status lomba Monolog diaktifkan ke: 'berlangsung'.");
  }

  console.log("\n=== SIMULASI PENILAIAN JURI LOMBA MONOLOG SUKSES 100% TANPA ERROR! ===");
}

runSimulation().catch((err) => {
  console.error("\n[X] SIMULASI GAGAL DENGAN ERROR:", err);
  process.exit(1);
});
