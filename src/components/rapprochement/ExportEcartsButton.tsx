"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { StatutRapprochement } from "@/types/rapprochement";

const STATUTS: StatutRapprochement[] = ["Not OK", "Non apparié", "OK"];

const COCHES_DEFAUT: Record<StatutRapprochement, boolean> = {
  OK: false,
  "Not OK": true,
  "Non apparié": true,
};

type ExportEcartsButtonProps = {
  disabled?: boolean;
  /** Statuts confirmés. Le parent met à jour la feuille puis lance l’impression. */
  onExport: (statuts: StatutRapprochement[]) => void;
};

/**
 * Export PDF des écarts : le choix des statuts se fait dans une fenêtre,
 * pas dans l’en-tête. Défaut à l’ouverture : Not OK et Non apparié.
 */
export function ExportEcartsButton({ disabled = false, onExport }: ExportEcartsButtonProps) {
  const titleId = useId();
  const descriptionId = useId();
  const annulerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [coches, setCoches] = useState(COCHES_DEFAUT);

  useEffect(() => {
    if (!open) return;
    annulerRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function ouvrir() {
    setCoches(COCHES_DEFAUT);
    setOpen(true);
  }

  function confirmer() {
    const retenus = STATUTS.filter((statut) => coches[statut]);
    setOpen(false);
    onExport(retenus);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={ouvrir}
        className={[
          "inline-flex min-h-11 cursor-pointer items-center justify-center rounded bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200",
          "hover:bg-primary/90",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "print:hidden",
        ].join(" ")}
      >
        Exporter les écarts
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4 print:hidden"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-primary">
              Statuts à inclure
            </h2>
            <p id={descriptionId} className="mt-2 text-sm text-primary/70">
              Seuls les statuts cochés figurent dans le PDF. Le filtre du tableau n’est pas modifié.
            </p>
            <fieldset className="mt-4 flex flex-col gap-1">
              <legend className="sr-only">Statuts</legend>
              {STATUTS.map((statut) => (
                <label
                  key={statut}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-primary"
                >
                  <input
                    type="checkbox"
                    checked={coches[statut]}
                    onChange={() =>
                      setCoches((actuel) => ({
                        ...actuel,
                        [statut]: !actuel[statut],
                      }))
                    }
                    className="size-4 accent-primary"
                  />
                  {statut}
                </label>
              ))}
            </fieldset>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={annulerRef}
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded border border-primary/20 bg-white px-4 py-2 text-sm font-medium text-primary transition-colors duration-200 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmer}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
