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
} catch (error) {
  rejected = true;
  const message = error instanceof Error ? error.message : "";
  if (!message.includes("liste rouge") || !message.includes("liste d'attente")) {
    throw new Error(`Message non RTF inattendu : ${message}`);
  }
}
if (!rejected) throw new Error("Un fichier non RTF aurait dû être rejeté");

let foreign = false;
try {
  parseListeRouge("{\\rtf1 sans en-têtes}");
} catch (error) {
  foreign = true;
  const message = error instanceof Error ? error.message : "";
  if (!message.includes("liste rouge") || !message.includes("liste d'attente")) {
    throw new Error(`Message en-têtes inattendu : ${message}`);
  }
}
if (!foreign) throw new Error("Un RTF sans les deux jeux d'en-têtes aurait dû être rejeté");

const attente = parseListeRouge(
  new TextDecoder("windows-1252").decode(
    readFileSync(resolve(process.cwd(), "exemplaires/LISTE ATT POSE PAR CONTRAT.doc")),
  ),
);
if (attente.length !== 133) {
  throw new Error(`133 lignes d'attente attendues, ${attente.length} lues`);
}

assertLigne(attente[0], {
  nomClient: "SA SEL",
  numeroContrat: "000000000011075",
  numeroFacture: null,
  dateFacture: "2026-06-11",
  montantRouge: 6468.62,
});
assertLigne(
  attente.find((ligne) => ligne.numeroContrat === "11127EC"),
  {
    nomClient: "MOMIN SYLVAIN",
    numeroContrat: "11127EC",
    numeroFacture: null,
    dateFacture: "2026-03-24",
    montantRouge: 1126.26,
  },
);
assertLigne(
  attente.find((ligne) => ligne.numeroContrat === "D-BE-197"),
  {
    nomClient: "KINSCH GILBERT",
    numeroContrat: "D-BE-197",
    numeroFacture: null,
    dateFacture: "2025-09-26",
    montantRouge: 872.12,
  },
);
assertLigne(
  attente.find((ligne) => ligne.numeroContrat === "DBE338"),
  {
    nomClient: "SPRIET MICHELE",
    numeroContrat: "DBE338",
    numeroFacture: null,
    dateFacture: "2025-12-16",
    montantRouge: 3682.48,
  },
);

const cents = attente.reduce((somme, ligne) => somme + Math.round((ligne.montantRouge ?? 0) * 100), 0);
if (cents !== 73844060) {
  throw new Error(`Somme des montants ${cents / 100}, attendu 738440.60`);
}
for (const ligne of attente) {
  if (!ligne.nomClient || !ligne.numeroContrat || !ligne.dateFacture || ligne.montantRouge == null) {
    throw new Error(`Ligne incomplète ${ligne.numeroContrat}`);
  }
  if (ligne.numeroContrat.startsWith("Pose") || ligne.numeroFacture !== null) {
    throw new Error(`Champ inattendu sur ${ligne.numeroContrat}`);
  }
}

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
