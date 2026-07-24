/**
 * Centre d’alertes POC — dérive des seuils / deltas déjà dans les données session.
 * Aucun mapping Excel inventé.
 */

import type { ReportingBundle, ReportingData, TresorerieData } from "@/types/dashboard";
import { formatEur, formatEurSigned, formatMois, formatPct } from "./format";

export type AlertSeverity = "danger" | "warning" | "info";

export type PocAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  /** Domaine pour filtrage UI */
  scope: "tresorerie" | "reporting";
};

function reportingAlertsForAgency(data: ReportingData): PocAlert[] {
  const alerts: PocAlert[] = [];
  const agence = data.agenceCible;

  if (data.variationVsN1 < 0) {
    alerts.push({
      id: `var-${data.agenceId}`,
      severity: "danger",
      title: `${agence} — variation vs N-1`,
      detail: `Profit après impôts en baisse de ${formatEurSigned(data.variationVsN1)} par rapport à N-1.`,
      scope: "reporting",
    });
  }

  for (const taux of data.tauxCles) {
    if (taux.statut !== "warning" && taux.statut !== "danger") continue;
    alerts.push({
      id: `taux-${data.agenceId}-${taux.nom}`,
      severity: taux.statut === "danger" ? "danger" : "warning",
      title: `${agence} — ${taux.nom}`,
      detail:
        taux.seuilMax !== null && taux.seuilMin !== null
          ? `Taux à ${formatPct(taux.valeur)} (fourchette ${formatPct(taux.seuilMin)}–${formatPct(taux.seuilMax)}).`
          : taux.seuil !== null
            ? `Taux à ${formatPct(taux.valeur)} (seuil ${formatPct(taux.seuil)}).`
            : `Taux à ${formatPct(taux.valeur)} hors zone attendue.`,
      scope: "reporting",
    });
  }

  if (data.chiffresClesDisponibles) {
    if (data.impayes.nbMois > data.impayes.seuil) {
      alerts.push({
        id: `impayes-${data.agenceId}`,
        severity: "danger",
        title: `${agence} — impayés`,
        detail: `${formatEur(data.impayes.listeRouge)} en liste rouge (${formatMois(data.impayes.nbMois)} mois, seuil ${formatMois(data.impayes.seuil, 0)}).`,
        scope: "reporting",
      });
    }
    if (data.euroCoupon.valeur > data.euroCoupon.seuil) {
      alerts.push({
        id: `euro-${data.agenceId}`,
        severity: "danger",
        title: `${agence} — euro / coupon`,
        detail: `Valeur ${formatEur(data.euroCoupon.valeur)} au-dessus du seuil ${formatEur(data.euroCoupon.seuil)}.`,
        scope: "reporting",
      });
    }
  }

  return alerts;
}

export function buildTresorerieAlerts(data: TresorerieData): PocAlert[] {
  const alerts: PocAlert[] = [];

  if (data.variationDepuis1erJanvier < 0) {
    alerts.push({
      id: "treso-variation",
      severity: "danger",
      title: "Variation depuis le 01/01",
      detail: `Position nette en baisse de ${formatEurSigned(data.variationDepuis1erJanvier)} depuis le début d’année.`,
      scope: "tresorerie",
    });
  }

  if (data.totalDepenses > data.totalRecettes && data.totalRecettes > 0) {
    alerts.push({
      id: "treso-depenses",
      severity: "warning",
      title: "Dépenses > recettes du mois",
      detail: `Dépenses ${formatEur(data.totalDepenses)} pour des recettes de ${formatEur(data.totalRecettes)}.`,
      scope: "tresorerie",
    });
  }

  if (data.positionNette < 0) {
    alerts.push({
      id: "treso-position",
      severity: "danger",
      title: "Position nette négative",
      detail: `Position nette hors placements à ${formatEur(data.positionNette)}.`,
      scope: "tresorerie",
    });
  }

  return alerts;
}

/** Alertes de l’agence active uniquement (écran reporting). */
export function buildReportingAlerts(data: ReportingData): PocAlert[] {
  return reportingAlertsForAgency(data);
}

/** Toutes les agences du bundle — pour brief / assistant. */
export function buildReportingBundleAlerts(bundle: ReportingBundle): PocAlert[] {
  return bundle.agencies.flatMap(reportingAlertsForAgency);
}

export function sortAlerts(alerts: PocAlert[]): PocAlert[] {
  const rank: Record<AlertSeverity, number> = {
    danger: 0,
    warning: 1,
    info: 2,
  };
  return [...alerts].sort((a, b) => rank[a.severity] - rank[b.severity]);
}
