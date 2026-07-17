import { formatEur } from "./format-tresorerie";

type PositionNetteCardProps = {
  positionNette: number;
};

/** Indicateur AT — position nette = Z27 (hors placements). Carte principale. */
export function PositionNetteCard({ positionNette }: PositionNetteCardProps) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-primary/10 bg-background p-4 sm:p-5">
      <header>
        <h3 className="text-sm font-medium text-primary/75">
          Position nette de trésorerie
        </h3>
        <p className="mt-0.5 text-xs text-primary/55">hors placements</p>
      </header>

      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-primary sm:text-3xl">
        {formatEur(positionNette)}
      </p>
    </article>
  );
}
