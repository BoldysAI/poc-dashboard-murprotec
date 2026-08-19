/**
 * Structures de données session (CDC-MURPROTEC-001).
 * Remplies par les routes /api/parse/* — mémoire uniquement.
 */

export type TresorerieSociete = {
  colonne: string;
  marque: string;
  /** Ligne 8 — activité / libellé (distingue les colonnes homonymes) */
  activite: string;
  pays: string;
  soldeCourant: number;
  /** Ligne 43 — total général placements inclus (null → 0) */
  soldeGeneral: number;
  /** Ligne 22 — recettes du mois (null → 0) */
  recettesMois: number;
  /** Ligne 15 — dépenses du mois (null → 0) */
  depensesMois: number;
};

export type TresoreriePays = {
  pays: string;
  montantTotal: number;
};

export type CompositionDepenses = {
  salairesCharges: number;
  impotsTaxes: number;
  fournisseurs: number;
  dividendes: number;
  transfertsInternes: number;
};

export type TresorerieData = {
  parSociete: TresorerieSociete[];
  parPays: TresoreriePays[];
  /** Z27 — position nette hors placements (décision Boldys) */
  positionNette: number;
  /** Z43 */
  totalGeneral: number;
  /** Z45 — ratio tel que lu dans le fichier (ex. 0.49) */
  pctPlacements: number;
  /** Ligne 52, total Z */
  soldeAu1erJanvier: number;
  variationDepuis1erJanvier: number;
  totalRecettes: number;
  totalDepenses: number;
  compositionDepenses: CompositionDepenses;
  fileName: string;
};

/** Fallbacks CDC si la cellule A est vide (liste fermée L7–12). */
export const CA_CATEGORIE_FALLBACKS = [
  "Chimique",
  "Condensation CTA",
  "Condensation DH",
  "Cuvelage",
  "Hydrofugation",
  "Autres",
] as const;

export type CaCategorieFallback = (typeof CA_CATEGORIE_FALLBACKS)[number];

/** @deprecated Prefer string labels from Excel col A — kept for fallbacks */
export type CaCategorie = CaCategorieFallback;

export type RepartitionCA = {
  /** Libellé lu depuis la colonne A du fichier (fallback CDC si vide) */
  categorie: string;
  montant: number;
};

export type TauxCleStatut = "neutral" | "ok" | "warning" | "danger";

export type TauxCle = {
  nom: string;
  valeur: number;
  /** Seuil d'affichage (= max si fourchette) */
  seuil: number | null;
  seuilMin: number | null;
  seuilMax: number | null;
  statut: TauxCleStatut;
  /** true si warning ou danger — compat résumé */
  enDeviation: boolean;
};

export type StructureCharges = {
  technique: number;
  vente: number;
  administration: number;
  /** Ligne 83 — FINANCIER (story mapping vérifié) */
  financier: number;
};

export type CahierCommande = {
  montant: number;
  nbMois: number;
};

export type Impayes = {
  listeRouge: number;
  nbMois: number;
  /** Seuil parsé depuis Chiffres Clés col A (ex. « < 1 mois ») */
  seuil: number;
};

export type EuroCoupon = {
  valeur: number;
  /** Seuil parsé depuis Chiffres Clés col A (pas de valeur en dur) */
  seuil: number;
};

export type SeuilUnite = "%" | "€" | "mois";

export type SeuilIndicateur = {
  indicateur: string;
  /** Borne haute (ou seuil unique) — compat */
  seuil: number;
  seuilMin: number | null;
  seuilMax: number | null;
  unite: SeuilUnite;
};

/**
 * Résultat intermédiaire du parser Chiffres Clés (col F = WAL O).
 * Mappé à plat dans `ReportingData` — ne pas fusionner avec le modèle trésorerie.
 */
export type ChiffresClesData = {
  moisEcoules: number;
  cumulCA: number;
  cumulVentes: number;
  seuils: SeuilIndicateur[];
  cahierCommande: CahierCommande;
  /** Brut — seuil rattaché dans `parseReporting` */
  impayes: Pick<Impayes, "listeRouge" | "nbMois">;
  euroCoupon: number;
};

/** Id de période UI : colonne Excel (B…M) ou vue consolidée. */
export type ReportingMonthId = string;

export const CONSOLIDE_MONTH_ID = "consolide" as const;

export type ReportingMonthMeta = {
  /** Colonne Excel = id UI (ex. "B", "H") */
  id: ReportingMonthId;
  /** En-tête L4 (ex. « Juillet ») */
  label: string;
  col: string;
};

/**
 * Extrait CR d’un mois (mapping CDC, `monthCol` variable).
 * N-1 et Chiffres Clés restent au niveau agence.
 */
export type ReportingMonthSlice = {
  periodeMois: string;
  repartitionCA: RepartitionCA[];
  caTotal: number;
  beneficeBrut: number;
  margeBrute: number;
  tauxClesBase: { nom: string; valeur: number }[];
  structureCharges: StructureCharges;
  profitApresImpots: number;
  fraisFixes: number;
  breakEven: number;
};

/**
 * Agence parseée multi-mois — source de vérité du bundle.
 * La vue écran dérive un `ReportingData` plat via `resolveReportingView`.
 */
export type ReportingAgency = {
  agenceId: string;
  agenceCible: string;
  agenceLibelle: string;
  chiffresClesDisponibles: boolean;
  /** Mois non vides, ordre chronologique B→M */
  months: ReportingMonthMeta[];
  /** Clé = id colonne ("B", …) */
  byMonth: Record<string, ReportingMonthSlice>;
  /** Année déduite du fileName si possible */
  periodeAnnee: number | null;
  beneficeBrutN1: number;
  variationBeneficeBrutVsN1: number;
  variationBeneficeNetVsN1: number;
  moisEcoules: number;
  cumulCA: number;
  seuils: SeuilIndicateur[];
  cahierCommande: CahierCommande;
  impayes: Impayes;
  euroCoupon: EuroCoupon;
  fileName: string;
};

/**
 * Vue plate affichée (mois unitaire ou consolidé) — AT1–AT5 / PDF / brief.
 */
export type ReportingData = {
  /** Nom d’onglet Excel (= id UI) */
  agenceId: string;
  /** Code / libellé court d’affichage onglet (ex. WAL O, Siège) */
  agenceCible: string;
  /** Libellé long en-tête (CK row4 ou nom d’onglet ; WAL O = Frameries) */
  agenceLibelle: string;
  /** true si colonne Chiffres Clés (C–H) disponible pour le pilotage 🔶 */
  chiffresClesDisponibles: boolean;
  /** En-tête mois / libellé consolidé */
  periodeMois: string;
  /** Id période active (`B`…`M` ou `consolide`) */
  monthId: ReportingMonthId;
  /** Année déduite du fileName si possible (ex. 2026) */
  periodeAnnee: number | null;
  repartitionCA: RepartitionCA[];
  caTotal: number;
  /** Bénéfice brut de la période active (mois ou Σ) — CA / charges / alertes. */
  beneficeBrut: number;
  margeBrute: number;
  beneficeBrutN1: number;
  /** Σ bénéfice brut tous mois remplis — tuile « Bénéfice brut ». */
  beneficeBrutConsolide: number;
  /** Σ profit après impôts tous mois remplis — tuile « Bénéfice net ». */
  beneficeNetConsolide: number;
  /** Marge = Σ bénéfice brut / Σ CA. */
  margeBruteConsolide: number;
  /**
   * Bénéfice brut du mois sélectionné ; `null` en vue consolidée.
   */
  beneficeBrutMois: number | null;
  /** Profit après impôts du mois sélectionné ; `null` en vue consolidée. */
  beneficeNetMois: number | null;
  /** Marge brute du mois sélectionné ; `null` en vue consolidée. */
  margeBruteMois: number | null;
  tauxCles: TauxCle[];
  structureCharges: StructureCharges;
  /** Ligne 95 — profit après impôts (mois ou Σ consolidé) */
  profitApresImpots: number;
  fraisFixes: number;
  breakEven: number;
  /** Variation bénéfice brut vs N-1 = P35. Indépendant du mois. */
  variationBeneficeBrutVsN1: number;
  /** Variation bénéfice net vs N-1 = P95. Indépendant du mois. */
  variationBeneficeNetVsN1: number;
  /** Chiffres Clés B4 — mois écoulés (0 si CK indisponible) */
  moisEcoules: number;
  /** Chiffres Clés col agence L6 — cumul CA (0 si CK indisponible) */
  cumulCA: number;
  /** Seuils parsés depuis Chiffres Clés col A (+ libellés col B) */
  seuils: SeuilIndicateur[];
  cahierCommande: CahierCommande;
  impayes: Impayes;
  euroCoupon: EuroCoupon;
  fileName: string;
};

/** Résultat parse multi-agences — une entrée par onglet CR retenu. */
export type ReportingBundle = {
  fileName: string;
  agencies: ReportingAgency[];
};

export type ParseApiError = {
  error: string;
};
