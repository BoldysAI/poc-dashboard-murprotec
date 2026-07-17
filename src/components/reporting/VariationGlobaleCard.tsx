"use client";

import { TrendArrow } from "./TrendArrow";
import {
  formatEur,
  formatEurSigned,
  toneClass,
  trendTone,
} from "./format-reporting";

type VariationGlobaleCardProps = {
  /**
   * Variation globale vs N-1 = **L95 colonne P** (profit après impôts).
   * Choix documenté : ligne la plus synthétique du compte de résultat
   * (pas P35 bénéfice brut).
   */
  variationVsN1: number;
  /** L95 colonne B — contexte du mois courant */
  profitApresImpots: number;
};

/**
 * Indicateur AT n°5 — performance globale vs N-1.
 * Source fichier : variation = P95 ; contexte = B95.
 */
export function VariationGlobaleCard({
  variationVsN1,
  profitApresImpots,
}: VariationGlobaleCardProps) {
  const tone = trendTone(variationVsN1);
  const label =
    tone === "success"
      ? "Performance en hausse vs N-1"
      : tone === "danger"
        ? "Performance en baisse vs N-1"
        : "Performance stable vs N-1";

  return (
    <article className="flex flex-col gap-4 rounded-lg border-2 border-primary/15 bg-background p-5 sm:p-6">
      <header>
        <h2 className="text-lg font-semibold tracking-tight text-primary">
          Variation globale vs N-1
        </h2>
        <p className="mt-0.5 text-sm text-primary/65">
          Écart du profit après impôts par rapport à la même période l&apos;an
          dernier.
        </p>
      </header>

      <div
        className={`flex items-center gap-3 ${toneClass(tone)}`}
        aria-label={`${label} : ${formatEurSigned(variationVsN1)}`}
      >
        <TrendArrow tone={tone} className="size-7 shrink-0" />
        <p className="text-3xl font-semibold tabular-nums tracking-tight">
          {formatEurSigned(variationVsN1)}
        </p>
      </div>

      <p className={`text-sm font-medium ${toneClass(tone)}`}>{label}</p>

      <div className="mt-auto rounded-md bg-surface/80 px-3 py-3 text-sm text-primary/70">
        <p>
          Profit après impôts (mois){" "}
          <span className="font-medium tabular-nums text-primary">
            {formatEur(profitApresImpots)}
          </span>
        </p>
      </div>
    </article>
  );
}
