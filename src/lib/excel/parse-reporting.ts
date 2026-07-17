import type { WorkBook, WorkSheet } from "xlsx";
import type {
  ChiffresClesData,
  RepartitionCA,
  ReportingBundle,
  ReportingData,
  SeuilIndicateur,
  StructureCharges,
  TauxCle,
  TauxCleStatut,
} from "@/types/dashboard";
import { CA_CATEGORIE_FALLBACKS } from "@/types/dashboard";
import { ParseError } from "./errors";
import { readWorkbook } from "./read-workbook";
import {
  getCell,
  getSheet,
  getStringOrEmpty,
  parseSeuilWithUnit,
  requireNumber,
} from "./sheet-utils";

/** Mapping A3 / nom d’onglet → colonne Chiffres Clés (C–F). */
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

/**
 * Rapprochements taux ↔ seuils Chiffres Clés (CDC n’explicite pas tous).
 * Documenté decisions.md 2026-07-17.
 */
const TAUX_SEUIL_ALIASES: {
  test: (n: string) => boolean;
  find: RegExp;
}[] = [
  { test: (x) => x.includes("poseur"), find: /poseur/i },
  { test: (x) => x.includes("publicit"), find: /publicit/i },
  {
    test: (x) => x.includes("commission") && x.includes("facture"),
    find: /vendeur/i,
  },
  {
    test: (x) => x.includes("surveyor") || x.includes("technicien"),
    find: /technicien|surveyor|cout\s*technicien/i,
  },
];

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

function normLabel(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9%]/g, "");
}

function matchSeuilEntry(
  tauxNom: string,
  seuils: SeuilIndicateur[],
): SeuilIndicateur | null {
  const n = normLabel(tauxNom);

  for (const a of TAUX_SEUIL_ALIASES) {
    if (a.test(n)) {
      const hit = seuils.find((e) => a.find.test(e.indicateur));
      if (hit) return hit;
    }
  }

  const hit = seuils.find((e) => {
    const el = normLabel(e.indicateur);
    return n.includes(el) || el.includes(n.replace(/%/g, ""));
  });
  return hit ?? null;
}

function computeTauxStatut(
  valeur: number,
  entry: SeuilIndicateur | null,
): TauxCleStatut {
  if (!entry) return "neutral";
  const { seuilMin, seuilMax, seuil } = entry;
  if (seuilMin !== null && seuilMax !== null && seuilMin !== seuilMax) {
    if (valeur < seuilMin) return "ok";
    if (valeur <= seuilMax) return "warning";
    return "danger";
  }
  const max = seuilMax ?? seuil;
  return valeur <= max ? "ok" : "danger";
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

type AgenceCrExtract = {
  periodeMois: string;
  repartitionCA: RepartitionCA[];
  caTotal: number;
  beneficeBrut: number;
  margeBrute: number;
  beneficeBrutN1: number;
  tauxClesBase: { nom: string; valeur: number }[];
  structureCharges: StructureCharges;
  profitApresImpots: number;
  fraisFixes: number;
  breakEven: number;
  variationVsN1: number;
};

function extractAgenceCr(
  sheet: WorkSheet,
  monthCol: string = "B",
): AgenceCrExtract {
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
  const beneficeBrutN1 = requireNumber(sheet, "O35", "Bénéfice brut N-1");

  const tauxClesBase = TAUX_ROWS.map((row) => {
    const nom = getStringOrEmpty(sheet, `A${row}`) || `% ligne ${row}`;
    const valeur = requireNumber(sheet, `${col}${row}`, nom);
    return { nom, valeur };
  });

  const structureCharges: StructureCharges = {
    technique: requireNumber(sheet, `${col}53`, "Charges TECHNIQUE"),
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
  const variationVsN1 = requireNumber(
    sheet,
    "P95",
    "Variation vs N-1 (profit après impôts)",
  );

  return {
    periodeMois,
    repartitionCA,
    caTotal,
    beneficeBrut,
    margeBrute,
    beneficeBrutN1,
    tauxClesBase,
    structureCharges,
    profitApresImpots,
    fraisFixes,
    breakEven,
    variationVsN1,
  };
}

/** Heuristique : en-tête mois en B4 (évite « Données pour Evolution… »). */
function looksLikeCrSheet(sheet: WorkSheet): boolean {
  const b4 = getStringOrEmpty(sheet, "B4");
  return MONTH_HEADER.test(b4);
}

function buildTauxCles(
  base: { nom: string; valeur: number }[],
  seuils: SeuilIndicateur[],
): TauxCle[] {
  return base.map(({ nom, valeur }) => {
    const entry = matchSeuilEntry(nom, seuils);
    const statut = computeTauxStatut(valeur, entry);
    return {
      nom,
      valeur,
      seuil: entry?.seuil ?? null,
      seuilMin: entry?.seuilMin ?? null,
      seuilMax: entry?.seuilMax ?? null,
      statut,
      enDeviation: statut === "warning" || statut === "danger",
    };
  });
}

function emptyCkFields(seuils: SeuilIndicateur[]): Pick<
  ReportingData,
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
 * Soft-skip des onglets hors structure CR. Entrée = Buffer mémoire uniquement.
 */
export function parseReporting(
  buffer: ArrayBuffer | Buffer,
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

  const agencies: ReportingData[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (isExcludedSheetName(sheetName)) continue;

    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !looksLikeCrSheet(sheet)) continue;

    let cr: AgenceCrExtract;
    try {
      cr = extractAgenceCr(sheet, "B");
    } catch {
      // Soft-skip : structure incomplète / hors modèle CR
      continue;
    }

    const codeA3 = getStringOrEmpty(sheet, "A3");
    const ckEntry = resolveCkEntry(sheetName, codeA3);
    const agenceLibelle = resolveAgenceLibelle(ck, ckEntry, sheetName);
    const agenceCible = sheetName.trim();

    let chiffresClesDisponibles = false;
    let ckFields = emptyCkFields(seuilsGlobaux);
    let tauxCles = buildTauxCles(cr.tauxClesBase, seuilsGlobaux);

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
        tauxCles = buildTauxCles(cr.tauxClesBase, chiffres.seuils);
      } catch {
        // Colonne CK absente / incomplète → CR seul, pilotage masqué
        chiffresClesDisponibles = false;
      }
    }

    agencies.push({
      agenceId: sheetName.trim(),
      agenceCible,
      agenceLibelle,
      chiffresClesDisponibles,
      periodeMois: cr.periodeMois,
      periodeAnnee,
      repartitionCA: cr.repartitionCA,
      caTotal: cr.caTotal,
      beneficeBrut: cr.beneficeBrut,
      margeBrute: cr.margeBrute,
      beneficeBrutN1: cr.beneficeBrutN1,
      tauxCles,
      structureCharges: cr.structureCharges,
      profitApresImpots: cr.profitApresImpots,
      fraisFixes: cr.fraisFixes,
      breakEven: cr.breakEven,
      variationVsN1: cr.variationVsN1,
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
