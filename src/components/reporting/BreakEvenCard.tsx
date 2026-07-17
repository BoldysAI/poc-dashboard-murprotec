"use client";

import {
  formatEur,
  formatEurSigned,
  toneClass,
  trendTone,
} from "./format-reporting";

type BreakEvenCardProps = {
  breakEven: number;
  caTotal: number;
  /** Sans chrome carte — pour inclusion dans ChargesRentabiliteBlock */
  embedded?: boolean;
};

export function BreakEvenCard({
  breakEven,
  caTotal,
  embedded = false,
}: BreakEvenCardProps) {
  const ecart = caTotal - breakEven;
  const auDessus = caTotal >= breakEven;
  const tone = trendTone(ecart);
  const max = Math.max(caTotal, breakEven, 1);
  const caWidth = Math.min(100, (caTotal / max) * 100);
  const beWidth = Math.min(100, (breakEven / max) * 100);
  const TitleTag = embedded ? "h3" : "h2";

  return (
    <article
      className={
        embedded
          ? undefined
          : "rounded-lg border border-primary/10 bg-background p-5 sm:p-6"
      }
    >
      <header>
        <TitleTag className="text-base font-semibold tracking-tight text-primary">
          Seuil de rentabilité mensuel
        </TitleTag>
        <p className="mt-0.5 text-sm text-primary/65">
          Niveau de chiffre d&apos;affaires à atteindre pour couvrir les coûts
          du mois (break-even).
        </p>
      </header>

      <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-primary">
        {formatEur(breakEven)}
      </p>

      <div className="mt-5 space-y-3" aria-hidden>
        <div>
          <div className="mb-1 flex justify-between text-xs text-primary/60">
            <span>CA du mois</span>
            <span className="tabular-nums">{formatEur(caTotal)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${caWidth}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-primary/60">
            <span>Seuil</span>
            <span className="tabular-nums">{formatEur(breakEven)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-primary/35 transition-[width] duration-300"
              style={{ width: `${beWidth}%` }}
            />
          </div>
        </div>
      </div>

      <p
        className={`mt-4 text-sm font-medium ${toneClass(tone)}`}
        aria-label={`${auDessus ? "Au-dessus" : "En dessous"} du seuil de rentabilité : écart ${formatEurSigned(ecart)}`}
      >
        {auDessus
          ? "Au-dessus du seuil de rentabilité"
          : "En dessous du seuil de rentabilité"}
        <span className="ml-1 tabular-nums">({formatEurSigned(ecart)})</span>
      </p>
    </article>
  );
}
