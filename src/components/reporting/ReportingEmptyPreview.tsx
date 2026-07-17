/** Aperçu vide du dashboard reporting — même structure, graphes sans données. */

import type { ReactNode } from "react";

const TAUX_LABELS = [
  "% Marchandises",
  "% Poseurs",
  "% Surveyor",
  "% Commissions (CA facturé)",
  "% Commissions (CA vente)",
  "% Publicités",
] as const;

function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-lg border-2 border-primary/15 bg-background p-5 sm:p-6"
      aria-hidden
    >
      <header className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-primary">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-primary/65">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function EmptyValue() {
  return (
    <span className="text-2xl font-semibold tabular-nums text-primary/25 sm:text-3xl">
      —
    </span>
  );
}

export function ReportingEmptyPreview() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Aperçu du tableau de bord — importez un fichier pour afficher les données"
    >
      <p className="text-sm text-primary/60">
        Importez un fichier Excel pour remplir les indicateurs.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionShell
          title="Bénéfice brut"
          subtitle="Résultat avant frais de structure, comparé à N-1."
        >
          <EmptyValue />
          <div className="mt-4 h-14 rounded-md bg-surface/80" />
        </SectionShell>
        <SectionShell
          title="Variation globale vs N-1"
          subtitle="Évolution du profit après impôts."
        >
          <EmptyValue />
          <div className="mt-4 h-10 rounded-md bg-surface/80" />
        </SectionShell>
      </div>

      <SectionShell
        title="Taux clés"
        subtitle="Ratios de pilotage avec signal immédiat en cas de dépassement."
      >
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {TAUX_LABELS.map((label) => (
            <li key={label}>
              <article className="flex h-full flex-col gap-2 rounded-lg border border-primary/10 bg-background p-4">
                <p className="min-h-[2.75rem] text-xs font-medium leading-snug text-primary/40">
                  {label}
                </p>
                <p className="text-2xl font-semibold tabular-nums text-primary/25">
                  —
                </p>
                <p className="mt-auto text-xs text-primary/30">—</p>
              </article>
            </li>
          ))}
        </ul>
      </SectionShell>

      <SectionShell
        title="Répartition du CA par produit"
        subtitle="En attente du fichier reporting."
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-center">
          <div className="relative mx-auto aspect-square w-full max-w-[280px]">
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
          <ul className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-md bg-surface/60 px-2 py-2"
              >
                <span className="size-3 shrink-0 rounded-sm bg-primary/15" />
                <span className="h-3 flex-1 rounded bg-primary/10" />
                <span className="w-16 text-right text-sm tabular-nums text-primary/25">
                  —
                </span>
                <span className="w-14 text-right text-sm tabular-nums text-primary/25">
                  —
                </span>
              </li>
            ))}
          </ul>
        </div>
      </SectionShell>

      <SectionShell
        title="Charges & rentabilité"
        subtitle="Coûts d'exploitation, frais fixes et seuil de rentabilité du mois."
      >
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-primary/70">
              Structure des charges
            </h3>
            <div className="mt-4 h-8 w-full rounded-md bg-surface" />
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {["Technique", "Vente", "Administration", "Financier"].map(
                (label) => (
                  <li
                    key={label}
                    className="flex items-center gap-2 text-sm text-primary/40"
                  >
                    <span className="size-2.5 rounded-sm bg-primary/15" />
                    {label}
                    <span className="tabular-nums text-primary/25">—</span>
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="flex flex-col gap-3 border-t border-primary/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-primary/70">
                Frais fixes
              </h3>
              <p className="mt-0.5 text-sm text-primary/45">
                Coûts qui restent à couvrir chaque mois.
              </p>
            </div>
            <EmptyValue />
          </div>
          <div className="border-t border-primary/10 pt-5">
            <h3 className="text-base font-semibold text-primary/70">
              Seuil de rentabilité mensuel
            </h3>
            <div className="mt-4">
              <EmptyValue />
            </div>
            <div className="mt-5 space-y-3">
              <div className="h-2.5 rounded-full bg-surface" />
              <div className="h-2.5 w-2/3 rounded-full bg-surface" />
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell
        title="Pilotage commercial"
        subtitle="Suivi commercial et trésorerie agence."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {["Cahier de commande", "Impayés", "Euro / coupon"].map((label) => (
            <article
              key={label}
              className="rounded-lg border border-primary/10 p-4 sm:p-5"
            >
              <h3 className="text-sm font-medium text-primary/50">{label}</h3>
              <p className="mt-3">
                <EmptyValue />
              </p>
            </article>
          ))}
        </div>
      </SectionShell>
    </div>
  );
}
