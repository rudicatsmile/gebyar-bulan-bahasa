import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("id-ID").format(num);
}

export function formatScore(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(new Date(dateString));
}

/**
 * Parsing string tanggal/waktu dengan asumsi zona waktu Asia/Jakarta (WIB / UTC+7).
 */
export function parseDateInWib(rawDate: string): Date {
  const clean = rawDate.trim();
  if (!clean) return new Date(NaN);

  if (clean.includes("+") || clean.endsWith("Z")) {
    return new Date(clean);
  }

  // Format Tanggal Saja: YYYY-MM-DD -> 00:00:00 WIB
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return new Date(`${clean}T00:00:00+07:00`);
  }

  // Format Datetime Local: YYYY-MM-DDTHH:mm -> HH:mm:00 WIB
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(clean)) {
    return new Date(`${clean}:00+07:00`);
  }

  // Format Datetime Local lengkap: YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(clean)) {
    return new Date(`${clean}+07:00`);
  }

  return new Date(clean);
}

