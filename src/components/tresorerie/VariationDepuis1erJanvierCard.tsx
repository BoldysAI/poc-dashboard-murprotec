import { TrendArrow } from "./TrendArrow";
import {
  formatEurSigned,
  toneClass,
  trendTone,
} from "./format-tresorerie";

type VariationDepuis1erJanvierCardProps = {
  variationDepuis1erJanvier: number;
};

/** Indicateur AT — variation = Z43 − Z52. */
export function VariationDepuis1erJanvierCard({
  variationDepuis1erJanvier,
}: VariationDepuis1erJanvierCardProps) {
  const tone = trendTone(variationDepuis1erJanvier);
  const label =
    tone === "success"
      ? "En hausse depuis le 1er janvier"
      : tone === "danger"
        ? "En baisse depuis le 1er janvier"
        : "Stable depuis le 1er janvier";

  return (
    <article className="flex h-full flex-col rounded-lg border border-primary/10 bg-background p-4 sm:p-5">
      <header>
        <h3 className="text-sm font-medium text-primary/75">
          Variation depuis le 01/01
        </h3>
        <p className="mt-0.5 text-xs text-primary/55">
          Écart vs solde au 1er janvier
        </p>
      </header>

      <div
        className={`mt-3 flex items-center gap-2 ${toneClass(tone)}`}
        aria-label={`${label} : ${formatEurSigned(variationDepuis1erJanvier)}`}
      >
        <TrendArrow tone={tone} className="size-6 shrink-0" />
        <p className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
          {formatEurSigned(variationDepuis1erJanvier)}
        </p>
      </div>

      <p className={`mt-2 text-sm font-medium ${toneClass(tone)}`}>{label}</p>
    </article>
  );
}
