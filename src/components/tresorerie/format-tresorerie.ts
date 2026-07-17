/** Formatage affichage trésorerie — pas de recalcul métier Excel. */

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

/** Ratio fichier (ex. 0.49) → pourcentage fr-FR. */
export function formatPct(ratio: number, digits = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: digits,
  }).format(ratio);
}

/**
 * Amélioration = delta > 0 → success ; dégradation = delta < 0 → danger.
 * Pas d’inversion.
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

/**
 * Extrait une date JJ/MM/AAAA depuis un nom de fichier type
 * `TRESOR 30 06 2026 Boldys.xls`. Retourne null si non parsable.
 */
export function parsePeriodeFromFilename(fileName: string): string | null {
  const match = fileName.match(/(\d{1,2})\s+(\d{1,2})\s+(\d{4})/);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];
  return `${day}/${month}/${year}`;
}
