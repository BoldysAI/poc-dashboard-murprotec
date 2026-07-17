import { formatPct } from "./format-tresorerie";

type PctPlacementsCardProps = {
  pctPlacements: number;
};

/** Indicateur AT — % placements = Z45 (ratio lu tel quel). */
export function PctPlacementsCard({ pctPlacements }: PctPlacementsCardProps) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-primary/10 bg-background p-4 sm:p-5">
      <header>
        <h3 className="text-sm font-medium text-primary/75">% Placements</h3>
        <p className="mt-0.5 text-xs text-primary/55">part d&apos;épargne</p>
      </header>

      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-primary sm:text-3xl">
        {formatPct(pctPlacements, 1)}
      </p>
    </article>
  );
}
