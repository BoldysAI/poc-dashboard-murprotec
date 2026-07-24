import * as XLSX from "xlsx";
import { ParseError } from "./errors";

/**
 * Options SheetJS : valeurs calculées (cell.v), pas les formules.
 * `type: "array"` — compatible navigateur (ArrayBuffer/Uint8Array) et Node.
 */
export const WORKBOOK_READ_OPTIONS: Omit<XLSX.ParsingOptions, "type"> = {
  cellFormula: false,
  cellDates: false,
};

function toUint8Array(input: ArrayBuffer | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(input);
}

/**
 * Ouvre un .xls (BIFF) ou .xlsx (OOXML) depuis un buffer mémoire.
 * Utilisable côté client (navigateur) et serveur — aucune écriture disque.
 * Les lignes masquées restent accessibles (présentes dans le fichier).
 */
export function readWorkbook(input: ArrayBuffer | Uint8Array): XLSX.WorkBook {
  try {
    const workbook = XLSX.read(toUint8Array(input), {
      ...WORKBOOK_READ_OPTIONS,
      type: "array",
    });
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
