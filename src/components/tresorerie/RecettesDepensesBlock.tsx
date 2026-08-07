"use client";

import { useMemo } from "react";
import type { TresorerieSociete } from "@/types/dashboard";
import { formatEur } from "./format-tresorerie";
import {
  SocieteBarChart,
  truncateLabel,
  type SocieteBarRow,
} from "./SocieteBarChart";

type RecettesDepensesBlockProps = {
  parSociete: TresorerieSociete[];
  totalRecettes: number;
  totalDepenses: number;
};

function societeLabel(s: TresorerieSociete): string {
  // Plusieurs colonnes partagent marque + pays (ex. Murprotec FRANCE) :
  // L8 activité les distingue (Qualité Serv., Service FR, Solutions PRO…).
  const detail = s.activite.trim() || s.pays;
  if (s.marque && detail && s.marque.toLowerCase() !== detail.toLowerCase()) {
    return `${s.marque} — ${detail}`;
  }
  return s.marque || detail || s.colonne;
}

function toRows(
  parSociete: TresorerieSociete[],
  valueKey: "recettesMois" | "depensesMois",
  markPeaks: boolean,
): SocieteBarRow[] {
  const sorted = [...parSociete].sort(
    (a, b) => b[valueKey] - a[valueKey],
  );
  const peakIds = markPeaks
    ? new Set(sorted.slice(0, 3).map((s) => s.colonne))
    : new Set<string>();

  return sorted.map((s) => {
    const full = societeLabel(s);
    return {
      id: s.colonne,
      label: truncateLabel(full),
      labelFull: full,
      montant: s[valueKey],
      isPeak: peakIds.has(s.colonne),
    };
  });
}

/** Section mois courant — chaque colonne = total + bâtonnets (pas de trou vertical). */
export function RecettesDepensesBlock({
  parSociete,
  totalRecettes,
  totalDepenses,
}: RecettesDepensesBlockProps) {
  const societesActives = useMemo(
    () =>
      parSociete.filter(
        (s) => s.recettesMois !== 0 || s.depensesMois !== 0,
      ),
    [parSociete],
  );
  const recettesRows = useMemo(
    () => toRows(societesActives, "recettesMois", false),
    [societesActives],
  );
  const depensesRows = useMemo(
    () => toRows(societesActives, "depensesMois", true),
    [societesActives],
  );

  return (
    <section
      className="rounded-lg border-2 border-primary/15 bg-background p-4"
      aria-labelledby="recettes-depenses-title"
    >
      <header className="mb-3">
        <h2
          id="recettes-depenses-title"
          className="text-lg font-semibold tracking-tight text-primary"
        >
          Recettes &amp; dépenses du mois
        </h2>
        <p className="mt-0.5 text-sm text-primary/65">
          Flux du mois en cours, consolidés pour le groupe.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-2 xl:gap-5">
        <div className="flex min-w-0 flex-col gap-3">
          <article className="rounded-lg border border-primary/10 bg-background px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-primary/75">
                  Recettes du mois
                </h3>
                <p className="text-xs text-primary/55">
                  Total des encaissements groupe
                </p>
              </div>
              <p className="shrink-0 text-xl font-semibold tabular-nums tracking-tight text-primary sm:text-2xl">
                {formatEur(totalRecettes)}
              </p>
            </div>
          </article>
          <div>
            <h3 className="mb-0.5 text-sm font-semibold tracking-tight text-primary">
              Recettes par société
            </h3>
            <p className="mb-2 text-xs text-primary/60">
              Ligne pointillée = moyenne des sociétés.
            </p>
            <SocieteBarChart
              rows={recettesRows}
              showAverage
              averageLabel="Moyenne"
              ariaLabel="Recettes du mois par société"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <article className="rounded-lg border border-primary/10 bg-background px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-primary/75">
                  Dépenses du mois
                </h3>
                <p className="text-xs text-primary/55">
                  Total des décaissements groupe
                </p>
              </div>
              <p className="shrink-0 text-xl font-semibold tabular-nums tracking-tight text-primary sm:text-2xl">
                {formatEur(totalDepenses)}
              </p>
            </div>
          </article>
          <div>
            <h3 className="mb-0.5 text-sm font-semibold tracking-tight text-primary">
              Dépenses par société
            </h3>
            <p className="mb-2 text-xs text-primary/60">
              En jaune : les trois sociétés aux dépenses les plus élevées.
            </p>
            <SocieteBarChart
              rows={depensesRows}
              highlightPeaks
              ariaLabel="Dépenses du mois par société"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
