import { formatEur } from "./format-tresorerie";

type TotalGeneralCardProps = {
  totalGeneral: number;
};

/** Complément — Total Général = Z43 (placements inclus). Carte secondaire. */
export function TotalGeneralCard({ totalGeneral }: TotalGeneralCardProps) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-primary/10 bg-background p-4 sm:p-5">
      <header>
        <h3 className="text-sm font-medium text-primary/75">Total Général</h3>
        <p className="mt-0.5 text-xs text-primary/55">placements inclus</p>
      </header>

      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-primary sm:text-3xl">
        {formatEur(totalGeneral)}
      </p>
    </article>
  );
}
