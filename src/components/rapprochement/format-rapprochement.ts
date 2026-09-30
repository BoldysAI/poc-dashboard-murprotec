import type { LigneStatut } from "@/types/rapprochement";

const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEurCentimes(value: number): string {
  return eur.format(value);
}

export function formatEcart(value: number | null): string {
  if (value === null) return "—";
  const formatted = eur.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

export function formatDateFr(iso: string | null): string {
  if (!iso) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function joinUnique(values: (string | null)[]): string | null {
  const unique = [...new Set(values.filter((value): value is string => Boolean(value)))];
  return unique.length > 0 ? unique.join(", ") : null;
}

export type LigneAffichee = {
  statut: LigneStatut["statut"];
  client: string;
  contrat: string;
  facture: string;
  date: string;
  montantCrm: string;
  solde: string;
  ecart: string;
};

export function afficherLigne(ligne: LigneStatut): LigneAffichee {
  const crm = ligne.crm;
  const documents = joinUnique(ligne.winbooks.map((item) => item.numeroDocument));
  const dates = joinUnique(ligne.winbooks.map((item) => item.dateDocument));
  const tiers = joinUnique(ligne.winbooks.map((item) => item.numeroTiers));

  return {
    statut: ligne.statut,
    client: crm?.nomClient ?? "—",
    contrat: crm?.numeroContrat ?? tiers ?? "—",
    facture: crm?.numeroFacture ?? documents ?? "—",
    date: formatDateFr(crm?.dateFacture ?? (dates && !dates.includes(", ") ? dates : null)),
    montantCrm: ligne.montantCrm === null ? "—" : formatEurCentimes(ligne.montantCrm),
    solde: ligne.soldeWinbooks === null ? "—" : formatEurCentimes(ligne.soldeWinbooks),
    ecart: formatEcart(ligne.ecart),
  };
}
