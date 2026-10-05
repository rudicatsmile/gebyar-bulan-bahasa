/**
 * Backfill: buat berkas `participants` untuk akun login berperan `peserta`
 * yang belum punya data registrasi, sehingga mereka muncul di /dashboard/peserta.
 *
 * Implementasi kanonik (dipakai aplikasi saat membuat/mengubah akun):
 *   src/lib/supabase/participant-sync.ts
 *
 * Pemakaian:
 *   node scripts/backfill-participants.mjs          # jalankan
 *   node scripts/backfill-participants.mjs --dry    # lihat saja tanpa menulis
 *
 * Idempoten: akun yang sudah punya berkas peserta dilewati, aman dijalankan berulang.
 */
import { createClient } from "@supabase/supabase-js";

const URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lumrqtxmdcrjxjxzrqau.supabase.co";
const KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1bXJxdHhtZGNyanhqeHpycWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDQ2NTQwNywiZXhwIjoyMTA2MDQxNDA3fQ.idDvQgxaQzwMe4GSwOmqR-eymMrFq4cnMZmTY26WAZ0";

const DRY = process.argv.includes("--dry");
const supabase = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function uniqueRegNumber() {
  for (let i = 0; i < 25; i++) {
    const candidate = `GBB-PES-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data } = await supabase
      .from("participants")
      .select("id")
      .eq("registration_number", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `GBB-PES-${Date.now().toString().slice(-7)}`;
}

const { data: peserta, error } = await supabase
  .from("profiles")
  .select("id, full_name, email, institution, phone, role")
  .eq("role", "peserta")
  .order("created_at");

if (error) {
  console.error("Gagal membaca profiles:", error.message);
  process.exit(1);
}

console.log(`Akun berperan peserta di profiles: ${peserta.length}`);

let created = 0;
let linked = 0;
let skipped = 0;

for (const p of peserta) {
  const { data: byUserId } = await supabase
    .from("participants")
    .select("id, registration_number")
    .eq("user_id", p.id)
    .maybeSingle();

  if (byUserId) {
    skipped++;
    console.log(`  • skip  ${p.email} (sudah ada: ${byUserId.registration_number})`);
    continue;
  }

  // Tautkan berkas registrasi lama yang emailnya sama namun belum punya user_id.
  if (p.email) {
    const { data: byEmail } = await supabase
      .from("participants")
      .select("id, user_id, registration_number")
      .eq("email", p.email)
      .maybeSingle();

    if (byEmail && !byEmail.user_id) {
      if (!DRY) {
        await supabase
          .from("participants")
          .update({ user_id: p.id, updated_at: new Date().toISOString() })
          .eq("id", byEmail.id);
      }
      linked++;
      console.log(`  • link  ${p.email} -> ${byEmail.registration_number}`);
      continue;
    }
  }

  const registrationNumber = await uniqueRegNumber();
  if (DRY) {
    created++;
    console.log(`  • add*  ${p.email} (${registrationNumber}) [dry-run]`);
    continue;
  }

  const { error: insertError } = await supabase.from("participants").insert({
    user_id: p.id,
    registration_number: registrationNumber,
    full_name: p.full_name || "Peserta Lomba",
    email: p.email || null,
    phone: p.phone || null,
    institution: p.institution || null,
    status: "menunggu_verifikasi",
    total_points: 0,
  });

  if (insertError) {
    console.error(`  ! GAGAL ${p.email}: ${insertError.message}`);
  } else {
    created++;
    console.log(`  • add   ${p.email} (${registrationNumber})`);
  }
}

console.log(`\nRingkasan${DRY ? " (dry-run)" : ""}: dibuat=${created}, ditautkan=${linked}, sudah-ada=${skipped}`);
