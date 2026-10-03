import { NextResponse } from "next/server";
import { getSchedules } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schedules = await getSchedules();
    return NextResponse.json({ success: true, schedules });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil jadwal";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
