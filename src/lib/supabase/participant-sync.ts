import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sinkronisasi akun login (profiles) -> data peserta lomba (participants).
 *
 * Latar belakang: dua tabel ini terpisah.
 * - `profiles`  : akun login untuk SEMUA peran (super_admin/seksi_acara/juri/media_center/peserta),
 *                  diisi otomatis oleh trigger `handle_new_user()` saat auth user dibuat.
 * - `participants` : berkas registrasi peserta lomba, dibaca oleh `/dashboard/peserta`.
 *                  HANYA dibuat lewat alur registrasi publik (`registerParticipant`).
 *
 * Akibatnya akun berperan `peserta` yang dibuat admin dari /dashboard/pengguna tidak
 * pernah muncul di /dashboard/peserta. Helper di bawah menutup celah tersebut secara
 * idempoten (aman dipanggil berulang kali).
 */

type SupabaseClient = ReturnType<typeof createAdminClient>;

export interface EnsureParticipantResult {
  created: boolean;
  linked: boolean;
  participantId?: string;
  reason?: string;
}

const REG_PREFIX = "GBB-PES";

/** Ambil nomor registrasi acak yang belum dipakai. */
async function generateUniqueRegistrationNumber(supabase: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = `${REG_PREFIX}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: existing } = await supabase
      .from("participants")
      .select("id")
      .eq("registration_number", candidate)
      .maybeSingle();

    if (!existing) return candidate;
  }
  // Cadangan jika kebetulan selalu bertabrakan: pakai timestamp.
  return `${REG_PREFIX}-${Date.now().toString().slice(-7)}`;
}

/**
 * Pastikan satu profil berperan peserta punya baris di tabel `participants`.
 * - Sudah ada by user_id  -> skip.
 * - Ada baris by email tanpa user_id -> ditautkan (tombol "klaim" akun).
 * - Belum ada sama sekali -> dibuat baru dengan status menunggu_verifikasi.
 */
export async function ensureParticipantForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<EnsureParticipantResult> {
  if (!userId) return { created: false, linked: false, reason: "no-user-id" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, institution, phone, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) return { created: false, linked: false, reason: profileError.message };
  if (!profile) return { created: false, linked: false, reason: "profile-not-found" };

  // Aturan: HANYA akun berperan peserta yang boleh menjadi data peserta.
  if (profile.role !== "peserta") {
    return { created: false, linked: false, reason: "role-not-peserta" };
  }

  const { data: byUserId } = await supabase
    .from("participants")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (byUserId) return { created: false, linked: false, participantId: byUserId.id, reason: "already-exists" };

  // Tautkan berkas registrasi yang sudah ada (mis. daftar manual via /daftar) ke akun ini.
  if (profile.email) {
    const { data: byEmail } = await supabase
      .from("participants")
      .select("id, user_id")
      .eq("email", profile.email)
      .maybeSingle();

    if (byEmail && !byEmail.user_id) {
      const { error: linkError } = await supabase
        .from("participants")
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq("id", byEmail.id);

      if (!linkError) {
        return { created: false, linked: true, participantId: byEmail.id };
      }
    }
  }

  const registrationNumber = await generateUniqueRegistrationNumber(supabase);

  const { data: inserted, error: insertError } = await supabase
    .from("participants")
    .insert({
      user_id: userId,
      registration_number: registrationNumber,
      full_name: profile.full_name || "Peserta Lomba",
      email: profile.email || null,
      phone: profile.phone || null,
      institution: profile.institution || null,
      status: "menunggu_verifikasi",
      total_points: 0,
    })
    .select("id")
    .single();

  if (insertError) return { created: false, linked: false, reason: insertError.message };

  return { created: true, linked: false, participantId: inserted?.id };
}

/**
 * Backfill seluruh akun berperan peserta yang belum punya berkas registrasi.
 * Idempoten: baris yang sudah ada dilewati.
 */
export async function backfillParticipantsForPeserta(
  supabase: SupabaseClient = createAdminClient()
): Promise<{ total: number; created: number; linked: number; skipped: number; failed: number }> {
  const { data: pesertaProfiles, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "peserta");

  if (error) throw error;

  const summary = { total: (pesertaProfiles || []).length, created: 0, linked: 0, skipped: 0, failed: 0 };

  for (const profile of pesertaProfiles || []) {
    const result = await ensureParticipantForUser(supabase, profile.id);
    if (result.created) summary.created++;
    else if (result.linked) summary.linked++;
    else if (result.reason === "already-exists") summary.skipped++;
    else summary.failed++;
  }

  return summary;
}
