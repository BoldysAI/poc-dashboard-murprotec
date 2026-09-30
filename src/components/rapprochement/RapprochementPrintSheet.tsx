import type { LigneStatut } from "@/types/rapprochement";
import { afficherLigne } from "./format-rapprochement";

type RapprochementPrintSheetProps = {
  lignes: LigneStatut[];
  crmFileName: string;
  winbooksFileName: string;
};

/**
 * Feuille d’impression : uniquement Not OK et Non apparié.
 * Invisible à l’écran (`hidden print:block`).
 */
export function RapprochementPrintSheet({
  lignes,
  crmFileName,
  winbooksFileName,
}: RapprochementPrintSheetProps) {
  const ecarts = lignes.filter((ligne) => ligne.statut !== "OK");
  const notOk = ecarts.filter((ligne) => ligne.statut === "Not OK").length;
  const nonApparie = ecarts.length - notOk;

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
      <p className="print-synthese-meta">
        {notOk} Not OK · {nonApparie} Non apparié. Les lignes OK ne figurent pas dans cette
        synthèse.
      </p>
      {ecarts.length === 0 ? (
        <p>Tous les contrats rapprochés sont dans la tolérance d’un centime.</p>
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
                affichee.statut === "Not OK" ? "statut-not-ok" : "statut-non";
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
