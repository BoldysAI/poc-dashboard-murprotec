import * as XLSX from "xlsx";
import { ParseError } from "./errors";

/** Options SheetJS : valeurs calculées (cell.v), pas les formules. */
export const WORKBOOK_READ_OPTIONS: XLSX.ParsingOptions = {
  type: "buffer",
  cellFormula: false,
  cellDates: false,
};

/**
 * Ouvre un .xls (BIFF) ou .xlsx (OOXML) depuis un buffer mémoire.
 * Les lignes masquées restent accessibles (présentes dans le fichier).
 */
export function readWorkbook(buffer: ArrayBuffer | Buffer): XLSX.WorkBook {
  try {
    const workbook = XLSX.read(buffer, WORKBOOK_READ_OPTIONS);
    if (!workbook.SheetNames.length) {
      throw new ParseError(
        "Le fichier Excel est illisible ou ne contient aucun onglet.",
      );
    }
    return workbook;
  } catch (err) {
    if (err instanceof ParseError) throw err;
    throw new ParseError(
      "Le fichier Excel est illisible. Vérifiez qu'il s'agit d'un .xls ou .xlsx valide.",
    );
  }
}
