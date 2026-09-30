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

/**
 * Rapproche chaque ligne CRM aux écritures Winbooks de même identifiant.
 * Si plusieurs contrats portent le même nom client, la facture puis la date
 * départagent les écritures de cet identifiant.
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

function nomCle(nom: string): string {
  return nom.trim().replace(/\s+/g, " ").toUpperCase();
}
