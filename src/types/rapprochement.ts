/**
 * Ligne CRM « liste rouge » — CDC-MURPROTECLUX-002.
 * Lecture seule du fichier Word/RTF. Pas de rapprochement ici.
 */

export type CrmListeRougeLigne = {
  /** Libellé client (pas le code numérique à gauche). */
  nomClient: string;
  /** Contrat tel que dans le fichier, préfixe pays inclus (ex. LUA4049, D-BE-281). */
  numeroContrat: string;
  /** Colonne « No facture ». Absente → null. */
  numeroFacture: string | null;
  /** Colonne « Date », ISO AAAA-MM-JJ. Absente → null. */
  dateFacture: string | null;
  /** Colonne « Mnt rouge ». Absente → null. */
  montantRouge: number | null;
};

/**
 * Ligne Winbooks « postes ouverts clients » — CDC-MURPROTECLUX-002.
 * Une ligne du fichier = une ligne ici (pas de cumul par tiers).
 */
export type WinbooksLigne = {
  /** Colonne « Réf client », espaces de fin retirés (10599, LUD542, 241F1). */
  numeroTiers: string;
  /**
   * Débit(debN) − Crédit(credN).
   * Pas de colonne Solde dans l'export : un crédit seul donne un solde négatif.
   */
  solde: number;
  /** Colonne « Document(docnr) ». Absente → null. */
  numeroDocument: string | null;
  /** Colonne « Date(date) », ISO AAAA-MM-JJ. Absente → null. */
  dateDocument: string | null;
};

/** Lien entre une ligne CRM et les écritures Winbooks retenues. */
export type PaireRapprochee = {
  crm: CrmListeRougeLigne;
  /** Partie numérique du contrat, zéros de tête retirés (BE487 → 487, LUC3080S → 3080). */
  identifiant: string;
  /** identifiant seul, ou facture / date si plusieurs contrats portent le même nom client. */
  critere: "identifiant" | "facture" | "date";
  winbooks: WinbooksLigne[];
};

export type ResultatRapprochement = {
  paires: PaireRapprochee[];
  crmSansCorrespondance: CrmListeRougeLigne[];
  winbooksSansCorrespondance: WinbooksLigne[];
};

/** Décision Boldys 23/09/2026 : troisième statut, en plus de OK / Not OK. */
export type StatutRapprochement = "OK" | "Not OK" | "Non apparié";

export type LigneStatut = {
  statut: StatutRapprochement;
  /**
   * Montant CRM − solde Winbooks retenu (somme des écritures liées).
   * Null pour Non apparié, ou si le montant CRM est absent.
   */
  ecart: number | null;
  montantCrm: number | null;
  soldeWinbooks: number | null;
  crm: CrmListeRougeLigne | null;
  winbooks: WinbooksLigne[];
  identifiant: string | null;
};
