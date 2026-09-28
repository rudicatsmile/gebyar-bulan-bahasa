export const DUMMY_TO_COMP_ID: Record<string, string> = {
  "comp-1": "a0000000-0000-0000-0000-000000000001",
  "comp-2": "a0000000-0000-0000-0000-000000000002",
  "comp-3": "a0000000-0000-0000-0000-000000000003",
  "comp-4": "a0000000-0000-0000-0000-000000000004",
  "comp-5": "a0000000-0000-0000-0000-000000000005",
  "comp-6": "a0000000-0000-0000-0000-000000000006",
  "comp-7": "a0000000-0000-0000-0000-000000000007",
  "comp-8": "a0000000-0000-0000-0000-000000000008",
};

export const DUMMY_TO_JUDGE_ID: Record<string, string> = {
  "judge-1": "b1c34a48-78a8-4ae6-8b10-4311725e2d4e", // Dr. Siti Nurhaliza
  "judge-2": "cc5667d2-d1ab-46e6-ab2f-7ea4e5fa6d2c", // Bimo Aryanto
  "judge-3": "64904556-9000-4435-a95a-3f4b37f1e59f", // Rina Kartika
  "judge-4": "e018d884-79f4-42bb-9ef9-4f3b467ac4ae", // Yudi Permana
  "judge-5": "b02c3cb0-00cc-4663-9530-fd0f3f2407f1", // Drs. Bambang Pamungkas
  "judge-6": "b372e72e-0676-4c2f-9316-2e0fa171dd01", // Bang Jali Mansur
  "judge-7": "fb5129b6-1f50-45f6-b491-08bbd5727788", // Dewi Anggraini
};

export interface MatrixAssignmentItem {
  judgeId: string;
  competitionId: string;
  isChiefJudge: boolean;
}
