/**
 * Normalisation + rapprochement CRM × Winbooks sur l'exemplaire.
 * Usage : npx tsx scripts/verify-rapprochement.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseListeRouge } from "../src/lib/crm/parse-liste-rouge";
import { identifiantNormalise, rapprocher } from "../src/lib/rapprochement/rapprocher";
import { parseWinbooks } from "../src/lib/winbooks/parse-winbooks";
import type { CrmListeRougeLigne, WinbooksLigne } from "../src/types/rapprochement";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(identifiantNormalise("BE487") === "487", "BE487");
assert(identifiantNormalise("D-BE-281") === "281", "D-BE-281");
assert(identifiantNormalise("LUC3080S") === "3080", "LUC3080S");
assert(identifiantNormalise("000000000011071") === "11071", "zéros");
assert(identifiantNormalise("241F1") === "241", "241F1");

const crm = parseListeRouge(
  new TextDecoder("windows-1252").decode(
    readFileSync(resolve("exemplaires/LISTE ROUGE PAR DATE POSE.doc")),
  ),
);
const winbooks = parseWinbooks(
  readFileSync(resolve("exemplaires/MURPROLUX Historique clients  30 06 2026.xls")),
);
const resultat = rapprocher(crm, winbooks);

const sans = resultat.crmSansCorrespondance.map((ligne) => ligne.numeroContrat);
assert(
  sans.join(",") === "LUA4049,LUC2836,LUA4154",
  `sans correspondance : ${sans.join(",")}`,
);

const be487 = resultat.paires.find((paire) => paire.crm.numeroContrat === "D-BE-487");
assert(be487?.identifiant === "487" && be487.critere === "identifiant", "D-BE-487");
assert(be487?.winbooks.length === 1 && be487.winbooks[0].numeroDocument === "10246776", "doc 487");

const luc3080 = resultat.paires.find((paire) => paire.crm.numeroContrat === "LUC3080");
const luc3080s = resultat.paires.find((paire) => paire.crm.numeroContrat === "LUC3080S");
assert(luc3080?.critere === "facture" && luc3080.winbooks[0]?.numeroDocument === "10245621", "LUC3080");
assert(luc3080?.winbooks.some((ligne) => ligne.numeroDocument === "19"), "LUC3080 acompte");
assert(
  luc3080?.winbooks.every((ligne) => ligne.numeroTiers === "LUC3080"),
  "LUC3080 ne prend pas LUC3080S",
);
assert(luc3080s?.critere === "facture" && luc3080s.winbooks[0]?.numeroDocument === "10245632", "LUC3080S");
assert(luc3080s?.winbooks.every((ligne) => ligne.numeroTiers === "LUC3080S"), "LUC3080S isolé");

const chatar = resultat.paires.find((paire) => paire.crm.numeroContrat === "D-BE-529");
assert(chatar?.critere === "identifiant" && chatar.winbooks.length === 2, "CHATAR deux écritures");

const vus = new Set<WinbooksLigne>();
for (const paire of resultat.paires) {
  for (const ligne of paire.winbooks) {
    assert(!vus.has(ligne), `écriture en double ${ligne.numeroTiers}`);
    vus.add(ligne);
  }
}

const dateCrm: CrmListeRougeLigne = {
  nomClient: "DUPONT",
  numeroContrat: "BE10",
  numeroFacture: "ABSENT",
  dateFacture: "2026-02-02",
  montantRouge: 10,
};
const dateCrm2: CrmListeRougeLigne = {
  nomClient: "DUPONT",
  numeroContrat: "CU10",
  numeroFacture: "ABSENT",
  dateFacture: "2026-03-03",
  montantRouge: 20,
};
const dateWin: WinbooksLigne[] = [
  { numeroTiers: "10", solde: 10, numeroDocument: "A", dateDocument: "2026-02-02" },
  { numeroTiers: "10", solde: 20, numeroDocument: "B", dateDocument: "2026-03-03" },
];
const parDate = rapprocher([dateCrm, dateCrm2], dateWin);
assert(parDate.paires.length === 2, "secours date");
assert(parDate.paires.every((paire) => paire.critere === "date"), "critere date");
assert(parDate.paires[0]?.winbooks[0]?.numeroDocument === "A", "date A");
assert(parDate.paires[1]?.winbooks[0]?.numeroDocument === "B", "date B");

console.log(
  JSON.stringify(
    {
      paires: resultat.paires.length,
      crmSansCorrespondance: sans,
      winbooksSansCorrespondance: resultat.winbooksSansCorrespondance.length,
      be487: be487?.identifiant,
      luc3080: luc3080?.winbooks[0]?.numeroDocument,
      luc3080s: luc3080s?.winbooks[0]?.numeroDocument,
    },
    null,
    2,
  ),
);
