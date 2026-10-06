import type { LigneStatut, StatutRapprochement } from "@/types/rapprochement";
import { afficherLigne } from "./format-rapprochement";

const ORDRE_STATUT: StatutRapprochement[] = ["OK", "Not OK", "Non apparié"];

type RapprochementPrintSheetProps = {
  lignes: LigneStatut[];
  /** Statuts cochés pour cet export. Indépendant du filtre du tableau. */
  statuts: StatutRapprochement[];
  crmFileName: string;
  winbooksFileName: string;
};

/**
 * Feuille d’impression des statuts choisis.
 * Invisible à l’écran (`hidden print:block`).
 */
export function RapprochementPrintSheet({
  lignes,
  statuts,
  crmFileName,
  winbooksFileName,
}: RapprochementPrintSheetProps) {
  const retenus = ORDRE_STATUT.filter((statut) => statuts.includes(statut));
  const ecarts = lignes.filter((ligne) => retenus.includes(ligne.statut));
  const meta =
    retenus.length === 0
      ? "Aucun statut retenu pour cet export."
      : retenus
          .map((statut) => `${ecarts.filter((ligne) => ligne.statut === statut).length} ${statut}`)
          .join(" · ");

  return (
    <section id="rapprochement-print-sheet" className="hidden print:block">
      <header className="print-banner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo_murpro_group.png"
          alt="Murpro Group"
          width={275}
          height={54}
          className="print-banner-logo"
        />
        <div className="print-banner-text">
          <h1>Rapprochement impayés — écarts</h1>
          <p>
            {crmFileName} · {winbooksFileName}
          </p>
        </div>
      </header>
      <p className="print-synthese-meta">{meta}</p>
      {ecarts.length === 0 ? (
        <p>Aucune ligne ne correspond aux statuts retenus pour cet export.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Statut</th>
              <th>Client</th>
              <th>Contrat / tiers</th>
              <th>N° facture</th>
              <th>Date</th>
              <th className="num">Montant liste rouge</th>
              <th className="num">Solde Winbooks</th>
              <th className="num">Écart</th>
            </tr>
          </thead>
          <tbody>
            {ecarts.map((ligne, index) => {
              const affichee = afficherLigne(ligne);
              const statutClass =
                affichee.statut === "OK"
                  ? "statut-ok"
                  : affichee.statut === "Not OK"
                    ? "statut-not-ok"
                    : "statut-non";
              return (
                <tr key={index}>
                  <td className={statutClass}>{affichee.statut}</td>
                  <td>{affichee.client}</td>
                  <td>{affichee.contrat}</td>
                  <td>{affichee.facture}</td>
                  <td>{affichee.date}</td>
                  <td className="num">{affichee.montantCrm}</td>
                  <td className="num">{affichee.solde}</td>
                  <td className="num">{affichee.ecart}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
