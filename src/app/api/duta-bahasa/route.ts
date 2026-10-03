import { NextResponse } from "next/server";
import { getDutaBahasaStages, getDutaBahasaProgress } from "@/app/actions/duta-bahasa";

export async function GET() {
  try {
    const [stagesResult, progressResult] = await Promise.all([
      getDutaBahasaStages(),
      getDutaBahasaProgress(),
    ]);

    return NextResponse.json({
      success: true,
      stages: stagesResult.stages,
      participants: progressResult.participants,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat data Duta Bahasa.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
