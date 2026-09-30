/**
 * Le PDF Winbooks doit produire les mêmes lignes que l'Excel.
 * Usage : npx tsx scripts/verify-winbooks-pdf.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseWinbooks } from "../src/lib/winbooks/parse-winbooks";
import { parseWinbooksPdf } from "../src/lib/winbooks/parse-winbooks-pdf";

const dir = resolve(process.cwd(), "exemplaires");
const pdf = parseWinbooksPdf(
  readFileSync(resolve(dir, "MURPROLUX Historique clients 30 06 2026.pdf")),
);
const xls = parseWinbooks(
  readFileSync(resolve(dir, "MURPROLUX Historique clients  30 06 2026.xls")),
);

const pdfLignes = await pdf;
if (pdfLignes.length !== xls.length) {
  throw new Error(`PDF ${pdfLignes.length} lignes, Excel ${xls.length}`);
}
for (let i = 0; i < xls.length; i++) {
  const left = pdfLignes[i];
  const right = xls[i];
  if (
    !left ||
    left.numeroTiers !== right.numeroTiers ||
    left.solde !== right.solde ||
    left.numeroDocument !== right.numeroDocument ||
    left.dateDocument !== right.dateDocument
  ) {
    throw new Error(
      `Ligne ${i + 1} : PDF ${left?.numeroTiers} / ${left?.solde} / ${left?.numeroDocument} / ${left?.dateDocument} ≠ Excel ${right.numeroTiers} / ${right.solde} / ${right.numeroDocument} / ${right.dateDocument}`,
    );
  }
}

let rejected = false;
try {
  await parseWinbooksPdf(new TextEncoder().encode("pas un pdf"));
} catch {
  rejected = true;
}
if (!rejected) throw new Error("Un fichier non PDF aurait dû être rejeté");

console.log(
  JSON.stringify(
    {
      lignes: pdfLignes.length,
      premiere: pdfLignes[0],
      credit: pdfLignes[2],
      identiqueExcel: true,
    },
    null,
    2,
  ),
);
