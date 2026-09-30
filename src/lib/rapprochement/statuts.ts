import type {
  LigneStatut,
  ResultatRapprochement,
  WinbooksLigne,
} from "@/types/rapprochement";

/** Tolérance AT : ± 1 centime. */
const TOLERANCE_CENTIMES = 1;

/**
 * OK si les deux côtés sont là et |montant CRM − solde Winbooks| ≤ 1 centime.
 * Not OK si les deux côtés sont là et l'écart dépasse 1 centime.
 * Non apparié si la ligne n'existe que d'un côté.
 * Le solde Winbooks d'une paire est la somme des écritures liées.
 */
export function attribuerStatuts(resultat: ResultatRapprochement): LigneStatut[] {
  const lignes: LigneStatut[] = [];

  for (const paire of resultat.paires) {
    const montantCrm = paire.crm.montantRouge;
    const soldeWinbooks = sommeSoldes(paire.winbooks);
    if (montantCrm == null) {
      lignes.push({
        statut: "Not OK",
        ecart: null,
        montantCrm: null,
        soldeWinbooks,
        crm: paire.crm,
        winbooks: paire.winbooks,
        identifiant: paire.identifiant,
      });
      continue;
    }
    const ecartCentimes = cents(montantCrm) - cents(soldeWinbooks);
    lignes.push({
      statut: Math.abs(ecartCentimes) <= TOLERANCE_CENTIMES ? "OK" : "Not OK",
      ecart: ecartCentimes / 100,
      montantCrm,
      soldeWinbooks,
      crm: paire.crm,
      winbooks: paire.winbooks,
      identifiant: paire.identifiant,
    });
  }

  for (const crm of resultat.crmSansCorrespondance) {
    lignes.push({
      statut: "Non apparié",
      ecart: null,
      montantCrm: crm.montantRouge,
      soldeWinbooks: null,
      crm,
      winbooks: [],
      identifiant: null,
    });
  }

  for (const winbooks of resultat.winbooksSansCorrespondance) {
    lignes.push({
      statut: "Non apparié",
      ecart: null,
      montantCrm: null,
      soldeWinbooks: winbooks.solde,
      crm: null,
      winbooks: [winbooks],
      identifiant: null,
    });
  }

  return lignes;
}

function sommeSoldes(lignes: WinbooksLigne[]): number {
  const total = lignes.reduce((somme, ligne) => somme + cents(ligne.solde), 0);
  return total / 100;
}

function cents(valeur: number): number {
  return Math.round(valeur * 100);
}
