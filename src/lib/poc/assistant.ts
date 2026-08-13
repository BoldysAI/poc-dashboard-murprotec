/**
 * Assistant IA POC — fallback déterministe si OpenAI indisponible.
 * Chemin nominal : `POST /api/assistant` + `OPENAI_API_KEY` (.env.local).
 */

import type {
  ReportingBundle,
  ReportingMonthId,
  TresorerieData,
} from "@/types/dashboard";
import {
  buildReportingBundleAlerts,
  buildTresorerieAlerts,
  sortAlerts,
} from "./alerts";
import {
  buildReportingBrief,
  buildReportingBundleBrief,
  buildTresorerieBrief,
} from "./brief";
import { formatEur, formatEurSigned, formatPct } from "./format";
import {
  resolveBundleViews,
  resolveReportingView,
} from "@/lib/reporting/month-view";

export type AssistantContext = {
  tresorerie: TresorerieData | null;
  reporting: ReportingBundle | null;
  selectedAgenceId: string | null;
  selectedMonthId: ReportingMonthId | null;
};

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export const SUGGESTED_QUESTIONS = [
  "Quel est le résumé du mois ?",
  "Quels sont les points d’attention ?",
  "Quelle agence a le plus fort CA ?",
  "Comment va la trésorerie ?",
  "Donne-moi un conseil",
] as const;

function normalize(q: string): string {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function selectedAgencyView(ctx: AssistantContext) {
  if (!ctx.reporting || !ctx.selectedAgenceId) return null;
  const agency =
    ctx.reporting.agencies.find((a) => a.agenceId === ctx.selectedAgenceId) ??
    null;
  if (!agency) return null;
  return resolveReportingView(agency, ctx.selectedMonthId);
}

function answerResume(ctx: AssistantContext): string {
  const parts: string[] = [];
  if (ctx.tresorerie) {
    const b = buildTresorerieBrief(ctx.tresorerie);
    parts.push(
      `**Trésorerie** — ${b.bullets.map((x) => x.text).join(" ")} Conseil : ${b.conseil}`,
    );
  }
  const agence = selectedAgencyView(ctx);
  if (agence) {
    const b = buildReportingBrief(agence);
    parts.push(
      `**Reporting (${agence.agenceCible})** — ${b.bullets.map((x) => x.text).join(" ")}`,
    );
  } else if (ctx.reporting) {
    const b = buildReportingBundleBrief(ctx.reporting, ctx.selectedMonthId);
    parts.push(`**Reporting** — ${b.bullets.map((x) => x.text).join(" ")}`);
  }
  if (parts.length === 0) {
    return "Aucun fichier n’est chargé. Importez d’abord la trésorerie (.xls) et/ou le reporting (.xlsx) pour que je puisse commenter les chiffres.";
  }
  return parts.join("\n\n");
}

function answerAlertes(ctx: AssistantContext): string {
  const alerts = sortAlerts([
    ...(ctx.tresorerie ? buildTresorerieAlerts(ctx.tresorerie) : []),
    ...(ctx.reporting
      ? buildReportingBundleAlerts(ctx.reporting, ctx.selectedMonthId)
      : []),
  ]);
  if (alerts.length === 0) {
    if (!ctx.tresorerie && !ctx.reporting) {
      return "Chargez un fichier pour détecter les écarts de seuils et variations.";
    }
    return "Aucun point d’attention majeur : seuils et variations sont dans une zone favorable sur les données chargées.";
  }
  const lines = alerts
    .slice(0, 8)
    .map(
      (a, i) =>
        `${i + 1}. **${a.title}** (${a.severity}) — ${a.detail}`,
    );
  return `Voici ${Math.min(alerts.length, 8)} point${alerts.length > 1 ? "s" : ""} d’attention :\n\n${lines.join("\n")}`;
}

function answerTopAgence(ctx: AssistantContext): string {
  if (!ctx.reporting || ctx.reporting.agencies.length === 0) {
    return "Le reporting n’est pas chargé. Uploadez le fichier multi-agences pour comparer les CA.";
  }
  const sorted = resolveBundleViews(
    ctx.reporting.agencies,
    ctx.selectedMonthId,
  ).sort((a, b) => b.caTotal - a.caTotal);
  const top = sorted[0];
  if (!top) return "Aucune agence disponible.";
  const runner = sorted[1];
  let text = `**${top.agenceCible}** mène avec un CA de ${formatEur(top.caTotal)} (marge ${formatPct(top.margeBrute)}).`;
  if (runner) {
    text += ` Ensuite : ${runner.agenceCible} à ${formatEur(runner.caTotal)}.`;
  }
  return text;
}

function answerTresorerie(ctx: AssistantContext): string {
  if (!ctx.tresorerie) {
    return "La trésorerie n’est pas chargée. Importez le fichier mensuel .xls pour que je commente la position nette et les flux.";
  }
  const d = ctx.tresorerie;
  return [
    `Position nette hors placements : **${formatEur(d.positionNette)}**.`,
    `Total général (placements inclus) : **${formatEur(d.totalGeneral)}**.`,
    `Variation depuis le 01/01 : **${formatEurSigned(d.variationDepuis1erJanvier)}**.`,
    `Placements : **${formatPct(d.pctPlacements)}**.`,
    `Flux du mois — recettes ${formatEur(d.totalRecettes)}, dépenses ${formatEur(d.totalDepenses)}.`,
  ].join(" ");
}

function answerConseil(ctx: AssistantContext): string {
  if (!ctx.tresorerie && !ctx.reporting) {
    return "Commencez par charger les fichiers Excel du mois — ensuite je pourrai proposer une lecture priorisée.";
  }
  const agence = selectedAgencyView(ctx);
  if (agence) {
    return buildReportingBrief(agence).conseil;
  }
  if (ctx.tresorerie) {
    return buildTresorerieBrief(ctx.tresorerie).conseil;
  }
  if (ctx.reporting) {
    return buildReportingBundleBrief(ctx.reporting, ctx.selectedMonthId).conseil;
  }
  return "Surveillez les taux en écart et la variation vs N-1 avant de figurer le mois.";
}

function answerMarge(ctx: AssistantContext): string {
  const agence = selectedAgencyView(ctx);
  if (!agence) {
    return "Sélectionnez une agence dans le reporting (après upload) pour commenter la marge.";
  }
  const delta = agence.beneficeBrut - agence.beneficeBrutN1;
  return `Sur **${agence.agenceCible}**, marge brute ${formatPct(agence.margeBrute)}, bénéfice brut ${formatEur(agence.beneficeBrut)} (${formatEurSigned(delta)} vs N-1). Profit après impôts du mois : ${formatEur(agence.profitApresImpots)}.`;
}

function answerGeneric(ctx: AssistantContext, q: string): string {
  const hasData = Boolean(ctx.tresorerie || ctx.reporting);
  if (!hasData) {
    return "Je m’appuie uniquement sur les chiffres chargés dans cette session. Uploadez un fichier trésorerie ou reporting, puis reposez votre question — ou choisissez une suggestion ci-dessous.";
  }
  return [
    `Je n’ai pas de réponse dédiée pour « ${q.trim()} ».`,
    "Essayez une suggestion : résumé du mois, points d’attention, plus fort CA, trésorerie, ou conseil.",
    "Dans la version produit, un modèle LLM pourra croiser tout l’historique et vos règles métier.",
  ].join(" ");
}

/** Répond à une question utilisateur à partir du contexte session. */
export function answerAssistantQuestion(
  question: string,
  ctx: AssistantContext,
): string {
  const q = normalize(question);
  if (!q) {
    return "Posez une question sur les chiffres chargés, ou choisissez une suggestion.";
  }

  if (
    q.includes("resume") ||
    q.includes("synthese") ||
    q.includes("brief") ||
    q.includes("mois")
  ) {
    if (
      q.includes("attention") ||
      q.includes("alerte") ||
      q.includes("point")
    ) {
      return answerAlertes(ctx);
    }
    return answerResume(ctx);
  }

  if (
    q.includes("alerte") ||
    q.includes("attention") ||
    q.includes("ecart") ||
    q.includes("seuil") ||
    q.includes("danger")
  ) {
    return answerAlertes(ctx);
  }

  if (
    q.includes("agence") &&
    (q.includes("ca") ||
      q.includes("fort") ||
      q.includes("meilleur") ||
      q.includes("plus") ||
      q.includes("tire"))
  ) {
    return answerTopAgence(ctx);
  }

  if (
    q.includes("tresor") ||
    q.includes("position nette") ||
    q.includes("placement") ||
    q.includes("liquidit")
  ) {
    return answerTresorerie(ctx);
  }

  if (
    q.includes("conseil") ||
    q.includes("recommand") ||
    q.includes("priorit") ||
    q.includes("que faire")
  ) {
    return answerConseil(ctx);
  }

  if (
    q.includes("marge") ||
    q.includes("benefice") ||
    q.includes("profit")
  ) {
    return answerMarge(ctx);
  }

  if (q.includes("ca") || q.includes("chiffre d") || q.includes("radar")) {
    return answerTopAgence(ctx);
  }

  return answerGeneric(ctx, question);
}
