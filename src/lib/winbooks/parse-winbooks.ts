import * as XLSX from "xlsx";
import type { WinbooksLigne } from "@/types/rapprochement";
import { WinbooksParseError } from "./errors";

const HEADER_REF = "Réf client";
const HEADER_DEBIT = "Débit(debN)";
const HEADER_CREDIT = "Crédit(credN)";
const HEADER_DOCUMENT = "Document(docnr)";
const HEADER_DATE = "Date(date)";

/**
 * Lit l'export Winbooks « postes ouverts clients » (.xls / .xlsx).
 * Numéro de tiers = « Réf client ». Solde de la ligne = débit − crédit.
 */
export function parseWinbooks(input: ArrayBuffer | Uint8Array): WinbooksLigne[] {
  const workbook = readWorkbook(input);
  const located = findHeader(workbook);
  if (!located) {
    throw new WinbooksParseError(
      "En-têtes Winbooks introuvables (Réf client, Débit(debN), Crédit(credN)).",
    );
  }

  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(located.sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  const lignes: WinbooksLigne[] = [];
  for (let i = located.headerRow + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const ligne = readLigne(row, located.columns);
    if (ligne) lignes.push(ligne);
  }

  if (lignes.length === 0) {
    throw new WinbooksParseError("Aucune ligne de tiers trouvée dans le fichier Winbooks.");
  }
  return lignes;
}

export async function parseWinbooksFile(file: File): Promise<WinbooksLigne[]> {
  const buffer = await file.arrayBuffer();
  return parseWinbooks(buffer);
}

function readWorkbook(input: ArrayBuffer | Uint8Array): XLSX.WorkBook {
  try {
    const data = input instanceof Uint8Array ? input : new Uint8Array(input);
    const workbook = XLSX.read(data, { type: "array", cellFormula: false, cellDates: false });
    if (!workbook.SheetNames.length) {
      throw new WinbooksParseError("Le fichier Excel est illisible ou ne contient aucun onglet.");
    }
    return workbook;
  } catch (err) {
    if (err instanceof WinbooksParseError) throw err;
    throw new WinbooksParseError(
      "Le fichier Excel est illisible. Vérifiez qu'il s'agit d'un .xls ou .xlsx valide.",
    );
  }
}

type HeaderLocation = {
  sheet: XLSX.WorkSheet;
  headerRow: number;
  columns: {
    ref: number;
    debit: number;
    credit: number;
    document: number;
    date: number;
  };
};

function findHeader(workbook: XLSX.WorkBook): HeaderLocation | null {
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });
    for (let i = 0; i < rows.length; i++) {
      const columns = columnIndexes(rows[i] ?? []);
      if (columns) return { sheet, headerRow: i, columns };
    }
  }
  return null;
}

function columnIndexes(row: (string | number | null)[]): {
  ref: number;
  debit: number;
  credit: number;
  document: number;
  date: number;
} | null {
  const indexOf = (label: string) => row.findIndex((cell) => cellText(cell) === label);
  const ref = indexOf(HEADER_REF);
  const debit = indexOf(HEADER_DEBIT);
  const credit = indexOf(HEADER_CREDIT);
  if (ref < 0 || debit < 0 || credit < 0) return null;
  return {
    ref,
    debit,
    credit,
    document: indexOf(HEADER_DOCUMENT),
    date: indexOf(HEADER_DATE),
  };
}

function readLigne(
  row: (string | number | null)[],
  columns: {
    ref: number;
    debit: number;
    credit: number;
    document: number;
    date: number;
  },
): WinbooksLigne | null {
  const numeroTiers = cellText(row[columns.ref]);
  const debit = readAmount(row[columns.debit], numeroTiers || "?", "débit");
  const credit = readAmount(row[columns.credit], numeroTiers || "?", "crédit");
  if (!numeroTiers && debit == null && credit == null) return null;
  if (!numeroTiers) {
    throw new WinbooksParseError("Ligne Winbooks sans numéro de tiers.");
  }
  if (debit == null || credit == null) {
    throw new WinbooksParseError(`Débit ou crédit manquant pour le tiers ${numeroTiers}.`);
  }
  return {
    numeroTiers,
    solde: roundCents(debit - credit),
    numeroDocument: columns.document < 0 ? null : cellText(row[columns.document]) || null,
    dateDocument: columns.date < 0 ? null : parseDateDocument(row[columns.date], numeroTiers),
  };
}

function parseDateDocument(value: string | number | null | undefined, ref: string): string | null {
  const text = cellText(value);
  if (!text) return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) {
    throw new WinbooksParseError(`Date illisible pour le tiers ${ref} : « ${text} ».`);
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new WinbooksParseError(`Date illisible pour le tiers ${ref} : « ${text} ».`);
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function readAmount(value: string | number | null | undefined, ref: string, label: string): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
    if (!cleaned) return null;
    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
      throw new WinbooksParseError(
        `Montant ${label} illisible pour le tiers ${ref} : « ${value.trim()} ».`,
      );
    }
    return Number(cleaned);
  }
  throw new WinbooksParseError(`Montant ${label} illisible pour le tiers ${ref}.`);
}

function cellText(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value).trim();
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}
