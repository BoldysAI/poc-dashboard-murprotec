"use client";

import type { TauxCle, TauxCleStatut } from "@/types/dashboard";
import { formatPct } from "./format-reporting";

type TauxClesTilesProps = {
  tauxCles: TauxCle[];
};

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.721-1.36 3.486 0l6.518 11.594c.75 1.335-.213 2.982-1.742 2.982H3.48c-1.53 0-2.493-1.647-1.743-2.982L8.257 3.1ZM10 7a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 7Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.333a1 1 0 0 1-1.432.01L3.29 9.98a1 1 0 1 1 1.42-1.41l3.96 3.986 6.54-6.615a1 1 0 0 1 1.494-.05Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function tileStyles(statut: TauxCleStatut): {
  shell: string;
  value: string;
  label: string;
} {
  switch (statut) {
    case "ok":
      return {
        shell: "border-success/25 bg-success/5",
        value: "text-success",
        label: "text-success/80",
      };
    case "warning":
      return {
        shell: "border-warning/35 bg-warning/10",
        value: "text-warning",
        label: "text-warning/90",
      };
    case "danger":
      return {
        shell: "border-danger/35 bg-danger/10",
        value: "text-danger",
        label: "text-danger/90",
      };
    default:
      return {
        shell: "border-primary/10 bg-background",
        value: "text-primary",
        label: "text-primary/55",
      };
  }
}

function formatSeuilRappel(taux: TauxCle): string | null {
  if (taux.seuil === null) return null;
  if (
    taux.seuilMin !== null &&
    taux.seuilMax !== null &&
    taux.seuilMin !== taux.seuilMax
  ) {
    return `seuil ${formatPct(taux.seuilMin, 0)}–${formatPct(taux.seuilMax, 0)}`;
  }
  return `seuil ${formatPct(taux.seuil, 0)}`;
}

function statutAria(statut: TauxCleStatut): string {
  switch (statut) {
    case "ok":
      return "dans le seuil";
    case "warning":
      return "dans la zone d'attention";
    case "danger":
      return "au-dessus du seuil";
    default:
      return "sans seuil de référence";
  }
}

export function TauxClesTiles({ tauxCles }: TauxClesTilesProps) {
  return (
    <section
      className="rounded-lg border-2 border-primary/15 bg-background p-5 sm:p-6"
      aria-labelledby="taux-cles-title"
    >
      <header className="mb-4">
        <h2
          id="taux-cles-title"
          className="text-lg font-semibold tracking-tight text-primary"
        >
          Taux clés
        </h2>
        <p className="mt-0.5 text-sm text-primary/65">
          Ratios de pilotage avec signal immédiat en cas de dépassement.
        </p>
      </header>

      <ul className="mt-1 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {tauxCles.map((taux) => {
          const styles = tileStyles(taux.statut);
          const rappel = formatSeuilRappel(taux);
          const showAlert =
            taux.statut === "warning" || taux.statut === "danger";

          return (
            <li key={taux.nom}>
              <article
                className={`flex h-full flex-col gap-2 rounded-lg border p-4 ${styles.shell}`}
                aria-label={`${taux.nom} : ${formatPct(taux.valeur, 1)}, ${statutAria(taux.statut)}${rappel ? `, ${rappel}` : ""}`}
              >
                <div className="flex min-h-[2.75rem] items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-xs font-medium leading-snug text-primary/75">
                    {taux.nom}
                  </h3>
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {showAlert ? (
                      <AlertIcon className={`size-4 ${styles.value}`} />
                    ) : taux.statut === "ok" ? (
                      <CheckIcon className={`size-4 ${styles.value}`} />
                    ) : null}
                  </span>
                </div>
                <p
                  className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${styles.value}`}
                >
                  {formatPct(taux.valeur, 1)}
                </p>
                {rappel ? (
                  <p className={`mt-auto text-xs ${styles.label}`}>{rappel}</p>
                ) : (
                  <p className="mt-auto text-xs text-primary/40">—</p>
                )}
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
