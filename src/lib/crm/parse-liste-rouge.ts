import type { CrmListeRougeLigne } from "@/types/rapprochement";
import { CrmParseError } from "./errors";

/** Écart vertical max entre cellules d'une même ligne (twips). Le montant rouge est ~1 pt au-dessus. */
const ROW_Y_TOLERANCE = 40;

/** Cadres de commentaires de relance : beaucoup plus larges que les colonnes. */
const COMMENT_MIN_WIDTH = 4000;

const COLUMN_LABELS = [
  "Client",
  "Contrat",
  "Date",
  "No facture",
  "Travaux le",
  "Mnt TTC",
  "Mnt rouge",
] as const;

type ColumnKey =
  | "client"
  | "contrat"
  | "date"
  | "facture"
  | "travaux"
  | "ttc"
  | "montant";

const LABEL_TO_KEY: Record<(typeof COLUMN_LABELS)[number], ColumnKey> = {
  Client: "client",
  Contrat: "contrat",
  Date: "date",
  "No facture": "facture",
  "Travaux le": "travaux",
  "Mnt TTC": "ttc",
  "Mnt rouge": "montant",
};

const REQUIRED_COLUMNS: ColumnKey[] = [
  "client",
  "contrat",
  "date",
  "facture",
  "montant",
];

const MONTHS: Record<string, number> = {
  janv: 1,
  fevr: 2,
  mars: 3,
  avr: 4,
  mai: 5,
  juin: 6,
  juil: 7,
  aout: 8,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

type Frame = {
  x: number;
  y: number;
  w: number;
  text: string;
};

type HeaderAnchor = {
  key: ColumnKey;
  x: number;
};

/**
 * Lit l'export CRM « liste rouge ».
 * Le fichier reçu est du RTF enregistré en `.doc` : chaque cellule est un
 * paragraphe positionné (`\posx` / `\posy`), pas un tableau.
 */
export function parseListeRouge(rtf: string): CrmListeRougeLigne[] {
  const source = rtf.trimStart();
  if (!source.startsWith("{\\rtf")) {
    throw new CrmParseError(
      "Ce fichier n'est pas une liste rouge Word (contenu RTF attendu).",
    );
  }

  const pages = splitPages(source);
  const lignes: CrmListeRougeLigne[] = [];
  let headers: HeaderAnchor[] | null = null;

  for (const page of pages) {
    const frames = extractFrames(page).filter((frame) => frame.w < COMMENT_MIN_WIDTH);
    const pageHeaders = readHeaders(frames);
    if (pageHeaders) headers = pageHeaders;
    if (!headers) continue;

    for (const cluster of clusterRows(frames)) {
      if (isHeaderCluster(cluster)) continue;
      const ligne = readLigne(cluster, headers);
      if (ligne) lignes.push(ligne);
    }
  }

  if (!headers) {
    throw new CrmParseError(
      "En-têtes de la liste rouge introuvables (Client, Contrat, Date, No facture, Mnt rouge).",
    );
  }
  if (lignes.length === 0) {
    throw new CrmParseError("Aucune ligne de contrat trouvée dans la liste rouge.");
  }
  return lignes;
}

export async function parseListeRougeFile(file: File): Promise<CrmListeRougeLigne[]> {
  const buffer = await file.arrayBuffer();
  const rtf = new TextDecoder("windows-1252").decode(buffer);
  return parseListeRouge(rtf);
}

function splitPages(rtf: string): string[] {
  const pages: string[] = [];
  let start = 0;
  for (let i = 0; i < rtf.length; i++) {
    if (!isControl(rtf, i, "page")) continue;
    pages.push(rtf.slice(start, i));
    i += "\\page".length - 1;
    start = i + 1;
  }
  pages.push(rtf.slice(start));
  return pages;
}

function extractFrames(page: string): Frame[] {
  const frames: Frame[] = [];
  for (let i = 0; i < page.length; i++) {
    if (!isControl(page, i, "pard")) continue;
    const parAt = indexOfControl(page, i + "\\pard".length, "par");
    if (parAt === -1) continue;
    const block = page.slice(i, parAt);
    const x = readControlNumber(block, "posx");
    const y = readControlNumber(block, "posy");
    if (x === null || y === null) {
      i = parAt;
      continue;
    }
    frames.push({
      x,
      y,
      w: readControlNumber(block, "absw") ?? 0,
      text: decodeRtfText(block),
    });
    i = parAt;
  }
  return frames;
}

function readHeaders(frames: Frame[]): HeaderAnchor[] | null {
  const anchors: HeaderAnchor[] = [];
  for (const label of COLUMN_LABELS) {
    const frame = frames.find((item) => item.text === label);
    if (!frame) continue;
    anchors.push({ key: LABEL_TO_KEY[label], x: frame.x });
  }
  const keys = new Set(anchors.map((anchor) => anchor.key));
  if (!REQUIRED_COLUMNS.every((key) => keys.has(key))) return null;
  return anchors;
}

function clusterRows(frames: Frame[]): Frame[][] {
  const sorted = [...frames].sort((a, b) => a.y - b.y || a.x - b.x);
  const clusters: Frame[][] = [];
  for (const frame of sorted) {
    const current = clusters[clusters.length - 1];
    if (current && Math.abs(frame.y - current[0].y) <= ROW_Y_TOLERANCE) {
      current.push(frame);
    } else {
      clusters.push([frame]);
    }
  }
  return clusters;
}

function isHeaderCluster(cluster: Frame[]): boolean {
  return cluster.some((frame) => frame.text === "Contrat");
}

function readLigne(
  cluster: Frame[],
  headers: HeaderAnchor[],
): CrmListeRougeLigne | null {
  const byColumn = new Map<ColumnKey, Frame[]>();
  for (const frame of cluster) {
    if (!frame.text) continue;
    const key = nearestColumn(frame.x, headers);
    const list = byColumn.get(key);
    if (list) list.push(frame);
    else byColumn.set(key, [frame]);
  }

  const contrat = cellText(byColumn.get("contrat"));
  if (!contrat || contrat === "Contrat") return null;

  const nomClient = clientName(byColumn.get("client"));
  if (!nomClient) {
    throw new CrmParseError(`Nom client absent pour le contrat ${contrat}.`);
  }

  return {
    nomClient,
    numeroContrat: contrat,
    numeroFacture: optionalText(byColumn.get("facture")),
    dateFacture: parseDateCell(cellText(byColumn.get("date")), contrat),
    montantRouge: parseMontantCell(cellText(byColumn.get("montant")), contrat),
  };
}

function clientName(frames: Frame[] | undefined): string | null {
  if (!frames) return null;
  const named = frames
    .filter((frame) => /[A-Za-zÀ-ÿ]/.test(frame.text) && frame.text !== "Client")
    .sort((a, b) => b.x - a.x);
  return named[0]?.text ?? null;
}

function cellText(frames: Frame[] | undefined): string | null {
  if (!frames || frames.length === 0) return null;
  return frames.map((frame) => frame.text).join(" ").trim() || null;
}

function optionalText(frames: Frame[] | undefined): string | null {
  const text = cellText(frames);
  if (!text || text === "No facture") return null;
  return text;
}

function nearestColumn(x: number, headers: HeaderAnchor[]): ColumnKey {
  let best = headers[0];
  let bestDistance = Math.abs(x - best.x);
  for (const header of headers) {
    const distance = Math.abs(x - header.x);
    if (distance < bestDistance) {
      best = header;
      bestDistance = distance;
    }
  }
  return best.key;
}

function parseDateCell(raw: string | null, contrat: string): string | null {
  if (!raw || raw === "Date") return null;
  const parts = raw.split("-");
  if (parts.length !== 3) {
    throw new CrmParseError(
      `Date de facture illisible pour le contrat ${contrat} : « ${raw} ».`,
    );
  }
  const day = Number(parts[0]);
  const month = MONTHS[foldMonth(parts[1] ?? "")];
  const yearShort = Number(parts[2]);
  if (!Number.isInteger(day) || !month || !Number.isInteger(yearShort)) {
    throw new CrmParseError(
      `Date de facture illisible pour le contrat ${contrat} : « ${raw} ».`,
    );
  }
  const year = yearShort <= 69 ? 2000 + yearShort : 1900 + yearShort;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new CrmParseError(
      `Date de facture illisible pour le contrat ${contrat} : « ${raw} ».`,
    );
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseMontantCell(raw: string | null, contrat: string): number | null {
  if (!raw || raw === "Mnt rouge") return null;
  const cleaned = raw.replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new CrmParseError(
      `Montant rouge illisible pour le contrat ${contrat} : « ${raw} ».`,
    );
  }
  return Math.round(Number(cleaned) * 100) / 100;
}

function foldMonth(value: string): string {
  return value
    .toLowerCase()
    .replace(/\./g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function decodeRtfText(block: string): string {
  let out = "";
  let uc = 1;
  let skip = 0;

  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (ch === "{" || ch === "}") continue;
    if (ch !== "\\") {
      if (skip > 0) {
        skip -= 1;
        continue;
      }
      out += ch;
      continue;
    }

    i += 1;
    const next = block[i];
    if (next === undefined) break;
    if (next === "\\" || next === "{" || next === "}") {
      if (skip > 0) skip -= 1;
      else out += next;
      continue;
    }
    if (next === "'") {
      const hex = block.slice(i + 1, i + 3);
      i += 2;
      if (skip > 0) {
        skip -= 1;
        continue;
      }
      const code = Number.parseInt(hex, 16);
      if (!Number.isNaN(code)) out += String.fromCharCode(code);
      continue;
    }
    if (next === "_") {
      if (skip > 0) skip -= 1;
      else out += "-";
      continue;
    }
    if (next === "~") {
      if (skip > 0) skip -= 1;
      else out += " ";
      continue;
    }
    if (!/[a-zA-Z]/.test(next)) continue;

    const wordStart = i;
    while (i < block.length && /[a-zA-Z]/.test(block[i] ?? "")) i += 1;
    const word = block.slice(wordStart, i);
    let negative = false;
    if (block[i] === "-") {
      negative = true;
      i += 1;
    }
    const numStart = i;
    while (i < block.length && /[0-9]/.test(block[i] ?? "")) i += 1;
    const num =
      numStart === i ? null : Number(block.slice(numStart, i)) * (negative ? -1 : 1);
    if (block[i] !== " ") i -= 1;

    if (word === "uc" && num !== null) {
      uc = num;
      continue;
    }
    if (word === "u" && num !== null) {
      const code = num < 0 ? num + 65536 : num;
      out += String.fromCodePoint(code);
      skip = uc;
      continue;
    }
    if (word === "par") break;
  }

  return out.replace(/[\u202f\u00a0]/g, " ").replace(/\s+/g, " ").trim();
}

function isControl(source: string, index: number, word: string): boolean {
  const needle = `\\${word}`;
  if (!source.startsWith(needle, index)) return false;
  const next = source[index + needle.length];
  return next === undefined || !/[a-zA-Z]/.test(next);
}

function indexOfControl(source: string, from: number, word: string): number {
  for (let i = from; i < source.length; i++) {
    if (isControl(source, i, word)) return i;
  }
  return -1;
}

function readControlNumber(block: string, word: string): number | null {
  const match = new RegExp(`\\\\${word}(-?\\d+)`).exec(block);
  if (!match?.[1]) return null;
  return Number(match[1]);
}
