import type { TresorerieData } from "@/types/dashboard";
import { PctPlacementsCard } from "./PctPlacementsCard";
import { PositionNetteCard } from "./PositionNetteCard";
import { TotalGeneralCard } from "./TotalGeneralCard";
import { VariationDepuis1erJanvierCard } from "./VariationDepuis1erJanvierCard";

type TresorerieKpiRowProps = {
  data: TresorerieData;
};

/** Section synthèse — 4 KPI (AT n°1, 3, 4 + Total Général complémentaire). */
export function TresorerieKpiRow({ data }: TresorerieKpiRowProps) {
  return (
    <section
      className="rounded-lg border-2 border-primary/15 bg-background p-4 sm:p-5"
      aria-labelledby="tresorerie-kpi-title"
    >
      <header className="mb-4">
        <h2
          id="tresorerie-kpi-title"
          className="text-lg font-semibold tracking-tight text-primary"
        >
          Indicateurs de synthèse
        </h2>
        <p className="mt-0.5 text-sm text-primary/65">
          Position nette, placements et variation depuis le début d&apos;année.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PositionNetteCard positionNette={data.positionNette} />
        <TotalGeneralCard totalGeneral={data.totalGeneral} />
        <PctPlacementsCard pctPlacements={data.pctPlacements} />
        <VariationDepuis1erJanvierCard
          variationDepuis1erJanvier={data.variationDepuis1erJanvier}
        />
      </div>
    </section>
  );
}
