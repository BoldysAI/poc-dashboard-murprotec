/** Aperçu vide du dashboard trésorerie — même structure, valeurs / graphes sans données. */

import type { ReactNode } from "react";

const KPI_LABELS = [
  {
    title: "Position nette de trésorerie",
    subtitle: "hors placements",
  },
  {
    title: "Total Général",
    subtitle: "placements inclus",
  },
  {
    title: "% Placements",
    subtitle: "part d'épargne",
  },
  {
    title: "Variation depuis le 01/01",
    subtitle: "depuis le 1er janvier",
  },
] as const;

const PAYS_SLOTS = 6;
const COMPOSITION_LABELS = [
  "Salaires & Charges",
  "Impôts & Taxes",
  "Fournisseurs",
  "Dividendes",
  "Transferts Internes",
] as const;

function SectionShell({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border-2 border-primary/15 bg-background p-4 sm:p-5 ${className}`}
      aria-hidden
    >
      <header className="mb-3">
        <h2 className="text-lg font-semibold tracking-tight text-primary">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-primary/65">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function EmptyValue({ size = "lg" }: { size?: "lg" | "md" }) {
  return (
    <span
      className={
        size === "lg"
          ? "text-2xl font-semibold tabular-nums text-primary/25 sm:text-3xl"
          : "text-xl font-semibold tabular-nums text-primary/25 sm:text-2xl"
      }
    >
      —
    </span>
  );
}

function LegendSkeletonRow() {
  return (
    <li className="flex flex-col gap-1 rounded-md bg-surface/60 px-2.5 py-1.5">
      <div className="flex items-center gap-2.5">
        <span className="size-2.5 shrink-0 rounded-sm bg-primary/15" />
        <span className="h-3 flex-1 rounded bg-primary/10" />
        <span className="w-14 text-right text-sm tabular-nums text-primary/25">
          —
        </span>
        <span className="w-12 text-right text-sm tabular-nums text-primary/25">
          —
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-primary/10" />
    </li>
  );
}

function BarChartSkeleton() {
  return (
    <div className="flex h-[260px] items-end gap-1.5 border-b border-primary/10 px-1 pb-0 pt-6 sm:h-[280px]">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-primary/10"
          style={{ height: `${28 + ((i * 17) % 55)}%` }}
        />
      ))}
    </div>
  );
}

export function TresorerieEmptyPreview() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-label="Aperçu du tableau de bord trésorerie — importez un fichier pour afficher les données"
    >
      <p className="text-sm text-primary/60">
        Importez un fichier Excel pour remplir les indicateurs.
      </p>

      <SectionShell
        title="Indicateurs de synthèse"
        subtitle="Position nette, placements et variation depuis le début d'année."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPI_LABELS.map((kpi) => (
            <article
              key={kpi.title}
              className="rounded-lg border border-primary/10 bg-background p-4"
            >
              <h3 className="text-sm font-medium text-primary/50">{kpi.title}</h3>
              <p className="mt-0.5 text-xs text-primary/40">{kpi.subtitle}</p>
              <p className="mt-3">
                <EmptyValue />
              </p>
            </article>
          ))}
        </div>
      </SectionShell>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <SectionShell
          title="Répartition par pays"
          subtitle="En attente du fichier trésorerie."
          className="h-full"
        >
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-stretch lg:gap-5">
            <div className="relative size-[200px] shrink-0 self-center sm:size-[220px]">
              <div
                className="absolute inset-[9%] rounded-full border-[22px] border-surface"
                aria-hidden
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[0.65rem] font-medium uppercase tracking-wider text-primary/35">
                  Total
                </span>
                <span className="text-base font-semibold tabular-nums text-primary/25 sm:text-lg">
                  —
                </span>
              </div>
            </div>
            <ul className="flex min-w-0 flex-1 flex-col justify-evenly gap-1">
              {Array.from({ length: PAYS_SLOTS }).map((_, i) => (
                <LegendSkeletonRow key={i} />
              ))}
            </ul>
          </div>
        </SectionShell>

        <SectionShell
          title="Composition des dépenses"
          subtitle="Répartition du total des dépenses par poste."
          className="flex h-full flex-col"
        >
          <div className="h-14 w-full shrink-0 rounded-md bg-surface" />
          <ul className="mt-3 flex flex-1 flex-col justify-evenly gap-1.5">
            {COMPOSITION_LABELS.map((label) => (
              <li
                key={label}
                className="flex flex-col gap-1 rounded-md bg-surface/60 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="size-2.5 shrink-0 rounded-sm bg-primary/15" />
                  <span className="min-w-0 flex-1 text-sm font-semibold text-primary/40">
                    {label}
                  </span>
                  <span className="text-sm tabular-nums text-primary/25">—</span>
                  <span className="w-12 text-right text-sm tabular-nums text-primary/25">
                    —
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-primary/10" />
              </li>
            ))}
          </ul>
        </SectionShell>
      </div>

      <SectionShell
        title="Recettes & dépenses du mois"
        subtitle="Flux du mois en cours, consolidés pour le groupe."
      >
        <div className="grid gap-4 xl:grid-cols-2 xl:gap-5">
          <div className="flex min-w-0 flex-col gap-3">
            <article className="rounded-lg border border-primary/10 px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-primary/50">
                    Recettes du mois
                  </h3>
                  <p className="text-xs text-primary/40">
                    Total des encaissements groupe
                  </p>
                </div>
                <EmptyValue size="md" />
              </div>
            </article>
            <div>
              <h3 className="mb-0.5 text-sm font-semibold text-primary/70">
                Recettes par société
              </h3>
              <p className="mb-2 text-xs text-primary/45">
                Ligne pointillée = moyenne des sociétés.
              </p>
              <BarChartSkeleton />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <article className="rounded-lg border border-primary/10 px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-primary/50">
                    Dépenses du mois
                  </h3>
                  <p className="text-xs text-primary/40">
                    Total des décaissements groupe
                  </p>
                </div>
                <EmptyValue size="md" />
              </div>
            </article>
            <div>
              <h3 className="mb-0.5 text-sm font-semibold text-primary/70">
                Dépenses par société
              </h3>
              <p className="mb-2 text-xs text-primary/45">
                En jaune : les trois sociétés aux dépenses les plus élevées.
              </p>
              <BarChartSkeleton />
            </div>
          </div>
        </div>
      </SectionShell>
    </div>
  );
}
