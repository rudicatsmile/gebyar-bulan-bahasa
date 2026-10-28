import { getJudgeDashboardData } from "../src/app/actions/competitions";

async function main() {
  const res = await getJudgeDashboardData();
  console.log("Judge Dashboard Data result:", JSON.stringify(res, null, 2));
}

main().catch(console.error);
