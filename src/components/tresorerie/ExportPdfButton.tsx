"use client";

type ExportPdfButtonProps = {
  disabled?: boolean;
};

/** Déclenche l’impression navigateur (PDF A4 paysage via feuille dédiée). */
export function ExportPdfButton({ disabled = false }: ExportPdfButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => window.print()}
      aria-label="Exporter le dashboard trésorerie en PDF"
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
  );
}
