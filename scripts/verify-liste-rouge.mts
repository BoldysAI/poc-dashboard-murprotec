/**
 * Vérification du parser liste rouge sur l'exemplaire CRM.
 * Usage : npx tsx scripts/verify-liste-rouge.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseListeRouge } from "../src/lib/crm/parse-liste-rouge";
import type { CrmListeRougeLigne } from "../src/types/rapprochement";

const assetPath = resolve(
  process.cwd(),
  "exemplaires/LISTE ROUGE PAR DATE POSE.doc",
);

const rtf = new TextDecoder("windows-1252").decode(readFileSync(assetPath));
const lignes = parseListeRouge(rtf);

function assertLigne(
  ligne: CrmListeRougeLigne | undefined,
  expected: CrmListeRougeLigne,
) {
  if (!ligne) throw new Error(`Ligne absente, attendu ${expected.numeroContrat}`);
  const fields = ["nomClient", "numeroContrat", "numeroFacture", "dateFacture", "montantRouge"] as const;
  for (const field of fields) {
    if (ligne[field] !== expected[field]) {
      throw new Error(
        `${expected.numeroContrat} ${field} : ${String(ligne[field])} ≠ ${String(expected[field])}`,
      );
    }
  }
}

assertLigne(lignes[0], {
  nomClient: "ALTAMURO NICO",
  numeroContrat: "LUA4049",
  numeroFacture: "7409",
  dateFacture: "2022-07-29",
  montantRouge: 4849.87,
});

assertLigne(lignes[1], {
  nomClient: "RIHOUET VINCENT",
  numeroContrat: "LUC2836",
  numeroFacture: "1024152",
  dateFacture: "2023-12-19",
  montantRouge: 2335,
});

assertLigne(lignes[2], {
  nomClient: "KOZA SARL",
  numeroContrat: "LUA4154",
  numeroFacture: "1024180",
  dateFacture: "2023-12-22",
  montantRouge: 2688.92,
});

const contrats = new Set(lignes.map((ligne) => ligne.numeroContrat));
for (const contrat of ["LUC3080", "LUC3080S", "D-BE-281", "DBE498", "DCU498"]) {
  if (!contrats.has(contrat)) throw new Error(`Contrat manquant : ${contrat}`);
}

if (lignes.length !== 42) {
  throw new Error(`42 lignes attendues, ${lignes.length} lues`);
}

for (const ligne of lignes) {
  if (!ligne.nomClient) throw new Error(`Nom vide : ${ligne.numeroContrat}`);
  if (!ligne.numeroContrat) throw new Error("Contrat vide");
  if (ligne.dateFacture && !/^\d{4}-\d{2}-\d{2}$/.test(ligne.dateFacture)) {
    throw new Error(`Date invalide ${ligne.numeroContrat}`);
  }
}

let rejected = false;
try {
  parseListeRouge("pas du rtf");
} catch {
  rejected = true;
}
if (!rejected) throw new Error("Un fichier non RTF aurait dû être rejeté");

console.log(
  JSON.stringify(
    {
      lignes: lignes.length,
      premiere: lignes[0],
      contratsHybrides: ["LUC3080S", "D-BE-281", "DBE498", "DCU498"].map(
        (contrat) => lignes.find((ligne) => ligne.numeroContrat === contrat),
      ),
    },
    null,
    2,
  ),
);
