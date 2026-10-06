import type {
  CrmListeRougeLigne,
  PaireRapprochee,
  ResultatRapprochement,
  WinbooksLigne,
} from "@/types/rapprochement";

/**
 * Partie numérique utilisée pour la correspondance.
 * BE487 → 487, D-BE-281 → 281, LUC3080S → 3080, 000000000011071 → 11071.
 * Premier groupe de chiffres, zéros de tête retirés.
 */
export function identifiantNormalise(valeur: string): string | null {
  const match = /\d+/.exec(valeur);
  if (!match) return null;
  return match[0].replace(/^0+/, "") || "0";
}

/** Même seuil que les statuts : une facture déjà juste ne reçoit pas d'écriture en plus. */
const TOLERANCE_CENTIMES = 1;

/**
 * Rapproche chaque ligne CRM aux écritures Winbooks de même identifiant.
 * Si plusieurs contrats portent le même nom client, la facture puis la date
 * désignent le compte. Les autres écritures ouvertes de ce numéro de tiers
 * sont alors ajoutées, sauf si la facture tombe déjà juste.
 * Deux contrats qui ne partagent que la partie numérique (LUC3080 / LUC3080S)
 * ne reçoivent pas les écritures l'un de l'autre.
 */
export function rapprocher(
  crmLignes: CrmListeRougeLigne[],
  winbooksLignes: WinbooksLigne[],
): ResultatRapprochement {
  const parIdentifiant = new Map<string, number[]>();
  winbooksLignes.forEach((ligne, index) => {
    const id = identifiantNormalise(ligne.numeroTiers);
    if (!id) return;
    const list = parIdentifiant.get(id);
    if (list) list.push(index);
    else parIdentifiant.set(id, [index]);
  });

  const contratsParNom = new Map<string, number>();
  for (const ligne of crmLignes) {
    const nom = nomCle(ligne.nomClient);
    contratsParNom.set(nom, (contratsParNom.get(nom) ?? 0) + 1);
  }

  const utilisés = new Set<number>();
  const paires: PaireRapprochee[] = [];
  const crmSansCorrespondance: CrmListeRougeLigne[] = [];

  for (const crm of crmLignes) {
    const identifiant = identifiantNormalise(crm.numeroContrat);
    const indexes = identifiant ? (parIdentifiant.get(identifiant) ?? []) : [];
    const libres = indexes.filter((index) => !utilisés.has(index));
    const ambigu = (contratsParNom.get(nomCle(crm.nomClient)) ?? 0) > 1;
    const retenu = ambigu
      ? departager(crm, libres, winbooksLignes)
      : libres.length > 0
        ? { critere: "identifiant" as const, indexes: libres }
        : null;

    if (!identifiant || !retenu || retenu.indexes.length === 0) {
      crmSansCorrespondance.push(crm);
      continue;
    }
    for (const index of retenu.indexes) utilisés.add(index);
    paires.push({
      crm,
      identifiant,
      critere: retenu.critere,
      winbooks: retenu.indexes.map((index) => winbooksLignes[index]),
    });
  }

  rattacherEcrituresOuvertes(paires, winbooksLignes, utilisés);

  const winbooksSansCorrespondance = winbooksLignes.filter((_, index) => !utilisés.has(index));
  return { paires, crmSansCorrespondance, winbooksSansCorrespondance };
}

function departager(
  crm: CrmListeRougeLigne,
  indexes: number[],
  winbooksLignes: WinbooksLigne[],
): { critere: "facture" | "date"; indexes: number[] } | null {
  if (crm.numeroFacture) {
    const parFacture = indexes.filter(
      (index) => winbooksLignes[index].numeroDocument === crm.numeroFacture,
    );
    if (parFacture.length > 0) return { critere: "facture", indexes: parFacture };
  }
  if (crm.dateFacture) {
    const parDate = indexes.filter(
      (index) => winbooksLignes[index].dateDocument === crm.dateFacture,
    );
    if (parDate.length > 0) return { critere: "date", indexes: parDate };
  }
  return null;
}

/**
 * Après le lien facture / date, reprend les écritures encore libres du même
 * numéro de tiers exact. Un compte déjà à ± 1 centime n'est pas modifié.
 * Si deux contrats Not OK portent le même numéro, l'écriture reste libre.
 */
function rattacherEcrituresOuvertes(
  paires: PaireRapprochee[],
  winbooksLignes: WinbooksLigne[],
  utilisés: Set<number>,
): void {
  const notOkParTiers = new Map<string, PaireRapprochee[]>();
  for (const paire of paires) {
    if (estEquilibre(paire.crm, paire.winbooks)) continue;
    for (const tiers of new Set(paire.winbooks.map((ligne) => ligne.numeroTiers))) {
      const list = notOkParTiers.get(tiers);
      if (list) list.push(paire);
      else notOkParTiers.set(tiers, [paire]);
    }
  }

  winbooksLignes.forEach((ligne, index) => {
    if (utilisés.has(index)) return;
    const candidats = notOkParTiers.get(ligne.numeroTiers);
    if (!candidats || candidats.length !== 1) return;
    candidats[0].winbooks.push(ligne);
    utilisés.add(index);
  });
}

function estEquilibre(crm: CrmListeRougeLigne, lignes: WinbooksLigne[]): boolean {
  if (crm.montantRouge == null) return false;
  const solde = lignes.reduce((somme, ligne) => somme + Math.round(ligne.solde * 100), 0);
  const ecart = Math.round(crm.montantRouge * 100) - solde;
  return Math.abs(ecart) <= TOLERANCE_CENTIMES;
}

function nomCle(nom: string): string {
  return nom.trim().replace(/\s+/g, " ").toUpperCase();
}
