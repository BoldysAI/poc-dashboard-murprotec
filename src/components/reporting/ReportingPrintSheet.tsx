"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import type { ReportingData } from "@/types/dashboard";
import {
  deltaAbsolu,
  deltaRelatif,
  formatEur,
  formatEurSigned,
  formatMois,
  formatPct,
  formatPctSigned,
  trendTone,
} from "./format-reporting";
import { ReportingPrintBanner } from "./ReportingPrintBanner";

const CA_COLORS = [
  "#29235C",
  "#3D3680",
  "#524A9A",
  "#EBCA09",
  "#C4A808",
  "#8B84B0",
] as const;

const CHARGE_SEGMENTS = [
  { key: "technique" as const, label: "Technique", fill: "#29235C" },
  { key: "vente" as const, label: "Vente", fill: "#EBCA09" },
  { key: "administration" as const, label: "Administration", fill: "#8B84B0" },
  { key: "financier" as const, label: "Financier", fill: "#C4C0D6" },
];

type ReportingPrintSheetProps = {
  /** Une ou plusieurs agences — une page PDF par entrée */
  datasets: ReportingData[];
};

function periodeLabel(data: ReportingData): string {
  const mois = data.periodeMois.trim().toLowerCase();
  if (data.periodeAnnee !== null) return `données ${mois} ${data.periodeAnnee}`;
  return `données ${mois}`;
}

function ReportingPrintPage({ data }: { data: ReportingData }) {
  const delta = deltaAbsolu(data.beneficeBrut, data.beneficeBrutN1);
  const rel = deltaRelatif(data.beneficeBrut, data.beneficeBrutN1);
  const toneBenef = trendTone(delta);
  const toneVar = trendTone(data.variationVsN1);

  const caSlices = useMemo(() => {
    // Couleurs = index d’origine fichier (comme RepartitionCaChart), puis tri décroissant
    const withPct = data.repartitionCA.map((item, index) => {
      const isZero = item.montant === 0;
      const pct = data.caTotal === 0 ? 0 : item.montant / data.caTotal;
      const fill = isZero
        ? "#C8C6D4"
        : CA_COLORS[index % CA_COLORS.length];
      return {
        name: item.categorie,
        value: item.montant,
        pct,
        isZero,
        fill,
      };
    });
    return [...withPct].sort((a, b) => b.value - a.value);
  }, [data.repartitionCA, data.caTotal]);

  const pieData = caSlices.filter((s) => s.value > 0);

  const chargesTotal =
    data.structureCharges.technique +
    data.structureCharges.vente +
    data.structureCharges.administration +
    data.structureCharges.financier;

  const chargeParts = CHARGE_SEGMENTS.map((s) => {
    const montant = data.structureCharges[s.key];
    const pct = chargesTotal === 0 ? 0 : montant / chargesTotal;
    return { ...s, montant, pct };
  });

  const ecartBe = data.caTotal - data.breakEven;
  const auDessus = data.caTotal >= data.breakEven;

  return (
    <div className="print-page">
      <ReportingPrintBanner
        agenceLibelle={data.agenceLibelle}
        periodeLabel={periodeLabel(data)}
        fileName={data.fileName}
      />

      <section className="print-block">
        <h2 className="print-h2">Synthèse</h2>
        <div className="print-kpi-grid">
          <article className="print-kpi">
            <p className="print-kpi-label">Bénéfice brut</p>
            <p className="print-kpi-hint">
              Marge {formatPct(data.margeBrute, 2)}
            </p>
            <p className="print-kpi-value">{formatEur(data.beneficeBrut)}</p>
            <p
              className="print-kpi-hint"
              style={{
                color:
                  toneBenef === "success"
                    ? "#1b7a4e"
                    : toneBenef === "danger"
                      ? "#b42318"
                      : undefined,
              }}
            >
              vs N-1 {formatEurSigned(delta)}
              {rel !== null ? ` (${formatPctSigned(rel, 1)})` : ""}
            </p>
          </article>
          <article className="print-kpi">
            <p className="print-kpi-label">Variation globale vs N-1</p>
            <p className="print-kpi-hint">Profit après impôts</p>
            <p
              className="print-kpi-value"
              style={{
                color:
                  toneVar === "success"
                    ? "#1b7a4e"
                    : toneVar === "danger"
                      ? "#b42318"
                      : undefined,
              }}
            >
              {formatEurSigned(data.variationVsN1)}
            </p>
            <p className="print-kpi-hint">
              Mois : {formatEur(data.profitApresImpots)}
            </p>
          </article>
          <article className="print-kpi">
            <p className="print-kpi-label">CA total</p>
            <p className="print-kpi-value">{formatEur(data.caTotal)}</p>
          </article>
          <article className="print-kpi">
            <p className="print-kpi-label">Seuil de rentabilité</p>
            <p className="print-kpi-value">{formatEur(data.breakEven)}</p>
            <p
              className="print-kpi-hint"
              style={{ color: auDessus ? "#1b7a4e" : "#b42318" }}
            >
              {auDessus ? "Au-dessus" : "En dessous"} ({formatEurSigned(ecartBe)})
            </p>
          </article>
        </div>
      </section>

      <section className="print-block">
        <h2 className="print-h2">Taux clés</h2>
        <div className="print-taux-grid">
          {data.tauxCles.map((t) => (
            <article key={t.nom} className="print-taux">
              <p className="print-taux-label">{t.nom}</p>
              <p
                className="print-taux-value"
                style={{
                  color:
                    t.statut === "ok"
                      ? "#1b7a4e"
                      : t.statut === "danger"
                        ? "#b42318"
                        : t.statut === "warning"
                          ? "#b45309"
                          : undefined,
                }}
              >
                {formatPct(t.valeur, 1)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="print-mid-grid">
        <section className="print-block">
          <h2 className="print-h2">Répartition du CA</h2>
          <div className="print-pays-layout">
            <div className="print-donut">
              {pieData.length === 0 ? (
                <div className="print-donut-empty">—</div>
              ) : (
                <PieChart width={120} height={120}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx={60}
                    cy={60}
                    innerRadius={34}
                    outerRadius={52}
                    paddingAngle={pieData.length > 1 ? 1 : 0}
                    stroke="#fff"
                    strokeWidth={1}
                    isAnimationActive={false}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              )}
              <div className="print-donut-center">
                <span>Total</span>
                <strong>{formatEur(data.caTotal)}</strong>
              </div>
            </div>
            <ul className="print-legend">
              {caSlices.map((row) => (
                <li key={row.name}>
                  <span
                    className="print-swatch"
                    style={{ backgroundColor: row.fill }}
                  />
                  <span className="print-legend-name">{row.name}</span>
                  <span className="print-legend-val">
                    {formatEur(row.value)}
                  </span>
                  <span className="print-legend-pct">
                    {formatPct(row.pct, 0)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="print-block">
          <h2 className="print-h2">Charges &amp; rentabilité</h2>
          <p className="print-sub">Structure des charges</p>
          <div className="print-stack">
            {chargeParts.map((c) => (
              <span
                key={c.key}
                style={{
                  flexGrow: Math.max(c.pct * 100, c.montant > 0 ? 0.5 : 0),
                  backgroundColor: c.fill,
                  minWidth: c.montant > 0 ? 2 : 0,
                }}
                title={`${c.label} ${formatEur(c.montant)}`}
              />
            ))}
          </div>
          <ul className="print-legend print-legend-comp">
            {chargeParts.map((c) => (
              <li key={c.key}>
                <span
                  className="print-swatch"
                  style={{ backgroundColor: c.fill }}
                />
                <span className="print-legend-name">{c.label}</span>
                <span className="print-legend-val">{formatEur(c.montant)}</span>
                <span className="print-legend-pct">{formatPct(c.pct, 0)}</span>
              </li>
            ))}
          </ul>
          <p className="print-sub" style={{ marginTop: 4 }}>
            Frais fixes {formatEur(data.fraisFixes)} · Seuil{" "}
            {formatEur(data.breakEven)}
          </p>
        </section>
      </div>

      {data.chiffresClesDisponibles ? (
        <section className="print-block">
          <h2 className="print-h2">Pilotage commercial</h2>
          <div className="print-kpi-grid print-kpi-grid-3">
            <article className="print-kpi">
              <p className="print-kpi-label">Cahier de commande</p>
              <p className="print-kpi-value">
                {formatEur(data.cahierCommande.montant)}
              </p>
              <p className="print-kpi-hint">
                {formatMois(data.cahierCommande.nbMois)} mois de facturation
              </p>
            </article>
            <article className="print-kpi">
              <p className="print-kpi-label">Impayés</p>
              <p className="print-kpi-value">
                {formatEur(data.impayes.listeRouge)}
              </p>
              <p className="print-kpi-hint">
                {formatMois(data.impayes.nbMois)} mois · seuil{" "}
                {formatMois(data.impayes.seuil, 0)} mois
              </p>
            </article>
            <article className="print-kpi">
              <p className="print-kpi-label">Euro / coupon</p>
              <p className="print-kpi-value">
                {formatEur(data.euroCoupon.valeur)}
              </p>
              <p className="print-kpi-hint">
                seuil {formatEur(data.euroCoupon.seuil)}
              </p>
            </article>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/**
 * Feuille(s) PDF dédiée(s) — layout A4 paysage, une page par agence.
 * Invisible à l’écran (`hidden print:block`).
 */
export function ReportingPrintSheet({ datasets }: ReportingPrintSheetProps) {
  if (datasets.length === 0) return null;

  return (
    <div
      id="reporting-print-sheet"
      className="hidden print:block"
      aria-hidden
    >
      {datasets.map((data) => (
        <ReportingPrintPage key={data.agenceId} data={data} />
      ))}
    </div>
  );
}
