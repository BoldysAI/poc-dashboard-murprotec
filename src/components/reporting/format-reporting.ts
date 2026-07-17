/** Formatage & deltas affichage reporting — pas de recalcul métier Excel. */

export type TrendTone = "success" | "danger" | "neutral";

export function formatEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** EUR avec signe explicite (+ / −) pour les variations. */
export function formatEurSigned(n: number): string {
  const abs = formatEur(Math.abs(n));
  if (n > 0) return `+${abs}`;
  if (n < 0) return `−${abs}`;
  return abs;
}

export function formatPct(ratio: number, digits = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: digits,
  }).format(ratio);
}

/** Nombre de mois (affichage, ex. cahier / impayés). */
export function formatMois(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

/** % signé pour deltas relatifs. */
export function formatPctSigned(ratio: number, digits = 1): string {
  const body = formatPct(Math.abs(ratio), digits);
  if (ratio > 0) return `+${body}`;
  if (ratio < 0) return `−${body}`;
  return body;
}

export function deltaAbsolu(n: number, n1: number): number {
  return n - n1;
}

/** (n − n1) / |n1| ; `null` si n1 = 0. */
export function deltaRelatif(n: number, n1: number): number | null {
  if (n1 === 0) return null;
  return (n - n1) / Math.abs(n1);
}

/**
 * Amélioration = delta > 0 → success ; dégradation = delta < 0 → danger.
 * Pas d’inversion (valable aussi si montants négatifs).
 */
export function trendTone(delta: number): TrendTone {
  if (delta > 0) return "success";
  if (delta < 0) return "danger";
  return "neutral";
}

export function toneClass(tone: TrendTone): string {
  if (tone === "success") return "text-success";
  if (tone === "danger") return "text-danger";
  return "text-primary/60";
}
