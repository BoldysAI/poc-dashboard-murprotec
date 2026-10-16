/**
 * Statuts OK / Not OK / Non apparié sur l'exemplaire.
 * Usage : npx tsx scripts/verify-statuts.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseListeRouge } from "../src/lib/crm/parse-liste-rouge";
import { attribuerStatuts } from "../src/lib/rapprochement/statuts";
import { rapprocher } from "../src/lib/rapprochement/rapprocher";
import { parseWinbooks } from "../src/lib/winbooks/parse-winbooks";
import type { CrmListeRougeLigne, WinbooksLigne } from "../src/types/rapprochement";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const crm = parseListeRouge(
  new TextDecoder("windows-1252").decode(
    readFileSync(resolve("exemplaires/LISTE ROUGE PAR DATE POSE.doc")),
  ),
);
const winbooks = parseWinbooks(
  readFileSync(resolve("exemplaires/MURPROLUX Historique clients  30 06 2026.xls")),
);
const lignes = attribuerStatuts(rapprocher(crm, winbooks));

const compte = (statut: string) => lignes.filter((ligne) => ligne.statut === statut).length;
assert(compte("OK") === 37, `OK ${compte("OK")}`);
assert(compte("Not OK") === 2, `Not OK ${compte("Not OK")}`);
assert(compte("Non apparié") === 140, `Non apparié ${compte("Non apparié")}`);

const be487 = lignes.find((ligne) => ligne.crm?.numeroContrat === "D-BE-487");
assert(be487?.statut === "OK" && be487.ecart === 0 && be487.soldeWinbooks === 11469.33, "D-BE-487");

const plusieurs = lignes.find((ligne) => ligne.crm?.numeroContrat === "LUC3137");
assert(plusieurs?.statut === "OK" && plusieurs.winbooks.length === 5 && plusieurs.ecart === 0, "somme");

const notOk = lignes.find((ligne) => ligne.crm?.numeroContrat === "LUC2837");
assert(notOk?.statut === "Not OK" && notOk.ecart === 895.12 && notOk.winbooks.length === 4, "LUC2837");

for (const contrat of [
  "LUC3080",
  "LUC3080S",
  "LUA4190",
  "LUA4587",
  "LUA4678",
  "LUC3454",
  "LUC3230",
  "DBE188",
  "DCU188",
  "DBE498",
  "DCU498",
  "D-CU-281",
  "D-CU-445",
  "000000000011071",
]) {
  const ligne = lignes.find((item) => item.crm?.numeroContrat === contrat);
  assert(ligne?.statut === "OK" && ligne.ecart === 0, `${contrat} OK`);
}

const dbe534 = lignes.find((ligne) => ligne.crm?.numeroContrat === "DBE534");
assert(dbe534?.statut === "OK" && dbe534.winbooks.length === 1, "DBE534 sans l'écriture en plus");
assert(
  lignes.some(
    (ligne) =>
      ligne.statut === "Non apparié" &&
      ligne.winbooks[0]?.numeroTiers === "DBE534" &&
      ligne.winbooks[0]?.numeroDocument === "10246782",
  ),
  "DBE534 écriture libre",
);

for (const contrat of ["LUA4049", "LUC2836", "LUA4154"]) {
  const ligne = lignes.find((item) => item.crm?.numeroContrat === contrat);
  assert(ligne?.statut === "Non apparié" && ligne.winbooks.length === 0, contrat);
}

const seulCrm = lignes.find((ligne) => ligne.crm?.numeroContrat === "LUA4049");
assert(seulCrm?.statut === "Non apparié" && seulCrm.ecart === null && seulCrm.winbooks.length === 0, "LUA4049");

const seulWin = lignes.find(
  (ligne) => ligne.crm === null && ligne.winbooks[0]?.numeroTiers === "10599",
);
assert(seulWin?.statut === "Non apparié" && seulWin.montantCrm === null, "10599");

const crmSeuil: CrmListeRougeLigne = {
  nomClient: "SEUIL",
  numeroContrat: "BE1",
  numeroFacture: null,
  dateFacture: null,
  montantRouge: 10,
};
const winSeuil = (solde: number): WinbooksLigne => ({
  numeroTiers: "1",
  solde,
  numeroDocument: null,
  dateDocument: null,
});
const aUnCentime = attribuerStatuts(rapprocher([crmSeuil], [winSeuil(10.01)]));
const aDeuxCentimes = attribuerStatuts(rapprocher([crmSeuil], [winSeuil(9.98)]));
assert(aUnCentime[0]?.statut === "OK" && aUnCentime[0].ecart === -0.01, "±1 centime");
assert(aDeuxCentimes[0]?.statut === "Not OK" && aDeuxCentimes[0].ecart === 0.02, "2 centimes");

console.log(
  JSON.stringify(
    { OK: compte("OK"), "Not OK": compte("Not OK"), "Non apparié": compte("Non apparié") },
    null,
    2,
  ),
);
