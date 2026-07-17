/**
 * Segment safe pour un nom de fichier PDF proposé via `document.title`.
 */
export function sanitizePdfSegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Titre document pour l’enregistrement PDF reporting.
 * - Une agence → inclut le nom d’onglet (`agenceCible`)
 * - Tous les onglets → pas de nom d’onglet
 */
export function reportingPdfDocumentTitle(options: {
  mode: "one" | "all";
  /** Nom d’onglet Excel (ex. « WAL O ») — requis si mode === "one" */
  ongletLabel?: string;
}): string {
  if (options.mode === "all") {
    return "Reporting-Financier";
  }
  const onglet = sanitizePdfSegment(options.ongletLabel?.trim() || "agence");
  return `Reporting-${onglet}`;
}
