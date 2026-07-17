"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { StructureCharges } from "@/types/dashboard";
import { formatEur, formatPct } from "./format-reporting";

type StructureChargesChartProps = {
  structureCharges: StructureCharges;
  /** Sans chrome carte — pour inclusion dans ChargesRentabiliteBlock */
  embedded?: boolean;
};

const COLORS = {
  technique: "#29235C",
  vente: "#EBCA09",
  administration: "#8B84B0",
  financier: "#C4C0D6",
} as const;

const SEGMENTS: {
  key: keyof StructureCharges;
  label: string;
  fill: string;
}[] = [
  { key: "technique", label: "Technique", fill: COLORS.technique },
  { key: "vente", label: "Vente", fill: COLORS.vente },
  { key: "administration", label: "Administration", fill: COLORS.administration },
  { key: "financier", label: "Financier", fill: COLORS.financier },
];

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function ChargesTooltip(props: TooltipContentProps) {
  const { active, payload } = props;
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-primary/15 bg-background px-3 py-2 text-sm shadow-sm">
      {payload.map((entry) => {
        const value = typeof entry.value === "number" ? entry.value : Number(entry.value);
        if (!Number.isFinite(value)) return null;
        return (
          <p key={String(entry.dataKey)} className="tabular-nums text-primary">
            <span className="font-medium">{entry.name}</span>
            {" : "}
            {formatEur(value)}
          </p>
        );
      })}
    </div>
  );
}

export function StructureChargesChart({
  structureCharges,
  embedded = false,
}: StructureChargesChartProps) {
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  const total =
    structureCharges.technique +
    structureCharges.vente +
    structureCharges.administration +
    structureCharges.financier;

  const chartData = useMemo(
    () => [
      {
        name: "Charges",
        technique: structureCharges.technique,
        vente: structureCharges.vente,
        administration: structureCharges.administration,
        financier: structureCharges.financier,
      },
    ],
    [structureCharges],
  );

  const legend = SEGMENTS.map((s) => {
    const montant = structureCharges[s.key];
    const pct = total === 0 ? 0 : montant / total;
    return { ...s, montant, pct };
  });

  const TitleTag = embedded ? "h3" : "h2";

  return (
    <section
      className={
        embedded
          ? "flex flex-col"
          : "flex h-full flex-col rounded-lg border border-primary/10 bg-background p-5 sm:p-6"
      }
      aria-labelledby="charges-title"
    >
      <header className="mb-4">
        <TitleTag
          id="charges-title"
          className="text-base font-semibold tracking-tight text-primary"
        >
          Structure des charges
        </TitleTag>
        <p className="mt-0.5 text-sm text-primary/65">
          Répartition des coûts d&apos;exploitation (technique, vente,
          administration, financier).
        </p>
      </header>

      <div className="h-20 w-full" role="img" aria-label="Répartition des charges">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
            barCategoryGap="20%"
          >
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis type="category" dataKey="name" hide width={0} />
            <Tooltip
              content={ChargesTooltip}
              cursor={{ fill: "transparent" }}
              wrapperStyle={{ outline: "none" }}
            />
            {SEGMENTS.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId="charges"
                fill={s.fill}
                isAnimationActive={!reduceMotion}
                animationDuration={280}
                radius={
                  i === 0
                    ? [6, 0, 0, 6]
                    : i === SEGMENTS.length - 1
                      ? [0, 6, 6, 0]
                      : [0, 0, 0, 0]
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
        {legend.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: item.fill }}
              aria-hidden
            />
            <span className="text-primary/75">{item.label}</span>
            <span className="tabular-nums font-medium text-primary">
              {formatEur(item.montant)}
            </span>
            <span className="tabular-nums text-primary/55">
              {formatPct(item.pct, 0)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
