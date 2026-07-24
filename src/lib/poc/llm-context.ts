/**
 * Contexte compact envoyé au LLM — chiffres session uniquement, pas d’invention.
 */

import type { ReportingData } from "@/types/dashboard";
import {
  buildReportingAlerts,
  buildReportingBundleAlerts,
  buildTresorerieAlerts,
  sortAlerts,
} from "./alerts";
import type { AssistantContext } from "./assistant";

function compactAgence(a: ReportingData) {
  return {
    id: a.agenceId,
    code: a.agenceCible,
    libelle: a.agenceLibelle,
    periode: `${a.periodeMois}${a.periodeAnnee ? ` ${a.periodeAnnee}` : ""}`,
    caTotal: a.caTotal,
    beneficeBrut: a.beneficeBrut,
    margeBrute: a.margeBrute,
    beneficeBrutN1: a.beneficeBrutN1,
    profitApresImpots: a.profitApresImpots,
    variationVsN1: a.variationVsN1,
    fraisFixes: a.fraisFixes,
    breakEven: a.breakEven,
    structureCharges: a.structureCharges,
    tauxCles: a.tauxCles.map((t) => ({
      nom: t.nom,
      valeur: t.valeur,
      seuil: t.seuil,
      statut: t.statut,
    })),
    repartitionCA: a.repartitionCA,
    pilotage: a.chiffresClesDisponibles
      ? {
          cahierCommande: a.cahierCommande,
          impayes: a.impayes,
          euroCoupon: a.euroCoupon,
        }
      : null,
  };
}

export function buildLlmContextPayload(ctx: AssistantContext): {
  hasData: boolean;
  tresorerie: Record<string, unknown> | null;
  reporting: Record<string, unknown> | null;
  alertes: { title: string; severity: string; detail: string }[];
} {
  const tresorerie = ctx.tresorerie
    ? {
        fileName: ctx.tresorerie.fileName,
        positionNette: ctx.tresorerie.positionNette,
        totalGeneral: ctx.tresorerie.totalGeneral,
        pctPlacements: ctx.tresorerie.pctPlacements,
        soldeAu1erJanvier: ctx.tresorerie.soldeAu1erJanvier,
        variationDepuis1erJanvier: ctx.tresorerie.variationDepuis1erJanvier,
        totalRecettes: ctx.tresorerie.totalRecettes,
        totalDepenses: ctx.tresorerie.totalDepenses,
        compositionDepenses: ctx.tresorerie.compositionDepenses,
        parPays: ctx.tresorerie.parPays,
        // Top sociétés par solde (éviter payload trop gros)
        topSocietesParSolde: [...ctx.tresorerie.parSociete]
          .sort((a, b) => Math.abs(b.soldeCourant) - Math.abs(a.soldeCourant))
          .slice(0, 12)
          .map((s) => ({
            marque: s.marque,
            activite: s.activite,
            pays: s.pays,
            soldeCourant: s.soldeCourant,
            recettesMois: s.recettesMois,
            depensesMois: s.depensesMois,
          })),
      }
    : null;

  let reporting: Record<string, unknown> | null = null;
  if (ctx.reporting && ctx.reporting.agencies.length > 0) {
    const selected =
      ctx.reporting.agencies.find((a) => a.agenceId === ctx.selectedAgenceId) ??
      ctx.reporting.agencies[0];
    reporting = {
      fileName: ctx.reporting.fileName,
      agenceActive: selected ? compactAgence(selected) : null,
      toutesAgences: ctx.reporting.agencies.map((a) => ({
        code: a.agenceCible,
        caTotal: a.caTotal,
        margeBrute: a.margeBrute,
        profitApresImpots: a.profitApresImpots,
        variationVsN1: a.variationVsN1,
        tauxEnEcart: a.tauxCles
          .filter((t) => t.statut === "warning" || t.statut === "danger")
          .map((t) => t.nom),
      })),
    };
  }

  const alertes = sortAlerts([
    ...(ctx.tresorerie ? buildTresorerieAlerts(ctx.tresorerie) : []),
    ...(ctx.reporting
      ? ctx.selectedAgenceId
        ? (() => {
            const a = ctx.reporting.agencies.find(
              (x) => x.agenceId === ctx.selectedAgenceId,
            );
            return a
              ? buildReportingAlerts(a)
              : buildReportingBundleAlerts(ctx.reporting);
          })()
        : buildReportingBundleAlerts(ctx.reporting)
      : []),
  ]).map((a) => ({
    title: a.title,
    severity: a.severity,
    detail: a.detail,
  }));

  return {
    hasData: Boolean(tresorerie || reporting),
    tresorerie,
    reporting,
    alertes,
  };
}

export const ASSISTANT_SYSTEM_PROMPT = `Tu es l’assistant financier du POC MurProtec / Murpro Group, destiné à Thomas Di Donato (direction financière).

Règles strictes :
- Réponds en français, ton professionnel, clair et concis (3–8 phrases ou puces courtes).
- Tu ne t’appuies QUE sur le JSON « données session » fourni. N’invente jamais un montant, un %, une agence ou un seuil absent du JSON.
- Si une info manque dans le JSON, dis-le clairement et propose de charger le fichier Excel concerné.
- Tu peux commenter, comparer, prioriser et conseiller — mais sans inventer de règles métier hors des chiffres fournis.
- Montants en EUR ; pourcentages lisibles (ex. 12,5 %).
- Pas de jargon technique (Excel, cellules, API, parsing).
- Pas de markdown trop lourd : **gras** pour les chiffres clés OK, pas de titres #.`;

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export function buildOpenAiMessages(input: {
  question: string;
  ctx: AssistantContext;
  history?: ChatTurn[];
}): { role: "system" | "user" | "assistant"; content: string }[] {
  const payload = buildLlmContextPayload(input.ctx);
  const history = (input.history ?? []).slice(-6);

  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [{ role: "system", content: ASSISTANT_SYSTEM_PROMPT }];

  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.content });
  }

  messages.push({
    role: "user",
    content: [
      "Données session (JSON) :",
      JSON.stringify(payload),
      "",
      "Question de Thomas :",
      input.question.trim(),
    ].join("\n"),
  });

  return messages;
}
