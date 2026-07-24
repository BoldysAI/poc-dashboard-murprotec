import type { ReportingBundle, TresorerieData } from "@/types/dashboard";
import { ParseError } from "./errors";
import { parseReporting } from "./parse-reporting";
import { parseTresorerie } from "./parse-tresorerie";

/**
 * Entrées fichier navigateur → parsers métier (mémoire uniquement, pas d’upload serveur).
 */

export async function parseTresorerieFile(file: File): Promise<TresorerieData> {
  const name = file.name || "fichier.xls";
  if (!/\.xls$/i.test(name) || /\.xlsx$/i.test(name)) {
    throw new ParseError(
      "Format invalide : le dashboard Trésorerie attend un fichier .xls.",
    );
  }
  const buffer = await file.arrayBuffer();
  return parseTresorerie(buffer, name);
}

export async function parseReportingFile(file: File): Promise<ReportingBundle> {
  const name = file.name || "fichier.xlsx";
  if (!/\.xlsx$/i.test(name)) {
    throw new ParseError(
      "Format invalide : le dashboard Reporting attend un fichier .xlsx.",
    );
  }
  const buffer = await file.arrayBuffer();
  return parseReporting(buffer, name);
}
