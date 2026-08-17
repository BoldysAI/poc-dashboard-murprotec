/**
 * Centre d’alertes POC — dérive des seuils / deltas déjà dans les données session.
 * Aucun mapping Excel inventé.
 */

import type {
  ReportingBundle,
  ReportingData,
  ReportingMonthId,
  TresorerieData,
} from "@/types/dashboard";
import { resolveReportingView } from "@/lib/reporting/month-view";
import { formatEur, formatEurSigned, formatMois, formatPct } from "./format";

export type AlertSeverity = "danger" | "warning" | "info";

export type PocAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  /** Domaine pour filtrage UI */
  scope: "tresorerie" | "reporting";
  /** Agence (reporting) — pour regroupement dans le centre d’alertes */
  agenceId?: string;
  agenceLabel?: string;
};

function reportingAlertsForAgency(data: ReportingData): PocAlert[] {
  const alerts: PocAlert[] = [];
  const agenceMeta = {
    agenceId: data.agenceId,
    agenceLabel: data.agenceCible,
  };

  if (data.variationBeneficeNetVsN1 < 0) {
    alerts.push({
      id: `var-${data.agenceId}`,
      severity: "danger",
      title: "Variation vs N-1",
      detail: `Profit après impôts en baisse de ${formatEurSigned(data.variationBeneficeNetVsN1)} par rapport à N-1.`,
      scope: "reporting",
      ...agenceMeta,
    });
  }

  for (const taux of data.tauxCles) {
    if (taux.statut !== "warning" && taux.statut !== "danger") continue;
    alerts.push({
      id: `taux-${data.agenceId}-${taux.nom}`,
      severity: taux.statut === "danger" ? "danger" : "warning",
      title: taux.nom,
      detail:
        taux.seuilMax !== null && taux.seuilMin !== null
          ? `Taux à ${formatPct(taux.valeur)} (fourchette ${formatPct(taux.seuilMin)}–${formatPct(taux.seuilMax)}).`
          : taux.seuil !== null
            ? `Taux à ${formatPct(taux.valeur)} (seuil ${formatPct(taux.seuil)}).`
            : `Taux à ${formatPct(taux.valeur)} hors zone attendue.`,
      scope: "reporting",
      ...agenceMeta,
    });
  }

  if (data.chiffresClesDisponibles) {
    if (data.impayes.nbMois > data.impayes.seuil) {
      alerts.push({
        id: `impayes-${data.agenceId}`,
        severity: "danger",
        title: "Impayés",
        detail: `${formatEur(data.impayes.listeRouge)} en liste rouge (${formatMois(data.impayes.nbMois)} mois, seuil ${formatMois(data.impayes.seuil, 0)}).`,
        scope: "reporting",
        ...agenceMeta,
      });
    }
    if (data.euroCoupon.valeur < data.euroCoupon.seuil) {
      alerts.push({
        id: `euro-${data.agenceId}`,
        severity: "danger",
        title: "Euro / coupon",
        detail: `Valeur ${formatEur(data.euroCoupon.valeur)} en dessous du seuil ${formatEur(data.euroCoupon.seuil)}.`,
        scope: "reporting",
        ...agenceMeta,
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

/** Alertes d’une seule agence (brief agence / assistant ciblé). */
export function buildReportingAlerts(data: ReportingData): PocAlert[] {
  return reportingAlertsForAgency(data);
}

/** Toutes les agences du bundle — centre d’alertes reporting + brief / assistant. */
export function buildReportingBundleAlerts(
  bundle: ReportingBundle,
  monthId: ReportingMonthId | null = null,
): PocAlert[] {
  return bundle.agencies.flatMap((a) =>
    sortAlerts(reportingAlertsForAgency(resolveReportingView(a, monthId))),
  );
}

export function sortAlerts(alerts: PocAlert[]): PocAlert[] {
  const rank: Record<AlertSeverity, number> = {
    danger: 0,
    warning: 1,
    info: 2,
  };
  return [...alerts].sort((a, b) => rank[a.severity] - rank[b.severity]);
}
