"use client";

import { useEffect, useId, useState } from "react";

type PostPocFeature = {
  id: string;
  title: string;
  category: string;
  description: string;
};

const FEATURES: PostPocFeature[] = [
  {
    id: "erp",
    title: "Connexion ERP / compta",
    category: "Intégrations",
    description:
      "Alimenter automatiquement les indicateurs depuis Sage, Exact ou l’outil comptable du groupe — sans dépôt Excel mensuel. La synchro tourne en arrière-plan et met à jour trésorerie et reporting.",
  },
  {
    id: "bank",
    title: "Flux bancaire temps réel",
    category: "Intégrations",
    description:
      "Suivre la position de trésorerie en continu via les flux bancaires, plutôt qu’un cliché mensuel issu du fichier. Utile pour anticiper les tensions de liquidité en cours de mois.",
  },
  {
    id: "sharepoint",
    title: "Sync SharePoint / OneDrive",
    category: "Intégrations",
    description:
      "Dès qu’un fichier Excel est déposé dans un dossier partagé, le dashboard se met à jour. Réduit les allers-retours manuels tout en gardant le format actuel le temps de brancher l’ERP.",
  },
  {
    id: "email",
    title: "Email / brief programmé",
    category: "Diffusion",
    description:
      "Envoyer automatiquement le brief du mois et les alertes (ex. chaque lundi à 8 h) à Thomas ou au COMEX. Plus besoin d’ouvrir l’outil pour savoir s’il y a un point d’attention.",
  },
  {
    id: "ppt",
    title: "Export PowerPoint / one-pager",
    category: "Diffusion",
    description:
      "En plus du PDF déjà disponible, générer un diaporama prêt pour la réunion (KPI, alertes, synthèse agences). Un clic pour préparer le support COMEX.",
  },
  {
    id: "share",
    title: "Lien de partage lecture seule",
    category: "Diffusion",
    description:
      "Partager une vue figée du mois à des destinataires internes sans compte ni upload. Idéal pour la direction ou les responsables d’agence.",
  },
  {
    id: "compare",
    title: "Comparaison multi-périodes",
    category: "Pilotage",
    description:
      "Charger deux mois (M vs M-1) et visualiser les deltas sur les mêmes indicateurs. Historisation des périodes pour suivre la trajectoire dans le temps.",
  },
  {
    id: "thresholds",
    title: "Seuils personnalisables",
    category: "Pilotage",
    description:
      "Ajuster les seuils d’alerte par agence ou par indicateur, au-delà des valeurs lues dans le fichier. Gouvernance fine du « vert / orange / rouge ».",
  },
  {
    id: "whatif",
    title: "Scénarios what-if",
    category: "Pilotage",
    description:
      "Simuler l’impact d’une hausse de CA ou de charges sur la marge et le seuil de rentabilité — utile en réunion pour challenger un plan d’action.",
  },
  {
    id: "forecast",
    title: "Projection de trésorerie",
    category: "Pilotage",
    description:
      "Estimer l’évolution de la position nette sur 2–3 mois à partir du rythme observé, clairement étiquetée comme projection (pas un engagement comptable).",
  },
];

export function PostPocInfoButton() {
  const titleId = useId();
  const [open, setOpen] = useState(false);

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
        className="inline-flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Possibilités après le POC"
      >
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4 text-accent"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM9.25 6.75a.75.75 0 0 0 0 1.5h.01a.75.75 0 0 0 0-1.5H9.25ZM10 9a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 10 9Z"
            clipRule="evenodd"
          />
        </svg>
        Vision produit
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
            className="flex max-h-[min(90vh,40rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-primary/15 bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="shrink-0 border-b border-primary/10 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                Après le POC
              </p>
              <h2
                id={titleId}
                className="mt-0.5 text-lg font-semibold text-primary"
              >
                Possibilités du vrai dashboard
              </h2>
              <p className="mt-1 text-sm text-primary/65">
                Fonctionnalités envisageables une fois le produit construit —
                hors périmètre de ce POC.
              </p>
            </header>

            <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {FEATURES.map((f) => (
                <li
                  key={f.id}
                  className="rounded-md border border-primary/10 bg-surface/50 px-3.5 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary/70">
                      {f.category}
                    </span>
                    <h3 className="text-sm font-semibold text-primary">
                      {f.title}
                    </h3>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-primary/75">
                    {f.description}
                  </p>
                </li>
              ))}
            </ul>

            <footer className="shrink-0 border-t border-primary/10 px-5 py-3 text-right">
              <button
                type="button"
                className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={() => setOpen(false)}
              >
                Fermer
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
