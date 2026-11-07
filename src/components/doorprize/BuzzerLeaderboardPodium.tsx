"use client";

import * as React from "react";
import { Trophy, Medal, Crown, Timer, Zap, Sparkles } from "lucide-react";
import type { BuzzerLeaderboardEntry } from "@/app/actions/doorprize";

interface BuzzerLeaderboardPodiumProps {
  leaderboard: BuzzerLeaderboardEntry[];
  prizeName?: string;
  size?: "default" | "large";
  className?: string;
}

export function BuzzerLeaderboardPodium({
  leaderboard,
  prizeName = "Doorprize Utama",
  size = "default",
  className = "",
}: BuzzerLeaderboardPodiumProps) {
  const isLarge = size === "large";

  const first = leaderboard[0];
  const second = leaderboard[1];
  const third = leaderboard[2];
  const others = leaderboard.slice(3, 6);

  if (leaderboard.length === 0) {
    return (
      <div className={`p-8 rounded-3xl bg-white/5 border border-white/10 text-center space-y-3 ${className}`}>
        <Timer className="h-10 w-10 text-amber-400 mx-auto animate-pulse" />
        <h3 className="font-heading text-lg font-bold text-white">Belum Ada Refleks Tercatat</h3>
        <p className="text-xs text-white/50 max-w-md mx-auto">
          Begitu lampu berubah hijau, catatan milidetik peserta yang paling kilat akan langsung menduduki podium di sini secara real-time!
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col items-center space-y-6 ${className}`}>
      {/* PODIUM 3 BESAR (1st, 2nd, 3rd) */}
      <div className="w-full max-w-3xl grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4">
        {/* PODIUM 2 (PERAK / SILVER) */}
        <div className="flex flex-col items-center">
          {second ? (
            <div className="w-full p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-400/60 shadow-xl text-center space-y-2 relative">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-300 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center mx-auto shadow-md">
                2
              </div>
              <div className="space-y-0.5">
                <span className="font-heading font-black text-xs sm:text-base text-white truncate block">
                  {second.fullName}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {second.institution}
                </span>
              </div>
              <div className="px-2 py-1 rounded-full bg-slate-400/20 text-slate-200 font-mono font-bold text-xs">
                ⚡ {second.reactionTimeMs} ms
              </div>
            </div>
          ) : (
            <div className="w-full h-28 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-xs italic">
              Posisi 2
            </div>
          )}
          <div className="w-full h-14 sm:h-20 bg-slate-800/80 rounded-b-xl border-t border-slate-400/40 mt-1 flex items-center justify-center font-black text-slate-400 font-heading text-xl sm:text-2xl">
            2ND
          </div>
        </div>

        {/* PODIUM 1 (EMAS / GOLD CHAMPION) */}
        <div className="flex flex-col items-center -mt-6">
          {first ? (
            <div className="w-full p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-amber-500/30 via-slate-900 to-black border-4 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.5)] ring-4 ring-amber-300/30 text-center space-y-3 relative scale-105 z-20">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <Crown className="h-10 w-10 text-amber-400 animate-bounce drop-shadow-[0_0_15px_rgba(245,158,11,0.9)]" />
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-300 via-amber-400 to-amber-600 text-slate-950 font-black text-base sm:text-xl flex items-center justify-center mx-auto shadow-xl ring-2 ring-white">
                1
              </div>
              <div className="space-y-1">
                <span className="font-heading font-black text-sm sm:text-xl text-amber-300 truncate block">
                  {first.fullName}
                </span>
                <span className="text-xs text-amber-100/70 block truncate font-medium">
                  {first.institution} • No: {first.registrationNumber}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-amber-400/30 text-amber-300 font-mono font-black text-sm sm:text-base border border-amber-400/50 shadow-md">
                ⚡ {first.reactionTimeMs} ms
              </div>
            </div>
          ) : (
            <div className="w-full h-36 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-xs italic">
              Posisi 1
            </div>
          )}
          <div className="w-full h-20 sm:h-28 bg-amber-500/20 rounded-b-xl border-t-2 border-amber-400 mt-1 flex items-center justify-center font-black text-amber-400 font-heading text-2xl sm:text-4xl shadow-lg">
            1ST
          </div>
        </div>

        {/* PODIUM 3 (PERUNGGU / BRONZE) */}
        <div className="flex flex-col items-center">
          {third ? (
            <div className="w-full p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-amber-950/40 to-slate-900 border-2 border-amber-700/60 shadow-xl text-center space-y-2 relative">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-700 text-white font-black text-sm sm:text-base flex items-center justify-center mx-auto shadow-md">
                3
              </div>
              <div className="space-y-0.5">
                <span className="font-heading font-black text-xs sm:text-base text-white truncate block">
                  {third.fullName}
                </span>
                <span className="text-[10px] text-amber-200/60 block truncate">
                  {third.institution}
                </span>
              </div>
              <div className="px-2 py-1 rounded-full bg-amber-700/30 text-amber-300 font-mono font-bold text-xs">
                ⚡ {third.reactionTimeMs} ms
              </div>
            </div>
          ) : (
            <div className="w-full h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-xs italic">
              Posisi 3
            </div>
          )}
          <div className="w-full h-10 sm:h-16 bg-amber-950/60 rounded-b-xl border-t border-amber-700 mt-1 flex items-center justify-center font-black text-amber-600 font-heading text-lg sm:text-xl">
            3RD
          </div>
        </div>
      </div>

      {/* POSISI 4 & 5 (TOP SPEED RUNNERS-UP) */}
      {others.length > 0 && (
        <div className="w-full max-w-xl space-y-2 pt-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-white/60 block text-center font-bold">
            Peringkat Kecepatan Berikutnya:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {others.map((entry) => (
              <div
                key={entry.rank}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-white/10 font-bold flex items-center justify-center text-white/80 font-mono text-[11px]">
                    {entry.rank}
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-white truncate block">{entry.fullName}</span>
                    <span className="text-[10px] text-white/50 truncate block">{entry.institution}</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-amber-400 shrink-0 text-xs">
                  {entry.reactionTimeMs} ms
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

