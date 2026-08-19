import type { WorkBook, WorkSheet } from "xlsx";
import type {
  ChiffresClesData,
  ReportingAgency,
  ReportingBundle,
  ReportingMonthMeta,
  ReportingMonthSlice,
  SeuilIndicateur,
  StructureCharges,
} from "@/types/dashboard";
import { CA_CATEGORIE_FALLBACKS } from "@/types/dashboard";
import { ParseError } from "./errors";
import { readWorkbook } from "./read-workbook";
import {
  colLetter,
  getCell,
  getNumberOrNull,
  getSheet,
  getStringOrEmpty,
  parseSeuilWithUnit,
  requireNumber,
} from "./sheet-utils";

/** Colonnes mois CR : B (janvier) → M (décembre). */
const MONTH_COLS = Array.from({ length: 12 }, (_, i) => colLetter(i + 1));

/** Mapping A3 / nom d’onglet → colonne Chiffres Clés (C–H). */
const CK_REGISTRY: {
  codes: string[];
  sheetNames: string[];
  col: string;
  libelleFallback: string;
  /** Suffixe CDC hors Excel (WAL O uniquement) */
  libelleOverride?: string;
}[] = [
  {
    codes: ["FLW"],
    sheetNames: ["FLA W"],
    col: "C",
    libelleFallback: "Flandre Ouest",
  },
  {
    codes: ["FLO"],
    sheetNames: ["FLA O"],
    col: "D",
    libelleFallback: "Flandre Est",
  },
  {
    codes: ["WAE"],
    sheetNames: ["WAL E"],
    col: "E",
    libelleFallback: "Wallonie Est",
  },
  {
    codes: ["WAO"],
    sheetNames: ["WAL O"],
    col: "F",
    libelleFallback: "Wallonie Ouest",
    libelleOverride: "Wallonie Ouest — Frameries",
  },
  {
    codes: [],
    sheetNames: ["Luxembourg"],
    col: "G",
    libelleFallback: "Luxembourg",
  },
  {
    codes: [],
    sheetNames: ["Hollande"],
    col: "H",
    libelleFallback: "Hollande",
  },
];

/** Lignes CA fermées L7–12 — libellés lus en col A, fallback CDC. */
const CA_ROWS: { row: number; fallback: string }[] = [
  { row: 7, fallback: CA_CATEGORIE_FALLBACKS[0] },
  { row: 8, fallback: CA_CATEGORIE_FALLBACKS[1] },
  { row: 9, fallback: CA_CATEGORIE_FALLBACKS[2] },
  { row: 10, fallback: CA_CATEGORIE_FALLBACKS[3] },
  { row: 11, fallback: CA_CATEGORIE_FALLBACKS[4] },
  { row: 12, fallback: CA_CATEGORIE_FALLBACKS[5] },
];

const TAUX_ROWS = [38, 39, 40, 41, 42, 43] as const;

const MONTH_HEADER =
  /janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre/i;

function isExcludedSheetName(name: string): boolean {
  const n = name.trim();
  return /chiffres\s*cl[eé]s/i.test(n) || /synth[eè]se/i.test(n);
}

function findChiffresClesSheetName(workbook: WorkBook): string {
  const name = workbook.SheetNames.find((n) =>
    /chiffres\s*cl[eé]s/i.test(n.trim()),
  );
  if (!name) {
    throw new ParseError(
      "L'onglet « Chiffres Clés » est introuvable dans ce fichier.",
    );
  }
  return name;
}

function resolveCkEntry(sheetName: string, codeA3: string) {
  const code = codeA3.trim().toUpperCase();
  const name = sheetName.trim().toUpperCase();
  return (
    CK_REGISTRY.find(
      (e) =>
        e.codes.includes(code) ||
        e.sheetNames.some((s) => s.toUpperCase() === name),
    ) ?? null
  );
}

function findEuroCouponSeuil(seuils: SeuilIndicateur[]): number {
  const hit = seuils.find((s) => /euro\s*\/?\s*coupon/i.test(s.indicateur));
  if (!hit) {
    throw new ParseError(
      "Le seuil « Euro/coupon » est introuvable dans Chiffres Clés (colonne A).",
    );
  }
  return hit.seuil;
}

function extractAnneeFromFileName(fileName: string): number | null {
  const m = fileName.match(/(20\d{2})/);
  if (!m) return null;
  const year = Number(m[1]);
  return Number.isFinite(year) ? year : null;
}

function findImpayesSeuil(seuils: SeuilIndicateur[]): number {
  const hit = seuils.find((s) => {
    if (s.unite !== "mois") return false;
    return /nbre?\s*de\s*mois|impay/i.test(s.indicateur);
  });
  if (!hit) {
    throw new ParseError(
      "Le seuil « Nbre de mois » (impayés) est introuvable dans Chiffres Clés (colonne A).",
    );
  }
  return hit.seuil;
}

function extractChiffresCles(
  sheet: WorkSheet,
  agencyCol: string = "F",
): ChiffresClesData {
  const col = agencyCol.trim().toUpperCase();

  const moisEcoules = requireNumber(sheet, "B4", "Nombre de mois écoulés");
  const cumulCA = requireNumber(sheet, `${col}6`, "Cumul CA (Chiffres Clés)");
  const cumulVentes = requireNumber(
    sheet,
    `${col}7`,
    "Cumul Ventes (Chiffres Clés)",
  );
  const attente = requireNumber(
    sheet,
    `${col}8`,
    "Cahier de commande / Attente",
  );

  if (moisEcoules === 0) {
    throw new ParseError(
      "Le nombre de mois écoulés (Chiffres Clés B4) est à zéro — impossible de calculer le cahier de commande.",
    );
  }
  const facturationMoyenne = cumulCA / moisEcoules;
  const nbMoisCahier = attente / facturationMoyenne;

  const euroCoupon = requireNumber(sheet, `${col}36`, "Euro/coupon");
  const listeRouge = requireNumber(sheet, `${col}42`, "Impayés / liste rouge");
  const nbMoisImpayes = requireNumber(sheet, `${col}45`, "Nb mois impayés");

  const seuils: SeuilIndicateur[] = [];
  for (let row = 1; row <= 60; row++) {
    const indicateur = getStringOrEmpty(sheet, `B${row}`);
    if (!indicateur) continue;
    const parsed = parseSeuilWithUnit(getCell(sheet, `A${row}`));
    if (!parsed) continue;
    seuils.push({
      indicateur,
      seuil: parsed.seuil,
      seuilMin: parsed.seuilMin,
      seuilMax: parsed.seuilMax,
      unite: parsed.unite,
    });
  }

  return {
    moisEcoules,
    cumulCA,
    cumulVentes,
    seuils,
    cahierCommande: { montant: attente, nbMois: nbMoisCahier },
    impayes: { listeRouge, nbMois: nbMoisImpayes },
    euroCoupon,
  };
}

/** Seuils globaux col A/B — indépendants de la colonne agence. */
function extractSeuilsOnly(sheet: WorkSheet): SeuilIndicateur[] {
  const seuils: SeuilIndicateur[] = [];
  for (let row = 1; row <= 60; row++) {
    const indicateur = getStringOrEmpty(sheet, `B${row}`);
    if (!indicateur) continue;
    const parsed = parseSeuilWithUnit(getCell(sheet, `A${row}`));
    if (!parsed) continue;
    seuils.push({
      indicateur,
      seuil: parsed.seuil,
      seuilMin: parsed.seuilMin,
      seuilMax: parsed.seuilMax,
      unite: parsed.unite,
    });
  }
  return seuils;
}

function extractMonthSlice(
  sheet: WorkSheet,
  monthCol: string,
): ReportingMonthSlice {
  const col = monthCol.trim().toUpperCase();

  const periodeMois = getStringOrEmpty(sheet, `${col}4`) || "Mois courant";

  const repartitionCA = CA_ROWS.map(({ row, fallback }) => {
    const fromFile = getStringOrEmpty(sheet, `A${row}`);
    const categorie = fromFile || fallback;
    return {
      categorie,
      montant: requireNumber(sheet, `${col}${row}`, `CA ${categorie}`),
    };
  });

  const caTotal = requireNumber(sheet, `${col}14`, "TOTAL CA");
  const beneficeBrut = requireNumber(sheet, `${col}35`, "Bénéfice brut");
  const margeBrute = requireNumber(sheet, `${col}36`, "Marge brute");

  const tauxClesBase = TAUX_ROWS.map((row) => {
    const nom = getStringOrEmpty(sheet, `A${row}`) || `% ligne ${row}`;
    const valeur = requireNumber(sheet, `${col}${row}`, nom);
    return { nom, valeur };
  });

  const structureCharges: StructureCharges = {
    technique:
      requireNumber(sheet, `${col}53`, "Charges TECHNIQUE") +
      requireNumber(sheet, `${col}30`, "Déplacement Surveyor") +
      requireNumber(sheet, `${col}31`, "Salaire Surveyor"),
    vente: requireNumber(sheet, `${col}62`, "Charges VENTE"),
    administration: requireNumber(sheet, `${col}78`, "Charges ADMINISTRATION"),
    financier: requireNumber(sheet, `${col}83`, "Charges FINANCIER"),
  };

  const profitApresImpots = requireNumber(
    sheet,
    `${col}95`,
    "Profit après impôts",
  );
  const fraisFixes = requireNumber(sheet, `${col}97`, "Frais fixes");
  const breakEven = requireNumber(sheet, `${col}99`, "Break-even");

  return {
    periodeMois,
    repartitionCA,
    caTotal,
    beneficeBrut,
    margeBrute,
    tauxClesBase,
    structureCharges,
    profitApresImpots,
    fraisFixes,
    breakEven,
  };
}

function extractN1(sheet: WorkSheet): {
  beneficeBrutN1: number;
  variationBeneficeBrutVsN1: number;
  variationBeneficeNetVsN1: number;
} {
  return {
    beneficeBrutN1: requireNumber(sheet, "O35", "Bénéfice brut N-1"),
    variationBeneficeBrutVsN1: requireNumber(
      sheet,
      "P35",
      "Variation bénéfice brut vs N-1",
    ),
    variationBeneficeNetVsN1: requireNumber(
      sheet,
      "P95",
      "Variation vs N-1 (profit après impôts)",
    ),
  };
}

/** Mois dispo : header L4 reconnu + L14 non vide / ≠ 0. */
function extractAvailableMonths(sheet: WorkSheet): {
  months: ReportingMonthMeta[];
  byMonth: Record<string, ReportingMonthSlice>;
} {
  const months: ReportingMonthMeta[] = [];
  const byMonth: Record<string, ReportingMonthSlice> = {};

  for (const col of MONTH_COLS) {
    const header = getStringOrEmpty(sheet, `${col}4`);
    if (!MONTH_HEADER.test(header)) continue;
    const ca = getNumberOrNull(sheet, `${col}14`);
    if (ca === null || ca === 0) continue;
    try {
      const slice = extractMonthSlice(sheet, col);
      months.push({ id: col, label: header || slice.periodeMois, col });
      byMonth[col] = slice;
    } catch {
      // Colonne incomplète → ignorer ce mois
    }
  }

  return { months, byMonth };
}

/** Heuristique : en-tête mois en B4 (évite « Données pour Evolution… »). */
function looksLikeCrSheet(sheet: WorkSheet): boolean {
  const b4 = getStringOrEmpty(sheet, "B4");
  return MONTH_HEADER.test(b4);
}

function emptyCkFields(seuils: SeuilIndicateur[]): Pick<
  ReportingAgency,
  | "moisEcoules"
  | "cumulCA"
  | "seuils"
  | "cahierCommande"
  | "impayes"
  | "euroCoupon"
> {
  return {
    moisEcoules: 0,
    cumulCA: 0,
    seuils,
    cahierCommande: { montant: 0, nbMois: 0 },
    impayes: { listeRouge: 0, nbMois: 0, seuil: 0 },
    euroCoupon: { valeur: 0, seuil: 0 },
  };
}

function resolveAgenceLibelle(
  ck: WorkSheet | null,
  entry: (typeof CK_REGISTRY)[number] | null,
  sheetName: string,
): string {
  if (entry?.libelleOverride) return entry.libelleOverride;
  if (entry && ck) {
    const fromCk = getStringOrEmpty(ck, `${entry.col}4`);
    if (fromCk) return fromCk;
    return entry.libelleFallback;
  }
  return sheetName.trim();
}

/**
 * Parse le fichier reporting — tous les onglets CR sauf Chiffres Clés / Synthèse.
 * Soft-skip des onglets hors structure CR. Entrée = buffer mémoire uniquement.
 * Mois : colonnes B→M non vides ; défaut UI = dernier mois (hors parser).
 */
export function parseReporting(
  buffer: ArrayBuffer | Uint8Array,
  fileName: string,
): ReportingBundle {
  const workbook = readWorkbook(buffer);
  const periodeAnnee = extractAnneeFromFileName(fileName);

  const ckName = findChiffresClesSheetName(workbook);
  const ck = getSheet(
    workbook,
    ckName,
    "L'onglet « Chiffres Clés » est introuvable dans ce fichier.",
  );
  const seuilsGlobaux = extractSeuilsOnly(ck);

  const agencies: ReportingAgency[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (isExcludedSheetName(sheetName)) continue;

    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !looksLikeCrSheet(sheet)) continue;

    const { months, byMonth } = extractAvailableMonths(sheet);
    if (months.length === 0) continue;

    let n1: {
      beneficeBrutN1: number;
      variationBeneficeBrutVsN1: number;
      variationBeneficeNetVsN1: number;
    };
    try {
      n1 = extractN1(sheet);
    } catch {
      continue;
    }

    const codeA3 = getStringOrEmpty(sheet, "A3");
    const ckEntry = resolveCkEntry(sheetName, codeA3);
    const agenceLibelle = resolveAgenceLibelle(ck, ckEntry, sheetName);
    const agenceCible = sheetName.trim();

    let chiffresClesDisponibles = false;
    let ckFields = emptyCkFields(seuilsGlobaux);

    if (ckEntry) {
      try {
        const chiffres = extractChiffresCles(ck, ckEntry.col);
        const euroCouponSeuil = findEuroCouponSeuil(chiffres.seuils);
        const impayesSeuil = findImpayesSeuil(chiffres.seuils);
        chiffresClesDisponibles = true;
        ckFields = {
          moisEcoules: chiffres.moisEcoules,
          cumulCA: chiffres.cumulCA,
          seuils: chiffres.seuils,
          cahierCommande: chiffres.cahierCommande,
          impayes: {
            listeRouge: chiffres.impayes.listeRouge,
            nbMois: chiffres.impayes.nbMois,
            seuil: impayesSeuil,
          },
          euroCoupon: { valeur: chiffres.euroCoupon, seuil: euroCouponSeuil },
        };
      } catch {
        chiffresClesDisponibles = false;
      }
    }

    agencies.push({
      agenceId: sheetName.trim(),
      agenceCible,
      agenceLibelle,
      chiffresClesDisponibles,
      months,
      byMonth,
      periodeAnnee,
      beneficeBrutN1: n1.beneficeBrutN1,
      variationBeneficeBrutVsN1: n1.variationBeneficeBrutVsN1,
      variationBeneficeNetVsN1: n1.variationBeneficeNetVsN1,
      ...ckFields,
      fileName,
    });
  }

  if (agencies.length === 0) {
    throw new ParseError(
      "Aucune agence (compte de résultat) n’a pu être lue dans ce fichier.",
    );
  }

  return { fileName, agencies };
}
