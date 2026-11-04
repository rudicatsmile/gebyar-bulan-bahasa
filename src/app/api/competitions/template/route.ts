import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMPETITIONS } from "@/lib/dummy-data";
import {
  createRegistrationTemplateWorkbook,
  type CompetitionTemplateItem,
} from "@/lib/excel-registration";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: dbComps, error } = await supabase
      .from("competitions")
      .select("id, name, short_name, type, status, min_team_members, max_team_members")
      .neq("status", "dibatalkan")
      .order("sort_order", { ascending: true });

    let competitionsList: CompetitionTemplateItem[] = [];

    if (!error && dbComps && dbComps.length > 0) {
      competitionsList = dbComps.map((c) => ({
        id: c.id,
        name: c.name,
        shortName: c.short_name || c.name,
        type: c.type || "individu",
        minMembers: c.min_team_members || 1,
        maxMembers: c.max_team_members || 1,
        status: c.status,
      }));
    } else {
      competitionsList = COMPETITIONS.map((c) => ({
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        type: c.category,
        minMembers: c.minMembers,
        maxMembers: c.maxMembers,
        status: c.status,
      }));
    }

    const wb = createRegistrationTemplateWorkbook(competitionsList);
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="Template_Pendaftaran_Lomba_Gebyar_Bulan_Bahasa.xlsx"',
      },
    });
  } catch (err: unknown) {
    console.error("Gagal generate template Excel:", err);
    return NextResponse.json(
      { success: false, error: "Gagal membuat template Excel." },
      { status: 500 }
    );
  }
}

