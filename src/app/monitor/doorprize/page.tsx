import { Metadata } from "next";
import {
  getDoorprizePrizes,
  getDoorprizeHistory,
  getDoorprizeEligibleParticipants,
} from "@/app/actions/doorprize";
import { MonitorDoorprizeClient } from "./monitor-doorprize-client";

export const metadata: Metadata = {
  title: "Layar Panggung Undian Doorprize | Gebyar Bulan Bahasa",
  description: "Tampilan layar monitor dan proyektor panggung undian doorprize Gebyar Bulan Bahasa",
};

export const dynamic = "force-dynamic";

export default async function MonitorDoorprizePage() {
  const [prizesRes, historyRes, poolRes] = await Promise.all([
    getDoorprizePrizes(),
    getDoorprizeHistory(),
    getDoorprizeEligibleParticipants({
      verificationStatus: "all",
      excludePreviousWinners: false,
      minPoints: 0,
      participantType: "all",
    }),
  ]);

  const initialPrizes = prizesRes.success ? prizesRes.prizes : [];
  const initialHistory = historyRes.success ? historyRes.winners : [];
  const initialParticipants = poolRes.success ? poolRes.participants : [];

  return (
    <MonitorDoorprizeClient
      initialPrizes={initialPrizes}
      initialHistory={initialHistory}
      initialParticipants={initialParticipants}
    />
  );
}
