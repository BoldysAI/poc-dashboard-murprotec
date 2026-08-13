"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useDashboardData } from "@/contexts/dashboard-data-context";
import {
  SUGGESTED_QUESTIONS,
  type AssistantMessage,
} from "@/lib/poc/assistant";

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function AiAssistant() {
  const titleId = useId();
  const inputId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const { tresorerieData, reportingBundle, selectedAgenceId, selectedMonthId } =
    useDashboardData();

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      content:
        "Bonjour Thomas — je commente les chiffres chargés dans cette session (trésorerie et reporting). Posez une question ou choisissez une suggestion.",
    },
  ]);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, thinking, expanded]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || thinking) return;

    const historyForApi = messages.filter(
      (m, i) => !(i === 0 && m.role === "assistant"),
    );

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          history: historyForApi.slice(-6),
          tresorerie: tresorerieData,
          reporting: reportingBundle,
          selectedAgenceId,
          selectedMonthId,
        }),
      });

      const data = (await res.json()) as {
        answer?: string;
        error?: string;
        warning?: string;
      };

      if (!res.ok || !data.answer) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data.error ??
              "Impossible d’obtenir une réponse pour le moment. Réessayez dans un instant.",
          },
        ]);
        return;
      }

      const content = data.warning
        ? `${data.answer}\n\n_${data.warning}_`
        : data.answer;

      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Connexion à l’assistant interrompue. Vérifiez votre réseau et réessayez.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  const panelClass = expanded
    ? "fixed inset-3 z-40 flex flex-col overflow-hidden rounded-xl border border-primary/20 bg-background shadow-xl sm:inset-6 md:inset-x-[10%] md:inset-y-8"
    : "fixed bottom-20 right-4 z-40 flex h-[min(70vh,32rem)] w-[min(100vw-2rem,26rem)] flex-col overflow-hidden rounded-xl border border-primary/20 bg-background shadow-xl sm:bottom-24 sm:right-6 sm:w-[min(100vw-3rem,28rem)]";

  return (
    <div className="print:hidden">
      {open ? (
        <div
          className={panelClass}
          role="dialog"
          aria-modal={expanded}
          aria-labelledby={titleId}
        >
          <header className="flex shrink-0 items-start justify-between gap-2 border-b border-primary/10 bg-primary px-4 py-3 text-white">
            <div>
              <h2 id={titleId} className="text-sm font-semibold">
                Assistant financier
              </h2>
              <p className="text-[11px] text-white/70">
                IA OpenAI — réponses basées sur vos fichiers chargés
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="cursor-pointer rounded p-1 text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label={
                  expanded ? "Réduire l’assistant" : "Agrandir l’assistant"
                }
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? (
                  <svg
                    viewBox="0 0 20 20"
                    className="h-5 w-5"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M6.5 4.5a.75.75 0 0 0 0 1.5h2.19L4.47 10.22a.75.75 0 1 0 1.06 1.06L9.75 6.81V9a.75.75 0 0 0 1.5 0V5.25a.75.75 0 0 0-.75-.75H6.5Zm7 11a.75.75 0 0 0 0-1.5h-2.19l4.22-4.22a.75.75 0 1 0-1.06-1.06L10.25 13.19V11a.75.75 0 0 0-1.5 0v3.75c0 .414.336.75.75.75H13.5Z" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 20 20"
                    className="h-5 w-5"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M3.5 4.75A.75.75 0 0 1 4.25 4h4.5a.75.75 0 0 1 0 1.5H6.06l4.22 4.22a.75.75 0 1 1-1.06 1.06L5 6.56v2.69a.75.75 0 0 1-1.5 0v-4.5Zm12.5 10.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1 0-1.5h2.69l-4.22-4.22a.75.75 0 1 1 1.06-1.06L14.44 13.5H11.75a.75.75 0 0 1 0-1.5h4.5a.75.75 0 0 1 .75.75v4.5Z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                className="cursor-pointer rounded p-1 text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label="Fermer l’assistant"
                onClick={() => {
                  setExpanded(false);
                  setOpen(false);
                }}
              >
                <svg
                  viewBox="0 0 20 20"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
          </header>

          <div
            ref={listRef}
            className={[
              "flex flex-1 flex-col gap-2.5 overflow-y-auto bg-surface/40 px-3 py-3",
              expanded ? "sm:px-5 sm:py-4" : "",
            ].join(" ")}
          >
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={[
                  "rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                  expanded ? "max-w-[min(100%,42rem)]" : "max-w-[92%]",
                  m.role === "user"
                    ? "ml-auto bg-primary text-white"
                    : "bg-background text-primary/90 border border-primary/10",
                  expanded && m.role === "assistant" ? "mr-auto" : "",
                ].join(" ")}
              >
                {m.role === "assistant" ? renderContent(m.content) : m.content}
              </div>
            ))}
            {thinking ? (
              <p className="text-xs text-primary/50">Analyse des chiffres…</p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-primary/10 bg-background px-3 py-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={thinking}
                onClick={() => void ask(q)}
                className="cursor-pointer rounded-full border border-primary/15 bg-surface px-2.5 py-1 text-[11px] font-medium text-primary/80 hover:border-accent hover:bg-accent/10 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            className="flex shrink-0 gap-2 border-t border-primary/10 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
          >
            <label htmlFor={inputId} className="sr-only">
              Votre question
            </label>
            <input
              id={inputId}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex. Pourquoi la marge baisse-t-elle ?"
              className="min-w-0 flex-1 rounded-md border border-primary/20 bg-background px-3 py-2 text-sm text-primary placeholder:text-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              disabled={thinking}
            />
            <button
              type="submit"
              disabled={thinking || !input.trim()}
              className="cursor-pointer rounded-md bg-accent px-3 py-2 text-sm font-semibold text-primary disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Envoyer
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            if (v) setExpanded(false);
            return !v;
          });
        }}
        className="fixed bottom-4 right-4 z-40 flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:bottom-6 sm:right-6"
        aria-expanded={open}
        aria-label={open ? "Fermer l’assistant IA" : "Ouvrir l’assistant IA"}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-accent"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2a1 1 0 0 1 1 1v1.06A7.002 7.002 0 0 1 19 11v1.382l1.447 2.894A1 1 0 0 1 19.553 17H17a5 5 0 0 1-10 0H4.447a1 1 0 0 1-.894-1.447L5 12.382V11a7.002 7.002 0 0 1 6-6.94V3a1 1 0 0 1 1-1Zm0 15a3 3 0 0 0 2.83-2H9.17A3 3 0 0 0 12 17Z" />
        </svg>
        Assistant IA
      </button>
    </div>
  );
}
