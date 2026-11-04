import { parseDateInWib } from "./utils";

export type ChallengePeriodStatus = "belum_dimulai" | "sedang_berlangsung" | "sudah_berakhir";

export interface ChallengePeriodInfo {
  status: ChallengePeriodStatus;
  isPlayable: boolean;
  label: string;
  badgeVariant: "info" | "success" | "danger" | "default";
  detailText: string;
}

/**
 * Format ISO datetime string menjadi format ramah pengguna Indonesia dengan zona waktu WIB.
 */
export function formatChallengeDateTime(isoString?: string | null): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return (
      d.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
  } catch {
    return isoString;
  }
}

/**
 * Konversi ISO timestamp string ke string format input `datetime-local` (YYYY-MM-DDTHH:mm) zona WIB.
 */
export function toDatetimeLocalValue(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    // Offset WIB = UTC+7 (420 menit)
    const tzOffsetMs = 7 * 60 * 60 * 1000;
    const wibDate = new Date(d.getTime() + tzOffsetMs);
    return wibDate.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

/**
 * Konversi nilai input `datetime-local` (YYYY-MM-DDTHH:mm) asumsi WIB ke ISO string.
 */
export function fromDatetimeLocalValue(localValue?: string | null): string | null {
  if (!localValue || !localValue.trim()) return null;
  const d = parseDateInWib(localValue);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Evaluasi status periode aktif suatu challenge/misi/game berdasarkan start_at dan end_at.
 */
export function getChallengePeriodInfo(
  startAt?: string | null,
  endAt?: string | null,
  isActive: boolean = true
): ChallengePeriodInfo {
  const now = new Date();

  // 1. Cek apakah belum tiba tanggal mulai
  if (startAt) {
    const startDate = new Date(startAt);
    if (!isNaN(startDate.getTime()) && now < startDate) {
      return {
        status: "belum_dimulai",
        isPlayable: false,
        label: "Belum Dibuka",
        badgeVariant: "info",
        detailText: `Dibuka ${formatChallengeDateTime(startAt)}`,
      };
    }
  }

  // 2. Cek apakah sudah melewati tanggal akhir
  if (endAt) {
    const endDate = new Date(endAt);
    if (!isNaN(endDate.getTime()) && now > endDate) {
      return {
        status: "sudah_berakhir",
        isPlayable: false,
        label: "Sudah Ditutup",
        badgeVariant: "danger",
        detailText: `Ditutup sejak ${formatChallengeDateTime(endAt)}`,
      };
    }
  }

  // 3. Cek flag status aktif umum
  if (!isActive) {
    return {
      status: "sudah_berakhir",
      isPlayable: false,
      label: "Nonaktif",
      badgeVariant: "default",
      detailText: "Misi dinonaktifkan oleh panitia",
    };
  }

  // 4. Masih dalam periode aktif
  return {
    status: "sedang_berlangsung",
    isPlayable: true,
    label: "Sedang Berlangsung",
    badgeVariant: "success",
    detailText: endAt
      ? `Tersedia s.d. ${formatChallengeDateTime(endAt)}`
      : "Terbuka & siap dikerjakan",
  };
}

/**
 * Validasi periode untuk backend Server Actions. Mengembalikan alasan error jika di luar periode.
 */
export function validateChallengePeriod(
  startAt?: string | null,
  endAt?: string | null,
  gameTitle: string = "Misi / Game"
): { valid: boolean; isValid: boolean; error?: string } {
  const info = getChallengePeriodInfo(startAt, endAt, true);
  if (!info.isPlayable) {
    if (info.status === "belum_dimulai") {
      return {
        valid: false,
        isValid: false,
        error: `${gameTitle} belum dibuka untuk peserta. ${info.detailText}.`,
      };
    }
    if (info.status === "sudah_berakhir") {
      return {
        valid: false,
        isValid: false,
        error: `${gameTitle} telah ditutup. ${info.detailText}.`,
      };
    }
  }
  return { valid: true, isValid: true };
}

