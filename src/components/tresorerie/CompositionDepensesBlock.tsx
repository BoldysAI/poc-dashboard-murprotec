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
import type { CompositionDepenses } from "@/types/dashboard";
import { formatEur, formatPct } from "./format-tresorerie";

type CompositionDepensesBlockProps = {
  composition: CompositionDepenses;
  totalDepenses: number;
};

const SEGMENTS: {
  key: keyof CompositionDepenses;
  label: string;
  fill: string;
}[] = [
  { key: "salairesCharges", label: "Salaires & Charges", fill: "#29235C" },
  { key: "impotsTaxes", label: "Impôts & Taxes", fill: "#EBCA09" },
  { key: "fournisseurs", label: "Fournisseurs", fill: "#1B7A4E" },
  { key: "dividendes", label: "Dividendes", fill: "#3D5A80" },
  { key: "transfertsInternes", label: "Transferts Internes", fill: "#8B84B0" },
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

function CompositionTooltip(props: TooltipContentProps) {
  const { active, payload } = props;
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-primary/15 bg-background px-3 py-2 text-sm shadow-sm">
      {payload.map((entry) => {
        const value =
          typeof entry.value === "number" ? entry.value : Number(entry.value);
        if (!Number.isFinite(value) || value === 0) return null;
        return (
          <p key={String(entry.dataKey)} className="tabular-nums text-primary">
            <span className="font-semibold">{entry.name}</span>
            {" : "}
            {formatEur(value)}
          </p>
        );
      })}
    </div>
  );
}

/** Section composition Z16–20 — hauteur égale à la carte pays (stretch grille). */
export function CompositionDepensesBlock({
  composition,
  totalDepenses,
}: CompositionDepensesBlockProps) {
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  const compositionSum = useMemo(
    () =>
      composition.salairesCharges +
      composition.impotsTaxes +
      composition.fournisseurs +
      composition.dividendes +
      composition.transfertsInternes,
    [composition],
  );

  const ecart = Math.abs(compositionSum - totalDepenses);
  const hasEcart = ecart > 1;

  const chartData = useMemo(
    () => [
      {
        name: "Composition",
        salairesCharges: composition.salairesCharges,
        impotsTaxes: composition.impotsTaxes,
        fournisseurs: composition.fournisseurs,
        dividendes: composition.dividendes,
        transfertsInternes: composition.transfertsInternes,
      },
    ],
    [composition],
  );

  const legend = useMemo(
    () =>
      SEGMENTS.map((s) => {
        const montant = composition[s.key];
        const pct = totalDepenses === 0 ? 0 : montant / totalDepenses;
        return { ...s, montant, pct };
      }).sort((a, b) => b.montant - a.montant),
    [composition, totalDepenses],
  );

  return (
    <section
      className="flex h-full flex-col rounded-lg border-2 border-primary/15 bg-background p-4 sm:p-5"
      aria-labelledby="composition-depenses-title"
    >
      <header className="mb-3 shrink-0">
        <h2
          id="composition-depenses-title"
          className="text-lg font-semibold tracking-tight text-primary"
        >
          Composition des dépenses
        </h2>
        <p className="mt-0.5 text-sm text-primary/65">
          Répartition du total des dépenses par poste.
        </p>
      </header>

      {hasEcart ? (
        <p
          className="mb-3 shrink-0 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning"
          role="status"
        >
          La somme des postes ({formatEur(compositionSum)}) ne correspond pas
          au total des dépenses ({formatEur(totalDepenses)}) — écart{" "}
          {formatEur(ecart)}.
        </p>
      ) : null}

      <div
        className="h-14 w-full shrink-0"
        role="img"
        aria-label="Composition des dépenses en barres empilées"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
            barCategoryGap="18%"
          >
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis type="category" dataKey="name" hide width={0} />
            <Tooltip
              content={CompositionTooltip}
              cursor={{ fill: "transparent" }}
              wrapperStyle={{ outline: "none" }}
            />
            {legend.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId="composition"
                fill={s.fill}
                isAnimationActive={!reduceMotion}
                animationDuration={280}
                radius={
                  i === 0
                    ? [6, 0, 0, 6]
                    : i === legend.length - 1
                      ? [0, 6, 6, 0]
                      : [0, 0, 0, 0]
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul
        className="mt-3 flex min-h-0 flex-1 flex-col justify-evenly gap-1.5"
        aria-label="Détail par poste"
      >
        {legend.map((item) => {
          const barWidthPct = Math.min(100, Math.max(0, item.pct * 100));
          const isZero = item.montant === 0;
          return (
            <li
              key={item.key}
              className={`flex flex-col justify-center gap-1 rounded-md px-2.5 py-1.5 ${
                isZero ? "opacity-45" : "bg-surface/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.fill }}
                  aria-hidden
                />
                <span
                  className={`min-w-0 flex-1 text-sm font-semibold leading-snug ${
                    isZero ? "text-primary/50" : "text-primary"
                  }`}
                >
                  {item.label}
                </span>
                <span
                  className={`shrink-0 text-right text-sm font-semibold tabular-nums ${
                    isZero ? "text-primary/45" : "text-primary"
                  }`}
                >
                  {formatEur(item.montant)}
                </span>
                <span
                  className={`w-12 shrink-0 text-right text-sm font-semibold tabular-nums ${
                    isZero ? "text-primary/40" : "text-primary/70"
                  }`}
                >
                  {formatPct(item.pct, 1)}
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10"
                aria-hidden
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${barWidthPct}%`,
                    backgroundColor: item.fill,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
