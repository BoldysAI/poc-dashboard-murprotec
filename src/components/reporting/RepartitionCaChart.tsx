"use client";

import { useId, useMemo, useSyncExternalStore } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from "recharts";
import type { RepartitionCA } from "@/types/dashboard";

type ChartSlice = {
  name: string;
  value: number;
  pct: number;
  isZero: boolean;
  fill: string;
};

type RepartitionCaChartProps = {
  repartitionCA: RepartitionCA[];
  /** Total fichier L14 — ne pas recalculer depuis les catégories */
  caTotal: number;
};

/** Palette dérivée des tokens Murpro (`globals.css`). */
const CHART_COLORS = {
  active: [
    "#29235C", // primary
    "#3D3680",
    "#524A9A",
    "#EBCA09", // accent
    "#C4A808",
    "#8B84B0",
  ],
  zero: "#C8C6D4", // surface muted
} as const;

function formatEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(ratio: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(ratio);
}

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

function ChartTooltip(props: TooltipContentProps) {
  const { active, payload } = props;
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as ChartSlice | undefined;
  if (!row) return null;
  return (
    <div className="relative z-20 rounded-md border border-primary/15 bg-background px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-primary">{row.name}</p>
      <p className="tabular-nums text-primary/80">
        {formatEur(row.value)} · {formatPct(row.pct)}
      </p>
    </div>
  );
}

export function RepartitionCaChart({
  repartitionCA,
  caTotal,
}: RepartitionCaChartProps) {
  const titleId = useId();
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  const slices = useMemo((): ChartSlice[] => {
    const withPct = repartitionCA.map((item, index) => {
      const isZero = item.montant === 0;
      const pct = caTotal === 0 ? 0 : item.montant / caTotal;
      const fill = isZero
        ? CHART_COLORS.zero
        : CHART_COLORS.active[index % CHART_COLORS.active.length];
      return {
        name: item.categorie,
        value: item.montant,
        pct,
        isZero,
        fill,
      };
    });
    // Tri décroissant pour le coup d'œil (légende + donut alignés)
    return [...withPct].sort((a, b) => b.value - a.value);
  }, [repartitionCA, caTotal]);

  const dominant = slices.find((s) => !s.isZero) ?? slices[0];
  const insight =
    dominant && caTotal > 0
      ? `Catégorie dominante : ${dominant.name} (${formatPct(dominant.pct)} du CA).`
      : "Aucune répartition de CA disponible.";

  const pieData = slices.filter((s) => s.value > 0);

  return (
    <section
      className="rounded-lg border-2 border-primary/15 bg-background p-5 sm:p-6"
      aria-labelledby={titleId}
    >
      <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id={titleId}
            className="text-lg font-semibold tracking-tight text-primary"
          >
            Répartition du CA par produit
          </h2>
          <p className="mt-0.5 text-sm text-primary/65">{insight}</p>
        </div>
        <p className="text-sm text-primary/70">
          Total CA{" "}
          <span className="font-semibold tabular-nums text-primary">
            {formatEur(caTotal)}
          </span>
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-center">
        <div
          className="relative mx-auto aspect-square w-full max-w-[280px]"
          role="img"
          aria-label={`Donut de répartition du chiffre d'affaires. ${insight} Total ${formatEur(caTotal)}.`}
        >
          {pieData.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-full border-8 border-surface text-sm text-primary/50">
              Pas de CA
            </div>
          ) : (
            <div className="relative z-[1] h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={pieData.length > 1 ? 2 : 0}
                    stroke="var(--background)"
                    strokeWidth={2}
                    isAnimationActive={!reduceMotion}
                    animationDuration={280}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={ChartTooltip}
                    wrapperStyle={{ outline: "none", zIndex: 20 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Total sous le SVG (trou du donut) pour laisser le tooltip au-dessus */}
          <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
            <span className="text-[0.65rem] font-medium uppercase tracking-wider text-primary/50">
              Total
            </span>
            <span className="text-base font-semibold tabular-nums text-primary sm:text-lg">
              {formatEur(caTotal)}
            </span>
          </div>
        </div>

        <ul className="flex flex-col gap-2" aria-label="Légende des catégories">
          {slices.map((slice) => (
            <li
              key={slice.name}
              className={`flex items-center gap-3 rounded-md px-2 py-2 ${
                slice.isZero ? "opacity-45" : "bg-surface/60"
              }`}
            >
              <span
                className="size-3 shrink-0 rounded-sm"
                style={{ backgroundColor: slice.fill }}
                aria-hidden
              />
              <span
                className={`min-w-0 flex-1 text-sm leading-snug ${
                  slice.isZero ? "text-primary/50" : "font-medium text-primary"
                }`}
              >
                {slice.name}
              </span>
              <span
                className={`shrink-0 text-right text-sm tabular-nums ${
                  slice.isZero ? "text-primary/45" : "text-primary"
                }`}
              >
                {formatEur(slice.value)}
              </span>
              <span
                className={`w-14 shrink-0 text-right text-sm tabular-nums ${
                  slice.isZero ? "text-primary/40" : "text-primary/70"
                }`}
              >
                {formatPct(slice.pct)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
