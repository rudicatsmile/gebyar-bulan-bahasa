import {
  getCompetitions,
  getSchedules,
  getAnnouncements,
  getChallengeLeaderboard,
} from "@/lib/supabase/queries";
import { getEventSettings } from "@/app/actions/settings";
import { HomeClient } from "./home-client";

export const revalidate = 60;

export default async function HomePage() {
  const [competitions, schedules, announcements, leaderboard, settingsRes] = await Promise.all([
    getCompetitions(),
    getSchedules(),
    getAnnouncements(),
    getChallengeLeaderboard(),
    getEventSettings(),
  ]);

  const eventName =
    settingsRes.success && settingsRes.settings?.eventName
      ? settingsRes.settings.eventName
      : "Gebyar Bulan Bahasa dan Kebudayaan";

  const eventTheme =
    settingsRes.success && settingsRes.settings?.eventTheme
      ? settingsRes.settings.eventTheme
      : "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.";

  const eventDate =
    settingsRes.success && settingsRes.settings?.eventDate
      ? settingsRes.settings.eventDate
      : "11 November 2026";

  const eventYear =
    settingsRes.success && settingsRes.settings?.eventYear
      ? String(settingsRes.settings.eventYear)
      : "2026";

  const heroImageUrl =
    settingsRes.success && settingsRes.settings?.heroImageUrl
      ? settingsRes.settings.heroImageUrl
      : "";

  return (
    <HomeClient
      competitions={competitions}
      schedules={schedules}
      announcements={announcements}
      leaderboard={leaderboard}
      eventName={eventName}
      eventTheme={eventTheme}
      eventDate={eventDate}
      eventYear={eventYear}
      heroImageUrl={heroImageUrl}
    />
  );
}
