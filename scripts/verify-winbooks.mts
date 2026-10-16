/**
 * Vérification du parser Winbooks sur l'exemplaire Excel.
 * Usage : npx tsx scripts/verify-winbooks.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseWinbooks } from "../src/lib/winbooks/parse-winbooks";
import type { WinbooksLigne } from "../src/types/rapprochement";

const assetPath = resolve(
  process.cwd(),
  "exemplaires/MURPROLUX Historique clients  30 06 2026.xls",
);

const lignes = parseWinbooks(readFileSync(assetPath));

function assertLigne(
  ligne: WinbooksLigne | undefined,
  expected: Pick<WinbooksLigne, "numeroTiers" | "solde">,
) {
  if (!ligne) throw new Error(`Ligne absente, attendu ${expected.numeroTiers}`);
  if (ligne.numeroTiers !== expected.numeroTiers || ligne.solde !== expected.solde) {
    throw new Error(
      `${expected.numeroTiers} : ${ligne.numeroTiers} / ${ligne.solde} ≠ ${expected.numeroTiers} / ${expected.solde}`,
    );
  }
}

assertLigne(lignes[0], { numeroTiers: "10599", solde: 4078.78 });
assertLigne(lignes[2], { numeroTiers: "10599", solde: -4079.78 });

const lud542 = lignes.find((ligne) => ligne.numeroTiers === "LUD542");
assertLigne(lud542, { numeroTiers: "LUD542", solde: 5782.42 });

const lud634 = lignes.find((ligne) => ligne.numeroTiers === "LUD634B");
assertLigne(lud634, { numeroTiers: "LUD634B", solde: 5273.6 });

const creditDubourdieu = lignes.find(
  (ligne) => ligne.numeroTiers === "LUD543" && ligne.solde === -17657.05,
);
if (!creditDubourdieu) throw new Error("Solde crédit LUD543 -17657.05 introuvable");

if (lignes.length !== 203) {
  throw new Error(`203 lignes attendues, ${lignes.length} lues`);
}

const refs = new Set(lignes.map((ligne) => ligne.numeroTiers));
for (const ref of ["281", "241F1", "LUD634B"]) {
  if (!refs.has(ref)) throw new Error(`Tiers manquant : ${ref}`);
}

let rejected = false;
try {
  parseWinbooks(new TextEncoder().encode("pas un excel"));
} catch {
  rejected = true;
}
if (!rejected) throw new Error("Un fichier non Excel aurait dû être rejeté");

console.log(
  JSON.stringify(
    {
      lignes: lignes.length,
      tiers: refs.size,
      premiere: lignes[0],
      credit: lignes[2],
      lud542,
      lud634,
    },
    null,
    2,
  ),
);
