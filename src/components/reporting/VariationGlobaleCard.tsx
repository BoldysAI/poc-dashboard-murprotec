"use client";

import { TrendArrow } from "./TrendArrow";
import {
  formatEur,
  formatEurSigned,
  toneClass,
  trendTone,
} from "./format-reporting";

type VariationGlobaleCardProps = {
  title: string;
  subtitle: string;
  variationVsN1: number;
  contextLabel: string;
  contextValue: number;
};

function VariationGlobaleCard({
  title,
  subtitle,
  variationVsN1,
  contextLabel,
  contextValue,
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
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-primary/65">{subtitle}</p>
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
          {contextLabel}{" "}
          <span className="font-medium tabular-nums text-primary">
            {formatEur(contextValue)}
          </span>
        </p>
      </div>
    </article>
  );
}

export function VariationGlobaleBrutCard({
  variationVsN1,
  beneficeBrutConsolide,
}: {
  variationVsN1: number;
  beneficeBrutConsolide: number;
}) {
  return (
    <VariationGlobaleCard
      title="Variation bénéfice brut vs N-1"
      subtitle="Écart du bénéfice brut par rapport à la même période l'an dernier."
      variationVsN1={variationVsN1}
      contextLabel="Bénéfice brut consolidé"
      contextValue={beneficeBrutConsolide}
    />
  );
}

export function VariationGlobaleNetCard({
  variationVsN1,
  beneficeNetConsolide,
}: {
  variationVsN1: number;
  beneficeNetConsolide: number;
}) {
  return (
    <VariationGlobaleCard
      title="Variation bénéfice net vs N-1"
      subtitle="Écart du profit après impôts par rapport à la même période l'an dernier."
      variationVsN1={variationVsN1}
      contextLabel="Bénéfice net consolidé"
      contextValue={beneficeNetConsolide}
    />
  );
}
