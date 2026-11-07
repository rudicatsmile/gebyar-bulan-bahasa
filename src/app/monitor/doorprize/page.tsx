import { Metadata } from "next";
import { getDoorprizePrizes, getDoorprizeHistory } from "@/app/actions/doorprize";
import { MonitorDoorprizeClient } from "./monitor-doorprize-client";

export const metadata: Metadata = {
  title: "Layar Panggung Undian Doorprize | Gebyar Bulan Bahasa",
  description: "Tampilan layar monitor dan proyektor panggung undian doorprize Gebyar Bulan Bahasa",
};

export const dynamic = "force-dynamic";

export default async function MonitorDoorprizePage() {
  const [prizesRes, historyRes] = await Promise.all([
    getDoorprizePrizes(),
    getDoorprizeHistory(),
  ]);

  const initialPrizes = prizesRes.success ? prizesRes.prizes : [];
  const initialHistory = historyRes.success ? historyRes.winners : [];

  return (
    <MonitorDoorprizeClient
      initialPrizes={initialPrizes}
      initialHistory={initialHistory}
    />
  );
}
