import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

let envPath = existsSync(".env.production") ? ".env.production" : ".env.local";
const content = readFileSync(envPath, "utf-8");
const env = {};
for (const line of content.split("\n")) {
  const eq = line.indexOf("=");
  if (eq > 0) {
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    env[k] = v;
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getOrCreateAuthUser({ id, email, password, fullName, role, institution }) {
  const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  let existingUser = userList?.users?.find((u) => u.email.toLowerCase() === email.toLowerCase());

  let userId = existingUser?.id;

  if (!existingUser) {
    const createParams = {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    };
    if (id) createParams.id = id;

    const { data: created, error } = await supabase.auth.admin.createUser(createParams);
    if (error) {
      console.error(`  ❌ Gagal membuat auth user ${email}:`, error.message);
      return null;
    }
    userId = created.user.id;
    console.log(`  ✓ Auth user dibuat: ${email} (${userId})`);
  } else {
    console.log(`  ℹ Auth user sudah ada: ${email} (${userId})`);
    await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
  }

  // Upsert profile
  const { error: profErr } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      role,
      institution: institution || "Gebyar Bulan Bahasa",
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profErr) {
    console.error(`  ❌ Gagal upsert profil ${email}:`, profErr.message);
  } else {
    console.log(`  ✓ Profil tersimpan: ${fullName} [${role}]`);
  }

  return userId;
}

async function main() {
  console.log("\n=======================================================");
  console.log("🚀 SEEDING AKUN DARI Notes.txt & DEWAN JURI RESMI");
  console.log("=======================================================\n");

  // 1. Akun Admin & Panitia dari Notes.txt
  console.log("📌 1. Akun Manajemen (Super Admin & Seksi Acara)...");
  await getOrCreateAuthUser({
    email: "admin@admin.com",
    password: "Yalwash9.org",
    fullName: "Super Administrator",
    role: "super_admin",
    institution: "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA",
  });

  await getOrCreateAuthUser({
    email: "sie_acara@gmail.com",
    password: "rahasia123",
    fullName: "Seksi Acara & Operasional Lomba",
    role: "seksi_acara",
    institution: "Panitia Pelaksana Gebyar Bulan Bahasa",
  });

  // 2. Akun Juri Rudi dari Notes.txt
  console.log("\n📌 2. Akun Dewan Juri Rudi Catsmile...");
  const rudiJudgeId = await getOrCreateAuthUser({
    email: "rudi.catsmile2@gmail.com",
    password: "rahasia123",
    fullName: "Rudi Catsmile, M.Pd.",
    role: "juri",
    institution: "Dewan Juri Ahli Bersertifikasi",
  });

  // 3. Akun Juri Resmi Sistem
  console.log("\n📌 3. Akun Dewan Juri Resmi Sistem...");
  const JUDGES = [
    {
      id: "b1c34a48-78a8-4ae6-8b10-4311725e2d4e",
      email: "mulyana@gebyarbulanbahasa.id",
      password: "rahasia123",
      fullName: "H.MULYANA,MM",
      role: "juri",
      institution: "Dewan Juri Sastra & Puisi",
    },
    {
      id: "44695fec-faa9-4963-8feb-2119b0f42669",
      email: "anisa.rizky@gebyarbulanbahasa.id",
      password: "rahasia123",
      fullName: "Anisa Rizky, S.Pd.",
      role: "juri",
      institution: "Dewan Juri MC & Protokoler",
    },
    {
      id: "abfc8e99-ffdd-4d9f-9ba4-ea18fd42432d",
      email: "restu.nurcahyani@gebyarbulanbahasa.id",
      password: "rahasia123",
      fullName: "Restu Nurcahyani, S.Pd.",
      role: "juri",
      institution: "Monolog",
    },
    {
      id: "b02c3cb0-00cc-4663-9530-fd0f3f2407f1",
      email: "ngatmin@gebyarbulanbahasa.id",
      password: "rahasia123",
      fullName: "Drs. Ngatmin, M.Hum.",
      role: "juri",
      institution: "Dewan Juri Teater & Sastra Peran",
    },
    {
      id: "e018d884-79f4-42bb-9ef9-4f3b467ac4ae",
      email: "rudi.kurniawan@gebyarbulanbahasa.id",
      password: "rahasia123",
      fullName: "Rudi Kurniawan, S.Sn.",
      role: "juri",
      institution: "Dewan Juri Seni Rupa & Desain",
    },
    {
      id: "fb5129b6-1f50-45f6-b491-08bbd5727788",
      email: "endang.ekowati@gebyarbulanbahasa.id",
      password: "rahasia123",
      fullName: "Dra. Hj. Endang Ekowati",
      role: "juri",
      institution: "Dewan Juri Vokal & Paduan Suara",
    },
    {
      id: "cc5667d2-d1ab-46e6-ab2f-7ea4e5fa6d2c",
      email: "sofyan.jamaludin@gebyarbulanbahasa.id",
      password: "rahasia123",
      fullName: "Sofyan Jamaludin, M.Pd.",
      role: "juri",
      institution: "Dewan Juri Pidato & Duta Bahasa",
    },
    {
      id: "b372e72e-0676-4c2f-9316-2e0fa171dd01",
      email: "roihan.kamil@gebyarbulanbahasa.id",
      password: "rahasia123",
      fullName: "Roihan Al Kamil, S.S.",
      role: "juri",
      institution: "Dewan Juri Pidato & Duta Bahasa",
    },
  ];

  for (const j of JUDGES) {
    await getOrCreateAuthUser(j);
  }

  // 4. Penugasan Juri ke Cabang Lomba
  console.log("\n📌 4. Menugaskan Dewan Juri ke Cabang Lomba...");
  const { data: comps } = await supabase.from("competitions").select("id, slug, name");
  const compBySlug = new Map((comps || []).map((c) => [c.slug, c]));

  const assignments = [
    // Rudi Catsmile ditugaskan ke Monolog, Duta Bahasa, dan Puisi
    ...(rudiJudgeId ? [
      { slug: "monolog", judgeId: rudiJudgeId, isChief: true },
      { slug: "pidato", judgeId: rudiJudgeId, isChief: true },
      { slug: "membaca-puisi", judgeId: rudiJudgeId, isChief: false },
    ] : []),
    { slug: "membaca-puisi", judgeId: "b1c34a48-78a8-4ae6-8b10-4311725e2d4e", isChief: true },
    { slug: "mc-formal", judgeId: "44695fec-faa9-4963-8feb-2119b0f42669", isChief: true },
    { slug: "monolog", judgeId: "abfc8e99-ffdd-4d9f-9ba4-ea18fd42432d", isChief: false },
    { slug: "monolog", judgeId: "b02c3cb0-00cc-4663-9530-fd0f3f2407f1", isChief: false },
    { slug: "melukis-tas-kanvas", judgeId: "e018d884-79f4-42bb-9ef9-4f3b467ac4ae", isChief: true },
    { slug: "vokal-grup", judgeId: "fb5129b6-1f50-45f6-b491-08bbd5727788", isChief: true },
    { slug: "pidato", judgeId: "cc5667d2-d1ab-46e6-ab2f-7ea4e5fa6d2c", isChief: false },
    { slug: "pidato", judgeId: "b372e72e-0676-4c2f-9316-2e0fa171dd01", isChief: false },
    { slug: "palang-pintu", judgeId: "b1c34a48-78a8-4ae6-8b10-4311725e2d4e", isChief: false },
  ];

  for (const a of assignments) {
    const comp = compBySlug.get(a.slug);
    if (!comp) continue;
    await supabase.from("competition_judges").upsert(
      {
        competition_id: comp.id,
        judge_id: a.judgeId,
        is_chief_judge: a.isChief,
        status: "aktif",
      },
      { onConflict: "competition_id,judge_id" }
    );
    console.log(`  ✓ Ditugaskan: Juri [${a.judgeId.substring(0, 8)}] -> Lomba ${comp.name} ${a.isChief ? '(Ketua)' : ''}`);
  }

  // 5. Akun Peserta Rudi1 s.d. Rudi7 dari Notes.txt
  console.log("\n📌 5. Akun & Registrasi Peserta (rudi1 s.d. rudi7)...");
  const PARTICIPANTS_NOTES = [
    {
      email: "rudi1@gmail.com",
      password: "rahasia123",
      fullName: "Rudi Pratama (Duta Bahasa)",
      compSlug: "pidato",
      teamName: "Duta Bahasa SMK Dinamika 1",
      school: "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA",
      regNo: "GBB-PES-2001",
      phone: "081234567811",
      points: 120,
    },
    {
      email: "rudi2@gmail.com",
      password: "rahasia123",
      fullName: "Rudi Setiawan (Duta Bahasa)",
      compSlug: "pidato",
      teamName: "Duta Bahasa SMK Dinamika 2",
      school: "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA",
      regNo: "GBB-PES-2002",
      phone: "081234567812",
      points: 110,
    },
    {
      email: "rudi3@gmail.com",
      password: "rahasia123",
      fullName: "Rudi Hermawan (Puisi)",
      compSlug: "membaca-puisi",
      teamName: null,
      school: "SMAN 8 Jakarta",
      regNo: "GBB-PES-2003",
      phone: "081234567813",
      points: 90,
    },
    {
      email: "rudi4@gmail.com",
      password: "rahasia123",
      fullName: "Rudi Cahyadi (Puisi)",
      compSlug: "membaca-puisi",
      teamName: null,
      school: "SMKN 3 Jakarta",
      regNo: "GBB-PES-2004",
      phone: "081234567814",
      points: 85,
    },
    {
      email: "rudi5@gmail.com",
      password: "rahasia123",
      fullName: "Rudi Firmansyah (Golden Stage Theatre)",
      compSlug: "film-pendek",
      teamName: "Golden Stage Theatre",
      school: "SMA Kristen 1 BPK Penabur",
      regNo: "GBB-PES-2005",
      phone: "081234567815",
      points: 130,
    },
    {
      email: "rudi6@gmail.com",
      password: "rahasia123",
      fullName: "Rudi Kurnia (Sanggar Si Pitung)",
      compSlug: "film-pendek",
      teamName: "Sanggar Si Pitung",
      school: "Sanggar Seni Si Pitung Rawa Belong",
      regNo: "GBB-PES-2006",
      phone: "081234567816",
      points: 140,
    },
    {
      email: "rudi7@gmail.com",
      password: "rahasia123",
      fullName: "Rudi Oktavianus (Peserta Umum)",
      compSlug: null, // belum daftar lomba
      teamName: null,
      school: "SMA Taruna Nusantara",
      regNo: "GBB-PES-2007",
      phone: "081234567817",
      points: 60,
    },
  ];

  for (let idx = 0; idx < PARTICIPANTS_NOTES.length; idx++) {
    const p = PARTICIPANTS_NOTES[idx];
    const userId = await getOrCreateAuthUser({
      email: p.email,
      password: p.password,
      fullName: p.fullName,
      role: "peserta",
      institution: p.school,
    });

    if (!userId) continue;

    // Upsert participant
    let participantId;
    const { data: existingPart } = await supabase
      .from("participants")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingPart) {
      participantId = existingPart.id;
      await supabase.from("participants").update({
        registration_number: p.regNo,
        full_name: p.fullName,
        email: p.email,
        phone: p.phone,
        institution: p.school,
        status: "terverifikasi",
        total_points: p.points,
        updated_at: new Date().toISOString(),
      }).eq("id", participantId);
    } else {
      const { data: newPart, error: partErr } = await supabase
        .from("participants")
        .insert({
          user_id: userId,
          registration_number: p.regNo,
          full_name: p.fullName,
          email: p.email,
          phone: p.phone,
          institution: p.school,
          status: "terverifikasi",
          total_points: p.points,
        })
        .select("id")
        .single();

      if (partErr) {
        console.error(`  ❌ Gagal insert participant ${p.email}:`, partErr.message);
        continue;
      }
      participantId = newPart.id;
    }

    // Registrasi ke lomba jika compSlug ada
    if (p.compSlug) {
      const comp = compBySlug.get(p.compSlug);
      if (comp) {
        // Cek existing registration
        const { data: existingReg } = await supabase
          .from("registrations")
          .select("id")
          .eq("participant_id", participantId)
          .eq("competition_id", comp.id)
          .maybeSingle();

        if (!existingReg) {
          const { data: newReg, error: regErr } = await supabase.from("registrations").insert({
            participant_id: participantId,
            competition_id: comp.id,
            team_name: p.teamName,
            performance_order: idx + 1,
            is_confirmed: true,
          }).select("id").single();

          if (regErr) {
            console.error(`  ❌ Gagal registrasi lomba untuk ${p.email}:`, regErr.message);
          } else {
            console.log(`  ✓ Terdaftar lomba "${comp.name}" ${p.teamName ? `[Tim: ${p.teamName}]` : ''}`);
            if (p.teamName && newReg) {
              await supabase.from("registration_members").insert({
                registration_id: newReg.id,
                name: p.fullName,
                role: "Ketua",
                phone: p.phone,
                is_leader: true,
              });
            }
          }
        } else {
          console.log(`  ℹ Sudah terdaftar di lomba "${comp.name}"`);
        }
      }
    }
  }

  // 6. Master Institutions di event_settings
  console.log("\n📌 6. Sinkronisasi event_settings.master_institutions...");
  const { data: instList } = await supabase
    .from("institutions")
    .select("id, name, category, is_active, sort_order")
    .order("sort_order", { ascending: true });

  if (instList && instList.length > 0) {
    const formattedInst = instList.map((i, index) => ({
      id: i.id || `inst-${index + 1}`,
      name: i.name,
      category: i.category,
      isActive: i.is_active,
      sortOrder: i.sort_order ?? index + 1,
    }));
    await supabase.from("event_settings").upsert(
      {
        key: "master_institutions",
        value: formattedInst,
        description: "Daftar master sekolah dan instansi resmi yang terdaftar di sistem",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
    console.log(`  ✓ ${instList.length} institusi disinkronkan ke event_settings.master_institutions`);
  }

  console.log("\n=======================================================");
  console.log("🎉 SEEDING AKUN & PENUGASAN BERHASIL LENGKAP!");
  console.log("=======================================================\n");
}

main().catch(console.error);

