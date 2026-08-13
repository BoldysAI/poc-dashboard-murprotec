import { NextResponse } from "next/server";
import {
  answerAssistantQuestion,
  type AssistantContext,
  type AssistantMessage,
} from "@/lib/poc/assistant";
import { buildOpenAiMessages } from "@/lib/poc/llm-context";
import type { ReportingBundle, TresorerieData } from "@/types/dashboard";

export const runtime = "nodejs";

type AssistantRequestBody = {
  question?: unknown;
  history?: unknown;
  tresorerie?: unknown;
  reporting?: unknown;
  selectedAgenceId?: unknown;
  selectedMonthId?: unknown;
};

type OpenAiChatResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseContext(body: AssistantRequestBody): AssistantContext {
  const tresorerie =
    body.tresorerie === null || body.tresorerie === undefined
      ? null
      : (body.tresorerie as TresorerieData);
  const reporting =
    body.reporting === null || body.reporting === undefined
      ? null
      : (body.reporting as ReportingBundle);
  const selectedAgenceId =
    typeof body.selectedAgenceId === "string" ? body.selectedAgenceId : null;
  const selectedMonthId =
    typeof body.selectedMonthId === "string" ? body.selectedMonthId : null;

  return { tresorerie, reporting, selectedAgenceId, selectedMonthId };
}

function parseHistory(raw: unknown): AssistantMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: AssistantMessage[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    if (item.role !== "user" && item.role !== "assistant") continue;
    if (typeof item.content !== "string") continue;
    out.push({ role: item.role, content: item.content });
  }
  return out.slice(-6);
}

async function callOpenAi(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  apiKey: string,
  model: string,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 700,
    }),
  });

  const data = (await res.json()) as OpenAiChatResponse;

  if (!res.ok) {
    const msg = data.error?.message ?? `OpenAI HTTP ${res.status}`;
    throw new Error(msg);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Réponse OpenAI vide");
  }
  return content;
}

export async function POST(request: Request) {
  let body: AssistantRequestBody;
  try {
    body = (await request.json()) as AssistantRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Corps JSON invalide." },
      { status: 400 },
    );
  }

  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json(
      { error: "Question manquante." },
      { status: 400 },
    );
  }
  if (question.length > 2000) {
    return NextResponse.json(
      { error: "Question trop longue." },
      { status: 400 },
    );
  }

  const ctx = parseContext(body);
  const history = parseHistory(body.history);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  if (!apiKey) {
    const answer = answerAssistantQuestion(question, ctx);
    return NextResponse.json({
      answer,
      source: "fallback" as const,
    });
  }

  try {
    const messages = buildOpenAiMessages({ question, ctx, history });
    const answer = await callOpenAi(messages, apiKey, model);
    return NextResponse.json({
      answer,
      source: "openai" as const,
    });
  } catch {
    // Fallback déterministe si l’API échoue (réseau, quota, modèle…)
    const answer = answerAssistantQuestion(question, ctx);
    return NextResponse.json({
      answer,
      source: "fallback" as const,
      warning:
        "L’assistant cloud est momentanément indisponible — réponse locale.",
    });
  }
}
