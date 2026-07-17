"use client";

import type { StructureCharges } from "@/types/dashboard";
import { BreakEvenCard } from "./BreakEvenCard";
import { FraisFixesCard } from "./FraisFixesCard";
import { StructureChargesChart } from "./StructureChargesChart";

type ChargesRentabiliteBlockProps = {
  structureCharges: StructureCharges;
  fraisFixes: number;
  breakEven: number;
  caTotal: number;
};

/** Une carte unique — structure des charges, frais fixes et seuil de rentabilité. */
export function ChargesRentabiliteBlock({
  structureCharges,
  fraisFixes,
  breakEven,
  caTotal,
}: ChargesRentabiliteBlockProps) {
  return (
    <section
      className="rounded-lg border-2 border-primary/15 bg-background p-5 sm:p-6"
      aria-labelledby="charges-rentabilite-title"
    >
      <header className="mb-5">
        <h2
          id="charges-rentabilite-title"
          className="text-lg font-semibold tracking-tight text-primary"
        >
          Charges & rentabilité
        </h2>
        <p className="mt-0.5 text-sm text-primary/65">
          Coûts d&apos;exploitation, frais fixes et seuil de rentabilité du
          mois.
        </p>
      </header>

      <div className="space-y-6">
        <StructureChargesChart
          structureCharges={structureCharges}
          embedded
        />
        <div className="border-t border-primary/10 pt-5">
          <FraisFixesCard fraisFixes={fraisFixes} embedded />
        </div>
        <div className="border-t border-primary/10 pt-5">
          <BreakEvenCard
            breakEven={breakEven}
            caTotal={caTotal}
            embedded
          />
        </div>
      </div>
    </section>
  );
}
