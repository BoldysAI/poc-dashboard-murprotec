/**
 * Dérivation vue reporting (mois unitaire | consolidé) depuis `ReportingAgency`.
 * Spec : docs/superpowers/specs/2026-08-12-reporting-mois-consolide-design.md
 */

import type {
  ReportingAgency,
  ReportingData,
  ReportingMonthId,
  ReportingMonthSlice,
  RepartitionCA,
  SeuilIndicateur,
  StructureCharges,
  TauxCle,
  TauxCleStatut,
} from "@/types/dashboard";
import { CONSOLIDE_MONTH_ID } from "@/types/dashboard";

/** Dernier mois rempli (ordre B→M). */
export function defaultMonthId(agency: ReportingAgency): ReportingMonthId {
  const last = agency.months[agency.months.length - 1];
  if (!last) {
    throw new Error(`Agence « ${agency.agenceId} » sans mois disponible.`);
  }
  return last.id;
}

export function agencyHasMonth(
  agency: ReportingAgency,
  monthId: ReportingMonthId,
): boolean {
  if (monthId === CONSOLIDE_MONTH_ID) return agency.months.length > 0;
  return agency.months.some((m) => m.id === monthId);
}

/** Conserve le mois choisi s’il existe chez la nouvelle agence ; sinon dernier mois. */
export function resolveMonthIdForAgency(
  agency: ReportingAgency,
  preferred: ReportingMonthId | null,
): ReportingMonthId {
  if (preferred && agencyHasMonth(agency, preferred)) return preferred;
  return defaultMonthId(agency);
}

function shortMonthLabel(label: string): string {
  const t = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const map: [RegExp, string][] = [
    [/^janvier/, "jan."],
    [/^fevrier/, "fév."],
    [/^mars/, "mars"],
    [/^avril/, "avr."],
    [/^mai/, "mai"],
    [/^juin/, "juin"],
    [/^juillet/, "juil."],
    [/^aout/, "août"],
    [/^septembre/, "sept."],
    [/^octobre/, "oct."],
    [/^novembre/, "nov."],
    [/^decembre/, "déc."],
  ];
  for (const [re, short] of map) {
    if (re.test(t)) return short;
  }
  return label.trim().slice(0, 4);
}

function consolidéPeriodeLabel(agency: ReportingAgency): string {
  const first = agency.months[0];
  const last = agency.months[agency.months.length - 1];
  if (!first || !last) return "Consolidé";
  if (first.id === last.id) {
    return `Consolidé (${shortMonthLabel(first.label)})`;
  }
  return `Consolidé (${shortMonthLabel(first.label)}–${shortMonthLabel(last.label)})`;
}

function normLabel(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9%]/g, "");
}

const TAUX_SEUIL_ALIASES: {
  test: (n: string) => boolean;
  find: RegExp;
}[] = [
  { test: (x) => x.includes("poseur"), find: /poseur/i },
  { test: (x) => x.includes("publicit"), find: /publicit/i },
  {
    test: (x) => x.includes("commission") && x.includes("facture"),
    find: /vendeur/i,
  },
  {
    test: (x) => x.includes("surveyor") || x.includes("technicien"),
    find: /technicien|surveyor|cout\s*technicien/i,
  },
];

function matchSeuilEntry(
  tauxNom: string,
  seuils: SeuilIndicateur[],
): SeuilIndicateur | null {
  const n = normLabel(tauxNom);
  for (const a of TAUX_SEUIL_ALIASES) {
    if (a.test(n)) {
      const hit = seuils.find((e) => a.find.test(e.indicateur));
      if (hit) return hit;
    }
  }
  const hit = seuils.find((e) => {
    const el = normLabel(e.indicateur);
    return n.includes(el) || el.includes(n.replace(/%/g, ""));
  });
  return hit ?? null;
}

function computeTauxStatut(
  valeur: number,
  entry: SeuilIndicateur | null,
): TauxCleStatut {
  if (!entry) return "neutral";
  const { seuilMin, seuilMax, seuil } = entry;
  if (seuilMin !== null && seuilMax !== null && seuilMin !== seuilMax) {
    if (valeur < seuilMin) return "ok";
    if (valeur <= seuilMax) return "warning";
    return "danger";
  }
  const max = seuilMax ?? seuil;
  return valeur <= max ? "ok" : "danger";
}

export function buildTauxCles(
  base: { nom: string; valeur: number }[],
  seuils: SeuilIndicateur[],
): TauxCle[] {
  return base.map(({ nom, valeur }) => {
    const entry = matchSeuilEntry(nom, seuils);
    const statut = computeTauxStatut(valeur, entry);
    return {
      nom,
      valeur,
      seuil: entry?.seuil ?? null,
      seuilMin: entry?.seuilMin ?? null,
      seuilMax: entry?.seuilMax ?? null,
      statut,
      enDeviation: statut === "warning" || statut === "danger",
    };
  });
}

function agencySlices(agency: ReportingAgency): ReportingMonthSlice[] {
  return agency.months
    .map((m) => agency.byMonth[m.id])
    .filter((s): s is ReportingMonthSlice => s !== undefined);
}

function consolidéMontants(agency: ReportingAgency): {
  beneficeBrut: number;
  profitApresImpots: number;
  margeBrute: number;
} {
  const slices = agencySlices(agency);
  if (slices.length === 0) {
    throw new Error(`Agence « ${agency.agenceId} » sans slice à consolider.`);
  }
  const caTotal = slices.reduce((s, x) => s + x.caTotal, 0);
  const beneficeBrut = slices.reduce((s, x) => s + x.beneficeBrut, 0);
  return {
    beneficeBrut,
    profitApresImpots: slices.reduce((s, x) => s + x.profitApresImpots, 0),
    margeBrute: caTotal !== 0 ? beneficeBrut / caTotal : 0,
  };
}

function sharedAgencyFields(agency: ReportingAgency) {
  const consolide = consolidéMontants(agency);
  return {
    agenceId: agency.agenceId,
    agenceCible: agency.agenceCible,
    agenceLibelle: agency.agenceLibelle,
    chiffresClesDisponibles: agency.chiffresClesDisponibles,
    periodeAnnee: agency.periodeAnnee,
    beneficeBrutN1: agency.beneficeBrutN1,
    variationBeneficeBrutVsN1: agency.variationBeneficeBrutVsN1,
    variationBeneficeNetVsN1: agency.variationBeneficeNetVsN1,
    beneficeBrutConsolide: consolide.beneficeBrut,
    beneficeNetConsolide: consolide.profitApresImpots,
    margeBruteConsolide: consolide.margeBrute,
    moisEcoules: agency.moisEcoules,
    cumulCA: agency.cumulCA,
    seuils: agency.seuils,
    cahierCommande: agency.cahierCommande,
    impayes: agency.impayes,
    euroCoupon: agency.euroCoupon,
    fileName: agency.fileName,
  };
}

function sliceToView(
  agency: ReportingAgency,
  monthId: ReportingMonthId,
  slice: ReportingMonthSlice,
): ReportingData {
  return {
    ...sharedAgencyFields(agency),
    monthId,
    periodeMois: slice.periodeMois,
    repartitionCA: slice.repartitionCA,
    caTotal: slice.caTotal,
    beneficeBrut: slice.beneficeBrut,
    margeBrute: slice.margeBrute,
    beneficeBrutMois: slice.beneficeBrut,
    beneficeNetMois: slice.profitApresImpots,
    margeBruteMois: slice.margeBrute,
    tauxCles: buildTauxCles(slice.tauxClesBase, agency.seuils),
    structureCharges: slice.structureCharges,
    profitApresImpots: slice.profitApresImpots,
    fraisFixes: slice.fraisFixes,
    breakEven: slice.breakEven,
  };
}

function consolidateAgency(agency: ReportingAgency): ReportingData {
  const slices = agencySlices(agency);

  if (slices.length === 0) {
    throw new Error(`Agence « ${agency.agenceId} » sans slice à consolider.`);
  }

  const caTotal = slices.reduce((s, x) => s + x.caTotal, 0);
  const beneficeBrut = slices.reduce((s, x) => s + x.beneficeBrut, 0);
  const margeBrute = caTotal !== 0 ? beneficeBrut / caTotal : 0;

  const categories = slices[0]!.repartitionCA.map((c) => c.categorie);
  const repartitionCA: RepartitionCA[] = categories.map((categorie) => ({
    categorie,
    montant: slices.reduce((s, slice) => {
      const row = slice.repartitionCA.find((r) => r.categorie === categorie);
      return s + (row?.montant ?? 0);
    }, 0),
  }));

  const structureCharges: StructureCharges = {
    technique: slices.reduce((s, x) => s + x.structureCharges.technique, 0),
    vente: slices.reduce((s, x) => s + x.structureCharges.vente, 0),
    administration: slices.reduce(
      (s, x) => s + x.structureCharges.administration,
      0,
    ),
    financier: slices.reduce((s, x) => s + x.structureCharges.financier, 0),
  };

  const n = slices.length;
  const tauxNames = slices[0]!.tauxClesBase.map((t) => t.nom);
  const tauxClesBase = tauxNames.map((nom) => {
    const sum = slices.reduce((s, slice) => {
      const row = slice.tauxClesBase.find((t) => t.nom === nom);
      return s + (row?.valeur ?? 0);
    }, 0);
    return { nom, valeur: sum / n };
  });

  return {
    ...sharedAgencyFields(agency),
    monthId: CONSOLIDE_MONTH_ID,
    periodeMois: consolidéPeriodeLabel(agency),
    repartitionCA,
    caTotal,
    beneficeBrut,
    margeBrute,
    tauxCles: buildTauxCles(tauxClesBase, agency.seuils),
    structureCharges,
    profitApresImpots: slices.reduce((s, x) => s + x.profitApresImpots, 0),
    fraisFixes: slices.reduce((s, x) => s + x.fraisFixes, 0),
    breakEven: slices.reduce((s, x) => s + x.breakEven, 0),
    beneficeBrutMois: null,
    beneficeNetMois: null,
    margeBruteMois: null,
  };
}

/**
 * Vue plate pour l’UI / PDF / brief / alertes.
 * `monthId` invalide → dernier mois rempli.
 */
export function resolveReportingView(
  agency: ReportingAgency,
  monthId: ReportingMonthId | null,
): ReportingData {
  const id = resolveMonthIdForAgency(agency, monthId);
  if (id === CONSOLIDE_MONTH_ID) {
    return consolidateAgency(agency);
  }
  const slice = agency.byMonth[id];
  if (!slice) {
    const fallback = defaultMonthId(agency);
    if (fallback === CONSOLIDE_MONTH_ID) {
      return consolidateAgency(agency);
    }
    return sliceToView(agency, fallback, agency.byMonth[fallback]!);
  }
  return sliceToView(agency, id, slice);
}

/** Toutes les agences projetées sur la même période (alertes / PDF multi). */
export function resolveBundleViews(
  agencies: ReportingAgency[],
  monthId: ReportingMonthId | null,
): ReportingData[] {
  return agencies.map((a) => resolveReportingView(a, monthId));
}
