import type { LigneStatut } from "@/types/rapprochement";
import { afficherLigne } from "./format-rapprochement";
import { StatutBadge } from "./StatutBadge";

const COLONNES = [
  "Statut",
  "Client",
  "Contrat / tiers",
  "N° facture",
  "Date",
  "Montant liste rouge",
  "Solde Winbooks",
  "Écart",
] as const;

type ResultatsTableProps = {
  lignes: LigneStatut[] | null;
};

export function ResultatsTable({ lignes }: ResultatsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-primary/10 bg-white">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <caption className="px-4 py-3 text-left text-sm font-semibold text-primary">
          Résultats par ligne
        </caption>
        <thead>
          <tr className="border-b border-primary/10 bg-surface text-left text-xs font-semibold text-primary/80">
            {COLONNES.map((colonne) => (
              <th key={colonne} scope="col" className="px-3 py-2 whitespace-nowrap">
                {colonne}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes === null ? (
            <tr>
              <td colSpan={COLONNES.length} className="px-4 py-8 text-sm text-primary/60">
                Chargez la liste rouge et l’export Winbooks pour afficher le rapprochement.
              </td>
            </tr>
          ) : (
            lignes.map((ligne, index) => {
              const affichee = afficherLigne(ligne);
              return (
                <tr key={index} className="border-b border-primary/5 last:border-b-0">
                  <td className="px-3 py-2">
                    <StatutBadge statut={affichee.statut} />
                  </td>
                  <td className="px-3 py-2 text-primary">{affichee.client}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-primary">{affichee.contrat}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-primary">{affichee.facture}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-primary">{affichee.date}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-primary tabular-nums">
                    {affichee.montantCrm}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-primary tabular-nums">
                    {affichee.solde}
                  </td>
                  <td
                    className={`px-3 py-2 text-right whitespace-nowrap tabular-nums ${
                      affichee.statut === "Not OK" ? "font-semibold text-danger" : "text-primary"
                    }`}
                  >
                    {affichee.ecart}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
