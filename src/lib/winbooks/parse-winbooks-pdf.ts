import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type { WinbooksLigne } from "@/types/rapprochement";
import { WinbooksParseError } from "./errors";

/** Même ligne visuelle : écart vertical max en points PDF. */
const ROW_Y_TOLERANCE = 1.5;

const AMOUNT = /^-?\d{1,3}(?:\.\d{3})*,\d{2}$|^\d+,\d{2}$/;
const DATE = /\d{2}\/\d{2}\/\d{4}/;

type Glyph = {
  x: number;
  y: number;
  text: string;
};

/**
 * Lit l'export Winbooks PDF « postes ouverts clients ».
 * Même résultat que l'Excel : une écriture = une ligne, solde = débit (positif) ou crédit (négatif).
 * Le numéro de tiers est celui du bandeau client au-dessus des écritures.
 */
export async function parseWinbooksPdf(input: ArrayBuffer | Uint8Array): Promise<WinbooksLigne[]> {
  const data = input instanceof Uint8Array ? new Uint8Array(input) : new Uint8Array(input);
  const lignes: WinbooksLigne[] = [];
  let currentTiers: string | null = null;
  let debitX: number | null = null;
  let creditX: number | null = null;

  const doc = await openPdf(data).catch(() => {
    throw new WinbooksParseError(
      "Le fichier PDF est illisible. Vérifiez qu'il s'agit d'un export Winbooks.",
    );
  });

  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const glyphs = content.items.filter(isTextItem).flatMap(toGlyph);
      for (const glyph of glyphs) {
        if (glyph.text === "Débit") debitX = glyph.x;
        if (glyph.text === "Crédit") creditX = glyph.x;
      }
      if (debitX === null || creditX === null) continue;

      const mid = (debitX + creditX) / 2;
      for (const row of clusterRows(glyphs)) {
        const ligne = readRow(row, mid, currentTiers);
        if (ligne.kind === "tiers") currentTiers = ligne.numeroTiers;
        if (ligne.kind === "mouvement") lignes.push(ligne.ligne);
      }
    }
  } finally {
    await doc.cleanup();
  }

  if (debitX === null || creditX === null) {
    throw new WinbooksParseError("En-têtes Débit / Crédit introuvables dans le PDF Winbooks.");
  }
  if (lignes.length === 0) {
    throw new WinbooksParseError("Aucune ligne de tiers trouvée dans le PDF Winbooks.");
  }
  return lignes;
}

export async function parseWinbooksPdfFile(file: File): Promise<WinbooksLigne[]> {
  const buffer = await file.arrayBuffer();
  return parseWinbooksPdf(buffer);
}

async function openPdf(data: Uint8Array) {
  const pdfjs =
    typeof window === "undefined"
      ? await import("pdfjs-dist/legacy/build/pdf.mjs")
      : await import("pdfjs-dist/webpack.mjs");
  return pdfjs.getDocument({ data, verbosity: 0 }).promise;
}

function isTextItem(item: unknown): item is TextItem {
  return typeof item === "object" && item !== null && "str" in item && "transform" in item;
}

function toGlyph(item: TextItem): Glyph[] {
  const text = item.str.trim();
  if (!text) return [];
  const x = Number(item.transform[4]);
  const y = Number(item.transform[5]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
  return [{ x, y, text }];
}

function clusterRows(glyphs: Glyph[]): Glyph[][] {
  const sorted = [...glyphs].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Glyph[][] = [];
  for (const glyph of sorted) {
    const current = rows[rows.length - 1];
    if (current && Math.abs(current[0].y - glyph.y) <= ROW_Y_TOLERANCE) {
      current.push(glyph);
    } else {
      rows.push([glyph]);
    }
  }
  return rows;
}

type RowRead =
  | { kind: "skip" }
  | { kind: "tiers"; numeroTiers: string }
  | { kind: "mouvement"; ligne: WinbooksLigne };

function readRow(row: Glyph[], mid: number, currentTiers: string | null): RowRead {
  const texts = row.map((glyph) => glyph.text);
  const joined = texts.join(" ");
  if (
    texts.includes("Débit") ||
    texts.includes("Crédit") ||
    joined.includes("Solde") ||
    joined.includes("MURPROTEC") ||
    joined.includes("Postes ouverts") ||
    texts.some((text) => text.startsWith("Page"))
  ) {
    return { kind: "skip" };
  }

  const amounts = row.filter((glyph) => AMOUNT.test(glyph.text));
  const hasDate = texts.some((text) => DATE.test(text));
  if (hasDate && amounts.length > 0) {
    if (!currentTiers) {
      throw new WinbooksParseError("Écriture Winbooks sans numéro de tiers dans le PDF.");
    }
    if (amounts.length !== 1) {
      throw new WinbooksParseError(
        `Montant ambigu pour le tiers ${currentTiers} dans le PDF Winbooks.`,
      );
    }
    const amount = amounts[0];
    const value = parseEuropeanAmount(amount.text, currentTiers);
    const dateSource = row
      .filter((glyph) => DATE.test(glyph.text))
      .sort((a, b) => a.x - b.x)[0];
    const dateBrute = dateSource?.text.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] ?? null;
    const document = row
      .filter(
        (glyph) =>
          glyph.x > 70 &&
          glyph.x < 128 &&
          !DATE.test(glyph.text) &&
          !AMOUNT.test(glyph.text),
      )
      .sort((a, b) => b.x - a.x)[0];
    return {
      kind: "mouvement",
      ligne: {
        numeroTiers: currentTiers,
        solde: roundCents(amount.x < mid ? value : -value),
        numeroDocument: document?.text.trim() || null,
        dateDocument: dateBrute ? toIsoDate(dateBrute, currentTiers) : null,
      },
    };
  }

  const ref = row
    .filter((glyph) => glyph.x < 80)
    .sort((a, b) => a.x - b.x)
    .find((glyph) => /[A-Za-z0-9]/.test(glyph.text));
  const hasNameColumn = row.some((glyph) => glyph.x > 90);
  if (ref && hasNameColumn && !hasDate) {
    return { kind: "tiers", numeroTiers: ref.text.trim() };
  }
  return { kind: "skip" };
}

function toIsoDate(raw: string, tiers: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (!match) {
    throw new WinbooksParseError(`Date illisible pour le tiers ${tiers} : « ${raw} ».`);
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
    throw new WinbooksParseError(`Date illisible pour le tiers ${tiers} : « ${raw} ».`);
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function parseEuropeanAmount(raw: string, tiers: string): number {
  const cleaned = raw.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new WinbooksParseError(`Montant illisible pour le tiers ${tiers} : « ${raw} ».`);
  }
  return Number(cleaned);
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}
