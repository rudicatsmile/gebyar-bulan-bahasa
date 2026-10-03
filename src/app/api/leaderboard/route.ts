import { NextResponse } from "next/server";
import { getChallengeLeaderboard } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const leaderboard = await getChallengeLeaderboard();
    return NextResponse.json({ success: true, leaderboard });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil leaderboard challenge";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
