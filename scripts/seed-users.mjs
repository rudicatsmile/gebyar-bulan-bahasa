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

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DEFAULT_PASSWORD = "rahasia123";

const ACCOUNTS = [
  {
    email: "admin@gebyarbulanbahasa.id",
    fullName: "Super Administrator",
    role: "super_admin",
    institution: "Panitia Pusat Gebyar Bulan Bahasa",
  },
  {
    email: "acara@gebyarbulanbahasa.id",
    fullName: "Seksi Acara & Operasional Lomba",
    role: "seksi_acara",
    institution: "Panitia Pelaksana",
  },
  {
    email: "juri.siti@gebyarbulanbahasa.id",
    fullName: "Dr. Siti Nurhaliza, M.Pd.",
    role: "juri",
    institution: "Universitas Negeri Jakarta - Dewan Juri Puisi",
  },
  {
    email: "juri.bambang@gebyarbulanbahasa.id",
    fullName: "Drs. Bambang Pamungkas, M.Sn.",
    role: "juri",
    institution: "Institut Seni Indonesia - Dewan Juri Monolog",
  },
  {
    email: "media@gebyarbulanbahasa.id",
    fullName: "Tim Media Center & Monitor",
    role: "media_center",
    institution: "Divisi Publikasi & Dokumentasi",
  },
  {
    email: "ahmad.fauzan@sman1bdg.sch.id",
    fullName: "Ahmad Fauzan Ramadhan",
    role: "peserta",
    institution: "SMAN 1 Bandung",
  },
];

async function seedUsers() {
  console.log("Seeding official users to Supabase Auth & Profiles...");

  for (const acc of ACCOUNTS) {
    // 1. Check if user already exists
    const { data: userList } = await supabase.auth.admin.listUsers();
    let existingUser = userList?.users?.find((u) => u.email === acc.email);

    let userId = existingUser?.id;

    if (!existingUser) {
      console.log(`Creating auth user: ${acc.email}...`);
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: acc.fullName,
          role: acc.role,
        },
      });

      if (error) {
        console.error(`Failed to create ${acc.email}:`, error.message);
        continue;
      }
      userId = created.user.id;
      console.log(`  ✓ Auth user created: ${userId}`);
    } else {
      console.log(`  ℹ Auth user already exists: ${acc.email} (${userId})`);
      // Update password to ensure it's rahasia123
      await supabase.auth.admin.updateUserById(userId, {
        password: DEFAULT_PASSWORD,
        email_confirm: true,
      });
    }

    // 2. Upsert Profile
    const { error: profErr } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email: acc.email,
        full_name: acc.fullName,
        role: acc.role,
        institution: acc.institution,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profErr) {
      console.error(`  ❌ Failed to upsert profile for ${acc.email}:`, profErr.message);
    } else {
      console.log(`  ✓ Profile saved for ${acc.email} as [${acc.role}]`);
    }

    // 3. If peserta, link to participants table
    if (acc.role === "peserta") {
      const { data: existingPart } = await supabase
        .from("participants")
        .select("id")
        .eq("email", acc.email)
        .maybeSingle();

      if (existingPart) {
        await supabase
          .from("participants")
          .update({ user_id: userId })
          .eq("id", existingPart.id);
        console.log(`  ✓ Linked participant record to user_id ${userId}`);
      } else {
        await supabase.from("participants").insert({
          user_id: userId,
          registration_number: "GBB-PES-1001",
          full_name: acc.fullName,
          email: acc.email,
          institution: acc.institution,
          phone: "081234567890",
          status: "terverifikasi",
          total_points: 140,
        });
        console.log(`  ✓ Created new participant record linked to user_id ${userId}`);
      }
    }
  }

  console.log("\n✅ SEMUA AKUN BERHASIL DIBUAT DAN DIHUBUNGKAN KE SUPABASE AUTH!");
}

seedUsers();
