"use client";

import { useId, useState } from "react";

/** Sélection d’export : une agence, ou tous les onglets */
export type ReportingExportSelection = string | "all";

type AgencyOption = {
  id: string;
  label: string;
  libelle: string;
};

type ReportingExportPdfButtonProps = {
  agencies: AgencyOption[];
  /** Pré-sélection (onglet actif) */
  defaultAgenceId: string;
  /** Agence confirmée, ou `"all"` — le parent lance ensuite `window.print()` */
  onExport: (selection: ReportingExportSelection) => void;
  disabled?: boolean;
};

const ALL_OPTION = "all" as const;

/**
 * Export PDF reporting : dialogue de choix d’agence (ou tous les onglets).
 */
export function ReportingExportPdfButton({
  agencies,
  defaultAgenceId,
  onExport,
  disabled = false,
}: ReportingExportPdfButtonProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [chosenId, setChosenId] = useState<ReportingExportSelection>(
    defaultAgenceId,
  );

  function openDialog() {
    setChosenId(defaultAgenceId);
    setOpen(true);
  }

  function confirm() {
    if (!chosenId) return;
    setOpen(false);
    onExport(chosenId);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || agencies.length === 0}
        onClick={openDialog}
        aria-label="Exporter le reporting en PDF"
        className={[
          "inline-flex min-h-11 cursor-pointer items-center justify-center rounded bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200",
          "hover:bg-primary/90",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "print:hidden",
        ].join(" ")}
      >
        Exporter en PDF
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center print:hidden"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-primary/40"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 mx-4 w-full max-w-md rounded-lg border-2 border-primary/15 bg-background p-5 shadow-lg sm:p-6"
          >
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-primary"
            >
              Choisir l&apos;agence à exporter
            </h2>
            <p className="mt-1 text-sm text-primary/65">
              Une agence = une page PDF. « Tous les onglets » produit une page
              par agence.
            </p>

            <ul
              className="mt-4 max-h-64 space-y-1 overflow-y-auto"
              role="listbox"
              aria-label="Agences"
            >
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={chosenId === ALL_OPTION}
                  onClick={() => setChosenId(ALL_OPTION)}
                  className={[
                    "flex w-full cursor-pointer flex-col rounded-md border px-3 py-2.5 text-left transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    chosenId === ALL_OPTION
                      ? "border-accent bg-surface"
                      : "border-primary/10 hover:bg-surface/80",
                  ].join(" ")}
                >
                  <span className="text-sm font-medium text-primary">
                    Tous les onglets
                  </span>
                  <span className="text-xs text-primary/60">
                    {agencies.length} page{agencies.length > 1 ? "s" : ""} PDF
                  </span>
                </button>
              </li>
              {agencies.map((a) => {
                const selected = a.id === chosenId;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => setChosenId(a.id)}
                      className={[
                        "flex w-full cursor-pointer flex-col rounded-md border px-3 py-2.5 text-left transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                        selected
                          ? "border-accent bg-surface"
                          : "border-primary/10 hover:bg-surface/80",
                      ].join(" ")}
                    >
                      <span className="text-sm font-medium text-primary">
                        {a.label}
                      </span>
                      <span className="text-xs text-primary/60">{a.libelle}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-10 cursor-pointer items-center rounded px-4 py-2 text-sm font-medium text-primary/80 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={!chosenId}
                className="inline-flex min-h-10 cursor-pointer items-center rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
              >
                Exporter
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
