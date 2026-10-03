import { NextResponse } from "next/server";
import { getMonitorData } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMonitorData();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat data monitor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
