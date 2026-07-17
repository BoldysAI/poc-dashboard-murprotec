import type { WorkBook, WorkSheet } from "xlsx";
import { ParseError } from "./errors";

/** Valeur brute de cellule — vide → null (jamais 0 silencieux). */
export type CellValue = number | string | boolean | null;

/** Excel column index 0-based → letter (0=A, 25=Z). */
export function colLetter(index: number): string {
  let n = index;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

/** Letter → 0-based index (A=0, Z=25). */
export function colIndex(letter: string): number {
  const s = letter.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(s)) {
    throw new ParseError(`Colonne Excel invalide : « ${letter} ».`);
  }
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64);
  }
  return n - 1;
}

function normalizeCol(col: string | number): string {
  return typeof col === "number" ? colLetter(col) : col.trim().toUpperCase();
}

/**
 * Lit la valeur calculée d'une cellule (`cell.v`), jamais la formule (`cell.f`).
 * Cellule absente / vide → `null`.
 */
export function getCell(sheet: WorkSheet, address: string): CellValue {
  const cell = sheet[address];
  if (!cell || cell.v === undefined || cell.v === null || cell.v === "") {
    return null;
  }
  const v = cell.v;
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : null;
  }
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t;
  }
  if (typeof v === "boolean") return v;
  // Dates / autres : stringify plutôt que perdre l'info
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/**
 * Lit une plage horizontale sur une ligne (1-based Excel).
 * `fromCol` / `toCol` : lettres (`C`, `Y`) ou index 0-based.
 */
export function getRow(
  sheet: WorkSheet,
  row: number,
  fromCol: string | number,
  toCol: string | number,
): CellValue[] {
  if (!Number.isInteger(row) || row < 1) {
    throw new ParseError(`Numéro de ligne invalide : ${row}.`);
  }
  const from = typeof fromCol === "number" ? fromCol : colIndex(fromCol);
  const to = typeof toCol === "number" ? toCol : colIndex(toCol);
  if (from > to) {
    throw new ParseError(
      `Plage de colonnes invalide : ${normalizeCol(fromCol)} → ${normalizeCol(toCol)}.`,
    );
  }
  const values: CellValue[] = [];
  for (let i = from; i <= to; i++) {
    values.push(getCell(sheet, `${colLetter(i)}${row}`));
  }
  return values;
}

/**
 * Retourne la feuille nommée, ou lève une erreur explicite.
 */
export function getSheet(
  workbook: WorkBook,
  name: string,
  missingMessage?: string,
): WorkSheet {
  const sheet = workbook.Sheets[name];
  if (!sheet) {
    throw new ParseError(
      missingMessage ?? `L'onglet « ${name} » est introuvable dans ce fichier.`,
    );
  }
  return sheet;
}

function isTotalColumnLabel(value: CellValue): boolean {
  if (typeof value !== "string") return false;
  return /^(europe|total)\b/i.test(value.trim());
}

function companyColumnHasContent(sheet: WorkSheet, letter: string): boolean {
  const marque = getCell(sheet, `${letter}7`);
  const activite = getCell(sheet, `${letter}8`);
  const pays = getCell(sheet, `${letter}10`);
  const solde = getCell(sheet, `${letter}27`);
  return (
    marque !== null || activite !== null || pays !== null || solde !== null
  );
}

/**
 * Détecte la dernière colonne société avant la colonne total (ex. Europe en Z).
 * Utilisé pour la trésorerie — nombre de sociétés variable.
 */
export function detectLastCompanyColumn(sheet: WorkSheet): string {
  let totalColIndex: number | null = null;

  for (let i = 2; i <= 60; i++) {
    const letter = colLetter(i);
    const marque = getCell(sheet, `${letter}7`);
    if (isTotalColumnLabel(marque)) {
      totalColIndex = i;
      break;
    }
  }

  if (totalColIndex === null) {
    throw new ParseError(
      "La colonne total (Europe) est introuvable : impossible de détecter les colonnes sociétés.",
    );
  }

  for (let i = totalColIndex - 1; i >= 2; i--) {
    const letter = colLetter(i);
    if (companyColumnHasContent(sheet, letter)) {
      return letter;
    }
  }

  throw new ParseError(
    "Aucune colonne société n'a pu être détectée avant la colonne total.",
  );
}

/** Index 0-based de la première colonne société (C). */
export const FIRST_COMPANY_COL_INDEX = 2;

/**
 * Nombre attendu obligatoire — cellule vide → erreur (pas de 0 silencieux).
 */
export function requireNumber(
  sheet: WorkSheet,
  address: string,
  label: string,
): number {
  const raw = getCell(sheet, address);
  if (raw === null) {
    throw new ParseError(
      `La cellule attendue ${address} (${label}) est absente ou vide.`,
    );
  }
  if (typeof raw === "number") return raw;
  if (typeof raw === "boolean") return raw ? 1 : 0;
  const n = Number(String(raw).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n)) {
    throw new ParseError(
      `La cellule ${address} (${label}) n'est pas un nombre valide.`,
    );
  }
  return n;
}

/**
 * Nombre optionnel — vide → `null` (jamais 0 silencieux).
 * Le `0` explicite du fichier est conservé.
 */
export function getNumberOrNull(
  sheet: WorkSheet,
  address: string,
): number | null {
  const raw = getCell(sheet, address);
  if (raw === null) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "boolean") return raw ? 1 : 0;
  const n = Number(String(raw).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function getStringOrEmpty(sheet: WorkSheet, address: string): string {
  const raw = getCell(sheet, address);
  if (raw === null) return "";
  return String(raw).trim();
}

/** @deprecated Prefer getCell — alias historique */
export function cellRaw(sheet: WorkSheet, address: string): unknown {
  return getCell(sheet, address);
}

/** @deprecated Prefer getStringOrEmpty */
export function cellString(sheet: WorkSheet, address: string): string {
  return getStringOrEmpty(sheet, address);
}

/**
 * @deprecated Ne plus utiliser : convertissait le vide en 0 silencieux.
 * Prefer getNumberOrNull + coalescence explicite côté métier.
 */
export function optionalNumber(sheet: WorkSheet, address: string): number {
  return getNumberOrNull(sheet, address) ?? 0;
}

export type ParsedSeuil = {
  /** Borne haute (ou seuil unique) */
  seuil: number;
  seuilMin: number | null;
  seuilMax: number | null;
  /** `%` | `€` | `mois` — dérivé du texte source */
  unite: "%" | "€" | "mois";
};

function detectSeuilUnite(s: string): ParsedSeuil["unite"] {
  if (/mois/i.test(s)) return "mois";
  if (/€|eur/i.test(s)) return "€";
  return "%";
}

/**
 * Parse French threshold strings like "< 3,5 %", "< 12%", "< 795 EUR", "< 1 mois".
 * Plages « 15-18% » → seuilMin=15 %, seuilMax=18 % (seuil = max).
 */
export function parseSeuilWithUnit(raw: unknown): ParsedSeuil | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { seuil: raw, seuilMin: null, seuilMax: raw, unite: "%" };
  }

  const s = String(raw).trim();
  const unite = detectSeuilUnite(s);
  const isPct = unite === "%";
  const scale = (n: number) => (isPct ? n / 100 : n);

  const range = s.match(/(\d+[.,]?\d*)\s*[-–]\s*(\d+[.,]?\d*)/);
  if (range) {
    const lo = parseFloat(range[1].replace(",", "."));
    const hi = parseFloat(range[2].replace(",", "."));
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    const seuilMin = scale(lo);
    const seuilMax = scale(hi);
    return { seuil: seuilMax, seuilMin, seuilMax, unite };
  }

  const m = s.match(/(\d+[.,]?\d*)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const seuil = scale(n);
  return { seuil, seuilMin: null, seuilMax: seuil, unite };
}

/** Parse French threshold strings like "< 3,5 %", "< 12%", "< 795 EUR". */
export function parseSeuil(raw: unknown): number | null {
  return parseSeuilWithUnit(raw)?.seuil ?? null;
}
