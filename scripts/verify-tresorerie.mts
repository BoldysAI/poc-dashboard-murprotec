/**
 * Vérification one-shot du parser trésorerie sur le fichier réel.
 * Usage : npx tsx scripts/verify-tresorerie.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseTresorerie } from "../src/lib/excel/parse-tresorerie";
import {
  detectLastCompanyColumn,
  getSheet,
} from "../src/lib/excel/sheet-utils";
import { readWorkbook } from "../src/lib/excel/read-workbook";

const assetPath = resolve(
  process.cwd(),
  "docs/assets/TRESOR 30 06 2026 Boldys.xls",
);

const buffer = readFileSync(assetPath);
const fileName = "TRESOR 30 06 2026 Boldys.xls";
const data = parseTresorerie(buffer, fileName);

const workbook = readWorkbook(buffer);
const sheet = getSheet(workbook, "Tresorerie");
const lastCompanyCol = detectLastCompanyColumn(sheet);

const paysSum = data.parPays.reduce((s, p) => s + p.montantTotal, 0);
const societeSumGeneral = data.parSociete.reduce(
  (s, c) => s + c.soldeGeneral,
  0,
);
const recettesSocietesSum = data.parSociete.reduce(
  (s, c) => s + c.recettesMois,
  0,
);
const depensesSocietesSum = data.parSociete.reduce(
  (s, c) => s + c.depensesMois,
  0,
);

const espagneSocietes = data.parSociete.filter((s) => s.pays === "ESPAGNE");
const espagneSoldeGeneralSum = espagneSocietes.reduce(
  (s, c) => s + c.soldeGeneral,
  0,
);

const summary = {
  fileName: data.fileName,
  lastCompanyCol,
  europeIsNotLastCompany: lastCompanyCol !== "Z",
  parSocieteCount: data.parSociete.length,
  positionNette: data.positionNette,
  totalGeneral: data.totalGeneral,
  pctPlacements: data.pctPlacements,
  soldeAu1erJanvier: data.soldeAu1erJanvier,
  variationDepuis1erJanvier: data.variationDepuis1erJanvier,
  variationCheck: data.totalGeneral - data.soldeAu1erJanvier,
  totalRecettes: data.totalRecettes,
  totalDepenses: data.totalDepenses,
  recettesSocietesSum,
  depensesSocietesSum,
  compositionDepenses: data.compositionDepenses,
  compositionSum:
    data.compositionDepenses.salairesCharges +
    data.compositionDepenses.impotsTaxes +
    data.compositionDepenses.fournisseurs +
    data.compositionDepenses.dividendes +
    data.compositionDepenses.transfertsInternes,
  parPays: data.parPays,
  paysSumEqualsSocieteSumGeneral: Math.abs(paysSum - societeSumGeneral) < 1e-6,
  paysSum,
  societeSumGeneral,
  espagneSoldeGeneralSum,
  parSocieteSample: data.parSociete.slice(0, 5),
};

console.log(JSON.stringify(summary, null, 2));

const espagne = data.parPays.find((p) => p.pays === "ESPAGNE");
const asserts: [string, boolean][] = [
  ["lastCompanyCol !== Z (colonnes dynamiques)", lastCompanyCol !== "Z"],
  ["au moins 1 société", data.parSociete.length > 0],
  [
    "variation = Z43 − Z52",
    data.variationDepuis1erJanvier ===
      data.totalGeneral - data.soldeAu1erJanvier,
  ],
  [
    "variation attendue fichier ref (1234587.87)",
    Math.abs(data.variationDepuis1erJanvier - 1234587.87) < 0.01,
  ],
  [
    "parPays agrège soldeGeneral (L43)",
    Math.abs(paysSum - societeSumGeneral) < 1e-6,
  ],
  [
    "totaux Z alignés Excel (Z15/Z22/Z27/Z43)",
    data.totalDepenses === 897 &&
      data.totalRecettes === 483000 &&
      data.positionNette === 735103 &&
      data.totalGeneral === 1443181,
  ],
  [
    "composition Z16–20 + somme = Z15",
    data.compositionDepenses.salairesCharges === 276 &&
      data.compositionDepenses.impotsTaxes === 299 &&
      data.compositionDepenses.fournisseurs === 322 &&
      data.compositionDepenses.dividendes === 0 &&
      data.compositionDepenses.transfertsInternes === 0 &&
      summary.compositionSum === data.totalDepenses,
  ],
  [
    "ESPAGNE unique (casse normalisée) + L43",
    !!espagne &&
      !data.parPays.some((p) => p.pays === "Espagne") &&
      Math.abs(espagne.montantTotal - espagneSoldeGeneralSum) < 1e-6 &&
      espagneSocietes.length > 0,
  ],
  [
    "parSociete expose recettesMois / depensesMois / soldeGeneral",
    data.parSociete.every(
      (s) =>
        typeof s.recettesMois === "number" &&
        typeof s.depensesMois === "number" &&
        typeof s.soldeGeneral === "number",
    ),
  ],
];

let failed = 0;
for (const [label, ok] of asserts) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.error(`OK:   ${label}`);
  }
}

if (failed > 0) {
  process.exit(1);
}
