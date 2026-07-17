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
import type { TresoreriePays } from "@/types/dashboard";
import { formatEur, formatEurSigned, formatPct } from "./format-tresorerie";

/**
 * Soldes négatifs : exclus du donut (un camembert ne représente pas les négatifs).
 * Affichés à part avec montant signé. % des parts = montant / somme(montants > 0).
 */

type ChartSlice = {
  name: string;
  value: number;
  pct: number;
  isZero: boolean;
  fill: string;
};

type RepartitionPaysChartProps = {
  parPays: TresoreriePays[];
};

/**
 * Palette à fort contraste (pays adjacents distincts).
 * Ancrée Murpro (primary / accent) + teintes dérivées lisibles — pas un dégradé mono-violet.
 */
const CHART_COLORS = {
  active: [
    "#29235C", // primary
    "#EBCA09", // accent
    "#1B7A4E", // success / vert
    "#3D5A80", // bleu acier
    "#B45309", // warning / ambre
    "#5C4B8A", // violet secondaire
    "#0F766E", // teal
    "#8B6914", // or foncé
    "#B42318", // danger / rouge
    "#64748B", // slate
  ],
  zero: "#C8C6D4",
} as const;

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
        {formatEur(row.value)} · {formatPct(row.pct, 1)}
      </p>
    </div>
  );
}

export function RepartitionPaysChart({ parPays }: RepartitionPaysChartProps) {
  const titleId = useId();
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  const { legendSlices, pieData, negatifs, totalPositif } = useMemo(() => {
    const negatifsList = parPays
      .filter((p) => p.montantTotal < 0)
      .map((p) => ({ pays: p.pays, montantTotal: p.montantTotal }))
      .sort((a, b) => a.montantTotal - b.montantTotal);

    const nonNegatifs = parPays.filter((p) => p.montantTotal >= 0);
    const basePositif = nonNegatifs
      .filter((p) => p.montantTotal > 0)
      .reduce((sum, p) => sum + p.montantTotal, 0);

    const sorted = [...nonNegatifs].sort(
      (a, b) => b.montantTotal - a.montantTotal,
    );

    let colorIndex = 0;
    const legend: ChartSlice[] = sorted.map((item) => {
      const isZero = item.montantTotal === 0;
      const pct = basePositif === 0 ? 0 : item.montantTotal / basePositif;
      const fill = isZero
        ? CHART_COLORS.zero
        : CHART_COLORS.active[colorIndex++ % CHART_COLORS.active.length];
      return {
        name: item.pays,
        value: item.montantTotal,
        pct,
        isZero,
        fill,
      };
    });

    return {
      legendSlices: legend,
      pieData: legend.filter((s) => s.value > 0),
      negatifs: negatifsList,
      totalPositif: basePositif,
    };
  }, [parPays]);

  const dominant = pieData[0];
  const insight =
    dominant && totalPositif > 0
      ? `Pays dominant : ${dominant.name} (${formatPct(dominant.pct, 1)} des soldes positifs).`
      : "Aucune répartition positive disponible.";

  return (
    <section
      className="flex h-full flex-col rounded-lg border-2 border-primary/15 bg-background p-4 sm:p-5"
      aria-labelledby={titleId}
    >
      <header className="mb-3 flex shrink-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id={titleId}
            className="text-lg font-semibold tracking-tight text-primary"
          >
            Répartition par pays
          </h2>
          <p className="mt-0.5 text-sm text-primary/65">{insight}</p>
        </div>
        <p className="text-sm text-primary/70">
          Total soldes positifs{" "}
          <span className="font-semibold tabular-nums text-primary">
            {formatEur(totalPositif)}
          </span>
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center gap-4 lg:flex-row lg:items-stretch lg:gap-5">
        {/* Donut taille fixe — ne suit plus la hauteur de la légende */}
        <div
          className="tresorerie-print-donut relative size-[200px] shrink-0 self-center sm:size-[220px]"
          role="img"
          aria-label={`Donut de répartition de la trésorerie par pays. ${insight} Total ${formatEur(totalPositif)}.`}
        >
          {pieData.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-full border-8 border-surface text-sm text-primary/50">
              Pas de solde positif
            </div>
          ) : (
            <div className="relative z-[1] h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="78%"
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
          <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
            <span className="text-[0.65rem] font-medium uppercase tracking-wider text-primary/50 sm:text-xs">
              Total
            </span>
            <span className="text-base font-semibold tabular-nums text-primary sm:text-lg">
              {formatEur(totalPositif)}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <ul
            className="flex flex-1 flex-col justify-evenly gap-1"
            aria-label="Légende des pays"
          >
            {legendSlices.map((slice) => {
              const barWidthPct = Math.min(
                100,
                Math.max(0, slice.pct * 100),
              );
              return (
                <li
                  key={slice.name}
                  className={`flex flex-col gap-1 rounded-md px-2.5 py-1.5 ${
                    slice.isZero ? "opacity-45" : "bg-surface/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="size-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: slice.fill }}
                      aria-hidden
                    />
                    <span
                      className={`min-w-0 flex-1 text-sm font-semibold leading-snug ${
                        slice.isZero ? "text-primary/50" : "text-primary"
                      }`}
                    >
                      {slice.name}
                    </span>
                    <span
                      className={`shrink-0 text-right text-sm font-semibold tabular-nums ${
                        slice.isZero ? "text-primary/45" : "text-primary"
                      }`}
                    >
                      {formatEur(slice.value)}
                    </span>
                    <span
                      className={`w-12 shrink-0 text-right text-sm font-semibold tabular-nums ${
                        slice.isZero ? "text-primary/40" : "text-primary"
                      }`}
                    >
                      {formatPct(slice.pct, 1)}
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-300 ease-out"
                      style={{
                        width: `${barWidthPct}%`,
                        backgroundColor: slice.fill,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {negatifs.length > 0 ? (
            <div
              className="mt-2 shrink-0 rounded-md border border-danger/20 bg-danger/5 px-3 py-2.5"
              role="note"
            >
              <p className="text-sm font-semibold text-danger">
                Soldes négatifs (hors camembert)
              </p>
              <p className="mt-0.5 text-xs text-primary/60">
                Un camembert ne représente pas les montants négatifs — listés à
                part.
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {negatifs.map((row) => (
                  <li
                    key={row.pays}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="font-semibold text-primary">{row.pays}</span>
                    <span className="font-semibold tabular-nums text-danger">
                      {formatEurSigned(row.montantTotal)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
