"use client";

import { formatEur } from "./format-reporting";

type FraisFixesCardProps = {
  fraisFixes: number;
  /** Sans chrome carte — pour inclusion dans ChargesRentabiliteBlock */
  embedded?: boolean;
};

/** Bandeau compact — pas de stretch hauteur (évite le vide à côté du break-even). */
export function FraisFixesCard({
  fraisFixes,
  embedded = false,
}: FraisFixesCardProps) {
  const TitleTag = embedded ? "h3" : "h2";

  return (
    <article
      className={
        embedded
          ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          : "flex flex-col gap-3 rounded-lg border border-primary/10 bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6"
      }
    >
      <header className="min-w-0">
        <TitleTag className="text-base font-semibold tracking-tight text-primary">
          Frais fixes
        </TitleTag>
        <p className="mt-0.5 text-sm text-primary/65">
          Coûts qui restent à couvrir chaque mois, quel que soit le volume
          d&apos;activité.
        </p>
      </header>
      <p className="shrink-0 text-2xl font-semibold tabular-nums tracking-tight text-primary sm:text-3xl">
        {formatEur(fraisFixes)}
      </p>
    </article>
  );
}
