"use client";

import { useEffect, useId, useRef, useState } from "react";

type ResetUploadButtonProps = {
  onReset: () => void;
  disabled?: boolean;
  /** Libellé du bouton déclencheur (défaut reporting). */
  label?: string;
};

export function ResetUploadButton({
  onReset,
  disabled = false,
  label = "Réinitialiser",
}: ResetUploadButtonProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const confirm = () => {
    setOpen(false);
    onReset();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={[
          "inline-flex min-h-11 cursor-pointer items-center justify-center rounded border border-primary/20 bg-white px-4 py-2 text-sm font-medium text-primary transition-colors duration-200",
          "hover:border-primary/40 hover:bg-surface",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "print:hidden",
        ].join(" ")}
      >
        {label}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-primary"
            >
              Êtes-vous sûr ?
            </h2>
            <p className="mt-2 text-sm text-primary/70">
              Cette action efface les données chargées et le cache navigateur.
              Un simple rafraîchissement de page ne suffit plus à les faire
              disparaître. Vous pourrez téléverser un nouveau fichier ensuite.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded border border-primary/20 bg-white px-4 py-2 text-sm font-medium text-primary transition-colors duration-200 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirm}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Oui, réinitialiser
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
