import {
  getCompetitions,
  getSchedules,
  getAnnouncements,
  getChallengeLeaderboard,
} from "@/lib/supabase/queries";
import { HomeClient } from "./home-client";

export const revalidate = 60;

export default async function HomePage() {
  const [competitions, schedules, announcements, leaderboard] = await Promise.all([
    getCompetitions(),
    getSchedules(),
    getAnnouncements(),
    getChallengeLeaderboard(),
  ]);

  return (
    <HomeClient
      competitions={competitions}
      schedules={schedules}
      announcements={announcements}
      leaderboard={leaderboard}
    />
  );
}
