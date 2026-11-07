import { Metadata } from "next";
import { getBuzzerRoundState } from "@/app/actions/doorprize";
import { createClient } from "@/lib/supabase/server";
import { BuzzerClient } from "./buzzer-client";

export const metadata: Metadata = {
  title: "Arena Buzzer Kilat F1 Reflex | Gebyar Bulan Bahasa",
  description: "Ikuti perlombaan refleks tercepat buzzer digital doorprize Gebyar Bulan Bahasa secara langsung",
};

export const dynamic = "force-dynamic";

export default async function BuzzerPage() {
  const roundRes = await getBuzzerRoundState();
  let initialUser = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: participant } = await supabase
        .from("participants")
        .select("full_name, institution, registration_number, phone")
        .eq("user_id", user.id)
        .maybeSingle();

      if (participant) {
        initialUser = {
          fullName: participant.full_name,
          institution: participant.institution || "UMUM",
          registrationNumber: participant.registration_number,
          phone: participant.phone || undefined,
        };
      }
    }
  } catch {}

  return (
    <BuzzerClient
      initialRound={roundRes.round || null}
      initialUser={initialUser}
    />
  );
}

