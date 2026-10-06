"use client";

import { useMemo, useState } from "react";
import type { LigneStatut, StatutRapprochement } from "@/types/rapprochement";
import { afficherLigne } from "./format-rapprochement";
import { StatutBadge } from "./StatutBadge";

const STATUTS: StatutRapprochement[] = ["OK", "Not OK", "Non apparié"];

const ORDRE_STATUT: Record<StatutRapprochement, number> = {
  OK: 0,
  "Not OK": 1,
  "Non apparié": 2,
};

type CleTri = "statut" | "client" | "contrat" | "date" | "montant" | "solde" | "ecart";
type SensTri = "asc" | "desc";

type Colonne = {
  id: string;
  label: string;
  tri: CleTri | null;
  align: "left" | "right";
};

const COLONNES: Colonne[] = [
  { id: "statut", label: "Statut", tri: "statut", align: "left" },
  { id: "client", label: "Client", tri: "client", align: "left" },
  { id: "contrat", label: "Contrat / tiers", tri: "contrat", align: "left" },
  { id: "facture", label: "N° facture", tri: null, align: "left" },
  { id: "date", label: "Date", tri: "date", align: "left" },
  { id: "montant", label: "Montant liste rouge", tri: "montant", align: "right" },
  { id: "solde", label: "Solde Winbooks", tri: "solde", align: "right" },
  { id: "ecart", label: "Écart", tri: "ecart", align: "right" },
];

const INPUT_CLASS =
  "min-h-11 w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40";

type ResultatsTableProps = {
  lignes: LigneStatut[] | null;
};

export function ResultatsTable({ lignes }: ResultatsTableProps) {
  const [statut, setStatut] = useState<StatutRapprochement | "">("");
  const [client, setClient] = useState("");
  const [contrat, setContrat] = useState("");
  const [facture, setFacture] = useState("");
  const [tri, setTri] = useState<{ cle: CleTri; sens: SensTri } | null>(null);

  const visibles = useMemo(() => {
    if (!lignes) return [];
    const filtreClient = plier(client);
    const filtreContrat = plier(contrat);
    const filtreFacture = plier(facture);
    const retenues = lignes
      .map((ligne, index) => ({ ligne, index }))
      .filter(({ ligne }) => {
        if (statut && ligne.statut !== statut) return false;
        if (filtreClient && !plier(ligne.crm?.nomClient ?? "").includes(filtreClient)) return false;
        if (filtreContrat && !texteContrat(ligne).includes(filtreContrat)) return false;
        if (filtreFacture && !texteFacture(ligne).includes(filtreFacture)) return false;
        return true;
      });
    if (!tri) return retenues;
    const sens = tri.sens === "asc" ? 1 : -1;
    return retenues.sort((a, b) => {
      const ecart = comparer(a.ligne, b.ligne, tri.cle, sens);
      return ecart === 0 ? a.index - b.index : ecart;
    });
  }, [lignes, statut, client, contrat, facture, tri]);

  function basculerTri(cle: CleTri) {
    setTri((actuel) => {
      if (!actuel || actuel.cle !== cle) return { cle, sens: "asc" };
      return { cle, sens: actuel.sens === "asc" ? "desc" : "asc" };
    });
  }

  function effacerFiltres() {
    setStatut("");
    setClient("");
    setContrat("");
    setFacture("");
  }

  const filtresActifs = Boolean(statut || client.trim() || contrat.trim() || facture.trim());

  return (
    <div className="rounded-lg border border-primary/10 bg-white">
      {lignes ? (
        <div className="grid gap-3 border-b border-primary/10 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-primary/80">
            Statut
            <select
              value={statut}
              onChange={(event) => setStatut(event.target.value as StatutRapprochement | "")}
              className={INPUT_CLASS}
            >
              <option value="">Tous les statuts</option>
              {STATUTS.map((valeur) => (
                <option key={valeur} value={valeur}>
                  {valeur}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-primary/80">
            Client
            <input
              type="search"
              value={client}
              onChange={(event) => setClient(event.target.value)}
              placeholder="Nom du client"
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-primary/80">
            Contrat ou tiers
            <input
              type="search"
              value={contrat}
              onChange={(event) => setContrat(event.target.value)}
              placeholder="N° de contrat ou de tiers"
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-primary/80">
            N° facture
            <input
              type="search"
              value={facture}
              onChange={(event) => setFacture(event.target.value)}
              placeholder="N° de facture"
              className={INPUT_CLASS}
            />
          </label>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <caption className="px-4 py-3 text-left text-sm font-semibold text-primary">
            Résultats par ligne
          </caption>
          <thead>
            <tr className="border-b border-primary/10 bg-surface text-left text-xs font-semibold text-primary/80">
              {COLONNES.map((colonne) => (
                <th
                  key={colonne.id}
                  scope="col"
                  aria-sort={
                    colonne.tri && tri?.cle === colonne.tri
                      ? tri.sens === "asc"
                        ? "ascending"
                        : "descending"
                      : colonne.tri
                        ? "none"
                        : undefined
                  }
                  className={`px-3 py-2 whitespace-nowrap ${colonne.align === "right" ? "text-right" : ""}`}
                >
                  {colonne.tri ? (
                    <button
                      type="button"
                      onClick={() => basculerTri(colonne.tri as CleTri)}
                      className={`inline-flex min-h-8 cursor-pointer items-center gap-1 rounded text-inherit hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        colonne.align === "right" ? "ml-auto" : ""
                      }`}
                    >
                      {colonne.label}
                      <span aria-hidden="true" className="text-primary/50">
                        {tri?.cle === colonne.tri ? (tri.sens === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  ) : (
                    colonne.label
                  )}
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
            ) : visibles.length === 0 ? (
              <tr>
                <td colSpan={COLONNES.length} className="px-4 py-8 text-sm text-primary/70">
                  {lignes.length === 0 ? (
                    <p>Aucune ligne à afficher.</p>
                  ) : (
                    <>
                      <p>Aucune ligne ne correspond à ces filtres.</p>
                      {filtresActifs ? (
                        <button
                          type="button"
                          onClick={effacerFiltres}
                          className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded border border-primary/20 px-3 py-2 text-sm font-medium text-primary hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          Effacer les filtres
                        </button>
                      ) : null}
                    </>
                  )}
                </td>
              </tr>
            ) : (
              visibles.map(({ ligne, index }) => {
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
    </div>
  );
}

function texteContrat(ligne: LigneStatut): string {
  const morceaux = [
    ligne.crm?.numeroContrat,
    ...ligne.winbooks.map((item) => item.numeroTiers),
  ];
  return plier(morceaux.filter(Boolean).join(" "));
}

function texteFacture(ligne: LigneStatut): string {
  const morceaux = [
    ligne.crm?.numeroFacture,
    ...ligne.winbooks.map((item) => item.numeroDocument),
  ];
  return plier(morceaux.filter(Boolean).join(" "));
}

function plier(valeur: string): string {
  return valeur
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function comparer(a: LigneStatut, b: LigneStatut, cle: CleTri, sens: 1 | -1): number {
  if (cle === "statut") return (ORDRE_STATUT[a.statut] - ORDRE_STATUT[b.statut]) * sens;
  if (cle === "client") return comparerTexte(a.crm?.nomClient ?? "", b.crm?.nomClient ?? "", sens);
  if (cle === "contrat") {
    return comparerTexte(
      a.crm?.numeroContrat ?? a.winbooks[0]?.numeroTiers ?? "",
      b.crm?.numeroContrat ?? b.winbooks[0]?.numeroTiers ?? "",
      sens,
    );
  }
  if (cle === "date") return comparerTexte(dateIso(a) ?? "", dateIso(b) ?? "", sens);
  if (cle === "montant") return comparerNombre(a.montantCrm, b.montantCrm, sens);
  if (cle === "solde") return comparerNombre(a.soldeWinbooks, b.soldeWinbooks, sens);
  return comparerNombre(a.ecart, b.ecart, sens);
}

function dateIso(ligne: LigneStatut): string | null {
  if (ligne.crm?.dateFacture) return ligne.crm.dateFacture;
  const dates = [
    ...new Set(ligne.winbooks.map((item) => item.dateDocument).filter((date): date is string => Boolean(date))),
  ];
  return dates.length === 1 ? dates[0] : null;
}

function comparerTexte(a: string, b: string, sens: 1 | -1): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, "fr", { sensitivity: "base" }) * sens;
}

function comparerNombre(a: number | null, b: number | null, sens: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * sens;
}
