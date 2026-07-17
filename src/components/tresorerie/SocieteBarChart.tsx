"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { formatEur } from "./format-tresorerie";

export type SocieteBarRow = {
  /** Clé stable unique (colonne Excel) pour l’axe X */
  id: string;
  label: string;
  labelFull: string;
  montant: number;
  /** Pic (top 3 dépenses) */
  isPeak?: boolean;
};

type SocieteBarChartProps = {
  rows: SocieteBarRow[];
  showAverage?: boolean;
  averageLabel?: string;
  highlightPeaks?: boolean;
  ariaLabel: string;
};

type ChartPoint = {
  id: string;
  label: string;
  labelFull: string;
  montant: number;
  base: number;
  peak: number;
};

const COLORS = {
  bar: "#29235C",
  peak: "#EBCA09",
  average: "#B45309",
} as const;

const LABEL_MAX = 14;

export function truncateLabel(full: string, max = LABEL_MAX): string {
  const t = full.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
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

function BarTooltip(props: TooltipContentProps) {
  const { active, payload } = props;
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as ChartPoint | undefined;
  if (!row) return null;
  return (
    <div className="rounded-md border border-primary/15 bg-background px-3 py-2 text-sm shadow-sm">
      <p className="font-semibold text-primary">{row.labelFull}</p>
      <p className="tabular-nums text-primary/80">{formatEur(row.montant)}</p>
    </div>
  );
}

type TickProps = {
  x?: string | number;
  y?: string | number;
  payload?: { value?: string };
  labelById: Map<string, string>;
  fullById: Map<string, string>;
};

/** Tick X : libellé tronqué + `<title>` SVG = nom complet au survol. */
function SocieteXTick({ x = 0, y = 0, payload, labelById, fullById }: TickProps) {
  const id = String(payload?.value ?? "");
  const label = labelById.get(id) ?? id;
  const full = fullById.get(id) ?? label;
  return (
    <g transform={`translate(${Number(x)},${Number(y)})`}>
      <text
        x={0}
        y={0}
        dy={10}
        textAnchor="end"
        transform="rotate(-35)"
        fill="#29235C"
        fontSize={10}
        fontWeight={600}
        className="cursor-default"
      >
        {label}
        <title>{full}</title>
      </text>
    </g>
  );
}

/**
 * Bâtonnets verticaux par société — Recharts 3.
 * Pics = 2 séries empilées (`base` / `peak`) ; pas de Cell/shape custom.
 */
export function SocieteBarChart({
  rows,
  showAverage = false,
  averageLabel = "Moyenne des sociétés",
  highlightPeaks = false,
  ariaLabel,
}: SocieteBarChartProps) {
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  const chartData = useMemo((): ChartPoint[] => {
    return rows.map((row) => {
      const isPeak = Boolean(highlightPeaks && row.isPeak);
      return {
        id: row.id,
        label: row.label,
        labelFull: row.labelFull,
        montant: row.montant,
        base: isPeak ? 0 : row.montant,
        peak: isPeak ? row.montant : 0,
      };
    });
  }, [rows, highlightPeaks]);

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of chartData) map.set(row.id, row.label);
    return map;
  }, [chartData]);

  const fullById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of chartData) map.set(row.id, row.labelFull);
    return map;
  }, [chartData]);

  const average = useMemo(() => {
    if (!showAverage || chartData.length === 0) return null;
    return chartData.reduce((s, r) => s + r.montant, 0) / chartData.length;
  }, [chartData, showAverage]);

  return (
    <div
      className="tresorerie-print-chart h-[260px] w-full sm:h-[280px]"
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
          barCategoryGap="14%"
        >
          <XAxis
            dataKey="id"
            type="category"
            interval={0}
            height={52}
            tick={(props) => (
              <SocieteXTick
                {...props}
                labelById={labelById}
                fullById={fullById}
              />
            )}
            axisLine={{ stroke: "#29235C33" }}
            tickLine={false}
          />
          <YAxis
            type="number"
            domain={[0, "auto"]}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat("fr-FR", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(v)
            }
            tick={{ fill: "#29235C99", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            content={BarTooltip}
            cursor={{ fill: "#29235C0D" }}
            wrapperStyle={{ outline: "none" }}
          />
          {average !== null ? (
            <ReferenceLine
              y={average}
              stroke={COLORS.average}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
              label={{
                value: averageLabel,
                position: "insideTopRight",
                fill: COLORS.average,
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          ) : null}
          <Bar
            dataKey="base"
            name="Montant"
            stackId="societe"
            fill={COLORS.bar}
            radius={[4, 4, 0, 0]}
            isAnimationActive={!reduceMotion}
            animationDuration={280}
            maxBarSize={40}
          />
          {highlightPeaks ? (
            <Bar
              dataKey="peak"
              name="Parmi les plus élevées"
              stackId="societe"
              fill={COLORS.peak}
              radius={[4, 4, 0, 0]}
              isAnimationActive={!reduceMotion}
              animationDuration={280}
              maxBarSize={40}
              legendType="none"
            />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
