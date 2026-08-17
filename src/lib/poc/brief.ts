/**
 * Brief du mois POC — narration à partir des chiffres session (pas d’invention).
 */

import type {
  ReportingBundle,
  ReportingData,
  ReportingMonthId,
  TresorerieData,
} from "@/types/dashboard";
import { resolveBundleViews } from "@/lib/reporting/month-view";
import {
  buildReportingAlerts,
  buildTresorerieAlerts,
  sortAlerts,
  type PocAlert,
} from "./alerts";
import { formatEur, formatEurSigned, formatPct } from "./format";

export type BriefBullet = {
  id: string;
  tone: "neutral" | "success" | "warning" | "danger";
  text: string;
};

export type MonthBrief = {
  title: string;
  subtitle: string;
  bullets: BriefBullet[];
  conseil: string;
};

function topPays(data: TresorerieData): string | null {
  const sorted = [...data.parPays].sort(
    (a, b) => b.montantTotal - a.montantTotal,
  );
  const first = sorted[0];
  if (!first || first.montantTotal <= 0) return null;
  return `${first.pays} (${formatEur(first.montantTotal)})`;
}

export function buildTresorerieBrief(data: TresorerieData): MonthBrief {
  const bullets: BriefBullet[] = [];
  const alerts = sortAlerts(buildTresorerieAlerts(data));

  bullets.push({
    id: "pos",
    tone: data.positionNette >= 0 ? "success" : "danger",
    text: `Position nette hors placements : ${formatEur(data.positionNette)} (total général ${formatEur(data.totalGeneral)}).`,
  });

  bullets.push({
    id: "var",
    tone:
      data.variationDepuis1erJanvier > 0
        ? "success"
        : data.variationDepuis1erJanvier < 0
          ? "danger"
          : "neutral",
    text: `Variation depuis le 01/01 : ${formatEurSigned(data.variationDepuis1erJanvier)}.`,
  });

  bullets.push({
    id: "placements",
    tone: "neutral",
    text: `Part des placements : ${formatPct(data.pctPlacements)}.`,
  });

  const pays = topPays(data);
  if (pays) {
    bullets.push({
      id: "pays",
      tone: "neutral",
      text: `Plus gros solde pays : ${pays}.`,
    });
  }

  bullets.push({
    id: "flux",
    tone:
      data.totalDepenses > data.totalRecettes ? "warning" : "neutral",
    text: `Mois : recettes ${formatEur(data.totalRecettes)} · dépenses ${formatEur(data.totalDepenses)}.`,
  });

  const conseil = conseilFromAlerts(
    alerts,
    data.variationDepuis1erJanvier >= 0
      ? "Trésorerie globale orientée favorablement — surveiller la composition des dépenses du mois."
      : "Prioriser le suivi des sociétés à solde négatif et le rythme dépenses / recettes.",
  );

  return {
    title: "Brief du mois",
    subtitle: "Synthèse trésorerie groupe",
    bullets: bullets.slice(0, 6),
    conseil,
  };
}

export function buildReportingBrief(data: ReportingData): MonthBrief {
  const bullets: BriefBullet[] = [];
  const alerts = sortAlerts(buildReportingAlerts(data));
  const deltaBenef = data.beneficeBrut - data.beneficeBrutN1;

  bullets.push({
    id: "ca",
    tone: "neutral",
    text: `CA du mois : ${formatEur(data.caTotal)} — marge brute ${formatPct(data.margeBrute)}.`,
  });

  bullets.push({
    id: "benef",
    tone: deltaBenef > 0 ? "success" : deltaBenef < 0 ? "danger" : "neutral",
    text: `Bénéfice brut ${formatEur(data.beneficeBrut)} (${formatEurSigned(deltaBenef)} vs N-1).`,
  });

  bullets.push({
    id: "var",
    tone:
      data.variationBeneficeNetVsN1 > 0
        ? "success"
        : data.variationBeneficeNetVsN1 < 0
          ? "danger"
          : "neutral",
    text: `Variation profit après impôts vs N-1 : ${formatEurSigned(data.variationBeneficeNetVsN1)}.`,
  });

  const enAlerte = data.tauxCles.filter(
    (t) => t.statut === "warning" || t.statut === "danger",
  );
  if (enAlerte.length > 0) {
    bullets.push({
      id: "taux",
      tone: enAlerte.some((t) => t.statut === "danger") ? "danger" : "warning",
      text: `${enAlerte.length} taux clé${enAlerte.length > 1 ? "s" : ""} hors zone : ${enAlerte.map((t) => t.nom).join(", ")}.`,
    });
  } else {
    bullets.push({
      id: "taux-ok",
      tone: "success",
      text: "Tous les taux clés affichés sont dans la zone attendue.",
    });
  }

  if (data.chiffresClesDisponibles) {
    bullets.push({
      id: "cahier",
      tone: "neutral",
      text: `Cahier de commande : ${formatEur(data.cahierCommande.montant)} (~${data.cahierCommande.nbMois.toFixed(1)} mois de facturation).`,
    });
  }

  const conseil = conseilFromAlerts(
    alerts,
    deltaBenef >= 0 && data.variationBeneficeNetVsN1 >= 0
      ? "Agence en bonne trajectoire vs N-1 — garder le focus sur la rentabilité mensuelle."
      : "Analyser les postes de charges et les taux en écart avant le prochain COMEX.",
  );

  return {
    title: "Brief du mois",
    subtitle: data.agenceLibelle,
    bullets: bullets.slice(0, 6),
    conseil,
  };
}

/** Brief consolidé multi-agences (assistant / vue groupe). */
export function buildReportingBundleBrief(
  bundle: ReportingBundle,
  monthId: ReportingMonthId | null = null,
): MonthBrief {
  if (bundle.agencies.length === 0) {
    return {
      title: "Brief du mois",
      subtitle: "Reporting",
      bullets: [],
      conseil: "Chargez un fichier reporting pour générer la synthèse.",
    };
  }

  const views = resolveBundleViews(bundle.agencies, monthId);
  const totalCa = views.reduce((s, a) => s + a.caTotal, 0);
  const sorted = [...views].sort((a, b) => b.caTotal - a.caTotal);
  const top = sorted[0];
  const alertsCount = views.reduce(
    (n, a) => n + buildReportingAlerts(a).length,
    0,
  );

  const bullets: BriefBullet[] = [
    {
      id: "nb",
      tone: "neutral",
      text: `${views.length} agences chargées — CA consolidé du mois ${formatEur(totalCa)}.`,
    },
  ];

  if (top) {
    bullets.push({
      id: "top",
      tone: "neutral",
      text: `Plus fort CA : ${top.agenceCible} (${formatEur(top.caTotal)}).`,
    });
  }

  bullets.push({
    id: "alerts",
    tone: alertsCount > 0 ? "warning" : "success",
    text:
      alertsCount > 0
        ? `${alertsCount} point${alertsCount > 1 ? "s" : ""} d’attention détecté${alertsCount > 1 ? "s" : ""} sur le périmètre.`
        : "Aucun écart de seuil majeur détecté sur le périmètre chargé.",
  });

  return {
    title: "Brief du mois",
    subtitle: "Vue multi-agences",
    bullets,
    conseil:
      alertsCount > 0
        ? "Prioriser les agences en écart de seuils avant le prochain point COMEX."
        : "Périmètre reporting stable — garder le suivi mensuel des marges et du cahier de commande.",
  };
}

function conseilFromAlerts(alerts: PocAlert[], fallback: string): string {
  const first = alerts[0];
  if (!first) return fallback;
  if (first.severity === "danger") {
    return `Priorité : ${first.title}. ${first.detail}`;
  }
  return `À surveiller : ${first.title}. ${fallback}`;
}
