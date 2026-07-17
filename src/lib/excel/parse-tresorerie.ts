import type { TresorerieData, TresoreriePays, TresorerieSociete } from "@/types/dashboard";
import { ParseError } from "./errors";
import { readWorkbook } from "./read-workbook";
import {
  colIndex,
  colLetter,
  detectLastCompanyColumn,
  FIRST_COMPANY_COL_INDEX,
  getNumberOrNull,
  getSheet,
  getStringOrEmpty,
  requireNumber,
} from "./sheet-utils";

/**
 * Parse le fichier trésorerie groupe (CDC Brique 1).
 * Entrée = Buffer en mémoire uniquement — aucune écriture disque.
 */
export function parseTresorerie(
  buffer: ArrayBuffer | Buffer,
  fileName: string,
): TresorerieData {
  const workbook = readWorkbook(buffer);

  if (!workbook.SheetNames.includes("Tresorerie")) {
    throw new ParseError(
      "L'onglet « Tresorerie » est introuvable dans ce fichier.",
    );
  }

  const sheet = getSheet(
    workbook,
    "Tresorerie",
    "L'onglet « Tresorerie » est introuvable dans ce fichier.",
  );

  const lastCompanyCol = detectLastCompanyColumn(sheet);
  const lastIndex = colIndex(lastCompanyCol);

  const parSociete: TresorerieSociete[] = [];
  for (let col = FIRST_COMPANY_COL_INDEX; col <= lastIndex; col++) {
    const colonne = colLetter(col);
    const marque = getStringOrEmpty(sheet, `${colonne}7`);
    const activite = getStringOrEmpty(sheet, `${colonne}8`);
    const paysRaw = getStringOrEmpty(sheet, `${colonne}10`);
    const soldeCourant = getNumberOrNull(sheet, `${colonne}27`);
    const recettesMois = getNumberOrNull(sheet, `${colonne}22`);
    const depensesMois = getNumberOrNull(sheet, `${colonne}15`);

    const hasContent =
      marque !== "" ||
      activite !== "" ||
      paysRaw !== "" ||
      soldeCourant !== null ||
      recettesMois !== null ||
      depensesMois !== null;

    if (!hasContent) continue;

    // Normalise le pays (L10, fallback L8) en majuscules pour fusionner
    // les variantes de casse du fichier (ex. « Espagne » vs « ESPAGNE »).
    parSociete.push({
      colonne,
      marque: marque || activite || colonne,
      activite,
      pays: (paysRaw || activite || "INCONNU").toUpperCase(),
      soldeCourant: soldeCourant ?? 0,
      recettesMois: recettesMois ?? 0,
      depensesMois: depensesMois ?? 0,
    });
  }

  if (parSociete.length === 0) {
    throw new ParseError(
      "Aucune colonne société n'a pu être détectée dans l'onglet Tresorerie.",
    );
  }

  const paysMap = new Map<string, number>();
  for (const s of parSociete) {
    paysMap.set(s.pays, (paysMap.get(s.pays) ?? 0) + s.soldeCourant);
  }
  const parPays: TresoreriePays[] = [...paysMap.entries()].map(
    ([pays, montantTotal]) => ({ pays, montantTotal }),
  );

  const totalDepenses = requireNumber(sheet, "Z15", "Total dépenses");
  const totalRecettes = requireNumber(sheet, "Z22", "Total recettes");
  const positionNette = requireNumber(
    sheet,
    "Z27",
    "Position nette / solde courant",
  );
  const totalGeneral = requireNumber(sheet, "Z43", "Total général");
  const pctPlacements = requireNumber(sheet, "Z45", "% Placements");
  const soldeAu1erJanvier = requireNumber(
    sheet,
    "Z52",
    "Solde au 1er janvier",
  );

  // Composition 🔶 : cellule absente → 0 explicite (décision session, pas requireNumber)
  const salairesCharges = getNumberOrNull(sheet, "Z16");
  const impotsTaxes = getNumberOrNull(sheet, "Z17");
  const fournisseurs = getNumberOrNull(sheet, "Z18");
  const dividendes = getNumberOrNull(sheet, "Z19");
  const transfertsInternes = getNumberOrNull(sheet, "Z20");

  return {
    parSociete,
    parPays,
    positionNette,
    totalGeneral,
    pctPlacements,
    soldeAu1erJanvier,
    variationDepuis1erJanvier: positionNette - soldeAu1erJanvier,
    totalRecettes,
    totalDepenses,
    compositionDepenses: {
      salairesCharges: salairesCharges ?? 0,
      impotsTaxes: impotsTaxes ?? 0,
      fournisseurs: fournisseurs ?? 0,
      dividendes: dividendes ?? 0,
      transfertsInternes: transfertsInternes ?? 0,
    },
    fileName,
  };
}
