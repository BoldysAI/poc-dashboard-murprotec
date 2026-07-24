"use client";

import { useEffect, useId, useState } from "react";
import { AlertsCenter } from "@/components/poc/AlertsCenter";
import { BriefDuMois } from "@/components/poc/BriefDuMois";
import type { MonthBrief } from "@/lib/poc/brief";
import type { PocAlert } from "@/lib/poc/alerts";

type InsightsDrawerProps = {
  brief: MonthBrief;
  alerts: PocAlert[];
};

export function InsightsDrawer({ brief, alerts }: InsightsDrawerProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const dangerCount = alerts.filter((a) => a.severity === "danger").length;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-primary/20 bg-background px-3 py-2 text-sm font-medium text-primary transition-colors hover:border-accent hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Brief & alertes
        {alerts.length > 0 ? (
          <span
            className={[
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
              dangerCount > 0
                ? "bg-danger/15 text-danger"
                : "bg-warning/15 text-warning",
            ].join(" ")}
          >
            {alerts.length}
          </span>
        ) : (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-success/15 px-1.5 text-[11px] font-semibold text-success">
            0
          </span>
        )}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex justify-end print:hidden"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-primary/40"
            aria-label="Fermer le panneau"
            onClick={() => setOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex h-full w-full max-w-xl flex-col bg-background shadow-xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-primary/10 px-4 py-4 sm:px-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/50">
                  Aperçu produit
                </p>
                <h2
                  id={titleId}
                  className="text-lg font-semibold tracking-tight text-primary"
                >
                  Brief & alertes
                </h2>
                <p className="mt-0.5 text-xs text-primary/60">
                  Synthèse et points d’attention — hors du dashboard principal.
                </p>
              </div>
              <button
                type="button"
                className="cursor-pointer rounded p-1.5 text-primary/60 hover:bg-surface hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              <BriefDuMois brief={brief} />
              <AlertsCenter alerts={alerts} defaultOpen />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
