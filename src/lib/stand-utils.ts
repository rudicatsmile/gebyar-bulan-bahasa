/**
 * Helper utilities untuk kode & token stand challenge (Client & Server safe)
 */

export function getStandCheckoutCode(standCode: string): string {
  const clean = (standCode || "").trim().toUpperCase();
  return clean.startsWith("IN-") ? clean : `IN-${clean}`;
}

export function getStandCheckoutToken(standId: string, qrToken?: string): string {
  return `CHECKOUT-${qrToken || standId}`;
}
