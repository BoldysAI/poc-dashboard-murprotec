"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import type { TresorerieData } from "@/types/dashboard";
import {
  formatEur,
  formatEurSigned,
  formatPct,
  trendTone,
} from "./format-tresorerie";
import { TrendArrow } from "./TrendArrow";
import { TresoreriePrintBanner } from "./TresoreriePrintBanner";

const PAYS_COLORS = [
  "#29235C",
  "#EBCA09",
  "#1B7A4E",
  "#3D5A80",
  "#B45309",
  "#5C4B8A",
  "#0F766E",
  "#8B6914",
  "#B42318",
  "#64748B",
] as const;

const COMPOSITION = [
  { key: "salairesCharges" as const, label: "Salaires & Charges", fill: "#29235C" },
  { key: "impotsTaxes" as const, label: "Impôts & Taxes", fill: "#EBCA09" },
  { key: "fournisseurs" as const, label: "Fournisseurs", fill: "#1B7A4E" },
  { key: "dividendes" as const, label: "Dividendes", fill: "#3D5A80" },
  { key: "transfertsInternes" as const, label: "Transferts Internes", fill: "#8B84B0" },
];

type TresoreriePrintSheetProps = {
  data: TresorerieData;
  periode: string | null;
};

function societeLabel(s: {
  marque: string;
  activite: string;
  pays: string;
  colonne: string;
}): string {
  const detail = s.activite.trim() || s.pays;
  if (s.marque && detail && s.marque.toLowerCase() !== detail.toLowerCase()) {
    return `${s.marque} — ${detail}`;
  }
  return s.marque || detail || s.colonne;
}

function BarRow({
  label,
  value,
  max,
  fill,
}: {
  label: string;
  value: number;
  max: number;
  fill: string;
  muted?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="print-bar-row">
      <span className="print-bar-label">{label}</span>
      <div className="print-bar-track">
        <div
          className="print-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: fill }}
        />
      </div>
      <span className="print-bar-val">{formatEur(value)}</span>
    </div>
  );
}

/**
 * Feuille PDF dédiée — layout A4 paysage fixe.
 * Invisible à l’écran (`hidden print:block`). Pas de zoom / ResponsiveContainer.
 */
export function TresoreriePrintSheet({
  data,
  periode,
}: TresoreriePrintSheetProps) {
  const pays = useMemo(() => {
    const nonNeg = data.parPays.filter((p) => p.montantTotal >= 0);
    const totalPos = nonNeg
      .filter((p) => p.montantTotal > 0)
      .reduce((s, p) => s + p.montantTotal, 0);
    const sorted = [...nonNeg].sort((a, b) => b.montantTotal - a.montantTotal);
    let ci = 0;
    const rows = sorted.map((p) => {
      const isZero = p.montantTotal === 0;
      const fill = isZero
        ? "#C8C6D4"
        : PAYS_COLORS[ci++ % PAYS_COLORS.length];
      return {
        name: p.pays,
        value: p.montantTotal,
        pct: totalPos === 0 ? 0 : p.montantTotal / totalPos,
        fill,
        isZero,
      };
    });
    return {
      rows,
      pie: rows.filter((r) => r.value > 0),
      totalPos,
      negatifs: data.parPays
        .filter((p) => p.montantTotal < 0)
        .sort((a, b) => a.montantTotal - b.montantTotal),
    };
  }, [data.parPays]);

  const composition = useMemo(() => {
    return COMPOSITION.map((s) => {
      const montant = data.compositionDepenses[s.key];
      const pct =
        data.totalDepenses === 0 ? 0 : montant / data.totalDepenses;
      return { ...s, montant, pct };
    }).sort((a, b) => b.montant - a.montant);
  }, [data.compositionDepenses, data.totalDepenses]);

  const societesActives = useMemo(
    () =>
      data.parSociete.filter(
        (s) => s.recettesMois !== 0 || s.depensesMois !== 0,
      ),
    [data.parSociete],
  );

  const recettes = useMemo(() => {
    const rows = [...societesActives]
      .map((s) => ({
        id: s.colonne,
        label: societeLabel(s),
        value: s.recettesMois,
      }))
      .sort((a, b) => b.value - a.value);
    const max = rows[0]?.value ?? 0;
    const avg =
      rows.length === 0
        ? 0
        : rows.reduce((s, r) => s + r.value, 0) / rows.length;
    return { rows, max, avg };
  }, [societesActives]);

  const depenses = useMemo(() => {
    const rows = [...societesActives]
      .map((s) => ({
        id: s.colonne,
        label: societeLabel(s),
        value: s.depensesMois,
      }))
      .sort((a, b) => b.value - a.value);
    const max = rows[0]?.value ?? 0;
    const peak = new Set(rows.slice(0, 3).map((r) => r.id));
    return { rows, max, peak };
  }, [societesActives]);

  const tone = trendTone(data.variationDepuis1erJanvier);

  return (
    <div
      id="tresorerie-print-sheet"
      className="hidden print:block"
      aria-hidden
    >
      <TresoreriePrintBanner periode={periode} fileName={data.fileName} />

      {/* KPI */}
      <section className="print-block">
        <h2 className="print-h2">Indicateurs de synthèse</h2>
        <div className="print-kpi-grid">
          <article className="print-kpi">
            <p className="print-kpi-label">Position nette de trésorerie</p>
            <p className="print-kpi-hint">hors placements</p>
            <p className="print-kpi-value">{formatEur(data.positionNette)}</p>
          </article>
          <article className="print-kpi">
            <p className="print-kpi-label">Total Général</p>
            <p className="print-kpi-hint">placements inclus</p>
            <p className="print-kpi-value">{formatEur(data.totalGeneral)}</p>
          </article>
          <article className="print-kpi">
            <p className="print-kpi-label">% Placements</p>
            <p className="print-kpi-hint">part d&apos;épargne</p>
            <p className="print-kpi-value">
              {formatPct(data.pctPlacements, 1)}
            </p>
          </article>
          <article className="print-kpi">
            <p className="print-kpi-label">Variation depuis le 01/01</p>
            <p className="print-kpi-hint">depuis le 1er janvier</p>
            <p
              className={`print-kpi-value inline-flex items-center gap-1 ${
                tone === "success"
                  ? "text-success"
                  : tone === "danger"
                    ? "text-danger"
                    : ""
              }`}
            >
              <TrendArrow tone={tone} className="size-3.5" />
              {formatEurSigned(data.variationDepuis1erJanvier)}
            </p>
          </article>
        </div>
      </section>

      {/* Pays + composition */}
      <div className="print-mid-grid">
        <section className="print-block">
          <h2 className="print-h2">Répartition par pays</h2>
          <p className="print-sub">
            Total soldes positifs {formatEur(pays.totalPos)}
          </p>
          <div className="print-pays-layout">
            <div className="print-donut">
              {pays.pie.length === 0 ? (
                <div className="print-donut-empty">—</div>
              ) : (
                <PieChart width={88} height={88}>
                  <Pie
                    data={pays.pie}
                    dataKey="value"
                    nameKey="name"
                    cx={44}
                    cy={44}
                    innerRadius={26}
                    outerRadius={38}
                    paddingAngle={pays.pie.length > 1 ? 2 : 0}
                    stroke="#fff"
                    strokeWidth={1}
                    isAnimationActive={false}
                  >
                    {pays.pie.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              )}
              <div className="print-donut-center">
                <span>Total</span>
                <strong>{formatEur(pays.totalPos)}</strong>
              </div>
            </div>
            <ul className="print-legend">
              {pays.rows.map((row) => (
                <li key={row.name} className={row.isZero ? "opacity-45" : ""}>
                  <span
                    className="print-swatch"
                    style={{ backgroundColor: row.fill }}
                  />
                  <span className="print-legend-name">{row.name}</span>
                  <span className="print-legend-bar">
                    <span
                      style={{
                        width: `${Math.min(100, row.pct * 100)}%`,
                        backgroundColor: row.fill,
                      }}
                    />
                  </span>
                  <span className="print-legend-val">
                    {formatEur(row.value)}
                  </span>
                  <span className="print-legend-pct">
                    {formatPct(row.pct, 1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {pays.negatifs.length > 0 ? (
            <p className="print-neg">
              Soldes négatifs :{" "}
              {pays.negatifs
                .map(
                  (n) => `${n.pays} ${formatEurSigned(n.montantTotal)}`,
                )
                .join(" · ")}
            </p>
          ) : null}
        </section>

        <section className="print-block">
          <h2 className="print-h2">Composition des dépenses</h2>
          <p className="print-sub">Répartition du total des dépenses</p>
          <div className="print-stack">
            {composition.map((c) => (
              <span
                key={c.key}
                style={{
                  flex: `${Math.max(c.pct * 100, c.montant > 0 ? 0.5 : 0)} 1 0`,
                  backgroundColor: c.fill,
                  display: c.montant === 0 ? "none" : undefined,
                }}
                title={c.label}
              />
            ))}
          </div>
          <ul className="print-legend print-legend-comp">
            {composition.map((c) => (
              <li key={c.key} className={c.montant === 0 ? "opacity-45" : ""}>
                <span
                  className="print-swatch"
                  style={{ backgroundColor: c.fill }}
                />
                <span className="print-legend-name">{c.label}</span>
                <span className="print-legend-bar">
                  <span
                    style={{
                      width: `${Math.min(100, c.pct * 100)}%`,
                      backgroundColor: c.fill,
                    }}
                  />
                </span>
                <span className="print-legend-val">
                  {formatEur(c.montant)}
                </span>
                <span className="print-legend-pct">{formatPct(c.pct, 1)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Recettes / dépenses — barres horizontales lisibles */}
      <section className="print-block print-flux">
        <h2 className="print-h2">Recettes &amp; dépenses du mois</h2>
        <div className="print-flux-grid">
          <div>
            <div className="print-flux-head">
              <h3>Recettes par société</h3>
              <strong>{formatEur(data.totalRecettes)}</strong>
            </div>
            <p className="print-sub print-sub-tight">
              Moyenne {formatEur(Math.round(recettes.avg))}
            </p>
            <div className="print-bar-list">
              {recettes.rows.map((r) => (
                <BarRow
                  key={r.id}
                  label={r.label}
                  value={r.value}
                  max={recettes.max}
                  fill="#29235C"
                />
              ))}
            </div>
          </div>
          <div>
            <div className="print-flux-head">
              <h3>Dépenses par société</h3>
              <strong>{formatEur(data.totalDepenses)}</strong>
            </div>
            <p className="print-sub print-sub-tight">Pics en jaune (top 3)</p>
            <div className="print-bar-list">
              {depenses.rows.map((r) => (
                <BarRow
                  key={r.id}
                  label={r.label}
                  value={r.value}
                  max={depenses.max}
                  fill={depenses.peak.has(r.id) ? "#EBCA09" : "#29235C"}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
